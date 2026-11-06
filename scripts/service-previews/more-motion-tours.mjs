import assert from 'node:assert/strict';
import { warmImages } from './detail-tours.mjs';

export const moreMotionSlugs = [
  'helios', 'prism', 'shelf', 'orbital', 'totem', 'axiom', 'synapse', 'softspot', 'akai',
];

export async function prepareMoreMotionTour(page, slug) {
  assert.ok(moreMotionSlugs.includes(slug), `Unknown motion tour: ${slug}`);
  await warmImages(page);
  await page.waitForFunction(() => [...document.querySelectorAll('.motion-scene')]
    .every(scene => scene.dataset.status === 'ready'));
  assert.equal(await page.locator('html').getAttribute('data-motion'), 'on');
  if (slug === 'softspot' || slug === 'akai') {
    const sources = slug === 'softspot'
      ? ['ottawa', 'toronto', 'windsor'].map(name => `/work/motion-lab/softspot/${name}.webp`)
      : ['wind', 'water', 'fire'].map(name => `/work/motion-lab/akai/katana/${name}.webp`);
    await page.evaluate(sources => Promise.all(sources.map(async src => {
      const image = new Image();
      image.src = src;
      await image.decode();
    })), sources);
  }
  // Hide only the portfolio's navigation overlay; every design control stays.
  await page.addStyleTag({ content: '.motion-toolbar { visibility: hidden !important; }' });
  await page.evaluate(() => scrollTo({ top: 0, behavior: 'instant' }));
  await page.mouse.move(20, 70);
  await page.waitForTimeout(1200);
}

export async function recordMoreMotionTour(page, slug, { scroll, mark }) {
  assert.ok(moreMotionSlugs.includes(slug), `Unknown motion tour: ${slug}`);
  const hold = ms => page.waitForTimeout(ms);
  const button = name => page.getByRole('button', { name, exact: typeof name === 'string' });
  const click = name => button(name).click();
  const section = selector => page.locator(selector).evaluate(el => el.getBoundingClientRect().top + scrollY);
  const pressed = async control => assert.equal(await control.getAttribute('aria-pressed'), 'true');
  await mark('opening');

  if (slug === 'helios') {
    for (const name of ['Zenith', 'Eclipse']) {
      await click(name);
      await pressed(button(name));
      await hold(2100);
      await mark(name.toLowerCase());
    }
    await page.mouse.move(1050, 330, { steps: 50 });
    await hold(1000);
    await scroll(5000);
    await hold(1300);
    await mark('observatory');
  } else if (slug === 'prism') {
    for (const name of ['Rose finish', 'Cobalt finish']) {
      await click(name);
      await pressed(button(name));
      await hold(1700);
    }
    await click('Take a closer look');
    await pressed(button('Assemble'));
    await hold(1800);
    await page.mouse.move(1200, 330, { steps: 50 });
    await hold(700);
    await mark('separated-cobalt');
    await click('Assemble');
    await hold(1300);
    await scroll(4500);
    await mark('material-study');
  } else if (slug === 'shelf') {
    // Keep both the books and their browsing controls in the same frame.
    await scroll(1600, 200);
    for (let i = 0; i < 2; i++) {
      await click('Next book');
      await hold(1450);
    }
    await click('Color');
    await pressed(button('Color'));
    await hold(1200);
    await click('Next book');
    await hold(1500);
    await mark('color-collection');
    // This reading list exists only in component state in this local demo.
    await click(/Add to reading list/);
    await pressed(button(/On your reading list/));
    await hold(1300);
    await scroll(4500);
    assert.match(await page.locator('.shelf-reading-count').innerText(), /1 book/);
    await hold(900);
    await mark('reading-list');
  } else if (slug === 'orbital') {
    for (const name of [/02\s+Soft Signal/, /03\s+New Matter/]) {
      await click(name);
      await pressed(button(name));
      await hold(1500);
    }
    await mark('new-matter-world');
    await scroll(3200, await section('.orb-project-ground') - 100);
    const first = page.locator('.orb-project-ground button[aria-controls="orb-project-details-0"]');
    await first.click();
    assert.equal(await first.getAttribute('aria-expanded'), 'true');
    await hold(1400);
    await mark('common-ground-notes');
    await scroll(3000, await section('.orb-project-signal') - 100);
    const second = page.locator('.orb-project-signal button[aria-controls="orb-project-details-1"]');
    await second.click();
    assert.equal(await second.getAttribute('aria-expanded'), 'true');
    await hold(1400);
    await mark('soft-signal-notes');
    await scroll(4200);
  } else if (slug === 'totem') {
    await click('Say hello');
    await pressed(button('Back to daydreaming'));
    await hold(2200);
    await mark('hello');
    for (const name of ['Acid apple', 'Night shift']) {
      await click(name);
      await pressed(button(name));
      await hold(1900);
      await mark(name === 'Acid apple' ? 'acid-apple' : 'night-shift');
    }
    await click('Back to daydreaming');
    await hold(700);
    await scroll(4700);
    assert.match(await page.locator('.totem-passport').innerText(), /Night shift/);
    await hold(1300);
    await mark('creature-passport');
  } else if (slug === 'axiom') {
    for (const name of [/02\s+Flow/, /03\s+Structure/]) {
      const control = page.locator('.axiom-selector').getByRole('button', { name });
      await control.click();
      await pressed(control);
      await hold(1500);
    }
    await scroll(1300, 160);
    const tension = page.locator('#axiom-tension');
    const box = await tension.boundingBox();
    const value = Number(await tension.inputValue());
    const y = box.y + box.height / 2;
    await page.mouse.move(box.x + 8 + (box.width - 16) * value / 100, y);
    await page.mouse.down();
    await page.mouse.move(box.x + box.width - 8, y, { steps: 65 });
    await page.mouse.up();
    assert.ok(Number(await tension.inputValue()) >= 95);
    await hold(1100);
    await mark('compressed-structure');
    await page.mouse.down();
    await page.mouse.move(box.x + box.width * .2, y, { steps: 65 });
    await page.mouse.up();
    assert.ok(Number(await tension.inputValue()) <= 25);
    await hold(900);
    await scroll(3700, await section('#axiom-notes') - 60);
    for (const name of [/02\s+Flow/, /03\s+Structure/]) {
      const control = page.locator('.axiom-notes-list').getByRole('button', { name });
      await control.click();
      assert.equal(await control.getAttribute('aria-expanded'), 'true');
      await hold(1200);
    }
    await scroll(1800);
    await mark('field-notes');
  } else if (slug === 'synapse') {
    for (const name of [/Explore\s+02/, /Dream\s+03/]) {
      await click(name);
      await pressed(button(name));
      await hold(1900);
    }
    await mark('dream-sculpture');
    await scroll(4200, await section('#synapse-playground') - 80);
    // openThought is a local, synchronous creative exercise; it sends no data.
    await page.locator('#synapse-thought').pressSequentially('What if a city made more room for play?', { delay: 45 });
    await click('Open a possibility');
    await page.locator('.synapse-result').waitFor();
    await hold(1800);
    assert.match(await page.locator('.synapse-result').innerText(), /city made more room for play/);
    await mark('thought-exercise');
    const first = await page.locator('.synapse-result h3').innerText();
    await click('Open a possibility');
    await hold(1500);
    assert.notEqual(await page.locator('.synapse-result h3').innerText(), first);
    await scroll(2200);
    await mark('new-possibility');
  } else if (slug === 'softspot') {
    for (const name of ['Show Toronto', 'Show Windsor']) {
      await click(name);
      await pressed(button(name));
      await hold(1900);
      await mark(name === 'Show Toronto' ? 'toronto' : 'windsor');
    }
    await page.locator('.softspot-story-link').click();
    const panel = page.getByRole('dialog');
    await panel.waitFor();
    assert.match(await panel.innerText(), /Ambassador Bridge/);
    await hold(1800);
    await mark('windsor-details');
    await click('EXPLORE THE NEXT CITY');
    await hold(1700);
    assert.equal(await page.locator('.softspot-page').getAttribute('data-city'), 'ottawa');
    await page.locator('.softspot-story-link').click();
    await panel.waitFor();
    assert.match(await panel.innerText(), /Parliament Hill/);
    await hold(1500);
    await mark('ottawa-details');
    await click('Close panel');
    await click('Show Toronto');
    await hold(1700);
    await page.locator('.softspot-story-link').click();
    await panel.waitFor();
    assert.match(await panel.innerText(), /CN Tower/);
    await hold(1700);
    await mark('toronto-details');
  } else if (slug === 'akai') {
    // Open the story using its actual chapter control, then follow every scene.
    await click('Chapter 2: The eye');
    await page.waitForFunction(() => document.querySelector('.kn-story').dataset.chapter === 'The eye');
    await hold(800);
    await mark('the-eye');
    const story = await page.locator('.kn-story').evaluate(el => ({
      top: el.getBoundingClientRect().top + scrollY,
      distance: el.getBoundingClientRect().height - innerHeight,
    }));
    for (const [progress, chapter, scene] of [
      [.46, 'The presence', 'the-presence'],
      [.645, 'The glance', 'the-glance'],
      [.84, 'The clash', 'the-clash'],
    ]) {
      await scroll(2600, story.top + story.distance * progress);
      assert.equal(await page.locator('.kn-story').getAttribute('data-chapter'), chapter);
      await hold(450);
      await mark(scene);
    }
    await scroll(3500, await section('.kn-element-tabs') - 80);
    await mark('wind-katana');
    for (const element of ['Water', 'Fire']) {
      const tab = page.getByRole('tab', { name: new RegExp(element) });
      await tab.click();
      assert.equal(await tab.getAttribute('aria-selected'), 'true');
      await hold(1350);
      await mark(`${element.toLowerCase()}-katana`);
    }
    await scroll(1700, await section('.kn-product-info') - 250);
    const details = button('Explore the design');
    await details.click();
    assert.equal(await details.getAttribute('aria-expanded'), 'true');
    assert.match(await page.locator('#kn-product-details').innerText(), /Crimson red/);
    await hold(1100);
    await mark('fire-design-details');
    await scroll(1600);
  }

  return page.evaluate(slug => ({
    url: location.href,
    height: document.documentElement.scrollHeight,
    viewport: { width: innerWidth, height: innerHeight },
    finalScroll: scrollY,
    expectedFinalScroll: slug === 'softspot' ? 0 : document.documentElement.scrollHeight - innerHeight,
  }), slug);
}
