// Generic behaviours for the UI mockup pages. Everything is driven by
// data-attributes so each mockup stays plain HTML/CSS:
//   data-go="2"            -> set data-step on the nearest [data-steps]
//   data-select-group="x"  -> single-select within a group, writes
//                             data-label into [data-out="x"]
//   data-tab="x"           -> tabs; shows [data-panel="x"] in [data-tabs]
//   data-toggle="#id"      -> toggles .is-open on the target
//   data-collapse="#id"    -> toggles .is-collapsed (assistant widget;
//                             starts collapsed on <=640px screens)
//   data-open="#id" / data-close -> overlay open/close
//   data-add="Name|12.50"  -> cart: appends to [data-cart-list], updates
//                             [data-cart-count] / [data-cart-total]
//   data-filter="type"     -> hides [data-type] cards in [data-filter-target]
//   data-range="30d"       -> sets data-range on [data-chart]
//   data-scroll="#id"      -> smooth-scrolls the target into view
// JS only toggles classes / attributes / text; CSS owns transitions.

function init() {
  const on = (selector, handler) => {
    document.querySelectorAll(selector).forEach((el) => {
      el.addEventListener('click', (event) => handler(el, event));
    });
  };

  // Jump to a section (e.g. hero shortcuts into the booking flow)
  on('[data-scroll]', (el) => {
    document.querySelector(el.dataset.scroll)?.scrollIntoView({ block: 'start', behavior: 'smooth' });
  });

  // Steps
  on('[data-go]', (el) => {
    const host = el.closest('[data-steps]');
    if (!host) return;
    const step = Number(el.dataset.go);
    host.dataset.step = String(step);
    host.querySelectorAll('.stepper li').forEach((li, i) => {
      li.classList.toggle('is-active', i + 1 === step);
      li.classList.toggle('is-done', i + 1 < step);
    });
    host.scrollIntoView({ block: 'start', behavior: 'smooth' });
  });

  // Single-select groups
  on('[data-select-group]', (el) => {
    const group = el.dataset.selectGroup;
    // Two controls with the same label (e.g. a hero chip and the card in
    // the booking flow) select together.
    const same = (o) => o === el || (!!el.dataset.label && o.dataset.label === el.dataset.label);
    document.querySelectorAll(`[data-select-group="${group}"]`).forEach((o) => {
      o.classList.toggle('is-selected', same(o));
      o.setAttribute('aria-pressed', String(same(o)));
    });
    document.querySelectorAll(`[data-out="${group}"]`).forEach((out) => {
      out.textContent = el.dataset.label || el.textContent.trim();
    });
  });

  // Tabs
  on('[data-tab]', (el) => {
    const host = el.closest('[data-tabs]');
    if (!host) return;
    const name = el.dataset.tab;
    host.querySelectorAll('[data-tab]').forEach((t) => t.classList.toggle('is-active', t === el));
    host.querySelectorAll('[data-panel]').forEach((p) => {
      p.classList.toggle('is-active', p.dataset.panel === name);
    });
  });

  // Toggles / overlays
  on('[data-toggle]', (el) => {
    document.querySelector(el.dataset.toggle)?.classList.toggle('is-open');
  });
  const setCollapsed = (target, btn, collapsed) => {
    target.classList.toggle('is-collapsed', collapsed);
    btn.textContent = collapsed ? '+' : '–';
    btn.setAttribute('aria-label', collapsed ? 'Expand assistant' : 'Minimise assistant');
    btn.setAttribute('aria-expanded', String(!collapsed));
  };

  on('[data-collapse]', (el) => {
    const target = document.querySelector(el.dataset.collapse);
    if (!target) return;
    setCollapsed(target, el, !target.classList.contains('is-collapsed'));
  });

  // On phones the assistant starts minimised so it doesn't cover the page;
  // the header bar stays tappable. Desktop keeps it open.
  document.querySelectorAll('[data-collapse]').forEach((btn) => {
    const target = document.querySelector(btn.dataset.collapse);
    if (target && matchMedia('(max-width: 640px)').matches) setCollapsed(target, btn, true);
  });
  on('[data-open]', (el) => {
    document.querySelector(el.dataset.open)?.classList.add('is-open');
  });
  on('[data-close]', (el) => {
    el.closest('.is-open')?.classList.remove('is-open');
  });

  // Cart
  const cart = { count: 0, total: 0 };
  const money = (n) => `$${n.toFixed(2)}`;
  on('[data-add]', (el) => {
    const [name, price] = el.dataset.add.split('|');
    cart.count += 1;
    cart.total += Number(price);
    const list = document.querySelector('[data-cart-list]');
    if (list) {
      const row = document.createElement('li');
      row.innerHTML = `<span>${name}</span><span>${money(Number(price))}</span>`;
      list.appendChild(row);
    }
    document.querySelectorAll('[data-cart-count]').forEach((n) => (n.textContent = String(cart.count)));
    document.querySelectorAll('[data-cart-total]').forEach((n) => (n.textContent = money(cart.total)));
    document.querySelector('[data-cart-empty]')?.classList.add('is-hidden');
    el.classList.add('is-added');
    setTimeout(() => el.classList.remove('is-added'), 600);
  });

  // Filters
  on('[data-filter]', (el) => {
    const type = el.dataset.filter;
    el.parentElement.querySelectorAll('[data-filter]').forEach((c) => c.classList.toggle('is-active', c === el));
    document.querySelectorAll('[data-filter-target] [data-type]').forEach((card) => {
      card.classList.toggle('is-hidden', type !== 'all' && card.dataset.type !== type);
    });
  });

  // Chart ranges
  on('[data-range]', (el) => {
    el.parentElement.querySelectorAll('[data-range]').forEach((b) => b.classList.toggle('is-active', b === el));
    document.querySelectorAll('[data-chart]').forEach((c) => (c.dataset.range = el.dataset.range));
  });
}

if (document.readyState !== 'loading') init();
else document.addEventListener('DOMContentLoaded', init);
