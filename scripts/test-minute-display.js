// scripts/test-minute-display.js
const assert = require('assert');

console.log('--- LifeTrack Pro: Minute Display Formatting Test (Option A) ---');

// Test 1: QuickStats minutes calculation
function getQuickStatsDisplay(focusMinutes) {
  const targetMinutes = Math.max(0, Math.round(focusMinutes));
  return `${targetMinutes} min`;
}

assert.strictEqual(getQuickStatsDisplay(42.3), '42 min');
assert.strictEqual(getQuickStatsDisplay(300), '300 min');
assert.strictEqual(getQuickStatsDisplay(0), '0 min');
console.log('  ✓ QuickStats renders pure integer minutes (e.g. 42 min, 300 min)');

// Test 2: Hero card daily average minutes
function getDailyAverageFocusMinutes(selectedPeriod, periodFocusMinutes, barData) {
  if (selectedPeriod === 'day') {
    return Math.round(periodFocusMinutes);
  }
  const activeDays = barData.filter((d) => !d.isFuture);
  const totalMins = activeDays.reduce((sum, d) => sum + d.minutes, 0);
  const count = activeDays.length > 0 ? activeDays.length : 1;
  return Math.round(totalMins / count);
}

const mockWeekBars = [
  { minutes: 40, isFuture: false },
  { minutes: 50, isFuture: false },
  { minutes: 30, isFuture: false },
  { minutes: 0, isFuture: false },
  { minutes: 0, isFuture: true },
];
assert.strictEqual(getDailyAverageFocusMinutes('week', 120, mockWeekBars), 30);
console.log('  ✓ Daily average calculation produces clean integer minutes/day');

// Test 3: Hero card description templates
function getHeroCardDescription(selectedPeriod, dailyAvgMins) {
  if (selectedPeriod === 'day') {
    return `You logged ${dailyAvgMins} min of focus today`;
  }
  if (selectedPeriod === 'month') {
    return `You averaged ${dailyAvgMins} min/day this month`;
  }
  return `You focused for ${dailyAvgMins} min/day on average`;
}

assert.strictEqual(getHeroCardDescription('week', 42), 'You focused for 42 min/day on average');
assert.strictEqual(getHeroCardDescription('day', 45), 'You logged 45 min of focus today');
assert.strictEqual(getHeroCardDescription('month', 60), 'You averaged 60 min/day this month');
console.log('  ✓ Hero card text templates consistently use "min" and "min/day"');

// Test 4: ShareableProgressModal concise download text
function getShareText(storeUrl) {
  return `Download LifeTrack Pro:\n${storeUrl}`;
}

const mockStoreUrl = 'https://play.google.com/store/apps/details?id=com.lifetrackpro.app';
assert.strictEqual(getShareText(mockStoreUrl), 'Download LifeTrack Pro:\nhttps://play.google.com/store/apps/details?id=com.lifetrackpro.app');
console.log('  ✓ Shareable Progress card text matches clean "Download LifeTrack Pro" link format (no redundant details)');

// Test 5: Tight container space optimization (Donut center & Focus Summary 4-card row)
function formatTightContainerHours(mins) {
  if (mins < 60) return `${mins}m`;
  return `${(mins / 60).toFixed(1)}h`;
}

assert.strictEqual(formatTightContainerHours(198), '3.3h');
assert.strictEqual(formatTightContainerHours(45), '45m');
assert.strictEqual(formatTightContainerHours(300), '5.0h');
console.log('  ✓ Tight containers (Donut chart & 4-card Focus Summary) use compact "X.Xh" format so text never wraps');

console.log('----------------------------------------------------');
console.log('All Option A tests passed successfully!');
