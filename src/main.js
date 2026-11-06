// LocalNinja - site interactions
// CSS owns transitions/animation; JS initializes content and interaction state.

/* ---------------------------------------------------------------- *
 * 1. Scroll reveal - .reveal gains .is-visible once in view        *
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
 * 2. Mobile nav - toggles .nav-open on .site-header                *
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

  // Dropdown groups (.has-menu) and their nested "Others" list.
  const menus = header.querySelectorAll('.has-menu');
  const closeMenus = () => {
    menus.forEach((menu) => {
      menu.classList.remove('is-open');
      menu.querySelector('.nav-menu-toggle')?.setAttribute('aria-expanded', 'false');
    });
  };

  menus.forEach((menu) => {
    const toggle = menu.querySelector('.nav-menu-toggle');
    toggle?.addEventListener('click', () => {
      const open = !menu.classList.contains('is-open');
      closeMenus();
      menu.classList.toggle('is-open', open);
      toggle.setAttribute('aria-expanded', String(open));
    });

    menu.querySelectorAll('.nav-others').forEach((group) => {
      const sub = group.querySelector('.nav-others-toggle');
      sub?.addEventListener('click', () => {
        const open = !group.classList.contains('is-open');
        group.classList.toggle('is-open', open);
        sub.setAttribute('aria-expanded', String(open));
      });
    });

    menu.querySelectorAll('.nav-menu a').forEach((link) => {
      link.addEventListener('click', closeMenus);
    });
  });

  document.addEventListener('click', (event) => {
    if (!event.target.closest('.has-menu')) closeMenus();
  });
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') closeMenus();
  });
}

/* ---------------------------------------------------------------- *
 * 3. Service wheel - CSS rotation with lifecycle pause              *
 * ---------------------------------------------------------------- */
function initServiceWheel() {
  const hero = document.querySelector('.service-hero');
  if (!hero) return;

  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  let visible = true;

  // Repeat the seven services around a continuous ring, as in the reference.
  // Copies are visual links only; keyboard/screen-reader users get seven items.
  const ring = hero.querySelector('.service-wheel-ring');
  [...ring.children].forEach((spoke) => {
    const copy = spoke.cloneNode(true);
    copy.classList.add('is-copy');
    copy.setAttribute('aria-hidden', 'true');
    copy.querySelector('a').tabIndex = -1;
    ring.append(copy);
  });
  [...ring.children].forEach((spoke, index) => {
    spoke.style.setProperty('--mobile-angle', spoke.style.getPropertyValue('--angle'));
    spoke.style.setProperty('--angle', `${index * 360 / ring.children.length}deg`);
    const card = spoke.querySelector('.wheel-card');
    const back = card.firstElementChild.cloneNode(true);
    back.classList.add('wheel-card-back');
    back.setAttribute('aria-hidden', 'true');
    card.append(back);
  });

  const sync = () => {
    hero.classList.toggle('is-running', visible && !document.hidden && !reducedMotion.matches);
  };

  hero.classList.add('is-enhanced');
  reducedMotion.addEventListener('change', sync);
  document.addEventListener('visibilitychange', sync);
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      sync();
    }).observe(hero);
  }
  sync();
}

/* ---------------------------------------------------------------- *
 * 4. Work tabs - one project group visible at a time               *
 * ---------------------------------------------------------------- */
function initWorkTabs() {
  const tabs = [...document.querySelectorAll('.work-tab')];
  if (!tabs.length) return;

  const filters = document.querySelector('.work-filters');
  const toggle = document.querySelector('.work-filter-toggle');
  const current = document.querySelector('.work-filter-current');
  const mobile = window.matchMedia('(max-width: 900px)');
  const setOpen = (open) => {
    filters?.classList.toggle('is-open', open);
    toggle?.setAttribute('aria-expanded', String(open));
  };
  const selectTab = (tab) => {
    tabs.forEach((t) => {
      const active = t === tab;
      t.classList.toggle('is-active', active);
      t.setAttribute('aria-selected', String(active));
      t.tabIndex = active ? 0 : -1;
      document.getElementById(t.dataset.workTab)?.classList.toggle('is-active', active);
    });
    if (current) current.textContent = tab.textContent;
    document.dispatchEvent(new CustomEvent('work-category-change', { detail: tab.dataset.workTab }));
  };

  tabs.forEach((tab, index) => {
    tab.id = `${tab.dataset.workTab}-tab`;
    tab.tabIndex = tab.classList.contains('is-active') ? 0 : -1;
    document.getElementById(tab.dataset.workTab)?.setAttribute('aria-labelledby', tab.id);
    tab.addEventListener('click', () => {
      selectTab(tab);
      if (mobile.matches) {
        setOpen(false);
        toggle?.focus();
      }
    });
    tab.addEventListener('keydown', (event) => {
      let next;
      if (event.key === 'ArrowDown') next = (index + 1) % tabs.length;
      if (event.key === 'ArrowUp') next = (index - 1 + tabs.length) % tabs.length;
      if (event.key === 'Home') next = 0;
      if (event.key === 'End') next = tabs.length - 1;
      if (next === undefined) return;
      event.preventDefault();
      selectTab(tabs[next]);
      tabs[next].focus();
    });
  });

  toggle?.addEventListener('click', () => {
    setOpen(toggle.getAttribute('aria-expanded') !== 'true');
  });
  filters?.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && mobile.matches) {
      setOpen(false);
      toggle?.focus();
    }
  });
  mobile.addEventListener('change', () => {
    const focusWasInTabs = tabs.includes(document.activeElement);
    const focusWasOnToggle = document.activeElement === toggle;
    setOpen(false);
    if (mobile.matches && focusWasInTabs) toggle?.focus();
    if (!mobile.matches && focusWasOnToggle) tabs.find((tab) => tab.classList.contains('is-active'))?.focus();
  });
  const linkedTab = tabs.find((tab) => `#${tab.dataset.workTab}` === location.hash);
  if (linkedTab) selectTab(linkedTab);
}

function initVoiceShowcase() {
  const root = document.querySelector('[data-showcase-voice]');
  if (!root) return;
  import('./work/voice.js').then(({ initVoice }) => {
    const voice = initVoice(root);
    document.addEventListener('work-category-change', (event) => {
      if (event.detail !== 'work-voice') voice?.stop();
    });
  }).catch(() => {
    root.querySelector('.status-pill').textContent = 'Unavailable';
    root.querySelector('.messages').textContent = 'The voice assistant could not load. Please refresh the page to try again.';
  });
}

/* ---------------------------------------------------------------- *
 * 5. Contact form - no backend; opens a prefilled mailto: link     *
 * ---------------------------------------------------------------- */
function initContactForm() {
  const form = document.querySelector('#contact-form');
  if (!form) return;

  const TO = 'support@localninja.ca';

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    if (!form.reportValidity()) return;

    const data = new FormData(form);
    const name = String(data.get('name') || '').trim();
    const email = String(data.get('email') || '').trim();
    const message = String(data.get('message') || '').trim();

    const subject = `Project enquiry from ${name}`;
    const body = `${message}\n\n- ${name}\n${email}`;
    const url =
      `mailto:${TO}?subject=${encodeURIComponent(subject)}` +
      `&body=${encodeURIComponent(body)}`;

    window.location.href = url;
  });
}

/* ---------------------------------------------------------------- */
function init() {
  initReveal();
  initNav();
  initServiceWheel();
  initWorkTabs();
  initVoiceShowcase();
  initContactForm();
}

if (document.readyState !== 'loading') {
  init();
} else {
  document.addEventListener('DOMContentLoaded', init);
}
