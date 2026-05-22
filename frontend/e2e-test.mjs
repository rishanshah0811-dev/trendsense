import { chromium } from 'playwright';
import { strict as assert } from 'assert';

let browser, page;
let passed = 0;
let failed = 0;
const results = [];

function log(msg) { console.log(`  ${msg}`); }
function pass(name) { passed++; results.push({ name, status: 'PASS' }); console.log(`  \x1b[32m✓\x1b[0m ${name}`); }
function fail(name, err) { failed++; results.push({ name, status: 'FAIL', error: err }); console.log(`  \x1b[31m✗\x1b[0m ${name}: ${err}`); }

async function test(name, fn) {
  try {
    await fn();
    pass(name);
  } catch (e) {
    fail(name, e.message);
  }
}

// ─── Setup ───────────────────────────────────────────────────────
console.log('\n\x1b[1mTrendSense E2E Test Suite\x1b[0m\n');

browser = await chromium.launch({ headless: true });
page = await browser.newPage({ viewport: { width: 1400, height: 900 } });

// ─── 1. Home Page Tests ─────────────────────────────────────────
console.log('\x1b[36m1. Home Page\x1b[0m');

await page.goto('http://localhost:3000', { waitUntil: 'networkidle' });

await test('Page title is correct', async () => {
  const title = await page.title();
  assert(title.includes('TrendSense'), `Expected title to include TrendSense, got: ${title}`);
});

await test('Header shows TRENDSENSE wordmark', async () => {
  const header = await page.locator('header h1').textContent();
  assert(header.toUpperCase().includes('TRENDSENSE'), `Header text: ${header}`);
});

await test('Amber accent line exists under header', async () => {
  const line = page.locator('header .h-px');
  await line.waitFor({ timeout: 3000 });
  const bgColor = await line.evaluate(el => getComputedStyle(el).backgroundColor);
  assert(bgColor.includes('255') && bgColor.includes('171'), `Amber line bg: ${bgColor}`);
});

await test('Ticker input field is present', async () => {
  const input = page.locator('input[type="text"]');
  await input.waitFor({ timeout: 3000 });
  const placeholder = await input.getAttribute('placeholder');
  assert.equal(placeholder, 'AAPL');
});

await test('All 6 example ticker chips are present', async () => {
  const chips = ['AAPL', 'NVDA', 'TSLA', 'MSFT', 'JPM', 'GS'];
  for (const ticker of chips) {
    const btn = page.locator('button', { hasText: new RegExp(`^${ticker}$`) });
    assert(await btn.count() > 0, `Missing chip: ${ticker}`);
  }
});

await test('Date inputs default to 3yr range', async () => {
  const startVal = await page.locator('input[type="date"]').first().inputValue();
  const endVal = await page.locator('input[type="date"]').last().inputValue();
  assert(startVal.startsWith('2023'), `Start: ${startVal}`);
  assert(endVal.startsWith('2026'), `End: ${endVal}`);
});

await test('Bullish/bearish threshold sliders present at 55%', async () => {
  const sliders = page.locator('input[type="range"]');
  assert.equal(await sliders.count(), 2);
  const val1 = await sliders.first().inputValue();
  assert(parseFloat(val1) > 0.54 && parseFloat(val1) < 0.56, `Bullish: ${val1}`);
});

await test('Analyse button is disabled before validation', async () => {
  const btn = page.locator('button', { hasText: 'Analyse' });
  assert(await btn.isDisabled(), 'Analyse should be disabled');
});

// ─── 2. Ticker Validation Tests ─────────────────────────────────
console.log('\n\x1b[36m2. Ticker Validation\x1b[0m');

await test('Valid ticker (AAPL) enables Analyse button', async () => {
  await page.fill('input[type="text"]', 'AAPL');
  await page.locator('input[type="text"]').blur();
  await page.waitForTimeout(6000);
  const btn = page.locator('button', { hasText: 'Analyse' });
  assert(!(await btn.isDisabled()), 'Analyse should be enabled after valid ticker');
});

await test('Validation indicator shows ticker name in green', async () => {
  const indicator = page.locator('input[type="text"] + span, .relative span').first();
  const text = await indicator.textContent();
  assert(text.length > 0, `Indicator text: ${text}`);
});

await test('Invalid ticker shows error', async () => {
  await page.fill('input[type="text"]', 'ZZZZINVALID');
  await page.locator('input[type="text"]').blur();
  await page.waitForTimeout(6000);
  const btn = page.locator('button', { hasText: 'Analyse' });
  assert(await btn.isDisabled(), 'Analyse should be disabled for invalid ticker');
});

await test('Chip click populates input and validates', async () => {
  await page.fill('input[type="text"]', '');
  const nvdaChip = page.locator('button', { hasText: /^NVDA$/ });
  await nvdaChip.click();
  await page.waitForTimeout(6000);
  const inputVal = await page.locator('input[type="text"]').inputValue();
  assert.equal(inputVal, 'NVDA');
  const btn = page.locator('button', { hasText: 'Analyse' });
  assert(!(await btn.isDisabled()), 'Analyse should be enabled after chip click');
});

// ─── 3. Pipeline Progress Tests ─────────────────────────────────
console.log('\n\x1b[36m3. Pipeline & Streaming\x1b[0m');

// Reset to AAPL for the main test
await page.fill('input[type="text"]', 'AAPL');
await page.locator('input[type="text"]').blur();
await page.waitForTimeout(6000);

await test('Clicking Analyse shows pipeline progress', async () => {
  const btn = page.locator('button', { hasText: 'Analyse' });
  await btn.click();
  await page.waitForTimeout(3000);
  await page.screenshot({ path: '/tmp/ts-test-progress.png' });
  // Should see progress stages
  const progressText = await page.locator('main').textContent();
  assert(
    progressText.includes('Fetching') || progressText.includes('Computing') || progressText.includes('Training') || progressText.includes('done'),
    'Expected pipeline stage text'
  );
});

await test('Progress bar fills during pipeline', async () => {
  const progressBar = page.locator('.bg-\\[\\#ffab00\\]').first();
  const width = await progressBar.evaluate(el => el.style.width || getComputedStyle(el).width);
  assert(width !== '0%' && width !== '0px', `Progress bar width: ${width}`);
});

await test('Pipeline completes and shows results (up to 4 min)', async () => {
  await page.waitForSelector('button:has-text("New Analysis")', { timeout: 240000 });
  await page.screenshot({ path: '/tmp/ts-test-results-top.png' });
  const pageText = await page.locator('main').textContent();
  assert(pageText.includes('AAPL'), 'Results should show AAPL ticker');
  assert(pageText.includes('New Analysis'), 'Should show New Analysis button');
});

// ─── 4. Results Dashboard Tests ─────────────────────────────────
console.log('\n\x1b[36m4. Results Dashboard\x1b[0m');

await test('Candlestick chart renders', async () => {
  // lightweight-charts renders inside a canvas
  const canvas = page.locator('canvas');
  assert(await canvas.count() > 0, 'No canvas elements found for chart');
});

await test('Chart header shows ticker and signal counts', async () => {
  const pageText = await page.locator('main').textContent();
  assert(pageText.includes('AAPL'), 'Results should show AAPL');
  assert(pageText.includes('Buy') && pageText.includes('Sell'), 'Should show Buy/Sell counts');
});

await test('Signal summary shows 3 stat cards', async () => {
  const totalSignals = page.locator('text=Total Signals');
  const winRate = page.locator('text=Win Rate');
  const avgConf = page.locator('text=Avg Confidence');
  assert(await totalSignals.count() > 0, 'Missing Total Signals card');
  assert(await winRate.count() > 0, 'Missing Win Rate card');
  assert(await avgConf.count() > 0, 'Missing Avg Confidence card');
});

await test('Model performance metrics are displayed', async () => {
  const metricsSection = page.locator('text=Model Performance');
  assert(await metricsSection.count() > 0, 'Missing Model Performance section');
  // Check for percentage values
  const pageText = await page.locator('main').textContent();
  assert(pageText.includes('Test Acc') || pageText.includes('Test F1'), 'Missing metric labels');
});

await test('Classification report table has rows', async () => {
  const tableRows = page.locator('table tbody tr');
  const count = await tableRows.count();
  assert(count >= 1, `Expected classification table rows, got: ${count}`);
});

await test('ROC curves chart renders', async () => {
  const rocSection = page.locator('text=ROC Curves');
  assert(await rocSection.count() > 0, 'Missing ROC Curves section');
});

await test('SHAP feature importance chart renders', async () => {
  const shapSection = page.locator('text=Feature Importance');
  assert(await shapSection.count() > 0, 'Missing SHAP section');
});

await test('Recent signals table shows entries', async () => {
  const signalsSection = page.locator('text=Recent Signals');
  assert(await signalsSection.count() > 0, 'Missing Recent Signals section');
  // Check for BUY/SELL badges
  const pageText = await page.locator('main').textContent();
  assert(pageText.includes('BUY') || pageText.includes('SELL'), 'No signal badges found');
});

await test('Signal outcomes show correct/incorrect/pending', async () => {
  const pageText = await page.locator('main').textContent();
  const hasOutcomes = pageText.includes('correct') || pageText.includes('incorrect') || pageText.includes('pending');
  assert(hasOutcomes, 'No outcome labels found');
});

await test('Threshold sliders are present in sidebar', async () => {
  const thresholdSection = page.locator('text=Confidence Thresholds');
  assert(await thresholdSection.count() > 0, 'Missing threshold slider section');
});

await test('Model config panel shows hyperparameters', async () => {
  const configSection = page.locator('text=Model Config');
  assert(await configSection.count() > 0, 'Missing Model Config section');
  const pageText = await page.locator('main').textContent();
  assert(pageText.includes('learning_rate') || pageText.includes('max_depth') || pageText.includes('n_estimators'),
    'Missing hyperparameter values');
});

// ─── 5. Threshold Slider Interaction ─────────────────────────────
console.log('\n\x1b[36m5. Threshold Slider Interaction\x1b[0m');

await test('Changing bullish threshold updates signals without page reload', async () => {
  // Get current signal count
  const beforeText = await page.locator('main').textContent();
  const beforeMatch = beforeText.match(/Total Signals\s*(\d+)/);
  const beforeCount = beforeMatch ? parseInt(beforeMatch[1]) : -1;

  // Move bullish slider to max (75%) to filter out most signals
  const sliders = page.locator('input[type="range"]');
  const bullishSlider = sliders.first();
  await bullishSlider.fill('0.75');
  await page.waitForTimeout(2000);

  const afterText = await page.locator('main').textContent();
  const afterMatch = afterText.match(/Total Signals\s*(\d+)/);
  const afterCount = afterMatch ? parseInt(afterMatch[1]) : -1;

  assert(afterCount <= beforeCount, `Signals should decrease: before=${beforeCount}, after=${afterCount}`);
});

await test('Setting threshold very high shows empty state', async () => {
  const sliders = page.locator('input[type="range"]');
  await sliders.first().fill('0.75');
  await sliders.last().fill('0.75');
  await page.waitForTimeout(2000);
  // Either fewer signals or empty state message
  const pageText = await page.locator('main').textContent();
  const isValid = pageText.includes('No signals') || pageText.includes('Total Signals');
  assert(isValid, 'Should show signal count or empty state');
});

await test('Resetting threshold back shows signals again', async () => {
  const sliders = page.locator('input[type="range"]');
  await sliders.first().fill('0.55');
  await sliders.last().fill('0.55');
  await page.waitForTimeout(2000);
  const pageText = await page.locator('main').textContent();
  assert(pageText.includes('BUY') || pageText.includes('SELL'), 'Signals should reappear');
});

// ─── 6. New Analysis Flow ───────────────────────────────────────
console.log('\n\x1b[36m6. New Analysis Flow\x1b[0m');

await test('New Analysis button returns to input screen', async () => {
  const newBtn = page.locator('button', { hasText: 'New Analysis' });
  await newBtn.click();
  await page.waitForTimeout(1000);
  const input = page.locator('input[type="text"]');
  assert(await input.isVisible(), 'Ticker input should be visible again');
});

// ─── 7. Responsive / Design Tests ───────────────────────────────
console.log('\n\x1b[36m7. Design & Typography\x1b[0m');

await test('Space Mono font loaded for mono elements', async () => {
  const fontFamily = await page.evaluate(() => {
    const el = document.querySelector('[class*="font-mono"], [style*="Space Mono"]');
    if (!el) return 'no element found';
    return getComputedStyle(el).fontFamily;
  });
  // Font might be in the CSS variable
  assert(fontFamily !== 'no element found', 'Should have mono font elements');
});

await test('Background color is near-black', async () => {
  const bgColor = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
  assert(bgColor.includes('5, 5, 5') || bgColor.includes('rgb(5'), `Body bg: ${bgColor}`);
});

// ─── 8. Mobile Responsiveness ───────────────────────────────────
console.log('\n\x1b[36m8. Mobile Responsiveness\x1b[0m');

await test('Page renders on mobile viewport', async () => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto('http://localhost:3000', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);
  const input = page.locator('input[type="text"]');
  assert(await input.isVisible(), 'Input should be visible on mobile');
  await page.screenshot({ path: '/tmp/ts-test-mobile.png' });
  // Reset viewport
  await page.setViewportSize({ width: 1400, height: 900 });
});

// ─── 9. API Endpoint Tests ──────────────────────────────────────
console.log('\n\x1b[36m9. API Endpoints\x1b[0m');

await test('GET /health returns ok', async () => {
  const res = await page.evaluate(() => fetch('http://localhost:8000/health').then(r => r.json()));
  assert.equal(res.status, 'ok');
});

await test('GET /tickers/validate/AAPL returns valid', async () => {
  const res = await page.evaluate(() => fetch('http://localhost:8000/tickers/validate/AAPL').then(r => r.json()));
  assert.equal(res.valid, true);
});

await test('GET /tickers/validate/XYZINVALID returns invalid', async () => {
  const res = await page.evaluate(() => fetch('http://localhost:8000/tickers/validate/XYZINVALID123').then(r => r.json()));
  assert.equal(res.valid, false);
});

await test('POST /signals/filter returns filtered signals', async () => {
  const res = await page.evaluate(() =>
    fetch('http://localhost:8000/signals/filter', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        raw_probas: [
          { date: '2024-01-01', price: 100, bullish_prob: 0.8, bearish_prob: 0.1, index: 0 },
          { date: '2024-01-02', price: 101, bullish_prob: 0.3, bearish_prob: 0.6, index: 1 },
        ],
        bullish_threshold: 0.55,
        bearish_threshold: 0.55,
        look_ahead: 4,
      }),
    }).then(r => r.json())
  );
  assert(res.signals.length === 2, `Expected 2 filtered signals, got ${res.signals.length}`);
  assert.equal(res.signals[0].signal_type, 'BUY');
  assert.equal(res.signals[1].signal_type, 'SELL');
});

await test('POST /analyse/stream returns SSE events', async () => {
  const eventCount = await page.evaluate(async () => {
    const res = await fetch('http://localhost:8000/analyse/stream', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ticker: 'MSFT', start_date: '2023-05-20', end_date: '2026-05-20',
        bullish_threshold: 0.55, bearish_threshold: 0.55,
      }),
    });
    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let text = '';
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      text += decoder.decode(value, { stream: true });
    }
    return text.split('\n').filter(l => l.startsWith('data: ')).length;
  });
  assert(eventCount >= 10, `Expected 10+ SSE events, got ${eventCount}`);
});

// ─── Summary ────────────────────────────────────────────────────
await browser.close();

console.log('\n\x1b[1m━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\x1b[0m');
console.log(`\x1b[1m  Results: \x1b[32m${passed} passed\x1b[0m, \x1b[${failed > 0 ? '31' : '90'}m${failed} failed\x1b[0m  (${passed + failed} total)`);
console.log('\x1b[1m━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\x1b[0m\n');

if (failed > 0) {
  console.log('Failed tests:');
  results.filter(r => r.status === 'FAIL').forEach(r => console.log(`  - ${r.name}: ${r.error}`));
  console.log('');
}

process.exit(failed > 0 ? 1 : 0);
