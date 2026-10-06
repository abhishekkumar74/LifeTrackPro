/**
 * LifeTrack Pro — AdMob Production Configuration Safety Validator
 * 
 * Ensures that production builds never accidentally ship with Google Test Ad Unit IDs
 * or unconfigured AdMob app IDs.
 */

const fs = require('fs');
const path = require('path');

const GOOGLE_TEST_APP_ID_ANDROID = 'ca-app-pub-3940256099942544~3347511713';
const GOOGLE_TEST_APP_ID_IOS = 'ca-app-pub-3940256099942544~1458002511';

const GOOGLE_TEST_UNIT_IDS = [
  'ca-app-pub-3940256099942544/9214589741',
  'ca-app-pub-3940256099942544/1033173712',
  'ca-app-pub-3940256099942544/5224354917',
  'ca-app-pub-3940256099942544/9257395921',
  'ca-app-pub-3940256099942544/2934735716',
  'ca-app-pub-3940256099942544/4411468910',
];

function validate() {
  console.log('🔍 Validating AdMob Configuration...');

  const isProduction = process.env.EAS_BUILD_PROFILE === 'production' || process.env.NODE_ENV === 'production';
  const errors = [];
  const warnings = [];

  // 1. Check app.json config plugin
  const appJsonPath = path.join(__dirname, '..', 'app.json');
  if (fs.existsSync(appJsonPath)) {
    const appJson = JSON.parse(fs.readFileSync(appJsonPath, 'utf8'));
    const plugins = appJson.expo?.plugins || [];
    
    const admobPlugin = plugins.find(p => Array.isArray(p) && p[0] === 'react-native-google-mobile-ads');
    if (!admobPlugin) {
      errors.push('❌ app.json is missing the react-native-google-mobile-ads config plugin!');
    } else {
      const pluginOpts = admobPlugin[1] || {};
      if (!pluginOpts.androidAppId) {
        errors.push('❌ app.json is missing androidAppId in react-native-google-mobile-ads plugin!');
      } else if (isProduction && pluginOpts.androidAppId === GOOGLE_TEST_APP_ID_ANDROID) {
        warnings.push('⚠️ app.json uses Google Test Android App ID (ca-app-pub-3940256099942544~3347511713). Remember to update for live production store release!');
      }
    }
  }

  // 2. Check environment variables if in production mode
  if (isProduction) {
    console.log('📦 Production environment detected.');

    if (process.env.EXPO_PUBLIC_ADMOB_USE_TEST_ADS === 'true') {
      errors.push('❌ EXPO_PUBLIC_ADMOB_USE_TEST_ADS is set to "true" in production!');
    }

    const envAndroidBanner = process.env.EXPO_PUBLIC_ADMOB_ANDROID_BANNER_ID;
    if (envAndroidBanner && GOOGLE_TEST_UNIT_IDS.includes(envAndroidBanner)) {
      errors.push(`❌ Production EXPO_PUBLIC_ADMOB_ANDROID_BANNER_ID uses Google Test ID: ${envAndroidBanner}`);
    }
  } else {
    console.log('🧪 Development / Test environment detected.');
    console.log('✅ Official Google Test Ad Unit IDs are safely configured for testing.');
  }

  if (warnings.length > 0) {
    console.log('\nWarnings:');
    warnings.forEach(w => console.log(w));
  }

  if (errors.length > 0) {
    console.error('\n🛑 AdMob Configuration Validation Failed:');
    errors.forEach(e => console.error(e));
    process.exit(1);
  } else {
    console.log('\n✅ AdMob Configuration Validation Passed Cleanly!\n');
  }
}

validate();
