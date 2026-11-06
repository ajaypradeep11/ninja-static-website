import assert from 'node:assert/strict';
import { warmImages } from './detail-tours.mjs';

export const othersSlugsA = ['clinic', 'restaurant', 'realty'];

export async function prepareOthersTourA(page, slug) {
  assert.ok(othersSlugsA.includes(slug), `Unknown Others tour: ${slug}`);
  assert.equal(await page.locator('.ln-bar').count(), 0, 'Shared portfolio header must be removed');
  await warmImages(page);
  const minimize = page.getByRole('button', { name: 'Minimise assistant', exact: true });
  if (await minimize.isVisible()) await minimize.click();
  // These tours demonstrate the native product UI; the external assistant is
  // excluded from recording, while the actual page/widget remains unchanged.
  await page.addStyleTag({ content: '.ln-widget { visibility: hidden !important; }' });
  if (slug === 'restaurant') {
    // Dinner-service demo clock: keep RAF/timers real and pickup ETAs in hours.
    await page.clock.setFixedTime(new Date('2026-11-07T18:00:00-05:00'));
  }
  await page.evaluate(() => scrollTo({ top: 0, behavior: 'instant' }));
  await page.mouse.move(20, 70);
  await page.waitForTimeout(700);
}

async function scrollPanel(locator, duration, target) {
  await locator.evaluate((element, { duration, target }) => new Promise(resolve => {
    const start = performance.now(), from = element.scrollTop;
    const to = Math.min(target ?? element.scrollHeight, element.scrollHeight - element.clientHeight);
    const frame = now => {
      const progress = Math.min(1, (now - start) / duration);
      element.scrollTop = from + (to - from) * progress * progress * (3 - 2 * progress);
      if (progress < 1) requestAnimationFrame(frame);
      else resolve();
    };
    requestAnimationFrame(frame);
  }), { duration, target });
}

export async function recordOthersTourA(page, slug, { scroll, mark }) {
  const hold = ms => page.waitForTimeout(ms);
  const section = selector => page.locator(selector).evaluate(el => el.getBoundingClientRect().top + scrollY);
  await mark('opening');

  if (slug === 'clinic') {
    await scroll(4500, await section('.types') - 230);
    await page.locator('[data-visit="skin"]').click();
    assert.equal(await page.locator('.doctors [data-label="Dr. Lena Roy"]').getAttribute('aria-pressed'), 'true');
    await hold(1500);
    await mark('doctor-and-visit');
    await page.locator('.panel-1 [data-go="2"]').click();
    await hold(700);
    assert.equal(await page.locator('[data-steps]').getAttribute('data-step'), '2');
    await scroll(1600, await section('.panel-2') - 80);
    await page.locator('[data-date="2026-09-04"]').click();
    await hold(600);
    await mark('appointment-date');
    await scroll(2000, await section('.slots-title') - 320);
    const time = page.locator('.slots [data-select-group="slot"]:not([disabled])').first();
    await time.click();
    assert.equal(await time.getAttribute('aria-pressed'), 'true');
    await hold(1500);
    await mark('appointment-time');
    await page.locator('.panel-2 [data-go="3"]').click();
    await hold(700);
    assert.equal(await page.locator('[data-steps]').getAttribute('data-step'), '3');
    await scroll(1800, await section('.panel-3') - 90);
    assert.match(await page.locator('.panel-3 .summary').innerText(), /Dr\. Lena Roy/);
    await hold(1800);
    await mark('booking-review');
    // The preview stops before confirmation; no appointment is submitted.
    await scroll(1800, await section('.portal') - 100);
    await page.locator('[data-portal="results"]').click();
    assert.equal(await page.locator('[data-portal="results"]').getAttribute('aria-selected'), 'true');
    await hold(1500);
    await mark('patient-results');
    await scroll(3000);
  } else if (slug === 'restaurant') {
    await scroll(4500, await section('.diet-bar') - 100);
    await page.locator('[data-tab="starters"]').click();
    await page.locator('[data-eo-diet="v"]').click();
    assert.equal(await page.locator('[data-eo-diet="v"]').getAttribute('aria-pressed'), 'true');
    await hold(1000);
    await mark('vegetarian-menu');
    await page.getByRole('button', { name: 'Burrata - see details', exact: true }).click();
    await page.locator('#dish-modal.is-open').waitFor();
    await page.locator('[data-eo-mod="1"]').click();
    await page.locator('[data-eo-modal-qty="1"]').click();
    assert.equal(await page.locator('[data-eo-modal-qty-out]').textContent(), '2');
    assert.equal(await page.locator('[data-eo-mod="1"]').getAttribute('aria-pressed'), 'true');
    await hold(1800);
    await mark('dish-customized');
    // This control updates the page's in-memory basket only (addFromModal).
    await page.locator('[data-eo-modal-add]').click();
    await page.locator('[data-eo-fab]').click();
    await page.locator('#cart.is-open').waitFor();
    await page.locator('[data-eo-slot="45"]').click();
    assert.match(await page.locator('[data-cart-list]').innerText(), /Burrata[\s\S]*Extra sourdough/);
    assert.equal(await page.locator('[data-eo-slot="45"]').getAttribute('aria-pressed'), 'true');
    await hold(2000);
    await mark('pickup-basket');
    await page.locator('#cart [data-close]').click();
    await scroll(4000, await section('#reserve') - 40);
    await page.locator('[data-eo-resv-date="sat"]').click();
    await page.locator('[data-eo-resv-time="6:30"]').click();
    const table = page.locator('[data-eo-resv-table][aria-disabled="false"]').first();
    await table.click();
    assert.equal(await table.getAttribute('aria-pressed'), 'true');
    await hold(1800);
    await mark('table-selection');
    // Selecting a table previews availability; never place a hold or booking.
    await scroll(3500);
  } else if (slug === 'realty') {
    assert.equal(await page.locator('[data-cards] .card-wrap').count(), 20);
    await scroll(8000, await section('[data-cards] [data-home="20"]') - 220);
    await hold(1000);
    await mark('expanded-listings');
    await page.locator('.card[data-home-open="20"]').click();
    await page.locator('#detail-20.is-open').waitFor();
    await hold(1600);
    await mark('new-loft-details');
    await page.keyboard.press('Escape');
    await scroll(6000, 0);
    await page.locator('[data-filter="condo"]').click();
    assert.equal(await page.locator('[data-count]').textContent(), '5 homes');
    await hold(1100);
    await mark('condo-filter');
    await page.locator('[data-filter="all"]').click();
    await hold(800);
    for (const id of ['1', '2']) await page.locator(`.card-wrap [data-save="${id}"]`).click();
    assert.equal(await page.locator('[data-saved-count]').textContent(), '2');
    await page.locator('[data-saved-open]').click();
    await page.locator('#saved.is-open').waitFor();
    await hold(900);
    for (const id of ['1', '2']) await page.locator(`[data-compare-pick="${id}"]`).check();
    await page.locator('[data-compare-open]').click();
    await page.locator('#compare.is-open').waitFor();
    assert.match(await page.locator('[data-compare-table]').innerText(), /2288 W 4th Ave[\s\S]*4120 Hastings St/);
    await hold(2200);
    await mark('home-comparison');
    await page.getByRole('button', { name: 'Close comparison', exact: true }).click();
    await page.getByRole('button', { name: 'Close saved homes', exact: true }).click();
    await page.locator('.card[data-home-open="1"]').click();
    await page.locator('#detail-1.is-open').waitFor();
    await hold(1300);
    await mark('listing-details');
    await page.locator('[data-mortgage-toggle="1"]').click();
    await scrollPanel(page.locator('#detail-1 .sheet'), 2200, 540);
    await page.locator('#detail-1 [data-m-amort="30"]').click();
    assert.equal(await page.locator('#detail-1 [data-m-amort="30"]').getAttribute('aria-pressed'), 'true');
    assert.match(await page.locator('#detail-1 [data-m-monthly]').textContent(), /^\$/);
    await hold(2000);
    await mark('payment-calculator');
    await page.keyboard.press('Escape');
    await scroll(4500);
    await hold(800);
  } else {
    throw new Error(`Unknown Others tour: ${slug}`);
  }

  await mark('footer');
  return page.evaluate(() => ({
    url: location.href,
    height: document.documentElement.scrollHeight,
    viewport: { width: innerWidth, height: innerHeight },
    finalScroll: scrollY,
    expectedFinalScroll: document.documentElement.scrollHeight - innerHeight,
  }));
}
