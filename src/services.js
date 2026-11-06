import workMarkup from '../work.html?raw';
import { createPreviewPlayback } from './service-previews.js';
import { servicePreviewMedia } from './service-preview-catalog.js';

// Work is the source of truth for project names, destinations and categories.
// A template keeps its scripts and images inert while we read the catalog.
const catalog = document.createElement('template');
catalog.innerHTML = workMarkup;
const work = catalog.content;

const categories = {
  'svc-ui': '#work-ui .design-card',
  'svc-ai': '#work-ai .work-card, #work-chat .work-card',
  'svc-web': '#work-web .work-card',
  'svc-ecom': '#work-ecom .work-card',
  'svc-software': '#work-web .work-card[href^="/"], #work-ui .work-card[href="/work/dashboard.html"]',
  'svc-consulting': '#work-web .work-card[href="/work/conversy-app.html"], #work-web .work-card[href="/work/ninja-hr.html"], #work-web .work-card[href="/work/irina.html"]',
  'svc-support': '#work-web .work-card',
  'svc-others': '#work-ai .work-card[href="/work/conversy-app.html"], #work-ai .work-card[href="/work/ninja-hr.html"], #work-samples .work-card',
};
function readProjects(selector) {
  const seen = new Set();
  return [...work.querySelectorAll(selector)].flatMap((card) => {
    const href = card.getAttribute('href');
    const url = new URL(href, location.origin);
    const key = url.origin + url.pathname;
    if (seen.has(key)) return [];
    seen.add(key);
    const design = card.matches('.design-card');
    const slug = url.pathname.split('/').pop().replace('.html', '') ||
      (url.hostname.includes('conversy') ? 'conversy-site' : 'ajay-portfolio');
    return [{
      href,
      slug,
      title: card.querySelector('h3').textContent.trim(),
      type: design ? (href.includes('/motion/') ? 'Interactive / 3D' : 'Visual design') :
        card.querySelector('.work-tag').textContent.trim(),
      image: `/work/service-previews/${slug}.webp`,
      external: card.target === '_blank',
    }];
  });
}

function createCard(project, playback) {
  const link = document.createElement('a');
  link.className = 'service-project';
  link.href = project.href;
  if (project.external) {
    link.target = '_blank';
    link.rel = 'noopener';
    link.setAttribute('aria-label', `${project.title} (opens in a new tab)`);
  }
  const preview = document.createElement('div');
  preview.className = 'service-project-preview';
  const img = document.createElement('img');
  const media = servicePreviewMedia.get(project.slug);
  img.src = media?.poster || project.image;
  img.alt = '';
  img.width = 960;
  img.height = 600;
  img.loading = 'lazy';
  img.decoding = 'async';
  const fallback = document.createElement('span');
  fallback.className = 'service-project-fallback';
  fallback.setAttribute('aria-hidden', 'true');
  fallback.textContent = project.title;
  img.addEventListener('error', () => { img.hidden = true; });
  preview.append(fallback, img);
  if (media) {
    preview.classList.add('service-project-preview-animated');
    const video = document.createElement('video');
    video.dataset.src = media.video;
    video.muted = video.defaultMuted = true;
    video.loop = true;
    video.playsInline = true;
    video.preload = 'none';
    video.disablePictureInPicture = true;
    video.setAttribute('aria-hidden', 'true');
    video.tabIndex = -1;
    preview.append(video);
    playback.register(video);
  }
  const info = document.createElement('div');
  info.className = 'service-project-info';
  const title = document.createElement('h4');
  title.textContent = project.title;
  const type = document.createElement('span');
  type.className = 'service-project-type';
  type.textContent = project.type;
  const arrow = document.createElement('span');
  arrow.className = 'service-project-arrow';
  arrow.setAttribute('aria-hidden', 'true');
  arrow.textContent = '↗';
  info.append(title, type, arrow);
  link.append(preview, info);
  return link;
}

const tabs = [...document.querySelectorAll('.service-tab')];
const tablist = document.querySelector('.service-tabs');
const rendered = new Set();
const projects = new Map(tabs.map((tab) => [tab.id, readProjects(categories[tab.id])]));
const previewControllers = new Map(tabs.map(tab => [
  tab.id, createPreviewPlayback(document.getElementById(tab.getAttribute('aria-controls'))),
]));

// Keep the featured studies first in a consistent left-to-right order.
const ui = projects.get('svc-ui');
const featured = ['talia', 'rail', 'orbital', 'shelf'];
ui.sort((a, b) => {
  const rank = (project) => featured.includes(project.slug) ? featured.indexOf(project.slug) : featured.length;
  return rank(a) - rank(b);
});

projects.get('svc-ai').unshift({
  slug: 'voice-assistant',
  title: work.querySelector('.voice-showcase .who strong').textContent,
  href: '/work.html#work-voice',
  image: '/work/service-previews/voice-assistant.webp',
  type: 'Voice assistant',
});

function selectTab(tab, updateHash = false) {
  if (tab.getAttribute('aria-selected') === 'true' && rendered.has(tab.id)) return;

  tabs.forEach((item) => {
    const active = item === tab;
    item.setAttribute('aria-selected', String(active));
    item.tabIndex = active ? 0 : -1;
    document.getElementById(item.getAttribute('aria-controls')).hidden = !active;
  });
  const panel = document.getElementById(tab.getAttribute('aria-controls'));
  if (!rendered.has(tab.id)) {
    const gallery = panel.querySelector('.service-projects');
    const items = projects.get(tab.id);
    gallery.classList.toggle('service-projects-single', items.length === 1);
    gallery.append(...items.map(project => createCard(project, previewControllers.get(tab.id))));
    rendered.add(tab.id);
  }
  previewControllers.forEach(controller => controller.sync());
  if (updateHash && location.hash !== `#${tab.id}`) {
    // Keep the tabs in place while swapping a gallery of a different height.
    history.pushState(null, '', `#${tab.id}`);
  }
}

tabs.forEach((tab, index) => {
  const count = document.createElement('span');
  count.className = 'service-tab-count';
  count.textContent = projects.get(tab.id).length;
  count.setAttribute('aria-hidden', 'true');
  tab.append(count);
  tab.addEventListener('click', () => selectTab(tab, true));
  tab.addEventListener('keydown', (event) => {
    let next;
    if (event.key === 'ArrowRight') next = (index + 1) % tabs.length;
    if (event.key === 'ArrowLeft') next = (index - 1 + tabs.length) % tabs.length;
    if (event.key === 'Home') next = 0;
    if (event.key === 'End') next = tabs.length - 1;
    if (next === undefined) return;
    event.preventDefault();
    selectTab(tabs[next], true);
    tabs[next].focus({ preventScroll: true });
    tabs[next].scrollIntoView({ block: 'nearest', inline: 'nearest' });
  });
});

function selectFromHash() {
  const tab = tabs.find((item) => `#${item.id}` === location.hash);
  if (tab) selectTab(tab);
  // A general Services link scrolls here without changing the selected service.
}

selectTab(tabs[0]);
tablist.hidden = false;
selectFromHash();
window.addEventListener('hashchange', selectFromHash);
