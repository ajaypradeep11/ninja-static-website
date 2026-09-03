// Ember & Oak - page-specific ordering flow. Loaded after mockups.js, which
// still owns the generic hooks (data-tab, data-toggle, data-close, data-add).
// This module owns the cart's contents: it keeps its own line state and
// re-renders [data-cart-list] whenever anything changes, so the generic
// data-add handler stays wired but its output is immediately replaced.
// Contract: JS only toggles classes / attributes / text and builds strings.
// CSS owns every transition and animation.

const TAX_RATE = 0.13;
const DINEIN_MINS = 20;
const BUSY_EXTRA = 10;
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');

const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
const money = (n) => `$${n.toFixed(2)}`;
const escapeHtml = (s) =>
  String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const fmtTime = (d) => {
  let h = d.getHours();
  const m = d.getMinutes();
  const ap = h >= 12 ? 'pm' : 'am';
  h = h % 12 || 12;
  return `${h}:${String(m).padStart(2, '0')} ${ap}`;
};

const state = {
  lines: [], // { key, name, base, mods: [{ label, delta }], qty }
  service: 'pickup',
  slot: '25',
  later: '',
  table: '',
  tip: 0.15,
  busy: false,
  step: 'order',
  pay: 'card',
  customer: { name: '', phone: '', notes: '', sms: true },
  order: null, // { number, items, eta, service }
  timers: [],
  diet: 'all',
};

const modal = { dish: null, selected: new Set(), qty: 1, returnFocus: null };

let toastTimer = 0;
function toast(text) {
  const el = $('[data-eo-toast]');
  if (!el) return;
  el.textContent = text;
  el.classList.add('is-shown');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('is-shown'), 2600);
}

/* ---------- money & lines ---------- */

const lineUnit = (line) => line.base + line.mods.reduce((sum, m) => sum + m.delta, 0);
const subtotal = () => state.lines.reduce((sum, l) => sum + lineUnit(l) * l.qty, 0);
const itemCount = () => state.lines.reduce((sum, l) => sum + l.qty, 0);
// Gift cards ride in the cart untaxed (tax is charged when they're spent),
// so HST and tip are worked out on the food lines only.
const foodSubtotal = () => state.lines.filter((l) => !l.noTax).reduce((sum, l) => sum + lineUnit(l) * l.qty, 0);
const totals = () => {
  const sub = subtotal();
  const food = foodSubtotal();
  const tax = food * TAX_RATE;
  const tip = food * state.tip;
  return { sub, tax, tip, total: sub + tax + tip };
};

function bumpFab() {
  const fab = $('[data-eo-fab]');
  if (!fab) return;
  fab.classList.remove('is-bump');
  // Force a restart of the CSS keyframe by toggling on the next frame.
  requestAnimationFrame(() => fab.classList.add('is-bump'));
}

function addLine(name, base, mods = [], qty = 1) {
  const key = `${name}::${mods.map((m) => m.label).join('+')}`;
  const existing = state.lines.find((l) => l.key === key);
  if (existing) existing.qty += qty;
  else state.lines.push({ key, name, base, mods, qty });
  render();
  bumpFab();
}

function changeQty(key, delta) {
  const line = state.lines.find((l) => l.key === key);
  if (!line) return;
  line.qty += delta;
  if (line.qty <= 0) state.lines = state.lines.filter((l) => l !== line);
  render();
}

function removeLine(key) {
  state.lines = state.lines.filter((l) => l.key !== key);
  render();
}

/* ---------- pickup timing ---------- */

const pickupMins = () => (state.slot === 'asap' ? 15 : Number(state.slot)) + (state.busy ? BUSY_EXTRA : 0);

function buildLaterOptions() {
  const select = $('[data-eo-later-select]');
  if (!select) return;
  const start = new Date(Date.now() + 60 * 60000);
  start.setMinutes(Math.ceil(start.getMinutes() / 15) * 15, 0, 0);
  const options = [];
  for (let i = 0; i < 8; i += 1) {
    const d = new Date(start.getTime() + i * 15 * 60000);
    options.push(fmtTime(d));
  }
  select.innerHTML = options.map((t) => `<option value="${t}">${t}</option>`).join('');
  state.later = options[0];
}

function etaText() {
  if (state.service === 'dinein') {
    return state.table ? `Table ${state.table} · on the table in about ${DINEIN_MINS} minutes` : 'Enter your table number and we take it from there.';
  }
  if (state.slot === 'later') return `We'll have it bagged for ${state.later}.`;
  const ready = new Date(Date.now() + pickupMins() * 60000);
  return `Ready around ${fmtTime(ready)}${state.busy ? ' (includes tonight’s 10 min)' : ''}.`;
}

/* ---------- rendering ---------- */

function renderCartList() {
  const list = $('[data-cart-list]');
  if (!list) return;
  list.innerHTML = state.lines
    .map((l) => {
      const mods = l.mods.length ? `<small class="mods">${escapeHtml(l.mods.map((m) => m.label).join(' · '))}</small>` : '';
      return `<li data-key="${escapeHtml(l.key)}">
        <div class="line-main"><span class="name">${escapeHtml(l.name)}</span>${mods}</div>
        <div class="qty" role="group" aria-label="Quantity for ${escapeHtml(l.name)}">
          <button type="button" data-eo-qty="-1" aria-label="One fewer ${escapeHtml(l.name)}">−</button>
          <span data-eo-qty-out>${l.qty}</span>
          <button type="button" data-eo-qty="1" aria-label="One more ${escapeHtml(l.name)}">+</button>
        </div>
        <span class="line-price">${money(lineUnit(l) * l.qty)}</span>
        <button type="button" class="remove" data-eo-remove aria-label="Remove ${escapeHtml(l.name)}">×</button>
      </li>`;
    })
    .join('');
  $('[data-cart-empty]')?.classList.toggle('is-hidden', state.lines.length > 0);
}

function renderSums() {
  const t = totals();
  $$('[data-cart-count]').forEach((n) => (n.textContent = String(itemCount())));
  $$('[data-cart-total]').forEach((n) => (n.textContent = money(t.total)));
  const set = (sel, text) => {
    const el = $(sel);
    if (el) el.textContent = text;
  };
  set('[data-eo-subtotal]', money(t.sub));
  set('[data-eo-tax]', money(t.tax));
  set('[data-eo-tip-amount]', money(t.tip));
  $$('[data-eo-tip]').forEach((b) => b.setAttribute('aria-pressed', String(Number(b.dataset.eoTip) === state.tip)));
}

function renderService() {
  $$('[data-eo-service]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.eoService === state.service)));
  $$('[data-eo-service-panel]').forEach((p) => p.classList.toggle('is-active', p.dataset.eoServicePanel === state.service));
  $$('[data-eo-slot]').forEach((b) => {
    b.setAttribute('aria-pressed', String(b.dataset.eoSlot === state.slot));
    const label = $('[data-slot-label]', b);
    if (label && b.dataset.mins) {
      const mins = Number(b.dataset.mins) + (state.busy ? BUSY_EXTRA : 0);
      label.textContent = b.dataset.eoSlot === 'asap' ? `~${mins} min` : `${mins} min`;
    }
  });
  $('[data-eo-later]')?.classList.toggle('is-active', state.slot === 'later');
  const eta = $('[data-eo-eta]');
  if (eta) eta.textContent = state.service === 'pickup' ? etaText() : '';
  const etaDine = $('[data-eo-eta-dinein]');
  if (etaDine) etaDine.textContent = state.service === 'dinein' ? etaText() : '';
}

function footerLabel() {
  const t = totals();
  switch (state.step) {
    case 'order':
      if (!state.lines.length) return 'Add something from the menu';
      if (state.service === 'dinein') return state.table ? `Checkout · Table ${state.table}` : 'Checkout · dine-in';
      if (state.slot === 'later') return `Checkout · pickup at ${state.later}`;
      return `Checkout · pickup in ${pickupMins()} min`;
    case 'details':
      return 'Continue to payment';
    case 'payment':
      if (state.pay === 'counter') return 'Place order · pay at the counter';
      if (state.pay === 'wallet') return `Pay ${money(t.total)} with wallet`;
      return `Pay ${money(t.total)}`;
    default:
      return 'Start a new order';
  }
}

function renderFooter() {
  const btn = $('[data-eo-next]');
  if (!btn || btn.classList.contains('is-busy')) return;
  btn.textContent = footerLabel();
  btn.classList.toggle('is-disabled', state.step === 'order' && !state.lines.length);
  btn.setAttribute('aria-disabled', String(state.step === 'order' && !state.lines.length));
}

function renderStep() {
  const cart = $('#cart');
  if (!cart) return;
  cart.dataset.eoStep = state.step;
  const titles = { order: 'Your order', details: 'Your details', payment: 'Payment', done: 'Order confirmed' };
  const title = $('[data-eo-title]');
  if (title) title.textContent = titles[state.step];
  const order = ['order', 'details', 'payment'];
  const idx = order.indexOf(state.step);
  $$('.steps li', cart).forEach((li, i) => {
    li.classList.toggle('is-active', i === idx);
    li.classList.toggle('is-done', state.step === 'done' || i < idx);
    li.setAttribute('aria-current', i === idx ? 'step' : 'false');
  });
  $('[data-eo-back]')?.classList.toggle('is-shown', state.step === 'details' || state.step === 'payment');
}

function render() {
  renderCartList();
  renderSums();
  renderService();
  renderStep();
  renderFooter();
  renderExtras();
}

function setStep(step) {
  state.step = step;
  renderStep();
  renderFooter();
  const body = $('#cart .cart-body');
  if (body) body.scrollTop = 0;
  $('[data-eo-title]')?.focus({ preventScroll: true });
}

/* ---------- checkout flow ---------- */

function showError(inputSel, errorSel, show) {
  const input = $(inputSel);
  const error = $(errorSel);
  if (input) input.setAttribute('aria-invalid', String(show));
  if (error) error.classList.toggle('is-shown', show);
}

function next() {
  const btn = $('[data-eo-next]');
  if (state.step === 'order') {
    if (!state.lines.length) {
      toast('Add a dish first - the kitchen needs something to cook.');
      return;
    }
    if (state.service === 'dinein' && !state.table) {
      showError('[data-eo-table]', '[data-eo-table-error]', true);
      $('[data-eo-table]')?.focus();
      return;
    }
    setStep('details');
    return;
  }
  if (state.step === 'details') {
    const name = state.customer.name.trim();
    const digits = state.customer.phone.replace(/\D/g, '');
    const nameOk = name.length >= 2;
    const phoneOk = digits.length >= 7;
    showError('[data-eo-name]', '[data-eo-name-error]', !nameOk);
    showError('[data-eo-phone]', '[data-eo-phone-error]', !phoneOk);
    if (!nameOk) {
      $('[data-eo-name]')?.focus();
      return;
    }
    if (!phoneOk) {
      $('[data-eo-phone]')?.focus();
      return;
    }
    setStep('payment');
    return;
  }
  if (state.step === 'payment') {
    if (!btn || btn.classList.contains('is-busy')) return;
    btn.classList.add('is-busy');
    btn.setAttribute('aria-disabled', 'true');
    btn.textContent = state.pay === 'counter' ? 'Sending to the kitchen…' : state.pay === 'wallet' ? 'Confirming with wallet…' : 'Charging card…';
    const t = setTimeout(() => {
      btn.classList.remove('is-busy');
      btn.removeAttribute('aria-disabled');
      confirmOrder();
    }, 1400);
    state.timers.push(t);
    return;
  }
  resetOrder();
}

function back() {
  if (state.step === 'details') setStep('order');
  else if (state.step === 'payment') setStep('details');
}

function confirmOrder() {
  const number = `EO-${4000 + Math.floor(Math.random() * 900)}`;
  state.order = {
    number,
    service: state.service,
    items: state.lines.map((l) => ({ ...l })),
  };
  const set = (sel, text) => {
    const el = $(sel);
    if (el) el.textContent = text;
  };
  set('[data-eo-order-number]', `#${number}`);
  const firstName = state.customer.name.trim().split(/\s+/)[0] || 'there';
  if (state.service === 'dinein') {
    set('[data-eo-done-eta]', `Thanks ${firstName} - it's with the kitchen. Table ${state.table}, about ${DINEIN_MINS} minutes.`);
    set('[data-eo-stage-label="1"]', 'Sent to kitchen');
    set('[data-eo-stage-label="2"]', 'On the fire');
    set('[data-eo-stage-label="3"]', 'Heading to your table');
  } else {
    const when = state.slot === 'later' ? `Pickup at ${state.later}` : `Ready around ${fmtTime(new Date(Date.now() + pickupMins() * 60000))}`;
    set('[data-eo-done-eta]', `Thanks ${firstName}. ${when} - come to the counter under the copper hood.`);
    set('[data-eo-stage-label="1"]', 'Received');
    set('[data-eo-stage-label="2"]', 'In the oven');
    set('[data-eo-stage-label="3"]', 'Ready');
  }
  const items = $('[data-eo-done-items]');
  if (items) {
    items.innerHTML = state.order.items
      .map((l) => {
        const mods = l.mods.length ? `<small>${escapeHtml(l.mods.map((m) => m.label).join(' · '))}</small>` : '';
        return `<li><span class="q">${l.qty}×</span><span class="n">${escapeHtml(l.name)}${mods}</span><span class="p">${money(lineUnit(l) * l.qty)}</span></li>`;
      })
      .join('');
  }
  const paid = state.pay === 'counter' ? `${money(totals().total)} to pay at the counter` : `${money(totals().total)} charged`;
  const sms = state.customer.sms && state.customer.phone ? ` · we'll text ${state.customer.phone.trim()} at each step` : '';
  set('[data-eo-done-contact]', `${paid}${sms}.`);
  setStep('done');
  startTracker();
  onOrderConfirmed();
}

function setStage(stage) {
  const panel = $('[data-eo-panel="done"]');
  if (!panel) return;
  panel.dataset.stage = String(stage);
  $$('.track li', panel).forEach((li, i) => {
    li.classList.toggle('is-done', i + 1 < stage);
    li.classList.toggle('is-active', i + 1 === stage);
  });
  const dine = state.order?.service === 'dinein';
  const notes = dine
    ? ['Marco printed the ticket. Plates are being pulled.', 'Your dishes are on the grate. Fire is at 480°C.', 'Your server is on the way over with everything.']
    : ['Marco printed the ticket. Plates are being pulled.', 'Your dishes are on the grate. Fire is at 480°C.', 'Bagged and on the pass. Show this screen at the counter.'];
  const note = $('[data-eo-track-note]');
  if (note) note.textContent = notes[stage - 1];
  kdsSyncStage(stage);
}

function clearTimers() {
  state.timers.forEach((t) => clearTimeout(t));
  state.timers = [];
}

function startTracker() {
  clearTimers();
  setStage(1);
  state.timers.push(setTimeout(() => setStage(2), 3500));
  state.timers.push(setTimeout(() => setStage(3), 8000));
}

function resetOrder() {
  clearTimers();
  state.lines = [];
  state.order = null;
  state.customer = { name: '', phone: '', notes: '', sms: true };
  ['[data-eo-name]', '[data-eo-phone]', '[data-eo-notes]', '[data-eo-table]'].forEach((sel) => {
    const el = $(sel);
    if (el) {
      el.value = '';
      el.removeAttribute('aria-invalid');
    }
  });
  const sms = $('[data-eo-sms]');
  if (sms) sms.checked = true;
  state.table = '';
  $$('.field-error').forEach((e) => e.classList.remove('is-shown'));
  state.step = 'order';
  render();
  $('#cart')?.classList.remove('is-open');
  toast('Thanks - see you soon.');
}

/* ---------- dish detail modal ---------- */

function parseMods(raw) {
  if (!raw) return [];
  return raw
    .split(';')
    .map((chunk) => chunk.split('|'))
    .filter((parts) => parts[0])
    .map(([label, delta, group]) => ({ label: label.trim(), delta: Number(delta) || 0, group: (group || '').trim() }));
}

function openDish(article) {
  const host = $('[data-eo-modal]');
  if (!host || !article) return;
  const name = $('h3', article)?.textContent.trim() || '';
  const base = Number(($('[data-add]', article)?.dataset.add || '|0').split('|')[1]) || 0;
  const art = $('.art', article)?.style.getPropertyValue('--art') || '';
  modal.dish = {
    name,
    base,
    art,
    desc: $('p:not(.tags)', article)?.textContent.trim() || '',
    story: article.dataset.story || '',
    allergens: article.dataset.allergens || 'Ask your server',
    mods: parseMods(article.dataset.mods),
  };
  modal.selected = new Set();
  // Radio-style groups (e.g. steak temperature) default to their first option.
  const seen = new Set();
  modal.dish.mods.forEach((m, i) => {
    if (m.group && !seen.has(m.group)) {
      seen.add(m.group);
      modal.selected.add(i);
    }
  });
  modal.qty = 1;
  modal.returnFocus = document.activeElement;

  $('[data-eo-modal-art]').style.setProperty('--art', art);
  $('[data-eo-modal-title]').textContent = name;
  $('[data-eo-modal-price]').textContent = `$${base}`;
  $('[data-eo-modal-desc]').textContent = modal.dish.desc;
  $('[data-eo-modal-story]').textContent = modal.dish.story;
  $('[data-eo-modal-allergens]').textContent = modal.dish.allergens;
  const mods = $('[data-eo-modal-mods]');
  mods.innerHTML = modal.dish.mods
    .map((m, i) => {
      const delta = m.delta ? ` <small>+${money(m.delta)}</small>` : '';
      return `<button type="button" data-eo-mod="${i}" aria-pressed="false">${escapeHtml(m.label)}${delta}</button>`;
    })
    .join('');
  if (!modal.dish.mods.length) mods.innerHTML = '<p class="muted">Comes as the kitchen intends it.</p>';
  renderModal();
  host.classList.add('is-open');
  document.body.classList.add('eo-modal-open');
  $('.modal-close', host)?.focus();
}

function renderModal() {
  if (!modal.dish) return;
  $$('[data-eo-mod]').forEach((b) => b.setAttribute('aria-pressed', String(modal.selected.has(Number(b.dataset.eoMod)))));
  const unit = modal.dish.base + [...modal.selected].reduce((sum, i) => sum + modal.dish.mods[i].delta, 0);
  const out = $('[data-eo-modal-qty-out]');
  if (out) out.textContent = String(modal.qty);
  const add = $('[data-eo-modal-add]');
  if (add) add.textContent = `Add ${modal.qty > 1 ? `${modal.qty} ` : ''}to order · ${money(unit * modal.qty)}`;
}

function toggleMod(index) {
  const m = modal.dish.mods[index];
  if (!m) return;
  if (m.group) {
    modal.dish.mods.forEach((o, i) => {
      if (o.group === m.group) modal.selected.delete(i);
    });
    modal.selected.add(index);
  } else if (modal.selected.has(index)) modal.selected.delete(index);
  else modal.selected.add(index);
  renderModal();
}

function closeModal() {
  const host = $('[data-eo-modal]');
  if (!host?.classList.contains('is-open')) return;
  host.classList.remove('is-open');
  document.body.classList.remove('eo-modal-open');
  if (modal.returnFocus && typeof modal.returnFocus.focus === 'function') modal.returnFocus.focus({ preventScroll: true });
}

function addFromModal() {
  if (!modal.dish) return;
  const mods = [...modal.selected].sort((a, b) => a - b).map((i) => ({ label: modal.dish.mods[i].label, delta: modal.dish.mods[i].delta }));
  addLine(modal.dish.name, modal.dish.base, mods, modal.qty);
  closeModal();
  toast(`${modal.qty > 1 ? `${modal.qty}× ` : ''}${modal.dish.name} added to your order.`);
}

/* ---------- dietary filter ---------- */

function applyDiet(diet) {
  state.diet = diet;
  $$('[data-eo-diet]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.eoDiet === diet)));
  let shown = 0;
  const all = $$('.dish');
  all.forEach((dish) => {
    const tags = (dish.dataset.diet || '').split(/\s+/);
    const match = diet === 'all' || tags.includes(diet);
    dish.classList.toggle('is-filtered', !match);
    if (match) shown += 1;
  });
  $$('[data-panel]').forEach((panel) => {
    const visible = $$('.dish:not(.is-filtered)', panel).length;
    panel.classList.toggle('is-empty', visible === 0);
  });
  const count = $('[data-eo-count]');
  if (count) count.textContent = diet === 'all' ? `${all.length} dishes` : `${shown} of ${all.length} dishes`;
}

/* ---------- kitchen busy toggle ---------- */

function setBusy(on) {
  state.busy = on;
  const sw = $('[data-eo-busy]');
  if (sw) sw.setAttribute('aria-pressed', String(on));
  $('[data-eo-busy-banner]')?.classList.toggle('is-shown', on);
  const text = $('[data-eo-kitchen-text]');
  if (text) text.textContent = on ? 'Kitchen is slammed · add 10 min to every pickup' : 'Kitchen is on time · pickups running as quoted';
  $('.kitchen-status')?.classList.toggle('is-busy', on);
  renderService();
  renderFooter();
  renderKdsHead();
}

/* ---------- events ---------- */

function init() {
  buildLaterOptions();
  render();
  applyDiet('all');

  document.addEventListener('click', (event) => {
    const target = event.target instanceof Element ? event.target : null;
    if (!target) return;
    const hit = (sel) => target.closest(sel);

    // Generic data-add (handled by mockups.js first) - mirror into our state.
    const add = hit('[data-add]');
    if (add) {
      const [name, price] = add.dataset.add.split('|');
      addLine(name, Number(price));
      toast(`${name} added to your order.`);
      return;
    }

    const mode = hit('[data-eo-mode]');
    if (mode) {
      state.service = mode.dataset.eoMode;
      renderService();
      renderFooter();
      toast(state.service === 'dinein' ? 'Dine-in · we’ll ask for your table number at checkout.' : 'Pickup · ready in as little as 15 minutes.');
      $('.eo-menu')?.scrollIntoView({ block: 'start', behavior: reducedMotion.matches ? 'auto' : 'smooth' });
      return;
    }

    const dish = hit('[data-eo-dish]');
    if (dish) {
      openDish(dish.closest('.dish'));
      return;
    }
    if (hit('[data-eo-modal-close]')) {
      closeModal();
      return;
    }
    const mod = hit('[data-eo-mod]');
    if (mod) {
      toggleMod(Number(mod.dataset.eoMod));
      return;
    }
    const mq = hit('[data-eo-modal-qty]');
    if (mq) {
      modal.qty = Math.min(9, Math.max(1, modal.qty + Number(mq.dataset.eoModalQty)));
      renderModal();
      return;
    }
    if (hit('[data-eo-modal-add]')) {
      addFromModal();
      return;
    }

    const diet = hit('[data-eo-diet]');
    if (diet) {
      applyDiet(diet.dataset.eoDiet);
      return;
    }
    if (hit('[data-eo-busy]')) {
      setBusy(!state.busy);
      return;
    }

    const qty = hit('[data-eo-qty]');
    if (qty) {
      changeQty(qty.closest('li')?.dataset.key, Number(qty.dataset.eoQty));
      return;
    }
    const remove = hit('[data-eo-remove]');
    if (remove) {
      removeLine(remove.closest('li')?.dataset.key);
      return;
    }
    const tip = hit('[data-eo-tip]');
    if (tip) {
      state.tip = Number(tip.dataset.eoTip);
      renderSums();
      renderFooter();
      return;
    }
    const service = hit('[data-eo-service]');
    if (service) {
      state.service = service.dataset.eoService;
      renderService();
      renderFooter();
      return;
    }
    const slot = hit('[data-eo-slot]');
    if (slot) {
      state.slot = slot.dataset.eoSlot;
      renderService();
      renderFooter();
      return;
    }
    const pay = hit('[data-eo-pay]');
    if (pay) {
      state.pay = pay.dataset.eoPay;
      $$('[data-eo-pay]').forEach((b) => b.setAttribute('aria-pressed', String(b === pay)));
      $('.card-visual')?.classList.toggle('is-muted', state.pay !== 'card');
      renderFooter();
      return;
    }
    const newCard = hit('[data-eo-newcard]');
    if (newCard) {
      const open = newCard.getAttribute('aria-expanded') !== 'true';
      newCard.setAttribute('aria-expanded', String(open));
      newCard.textContent = open ? 'Keep the saved card' : 'Use a different card';
      $('[data-eo-newcard-form]')?.classList.toggle('is-open', open);
      return;
    }
    if (hit('[data-eo-next]')) {
      next();
      return;
    }
    if (hit('[data-eo-back]')) back();
  });

  document.addEventListener('input', (event) => {
    const el = event.target;
    if (!(el instanceof HTMLElement)) return;
    if (el.matches('[data-eo-table]')) {
      state.table = el.value.replace(/\D/g, '').slice(0, 3);
      if (el.value !== state.table) el.value = state.table;
      if (state.table) showError('[data-eo-table]', '[data-eo-table-error]', false);
      renderService();
      renderFooter();
    } else if (el.matches('[data-eo-name]')) {
      state.customer.name = el.value;
      if (el.value.trim().length >= 2) showError('[data-eo-name]', '[data-eo-name-error]', false);
    } else if (el.matches('[data-eo-phone]')) {
      state.customer.phone = el.value;
      if (el.value.replace(/\D/g, '').length >= 7) showError('[data-eo-phone]', '[data-eo-phone-error]', false);
    } else if (el.matches('[data-eo-notes]')) {
      state.customer.notes = el.value;
    }
  });

  document.addEventListener('change', (event) => {
    const el = event.target;
    if (!(el instanceof HTMLElement)) return;
    if (el.matches('[data-eo-later-select]')) {
      state.later = el.value;
      renderService();
      renderFooter();
    } else if (el.matches('[data-eo-sms]')) {
      state.customer.sms = el.checked;
    }
  });

  document.addEventListener('keydown', (event) => {
    if (event.key !== 'Escape') return;
    if ($('[data-eo-modal]')?.classList.contains('is-open')) {
      closeModal();
      return;
    }
    const cart = $('#cart');
    if (cart?.classList.contains('is-open')) {
      cart.classList.remove('is-open');
      $('[data-eo-fab]')?.focus();
    }
  });

  initExtras();
}

/* ======================================================================
   Extras: tonight's specials with live stock, dish ratings, Ember Club
   loyalty, gift cards, table reservations on a floor plan, and the staff
   side (kitchen tickets + host stand). Same contract as above: JS only
   toggles classes / attributes / text and inline transforms; every
   transition lives in restaurant.css. Nothing here reads the wall clock -
   the hold countdown and ticket timers are plain 1-second tick counters.
   ====================================================================== */

const CLUB_DESSERT_AT = 500;
const CLUB_REWARDS = [
  { id: 'bread', name: 'Sourdough & butter', base: 7, cost: 300 },
  { id: 'dessert', name: 'Burnt basque cheesecake', base: 13, cost: 500 },
];
const club = { balance: 420, lastEarned: 0 };

const SPECIALS = [
  { id: 'cauli', name: 'Whole roasted cauliflower', price: 24, stock: 8, sold: 0, off: false },
  { id: 'lamb', name: 'Lamb shoulder for two', price: 78, stock: 5, sold: 0, off: false },
];

const HOLD_SECS = 300;
const TABLES = [
  { id: '1', seats: 2, zone: 'room', note: 'window' },
  { id: '2', seats: 2, zone: 'room', note: 'window' },
  { id: '3', seats: 2, zone: 'room', note: 'window' },
  { id: '4', seats: 4, zone: 'room', note: '' },
  { id: '5', seats: 4, zone: 'room', note: '' },
  { id: '6', seats: 4, zone: 'room', note: 'by the fire' },
  { id: '7', seats: 6, zone: 'room', note: 'by the fire' },
  { id: '8', seats: 8, zone: 'room', note: "chef's counter" },
  { id: '11', seats: 2, zone: 'patio', note: 'under the vine' },
  { id: '12', seats: 2, zone: 'patio', note: 'under the vine' },
  { id: '13', seats: 4, zone: 'patio', note: 'heater' },
  { id: '14', seats: 6, zone: 'patio', note: 'heater' },
];
const DATES = {
  tonight: { label: 'tonight', weekend: false },
  fri: { label: 'Friday', weekend: true },
  sat: { label: 'Saturday', weekend: true },
  sun: { label: 'Sunday', weekend: false },
  tue: { label: 'Tuesday', weekend: false },
};
const TIMES = ['5:00', '5:30', '6:00', '6:30', '7:00', '7:30', '8:00', '8:30', '9:00'];
const resv = { date: 'tonight', time: '7:00', party: 2, table: null, occasion: '', step: 'pick', hold: HOLD_SECS, timer: 0, name: '', phone: '', booking: null };

const kds = {
  tab: 'tickets',
  nextNum: 4136,
  served: 38,
  simIndex: 0,
  timer: 0,
  tickets: [
    { id: 'EO-4127', who: 'Table 6', items: ['2× Half chicken', 'Grilled greens · extra chili'], stage: 1, secs: 252, mine: false },
    { id: 'EO-4131', who: 'Pickup · Priya', items: ['Dry-aged ribeye · medium-rare', 'Ember potatoes'], stage: 2, secs: 505, mine: false },
    { id: 'EO-4133', who: 'Pickup · Dev', items: ['Burrata', 'Sourdough & butter · extra butter'], stage: 3, secs: 740, mine: false },
  ],
  bookings: [
    { time: '6:00', table: '4', name: 'Okafor', party: 4, occasion: '', status: 'seated', mine: false },
    { time: '6:30', table: '13', name: 'Lindqvist', party: 2, occasion: '', status: 'seated', mine: false },
    { time: '7:30', table: '7', name: 'Nakamura', party: 6, occasion: 'Anniversary', status: 'expected', mine: false },
    { time: '8:00', table: '2', name: 'Bello', party: 2, occasion: '', status: 'expected', mine: false },
  ],
};
const SIM_TICKETS = [
  { who: 'Table 3', items: ['Lamb shoulder for two', 'Charred leeks'], special: 'lamb' },
  { who: 'Pickup · Amara', items: ['Whole branzino · filleted', 'Grilled greens'], special: '' },
  { who: 'Table 9', items: ['2× Mushroom pie', 'Sourdough & butter'], special: '' },
];

const extras = {
  view: 'guest',
  ranked: false,
  rated: new Map(), // article -> stars given tonight
  article: null, // the dish currently open in the modal
  gift: { amount: 100, custom: '', to: '', from: '', msg: '', delivery: 'email' },
};

const hashStr = (s) => String(s).split('').reduce((h, c) => (h * 31 + c.charCodeAt(0)) % 9973, 7);
const setText = (sel, text, root = document) => {
  const el = $(sel, root);
  if (el) el.textContent = text;
};

// Same merge rule as addLine, but the line can carry flags (noTax, reward…).
function addExtraLine(name, base, mods, qty, flags) {
  const key = `${name}::${mods.map((m) => m.label).join('+')}`;
  const existing = state.lines.find((l) => l.key === key);
  if (existing) existing.qty += qty;
  else state.lines.push({ key, name, base, mods, qty, ...flags });
  render();
  bumpFab();
}

/* ---------- tonight's specials ---------- */

const specialInCart = (id) => (state.order ? 0 : state.lines.filter((l) => l.special === id).reduce((s, l) => s + l.qty, 0));
const specialLeft = (s) => Math.max(0, s.stock - s.sold - specialInCart(s.id));

function renderSpecials() {
  SPECIALS.forEach((s) => {
    const left = specialLeft(s);
    const out = s.off || left === 0;
    const card = $(`[data-eo-special-card="${s.id}"]`);
    if (card) {
      card.classList.toggle('is-out', out);
      const leftEl = $('[data-eo-special-left]', card);
      if (leftEl) leftEl.textContent = s.off ? 'Sold out · the kitchen called it' : left === 0 ? 'Sold out' : left <= 3 ? `Only ${left} left` : `${left} left`;
      $('.left', card)?.classList.toggle('is-low', !out && left <= 3);
      const btn = $('[data-eo-special-add]', card);
      if (btn) {
        btn.setAttribute('aria-disabled', String(out));
        btn.textContent = out ? 'Gone for tonight' : 'Add to order';
      }
    }
    setText(`[data-eo-kds-stock="${s.id}"]`, s.off ? "86'd" : `${left} left`);
    $(`[data-eo-kds-stock-row="${s.id}"]`)?.classList.toggle('is-off', s.off);
    const b86 = $(`[data-eo-kds-86="${s.id}"]`);
    if (b86) {
      b86.setAttribute('aria-pressed', String(s.off));
      b86.textContent = s.off ? 'Back on' : '86 it';
    }
  });
  const anyShown = $$('.special').some((c) => !c.classList.contains('is-filtered'));
  $('[data-eo-specials]')?.classList.toggle('is-empty', !anyShown);
}

function addSpecial(id) {
  const s = SPECIALS.find((x) => x.id === id);
  if (!s) return;
  if (s.off || specialLeft(s) === 0) {
    toast(`${s.name} is gone for tonight - the kitchen only made ${s.stock}.`);
    return;
  }
  addExtraLine(s.name, s.price, [], 1, { special: id });
  const left = specialLeft(s);
  toast(left === 0 ? `${s.name} added - that was the last one.` : `${s.name} added · ${left} left for everyone else.`);
}

function filterSpecials(diet) {
  $$('.special').forEach((card) => {
    const tags = (card.dataset.diet || '').split(/\s+/);
    card.classList.toggle('is-filtered', !(diet === 'all' || tags.includes(diet)));
  });
  renderSpecials();
}

/* ---------- ratings & most loved ---------- */

const dishRating = (a) => Number(a.dataset.rating) || 0;
const dishReviews = (a) => Number(a.dataset.reviews) || 0;

function rankDishes() {
  $$('[data-panel]').forEach((panel) => {
    const dishes = $$('.dish', panel);
    const sorted = [...dishes].sort((a, b) => dishRating(b) - dishRating(a) || dishReviews(b) - dishReviews(a));
    dishes.forEach((d) => {
      d.classList.remove('is-loved');
      for (let i = 1; i <= 6; i += 1) d.classList.remove(`rank-${i}`);
    });
    sorted.forEach((d, i) => {
      d.classList.add(`rank-${i + 1}`);
      if (i === 0) d.classList.add('is-loved');
    });
  });
}

function ratingLabel(article) {
  return `★ ${dishRating(article).toFixed(1)} · ${dishReviews(article)} reviews`;
}

function renderRateButtons() {
  const given = extras.article ? extras.rated.get(extras.article) || 0 : 0;
  $$('[data-eo-rate]').forEach((b) => {
    const n = Number(b.dataset.eoRate);
    b.setAttribute('aria-pressed', String(n === given));
    b.classList.toggle('is-lit', n <= given);
  });
  setText('[data-eo-rate-thanks]', given ? `You gave this ${given} star${given > 1 ? 's' : ''} tonight.` : '');
  if (extras.article) setText('[data-eo-modal-rating]', ratingLabel(extras.article));
}

function rateDish(stars) {
  const a = extras.article;
  if (!a) return;
  if (extras.rated.has(a)) {
    toast('One vote per dish per night - thanks though.');
    return;
  }
  const count = dishReviews(a);
  const avg = (dishRating(a) * count + stars) / (count + 1);
  a.dataset.rating = avg.toFixed(1);
  a.dataset.reviews = String(count + 1);
  extras.rated.set(a, stars);
  setText('[data-eo-rating-out]', avg.toFixed(1), a);
  setText('[data-eo-reviews-out]', `${count + 1} reviews`, a);
  renderRateButtons();
  rankDishes();
  toast(`Thanks - your ${stars} star${stars > 1 ? 's' : ''} ${stars >= 4 ? 'made the kitchen’s night' : 'went straight to the chef'}.`);
}

function setSort(ranked) {
  extras.ranked = ranked;
  $('.eo-menu')?.classList.toggle('is-ranked', ranked);
  const btn = $('[data-eo-sort]');
  if (btn) {
    btn.setAttribute('aria-pressed', String(ranked));
    btn.textContent = ranked ? 'Sort: most loved' : 'Sort: menu order';
  }
}

/* ---------- Ember Club loyalty ---------- */

const redeemedPts = () => (state.order ? 0 : state.lines.reduce((s, l) => s + (l.reward || 0), 0));
const earnedFor = () => Math.floor(foodSubtotal());
const clubShown = () => club.balance - redeemedPts();

function renderClub() {
  const shown = clubShown();
  setText('[data-eo-club-pts]', `${shown} pts`);
  const bar = $('[data-eo-club-bar]');
  if (bar) bar.style.transform = `scaleX(${Math.min(1, shown / CLUB_DESSERT_AT)})`;
  const toDessert = CLUB_DESSERT_AT - shown;
  setText('[data-eo-club-note]', toDessert > 0 ? `${toDessert} pts from a free dessert · 1 pt per $1 on food` : 'Free dessert unlocked · 1 pt per $1 on food');
  CLUB_REWARDS.forEach((r) => {
    const btn = $(`[data-eo-club-redeem="${r.id}"]`);
    if (!btn) return;
    const inCart = state.lines.some((l) => l.rewardId === r.id);
    btn.setAttribute('aria-pressed', String(inCart));
    btn.setAttribute('aria-disabled', String(!inCart && (shown < r.cost || !!state.order)));
    const small = $('small', btn);
    if (small) small.textContent = inCart ? 'In your order' : shown < r.cost ? `${r.cost - shown} pts to go` : `${r.cost} pts`;
  });
  setText('[data-eo-pts-earn]', state.order ? `+${club.lastEarned} pts earned` : `+${earnedFor()} pts`);
  $$('[data-cart-list] li').forEach((li) => {
    const line = state.lines.find((l) => l.key === li.dataset.key);
    li.classList.toggle('is-reward', !!line?.reward);
  });
}

function toggleReward(id) {
  const r = CLUB_REWARDS.find((x) => x.id === id);
  if (!r) return;
  const existing = state.lines.find((l) => l.rewardId === id);
  if (existing) {
    removeLine(existing.key);
    toast(`${r.name} put back - your ${r.cost} pts are safe.`);
    return;
  }
  if (clubShown() < r.cost) {
    toast(`You're ${r.cost - clubShown()} pts short of that one - it's 1 pt per $1 on food.`);
    return;
  }
  addExtraLine(r.name, r.base, [{ label: 'Ember Club reward', delta: -r.base }], 1, { reward: r.cost, rewardId: id });
  toast(`${r.name} added for ${r.cost} pts.`);
}

/* ---------- gift cards ---------- */

const giftAmount = () => (extras.gift.amount === 'other' ? Number(extras.gift.custom) || 0 : extras.gift.amount);

function renderGift() {
  const g = extras.gift;
  $$('[data-eo-gift-amount]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.eoGiftAmount === String(g.amount))));
  $('[data-eo-gift-custom-wrap]')?.classList.toggle('is-open', g.amount === 'other');
  $$('[data-eo-gift-delivery]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.eoGiftDelivery === g.delivery)));
  const amt = giftAmount();
  setText('[data-eo-gift-preview-amount]', amt ? `$${amt}` : '$—');
  setText('[data-eo-gift-preview-to]', g.to.trim() ? `For ${g.to.trim()}` : 'For you');
  setText('[data-eo-gift-preview-from]', g.from.trim() ? `From ${g.from.trim()}` : '');
  setText('[data-eo-gift-preview-msg]', g.msg.trim() || 'A night by the fire, on us.');
  setText('[data-eo-gift-count]', `${g.msg.length} / 90`);
  const add = $('[data-eo-gift-add]');
  if (add) add.textContent = amt ? `Add to order · $${amt}` : 'Pick an amount';
}

function addGift() {
  const g = extras.gift;
  const amt = giftAmount();
  if (amt < 25 || amt > 500) {
    toast('Gift cards run from $25 to $500.');
    $('[data-eo-gift-custom]')?.focus();
    return;
  }
  const to = g.to.trim();
  showError('[data-eo-gift-to]', '[data-eo-gift-to-error]', !to);
  if (!to) {
    $('[data-eo-gift-to]')?.focus();
    return;
  }
  const delivery = g.delivery === 'email' ? 'Emailed tonight' : 'Print at home';
  const from = g.from.trim() ? ` from ${g.from.trim()}` : '';
  addExtraLine(`Gift card for ${to}`, amt, [{ label: `${delivery}${from}`, delta: 0 }], 1, { noTax: true });
  toast(`$${amt} gift card for ${to} added - no HST on that line.`);
}

/* ---------- reservations & floor plan ---------- */

const slotFull = (date, time) => DATES[date].weekend && (time === '7:00' || time === '7:30');
const patioClosed = (time) => time === '9:00';
function tableBooked(index) {
  const h = hashStr(resv.date + resv.time);
  return (h + index * 7) % 5 < (DATES[resv.date].weekend ? 3 : 2);
}
function tableState(t, index) {
  if (slotFull(resv.date, resv.time)) return { ok: false, why: 'full' };
  if (t.zone === 'patio' && patioClosed(resv.time)) return { ok: false, why: 'patio closes at 9' };
  if (tableBooked(index)) return { ok: false, why: 'booked' };
  if (t.seats < resv.party) return { ok: false, why: `seats ${t.seats}`, small: true };
  return { ok: true, why: t.note || `seats ${t.seats}` };
}

function renderTimes() {
  const host = $('[data-eo-resv-times]');
  if (!host) return;
  host.innerHTML = TIMES.map((time) => {
    const full = slotFull(resv.date, time);
    return `<button type="button" data-eo-resv-time="${time}" aria-pressed="${resv.time === time}" aria-disabled="${full}">${time}${full ? ' <small>Full</small>' : ''}</button>`;
  }).join('');
}

function renderFloor() {
  const host = $('[data-eo-resv-tables]');
  if (!host) return;
  let free = 0;
  let selectedOk = false;
  host.innerHTML = TABLES.map((t, i) => {
    const st = tableState(t, i);
    if (st.ok) free += 1;
    const picked = resv.table === t.id;
    if (picked && st.ok) selectedOk = true;
    const size = t.seats === 2 ? 'two' : t.seats === 4 ? 'four' : t.seats === 6 ? 'six' : 'eight';
    const cls = `tbl ${size}${st.ok ? '' : st.small ? ' is-small' : ' is-booked'}`;
    const zone = t.zone === 'patio' ? 'patio' : 'dining room';
    return `<button type="button" class="${cls}" data-eo-resv-table="${t.id}" aria-pressed="${picked && st.ok}" aria-disabled="${!st.ok}" aria-label="Table ${t.id}, ${zone}, ${st.why}"><span>${t.id}</span><small>${st.why}</small></button>`;
  }).join('');
  if (!selectedOk) resv.table = null;
  const when = `${DATES[resv.date].label} at ${resv.time} pm`;
  const summary = slotFull(resv.date, resv.time)
    ? `${resv.time} is full on ${DATES[resv.date].label} - 6:30 and 8:00 usually have room.`
    : free === 0
      ? `Nothing seats ${resv.party} at ${resv.time} ${DATES[resv.date].label} - try another time.`
      : `${when} · party of ${resv.party} · ${free} table${free === 1 ? '' : 's'} free`;
  setText('[data-eo-resv-summary]', summary);
  setText('[data-eo-resv-party-note]', resv.party <= 2 ? 'Tables for two sit by the window.' : resv.party <= 4 ? 'Ask for 6 - it faces the fire.' : resv.party <= 6 ? 'Sixes take the long tables.' : "The chef's counter seats eight.");
  const hold = $('[data-eo-resv-hold]');
  if (hold) {
    hold.setAttribute('aria-disabled', String(!resv.table));
    const t = TABLES.find((x) => x.id === resv.table);
    hold.textContent = t ? `Hold Table ${t.id} · ${when}` : 'Tap a table to hold it';
  }
}

function renderResvStep() {
  const sec = $('[data-eo-resv-step]');
  if (sec) sec.dataset.eoResvStep = resv.step;
  $$('[data-eo-resv-date]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.eoResvDate === resv.date)));
  $$('[data-eo-resv-occasion]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.eoResvOccasion === resv.occasion)));
  setText('[data-eo-resv-party-out]', String(resv.party));
}

function renderHold() {
  const m = Math.floor(resv.hold / 60);
  const s = resv.hold % 60;
  setText('[data-eo-resv-countdown]', `${m}:${String(s).padStart(2, '0')}`);
  const bar = $('[data-eo-resv-hold-bar]');
  if (bar) bar.style.transform = `scaleX(${resv.hold / HOLD_SECS})`;
  $('.hold-card')?.classList.toggle('is-urgent', resv.hold <= 60);
}

function stopHold() {
  clearInterval(resv.timer);
  resv.timer = 0;
}

function startHold() {
  const t = TABLES.find((x) => x.id === resv.table);
  if (!t) {
    toast('Tap a free table on the plan first.');
    return;
  }
  resv.step = 'hold';
  resv.hold = HOLD_SECS;
  setText('[data-eo-resv-hold-title]', `Holding Table ${t.id}`);
  setText('[data-eo-resv-hold-text]', `${t.zone === 'patio' ? 'Patio' : 'Dining room'}, ${t.note || `seats ${t.seats}`} · ${DATES[resv.date].label} at ${resv.time} pm · party of ${resv.party}. Nobody else can take it while the clock runs.`);
  renderResvStep();
  renderHold();
  stopHold();
  resv.timer = setInterval(() => {
    resv.hold -= 1;
    renderHold();
    if (resv.hold <= 0) expireHold();
  }, 1000);
  $('[data-eo-resv-name]')?.focus({ preventScroll: true });
  $('.resv-hold')?.scrollIntoView({ block: 'nearest', behavior: reducedMotion.matches ? 'auto' : 'smooth' });
}

function expireHold() {
  stopHold();
  const id = resv.table;
  resv.table = null;
  resv.step = 'pick';
  renderResvStep();
  renderFloor();
  toast(`Your five-minute hold on Table ${id} lapsed - pick again.`);
}

function releaseHold() {
  stopHold();
  resv.step = 'pick';
  renderResvStep();
  renderFloor();
  toast('Table released.');
}

function confirmBooking() {
  const name = resv.name.trim();
  const digits = resv.phone.replace(/\D/g, '');
  const nameOk = name.length >= 2;
  const phoneOk = digits.length >= 7;
  showError('[data-eo-resv-name]', '[data-eo-resv-name-error]', !nameOk);
  showError('[data-eo-resv-phone]', '[data-eo-resv-phone-error]', !phoneOk);
  if (!nameOk) {
    $('[data-eo-resv-name]')?.focus();
    return;
  }
  if (!phoneOk) {
    $('[data-eo-resv-phone]')?.focus();
    return;
  }
  stopHold();
  const t = TABLES.find((x) => x.id === resv.table);
  const code = `EO-R-${((hashStr(resv.date + resv.time + resv.table + name) * 7919) % 46656).toString(36).toUpperCase().padStart(3, '0')}`;
  resv.booking = { code, table: t.id, date: resv.date, time: resv.time, party: resv.party, name, occasion: resv.occasion };
  const surname = name.split(/\s+/).slice(-1)[0];
  kds.bookings.push({ time: resv.time, table: t.id, name: surname, party: resv.party, occasion: resv.occasion, status: 'expected', mine: true });
  renderHost();
  setText('[data-eo-resv-code]', code);
  setText('[data-eo-resv-booked-text]', `Table ${t.id} ${t.zone === 'patio' ? 'on the patio' : 'in the dining room'} · ${DATES[resv.date].label} at ${resv.time} pm · party of ${resv.party} · under ${name}.`);
  const occasion = { Birthday: "We'll bring a candle with dessert.", Anniversary: 'A glass of something sparkling is on us.', Business: "We'll keep it quiet and the bill discreet." }[resv.occasion] || '';
  setText('[data-eo-resv-booked-note]', `We'll text ${resv.phone.trim()} the day before. ${occasion} Flip to Kitchen screen → Host stand to see it in the book.`);
  resv.step = 'booked';
  renderResvStep();
  toast(`Booked · Table ${t.id}, ${DATES[resv.date].label} at ${resv.time} pm.`);
}

function bookAgain() {
  resv.step = 'pick';
  resv.table = null;
  resv.name = '';
  resv.phone = '';
  resv.occasion = '';
  ['[data-eo-resv-name]', '[data-eo-resv-phone]'].forEach((sel) => {
    const el = $(sel);
    if (el) {
      el.value = '';
      el.removeAttribute('aria-invalid');
    }
  });
  $$('.eo-reserve .field-error').forEach((e) => e.classList.remove('is-shown'));
  renderResvStep();
  renderFloor();
}

function preorderForTable() {
  const b = resv.booking;
  if (!b) return;
  state.service = 'dinein';
  state.table = b.table;
  const input = $('[data-eo-table]');
  if (input) input.value = b.table;
  showError('[data-eo-table]', '[data-eo-table-error]', false);
  renderService();
  renderFooter();
  $('#cart')?.classList.add('is-open');
  toast(`Table ${b.table} is on your order - the kitchen fires it once you're seated.`);
}

/* ---------- staff side: kitchen tickets + host stand ---------- */

const fmtSecs = (secs) => `${Math.floor(secs / 60)}:${String(secs % 60).padStart(2, '0')}`;

function renderKdsHead() {
  setText('[data-eo-kds-open]', String(kds.tickets.length));
  setText('[data-eo-kds-served]', String(kds.served));
  const busy = $('[data-eo-kds-busy]');
  if (busy) {
    busy.textContent = state.busy ? 'Slammed · +10 min quoted' : 'On time';
    busy.classList.toggle('is-busy', state.busy);
  }
}

function renderTickets() {
  [1, 2, 3].forEach((stage) => {
    const lane = $(`[data-eo-kds-col="${stage}"]`);
    const list = kds.tickets.filter((t) => t.stage === stage);
    setText(`[data-eo-kds-n="${stage}"]`, String(list.length));
    if (!lane) return;
    const bump = ['Start cooking', 'Send to pass', 'Handed off'][stage - 1];
    lane.innerHTML = list.length
      ? list
          .map(
            (t) => `<article class="ticket${t.secs >= 720 && t.stage < 3 ? ' is-very-late' : t.secs >= 480 && t.stage < 3 ? ' is-late' : ''}${t.fresh ? ' is-new' : ''}" data-stage="${t.stage}" data-eo-ticket="${t.id}">
          <div class="t-top"><span class="t-num">#${escapeHtml(t.id)}</span><span class="t-time" data-eo-kds-time="${escapeHtml(t.id)}">${fmtSecs(t.secs)}</span></div>
          <p class="t-who">${escapeHtml(t.who)}${t.mine ? ' <span class="t-mine">Your order</span>' : ''}</p>
          <ul>${t.items.map((i) => `<li>${escapeHtml(i)}</li>`).join('')}</ul>
          <button type="button" class="bump" data-eo-kds-bump="${escapeHtml(t.id)}">${bump}</button>
        </article>`,
          )
          .join('')
      : `<p class="lane-empty">${['Nothing waiting', 'Nothing on the fire', 'Pass is clear'][stage - 1]}</p>`;
  });
  kds.tickets.forEach((t) => (t.fresh = false));
  renderKdsHead();
}

function tickTickets() {
  kds.tickets.forEach((t) => {
    t.secs += 1;
    const el = $(`[data-eo-ticket="${t.id}"]`);
    if (!el) return;
    setText('[data-eo-kds-time]', fmtSecs(t.secs), el);
    el.classList.toggle('is-late', t.stage < 3 && t.secs >= 480 && t.secs < 720);
    el.classList.toggle('is-very-late', t.stage < 3 && t.secs >= 720);
  });
}

function bumpTicket(id) {
  const t = kds.tickets.find((x) => x.id === id);
  if (!t) return;
  if (t.stage >= 3) {
    kds.tickets = kds.tickets.filter((x) => x !== t);
    kds.served += 1;
    renderTickets();
    toast(`#${id} handed off. ${kds.served} served tonight.`);
    return;
  }
  if (t.mine && state.order && state.order.number === id) {
    // Staff bumped the guest's own ticket: take over from the auto tracker.
    clearTimers();
    setStage(t.stage + 1);
    toast(`#${id} bumped from the pass - open your order to watch the tracker move.`);
    return;
  }
  t.stage += 1;
  renderTickets();
}

// Called from setStage: keep the guest's ticket in step with their tracker.
function kdsSyncStage(stage) {
  if (!state.order) return;
  const t = kds.tickets.find((x) => x.mine && x.id === state.order.number);
  if (!t || t.stage === stage) return;
  t.stage = stage;
  renderTickets();
}

function simulateIncoming() {
  const sim = SIM_TICKETS[kds.simIndex % SIM_TICKETS.length];
  kds.simIndex += 1;
  const items = [...sim.items];
  const special = SPECIALS.find((s) => s.id === sim.special);
  if (special) {
    if (!special.off && specialLeft(special) > 0) special.sold += 1;
    else items[0] = 'Half chicken · swapped, lamb is gone';
  }
  const id = `EO-${kds.nextNum}`;
  kds.nextNum += 1;
  kds.tickets.push({ id, who: sim.who, items, stage: 1, secs: 0, mine: false, fresh: true });
  renderTickets();
  renderSpecials();
  toast(special && special.sold ? `#${id} in · ${sim.who} took a lamb shoulder - ${specialLeft(special)} left.` : `#${id} printed at the pass.`);
}

function toggle86(id) {
  const s = SPECIALS.find((x) => x.id === id);
  if (!s) return;
  s.off = !s.off;
  renderSpecials();
  toast(s.off ? `${s.name} is 86'd - guests see "Sold out" right now.` : `${s.name} is back on the menu.`);
}

function onOrderConfirmed() {
  const items = state.order.items;
  const redeemed = items.reduce((s, l) => s + (l.reward || 0), 0);
  club.lastEarned = earnedFor();
  club.balance = club.balance - redeemed + club.lastEarned;
  SPECIALS.forEach((s) => {
    s.sold += items.filter((l) => l.special === s.id).reduce((n, l) => n + l.qty, 0);
  });
  const toDessert = CLUB_DESSERT_AT - club.balance;
  setText(
    '[data-eo-done-club]',
    `Ember Club: +${club.lastEarned} pts${redeemed ? `, ${redeemed} redeemed` : ''} · balance ${club.balance}. ${toDessert > 0 ? `${toDessert} more for a free dessert.` : 'A free dessert is waiting for next time.'}`,
  );
  const kitchen = items.filter((l) => !l.noTax);
  if (kitchen.length) {
    const first = state.customer.name.trim().split(/\s+/)[0] || 'Guest';
    kds.tickets.push({
      id: state.order.number,
      who: state.order.service === 'dinein' ? `Table ${state.table}` : `Pickup · ${first}`,
      items: kitchen.map((l) => `${l.qty > 1 ? `${l.qty}× ` : ''}${l.name}${l.mods.length ? ` · ${l.mods.map((m) => m.label).join(', ')}` : ''}`),
      stage: 1,
      secs: 0,
      mine: true,
      fresh: true,
    });
    renderTickets();
  }
  renderExtras();
}

function renderHost() {
  const list = $('[data-eo-host-list]');
  const sorted = [...kds.bookings].sort((a, b) => Number(a.time.replace(':', '')) - Number(b.time.replace(':', '')));
  if (list) {
    list.innerHTML = sorted
      .map((b) => {
        const i = kds.bookings.indexOf(b);
        return `<li class="host-row${b.status === 'seated' ? ' is-seated' : ''}${b.mine ? ' is-new' : ''}">
          <span class="time">${escapeHtml(b.time)} pm</span>
          <span class="tbl-tag">T${escapeHtml(b.table)}</span>
          <span class="who"><strong>${escapeHtml(b.name)}</strong> · ${b.party}${b.occasion ? ` <em class="occ">${escapeHtml(b.occasion)}</em>` : ''}${b.mine ? ' <em class="occ new">Just booked online</em>' : ''}</span>
          ${b.status === 'seated' ? '<span class="seated">Seated</span>' : `<button type="button" class="seat" data-eo-host-seat="${i}">Seat them</button>`}
        </li>`;
      })
      .join('');
  }
  setText('[data-eo-host-covers]', String(kds.bookings.reduce((s, b) => s + b.party, 0)));
}

function setView(view) {
  extras.view = view;
  $$('[data-eo-view]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.eoView === view)));
  $('.eo-menu')?.classList.toggle('is-staff', view === 'kitchen');
}

function setKdsTab(tab) {
  kds.tab = tab;
  $$('[data-eo-kds-tab]').forEach((b) => b.setAttribute('aria-selected', String(b.dataset.eoKdsTab === tab)));
  $$('[data-eo-kds-panel]').forEach((p) => p.classList.toggle('is-active', p.dataset.eoKdsPanel === tab));
}

/* ---------- glue ---------- */

// Called from render() on every cart change.
function renderExtras() {
  renderSpecials();
  renderClub();
}

function initExtras() {
  rankDishes();
  renderTimes();
  renderFloor();
  renderResvStep();
  renderGift();
  renderTickets();
  renderHost();
  renderExtras();
  kds.timer = setInterval(tickTickets, 1000);

  document.addEventListener('click', (event) => {
    const target = event.target instanceof Element ? event.target : null;
    if (!target) return;
    const hit = (sel) => target.closest(sel);

    // Runs after the core listener has populated the modal for this dish.
    const dish = hit('[data-eo-dish]');
    if (dish) {
      extras.article = dish.closest('.dish');
      renderRateButtons();
      return;
    }
    const rate = hit('[data-eo-rate]');
    if (rate) {
      rateDish(Number(rate.dataset.eoRate));
      return;
    }
    if (hit('[data-eo-sort]')) {
      setSort(!extras.ranked);
      return;
    }
    const diet = hit('[data-eo-diet]');
    if (diet) {
      filterSpecials(diet.dataset.eoDiet);
      return;
    }
    const special = hit('[data-eo-special-add]');
    if (special) {
      addSpecial(special.dataset.eoSpecialAdd);
      return;
    }
    const view = hit('[data-eo-view]');
    if (view) {
      setView(view.dataset.eoView);
      return;
    }
    if (hit('[data-eo-reserve-jump]')) {
      const h = $('#reserve-title');
      $('#reserve')?.scrollIntoView({ block: 'start', behavior: reducedMotion.matches ? 'auto' : 'smooth' });
      h?.focus({ preventScroll: true });
      return;
    }

    const clubToggle = hit('[data-eo-club-toggle]');
    if (clubToggle) {
      const open = clubToggle.getAttribute('aria-expanded') !== 'true';
      clubToggle.setAttribute('aria-expanded', String(open));
      $('[data-eo-club]')?.classList.toggle('is-open', open);
      return;
    }
    const redeem = hit('[data-eo-club-redeem]');
    if (redeem) {
      if (state.order) return;
      toggleReward(redeem.dataset.eoClubRedeem);
      return;
    }

    const amount = hit('[data-eo-gift-amount]');
    if (amount) {
      const v = amount.dataset.eoGiftAmount;
      extras.gift.amount = v === 'other' ? 'other' : Number(v);
      renderGift();
      if (v === 'other') $('[data-eo-gift-custom]')?.focus();
      return;
    }
    const delivery = hit('[data-eo-gift-delivery]');
    if (delivery) {
      extras.gift.delivery = delivery.dataset.eoGiftDelivery;
      renderGift();
      return;
    }
    if (hit('[data-eo-gift-add]')) {
      addGift();
      return;
    }

    const date = hit('[data-eo-resv-date]');
    if (date) {
      resv.date = date.dataset.eoResvDate;
      renderResvStep();
      renderTimes();
      renderFloor();
      return;
    }
    const party = hit('[data-eo-resv-party]');
    if (party) {
      resv.party = Math.min(8, Math.max(1, resv.party + Number(party.dataset.eoResvParty)));
      renderResvStep();
      renderFloor();
      return;
    }
    const time = hit('[data-eo-resv-time]');
    if (time) {
      if (time.getAttribute('aria-disabled') === 'true') {
        toast(`${time.dataset.eoResvTime} is full that night - try 6:30 or 8:00.`);
        return;
      }
      resv.time = time.dataset.eoResvTime;
      renderTimes();
      renderFloor();
      return;
    }
    const table = hit('[data-eo-resv-table]');
    if (table) {
      if (table.getAttribute('aria-disabled') === 'true') {
        toast(table.classList.contains('is-small') ? `Table ${table.dataset.eoResvTable} is too small for ${resv.party}.` : `Table ${table.dataset.eoResvTable} isn't free then.`);
        return;
      }
      resv.table = resv.table === table.dataset.eoResvTable ? null : table.dataset.eoResvTable;
      renderFloor();
      return;
    }
    if (hit('[data-eo-resv-hold]')) {
      startHold();
      return;
    }
    const occasion = hit('[data-eo-resv-occasion]');
    if (occasion) {
      resv.occasion = occasion.dataset.eoResvOccasion;
      renderResvStep();
      return;
    }
    if (hit('[data-eo-resv-confirm]')) {
      confirmBooking();
      return;
    }
    if (hit('[data-eo-resv-cancel]')) {
      releaseHold();
      return;
    }
    if (hit('[data-eo-resv-again]')) {
      bookAgain();
      return;
    }
    if (hit('[data-eo-preorder]')) {
      preorderForTable();
      return;
    }

    const kdsTab = hit('[data-eo-kds-tab]');
    if (kdsTab) {
      setKdsTab(kdsTab.dataset.eoKdsTab);
      return;
    }
    const bump = hit('[data-eo-kds-bump]');
    if (bump) {
      bumpTicket(bump.dataset.eoKdsBump);
      return;
    }
    if (hit('[data-eo-kds-incoming]')) {
      simulateIncoming();
      return;
    }
    const b86 = hit('[data-eo-kds-86]');
    if (b86) {
      toggle86(b86.dataset.eoKds86);
      return;
    }
    const seat = hit('[data-eo-host-seat]');
    if (seat) {
      const b = kds.bookings[Number(seat.dataset.eoHostSeat)];
      if (b) {
        b.status = 'seated';
        renderHost();
        toast(`${b.name}, party of ${b.party}, seated at Table ${b.table}.`);
      }
    }
  });

  document.addEventListener('input', (event) => {
    const el = event.target;
    if (!(el instanceof HTMLElement)) return;
    if (el.matches('[data-eo-gift-custom]')) {
      extras.gift.custom = el.value.replace(/\D/g, '').slice(0, 3);
      if (el.value !== extras.gift.custom) el.value = extras.gift.custom;
      renderGift();
    } else if (el.matches('[data-eo-gift-to]')) {
      extras.gift.to = el.value;
      if (el.value.trim()) showError('[data-eo-gift-to]', '[data-eo-gift-to-error]', false);
      renderGift();
    } else if (el.matches('[data-eo-gift-from]')) {
      extras.gift.from = el.value;
      renderGift();
    } else if (el.matches('[data-eo-gift-msg]')) {
      extras.gift.msg = el.value;
      renderGift();
    } else if (el.matches('[data-eo-resv-name]')) {
      resv.name = el.value;
      if (el.value.trim().length >= 2) showError('[data-eo-resv-name]', '[data-eo-resv-name-error]', false);
    } else if (el.matches('[data-eo-resv-phone]')) {
      resv.phone = el.value;
      if (el.value.replace(/\D/g, '').length >= 7) showError('[data-eo-resv-phone]', '[data-eo-resv-phone-error]', false);
    }
  });
}

if (document.readyState !== 'loading') init();
else document.addEventListener('DOMContentLoaded', init);
