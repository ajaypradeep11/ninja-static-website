import assert from 'node:assert/strict';
import { warmImages } from './detail-tours.mjs';

export const designSlugsA = ['acidwave', 'y2k-futurism', 'k-design', 'dreamscape', 'halftone'];

export async function prepareDesignTourA(page, slug) {
  assert.ok(designSlugsA.includes(slug), `Unknown design tour: ${slug}`);
  assert.equal(await page.locator('body').getAttribute('data-design'), slug);
  await warmImages(page);
  // Keep each study's own navigation; omit only the shared portfolio switcher.
  await page.addStyleTag({ content: '.lab-toolbar { visibility: hidden !important; }' });
  await page.evaluate(() => scrollTo({ top: 0, behavior: 'instant' }));
  await page.mouse.move(20, 70);
  await page.waitForTimeout(800);
}

export async function recordDesignTourA(page, slug, { scroll, mark }) {
  const hold = ms => page.waitForTimeout(ms);
  const click = name => page.getByRole('button', { name, exact: true }).click();
  const section = selector => page.locator(selector).evaluate(el => el.getBoundingClientRect().top + scrollY);
  await mark('opening');

  if (slug === 'acidwave') {
    await scroll(4500, await section('#frequencies'));
    await hold(700);
    await click('After dark');
    assert.equal(await page.locator('[data-frequency]:visible').count(), 2);
    await hold(1300);
    await mark('after-dark');
    await click('Left field');
    assert.equal(await page.locator('[data-frequency]:visible').count(), 1);
    await hold(1300);
    await click('All signals');
    await hold(700);
    await page.getByRole('link', { name: 'Explore Static Bloom session', exact: true }).click();
    assert.ok(await page.locator('#session-static').evaluate(el => el.open));
    await hold(1500);
    await mark('static-bloom-session');
    await page.locator('#session-soft summary').click();
    assert.ok(await page.locator('#session-soft').evaluate(el => el.open));
    await hold(1500);
    await mark('soft-circuit-session');
    await scroll(4500);
  } else if (slug === 'y2k-futurism') {
    await click('Preview next track');
    assert.equal(await page.locator('#device-track').textContent(), 'Blue hour');
    await click('Toggle visualizer preview');
    assert.equal(await page.locator('.device-visualizer').getAttribute('aria-pressed'), 'true');
    await hold(1500);
    await mark('player-controls');
    await scroll(5500);
    await click('Cosmic lilac');
    assert.equal(await page.locator('.orbit-device').getAttribute('data-finish'), 'lilac');
    await hold(900);
    await click('Digital lime');
    assert.equal(await page.locator('.orbit-device').getAttribute('data-finish'), 'lime');
    await page.locator('.track[data-track="2"]').click();
    assert.equal(await page.locator('#device-track').textContent(), 'Afterglow.exe');
    await hold(1400);
    await mark('finish-and-track');
    // Return to the actual player so the chosen finish and track are visible.
    await scroll(4500, 0);
    await hold(2000);
    await mark('customized-player');
    await scroll(5000);
  } else if (slug === 'k-design') {
    await scroll(5000, await section('#collection'));
    await hold(700);
    await page.locator('[data-form-filter="lighting"]').click();
    assert.equal(await page.locator('[data-form-category]:visible').count(), 1);
    await hold(1000);
    await click('View Dome lamp details');
    await page.locator('.form-dialog[open]').waitFor();
    assert.equal(await page.locator('#form-dialog-title').textContent(), 'Dome lamp');
    await hold(2200);
    await mark('dome-lamp-details');
    await click('Close object details');
    await page.locator('[data-form-filter="living"]').click();
    assert.equal(await page.locator('[data-form-category]:visible').count(), 2);
    await hold(1000);
    await click('View Daily bowl details');
    assert.equal(await page.locator('#form-dialog-title').textContent(), 'Daily bowl');
    await hold(2000);
    await mark('daily-bowl-details');
    await click('Close object details');
    await page.locator('[data-form-filter="all"]').click();
    await hold(500);
    await scroll(4500);
  } else if (slug === 'dreamscape') {
    await scroll(4500, await section('#worlds'));
    await hold(700);
    await page.locator('[data-world-choice="rose"]').click();
    assert.equal(await page.locator('body').getAttribute('data-world'), 'rose');
    await hold(1000);
    await page.locator('[data-world-choice="tide"]').click();
    assert.equal(await page.locator('body').getAttribute('data-world'), 'tide');
    await hold(1100);
    await mark('world-selected');
    await scroll(4000, 0);
    assert.equal(await page.locator('#world-name').textContent(), 'A softer horizon');
    await hold(2200);
    await mark('softer-horizon');
    await scroll(6500);
  } else if (slug === 'halftone') {
    await scroll(5000, await section('#stories'));
    await hold(700);
    await click('Process');
    assert.equal(await page.locator('.story-card').count(), 2);
    await hold(1300);
    await page.locator('.story-card button[data-story="1"]').click();
    const article = page.locator('.story-dialog[open]');
    await article.waitFor();
    assert.equal(await page.locator('#dialog-title').textContent(), 'An ink-stained kind of love.');
    await hold(1700);
    await mark('article-open');
    await article.evaluate(el => new Promise(resolve => {
      const start = performance.now(), end = el.scrollHeight - el.clientHeight;
      const frame = now => {
        const progress = Math.min(1, (now - start) / 2000);
        el.scrollTop = end * progress * progress * (3 - 2 * progress);
        if (progress < 1) requestAnimationFrame(frame);
        else resolve();
      };
      requestAnimationFrame(frame);
    }));
    await hold(800);
    await mark('article-read');
    await click('Back to the stories ↗');
    await page.locator('[data-category="all"]').click();
    await page.locator('#issue-select').selectOption('002');
    assert.equal(await page.locator('.story-card').count(), 3);
    assert.match(await page.locator('.story-card').first().textContent(), /The city belongs to the night owls/);
    await hold(1500);
    await mark('after-hours-edition');
    await scroll(4000);
  } else {
    throw new Error(`Unknown design tour: ${slug}`);
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
