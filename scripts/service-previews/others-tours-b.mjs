import assert from 'node:assert/strict';
import { warmImages } from './detail-tours.mjs';

export const othersSlugsB = ['dashboard', 'dealer', 'trades'];

export async function prepareOthersTourB(page, slug) {
  assert.ok(othersSlugsB.includes(slug), `Unknown Others tour: ${slug}`);
  await warmImages(page);
  assert.equal(await page.locator('.ln-bar').count(), 0);
  const minimize = page.getByRole('button', { name: 'Minimise assistant', exact: true });
  if (await minimize.isVisible()) await minimize.click();
  // Exclude the external assistant from recordings of each product's native UI.
  await page.addStyleTag({ content: '.ln-widget { visibility: hidden !important; }' });
  await page.evaluate(() => scrollTo({ top: 0, behavior: 'instant' }));
  await page.mouse.move(20, 10);
  await page.waitForTimeout(700);
}

export async function recordOthersTourB(page, slug, { scroll, mark }) {
  assert.ok(othersSlugsB.includes(slug), `Unknown Others tour: ${slug}`);
  const hold = ms => page.waitForTimeout(ms);
  const section = selector => page.locator(selector).evaluate(el => el.getBoundingClientRect().top + scrollY);
  const click = selector => page.locator(selector).click();
  await mark('opening');

  if (slug === 'dashboard') {
    await click('[data-metric="mrr"]');
    await click('[data-range="90d"]');
    assert.equal(await page.locator('[data-chart]').getAttribute('data-range'), '90d');
    assert.equal(await page.locator('#chart-title').innerText(), 'Monthly recurring revenue');
    const chart = await page.locator('#chart-svg').boundingBox();
    await page.mouse.move(chart.x + chart.width * .3, chart.y + chart.height * .5);
    await page.mouse.move(chart.x + chart.width * .75, chart.y + chart.height * .5, { steps: 45 });
    await hold(1200);
    await mark('revenue-chart');
    await page.mouse.move(20, 10);
    await scroll(2600);
    await hold(700);
    await mark('recent-events');
    await scroll(2000, 0);
    await click('.side [data-view="customers"]');
    await page.locator('#cust-health').selectOption('risk');
    assert.equal(await page.locator('#cust-rows tr:visible').count(), 2);
    await hold(1200);
    await click('[data-cust="orbit"] .row-btn');
    await page.locator('#drawer').waitFor();
    assert.equal(await page.locator('#drawer-title').innerText(), 'Orbit Retail');
    await hold(2000);
    await mark('customer-details');
    await click('#drawer-close');
    await click('.side [data-view="revenue"]');
    await hold(1000);
    await scroll(1800);
    await click('[data-horizon="12"]');
    const range = page.locator('#fc-churn');
    const box = await range.boundingBox();
    const value = Number(await range.inputValue());
    const y = box.y + box.height / 2;
    await page.mouse.move(box.x + 8 + (box.width - 16) * (value - .5) / 3.5, y);
    await page.mouse.down();
    await page.mouse.move(box.x + box.width * .18, y, { steps: 65 });
    await page.mouse.up();
    assert.ok(Number(await range.inputValue()) < 1.8);
    assert.equal(await page.locator('[data-horizon="12"]').getAttribute('aria-pressed'), 'true');
    await hold(2200);
    await mark('forecast');
    await scroll(1600);
  } else if (slug === 'dealer') {
    await click('[data-filter="brakes"]');
    assert.equal(await page.locator('[data-dl-card]').count(), 3);
    await hold(1000);
    await scroll(2400, 260);
    await click('[data-dl-card="p1"] [data-dl-detail]');
    await page.locator('#dl-drawer.is-open').waitFor();
    assert.equal(await page.locator('[data-dl-drawer-title]').textContent(), 'Front brake pad set, ceramic');
    await hold(1100);
    await click('[data-dl-dmode="am"]');
    assert.equal(await page.locator('[data-dl-dmode="am"]').getAttribute('aria-pressed'), 'true');
    await hold(1300);
    await mark('aftermarket-comparison');
    await page.locator('[data-dl-drawer-body]').evaluate(el => new Promise(resolve => {
      const start = performance.now(), from = el.scrollTop, distance = el.scrollHeight - el.clientHeight - from;
      const frame = now => {
        const progress = Math.min(1, (now - start) / 1800);
        el.scrollTop = from + distance * progress * progress * (3 - 2 * progress);
        if (progress < 1) requestAnimationFrame(frame);
        else resolve();
      };
      requestAnimationFrame(frame);
    }));
    await hold(700);
    await mark('part-specifications');
    await page.getByRole('button', { name: 'Close part details', exact: true }).click();
    await scroll(2000, 0);
    await page.getByRole('tab', { name: 'Book service', exact: true }).click();
    await hold(700);
    await click('[data-dl-svc="brakes"]');
    await hold(700);
    // Reveal the next-step control through the recording's smooth scroll;
    // clicking it offscreen otherwise causes Playwright to jump the page.
    await scroll(1600, await section('.svc-panel-1 [data-go="2"]') - 650);
    await page.getByRole('button', { name: 'Pick a time →', exact: true }).click();
    await hold(800);
    await scroll(1000, await section('#dl-book') - 90);
    await click('[data-dl-day="mon"]');
    await hold(600);
    await page.locator('[data-dl-time]:not([disabled])').first().click();
    await hold(800);
    await page.getByRole('button', { name: 'Review booking →', exact: true }).click();
    assert.equal(await page.locator('#dl-book').getAttribute('data-step'), '3');
    await hold(700);
    await scroll(1000, await section('#dl-book') - 90);
    await hold(1100);
    await mark('service-booking-review');
    // End on the existing service tracker; leave the booking unsubmitted.
    await scroll(3200);
    await mark('service-tracker');
  } else if (slug === 'trades') {
    await scroll(5500, await section('#cc-book .app') - 10);
    await click('[data-cc-job="leak"]');
    assert.equal(await page.locator('[data-cc-job="leak"]').getAttribute('aria-pressed'), 'true');
    await hold(1000);
    await mark('job-selection');
    await page.getByRole('button', { name: 'Next: your address →', exact: true }).click();
    await hold(900);
    await page.getByRole('button', { name: 'Next: pick a window →', exact: true }).click();
    await hold(900);
    await click('[data-select-group="window"][data-cc-tech="priya"]');
    assert.equal(await page.locator('.panel-3 [data-cc-window-tech]').innerText(), 'Priya Raghunathan');
    await hold(1300);
    await mark('visit-window');
    await page.getByRole('button', { name: 'Next: confirm →', exact: true }).click();
    assert.equal(await page.locator('#cc-book [data-steps]').getAttribute('data-step'), '4');
    await hold(1600);
    await mark('booking-review');
    // The final confirmation is deliberately left untouched.
    await scroll(1400, await section('#cc-book .app') - 10);
    await click('[data-cc-dispatch-open]');
    await page.locator('[data-cc-dispatch].is-open').waitFor();
    await hold(1400);
    await click('[data-cc-board-tech="priya"]');
    assert.equal(await page.locator('[data-cc-board-tech="priya"]').getAttribute('aria-pressed'), 'true');
    await hold(1500);
    await mark('dispatch-board');
    await click('[data-cc-board-tech="all"]');
    await hold(700);
    await click('[data-cc-dispatch-close]');
    await scroll(5000);
    await mark('flat-rate-prices');
  }

  return page.evaluate(() => ({
    url: location.href,
    height: document.documentElement.scrollHeight,
    viewport: { width: innerWidth, height: innerHeight },
    finalScroll: scrollY,
    expectedFinalScroll: document.documentElement.scrollHeight - innerHeight,
  }));
}
