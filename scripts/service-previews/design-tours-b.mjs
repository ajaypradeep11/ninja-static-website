import assert from 'node:assert/strict';
import { warmImages } from './detail-tours.mjs';

export const designSlugsB = ['hyperbloom', 'neo-brutalism', 'neo-swiss', 'synthwave', 'vector-surrealism'];

export async function prepareDesignTourB(page, slug) {
  assert.ok(designSlugsB.includes(slug), `Unknown design tour: ${slug}`);
  await warmImages(page);
  // This shared portfolio switcher is outside the design being demonstrated.
  await page.addStyleTag({ content: '.lab-toolbar { visibility: hidden !important; }' });
  await page.evaluate(() => scrollTo({ top: 0, behavior: 'instant' }));
  await page.mouse.move(20, 70);
  await page.waitForTimeout(700);
}

export async function recordDesignTourB(page, slug, { scroll, mark }) {
  const hold = ms => page.waitForTimeout(ms);
  const section = selector => page.locator(selector).evaluate(el => el.getBoundingClientRect().top + scrollY);
  const press = async selector => {
    const button = page.locator(selector);
    await button.click();
    assert.equal(await button.getAttribute('aria-pressed'), 'true');
  };
  await mark('opening');

  if (slug === 'hyperbloom') {
    for (const palette of ['summer', 'twilight']) {
      await press(`[data-palette="${palette}"]`);
      assert.equal(await page.locator('.botanical').getAttribute('data-season'), palette);
      await hold(1900);
      await mark(`${palette}-palette`);
    }
    await scroll(4500, await section('#flowers') - 80);
    await hold(1300);
    await mark('flower-collection');
    await scroll(5500);
    await mark('studio');
  } else if (slug === 'neo-brutalism') {
    await scroll(4500, await section('#happenings') - 90);
    for (const type of ['make', 'meet', 'all']) {
      await press(`[data-event-type="${type}"]`);
      assert.equal(await page.locator('.gc-event:visible').count(), type === 'all' ? 4 : 2);
      await hold(1400);
      await mark(`${type}-events`);
    }
    await scroll(3500, await section('#club') - 150);
    await page.locator('input[name="gc-plan"][value="resident"]').check();
    assert.match(await page.locator('#gc-plan-summary').innerText(), /Regular face.*149/);
    await hold(2000);
    await mark('membership-preview');
    await scroll(2200);
  } else if (slug === 'neo-swiss') {
    await scroll(4200, await section('#work') - 100);
    await press('[data-filter="digital"]');
    assert.equal(await page.locator('[data-project]:visible').count(), 2);
    await hold(1600);
    await mark('digital-projects');
    await page.getByRole('button', { name: 'Open Open Archive project details', exact: true }).click();
    await page.getByRole('dialog').waitFor();
    assert.equal(await page.locator('#dialog-title').innerText(), 'Open Archive');
    await hold(3200);
    await mark('open-archive-details');
    await page.getByRole('button', { name: 'Close project details', exact: true }).click();
    await page.getByRole('dialog').waitFor({ state: 'hidden' });
    await press('[data-filter="all"]');
    assert.equal(await page.locator('[data-project]:visible').count(), 4);
    await hold(800);
    await scroll(7000);
    await mark('studio-and-contact');
  } else if (slug === 'synthwave') {
    for (const station of ['coast', 'after']) {
      await press(`.station-presets [data-select-station="${station}"]`);
      assert.equal(await page.locator('body').getAttribute('data-station'), station);
      await hold(1900);
      await mark(`${station}-station`);
    }
    await scroll(4500, await section('#frequencies') - 80);
    await press('.frequency-card[data-select-station="night"]');
    assert.equal(await page.locator('body').getAttribute('data-station'), 'night');
    await hold(1800);
    await mark('frequency-collection');
    await scroll(5500);
    await mark('manifesto');
  } else if (slug === 'vector-surrealism') {
    await press('[data-vs-palette="afterhours"]');
    assert.equal(await page.locator('[data-vs-world]').getAttribute('data-palette'), 'afterhours');
    await hold(2200);
    await mark('afterhours-palette');
    await scroll(4500, await section('#selected') - 90);
    await hold(900);
    await page.getByRole('button', { name: 'Explore Day Off project', exact: true }).click();
    await page.getByRole('dialog').waitFor();
    assert.equal(await page.locator('#vs-dialog-title').innerText(), 'Day Off');
    await hold(3200);
    await mark('day-off-details');
    await page.getByRole('button', { name: 'Close project details', exact: true }).click();
    await page.getByRole('dialog').waitFor({ state: 'hidden' });
    await hold(700);
    await scroll(4500);
    await mark('studio');
  }

  return page.evaluate(() => ({
    url: location.href,
    height: document.documentElement.scrollHeight,
    viewport: { width: innerWidth, height: innerHeight },
    finalScroll: scrollY,
    expectedFinalScroll: document.documentElement.scrollHeight - innerHeight,
  }));
}
