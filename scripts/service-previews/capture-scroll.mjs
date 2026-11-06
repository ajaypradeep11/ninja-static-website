// Requires Playwright, installed Chrome, ffmpeg and Pillow for tour posters.
import { mkdir, mkdtemp, rename, writeFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { prepareDetailTour, recordDetailTour } from './detail-tours.mjs';
import { motionTourSlugs, prepareMotionTour, recordMotionTour } from './motion-tours.mjs';
import { moreMotionSlugs, prepareMoreMotionTour, recordMoreMotionTour } from './more-motion-tours.mjs';
import { designSlugsA, prepareDesignTourA, recordDesignTourA } from './design-tours-a.mjs';
import { designSlugsB, prepareDesignTourB, recordDesignTourB } from './design-tours-b.mjs';
import { othersSlugsA, prepareOthersTourA, recordOthersTourA } from './others-tours-a.mjs';
import { othersSlugsB, prepareOthersTourB, recordOthersTourB } from './others-tours-b.mjs';
import { othersGallerySlugs, prepareOthersGalleryTour, recordOthersGalleryTour } from './others-gallery-tours.mjs';

const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const root = fileURLToPath(new URL('../../', import.meta.url));
const localTours = [
  { slugs: motionTourSlugs, directory: 'motion/', prepare: prepareMotionTour, record: recordMotionTour },
  { slugs: moreMotionSlugs, directory: 'motion/', prepare: prepareMoreMotionTour, record: recordMoreMotionTour },
  { slugs: designSlugsA, directory: 'designs/', prepare: prepareDesignTourA, record: recordDesignTourA },
  { slugs: designSlugsB, directory: 'designs/', prepare: prepareDesignTourB, record: recordDesignTourB },
  { slugs: othersSlugsA, directory: '', prepare: prepareOthersTourA, record: recordOthersTourA },
  { slugs: othersSlugsB, directory: '', prepare: prepareOthersTourB, record: recordOthersTourB },
  { slugs: othersGallerySlugs, directory: '', prepare: prepareOthersGalleryTour, record: recordOthersGalleryTour },
];
const sites = {
  'conversy-site': { url: 'https://conversyai.com/', output: 'conversy-scroll', duration: 30000 },
  'ajay-portfolio': { url: 'https://ajaypradeep.com/about', detailTour: true },
  'ninja-learn': { url: 'https://learn.localninja.ca/', detailTour: true },
  'ninja-commerce': { url: 'https://localninja.ca/', preload: true, dismissNewsletter: true },
  ...Object.fromEntries(localTours.flatMap(tour => tour.slugs.map(slug => [slug, {
    url: new URL(`/work/${tour.directory}${slug}.html`, process.env.PREVIEW_BASE_URL || 'http://localhost:5174').href,
    localTour: tour,
  }]))),
};
const slug = process.argv[2] || 'conversy-site';
const site = sites[slug];
if (!site) throw new Error(`Choose a site: ${Object.keys(sites).join(', ')}`);
const interactionTour = site.detailTour || site.localTour;
const output = path.join(root, 'output', site.output || `${slug}-scroll`);
const destination = path.join(root, `public/work/service-previews/motion/${slug}.mp4`);
await mkdir(output, { recursive: true });
await mkdir(path.dirname(destination), { recursive: true });
const captureDirectory = await mkdtemp(path.join(output, 'frames-'));

const browser = await chromium.launch({ channel: 'chrome', headless: true });
const frames = [];
const writes = [];
let report, captureError, captureEnd;
const scenes = [];
try {
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 1,
  });
  const page = await context.newPage();
  await page.goto(site.url, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(2500);
  if (site.detailTour) await prepareDetailTour(page, slug);
  if (site.localTour) await site.localTour.prepare(page, slug);
  if (site.preload) {
    // Warm lazy project/product images before recording so they do not pop in.
    await page.evaluate(() => document.querySelectorAll('img').forEach(image => { image.loading = 'eager'; }));
    for (let step = 0; step < 60; step++) {
      const done = await page.evaluate(step => {
        const maximum = document.documentElement.scrollHeight - innerHeight;
        const top = Math.min(step * innerHeight * .8, maximum);
        scrollTo({ top, behavior: 'instant' });
        return top >= maximum;
      }, step);
      await page.waitForTimeout(150);
      if (done) break;
    }
    await page.waitForFunction(() => [...document.images].every(image => image.complete), undefined, { timeout: 15000 }).catch(() => {});
    await page.evaluate(() => scrollTo({ top: 0, behavior: 'instant' }));
    await page.waitForTimeout(1500);
  }
  if (site.dismissNewsletter) {
    // Dismiss the storefront's timed signup modal without submitting the form.
    const close = page.getByRole('button', { name: 'Close modal', exact: true });
    // Shopify does not show this for every anonymous session.
    await close.waitFor({ state: 'visible', timeout: 30000 }).catch(() => {});
    // Closing the modal may reveal a smaller offer teaser with its own close.
    for (let attempt = 0; attempt < 3 && await close.isVisible(); attempt++) {
      await close.click();
      await page.waitForTimeout(500);
    }
    if (await close.isVisible()) {
      await page.screenshot({ path: path.join(output, 'signup-overlay.png') });
      throw new Error('Could not dismiss the signup overlay. Existing preview was preserved.');
    }
  }
  await page.screenshot({ path: path.join(output, 'hero.png') });

  // Capture actual compositor frames instead of Playwright's 25 fps video.
  // Acknowledge immediately; preserve timestamps for evenly paced output.
  const cdp = await context.newCDPSession(page);
  cdp.on('Page.screencastFrame', ({ data, metadata, sessionId }) => {
    const file = `frame-${String(frames.length).padStart(5, '0')}.jpg`;
    frames.push({ file, timestamp: metadata.timestamp, y: metadata.scrollOffsetY });
    cdp.send('Page.screencastFrameAck', { sessionId }).catch(() => {});
    writes.push(writeFile(path.join(captureDirectory, file), Buffer.from(data, 'base64'))
      .catch(error => { captureError = error; }));
  });
  await cdp.send('Page.startScreencast', {
    format: 'jpeg', quality: 90, maxWidth: 1280, maxHeight: 800, everyNthFrame: 1,
  });
  await page.waitForTimeout(2000);
  const scroll = async (duration, top) => {
    const scrollDuration = duration || await page.evaluate(() =>
      Math.max(10000, Math.min(45000, (document.documentElement.scrollHeight - innerHeight) / 300 * 1000)));
    return page.evaluate(async ({ duration, top }) => {
      const ramp = 600;
      const samples = [];
      const start = performance.now();
      const from = scrollY;
      await new Promise(resolve => {
        function frame(now) {
          const elapsed = Math.min(now - start, duration);
          // Constant cruising speed, with a gentle start and stop.
          const distance = elapsed < ramp ? elapsed ** 2 / (2 * ramp)
            : elapsed > duration - ramp ? duration - ramp - (duration - elapsed) ** 2 / (2 * ramp)
            : elapsed - ramp / 2;
          const maximum = Math.min(top ?? Infinity, document.documentElement.scrollHeight - innerHeight);
          scrollTo({ top: from + (maximum - from) * distance / (duration - ramp), behavior: 'instant' });
          if (!samples.length || elapsed - samples.at(-1).ms >= 100 || elapsed === duration) {
            samples.push({ ms: Math.round(elapsed), y: scrollY });
          }
          if (elapsed < duration) requestAnimationFrame(frame);
          else resolve();
        }
        requestAnimationFrame(frame);
      });
      return {
        url: location.href,
        height: document.documentElement.scrollHeight,
        viewport: { width: innerWidth, height: innerHeight },
        finalScroll: scrollY,
        scrollDuration: duration,
        footer: document.querySelector('footer')?.innerText,
        samples,
      };
    }, { duration: scrollDuration, top });
  };
  const mark = async name => {
    scenes.push({ name, url: page.url(), timestamp: Date.now() / 1000 });
    await page.screenshot({ path: path.join(output, `${name}.png`) });
  };
  report = site.localTour
    ? await site.localTour.record(page, slug, { scroll, mark })
    : site.detailTour
    ? await recordDetailTour(page, slug, { scroll, mark })
    : await scroll(site.duration);
  await page.waitForTimeout(1600);
  captureEnd = Date.now() / 1000;
  await cdp.send('Page.stopScreencast');
  if (site.dismissNewsletter && await page.getByRole('button', { name: 'Close modal', exact: true }).isVisible()) {
    throw new Error('The storefront popup obscured the recording. Existing preview was preserved.');
  }
  await page.screenshot({ path: path.join(output, 'footer.png') });
  await context.close();
} finally {
  await browser.close();
  await Promise.all(writes);
}
if (captureError) throw captureError;

const expectedFinalScroll = report.expectedFinalScroll ?? report.height - report.viewport.height;
if (Math.abs(expectedFinalScroll - report.finalScroll) > 2) {
  throw new Error('Recording did not reach its intended final view. Existing preview was preserved.');
}

const movingFrames = interactionTour ? frames
  : frames.filter(frame => frame.y > 100 && frame.y < report.finalScroll - 100);
const intervals = movingFrames.slice(1).map((frame, i) => frame.timestamp - movingFrames[i].timestamp);
const capturedFps = (movingFrames.length - 1) / (movingFrames.at(-1).timestamp - movingFrames[0].timestamp);
const sortedIntervals = [...intervals].sort((a, b) => a - b);
const p95Interval = sortedIntervals[Math.floor(sortedIntervals.length * .95)];
// Interaction tours contain intentional still holds. Check their median cadence;
// a lower average caused by a static UI is not a dropped animation frame.
const medianInterval = sortedIntervals[Math.floor(sortedIntervals.length / 2)];
if (interactionTour ? frames.length < 60 || medianInterval > .04 : capturedFps < 45 || p95Interval > .04) {
  throw new Error(`Capture was uneven (${capturedFps.toFixed(1)} fps). Existing preview was preserved.`);
}

// Use a 1 ms input timebase; image inputs otherwise default to 25 fps.
const fps = 30;
// A static footer stops emitting compositor frames; preserve its full hold.
const lastDuration = Math.max(1 / 60, captureEnd - frames.at(-1).timestamp);
const concat = ['ffconcat version 1.0'];
frames.forEach((frame, index) => {
  const duration = frames[index + 1] ? frames[index + 1].timestamp - frame.timestamp : lastDuration;
  concat.push(`file ${frame.file}`, 'option framerate 1000', `duration ${duration.toFixed(6)}`);
});
concat.push(`file ${frames.at(-1).file}`, 'option framerate 1000');
const source = path.join(captureDirectory, 'frames.ffconcat');
await writeFile(source, concat.join('\n') + '\n');
const duration = Math.floor((frames.at(-1).timestamp - frames[0].timestamp + lastDuration) * fps) / fps;
const fade = .8;
const filter = [
  `[0:v]fps=${fps},trim=duration=${duration},setpts=PTS-STARTPTS,scale=960:600:flags=lanczos,settb=AVTB,split=2[full][opening]`,
  `[full]trim=start=${fade},setpts=PTS-STARTPTS[body]`,
  `[opening]trim=duration=${fade},setpts=PTS-STARTPTS[intro]`,
  `[body][intro]xfade=transition=custom:duration=${fade}:offset=${duration - 2 * fade}:expr='A*(P*P*(3-2*P))+B*(1-P*P*(3-2*P))',format=yuv420p[loop]`,
].join(';');
const encoded = path.join(output, `${slug}.mp4`);
execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-safe', '0', '-i', source, '-filter_complex', filter,
  '-map', '[loop]', '-an', '-c:v', 'libx264', '-preset', 'slow', '-crf', '24', '-r', String(fps),
  '-movflags', '+faststart', encoded], { stdio: 'inherit' });
if (interactionTour) {
  const poster = path.join(output, `${slug}-poster.webp`);
  const shot = site.localTour ? 'opening' : slug === 'ajay-portfolio' ? 'about' : 'chat-messages';
  execFileSync('python3', ['-c',
    'from PIL import Image; import sys; Image.open(sys.argv[1]).convert("RGB").resize((960, 600), Image.Resampling.LANCZOS).save(sys.argv[2], quality=82, method=6)',
    path.join(output, `${shot}.png`), poster]);
  await rename(poster, path.join(root, `public/work/service-previews/${slug}.webp`));
}
await rename(encoded, destination);

await writeFile(path.join(output, 'capture.json'), JSON.stringify({
  ...report, scenes, source, capturedFps, medianInterval, p95Interval, frames, fps, duration, fade, lastDuration, destination,
}, null, 2));
console.log(`Captured ${capturedFps.toFixed(1)} fps${interactionTour ? ' average including still holds' : ''}; encoded ${fps} fps, ${(duration - fade).toFixed(2)}s loop: ${destination}`);
