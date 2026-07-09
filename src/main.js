// LocalNinja — site interactions
// Contracts: JS only toggles classes / inline transforms; CSS owns all transitions.

const prefersReduced = matchMedia('(prefers-reduced-motion: reduce)');
const finePointer = matchMedia('(pointer: fine)');

/* ---------------------------------------------------------------- *
 * 1. Hero word rotator — moves .is-active across .rotator-word     *
 * ---------------------------------------------------------------- */
function initRotator() {
  const words = document.querySelectorAll('.rotator .rotator-word');
  if (words.length < 2) return;

  const INTERVAL = 2600;
  let index = Math.max(0, [...words].findIndex((w) => w.classList.contains('is-active')));
  let timer = null;

  const advance = () => {
    words[index].classList.remove('is-active');
    index = (index + 1) % words.length;
    words[index].classList.add('is-active');
  };

  const start = () => {
    if (timer === null) timer = setInterval(advance, INTERVAL);
  };
  const stop = () => {
    clearInterval(timer);
    timer = null;
  };

  // Pause while the tab is hidden so the word doesn't jump on return.
  document.addEventListener('visibilitychange', () => {
    document.hidden ? stop() : start();
  });

  start();
}

/* ---------------------------------------------------------------- *
 * 2. Product card 3D tilt — inline transform, rAF-throttled        *
 * ---------------------------------------------------------------- */
function initTilt() {
  if (prefersReduced.matches || !finePointer.matches) return;

  const cards = document.querySelectorAll('.product-card');
  if (!cards.length) return;

  const MAX_DEG = 8;

  cards.forEach((card) => {
    let rafId = null;
    let lastEvent = null;

    const applyTilt = () => {
      rafId = null;
      if (!lastEvent) return;
      const rect = card.getBoundingClientRect();
      const dx = (lastEvent.clientX - rect.left) / rect.width - 0.5;  // -0.5 .. 0.5
      const dy = (lastEvent.clientY - rect.top) / rect.height - 0.5;
      const ry = (dx * 2 * MAX_DEG).toFixed(2);        // cursor right -> rotate right
      const rx = (-dy * 2 * MAX_DEG).toFixed(2);       // cursor top -> tilt back
      card.style.transform =
        `perspective(900px) rotateX(${rx}deg) rotateY(${ry}deg) translateY(-8px) scale(1.02)`;
    };

    card.addEventListener('pointermove', (event) => {
      lastEvent = event;
      if (rafId === null) rafId = requestAnimationFrame(applyTilt);
    });

    card.addEventListener('pointerleave', () => {
      if (rafId !== null) cancelAnimationFrame(rafId);
      rafId = null;
      lastEvent = null;
      card.style.transform = '';
    });
  });
}

/* ---------------------------------------------------------------- *
 * 3. Scroll reveal — .reveal gains .is-visible once in view        *
 * ---------------------------------------------------------------- */
function initReveal() {
  const targets = document.querySelectorAll('.reveal');
  if (!targets.length) return;

  if (!('IntersectionObserver' in window)) {
    targets.forEach((el) => el.classList.add('is-visible'));
    return;
  }

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.15, rootMargin: '0px 0px -40px 0px' }
  );

  targets.forEach((el) => observer.observe(el));
}

/* ---------------------------------------------------------------- *
 * 4. Mobile nav — toggles .nav-open on .site-header                *
 * ---------------------------------------------------------------- */
function initNav() {
  const header = document.querySelector('.site-header');
  const toggle = header?.querySelector('.nav-toggle');
  if (!header || !toggle) return;

  const setOpen = (open) => {
    header.classList.toggle('nav-open', open);
    toggle.setAttribute('aria-expanded', String(open));
  };

  toggle.addEventListener('click', () => {
    setOpen(!header.classList.contains('nav-open'));
  });

  // Close the menu whenever a nav link is followed.
  header.querySelectorAll('.site-nav a').forEach((link) => {
    link.addEventListener('click', () => setOpen(false));
  });
}

/* ---------------------------------------------------------------- */
function init() {
  initRotator();
  initTilt();
  initReveal();
  initNav();
}

if (document.readyState !== 'loading') {
  init();
} else {
  document.addEventListener('DOMContentLoaded', init);
}
