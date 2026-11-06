// Public-page tours for previews that demonstrate a project in use.
export async function warmImages(page) {
  await page.evaluate(() => document.querySelectorAll('img').forEach(image => { image.loading = 'eager'; }));
  await page.waitForFunction(() => [...document.images].every(image => image.complete), undefined, { timeout: 15000 });
  await page.evaluate(() => document.fonts.ready);
}

export async function prepareDetailTour(page, slug) {
  if (slug === 'ajay-portfolio') {
    // Cache the actual gallery and project images before the recorded clicks.
    for (const route of ['/blog/mk3gears', '/blog', '/about']) {
      await page.goto(`https://ajaypradeep.com${route}`, { waitUntil: 'domcontentloaded' });
      await warmImages(page);
      await page.waitForTimeout(700);
    }
  } else {
    await page.getByRole('button', { name: /System Design.*interactive/ }).click();
    await page.getByRole('button', { name: 'Grid', exact: true }).click();
    // Start at the real Classic Designs cards; the homepage is never recorded.
    await page.evaluate(() => scrollTo({ top: document.documentElement.scrollHeight, behavior: 'instant' }));
  }
  await page.waitForTimeout(1000);
}

export async function recordDetailTour(page, slug, { scroll, mark }) {
  if (slug === 'ajay-portfolio') {
    await mark('about');
    await scroll(6000, 1000);
    await page.waitForTimeout(500);
    await page.getByRole('link', { name: 'Design', exact: true }).click();
    await page.waitForURL('**/blog');
    await warmImages(page);
    await page.waitForTimeout(800);
    await mark('design-gallery');
    await page.waitForTimeout(1500);
    await page.locator('a[href="/blog/mk3gears"]').click();
    await page.waitForURL('**/blog/mk3gears');
    await warmImages(page);
    await page.waitForTimeout(1000);
    await mark('crimson-lancer');
    return scroll(8000);
  }

  await mark('system-design');
  await page.getByRole('button', { name: /Chat System.*WebSocket/ }).click();
  await page.getByRole('button', { name: 'Auto Chat', exact: true }).waitFor();
  await page.waitForTimeout(800);
  await mark('chat-system');
  // These controls operate the lesson's local simulation, not a real chat.
  await page.getByRole('button', { name: 'Auto Chat', exact: true }).click();
  await page.waitForTimeout(6500);
  await mark('chat-messages');
  await page.getByRole('button', { name: 'Disconnect', exact: true }).nth(1).click();
  await page.waitForTimeout(2500);
  await mark('chat-disconnected');
  await page.getByRole('button', { name: 'Connect', exact: true }).click();
  await page.waitForTimeout(4500);
  await page.getByRole('button', { name: 'Auto ON', exact: true }).click();
  await page.waitForTimeout(1000);
  await mark('chat-reconnected');
  const content = await page.locator('main').innerText();
  if (!content.includes('Chat Visualizer') || !/\b[3-9] msgs\b/.test(content)) {
    throw new Error('Chat simulation did not demonstrate message delivery. Existing preview was preserved.');
  }
  return page.evaluate(() => ({
    url: location.href,
    height: document.documentElement.scrollHeight,
    viewport: { width: innerWidth, height: innerHeight },
    finalScroll: scrollY,
    content: document.querySelector('main').innerText,
  }));
}
