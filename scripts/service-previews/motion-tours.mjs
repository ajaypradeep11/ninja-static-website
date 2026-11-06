import assert from 'node:assert/strict';
import { warmImages } from './detail-tours.mjs';

export const motionTourSlugs = ['talia', 'rail', 'outform', 'bloomfield', 'ribbon'];

export async function prepareMotionTour(page, slug) {
  await warmImages(page);
  await page.waitForFunction(() => [...document.querySelectorAll('.motion-scene')]
    .every(scene => scene.dataset.status === 'ready'));
  if (slug === 'talia') await page.locator('.talia-character[data-warp="ready"]').waitFor();
  if (slug === 'rail') {
    // Warm the garment viewer as well as the main room before capture.
    await page.getByRole('button', { name: /Explore this piece/ }).click();
    await page.locator('.rail-panel .motion-scene[data-status="ready"]').waitFor();
    await page.waitForTimeout(1800);
    await page.getByRole('button', { name: 'Close panel', exact: true }).click();
  }
  // The portfolio's navigation overlay is outside each design's own interface.
  await page.addStyleTag({ content: '.motion-toolbar { visibility: hidden !important; }' });
  await page.mouse.move(20, 70);
  await page.waitForTimeout(1200);
}

export async function recordMotionTour(page, slug, { scroll, mark }) {
  const hold = ms => page.waitForTimeout(ms);
  const click = name => page.getByRole('button', { name, exact: true }).click();
  const section = selector => page.locator(selector).evaluate(el => el.getBoundingClientRect().top + scrollY);
  await mark('opening');

  if (slug === 'talia') {
    await page.mouse.move(350, 350, { steps: 35 });
    await hold(600);
    await page.mouse.move(1080, 380, { steps: 45 });
    const cheek = await page.getByRole('button', { name: "Pull Ava's left cheek", exact: true }).boundingBox();
    const x = cheek.x + cheek.width / 2, y = cheek.y + cheek.height / 2;
    await page.mouse.move(x, y, { steps: 25 });
    await page.mouse.down();
    await page.mouse.move(x - 65, y + 12, { steps: 35 });
    await page.locator('.talia-character[data-dragging="true"]').waitFor();
    await hold(700);
    await mark('cheek-reaction');
    await page.mouse.up();
    await page.mouse.move(1050, 350, { steps: 20 });
    await click('Offline');
    await hold(1400);
    await mark('offline');
    await click('Standby');
    await hold(700);
    await scroll(5500, await section('#talia-projects'));
    const project = page.getByRole('button', { name: /^A signal of her own character study/ });
    await project.click();
    assert.equal(await project.getAttribute('aria-expanded'), 'true');
    await hold(1300);
    await mark('project-open');
    await scroll(3500);
  } else if (slug === 'rail') {
    for (const name of ['Acid bloom tee', 'Pixel knit', 'Night shift hoodie']) {
      await click(name);
      await hold(1500);
    }
    await mark('garment-selected');
    await page.getByRole('button', { name: /^Woman \d/ }).click();
    await hold(1500);
    await click('Circuit jersey');
    await hold(1600);
    await mark('collection');
    await scroll(3500);
    await hold(500);
    await scroll(3500, 0);
    await page.getByRole('button', { name: /Explore this piece/ }).click();
    const panel = page.getByRole('dialog');
    await panel.waitFor();
    await hold(1500);
    await mark('garment-front');
    await panel.getByRole('button', { name: 'Back', exact: true }).click();
    assert.equal(await panel.getByRole('button', { name: 'Back', exact: true }).getAttribute('aria-pressed'), 'true');
    await hold(1800);
    await mark('garment-back');
    // Finish on the detail view and crossfade to the opening. Closing this
    // panel restores focus with a page scroll, which distracts in a short loop.
  } else if (slug === 'outform') {
    for (const palette of ['Volt', 'Ultra', 'Heat']) {
      await click(`${palette} color palette`);
      await hold(1000);
    }
    await scroll(6000, await section('#out-work'));
    await hold(1000);
    await mark('off-script');
    for (const name of ['02 AFTER HOURS', '03 UNCOMMON']) {
      const tab = page.getByRole('tab', { name, exact: true });
      await tab.click();
      assert.equal(await tab.getAttribute('aria-selected'), 'true');
      await hold(1900);
      await mark(name.includes('AFTER') ? 'after-hours' : 'uncommon');
    }
    await scroll(1800);
  } else if (slug === 'bloomfield') {
    await click('Golden hour');
    await hold(1400);
    const range = page.getByRole('slider', { name: 'Flower openness' });
    const box = await range.boundingBox();
    const y = box.y + box.height / 2;
    // Drag the actual range thumb slowly so the petal movement is visible.
    await page.mouse.move(box.x + box.width * .85, y);
    await page.mouse.down();
    await page.mouse.move(box.x + 8, y, { steps: 60 });
    await page.mouse.up();
    await hold(700);
    await mark('closed-petals');
    await page.mouse.down();
    await page.mouse.move(box.x + box.width - 8, y, { steps: 90 });
    await page.mouse.up();
    assert.ok(Number(await range.inputValue()) >= 95);
    await hold(1400);
    await mark('full-bloom');
    await click('Moonlight');
    await hold(1800);
    await mark('moonlight');
    await scroll(4500);
  } else if (slug === 'ribbon') {
    // Keep the carousel and its navigation in view while it turns.
    await scroll(1400, 160);
    for (const name of ['Show FORM / 01', 'Show OFFLINE', 'Show LUMA']) {
      await click(name);
      await hold(1500);
    }
    await mark('carousel-luma');
    await click('Inside the project');
    assert.equal(await page.getByRole('button', { name: 'Close project notes', exact: true }).getAttribute('aria-expanded'), 'true');
    await scroll(2000, await section('.ribbon-project-bar') - 180);
    await hold(1600);
    await mark('project-notes');
    await scroll(3500);
  }
  return page.evaluate(slug => ({
    url: location.href,
    height: document.documentElement.scrollHeight,
    viewport: { width: innerWidth, height: innerHeight },
    finalScroll: scrollY,
    expectedFinalScroll: slug === 'rail' ? 0 : document.documentElement.scrollHeight - innerHeight,
  }), slug);
}
