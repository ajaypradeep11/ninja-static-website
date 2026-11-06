// Requires Playwright; PLAYWRIGHT_MODULE can point to an existing installation.
import { mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const root = fileURLToPath(new URL('../../', import.meta.url));
const output = path.join(root, 'output/service-preview-sources');
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ channel: 'chrome', headless: true });
try {
  for (const [slug, url] of [
    ['ajay-portfolio', 'https://ajaypradeep.com'],
  ]) {
    if (process.argv[2] && process.argv[2] !== slug) continue;
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 45000 });
    await page.evaluate(() => document.fonts.ready);
    await page.waitForTimeout(2500);
    for (let i = 0; i < 3; i++) {
      const top = i * 900 * .85;
      await page.evaluate((position) => window.scrollTo({ top: position, behavior: 'instant' }), top);
      await page.waitForTimeout(1200);
      await page.screenshot({ path: path.join(output, `${slug}-${i}.png`) });
    }
    console.log(`Captured ${slug}: ${page.url()}`);
    await page.close();
  }
} finally {
  await browser.close();
}
