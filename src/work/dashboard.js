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
  growth: ['Growth', 'Funnel and retention · last 30 days'],
  alerts: ['Alerts', '3 rules · status.pulse.app'],
  team: ['Team', '11 members · Growth plan'],
  integrations: ['Integrations', '1 of 4 connected'],
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
  renderAnnotations();
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
  const note = annoAt(idx, n);
  if (note) $('#tip-date').textContent += ` · ${note}`;
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
  syncLatency();
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
    const who = e.currentTarget.dataset.customer;
    toast(state.crm ? `Opened ${who} in HubSpot: contact, open deals and health score are in sync.` : `Opening ${who} in HubSpot… (connect HubSpot in Integrations to sync deals)`);
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
  // Escape closes the topmost overlay: status preview, then the note
  // form on the chart, then the drawer.
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeTopmost();
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

/* ======================================================================
   Added product flows. Same contract as above: JS toggles classes /
   attributes / text and builds strings; CSS owns every transition.
     - Ask Pulse (keyword-routed plain-English answers with a mini chart)
     - Chart annotations (click a point -> note -> marker + list)
     - Growth view: conversion funnel with blockers, cohort retention grid
     - Alerts view: rules list + builder, public status page (staff side)
       and the customer-facing preview modal
     - Team view: invites, roles, remove-with-confirm, plan & seat meter
       with overage and upgrade
     - Integrations: connect toggles that change Events, Alerts and the
       customer drawer
   ====================================================================== */

/* ---------- shared: events log + overlay stack ---------- */

// Appends an event to both event tables (same row shape as live events)
// so actions taken elsewhere on the page show up in the log.
function addEvent({ title, account, sev = 'ok', kicker = 'Event', summary = '', payload = {}, action = null }) {
  const id = `ev${state.nextEventId++}`;
  EVENTS[id] = { kicker, summary, payload, action };
  const pillClass = sev === 'error' ? 'err' : sev;
  const row = `<tr data-ev="${id}" data-sev="${sev}" class="is-new"><td class="mono">${clockLabel()}</td><td><button type="button" class="row-btn">${escapeHtml(title)}</button></td><td>${escapeHtml(account)}</td><td><span class="pill ${pillClass}">${sev}</span></td></tr>`;
  $('#event-rows')?.insertAdjacentHTML('afterbegin', row);
  const recent = $('[data-view-panel="overview"] .events tbody');
  if (recent) {
    recent.insertAdjacentHTML('afterbegin', row);
    const rows = $$('tr', recent);
    if (rows.length > 5) rows[rows.length - 1].remove();
  }
  applySevFilter();
  recountEvents();
  return id;
}

const hhmm = () => clockLabel().slice(0, 5);

function closeTopmost() {
  if (closeStatusModal()) return;
  if (closeAnnoForm()) return;
  closeDrawer();
}

// Keeps every "now 212 ms" style readout in step with the KPI tiles.
function syncLatency() {
  const v = state.values;
  $$('[data-rule-now="response"]').forEach((el) => (el.textContent = `now ${Math.round(v.response)} ms`));
  $$('[data-rule-now="active"]').forEach((el) => (el.textContent = `now ${fmtInt(v.active)}`));
  $$('[data-rule-now="churn"]').forEach((el) => (el.textContent = `now ${v.churn.toFixed(1)}%`));
  const c = $('#comp-latency');
  if (c) c.textContent = `${Math.round(v.response)} ms avg`;
  const s = $('#sp-latency');
  if (s) s.textContent = `${Math.round(v.response)} ms avg · 24 h`;
}

/* ---------- ask pulse ---------- */

const fmtPct1 = (v) => `${v.toFixed(1)}%`;
const fmtKs = (v) => `$${fmtK(v)}`;

function vizBars(items, hot, fmt, label) {
  const w = 280;
  const h = 76;
  const top = 14;
  const bottom = 12;
  const gap = 6;
  const bw = (w - gap * (items.length - 1)) / items.length;
  const max = Math.max(...items.map((it) => it[1])) || 1;
  const usable = h - top - bottom;
  const bars = items
    .map(([name, v], i) => {
      const bh = Math.max(2, (v / max) * usable);
      const x = i * (bw + gap);
      const y = top + usable - bh;
      const cx = (x + bw / 2).toFixed(1);
      return `<rect${i === hot ? ' class="hot"' : ''} x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${bw.toFixed(1)}" height="${bh.toFixed(1)}" rx="2" /><text class="v" x="${cx}" y="${(y - 3).toFixed(1)}" text-anchor="middle">${escapeHtml(fmt(v))}</text><text x="${cx}" y="${h - 2}" text-anchor="middle">${escapeHtml(name)}</text>`;
    })
    .join('');
  const desc = items.map(([name, v]) => `${name} ${fmt(v)}`).join(', ');
  return `<svg viewBox="0 0 ${w} ${h}" role="img" aria-label="${escapeHtml(label)}: ${escapeHtml(desc)}">${bars}</svg>`;
}

// Each answer is keyword-routed; the numbers are the ones already on the
// page (KPIs, revenue, funnel, team) so the assistant never contradicts it.
const ASK = [
  {
    keys: ['churn', 'cancel', 'leav', 'lost', 'left'],
    num: () => `${state.values.churn.toFixed(1)}%`,
    label: 'churn · ▼ 0.3 pts vs August',
    viz: () => vizBars([['Apr', 2.4], ['May', 2.3], ['Jun', 2.2], ['Jul', 2.1], ['Aug', 2.1], ['Sep', 1.8]], 5, fmtPct1, 'Monthly churn'),
    text: '5 accounts churned this month ($1,433 MRR) against 8 in August. The whole drop is on the Growth plan: 3 Growth accounts left instead of 6, and the two that gave a reason cited cost or in-house tooling, not the product.\nThe likeliest cause is onboarding checklist v2 (Aug 14): week-1 retention for new cohorts rose from 71% to 80%. Starter churn is flat at 2 accounts a month.',
    follow: ['Which customers are at risk?', 'Where will MRR be in 3 months?', 'Show me the retention cohorts|growth'],
  },
  {
    keys: ['risk', 'at-risk', 'unhappy', 'worried', 'renew'],
    num: () => '$4,068',
    label: 'MRR at risk · 2 accounts · 8.4% of MRR',
    viz: () => vizBars([['Orbit Retail', 3120], ['Northwind', 948]], 0, fmtKs, 'MRR at risk by account'),
    text: 'Orbit Retail ($3,120, Scale): logins are down 40% month over month, 14 of 48 seats have not been used in 30 days and renewal is in 18 days. Marcus Bell has not opened the last two digests.\nNorthwind ($948, Growth): the September invoice was declined today (insufficient funds). A retry is scheduled for Sep 5 and Tom Okafor has been emailed.',
    follow: ['Open Orbit Retail|customers', 'Why did churn drop this month?', 'Who are our biggest customers?'],
  },
  {
    keys: ['mrr', 'revenue', 'forecast', 'month', 'arr', 'grow', 'project'],
    num: () => '$58,070',
    label: 'projected MRR in 3 months · 6.4% net growth',
    viz: () => vizBars([['now', 48210], ['Oct', 51300], ['Nov', 54580], ['Dec', 58070]], 3, fmtKs, 'MRR projection'),
    text: "At today's 1.8% churn and 6.4% net monthly growth, MRR reaches $58,070 in December, $69,950 by March and $101,490 in a year (a $1.22M ARR run-rate).\nEach point of churn costs about 1.75 points of growth: at 2.5% churn the 3-month figure is $56,090 instead. The what-if slider in Revenue lets you try other numbers.",
    follow: ['Try the what-if forecast|revenue', 'Why did churn drop this month?', 'Which customers are at risk?'],
  },
  {
    keys: ['biggest', 'largest', 'top customer', 'best customer', 'by plan', 'scale', 'whale'],
    num: () => '$21,410',
    label: 'from 12 Scale accounts · 44% of MRR',
    viz: () => vizBars([['Scale', 21410], ['Growth', 18600], ['Starter', 8200]], 0, fmtKs, 'MRR by plan'),
    text: "Orbit Retail ($3,120), Bramble & Co ($2,275), Atlas Legal ($1,755) and Lumen Labs ($1,738) are the four largest accounts loaded on this page; together they are 18% of MRR.\n12 Scale customers bring 44% of revenue and the other 266 accounts share the remaining $26,800 - so Orbit Retail's at-risk status matters more than one account in 278 suggests.",
    follow: ['Which customers are at risk?', 'Open the customer list|customers', 'Where will MRR be in 3 months?'],
  },
  {
    keys: ['response', 'latency', 'slow', ' ms', 'api', 'speed', 'fast'],
    num: () => `${Math.round(state.values.response)} ms`,
    label: () => `avg. API response · ▲ 18 ms vs last period · alert at ${state.threshold} ms`,
    viz: () => vizBars([['reports', 341], ['events', 188], ['customers', 142], ['exports', 96]], 0, (v) => `${v} ms`, 'Response time by endpoint'),
    text: 'The increase is almost entirely /v1/reports/run, which averaged 341 ms today. The rolling average peaked at 291 ms at 08:31 and fired the 250 ms rule once; a second bump came at 08:57 when Bramble & Co pushed 2,140 requests over its rate limit.\nEvery other endpoint is within 5 ms of last week.',
    follow: ['See the alert rules|alerts', 'How many active users do we have?', 'Which customers are at risk?'],
  },
  {
    keys: ['active', 'users', 'usage', 'engag', 'daily', 'dau', 'feature', 'using'],
    num: () => fmtInt(state.values.active),
    label: 'daily active users · ▲ 3.1% vs last period',
    viz: () => vizBars([['Reports', 8100], ['Alerts', 6200], ['Exports', 4700], ['API', 3300], ['Webhooks', 1900]], 0, fmtK, 'Users by feature'),
    text: 'Reports is the most-used feature (8,100 users today) and Alerts is growing fastest, up 22% since the rules builder shipped.\nWebhooks are used by 1,900 accounts, mostly on Scale - that is the group affected by this morning\'s delivery delays, which is why the incident is on the public status page.',
    follow: ['Why is the API slower?', 'Who are our biggest customers?', 'How is the signup funnel doing?'],
  },
  {
    keys: ['signup', 'sign up', 'sign-up', 'funnel', 'conver', 'trial', 'visit', 'activat'],
    num: () => '4.2%',
    label: 'visitor → signup · 412 signups in 30 days',
    viz: () => vizBars([['Visited', 9860], ['Signed up', 412], ['Activated', 186], ['Paid', 19]], 3, fmtInt, 'Conversion funnel'),
    text: '9,860 visitors, 412 signups (4.2%), 186 activated (45.1%) and 19 paid (10.2%) - $3,120 of new MRR. The biggest leak is activation: 226 signups never connected a data source, and 140 of them last saw an empty dashboard.\nThe Growth view lists the top blocker at each stage with a one-click task.',
    follow: ['Open the funnel|growth', 'Why did churn drop this month?', 'Where will MRR be in 3 months?'],
  },
  {
    keys: ['seat', 'bill', 'invoice', 'plan', 'upgrade', 'cost', 'pay', 'price'],
    num: () => `${$$('#team-rows tr').length} / ${PLANS[billing.plan].seats}`,
    label: () => `seats used · ${PLANS[billing.plan].name} plan · ${fmtMoney(billing.bill)} / mo`,
    viz: () => {
      const used = $$('#team-rows tr').length;
      const cap = PLANS[billing.plan].seats;
      return vizBars([['Used', used], ['Free', Math.max(0, cap - used)]], 0, fmtInt, 'Seats');
    },
    text: () =>
      billing.plan === 'scale'
        ? `Acme Robotics is on Scale: 25 seats at $65, $1,625 a month, next invoice Oct 2. ${$$('#team-rows tr').length} seats are in use, so there is room for the Q4 hires without touching the plan.`
        : `Acme Robotics has ${$$('#team-rows tr').length} of 14 Growth seats filled ($79 each, $1,106 a month, next invoice Oct 2). At the current hiring pace of 2 seats a month you run out in November.\nScale is 25 seats at $65 - $1,625 a month - and is cheaper than Growth once you pass 20 seats.`,
    follow: ['Open Team & billing|team', 'Who are our biggest customers?', 'Where will MRR be in 3 months?'],
  },
];

const ASK_DEFAULT = {
  text: 'I can answer questions about churn, MRR and forecasts, active users, API response time, at-risk or biggest customers, the signup funnel, and your plan and seats. Try one of these:',
  follow: ['Why did churn drop this month?', 'Which customers are at risk?', 'Why is the API slower?'],
};

function routeAsk(q) {
  const s = ` ${q.toLowerCase()} `;
  let best = null;
  let bestScore = 0;
  ASK.forEach((a) => {
    const score = a.keys.reduce((n, k) => n + (s.includes(k) ? 1 : 0), 0);
    if (score > bestScore) {
      best = a;
      bestScore = score;
    }
  });
  return best;
}

const val = (v) => (typeof v === 'function' ? v() : v);

let askTimer = 0;
function ask(question) {
  const panel = $('#ask');
  const q = question.trim();
  if (!panel || !q) {
    $('#ask-input')?.focus();
    return;
  }
  $('#ask-input').value = q;
  panel.classList.add('is-thinking');
  $('#ask-thinking').setAttribute('aria-hidden', 'false');
  clearTimeout(askTimer);
  askTimer = setTimeout(() => {
    const a = routeAsk(q);
    $('#ask-q').textContent = q;
    const stat = $('#ask-stat');
    const viz = $('#ask-viz');
    if (a) {
      stat.hidden = false;
      $('#ask-num').textContent = val(a.num);
      $('#ask-label').textContent = val(a.label);
      viz.innerHTML = val(a.viz);
      viz.hidden = false;
      $('#ask-text').textContent = val(a.text);
    } else {
      stat.hidden = true;
      viz.hidden = true;
      $('#ask-text').textContent = ASK_DEFAULT.text;
    }
    $('#ask-follow').innerHTML = (a || ASK_DEFAULT).follow
      .map((f) => {
        const [label, view] = f.split('|');
        return view
          ? `<button type="button" class="chip go" data-ask-goto="${view}">${escapeHtml(label)} →</button>`
          : `<button type="button" class="chip" data-ask="${escapeHtml(label)}">${escapeHtml(label)}</button>`;
      })
      .join('');
    panel.classList.remove('is-thinking');
    $('#ask-thinking').setAttribute('aria-hidden', 'true');
    $('#ask-answer').hidden = false;
  }, 650);
}

function initAsk() {
  const form = $('#ask-form');
  if (!form) return;
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    ask($('#ask-input').value);
  });
  $('#ask').addEventListener('click', (e) => {
    const chip = e.target.closest('[data-ask], [data-ask-goto]');
    if (!chip) return;
    if (chip.dataset.askGoto) {
      switchView(chip.dataset.askGoto);
      const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
      window.scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' });
    } else ask(chip.dataset.ask);
  });
}

/* ---------- chart annotations ---------- */

// days = days before TODAY, so a note stays on the same date whichever
// range or metric is shown.
const annos = [
  { id: 1, days: 19, text: 'Onboarding checklist v2 rolled out' },
  { id: 2, days: 7, text: 'Pricing page redesign shipped' },
];
let annoSeq = 3;
let annoDays = -1;

function annoLabel(days) {
  if (days === 0) return 'today';
  const d = new Date(TODAY);
  d.setDate(d.getDate() - days);
  return `${MONTHS[d.getMonth()]} ${d.getDate()}`;
}

function annoAt(idx, n) {
  const days = n - 1 - idx;
  return annos.find((a) => a.days === days)?.text || '';
}

function renderAnnotations() {
  const layer = $('#anno-layer');
  const list = $('#anno-list');
  if (!layer || !list) return;
  const vals = state.series[currentRange()];
  if (!vals) return;
  const n = vals.length;
  const b = bounds(vals);
  layer.innerHTML = annos
    .filter((a) => a.days <= n - 1)
    .map((a) => {
      const i = n - 1 - a.days;
      const x = xAt(i, n);
      const y = yAt(vals[i], b);
      return `<g class="anno" data-anno="${a.id}"><title>${escapeHtml(annoLabel(a.days))} · ${escapeHtml(a.text)}</title><line x1="${x.toFixed(1)}" x2="${x.toFixed(1)}" y1="${Y0}" y2="${Y1}" /><rect x="${(x - 3).toFixed(1)}" y="${Y0 - 10}" width="6" height="6" rx="1.5" /><circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="4" /></g>`;
    })
    .join('');
  list.innerHTML = annos
    .slice()
    .sort((p, q) => q.days - p.days)
    .map(
      (a) =>
        `<li data-anno="${a.id}"${a.days <= n - 1 ? '' : ' class="is-off" title="Outside the selected range"'}><b class="mono">${annoLabel(a.days)}</b><em>${escapeHtml(a.text)}</em><button type="button" class="anno-del" data-anno-del="${a.id}" aria-label="Delete note for ${annoLabel(a.days)}">×</button></li>`,
    )
    .join('');
  $('#anno-count').textContent = String(annos.length);
}

function openAnnoForm(idx) {
  const form = $('#anno-form');
  const n = (state.series[currentRange()] || []).length;
  if (!form || !n) return;
  annoDays = n - 1 - Math.max(0, Math.min(n - 1, idx));
  $('#anno-date').textContent = annoLabel(annoDays);
  const existing = annos.find((a) => a.days === annoDays);
  const input = $('#anno-text');
  input.value = existing ? existing.text : '';
  form.querySelector('[type="submit"]').textContent = existing ? 'Update note' : 'Add note';
  form.hidden = false;
  input.focus({ preventScroll: true });
}

function closeAnnoForm() {
  const form = $('#anno-form');
  if (!form || form.hidden) return false;
  form.hidden = true;
  annoDays = -1;
  $('#chart-wrap')?.focus({ preventScroll: true });
  return true;
}

function setHotAnno(id, on) {
  $$(`[data-anno="${id}"]`).forEach((el) => el.classList.toggle('is-hot', on));
}

function initAnnotations() {
  const svg = $('#chart-svg');
  const wrap = $('#chart-wrap');
  const form = $('#anno-form');
  if (!svg || !wrap || !form) return;
  svg.addEventListener('click', (e) => {
    const rect = svg.getBoundingClientRect();
    const n = (state.series[currentRange()] || []).length;
    if (!n || !rect.width) return;
    const usable = ((e.clientX - rect.left) / rect.width) * 600 - X0;
    openAnnoForm(Math.round((usable / (X1 - X0)) * (n - 1)));
  });
  wrap.addEventListener('keydown', (e) => {
    if (e.key !== 'Enter' || state.tipIdx < 0) return;
    e.preventDefault();
    openAnnoForm(state.tipIdx);
  });
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const text = $('#anno-text').value.trim();
    if (!text) {
      $('#anno-text').focus();
      return;
    }
    const existing = annos.find((a) => a.days === annoDays);
    if (existing) existing.text = text;
    else annos.push({ id: annoSeq++, days: annoDays, text });
    const when = annoLabel(annoDays);
    renderAnnotations();
    form.hidden = true;
    annoDays = -1;
    toast(existing ? `Note for ${when} updated.` : `Note added to ${when}. It shows on every metric and range that includes that day.`);
  });
  $('#anno-cancel').addEventListener('click', closeAnnoForm);
  $('#anno-list').addEventListener('click', (e) => {
    const del = e.target.closest('[data-anno-del]');
    if (!del) return;
    const id = Number(del.dataset.annoDel);
    const i = annos.findIndex((a) => a.id === id);
    if (i < 0) return;
    const [gone] = annos.splice(i, 1);
    renderAnnotations();
    toast(`Note for ${annoLabel(gone.days)} deleted.`);
  });
  // Hovering a marker highlights its list entry and vice versa.
  const panel = $('.panel.chart');
  panel.addEventListener('pointerover', (e) => {
    const el = e.target.closest('[data-anno]');
    if (el) setHotAnno(el.dataset.anno, true);
  });
  panel.addEventListener('pointerout', (e) => {
    const el = e.target.closest('[data-anno]');
    if (el) setHotAnno(el.dataset.anno, false);
  });
  // The range buttons swap the visible series; markers must follow.
  $$('[data-range]').forEach((b) => b.addEventListener('click', renderAnnotations));
  renderAnnotations();
}

/* ---------- growth: funnel ---------- */

const STAGES = {
  visited: {
    kicker: 'Visited · 9,860',
    text: 'Visits split 4,410 organic, 3,120 paid search and 2,330 direct or referral. The pricing page takes 38% of them and /docs another 27%.',
    blocker: '61% of pricing-page visitors leave without scrolling down to the Starter tier, which is the plan most of them would qualify for.',
    action: 'Move Starter to the top of pricing',
  },
  signup: {
    kicker: 'Signed up · 412 · 4.2% of visitors',
    text: '412 signups in 30 days: 61% from the pricing page, 24% from docs and 15% from referrals. The median visitor signs up on their second visit, two days after the first.',
    blocker: 'The signup form asks for company size and a phone number before the email is confirmed. 38% of people who start the form abandon on that step.',
    action: 'Make phone number optional',
  },
  activated: {
    kicker: 'Activated · 186 · 45.1% of signups',
    text: '186 accounts connected a data source within 7 days - Stripe first for 58% of them, Segment for 24%. Median time from signup to first chart is 26 minutes.',
    blocker: '226 signups never connected data. 140 of them are still on trial with an empty dashboard as the last thing they saw, and none received a follow-up.',
    action: 'Send the "connect Stripe in 2 minutes" email',
  },
  paid: {
    kicker: 'Paid · 19 · $3,120 new MRR',
    text: '19 converted: 11 Starter ($1,089), 7 Growth ($1,519) and 1 Scale ($512). Median time from activation to first payment is 9 days, well inside the 14-day trial.',
    blocker: '167 activated accounts are still on trial and 71% of them have never opened the Plans page. The trial-ending email goes out on day 13 with no link to it.',
    action: 'Add "Choose a plan" to the day-10 email',
  },
};
const STAGE_TASK = {
  visited: 'Task created for the growth team: reorder pricing tiers, Starter first. Owner: Nadia Reyes, due Sep 9.',
  signup: 'Task created: drop the phone number requirement from signup. Owner: Chen Wei, due Sep 5.',
  activated: 'Email queued to 140 trial accounts with no data source. Sends tomorrow at 09:00 in each account\'s timezone.',
  paid: 'Task created: add a Plans link to the day-10 trial email. Owner: Nadia Reyes, due Sep 8.',
};
const stageDone = new Set();

function showStage(name) {
  const s = STAGES[name];
  if (!s) return;
  $$('[data-stage].stage').forEach((b) => {
    const on = b.dataset.stage === name;
    b.classList.toggle('is-active', on);
    b.setAttribute('aria-pressed', String(on));
  });
  $('#stage-kicker').textContent = s.kicker;
  $('#stage-text').textContent = s.text;
  $('#stage-blocker').textContent = s.blocker;
  const btn = $('#stage-action');
  btn.dataset.stage = name;
  const done = stageDone.has(name);
  btn.textContent = done ? 'Task created ✓' : s.action;
  btn.disabled = done;
  btn.classList.toggle('is-done', done);
}

function initFunnel() {
  if (!$('#stage-detail')) return;
  $$('[data-stage].stage').forEach((b) => b.addEventListener('click', () => showStage(b.dataset.stage)));
  $('#stage-action').addEventListener('click', (e) => {
    const name = e.currentTarget.dataset.stage;
    stageDone.add(name);
    showStage(name);
    toast(STAGE_TASK[name]);
  });
}

/* ---------- growth: cohorts ---------- */

// Weekly signup cohorts (Mondays) and % still active in each later week.
// The five newest cohorts add up to the 412 signups in the funnel.
const COHORTS = [
  { label: 'Jul 13', size: 86, weeks: [100, 71, 60, 53, 48, 45, 43, 42] },
  { label: 'Jul 20', size: 91, weeks: [100, 72, 61, 54, 49, 46, 44] },
  { label: 'Jul 27', size: 89, weeks: [100, 74, 63, 56, 50, 47] },
  { label: 'Aug 3', size: 94, weeks: [100, 76, 65, 57, 52] },
  { label: 'Aug 10', size: 101, weeks: [100, 77, 66, 58] },
  { label: 'Aug 17', size: 97, weeks: [100, 79, 68] },
  { label: 'Aug 24', size: 88, weeks: [100, 80] },
  { label: 'Aug 31', size: 32, weeks: [100] },
];

function initCohorts() {
  const body = $('#cohort-rows');
  if (!body) return;
  body.innerHTML = COHORTS.map((c, ci) => {
    const cells = [];
    for (let w = 0; w < 8; w++) {
      const v = c.weeks[w];
      cells.push(
        v === undefined
          ? '<td class="na" aria-label="Not yet reached">·</td>'
          : `<td><button type="button" class="cell" data-cohort="${ci}" data-week="${w}" aria-pressed="false" style="--v:${(v / 100).toFixed(2)}" aria-label="${c.label} cohort, week ${w}: ${v}%">${v}%</button></td>`,
      );
    }
    return `<tr><td class="label">${c.label}</td><td class="size">${c.size}</td>${cells.join('')}</tr>`;
  }).join('');
  body.addEventListener('click', (e) => {
    const cell = e.target.closest('[data-cohort]');
    if (!cell) return;
    $$('#cohort-rows .cell').forEach((b) => b.setAttribute('aria-pressed', String(b === cell)));
    const c = COHORTS[Number(cell.dataset.cohort)];
    const w = Number(cell.dataset.week);
    const pct = c.weeks[w];
    const people = Math.round((c.size * pct) / 100);
    const oldest = COHORTS[0].weeks[w];
    let compare = '';
    if (w > 0 && c !== COHORTS[0]) {
      const diff = pct - oldest;
      compare = diff === 0 ? ` Same as the Jul 13 cohort at week ${w}.` : ` That is ${Math.abs(diff)} pts ${diff > 0 ? 'better' : 'worse'} than the Jul 13 cohort (${oldest}%) at the same week.`;
    } else if (w === 0) compare = ' Week 0 is the signup week itself.';
    $('#cohort-detail').textContent = `${c.label} cohort · week ${w}: ${pct}% of ${c.size} signups (${people} people) still active.${compare}`;
  });
}

/* ---------- alerts: rules ---------- */

const RULE_META = {
  response: { name: 'Avg. response', unit: 'ms', now: () => `now ${Math.round(state.values.response)} ms` },
  active: { name: 'Active users', unit: 'users', now: () => `now ${fmtInt(state.values.active)}` },
  mrr: { name: 'MRR', unit: '$', now: () => `now ${fmtMoney(state.values.mrr)}` },
  churn: { name: 'Churn', unit: '%', now: () => `now ${state.values.churn.toFixed(1)}%` },
  errors: { name: 'Error rate', unit: '%', now: () => 'now 0.4%' },
  payments: { name: 'Failed payments', unit: 'failures', now: () => 'now 1 today' },
};
let ruleSeq = 4;

function ruleUnit() {
  const cond = $('#rule-cond').value;
  const m = RULE_META[$('#rule-metric').value];
  $('#rule-unit').textContent = cond === 'drops' || cond === 'rises' ? '%' : m.unit;
}

function ruleChannels(li) {
  return li.querySelector('.rule-main small').textContent.split(' · ')[0];
}

function recountRules() {
  const on = $$('#rules .rule[data-enabled="true"]').length;
  $('#rules-count').textContent = String(on);
  VIEWS.alerts[1] = `${on} rule${on === 1 ? '' : 's'} · status.pulse.app`;
  if (state.view === 'alerts') $('#view-sub').textContent = VIEWS.alerts[1];
}

function ruleTitle(metric, cond, threshold, windowLabel) {
  const m = RULE_META[metric];
  const t = threshold.toLocaleString('en-US');
  if (cond === 'drops' || cond === 'rises') return `${m.name} ${cond} by ${t}% over ${windowLabel}`;
  const value = m.unit === '$' ? `$${t}` : m.unit === '%' ? `${t}%` : `${t} ${m.unit}`;
  return `${m.name} ${cond === 'above' ? '>' : '<'} ${value} for ${windowLabel}`;
}

function initRules() {
  const list = $('#rules');
  const form = $('#rule-form');
  if (!list || !form) return;
  list.addEventListener('click', (e) => {
    const li = e.target.closest('.rule');
    if (!li) return;
    const title = li.querySelector('.rule-main b').textContent;
    if (e.target.closest('[data-rule-toggle]')) {
      const sw = e.target.closest('[data-rule-toggle]');
      const on = li.dataset.enabled !== 'true';
      li.dataset.enabled = String(on);
      sw.setAttribute('aria-checked', String(on));
      recountRules();
      toast(on ? `Rule enabled: ${title}.` : `Rule paused: ${title}. It will not notify anyone until you turn it back on.`);
    } else if (e.target.closest('[data-rule-test]')) {
      const channels = ruleChannels(li);
      const now = li.querySelector('[data-rule-now]')?.textContent || '';
      toast(`Test alert sent via ${channels}: "${title}" (${now}). Check your inbox.`);
      addEvent({
        title: `Test alert: ${title}`,
        account: 'Acme Robotics',
        kicker: 'Alerts',
        summary: `Riya Menon sent a test of the rule "${title}" via ${channels}. Nothing is wrong - this was a manual test from the Alerts page.`,
        payload: { rule: title, channels: channels.split(' · '), test: true, current: now.replace('now ', '') },
      });
    } else if (e.target.closest('[data-rule-delete]')) {
      li.classList.add('is-confirming');
      li.querySelector('.confirm').hidden = false;
      li.querySelector('[data-rule-confirm]').focus();
    } else if (e.target.closest('[data-rule-keep]')) {
      li.classList.remove('is-confirming');
      li.querySelector('.confirm').hidden = true;
      li.querySelector('[data-rule-delete]').focus();
    } else if (e.target.closest('[data-rule-confirm]')) {
      li.remove();
      recountRules();
      toast(`Rule deleted: ${title}.`);
    }
  });

  $('#rule-metric').addEventListener('change', ruleUnit);
  $('#rule-cond').addEventListener('change', ruleUnit);
  ruleUnit();

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const hint = $('#rule-hint');
    const metric = $('#rule-metric').value;
    const cond = $('#rule-cond').value;
    const threshold = Number($('#rule-threshold').value);
    const windowLabel = $('#rule-window').value;
    if (!$('#rule-threshold').value || !Number.isFinite(threshold) || threshold <= 0) {
      hint.textContent = 'Enter a threshold above 0.';
      hint.hidden = false;
      $('#rule-threshold').focus();
      return;
    }
    const channels = [];
    if ($('#rule-ch-email').checked) channels.push('Email');
    if ($('#rule-ch-slack').checked && !$('#rule-ch-slack').disabled) channels.push('Slack #pulse-alerts');
    if ($('#rule-ch-webhook').checked) channels.push('Webhook');
    if (!channels.length) {
      hint.textContent = 'Pick at least one channel to notify.';
      hint.hidden = false;
      return;
    }
    hint.hidden = true;
    const title = ruleTitle(metric, cond, threshold, windowLabel);
    const id = `r${ruleSeq++}`;
    list.insertAdjacentHTML(
      'beforeend',
      `<li class="rule is-new" data-rule="${id}" data-enabled="true">
        <div class="rule-main"><b>${escapeHtml(title)}</b><small>${channels.join(' · ')} · never fired · <em class="mono" data-rule-now="${metric}">${RULE_META[metric].now()}</em></small></div>
        <div class="rule-actions">
          <button type="button" class="switch" role="switch" aria-checked="true" aria-label="Rule enabled" data-rule-toggle><i></i></button>
          <button type="button" class="btn ghost" data-rule-test>Test</button>
          <button type="button" class="btn ghost" data-rule-delete>Delete</button>
        </div>
        <div class="confirm" hidden><span>Delete this rule?</span><button type="button" class="btn ghost danger-btn" data-rule-confirm>Yes, delete</button><button type="button" class="btn ghost" data-rule-keep>Keep</button></div>
      </li>`,
    );
    $('#rule-threshold').value = '';
    recountRules();
    toast(`Rule added: ${title}. Notifying ${channels.join(' and ')}.`);
  });

  // Settings' response-time threshold and rule r1 are the same number.
  $('#settings-save')?.addEventListener('click', () => {
    const b = $('[data-rule="r1"] .rule-main b');
    if (b) b.textContent = `Avg. response > ${state.threshold} ms for 5 min`;
  });
  recountRules();
}

/* ---------- alerts: public status page (staff side + preview) ---------- */

const status = { resolved: false, subscribers: 143, resolvedAt: '' };

function timelineItem(kind, text) {
  return `<li class="is-new"><span class="mono">${hhmm()}</span><span><b>${kind}</b> — ${escapeHtml(text)}</span></li>`;
}

function initStatus() {
  const panel = $('.status-panel');
  if (!panel) return;
  $('#st-latency').addEventListener('click', (e) => {
    const sw = e.currentTarget;
    const on = sw.getAttribute('aria-checked') !== 'true';
    sw.setAttribute('aria-checked', String(on));
    $('#comp-latency').hidden = !on;
    $('#sp-latency').hidden = !on;
    toast(on ? 'Customers now see the 24-hour API response time on status.pulse.app.' : 'API response time hidden from the public status page.');
  });
  $('#inc-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const input = $('#inc-text');
    const text = input.value.trim();
    if (!text) {
      input.focus();
      return;
    }
    $('#inc-timeline').insertAdjacentHTML('beforeend', timelineItem(status.resolved ? 'Post-mortem' : 'Update', text));
    input.value = '';
    toast(`Update posted to status.pulse.app and emailed to ${status.subscribers} subscribers.`);
  });
  $('#inc-resolve').addEventListener('click', (e) => {
    if (status.resolved) return;
    status.resolved = true;
    status.resolvedAt = hhmm();
    $('#inc-timeline').insertAdjacentHTML('beforeend', timelineItem('Resolved', 'Deliveries to every endpoint have been normal for 15 minutes. The 41 queued events for the affected endpoint were delivered in order.'));
    $('#incident').dataset.state = 'resolved';
    const pill = $('#inc-pill');
    pill.className = 'pill ok';
    pill.textContent = 'Resolved';
    const comp = $('#comp-webhooks');
    comp.className = 'pill ok';
    comp.textContent = 'Operational';
    const b = e.currentTarget;
    b.disabled = true;
    b.classList.add('is-done');
    b.textContent = 'Resolved ✓';
    toast(`Incident resolved at ${status.resolvedAt}. Webhooks show Operational and ${status.subscribers} subscribers were emailed.`);
  });
  $$('[data-status-preview]').forEach((b) => b.addEventListener('click', () => openStatusModal(b)));
  $$('[data-modal-close]').forEach((b) => b.addEventListener('click', () => closeStatusModal()));
  $('#sp-subscribe').addEventListener('submit', (e) => {
    e.preventDefault();
    const input = $('#sp-email');
    const email = input.value.trim();
    const note = $('#sp-sub-note');
    const ok = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    note.classList.toggle('is-err', !ok);
    note.textContent = ok ? `Subscribed. ${email} will get an email for every incident update and resolution. (${status.subscribers + 1} subscribers)` : 'Enter a valid email address, like you@company.com.';
    note.hidden = false;
    if (ok) {
      status.subscribers += 1;
      input.value = '';
    } else input.focus();
  });
}

let modalTimer = 0;
let modalReturn = null;
function openStatusModal(trigger) {
  const modal = $('#status-modal');
  if (!modal) return;
  // Mirror the staff-side state into the customer view.
  const banner = $('#sp-banner');
  banner.dataset.state = status.resolved ? 'ok' : 'warn';
  banner.textContent = status.resolved ? 'All systems operational' : 'Some systems are degraded';
  const wh = $('#sp-webhooks');
  wh.className = status.resolved ? 'pill ok' : 'pill warn';
  wh.textContent = status.resolved ? 'Operational' : 'Degraded';
  $('#sp-inc-heading').textContent = status.resolved ? `Resolved today at ${status.resolvedAt}` : 'Active incident';
  $('#sp-timeline').innerHTML = $('#inc-timeline').innerHTML.replace(/ class="is-new"/g, '');
  $('#sp-sub-note').hidden = true;
  syncLatency();
  modalReturn = trigger || null;
  clearTimeout(modalTimer);
  modal.hidden = false;
  requestAnimationFrame(() => requestAnimationFrame(() => modal.classList.add('is-open')));
  $('#status-modal-close').focus({ preventScroll: true });
}

function closeStatusModal() {
  const modal = $('#status-modal');
  if (!modal || modal.hidden) return false;
  modal.classList.remove('is-open');
  clearTimeout(modalTimer);
  modalTimer = setTimeout(() => (modal.hidden = true), 260);
  if (modalReturn && modalReturn.isConnected) modalReturn.focus({ preventScroll: true });
  modalReturn = null;
  return true;
}

/* ---------- team & billing ---------- */

const PLANS = {
  growth: { name: 'Growth', seats: 14, price: 79 },
  scale: { name: 'Scale', seats: 25, price: 65 },
};
const billing = { plan: 'growth', bill: 1106 };

function memberName(tr) {
  return tr.querySelector('td b').textContent.trim();
}

function renderBilling() {
  const p = PLANS[billing.plan];
  const used = $$('#team-rows tr').length;
  const extra = Math.max(0, used - p.seats);
  const included = p.seats * p.price;
  const overage = extra * p.price;
  billing.bill = included + overage;
  $('#team-count').textContent = String(used);
  $('#team-of').textContent = `of ${p.seats} seats`;
  $('#seat-count').textContent = `${used} / ${p.seats} seats`;
  $('#seat-fill').style.transform = `scaleX(${Math.min(1, used / p.seats).toFixed(3)})`;
  $('.meter').classList.toggle('is-full', used >= p.seats);
  const badge = $('#plan-badge');
  badge.textContent = p.name;
  badge.className = `plan ${billing.plan}`;
  $('#seat-price').textContent = `$${p.price} / seat / mo`;
  $('#bill-now').textContent = `${fmtMoney(included)} / mo`;
  $('#overage-row').hidden = extra === 0;
  $('#overage').textContent = `+${fmtMoney(overage)}`;
  $('#bill-next').textContent = fmtMoney(included + overage);
  const free = p.seats - used;
  $('#plan-note').textContent =
    extra > 0
      ? `${extra} seat${extra === 1 ? '' : 's'} over plan. Extra seats bill at $${p.price} each on Oct 2${billing.plan === 'growth' ? ', or upgrade to Scale for 25 seats at $65' : ''}.`
      : `${free} seat${free === 1 ? '' : 's'} free. Pending invites reserve a seat until they are accepted or revoked.`;
  $('#org-plan').textContent = `${p.name} plan · ${p.seats} seats`;
  VIEWS.team[1] = `${used} members · ${p.name} plan`;
  if (state.view === 'team') $('#view-sub').textContent = VIEWS.team[1];
}

function initTeam() {
  const rows = $('#team-rows');
  const form = $('#invite-form');
  if (!rows || !form) return;
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const input = $('#invite-email');
    const email = input.value.trim().toLowerCase();
    const role = $('#invite-role').value;
    const hint = $('#invite-hint');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      hint.textContent = 'Enter a work email, like name@acmerobotics.com.';
      hint.hidden = false;
      input.focus();
      return;
    }
    if ($(`#team-rows tr[data-member="${CSS.escape(email)}"]`)) {
      hint.textContent = `${email} is already on the team.`;
      hint.hidden = false;
      input.focus();
      return;
    }
    const options = ['Admin', 'Analyst', 'Viewer'].map((r) => `<option${r === role ? ' selected' : ''}>${r}</option>`).join('');
    rows.insertAdjacentHTML(
      'beforeend',
      `<tr data-member="${escapeHtml(email)}" class="is-pending is-new"><td><b>${escapeHtml(email)}</b><small>Invited · pending</small></td><td><label class="select"><span class="sr-only">Role for ${escapeHtml(email)}</span><select data-role>${options}</select></label></td><td class="mono">invite sent</td><td><button type="button" class="btn ghost" data-resend>Resend</button> <button type="button" class="btn ghost" data-remove>Revoke</button><span class="confirm" hidden>Revoke? <button type="button" class="btn ghost danger-btn" data-remove-confirm>Yes</button><button type="button" class="btn ghost" data-remove-keep>Keep</button></span></td></tr>`,
    );
    input.value = '';
    renderBilling();
    const p = PLANS[billing.plan];
    const used = $$('#team-rows tr').length;
    if (used > p.seats) {
      hint.textContent = `That takes you to ${used} of ${p.seats} seats. The extra seat bills at $${p.price} on Oct 2${billing.plan === 'growth' ? ' - or upgrade to Scale for 25 seats' : ''}.`;
      hint.hidden = false;
    } else hint.hidden = true;
    toast(`Invite sent to ${email} as ${role}. It expires in 7 days and reserves a seat until then.`);
    addEvent({
      title: `Team invite sent (${role})`,
      account: 'Acme Robotics',
      kicker: 'Team',
      summary: `Riya Menon invited ${email} to the Acme Robotics workspace as ${role}. The invite expires in 7 days.`,
      payload: { invitee: email, role: role.toLowerCase(), expires_in_days: 7, seats_used: used, seats_in_plan: p.seats },
    });
  });

  rows.addEventListener('change', (e) => {
    const sel = e.target.closest('[data-role]');
    if (!sel) return;
    const tr = sel.closest('tr');
    toast(`${memberName(tr)} is now ${sel.value === 'Admin' ? 'an' : 'a'} ${sel.value}.`);
  });

  rows.addEventListener('click', (e) => {
    const tr = e.target.closest('tr');
    if (!tr) return;
    const td = tr.lastElementChild;
    if (e.target.closest('[data-remove]')) {
      td.classList.add('is-confirming');
      td.querySelector('.confirm').hidden = false;
      td.querySelector('[data-remove-confirm]').focus();
    } else if (e.target.closest('[data-remove-keep]')) {
      td.classList.remove('is-confirming');
      td.querySelector('.confirm').hidden = true;
      td.querySelector('[data-remove]').focus();
    } else if (e.target.closest('[data-remove-confirm]')) {
      const name = memberName(tr);
      const pending = tr.classList.contains('is-pending');
      tr.remove();
      renderBilling();
      $('#invite-hint').hidden = true;
      toast(pending ? `Invite to ${name} revoked. The seat is free again.` : `${name} removed from the workspace. Their seat is free again.`);
    } else if (e.target.closest('[data-resend]')) {
      const b = e.target.closest('[data-resend]');
      b.disabled = true;
      b.textContent = 'Sent ✓';
      toast(`Invite re-sent to ${memberName(tr)}.`);
    }
  });

  $('#upgrade').addEventListener('click', () => {
    $('#upgrade-confirm').hidden = false;
    $('#upgrade-yes').focus();
  });
  $('#upgrade-no').addEventListener('click', () => {
    $('#upgrade-confirm').hidden = true;
    $('#upgrade').focus();
  });
  $('#upgrade-yes').addEventListener('click', () => {
    billing.plan = 'scale';
    $('#upgrade-confirm').hidden = true;
    const b = $('#upgrade');
    b.disabled = true;
    b.classList.add('is-done');
    b.textContent = 'On Scale ✓ · 25 seats at $65';
    renderBilling();
    $('#invite-hint').hidden = true;
    toast('Upgraded to Scale. $519 charged to the card ending 4242; 25 seats are available now and the next invoice is $1,625 on Oct 2.');
    addEvent({
      title: 'Subscription upgraded → Scale',
      account: 'Acme Robotics',
      kicker: 'Billing',
      summary: 'Riya Menon moved Acme Robotics from Growth to Scale. A prorated $519 was charged to the card ending 4242; 25 seats are now licensed at $65 each.',
      payload: { from: 'growth', to: 'scale', seats: 25, proration: 519, card: '4242', status: 'succeeded' },
    });
  });
  renderBilling();
}

/* ---------- integrations ---------- */

const INTS = {
  slack: {
    on: 'connected just now · #pulse-alerts',
    off: '—',
    connect: 'Slack connected. Every alert rule can now post to #pulse-alerts.',
    disconnect: 'Slack disconnected. Rules that used Slack fall back to email.',
  },
  stripe: {
    on: 'synced just now · 278 customers',
    off: 'billing sync paused',
    connect: 'Stripe reconnected. Invoices, payments and MRR movement are syncing again.',
    disconnect: 'Stripe disconnected. Billing events stop until it is reconnected - see the notice in Events.',
  },
  hubspot: {
    on: 'synced just now · 278 contacts, 41 open deals',
    off: '—',
    connect: 'HubSpot connected. "Open in CRM" on a customer now jumps to their record, and health scores sync back hourly.',
    disconnect: 'HubSpot disconnected. Health scores stop syncing to contacts.',
  },
  segment: {
    on: 'receiving events · 1.2M this month',
    off: '—',
    connect: 'Segment connected. The funnel and cohorts now use page views and in-app events from your own tracking plan.',
    disconnect: 'Segment disconnected. The funnel falls back to the built-in tracker.',
  },
};

function connected(name) {
  return $(`[data-int="${name}"]`)?.dataset.connected === 'true';
}

function applyIntegrations() {
  const slack = connected('slack');
  const cb = $('#rule-ch-slack');
  if (cb) {
    cb.disabled = !slack;
    if (!slack) cb.checked = false;
    $('#rule-slack-hint').hidden = slack;
    $('#rule-ch-slack-label').classList.toggle('is-off', !slack);
  }
  const banner = $('#events-banner');
  if (banner) banner.hidden = connected('stripe');
  state.crm = connected('hubspot');
  const crmBtn = $('#c-secondary');
  if (crmBtn) crmBtn.textContent = state.crm ? 'Open in HubSpot' : 'Open in CRM';
  const funnelNote = $('.funnel-panel h2 small');
  if (funnelNote) funnelNote.textContent = `last 30 days · ${connected('segment') ? 'via Segment' : 'built-in tracker'} · select a stage to see what blocks the next one`;
  const n = $$('[data-int][data-connected="true"]').length;
  $('#int-count').textContent = String(n);
  VIEWS.integrations[1] = `${n} of 4 connected`;
  if (state.view === 'integrations') $('#view-sub').textContent = VIEWS.integrations[1];
}

function initIntegrations() {
  const cards = $$('[data-int]');
  if (!cards.length) return;
  cards.forEach((card) => {
    const name = card.dataset.int;
    const meta = INTS[name];
    const btn = card.querySelector('[data-int-toggle]');
    const label = card.querySelector('.int-head b').textContent;
    btn.addEventListener('click', () => {
      const on = card.dataset.connected !== 'true';
      card.dataset.connected = String(on);
      const pill = card.querySelector('[data-int-pill]');
      pill.className = on ? 'pill ok' : 'pill acked';
      pill.textContent = on ? 'Connected' : 'Not connected';
      btn.className = on ? 'btn ghost' : 'btn primary';
      btn.textContent = on ? 'Disconnect' : 'Connect';
      btn.setAttribute('aria-pressed', String(on));
      card.querySelector('[data-int-meta]').textContent = on ? meta.on : meta.off;
      applyIntegrations();
      toast(on ? meta.connect : meta.disconnect);
      addEvent({
        title: `${label} ${on ? 'connected' : 'disconnected'}`,
        account: 'Acme Robotics',
        sev: on ? 'ok' : 'warn',
        kicker: 'Integrations',
        summary: `Riya Menon ${on ? 'connected' : 'disconnected'} ${label} from the Integrations page. ${on ? meta.connect : meta.disconnect}`,
        payload: { integration: name, connected: on, by: 'riya@acmerobotics.com' },
      });
    });
  });
  applyIntegrations();
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
  initAsk();
  initAnnotations();
  initFunnel();
  initCohorts();
  initRules();
  initStatus();
  initTeam();
  initIntegrations();
  syncLatency();
  renderUpdated();
}

if (document.readyState !== 'loading') init();
else document.addEventListener('DOMContentLoaded', init);
