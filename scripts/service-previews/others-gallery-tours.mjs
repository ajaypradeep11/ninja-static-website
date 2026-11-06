import assert from 'node:assert/strict';
import { warmImages } from './detail-tours.mjs';

export const othersGallerySlugs = ['conversy-app', 'ninja-hr'];

const screens = {
  'conversy-app': {
    first: 'Agent management',
    second: 'Agent integrations',
    opening: 'agent-management',
    detail: 'agent-integrations',
  },
  'ninja-hr': {
    first: 'Admin dashboard',
    second: 'Employee profile',
    opening: 'admin-dashboard',
    detail: 'employee-profile',
  },
};

export async function prepareOthersGalleryTour(page, slug) {
  assert.ok(othersGallerySlugs.includes(slug), `Unknown gallery tour: ${slug}`);
  await warmImages(page);
  await page.evaluate(() => Promise.all([...document.images].map(image => image.decode())));
  assert.equal(await page.locator('.ln-bar').count(), 0, 'The project should use its standalone layout.');
  assert.equal(await page.locator('.lightbox.is-open').count(), 0);
  // Begin with a real product screen and its caption, below the case-study intro.
  await page.locator('.shot').first().evaluate(el => {
    scrollTo({ top: el.getBoundingClientRect().top + scrollY - 24, behavior: 'instant' });
  });
  await page.mouse.move(20, 70);
  await page.waitForTimeout(700);
}

export async function recordOthersGalleryTour(page, slug, { scroll, mark }) {
  assert.ok(othersGallerySlugs.includes(slug), `Unknown gallery tour: ${slug}`);
  const screen = screens[slug];
  const hold = ms => page.waitForTimeout(ms);
  const open = async name => {
    await page.getByRole('button', { name: `Enlarge: ${name}`, exact: true }).click();
    const dialog = page.getByRole('dialog', { name, exact: true });
    await dialog.waitFor({ state: 'visible' });
    assert.equal(await page.locator('.lightbox.is-open').count(), 1);
    assert.ok(await dialog.locator('img').evaluate(image => image.complete && image.naturalWidth > 800));
    return dialog;
  };
  const close = async dialog => {
    await dialog.getByRole('button', { name: 'Close', exact: true }).click();
    await dialog.waitFor({ state: 'hidden' });
    assert.equal(await page.locator('.lightbox.is-open').count(), 0);
    await hold(450);
  };

  await mark('opening');
  const first = await open(screen.first);
  await hold(3200);
  await mark(screen.opening);
  await close(first);

  const secondButton = page.getByRole('button', { name: `Enlarge: ${screen.second}`, exact: true });
  const secondTop = await secondButton.evaluate(el => el.getBoundingClientRect().top + scrollY - 100);
  await scroll(4800, secondTop);
  await hold(500);
  await mark('feature-gallery');
  const second = await open(screen.second);
  await hold(3200);
  await mark(screen.detail);
  await close(second);

  // Continue over the remaining real screenshots to the end of the showcase.
  await scroll(6500);
  await hold(900);
  await mark('remaining-product-screens');
  return page.evaluate(() => ({
    url: location.href,
    height: document.documentElement.scrollHeight,
    viewport: { width: innerWidth, height: innerHeight },
    finalScroll: scrollY,
    expectedFinalScroll: document.documentElement.scrollHeight - innerHeight,
  }));
}
