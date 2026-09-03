// Pulse - page-specific behaviour for the SaaS analytics mockup. Loaded
// after mockups.js, which keeps owning the generic hooks (data-range).
// This module owns: sidebar views, KPI tiles -> chart metric, chart
// tooltip, the live/auto-refresh loop, the customers table (search, filter,
// sort, detail drawer), the revenue what-if forecast and win-back offers,
// the events log (severity filter, detail drawer, acknowledge) and the
// settings form (dirty state, save/discard, export).
// Contract: JS only toggles classes / attributes / text and builds strings
// (SVG path data, labels). CSS owns every transition and animation.

const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
const escapeHtml = (s) =>
  String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

const fmtInt = (n) => Math.round(n).toLocaleString('en-US');
const fmtMoney = (n) => `$${fmtInt(n)}`;
const fmtK = (n) => (n >= 1000 ? `${(n / 1000).toFixed(1)}k` : fmtInt(n));

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
// The mockup's "today". Fixed so the numbers on the page always agree.
const TODAY = new Date(2026, 8, 2);
const BASE_MRR = 48210;
const BASE_CHURN = 1.8;
const BASE_GROWTH = 6.4;
const CHURN_COST = 1.75; // pts of net growth lost per pt of churn

/* ---------- shared state ---------- */

const state = {
  view: 'overview',
  metric: 'active',
  values: { mrr: BASE_MRR, active: 12904, churn: BASE_CHURN, response: 212 },
  series: {}, // range -> values[]
  tipIdx: -1,
  live: false,
  sinceRefresh: 0,
  clock: 9 * 3600 + 41 * 60 + 12, // 09:41:12, the newest event on load
  horizon: 6,
  threshold: 250,
  nextEventId: 13,
  liveCursor: 0,
  drawer: { mode: null, id: null, returnFocus: null },
};

/* ---------- toast ---------- */

let toastTimer = 0;
function toast(text) {
  const el = $('#toast');
  if (!el) return;
  el.textContent = text;
  el.classList.add('is-shown');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('is-shown'), 3200);
}

/* ---------- views ---------- */

const VIEWS = {
  overview: ['Overview', 'All workspaces'],
  customers: ['Customers', '278 accounts · 12 loaded'],
  revenue: ['Revenue', 'September 2026 · USD'],
  events: ['Events', 'Last 24 hours'],
  settings: ['Settings', 'Acme Robotics workspace'],
};

function switchView(name) {
  if (!VIEWS[name]) return;
  state.view = name;
  $('#pulse').dataset.current = name;
  $$('.side [data-view]').forEach((b) => {
    const on = b.dataset.view === name;
    b.classList.toggle('is-active', on);
    if (on) b.setAttribute('aria-current', 'page');
    else b.removeAttribute('aria-current');
  });
  $$('[data-view-panel]').forEach((p) => p.classList.toggle('is-active', p.dataset.viewPanel === name));
  $('#view-title').textContent = VIEWS[name][0];
  $('#view-sub').textContent = VIEWS[name][1];
  closeDrawer();
}

function initViews() {
  $$('[data-view]').forEach((b) => b.addEventListener('click', () => switchView(b.dataset.view)));
}

/* ---------- metrics & chart ---------- */

const METRICS = {
  mrr: {
    title: 'Monthly recurring revenue',
    seed: 11,
    mode: 'pct',
    delta: 0.064,
    amp: (end) => end * 0.012,
    value: (v) => fmtMoney(v),
    short: (v) => `$${fmtK(v)}`,
  },
  active: {
    title: 'Daily active users',
    seed: 23,
    mode: 'pct',
    delta: 0.031,
    amp: (end) => end * 0.06,
    value: (v) => fmtInt(v),
    short: (v) => fmtK(v),
  },
  churn: {
    title: 'Churn rate (trailing 30 days)',
    seed: 37,
    mode: 'abs',
    delta: -0.3,
    amp: () => 0.12,
    value: (v) => `${v.toFixed(1)}%`,
    short: (v) => `${v.toFixed(1)}%`,
  },
  response: {
    title: 'Avg. API response',
    seed: 41,
    mode: 'abs',
    delta: 18,
    amp: (end) => end * 0.07,
    value: (v) => `${Math.round(v)} ms`,
    short: (v) => `${Math.round(v)} ms`,
  },
};

function rng(seed) {
  let s = seed >>> 0 || 1;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

// Deterministic series that ends exactly on the KPI value and trends back
// to "last period" at the rate the KPI delta claims.
function series(metric, n) {
  const m = METRICS[metric];
  const end = state.values[metric];
  const perDay = m.delta * ((n - 1) / 30);
  const start = m.mode === 'pct' ? end / (1 + perDay) : end - perDay;
  const next = rng(m.seed * 1000 + n);
  const amp = m.amp(end);
  const out = [];
  let noise = 0;
  for (let i = 0; i < n; i++) {
    noise = noise * 0.55 + (next() * 2 - 1);
    const base = start + ((end - start) * i) / (n - 1);
    out.push(i === n - 1 ? end : Math.max(0, base + noise * amp * 0.6));
  }
  return out;
}

const X0 = 24;
const X1 = 576;
const Y0 = 24;
const Y1 = 196;
const xAt = (i, n) => X0 + ((X1 - X0) * i) / (n - 1);

function bounds(vals) {
  const lo = Math.min(...vals);
  const hi = Math.max(...vals);
  const pad = (hi - lo) * 0.08 || 1;
  return { lo: lo - pad, hi: hi + pad };
}

const yAt = (v, b) => Y1 - ((v - b.lo) / (b.hi - b.lo)) * (Y1 - Y0);

function dateLabel(i, n) {
  const d = new Date(TODAY);
  d.setDate(d.getDate() - (n - 1 - i));
  return `${MONTHS[d.getMonth()]} ${d.getDate()}`;
}

function drawChart() {
  const svg = $('#chart-svg');
  if (!svg) return;
  ['7d', '30d', '90d'].forEach((range) => {
    const n = parseInt(range, 10);
    const vals = series(state.metric, n);
    state.series[range] = vals;
    const b = bounds(vals);
    const line = vals
      .map((v, i) => `${i ? 'L' : 'M'}${xAt(i, n).toFixed(1)} ${yAt(v, b).toFixed(1)}`)
      .join(' ');
    const g = svg.querySelector(`[data-for="${range}"]`);
    if (!g) return;
    g.querySelector('.series').setAttribute('d', line);
    g.querySelector('.area').setAttribute('d', `${line} L${X1} ${Y1} L${X0} ${Y1} Z`);
  });
  updateChartLabels();
  hideTip();
}

function currentRange() {
  return $('[data-chart]')?.dataset.range || '30d';
}

function updateChartLabels() {
  const m = METRICS[state.metric];
  const range = currentRange();
  const vals = state.series[range] || [];
  const n = vals.length;
  $('#chart-title').textContent = m.title;
  $('#chart-total').textContent = m.short(state.values[state.metric]);
  $('#ax-max').textContent = `max ${m.short(Math.max(...vals))}`;
  $('#ax-start').textContent = dateLabel(0, n);
  $('[data-chart]').dataset.metric = state.metric;
}

function selectMetric(metric) {
  if (!METRICS[metric]) return;
  state.metric = metric;
  $$('[data-metric].kpi').forEach((k) => {
    const on = k.dataset.metric === metric;
    k.classList.toggle('is-active', on);
    k.setAttribute('aria-pressed', String(on));
  });
  drawChart();
}

function showTip(idx) {
  const wrap = $('#chart-wrap');
  const svg = $('#chart-svg');
  const range = currentRange();
  const vals = state.series[range];
  if (!wrap || !svg || !vals) return;
  const n = vals.length;
  idx = Math.max(0, Math.min(n - 1, idx));
  state.tipIdx = idx;
  const b = bounds(vals);
  const x = xAt(idx, n);
  const y = yAt(vals[idx], b);
  const cursor = $('#chart-cursor');
  cursor.setAttribute('x1', x.toFixed(1));
  cursor.setAttribute('x2', x.toFixed(1));
  const dot = $('#chart-dot');
  dot.setAttribute('cx', x.toFixed(1));
  dot.setAttribute('cy', y.toFixed(1));
  $('#tip-value').textContent = METRICS[state.metric].value(vals[idx]);
  $('#tip-date').textContent = idx === n - 1 ? 'today' : dateLabel(idx, n);
  const rect = svg.getBoundingClientRect();
  const px = (x / 600) * rect.width;
  const py = (y / 220) * rect.height;
  const tip = $('#chart-tip');
  tip.dataset.side = x > 400 ? 'left' : 'right';
  tip.style.transform = `translate(${px.toFixed(1)}px, ${py.toFixed(1)}px)`;
  wrap.classList.add('is-hover');
}

function hideTip() {
  $('#chart-wrap')?.classList.remove('is-hover');
  state.tipIdx = -1;
}

function initChart() {
  const wrap = $('#chart-wrap');
  const svg = $('#chart-svg');
  if (!wrap || !svg) return;
  $$('[data-metric].kpi').forEach((k) => k.addEventListener('click', () => selectMetric(k.dataset.metric)));
  // mockups.js already swaps the visible series on data-range; we only
  // refresh the labels that depend on the range.
  $$('[data-range]').forEach((b) =>
    b.addEventListener('click', () => {
      updateChartLabels();
      hideTip();
    }),
  );

  let raf = 0;
  svg.addEventListener('pointermove', (e) => {
    if (raf) return;
    raf = requestAnimationFrame(() => {
      raf = 0;
      const rect = svg.getBoundingClientRect();
      const ratio = (e.clientX - rect.left) / rect.width;
      const n = (state.series[currentRange()] || []).length;
      if (!n) return;
      const usable = (ratio * 600 - X0) / (X1 - X0);
      showTip(Math.round(usable * (n - 1)));
    });
  });
  svg.addEventListener('pointerleave', hideTip);
  wrap.addEventListener('focus', () => {
    const n = (state.series[currentRange()] || []).length;
    showTip(n - 1);
  });
  wrap.addEventListener('blur', hideTip);
  wrap.addEventListener('keydown', (e) => {
    if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
    e.preventDefault();
    const n = (state.series[currentRange()] || []).length;
    const idx = state.tipIdx < 0 ? n - 1 : state.tipIdx;
    showTip(idx + (e.key === 'ArrowLeft' ? -1 : 1));
  });
  drawChart();
}

/* ---------- live refresh ---------- */

const liveRng = rng(2026);
const LIVE_EVENTS = [
  {
    title: 'Invoice paid ($711.00)',
    account: 'Verde Landscaping',
    sev: 'ok',
    kicker: 'Billing',
    summary: 'Invoice INV-2291 for September was paid in full by the card ending 8810. Next invoice on Oct 2.',
    payload: { invoice: 'INV-2291', amount: 711, currency: 'USD', method: 'card_8810', status: 'paid' },
  },
  {
    title: 'Login from new device (Porto, PT)',
    account: 'Lumen Labs',
    sev: 'ok',
    kicker: 'Security',
    summary: 'Priya Shah signed in from a new MacBook in Porto. The device was verified by email code within 40 seconds.',
    payload: { user: 'priya@lumenlabs.io', device: 'MacBook Pro · Safari 20', city: 'Porto', country: 'PT', verified: true },
  },
  {
    title: 'Webhook delivery retried (1/3)',
    account: 'Orbit Retail',
    sev: 'warn',
    kicker: 'Integrations',
    summary: 'First delivery to hooks.orbitretail.com timed out after 10 s. Pulse will retry twice more with backoff.',
    payload: { endpoint: 'https://hooks.orbitretail.com/pulse', attempt: 1, max_attempts: 3, error: 'timeout (10000 ms)', next_retry_in: '60s' },
  },
  {
    title: 'Seats added (+2)',
    account: 'Atlas Legal',
    sev: 'ok',
    kicker: 'Billing',
    summary: 'Grace Lindqvist added two Scale seats. Proration of $86.67 will appear on the next invoice.',
    payload: { seats_before: 27, seats_after: 29, plan: 'scale', proration: 86.67 },
  },
  {
    title: 'Export completed (3,880 rows)',
    account: 'Tidewater Freight',
    sev: 'ok',
    kicker: 'Exports',
    summary: 'A CSV export of 3,880 event rows finished in 4.2 s and was emailed to Dev Malhotra.',
    payload: { rows: 3880, format: 'csv', duration_ms: 4210, delivered_to: 'dev@tidewaterfreight.com' },
  },
];

function clockLabel() {
  const s = state.clock % 86400;
  const hh = String(Math.floor(s / 3600)).padStart(2, '0');
  const mm = String(Math.floor((s % 3600) / 60)).padStart(2, '0');
  const ss = String(s % 60).padStart(2, '0');
  return `${hh}:${mm}:${ss}`;
}

function renderUpdated() {
  const el = $('#updated');
  if (!el) return;
  const s = state.sinceRefresh;
  el.textContent = s < 5 ? 'Updated just now' : s < 60 ? `Updated ${s}s ago` : `Updated ${Math.floor(s / 60)} min ago`;
}

function bump(el) {
  if (!el) return;
  el.classList.remove('is-bumped');
  requestAnimationFrame(() => el.classList.add('is-bumped'));
}

function setKpi(metric) {
  const el = $(`[data-kpi-value="${metric}"]`);
  if (!el) return;
  el.textContent = METRICS[metric].value(state.values[metric]);
  bump(el);
}

function refresh() {
  state.sinceRefresh = 0;
  state.values.active += Math.round(liveRng() * 100 - 40);
  state.values.response = Math.max(120, state.values.response + Math.round(liveRng() * 12 - 6));
  setKpi('active');
  setKpi('response');
  applyThreshold();
  if (state.metric === 'active' || state.metric === 'response') drawChart();
  pushLiveEvent();
  renderUpdated();
}

function pushLiveEvent() {
  const tpl = LIVE_EVENTS[state.liveCursor % LIVE_EVENTS.length];
  state.liveCursor += 1;
  const id = `ev${state.nextEventId++}`;
  EVENTS[id] = { kicker: tpl.kicker, summary: tpl.summary, payload: tpl.payload, action: tpl.sev === 'warn' ? 'retry' : null };
  const pillClass = tpl.sev === 'error' ? 'err' : tpl.sev;
  const row = `<tr data-ev="${id}" data-sev="${tpl.sev}" class="is-new"><td class="mono">${clockLabel()}</td><td><button type="button" class="row-btn">${escapeHtml(tpl.title)}</button></td><td>${escapeHtml(tpl.account)}</td><td><span class="pill ${pillClass}">${tpl.sev}</span></td></tr>`;
  const log = $('#event-rows');
  if (log) log.insertAdjacentHTML('afterbegin', row);
  const recent = $('[data-view-panel="overview"] .events tbody');
  if (recent) {
    recent.insertAdjacentHTML('afterbegin', row);
    const rows = $$('tr', recent);
    if (rows.length > 5) rows[rows.length - 1].remove();
  }
  applySevFilter();
  recountEvents();
}

function initLive() {
  const btn = $('#live');
  if (!btn) return;
  btn.addEventListener('click', () => {
    state.live = !state.live;
    btn.classList.toggle('is-on', state.live);
    btn.setAttribute('aria-pressed', String(state.live));
    btn.querySelector('span').textContent = state.live ? 'Live on' : 'Live off';
    if (state.live) refresh();
  });
  setInterval(() => {
    if (document.hidden) return;
    state.sinceRefresh += 1;
    state.clock += 1;
    if (state.live && state.sinceRefresh >= 5) refresh();
    else renderUpdated();
  }, 1000);
}

/* ---------- customers ---------- */

const HEALTH = {
  healthy: {
    label: 'Healthy',
    usage: 0.82,
    summary: (c) => `${c.contact}'s team logs in most working days and uses reports and alerts weekly. Renewal in 41 days, nothing to do here.`,
    primary: 'Send NPS survey',
    done: (c) => `NPS survey sent to ${c.contact} at ${c.name}.`,
  },
  risk: {
    label: 'At risk',
    usage: 0.45,
    summary: (c) => `Logins are down 40% month over month and ${Math.round(c.seats * 0.3)} seats have not been used in 30 days. Renewal in 18 days - worth a call to ${c.contact} before then.`,
    primary: 'Send renewal reminder',
    done: (c) => `Renewal reminder sent to ${c.contact}. Follow-up task created for Sep 5.`,
  },
  dormant: {
    label: 'Dormant',
    usage: 0,
    summary: (c) => `No logins in over a week and the card on file expires next month. ${c.contact} never finished the onboarding checklist.`,
    primary: 'Send re-engagement email',
    done: (c) => `Re-engagement email sent to ${c.contact} with a free 30-day extension.`,
  },
  new: {
    label: 'New',
    usage: 0.25,
    summary: (c) => `${c.contact} signed up from the pricing page a few minutes ago. Onboarding checklist is 2 of 6 done; a welcome call usually doubles first-month retention.`,
    primary: 'Schedule onboarding call',
    done: (c) => `Onboarding call booked with ${c.contact}: tomorrow at 10:00.`,
  },
};

const PLAN_LABEL = { scale: 'Scale', growth: 'Growth', starter: 'Starter' };

function filterCustomers() {
  const q = ($('#cust-search')?.value || '').trim().toLowerCase();
  const plan = $('#cust-plan')?.value || 'all';
  const health = $('#cust-health')?.value || 'all';
  const rows = $$('#cust-rows tr');
  let shown = 0;
  rows.forEach((tr) => {
    const hay = `${tr.querySelector('.row-btn').textContent} ${tr.dataset.contact}`.toLowerCase();
    const match = (!q || hay.includes(q)) && (plan === 'all' || tr.dataset.plan === plan) && (health === 'all' || tr.dataset.health === health);
    tr.hidden = !match;
    if (match) shown += 1;
  });
  const filtering = q || plan !== 'all' || health !== 'all';
  $('#cust-count').textContent = filtering ? `${shown} of ${rows.length} loaded match · 278 total` : `${rows.length} of 278 customers loaded`;
  $('#cust-empty').hidden = shown > 0;
}

function sortCustomers(key, btn) {
  const th = btn.closest('th');
  const wasDesc = btn.classList.contains('is-desc');
  const wasAsc = btn.classList.contains('is-asc');
  // First click: numbers descending, "last active" ascending (most recent first).
  let dir = key === 'active' ? 'asc' : 'desc';
  if (wasDesc) dir = 'asc';
  else if (wasAsc) dir = 'desc';
  $$('#cust-table .sort').forEach((b) => {
    b.classList.remove('is-asc', 'is-desc');
    b.closest('th').setAttribute('aria-sort', 'none');
  });
  btn.classList.add(dir === 'asc' ? 'is-asc' : 'is-desc');
  th.setAttribute('aria-sort', dir === 'asc' ? 'ascending' : 'descending');
  const body = $('#cust-rows');
  const rows = $$('tr', body).sort((a, b) => {
    const diff = Number(a.dataset[key]) - Number(b.dataset[key]);
    return dir === 'asc' ? diff : -diff;
  });
  rows.forEach((r) => body.appendChild(r));
}

function openCustomer(tr) {
  const c = {
    name: tr.querySelector('.row-btn').textContent.trim(),
    contact: tr.dataset.contact,
    plan: tr.dataset.plan,
    health: tr.dataset.health,
    seats: Number(tr.dataset.seats),
    mrr: Number(tr.dataset.mrr),
  };
  const h = HEALTH[c.health] || HEALTH.healthy;
  $('#drawer-kicker').textContent = 'Customer';
  $('#drawer-title').textContent = c.name;
  $('#c-contact').textContent = c.contact;
  $('#c-plan').textContent = `${PLAN_LABEL[c.plan] || c.plan} plan`;
  $('#c-seats').textContent = String(c.seats);
  $('#c-mrr').textContent = `${fmtMoney(c.mrr)} / mo`;
  const hp = $('#c-health');
  hp.className = `health ${c.health}`;
  hp.textContent = h.label;
  $('#c-arr').textContent = fmtMoney(c.mrr * 12);
  $('#c-summary').textContent = h.summary(c);
  const active = Math.round(c.seats * h.usage);
  $('#c-usage').textContent = `${active}/${c.seats}`;
  $('#c-usage-fill').style.transform = `scaleX(${h.usage})`;
  const primary = $('#c-primary');
  primary.textContent = h.primary;
  primary.disabled = false;
  primary.classList.remove('is-done');
  primary.dataset.customer = c.name;
  primary.dataset.done = h.done(c);
  $('#c-secondary').dataset.customer = c.name;
  openDrawer('customer', tr.querySelector('.row-btn'));
}

function initCustomers() {
  $('#cust-search')?.addEventListener('input', filterCustomers);
  $('#cust-plan')?.addEventListener('change', filterCustomers);
  $('#cust-health')?.addEventListener('change', filterCustomers);
  $$('#cust-table .sort').forEach((b) => b.addEventListener('click', () => sortCustomers(b.dataset.sort, b)));
  $('#c-primary')?.addEventListener('click', (e) => {
    const b = e.currentTarget;
    toast(b.dataset.done);
    b.textContent = 'Sent ✓';
    b.disabled = true;
    b.classList.add('is-done');
  });
  $('#c-secondary')?.addEventListener('click', (e) => {
    toast(`Opening ${e.currentTarget.dataset.customer} in HubSpot… (demo - no CRM connected)`);
  });
}

/* ---------- revenue ---------- */

function forecast() {
  const slider = $('#fc-churn');
  if (!slider) return;
  const churn = Number(slider.value);
  const months = state.horizon;
  const net = BASE_GROWTH - (churn - BASE_CHURN) * CHURN_COST;
  const baseNet = BASE_GROWTH;
  const mrr = BASE_MRR * Math.pow(1 + net / 100, months);
  const baseline = BASE_MRR * Math.pow(1 + baseNet / 100, months);
  const diff = mrr - baseline;
  $('#fc-churn-out').textContent = `${churn.toFixed(1)}%`;
  const out = $('#fc-mrr');
  out.textContent = fmtMoney(Math.round(mrr / 10) * 10);
  out.classList.toggle('is-up', diff > 50);
  out.classList.toggle('is-down', diff < -50);
  $('#fc-arr').textContent = `$${Math.round((mrr * 12) / 1000)}k`;
  $('#fc-rate').textContent = `${net.toFixed(1)}%`;
  let tail;
  if (Math.abs(diff) < 50) tail = `That matches today's trajectory.`;
  else if (diff > 0) tail = `Over ${months} months that is ${fmtMoney(Math.round(diff / 10) * 10)} more MRR than today's 1.8%.`;
  else tail = `Over ${months} months that is ${fmtMoney(Math.round(-diff / 10) * 10)} less MRR than today's 1.8%.`;
  $('#fc-note').textContent = `Each 1 pt of churn costs about ${CHURN_COST} pts of net growth at your current mix. ${tail}`;
}

function initRevenue() {
  $('#fc-churn')?.addEventListener('input', forecast);
  $$('[data-horizon]').forEach((b) =>
    b.addEventListener('click', () => {
      state.horizon = Number(b.dataset.horizon);
      $$('[data-horizon]').forEach((o) => {
        o.classList.toggle('is-active', o === b);
        o.setAttribute('aria-pressed', String(o === b));
      });
      forecast();
    }),
  );
  $$('[data-winback]').forEach((b) =>
    b.addEventListener('click', () => {
      b.textContent = 'Offer sent';
      b.disabled = true;
      b.classList.add('is-done');
      toast(`Win-back offer emailed to ${b.dataset.winback}: 20% off for 3 months if they return before Oct 1.`);
    }),
  );
  forecast();
}

/* ---------- events ---------- */

const EVENTS = {
  ev1: {
    kicker: 'Billing',
    summary: 'Lumen Labs moved from Starter to Growth. A prorated charge of $412.50 succeeded on the card ending 4242; 22 seats are now licensed.',
    payload: { from: 'starter', to: 'growth', seats: 22, proration: 412.5, card: '4242', status: 'succeeded' },
  },
  ev2: {
    kicker: 'Integrations',
    summary: 'All three deliveries to hooks.orbitretail.com timed out. The endpoint stopped responding at 09:12 and nothing has been delivered since.',
    payload: { endpoint: 'https://hooks.orbitretail.com/pulse', attempts: 3, last_error: 'timeout (10000 ms)', events_queued: 41 },
    action: 'retry',
  },
  ev3: {
    kicker: 'Onboarding',
    summary: 'Ana Ribeiro created the "Kite Studio" workspace on the Starter plan with a 14-day trial. Two teammates were invited.',
    payload: { workspace: 'kite-studio', plan: 'starter', trial_days: 14, invited: ['ana@kitestudio.pt', 'rui@kitestudio.pt'] },
  },
  ev4: {
    kicker: 'Exports',
    summary: 'A CSV export of 14,203 customer rows finished in 11.8 s and was emailed to ops@acmerobotics.com.',
    payload: { rows: 14203, format: 'csv', duration_ms: 11840, delivered_to: 'ops@acmerobotics.com' },
  },
  ev5: {
    kicker: 'Billing',
    summary: 'The $948 September invoice for Northwind was declined (insufficient funds). Pulse will retry in 3 days and email Tom Okafor now.',
    payload: { invoice: 'INV-2270', amount: 948, decline_code: 'insufficient_funds', retry_at: '2026-09-05T09:10:00Z', dunning_step: 1 },
    action: 'charge',
  },
  ev6: {
    kicker: 'API',
    summary: 'Bramble & Co hit the 1,000 requests/minute ceiling for four consecutive minutes. 2,140 requests were rejected with 429.',
    payload: { limit: 1000, window: '1m', rejected: 2140, top_endpoint: '/v1/reports/run', api_key: 'pk_live_…9f2c' },
    action: 'limit',
  },
  ev7: {
    kicker: 'Billing',
    summary: 'Dev Malhotra added three Growth seats for the Tidewater dispatch team. Proration of $158 goes on the next invoice.',
    payload: { seats_before: 16, seats_after: 19, plan: 'growth', proration: 158 },
  },
  ev8: {
    kicker: 'Alerts',
    summary: 'Rolling average response time stayed above 250 ms for 6 minutes (peak 291 ms). The alert went to #pulse-alerts and two on-call emails.',
    payload: { rule: 'response_p50 > 250ms for 5m', peak_ms: 291, duration_min: 6, notified: ['#pulse-alerts', 'oncall@acmerobotics.com'] },
  },
  ev9: {
    kicker: 'Reports',
    summary: 'Dr. Lena Park scheduled the weekly patient-volume report for Mondays at 07:00 Europe/Lisbon.',
    payload: { report: 'weekly-volume', cron: '0 7 * * 1', timezone: 'Europe/Lisbon', recipients: 2 },
  },
  ev10: {
    kicker: 'Security',
    summary: 'Ana Ribeiro signed in from a new iPhone in Lisbon. The device was verified by email code within 90 seconds.',
    payload: { user: 'ana@kitestudio.pt', device: 'iPhone · Safari', city: 'Lisbon', country: 'PT', verified: true },
  },
  ev11: {
    kicker: 'Billing',
    summary: 'Invoice INV-2264 for Sundial Media was paid in full by SEPA transfer.',
    payload: { invoice: 'INV-2264', amount: 1185, currency: 'USD', method: 'sepa', status: 'paid' },
  },
  ev12: {
    kicker: 'Integrations',
    summary: 'hooks.orbitretail.com answered 500 Internal Server Error. Pulse kept the event and scheduled retries; see the later retry warning.',
    payload: { endpoint: 'https://hooks.orbitretail.com/pulse', status: 500, body: '{"error":"db connection refused"}', retries_scheduled: 3 },
    action: 'retry',
  },
};

const ACTIONS = {
  retry: { label: 'Retry delivery', done: 'Delivery retried: 200 OK in 184 ms. Queued events are flowing again.', resolves: true },
  charge: { label: 'Retry charge now', done: 'Charge retried: $948.00 succeeded on the card ending 3310.', resolves: true },
  limit: { label: 'Raise limit to 2,000/min', done: 'Rate limit for Bramble & Co raised to 2,000 requests/min for 24 hours.', resolves: true },
};

function rowsFor(id) {
  return $$(`tr[data-ev="${id}"]`);
}

function setEventSev(id, sev) {
  rowsFor(id).forEach((tr) => {
    tr.dataset.sev = sev;
    const pill = tr.querySelector('.pill');
    if (tr.dataset.acked !== 'true') {
      pill.className = `pill ${sev === 'error' ? 'err' : sev}`;
      pill.textContent = sev;
    }
  });
}

function ackEvent(id) {
  rowsFor(id).forEach((tr) => {
    tr.dataset.acked = 'true';
    const pill = tr.querySelector('.pill');
    pill.className = 'pill acked';
    pill.textContent = 'acked';
  });
}

function recountEvents() {
  const rows = $$('#event-rows tr');
  const count = (sev) => rows.filter((r) => r.dataset.sev === sev).length;
  const setChip = (sev, n) => {
    const i = $(`[data-sev-filter="${sev}"] i`);
    if (i) i.textContent = String(n);
  };
  setChip('all', rows.length);
  setChip('ok', count('ok'));
  setChip('warn', count('warn'));
  setChip('error', count('error'));
  const total = $('#ev-total');
  if (total) total.textContent = String(rows.length);
  const unread = rows.filter((r) => (r.dataset.sev === 'warn' || r.dataset.sev === 'error') && r.dataset.acked !== 'true').length;
  const badge = $('#unread-badge');
  if (badge) {
    badge.textContent = String(unread);
    badge.classList.toggle('is-zero', unread === 0);
  }
  const ackAll = $('#ack-all');
  if (ackAll) {
    const openWarn = rows.filter((r) => r.dataset.sev === 'warn' && r.dataset.acked !== 'true').length;
    ackAll.disabled = openWarn === 0;
    ackAll.textContent = openWarn === 0 ? 'All warnings acknowledged' : `Acknowledge all warnings (${openWarn})`;
  }
}

function applySevFilter() {
  const active = $('[data-sev-filter].is-active')?.dataset.sevFilter || 'all';
  const rows = $$('#event-rows tr');
  let shown = 0;
  rows.forEach((tr) => {
    const match = active === 'all' || tr.dataset.sev === active;
    tr.hidden = !match;
    if (match) shown += 1;
  });
  $('#ev-empty').hidden = shown > 0;
}

function openEvent(tr) {
  const id = tr.dataset.ev;
  const meta = EVENTS[id] || { kicker: 'Event', summary: '', payload: {} };
  const title = tr.querySelector('.row-btn').textContent.trim();
  const sev = tr.dataset.sev;
  $('#drawer-kicker').textContent = meta.kicker;
  $('#drawer-title').textContent = title;
  $('#d-account').textContent = tr.children[2].textContent.trim();
  $('#d-time').textContent = `today ${tr.children[0].textContent.trim()}`;
  $('#d-id').textContent = `evt_${id.replace('ev', '').padStart(4, '0')}a7`;
  $('#d-summary').textContent = meta.summary;
  $('#d-payload').textContent = JSON.stringify(meta.payload, null, 2);
  const acked = tr.dataset.acked === 'true';
  const pill = $('#d-pill');
  pill.className = acked ? 'pill acked' : `pill ${sev === 'error' ? 'err' : sev}`;
  pill.textContent = acked ? 'acked' : sev;
  const ack = $('#d-ack');
  ack.dataset.ev = id;
  ack.hidden = sev === 'ok';
  ack.disabled = acked;
  ack.classList.toggle('is-done', acked);
  ack.textContent = acked ? 'Acknowledged ✓' : 'Acknowledge';
  const action = $('#d-action');
  const a = meta.action && ACTIONS[meta.action];
  action.hidden = !a || sev === 'ok';
  action.disabled = false;
  action.classList.remove('is-done');
  if (a) {
    action.textContent = a.label;
    action.dataset.ev = id;
    action.dataset.action = meta.action;
  }
  state.drawer.id = id;
  openDrawer('event', tr.querySelector('.row-btn'));
}

function initEvents() {
  $$('[data-sev-filter]').forEach((chip) =>
    chip.addEventListener('click', () => {
      $$('[data-sev-filter]').forEach((c) => {
        c.classList.toggle('is-active', c === chip);
        c.setAttribute('aria-pressed', String(c === chip));
      });
      applySevFilter();
    }),
  );
  $('#ack-all')?.addEventListener('click', () => {
    const open = $$('#event-rows tr').filter((r) => r.dataset.sev === 'warn' && r.dataset.acked !== 'true');
    open.forEach((r) => ackEvent(r.dataset.ev));
    recountEvents();
    toast(`${open.length} warning${open.length === 1 ? '' : 's'} acknowledged. Errors still need a look.`);
  });
  $('#d-ack')?.addEventListener('click', (e) => {
    const b = e.currentTarget;
    ackEvent(b.dataset.ev);
    recountEvents();
    const pill = $('#d-pill');
    pill.className = 'pill acked';
    pill.textContent = 'acked';
    b.disabled = true;
    b.classList.add('is-done');
    b.textContent = 'Acknowledged ✓';
  });
  $('#d-action')?.addEventListener('click', (e) => {
    const b = e.currentTarget;
    const a = ACTIONS[b.dataset.action];
    if (!a) return;
    b.disabled = true;
    b.classList.add('is-done');
    b.textContent = 'Done ✓';
    if (a.resolves) {
      setEventSev(b.dataset.ev, 'ok');
      const pill = $('#d-pill');
      if (!pill.classList.contains('acked')) {
        pill.className = 'pill ok';
        pill.textContent = 'ok';
      }
      $('#d-ack').hidden = true;
      applySevFilter();
      recountEvents();
    }
    toast(a.done);
  });
  // Row buttons in every table (including rows added by live refresh).
  document.addEventListener('click', (e) => {
    const btn = e.target.closest('.row-btn');
    if (!btn) return;
    const tr = btn.closest('tr');
    if (!tr) return;
    if (tr.dataset.ev) openEvent(tr);
    else if (tr.dataset.cust) openCustomer(tr);
  });
  recountEvents();
}

/* ---------- drawer ---------- */

let drawerTimer = 0;
function openDrawer(mode, returnFocus) {
  const drawer = $('#drawer');
  const scrim = $('#scrim');
  if (!drawer) return;
  clearTimeout(drawerTimer);
  $('.drawer-body').dataset.drawerMode = mode;
  state.drawer.mode = mode;
  state.drawer.returnFocus = returnFocus || null;
  drawer.hidden = false;
  if (scrim) scrim.hidden = false;
  $('.drawer-body').scrollTop = 0;
  // Two frames so the transition starts from the hidden (off-screen) state.
  requestAnimationFrame(() =>
    requestAnimationFrame(() => {
      drawer.classList.add('is-open');
      scrim?.classList.add('is-open');
    }),
  );
  $('#drawer-close').focus({ preventScroll: true });
}

function closeDrawer() {
  const drawer = $('#drawer');
  const scrim = $('#scrim');
  if (!drawer || drawer.hidden) return;
  drawer.classList.remove('is-open');
  scrim?.classList.remove('is-open');
  clearTimeout(drawerTimer);
  drawerTimer = setTimeout(() => {
    drawer.hidden = true;
    if (scrim) scrim.hidden = true;
  }, 300);
  const rf = state.drawer.returnFocus;
  state.drawer.mode = null;
  state.drawer.returnFocus = null;
  if (rf && rf.isConnected) rf.focus({ preventScroll: true });
}

function initDrawer() {
  $('#drawer-close')?.addEventListener('click', closeDrawer);
  $('#scrim')?.addEventListener('click', closeDrawer);
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeDrawer();
  });
}

/* ---------- settings ---------- */

function readSettings() {
  return {
    threshold: $('#set-threshold').value,
    anomaly: $('[name="anomaly"]').getAttribute('aria-checked'),
    slack: $('[name="slack"]').getAttribute('aria-checked'),
    digest: $('[name="digest"]').getAttribute('aria-checked'),
    day: $('#set-day').value,
    tz: $('#set-tz').value,
  };
}

function writeSettings(s) {
  $('#set-threshold').value = s.threshold;
  $('[name="anomaly"]').setAttribute('aria-checked', s.anomaly);
  $('[name="slack"]').setAttribute('aria-checked', s.slack);
  $('[name="digest"]').setAttribute('aria-checked', s.digest);
  $('#set-day').value = s.day;
  $('#set-tz').value = s.tz;
}

let savedSettings = null;

function checkDirty() {
  const now = readSettings();
  const dirty = Object.keys(now).some((k) => now[k] !== savedSettings[k]);
  $('#savebar').hidden = !dirty;
}

function applyThreshold() {
  const flag = $('#resp-flag');
  if (!flag) return;
  const over = state.values.response > state.threshold;
  flag.classList.toggle('is-on', over);
  flag.textContent = `above ${state.threshold} ms`;
}

function initSettings() {
  const form = $('#settings-form');
  if (!form) return;
  savedSettings = readSettings();
  form.addEventListener('submit', (e) => e.preventDefault());
  $$('.switch', form).forEach((sw) =>
    sw.addEventListener('click', () => {
      sw.setAttribute('aria-checked', sw.getAttribute('aria-checked') === 'true' ? 'false' : 'true');
      checkDirty();
    }),
  );
  form.addEventListener('input', checkDirty);
  form.addEventListener('change', checkDirty);
  $('#settings-save')?.addEventListener('click', () => {
    const s = readSettings();
    const t = Number(s.threshold);
    if (!Number.isFinite(t) || t < 50 || t > 2000) {
      toast('Response-time alert must be between 50 and 2000 ms.');
      $('#set-threshold').focus();
      return;
    }
    savedSettings = s;
    state.threshold = t;
    applyThreshold();
    $('#savebar').hidden = true;
    const bits = [`alert above ${t} ms`];
    bits.push(s.digest === 'true' ? `digest every ${s.day}` : 'digest off');
    if (s.slack === 'true') bits.push('Slack on');
    toast(`Settings saved: ${bits.join(', ')}.`);
  });
  $('#settings-discard')?.addEventListener('click', () => {
    writeSettings(savedSettings);
    $('#savebar').hidden = true;
    toast('Changes discarded.');
  });
  $('#export-all')?.addEventListener('click', (e) => {
    const b = e.currentTarget;
    b.disabled = true;
    b.textContent = 'Preparing export…';
    setTimeout(() => {
      b.disabled = false;
      b.textContent = 'Export again';
      toast('Export ready: 278 customers, 12 events tables, 3 revenue sheets. Link emailed to ops@acmerobotics.com.');
    }, 1800);
  });
  applyThreshold();
}

/* ---------- boot ---------- */

function init() {
  initViews();
  initChart();
  initLive();
  initCustomers();
  initRevenue();
  initEvents();
  initDrawer();
  initSettings();
  renderUpdated();
}

if (document.readyState !== 'loading') init();
else document.addEventListener('DOMContentLoaded', init);
