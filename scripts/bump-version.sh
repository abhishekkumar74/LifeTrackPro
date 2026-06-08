#!/usr/bin/env node
// bump-version.sh
const fs = require('fs');
const path = require('path');

const appJsonPath = path.join(__dirname, '../app.json');

if (!fs.existsSync(appJsonPath)) {
  console.error('Error: app.json not found at ' + appJsonPath);
  process.exit(1);
}

const appJson = JSON.parse(fs.readFileSync(appJsonPath, 'utf8'));

const bumpType = process.argv[2] || 'patch'; // major, minor, patch
if (!['major', 'minor', 'patch'].includes(bumpType)) {
  console.error('Usage: ./scripts/bump-version.sh [major|minor|patch]');
  process.exit(1);
}

// Parse version: major.minor.patch
let version = appJson.expo.version || '1.0.0';
let [major, minor, patch] = version.split('.').map(Number);

if (bumpType === 'major') {
  major += 1;
  minor = 0;
  patch = 0;
} else if (bumpType === 'minor') {
  minor += 1;
  patch = 0;
} else if (bumpType === 'patch') {
  patch += 1;
}

const newVersion = `${major}.${minor}.${patch}`;
appJson.expo.version = newVersion;

// Increment android.versionCode
if (appJson.expo.android) {
  const currentCode = Number(appJson.expo.android.versionCode || 1);
  appJson.expo.android.versionCode = currentCode + 1;
}

// Increment ios.buildNumber
if (appJson.expo.ios) {
  const currentBuild = Number(appJson.expo.ios.buildNumber || 1);
  appJson.expo.ios.buildNumber = String(currentBuild + 1);
}

fs.writeFileSync(appJsonPath, JSON.stringify(appJson, null, 2) + '\n', 'utf8');

console.log(`✅ Bumped version successfully to ${newVersion}`);
console.log(`🤖 Android versionCode: ${appJson.expo.android?.versionCode}`);
console.log(`🍏 iOS buildNumber: ${appJson.expo.ios?.buildNumber}`);
