#!/usr/bin/env node
/**
 * check-play-status.js
 * Fetches current release, tracks, reviews, and install telemetry from Google Play Console
 * using the local Service Account JSON key (google-play-key.json).
 */

const fs = require('fs');
const path = require('path');
const https = require('https');
const crypto = require('crypto');

// Load environment variables from .env if present
const envPath = path.join(__dirname, '../.env');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  envContent.split('\n').forEach((line) => {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#')) {
      const idx = trimmed.indexOf('=');
      if (idx !== -1) {
        const k = trimmed.substring(0, idx).trim();
        const v = trimmed.substring(idx + 1).trim();
        if (!process.env[k]) process.env[k] = v;
      }
    }
  });
}

function findKeyFile() {
  const root = path.join(__dirname, '..');
  const standard = path.join(root, 'google-play-key.json');
  if (fs.existsSync(standard)) return standard;
  const files = fs.readdirSync(root);
  const matched = files.find(
    (f) =>
      f.endsWith('.json') &&
      (f.startsWith('lifetrack-pro-') || f.includes('service-account'))
  );
  return matched ? path.join(root, matched) : standard;
}

const KEY_FILE = findKeyFile();
const APP_JSON = path.join(__dirname, '../app.json');

function base64url(input) {
  return Buffer.from(input)
    .toString('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
}

function httpsRequest(options, postData) {
  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let data = [];
      res.on('data', (chunk) => data.push(chunk));
      res.on('end', () => {
        const buf = Buffer.concat(data);
        const text = buf.toString('utf8');
        try {
          const parsed = JSON.parse(text);
          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve(parsed);
          } else {
            reject({ statusCode: res.statusCode, error: parsed });
          }
        } catch (e) {
          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve(buf);
          } else {
            reject({ statusCode: res.statusCode, raw: text });
          }
        }
      });
    });

    req.on('error', reject);

    if (postData) {
      req.write(postData);
    }
    req.end();
  });
}

async function getAccessToken(serviceAccount) {
  const now = Math.floor(Date.now() / 1000);
  const header = { alg: 'RS256', typ: 'JWT' };
  const claimSet = {
    iss: serviceAccount.client_email,
    scope:
      'https://www.googleapis.com/auth/androidpublisher https://www.googleapis.com/auth/devstorage.read_only',
    aud: 'https://oauth2.googleapis.com/token',
    exp: now + 3600,
    iat: now,
  };

  const encodedHeader = base64url(JSON.stringify(header));
  const encodedClaim = base64url(JSON.stringify(claimSet));
  const signInput = `${encodedHeader}.${encodedClaim}`;

  const signer = crypto.createSign('RSA-SHA256');
  signer.update(signInput);
  signer.end();
  const signature = signer
    .sign(serviceAccount.private_key, 'base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');

  const jwt = `${signInput}.${signature}`;

  const body = new URLSearchParams({
    grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
    assertion: jwt,
  }).toString();

  const tokenRes = await httpsRequest(
    {
      hostname: 'oauth2.googleapis.com',
      path: '/token',
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': Buffer.byteLength(body),
      },
    },
    body
  );

  return tokenRes.access_token;
}

async function fetchInstallStats(packageName, accessToken) {
  const devId = process.env.GOOGLE_PLAY_DEVELOPER_ID || '5021715316290368768';
  const candidateBuckets = [
    process.env.GOOGLE_PLAY_BUCKET_ID,
    `pubsite_prod_${devId}`,
    `pubsite_prod_rev_${devId}`,
  ].filter(Boolean);

  console.log('\n📈 Installs & Active Devices:');

  let listRes = null;
  let activeBucket = null;

  for (const b of candidateBuckets) {
    try {
      const res = await httpsRequest({
        hostname: 'storage.googleapis.com',
        path: `/storage/v1/b/${b}/o?prefix=stats%2Finstalls%2Finstalls_${packageName}`,
        method: 'GET',
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (res && res.items) {
        listRes = res;
        activeBucket = b;
        break;
      }
    } catch (e) {
      // continue to next bucket candidate
    }
  }

  if (!listRes || !listRes.items || listRes.items.length === 0) {
    console.log('  ℹ️  No Cloud Storage install reports found yet.');
    console.log('     (Google Play generates monthly install reports on the 1st/2nd of each month).');
    console.log('     For real-time closed testing counts, check Play Console -> Closed Testing -> Testers.');
    return;
  }

  try {
    const bucket = activeBucket;

    // Pick the most recent overview file
    const overviews = listRes.items
      .filter((item) => item.name.includes('_overview.csv'))
      .sort((a, b) => b.name.localeCompare(a.name));

    const targetFile = overviews[0] || listRes.items[listRes.items.length - 1];
    const rawData = await httpsRequest({
      hostname: 'storage.googleapis.com',
      path: `/storage/v1/b/${bucket}/o/${encodeURIComponent(targetFile.name)}?alt=media`,
      method: 'GET',
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    // Google Play report CSVs are encoded in utf-16le or utf-8
    let content = Buffer.isBuffer(rawData) ? rawData.toString('utf16le') : String(rawData);
    if (!content.includes('Date')) {
      content = Buffer.isBuffer(rawData) ? rawData.toString('utf8') : String(rawData);
    }

    const lines = content.split(/\r?\n/).filter(Boolean);
    if (lines.length <= 1) {
      console.log('  Report file empty or still pending daily generation.');
      return;
    }

    const headers = lines[0].split(/[,\t]/).map((h) => h.trim());
    const latestRow = lines[lines.length - 1].split(/[,\t]/).map((v) => v.trim());

    console.log(`  Report File: ${path.basename(targetFile.name)}`);
    headers.forEach((h, idx) => {
      if (h && latestRow[idx] !== undefined) {
        console.log(`  • ${h}: ${latestRow[idx]}`);
      }
    });
  } catch (err) {
    console.log('  ⚠️  Could not fetch install report:', err.error?.message || err.message || err);
  }
}

async function checkPlayStatus() {
  if (!fs.existsSync(KEY_FILE)) {
    console.error('❌ Google Play service account key not found!');
    process.exit(1);
  }

  const serviceAccount = JSON.parse(fs.readFileSync(KEY_FILE, 'utf8'));
  const appConfig = JSON.parse(fs.readFileSync(APP_JSON, 'utf8'));
  const packageName = appConfig.expo?.android?.package || 'com.lifetrackpro.app';
  const localVersion = appConfig.expo?.version || 'unknown';
  const localVersionCode = appConfig.expo?.android?.versionCode || 'unknown';

  console.log('=============================================');
  console.log('📱 Google Play Console App Tracker');
  console.log(`📦 Package: ${packageName}`);
  console.log(`🏷️  Local Version: ${localVersion} (versionCode: ${localVersionCode})`);
  console.log('=============================================\n');

  console.log('🔑 Authenticating with Google Play Developer API...');
  const accessToken = await getAccessToken(serviceAccount);
  console.log('✅ Authenticated successfully!');

  // Query Tracks
  console.log('🔍 Fetching current release tracks and status...');
  const editRes = await httpsRequest(
    {
      hostname: 'androidpublisher.googleapis.com',
      path: `/androidpublisher/v3/applications/${packageName}/edits`,
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    },
    '{}'
  );

  const editId = editRes.id;

  try {
    const tracksRes = await httpsRequest({
      hostname: 'androidpublisher.googleapis.com',
      path: `/androidpublisher/v3/applications/${packageName}/edits/${editId}/tracks`,
      method: 'GET',
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    console.log('\n📊 Release Tracks on Google Play:');
    if (!tracksRes.tracks || tracksRes.tracks.length === 0) {
      console.log('  No active tracks found or app not yet published.');
    } else {
      tracksRes.tracks.forEach((track) => {
        console.log(`\n• Track: [${track.track.toUpperCase()}]`);
        if (!track.releases || track.releases.length === 0) {
          console.log('    No releases yet.');
        } else {
          track.releases.forEach((rel) => {
            console.log(`    - Status:       ${rel.status}`);
            console.log(`    - Version Codes: ${(rel.versionCodes || []).join(', ') || 'N/A'}`);
            if (rel.name) console.log(`    - Release Name:  ${rel.name}`);
            if (rel.userFraction !== undefined) {
              console.log(`    - Rollout:       ${rel.userFraction * 100}%`);
            }
          });
        }
      });
    }
  } finally {
    await httpsRequest({
      hostname: 'androidpublisher.googleapis.com',
      path: `/androidpublisher/v3/applications/${packageName}/edits/${editId}`,
      method: 'DELETE',
      headers: { Authorization: `Bearer ${accessToken}` },
    }).catch(() => {});
  }

  // Fetch reviews / feedback
  try {
    const reviewsRes = await httpsRequest({
      hostname: 'androidpublisher.googleapis.com',
      path: `/androidpublisher/v3/applications/${packageName}/reviews`,
      method: 'GET',
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    console.log('\n💬 User Reviews / Tester Feedback:');
    if (!reviewsRes.reviews || reviewsRes.reviews.length === 0) {
      console.log('  No reviews or tester feedback submitted yet.');
    } else {
      reviewsRes.reviews.slice(0, 5).forEach((r) => {
        const comment = r.comments?.[0]?.userComment;
        console.log(`  • [${comment?.starRating || 0}★] ${r.authorName}: ${comment?.text || ''}`);
      });
    }
  } catch (e) {
    // Reviews permission might not be granted or not yet active
  }

  // Fetch install stats if bucket is configured
  await fetchInstallStats(packageName, accessToken);

  console.log('\n✅ Play Console tracking completed successfully.\n');
}

checkPlayStatus().catch((err) => {
  const code = err.statusCode || err.error?.code || err.error?.error?.code;
  if (code === 403) {
    console.error('\n❌ Google Play Console Permission Denied (403)');
  } else {
    console.error('\n❌ Error communicating with Google Play Console:', err.error || err.message || err);
  }
  process.exit(1);
});
