import { chromium } from 'playwright';

const errors = [];
const browser = await chromium.launch();
const context = await browser.newContext();
const page = await context.newPage();
page.on('console', msg => {
  if (msg.type() === 'error') errors.push(msg.text());
});
page.on('pageerror', err => errors.push('pageerror: ' + err.message));

await page.goto('http://localhost:5183/', { waitUntil: 'networkidle' });
await page.waitForTimeout(1000);

console.log('Console errors after load:', JSON.stringify(errors));

const toggle = page.locator('[title="Full screen"]');
const count = await toggle.count();
console.log('Toggle span found count:', count);

if (count > 0) {
  await toggle.click();
  await page.waitForTimeout(500);

  const result = await page.evaluate(() => {
    const fsEl = document.fullscreenElement;
    // find the wrapping div - try to guess based on common patterns
    return {
      hasFullscreenElement: !!fsEl,
      fsElTag: fsEl ? fsEl.tagName : null,
    };
  });
  console.log('Fullscreen state:', JSON.stringify(result));

  const titleAfter = await page.locator('[title="Exit full screen"]').count();
  console.log('Exit full screen title now present:', titleAfter);

  // check transform on shellRef div - look for element with scale transform
  const transforms = await page.evaluate(() => {
    const all = document.querySelectorAll('div');
    const found = [];
    all.forEach(el => {
      const t = getComputedStyle(el).transform;
      if (t && t !== 'none') found.push(t);
    });
    return found;
  });
  console.log('Transforms found:', JSON.stringify(transforms));
}

console.log('Console errors after click:', JSON.stringify(errors));

await browser.close();
