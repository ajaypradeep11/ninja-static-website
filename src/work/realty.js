// Northshore Realty - page-specific behaviour. Loaded after mockups.js,
// which still owns the generic hooks (data-filter, data-open, data-close,
// data-collapse, data-say). This module layers the buyer tools on top -
// refine filters + sort, save / compare, mortgage calculator, neighbourhood
// snapshot, viewing booking, saved-search alerts, home valuation - and the
// brokerage's side: the agent desk (leads, viewings, hot listings).
// Listeners are delegated at document level so they run after the
// element-level handlers in mockups.js.
// Contract: JS only toggles classes / attributes / text and builds strings.
// CSS owns every transition and animation. No wall clock: the demo date is
// fixed (Wed 2 Sep 2026).

const HOMES = {
  1: { id: 1, addr: '2288 W 4th Ave', hood: 'kits', type: 'condo', label: 'Condo', price: 925000, beds: 2, baths: 2, sqft: 890, built: 2009, walk: 94, strata: 412, photo: 'linear-gradient(160deg,#c7e6f5,#5eb3dd)', views: 312, saves: 18, viewings: 3 },
  2: { id: 2, addr: '4120 Hastings St', hood: 'heights', type: 'townhouse', label: 'Townhouse', price: 1290000, beds: 3, baths: 2.5, sqft: 1480, built: 2016, walk: 81, strata: 298, photo: 'linear-gradient(160deg,#f3d9b1,#d9944f)', views: 204, saves: 11, viewings: 2 },
  3: { id: 3, addr: '1560 Grand Blvd', hood: 'northvan', type: 'detached', label: 'Detached', price: 2100000, beds: 4, baths: 3, sqft: 2350, built: 1958, walk: 68, strata: 0, photo: 'linear-gradient(160deg,#d6ead8,#7fb68a)', views: 176, saves: 9, viewings: 1 },
  4: { id: 4, addr: '55 E Cordova St', hood: 'gastown', type: 'loft', label: 'Loft', price: 640000, beds: 1, baths: 1, sqft: 720, built: 1911, walk: 98, strata: 355, photo: 'linear-gradient(160deg,#e3d5cf,#a37c6c)', views: 389, saves: 24, viewings: 4 },
};
const IDS = [1, 2, 3, 4];

// Trends are median sale price by month (thousands), oldest first. The
// 12-month change shown is computed from these so the two never disagree.
const HOODS = {
  kits: { name: 'Kitsilano', walk: 94, dom: 14, schools: 'Gordon Elementary (K-7) · Kitsilano Secondary · 3 daycares within 1 km', transit: '99 B-Line and 4th Ave buses · 12 min to downtown', trend: [1141, 1148, 1139, 1152, 1160, 1158, 1166, 1171, 1169, 1176, 1178, 1180] },
  heights: { name: 'Burnaby Heights', walk: 81, dom: 19, schools: 'Gilmore Community (K-7) · Burnaby North Secondary', transit: 'R5 RapidBus on Hastings · 25 min to downtown', trend: [1325, 1331, 1328, 1336, 1340, 1338, 1342, 1347, 1344, 1349, 1352, 1350] },
  northvan: { name: 'North Vancouver', walk: 68, dom: 23, schools: 'Queen Mary Elementary · Sutherland Secondary', transit: 'SeaBus from Lonsdale Quay in 15 min · 240 express bus', trend: [2258, 2265, 2250, 2244, 2238, 2246, 2240, 2232, 2228, 2236, 2242, 2240] },
  gastown: { name: 'Gastown', walk: 98, dom: 11, schools: 'Crosstown Elementary (K-7) · Britannia Secondary', transit: 'Waterfront Station 5 min walk · SkyTrain, SeaBus, West Coast Express', trend: [668, 671, 669, 675, 678, 682, 680, 686, 689, 691, 693, 695] },
};

// Maya's viewing availability this week (demo date is Wed 2 Sep).
const DAYS = [
  { key: 'thu', label: 'Thu 3 Sep', times: ['17:30', '18:15'] },
  { key: 'fri', label: 'Fri 4 Sep', times: ['12:00', '16:30'] },
  { key: 'sat', label: 'Sat 5 Sep', times: ['10:00', '11:00', '13:30', '15:00'] },
  { key: 'sun', label: 'Sun 6 Sep', times: ['11:00', '14:00'] },
];
const DAY_ORDER = { thu: 0, fri: 1, sat: 2, sun: 3 };

const SORTS = {
  newest: { label: 'newest', by: (a, b) => a.id - b.id },
  'price-asc': { label: 'price, low to high', by: (a, b) => a.price - b.price },
  'price-desc': { label: 'price, high to low', by: (a, b) => b.price - a.price },
  size: { label: 'size', by: (a, b) => b.sqft - a.sqft },
};

// Valuation model - tuned so the four listings on the page land inside
// their own estimate range (condo 2/2 -> $930k, townhouse 3/2.5 -> $1.295M,
// detached 4/3 -> $2.13M, loft 1/1 -> $645k).
const VALUE_BASE = { condo: 520000, townhouse: 700000, detached: 1350000, loft: 440000 };
const VALUE_BED = 165000;
const VALUE_BATH = 40000;
const TYPE_LABEL = { condo: 'Condo', townhouse: 'Townhouse', detached: 'Detached', loft: 'Loft' };

const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
const escapeHtml = (s) =>
  String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const money = (n) => '$' + Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
const short = (n) => (n >= 1000000 ? `$${(n / 1000000).toFixed(n % 1000000 === 0 ? 0 : 2).replace(/0$/, '')}M` : `$${Math.round(n / 1000)}k`);
const fullAddr = (h) => `${h.addr} · ${HOODS[h.hood].name}`;

const state = {
  saved: new Set(),
  picks: new Set(),
  sort: 'newest',
  price: 2200000,
  beds: 0,
  baths: 0,
  mortgage: {},
  book: { home: null, mode: 'In person', day: 'sat', time: null },
  taken: new Set(['thu|18:15', 'sat|11:00']),
  freq: 'instantly',
  leadFilter: 'all',
  subs: 41,
  lastEstimate: null,
  leads: [
    { who: 'Jordan Lee', via: 'Voice assistant', when: '13:52 today', today: true, what: 'Two-bed in Kitsilano, budget around $1M. Asked about 2288 W 4th Ave.', status: 'new', hot: true, agent: 'Maya' },
    { who: 'Priya Sharma', via: 'Website form', when: '11:20 today', today: true, what: 'Townhouse, wants to see 4120 Hastings St this weekend.', status: 'contacted', hot: false, agent: 'Maya' },
    { who: 'Sam Whitfield', via: 'Voice assistant', when: 'Yesterday 19:05', today: false, what: 'Loft or condo under $700k, Gastown or Mount Pleasant. Pre-approved.', status: 'new', hot: false, agent: 'Maya' },
  ],
  viewings: [
    { day: 'thu', time: '18:15', home: 2, who: 'Priya & Dev Sharma', mode: 'In person', status: 'Confirmed', mine: false, reminded: false },
    { day: 'sat', time: '11:00', home: 1, who: 'Jordan Lee', mode: 'Video walkthrough', status: 'Pending', mine: false, reminded: false },
  ],
  valuations: [{ address: '3312 W 11th Ave, Vancouver', type: 'detached', beds: 3, baths: 2, status: 'Appointment Fri 10:00' }],
  searches: [],
  toastTimer: 0,
};

/* ---------- money maths ---------- */

// Canadian mortgages compound semi-annually.
const monthly = (principal, rate, years) => {
  const r = Math.pow(1 + rate / 200, 1 / 6) - 1;
  const n = years * 12;
  if (r === 0) return principal / n;
  const f = Math.pow(1 + r, n);
  return (principal * r * f) / (f - 1);
};

// BC property transfer tax: 1% to $200k, 2% to $2M, 3% to $3M, 5% above.
const transferTax = (price) => {
  let tax = 0;
  tax += Math.min(price, 200000) * 0.01;
  if (price > 200000) tax += (Math.min(price, 2000000) - 200000) * 0.02;
  if (price > 2000000) tax += (Math.min(price, 3000000) - 2000000) * 0.03;
  if (price > 3000000) tax += (price - 3000000) * 0.05;
  return tax;
};

// CMHC default insurance premium on the loan when down payment < 20%.
const cmhcRate = (downPct) => (downPct >= 20 ? 0 : downPct >= 15 ? 0.028 : downPct >= 10 ? 0.031 : 0.04);

const estimate = (type, beds, baths) => {
  const mid = VALUE_BASE[type] + beds * VALUE_BED + baths * VALUE_BATH;
  const round = (n) => Math.round(n / 5000) * 5000;
  return { low: round(mid * 0.94), high: round(mid * 1.06), mid };
};

/* ---------- toast ---------- */

const toast = (text) => {
  const el = $('#toast');
  if (!el) return;
  el.textContent = text;
  el.classList.add('is-on');
  clearTimeout(state.toastTimer);
  state.toastTimer = setTimeout(() => el.classList.remove('is-on'), 3400);
};

/* ---------- overlays (mine) + escape ---------- */

const openOverlay = (sel) => {
  const el = $(sel);
  if (!el) return;
  el.classList.add('is-open');
  const focusable = $('.x, [data-close], button, input', el);
  focusable?.focus({ preventScroll: true });
};
const closeOverlay = (sel) => $(sel)?.classList.remove('is-open');

// Topmost first. Book / compare / alerts sit above the drawer, which sits
// above the listing sheets. The neighbourhood card closes last.
const closeTopmost = () => {
  for (const sel of ['#book', '#compare', '#alerts', '#saved']) {
    const el = $(sel);
    if (el?.classList.contains('is-open')) {
      el.classList.remove('is-open');
      return true;
    }
  }
  const detail = $('.detail.is-open');
  if (detail) {
    detail.classList.remove('is-open');
    return true;
  }
  const hood = $('[data-hood-panel].is-open');
  if (hood) {
    closeHood();
    return true;
  }
  return false;
};

/* ---------- filters + sort ---------- */

const activeType = () => $('.filters [data-filter].is-active')?.dataset.filter || 'all';

const matches = (h) => {
  const type = activeType();
  return (type === 'all' || h.type === type) && h.price <= state.price && h.beds >= state.beds && h.baths >= state.baths;
};

const applyFilters = () => {
  const cards = $('[data-cards]');
  if (!cards) return;
  const order = IDS.map((id) => HOMES[id]).sort(SORTS[state.sort].by);
  let shown = 0;
  order.forEach((h) => {
    const wrap = $(`[data-cards] [data-home="${h.id}"]`);
    if (!wrap) return;
    const ok = matches(h);
    wrap.classList.toggle('is-hidden', !ok);
    cards.appendChild(wrap); // reorder in place
    if (ok) shown += 1;
    $(`.pin[data-home="${h.id}"]`)?.classList.toggle('is-dim', !ok);
  });
  const count = $('[data-count]');
  if (count) count.textContent = shown === 1 ? '1 home' : `${shown} homes`;
  const sortLabel = $('[data-sort-label]');
  if (sortLabel) sortLabel.textContent = SORTS[state.sort].label;
  $('[data-empty]')?.classList.toggle('is-open', shown === 0);

  const anyPrice = state.price >= 2200000;
  const priceOut = $('[data-price-out]');
  if (priceOut) priceOut.textContent = anyPrice ? 'Any price' : `Up to ${short(state.price)}`;
  const sp = $('[data-search-price]');
  if (sp) sp.textContent = anyPrice ? 'Any price' : `Up to ${short(state.price)}`;
  const sb = $('[data-search-beds]');
  if (sb) sb.textContent = state.beds ? `${state.beds}+ beds` : 'Any beds';
  const dirty = activeType() !== 'all' || !anyPrice || state.beds > 0 || state.baths > 0;
  $$('[data-reset-filters]').forEach((b) => (b.hidden = !dirty && b.closest('.refine') !== null));
};

const searchSummary = () => {
  const type = activeType();
  const typeLabel = type === 'all' ? 'All homes' : { condo: 'Condos', townhouse: 'Townhouses', detached: 'Detached homes', loft: 'Lofts' }[type];
  const price = state.price >= 2200000 ? 'any price' : `up to ${short(state.price)}`;
  const beds = state.beds ? `${state.beds}+ beds` : 'any beds';
  const baths = state.baths ? ` · ${state.baths}+ baths` : '';
  return `${typeLabel} · ${price} · ${beds}${baths}`;
};

const resetFilters = () => {
  state.price = 2200000;
  state.beds = 0;
  state.baths = 0;
  const price = $('[data-price]');
  if (price) price.value = '2200000';
  const beds = $('[data-beds]');
  if (beds) beds.value = '0';
  const baths = $('[data-baths]');
  if (baths) baths.value = '0';
  $$('.filters [data-filter]').forEach((b) => b.classList.toggle('is-active', b.dataset.filter === 'all'));
  applyFilters();
};

/* ---------- save / compare ---------- */

const syncSaveButtons = (id) => {
  const on = state.saved.has(id);
  $$(`[data-save="${id}"]`).forEach((b) => {
    b.setAttribute('aria-pressed', String(on));
    b.classList.toggle('is-saved', on);
    const icon = $('[data-save-icon]', b);
    if (icon) icon.textContent = on ? '♥' : '♡';
    else if (b.classList.contains('heart')) b.firstElementChild.textContent = on ? '♥' : '♡';
    const text = $('[data-save-text]', b);
    if (text) text.textContent = on ? 'Saved' : 'Save';
    if (b.classList.contains('heart')) b.setAttribute('aria-label', `${on ? 'Remove' : 'Save'} ${HOMES[id].addr}`);
  });
};

const toggleSave = (id) => {
  const h = HOMES[id];
  if (state.saved.has(id)) {
    state.saved.delete(id);
    state.picks.delete(id);
    h.saves -= 1;
    toast(`Removed ${h.addr} from your saved homes`);
  } else {
    state.saved.add(id);
    h.saves += 1;
    toast(`Saved ${h.addr} · ${state.saved.size} in your shortlist`);
  }
  syncSaveButtons(id);
  renderSaved();
  renderDesk();
};

const renderSaved = () => {
  const count = $('[data-saved-count]');
  if (count) count.textContent = String(state.saved.size);
  const list = $('[data-saved-list]');
  if (!list) return;
  const ids = IDS.filter((id) => state.saved.has(id));
  $('[data-saved-empty]')?.classList.toggle('is-hidden', ids.length > 0);
  $('[data-compare-bar]')?.classList.toggle('is-hidden', ids.length === 0);
  const full = state.picks.size >= 3;
  list.innerHTML = ids
    .map((id) => {
      const h = HOMES[id];
      const picked = state.picks.has(id);
      return `<li class="saved-row${picked ? ' is-picked' : ''}">
        <span class="thumb" style="--photo:${h.photo}"></span>
        <div class="saved-main"><b>${money(h.price)}</b><span>${escapeHtml(fullAddr(h))}</span><small>${h.beds} bd · ${h.baths} ba · ${h.sqft.toLocaleString('en-CA')} sq ft</small></div>
        <div class="saved-actions">
          <label class="pick"><input type="checkbox" data-compare-pick="${id}"${picked ? ' checked' : ''}${!picked && full ? ' disabled' : ''} /> Compare</label>
          <button type="button" class="link-btn" data-view="${id}">View</button>
          <button type="button" class="link-btn" data-save="${id}" aria-label="Remove ${escapeHtml(h.addr)}">Remove</button>
        </div>
      </li>`;
    })
    .join('');
  const n = state.picks.size;
  const btn = $('[data-compare-open]');
  if (btn) {
    btn.disabled = n < 2;
    btn.textContent = n >= 2 ? `Compare ${n}` : 'Compare';
  }
  const hint = $('[data-compare-hint]');
  if (hint) hint.textContent = n >= 2 ? `${n} selected · up to 3` : n === 1 ? 'Tick one more to compare' : 'Tick 2-3 homes to compare';

  // Viewings booked by the visitor
  const mine = state.viewings.filter((v) => v.mine).sort(byWhen);
  $('[data-my-viewings-empty]')?.classList.toggle('is-hidden', mine.length > 0);
  const mv = $('[data-my-viewings]');
  if (mv) mv.innerHTML = mine.map((v) => `<li><b>${dayLabel(v.day)} · ${v.time}</b><span>${escapeHtml(fullAddr(HOMES[v.home]))} · ${v.mode} with Maya Chen</span></li>`).join('');

  // Saved searches
  $('[data-searches-empty]')?.classList.toggle('is-hidden', state.searches.length > 0);
  const ss = $('[data-searches]');
  if (ss) ss.innerHTML = state.searches.map((s) => `<li><b>${escapeHtml(s.summary)}</b><span>${s.freq} to ${escapeHtml(s.email)}</span></li>`).join('');
};

const compareRows = (ids) => {
  const hs = ids.map((id) => HOMES[id]);
  const pick = (vals, best) => {
    const target = best === 'min' ? Math.min(...vals) : Math.max(...vals);
    return vals.map((v) => v === target);
  };
  const rows = [
    ['Price', hs.map((h) => money(h.price)), pick(hs.map((h) => h.price), 'min')],
    ['Per sq ft', hs.map((h) => money(h.price / h.sqft)), pick(hs.map((h) => h.price / h.sqft), 'min')],
    ['Bedrooms', hs.map((h) => String(h.beds)), pick(hs.map((h) => h.beds), 'max')],
    ['Bathrooms', hs.map((h) => String(h.baths)), pick(hs.map((h) => h.baths), 'max')],
    ['Size', hs.map((h) => `${h.sqft.toLocaleString('en-CA')} sq ft`), pick(hs.map((h) => h.sqft), 'max')],
    ['Built', hs.map((h) => String(h.built)), pick(hs.map((h) => h.built), 'max')],
    ['Walk Score', hs.map((h) => String(h.walk)), pick(hs.map((h) => h.walk), 'max')],
    ['Strata fee', hs.map((h) => (h.strata ? `${money(h.strata)}/mo` : 'None')), pick(hs.map((h) => h.strata), 'min')],
    ['Monthly payment', hs.map((h) => `${money(monthly(h.price * 0.8, 4.75, 25))}/mo`), pick(hs.map((h) => h.price), 'min')],
    ['Transfer tax (BC)', hs.map((h) => money(transferTax(h.price))), pick(hs.map((h) => transferTax(h.price)), 'min')],
  ];
  const head = `<thead><tr><th scope="col"><span class="sr">Feature</span></th>${hs
    .map((h) => `<th scope="col"><span class="thumb" style="--photo:${h.photo}"></span><b>${escapeHtml(h.addr)}</b><span>${escapeHtml(HOODS[h.hood].name)}</span></th>`)
    .join('')}</tr></thead>`;
  const body = `<tbody>${rows
    .map(([label, vals, best]) => `<tr><th scope="row">${label}</th>${vals.map((v, i) => `<td${best[i] ? ' class="is-best"' : ''}>${v}</td>`).join('')}</tr>`)
    .join('')}<tr class="actions"><th scope="row"><span class="sr">Actions</span></th>${hs
    .map((h) => `<td><button type="button" class="link-btn" data-book="${h.id}">Book viewing</button></td>`)
    .join('')}</tr></tbody>`;
  return head + body;
};

/* ---------- mortgage calculator + similar homes (per sheet) ---------- */

const buildExtras = (id) => {
  const h = HOMES[id];
  const others = IDS.filter((o) => o !== id)
    .map((o) => HOMES[o])
    .sort((a, b) => Math.abs(a.price - h.price) - Math.abs(b.price - h.price))
    .slice(0, 2);
  return `<div class="mortgage" id="mortgage-${id}" data-mortgage="${id}">
    <div class="m-grid">
      <label><span>Down payment <output data-m-down-out></output></span><input type="range" min="5" max="50" step="5" value="20" data-m-down aria-label="Down payment percent" /></label>
      <label><span>Interest rate <output data-m-rate-out></output></span><input type="range" min="3" max="7.5" step="0.05" value="4.75" data-m-rate aria-label="Interest rate" /></label>
      <div class="seg" role="group" aria-label="Amortisation">
        <button type="button" data-m-amort="25" aria-pressed="true">25 years</button>
        <button type="button" data-m-amort="30" aria-pressed="false">30 years</button>
      </div>
    </div>
    <div class="m-out">
      <div class="m-big"><b data-m-monthly></b><span>/month</span></div>
      <dl>
        <div><dt>Mortgage amount</dt><dd data-m-principal></dd></div>
        <div data-m-cmhc-row><dt>CMHC insurance (added to loan)</dt><dd data-m-cmhc></dd></div>
        <div><dt>Property transfer tax (BC)</dt><dd data-m-ptt></dd></div>
        <div><dt>Cash needed on closing</dt><dd data-m-cash></dd></div>
      </dl>
      <p class="fine">Estimate only · semi-annual compounding · excludes ${h.strata ? `strata of ${money(h.strata)}/mo and ` : ''}property tax. First-time-buyer transfer tax relief not applied.</p>
    </div>
  </div>
  <div class="similar">
    <p class="eyebrow">Similar homes</p>
    <div class="sim-row">${others
      .map(
        (o) => `<button type="button" data-switch="#detail-${o.id}"><span class="thumb" style="--photo:${o.photo}"></span><b>${money(o.price)}</b><span>${o.beds} bd · ${o.sqft.toLocaleString('en-CA')} sq ft · ${escapeHtml(HOODS[o.hood].name)}</span></button>`
      )
      .join('')}</div>
  </div>`;
};

const calcMortgage = (id) => {
  const h = HOMES[id];
  const panel = $(`[data-mortgage="${id}"]`);
  if (!panel) return;
  const m = state.mortgage[id] || (state.mortgage[id] = { down: 20, rate: 4.75, years: 25 });
  const down = h.price * (m.down / 100);
  const base = h.price - down;
  const cmhc = base * cmhcRate(m.down);
  const principal = base + cmhc;
  const ptt = transferTax(h.price);
  const pay = monthly(principal, m.rate, m.years);
  const set = (sel, text) => {
    const el = $(sel, panel);
    if (el) el.textContent = text;
  };
  set('[data-m-down-out]', `${m.down}% · ${money(down)}`);
  set('[data-m-rate-out]', `${m.rate.toFixed(2)}%`);
  set('[data-m-monthly]', money(pay));
  set('[data-m-principal]', money(principal));
  set('[data-m-cmhc]', money(cmhc));
  set('[data-m-ptt]', money(ptt));
  set('[data-m-cash]', money(down + ptt));
  $('[data-m-cmhc-row]', panel)?.classList.toggle('is-hidden', cmhc === 0);
  $$('[data-m-amort]', panel).forEach((b) => b.setAttribute('aria-pressed', String(Number(b.dataset.mAmort) === m.years)));
};

/* ---------- neighbourhood snapshot ---------- */

const sparkPath = (trend) => {
  const min = Math.min(...trend);
  const max = Math.max(...trend);
  const span = max - min || 1;
  const pts = trend.map((v, i) => [(i * 240) / (trend.length - 1), 54 - ((v - min) / span) * 44]);
  const line = pts.map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${x.toFixed(1)} ${y.toFixed(1)}`).join(' ');
  return { line, fill: `${line} L240 60 L0 60 Z` };
};

const openHood = (key) => {
  const hood = HOODS[key];
  const panel = $('[data-hood-panel]');
  if (!hood || !panel) return;
  const first = hood.trend[0];
  const last = hood.trend[hood.trend.length - 1];
  const change = ((last / first - 1) * 100).toFixed(1);
  const set = (sel, text) => {
    const el = $(sel, panel);
    if (el) el.textContent = text;
  };
  set('[data-hood-name]', hood.name);
  set('[data-hood-median]', money(last * 1000));
  set('[data-hood-change]', `${change >= 0 ? '+' : ''}${change}%`);
  set('[data-hood-walk]', String(hood.walk));
  set('[data-hood-dom]', `${hood.dom} days`);
  set('[data-hood-schools]', hood.schools);
  set('[data-hood-transit]', hood.transit);
  const here = IDS.filter((id) => HOMES[id].hood === key).map((id) => `${HOMES[id].addr} (${money(HOMES[id].price)})`);
  set('[data-hood-homes]', `${here.length === 1 ? '1 home' : `${here.length} homes`} on this page: ${here.join(', ')}`);
  $('[data-hood-change]', panel)?.classList.toggle('is-down', change < 0);
  const { line, fill } = sparkPath(hood.trend);
  $('[data-hood-spark]', panel)?.setAttribute('d', line);
  $('[data-hood-spark-fill]', panel)?.setAttribute('d', fill);
  $$('.area').forEach((a) => a.classList.toggle('is-active', a.dataset.hoodOpen === key));
  panel.classList.add('is-open');
  $('.map')?.classList.add('has-hood');
};

const closeHood = () => {
  $('[data-hood-panel]')?.classList.remove('is-open');
  $('.map')?.classList.remove('has-hood');
  $$('.area').forEach((a) => a.classList.remove('is-active'));
};

/* ---------- booking ---------- */

const dayLabel = (key) => DAYS.find((d) => d.key === key)?.label || key;
const byWhen = (a, b) => DAY_ORDER[a.day] - DAY_ORDER[b.day] || a.time.localeCompare(b.time);

const openBook = (id) => {
  const h = HOMES[id];
  const modal = $('#book');
  if (!modal) return;
  state.book = { home: id, mode: 'In person', day: 'sat', time: null };
  const addr = $('[data-book-addr]', modal);
  if (addr) addr.textContent = fullAddr(h);
  $$('[data-book-mode]', modal).forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.bookMode === 'In person')));
  modal.classList.remove('is-done');
  const name = $('[data-book-name]', modal);
  if (name) name.value = '';
  const phone = $('[data-book-phone]', modal);
  if (phone) phone.value = '';
  const cal = $('[data-book-calendar]', modal);
  if (cal) {
    cal.setAttribute('aria-pressed', 'false');
    cal.textContent = 'Add to calendar';
  }
  renderBook();
  openOverlay('#book');
};

const renderBook = () => {
  const modal = $('#book');
  if (!modal) return;
  const days = $('[data-book-days]', modal);
  if (days) {
    days.innerHTML = DAYS.map((d) => {
      const free = d.times.filter((t) => !state.taken.has(`${d.key}|${t}`)).length;
      return `<button type="button" data-book-day="${d.key}" aria-pressed="${String(d.key === state.book.day)}">${d.label}<small>${free} free</small></button>`;
    }).join('');
  }
  const day = DAYS.find((d) => d.key === state.book.day);
  const times = $('[data-book-times]', modal);
  if (times && day) {
    times.innerHTML = day.times
      .map((t) => {
        const taken = state.taken.has(`${day.key}|${t}`);
        return `<button type="button" data-book-time="${t}" aria-pressed="${String(t === state.book.time)}"${taken ? ' disabled' : ''}>${t}${taken ? '<small>booked</small>' : ''}</button>`;
      })
      .join('');
  }
  const confirm = $('[data-book-confirm]', modal);
  if (confirm) {
    confirm.disabled = !state.book.time;
    confirm.textContent = state.book.time ? `Confirm ${day.label} at ${state.book.time}` : 'Pick a time';
  }
};

const confirmBook = () => {
  const modal = $('#book');
  const b = state.book;
  if (!modal || !b.home || !b.time) return;
  const h = HOMES[b.home];
  const name = ($('[data-book-name]', modal)?.value || '').trim();
  const who = name || 'You';
  state.taken.add(`${b.day}|${b.time}`);
  state.viewings.push({ day: b.day, time: b.time, home: b.home, who: name || 'Website visitor', mode: b.mode, status: 'Pending', mine: true, reminded: false });
  h.viewings += 1;
  state.leads.unshift({ who: name || 'Website visitor', via: 'Viewing request', when: 'Just now', today: true, what: `${b.mode} at ${h.addr} · ${dayLabel(b.day)} ${b.time}`, status: 'booked', hot: true, agent: 'Maya' });
  const summary = $('[data-book-summary]', modal);
  if (summary) {
    summary.textContent =
      b.mode === 'In person'
        ? `${who === 'You' ? 'Maya Chen will meet you' : `Maya Chen will meet ${who}`} at ${fullAddr(h)} on ${dayLabel(b.day)} at ${b.time}.`
        : `Maya Chen will walk ${who === 'You' ? 'you' : who} through ${fullAddr(h)} on video, ${dayLabel(b.day)} at ${b.time}. The link arrives by text 10 minutes before.`;
  }
  modal.classList.add('is-done');
  $('[data-book-done] .primary', modal)?.focus({ preventScroll: true });
  toast(`Viewing booked · ${dayLabel(b.day)} ${b.time} with Maya`);
  renderSaved();
  renderDesk();
};

/* ---------- alerts (saved search) ---------- */

const openAlerts = () => {
  const summary = $('[data-alert-summary]');
  if (summary) summary.textContent = searchSummary();
  state.freq = 'instantly';
  $$('[data-freq]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.freq === 'instantly')));
  const email = $('[data-alert-email]');
  if (email) email.value = '';
  openOverlay('#alerts');
  email?.focus({ preventScroll: true });
};

const saveSearch = (email) => {
  const summary = searchSummary();
  state.searches.push({ summary, email, freq: state.freq === 'instantly' ? 'Instantly' : state.freq === 'daily' ? 'Daily digest' : 'Weekly' });
  state.subs += 1;
  state.leads.unshift({ who: email, via: 'Saved search', when: 'Just now', today: true, what: `Alerts on: ${summary}`, status: 'new', hot: false, agent: 'Maya' });
  closeOverlay('#alerts');
  toast(`Alerts on · ${summary} · ${state.freq} to ${email}`);
  renderSaved();
  renderDesk();
};

/* ---------- valuation ---------- */

const runValuation = () => {
  const address = ($('[data-val-address]')?.value || '').trim();
  const type = $('[data-val-type]')?.value || 'detached';
  const beds = Number($('[data-val-beds]')?.value || 3);
  const baths = Number($('[data-val-baths]')?.value || 2);
  const est = estimate(type, beds, baths);
  state.lastEstimate = { address, type, beds, baths, ...est };
  const desc = $('[data-val-desc]');
  if (desc) desc.textContent = `${TYPE_LABEL[type]} · ${beds} bd · ${baths} ba`;
  const range = $('[data-val-range]');
  if (range) range.textContent = `${money(est.low)} – ${money(est.high)}`;
  const btn = $('[data-val-agent]');
  if (btn) {
    btn.disabled = false;
    btn.textContent = 'Have Maya confirm within 24h';
  }
  $('[data-val-result]')?.classList.add('is-open');
  toast(`Estimate ready for ${address}`);
};

const requestValuation = () => {
  const e = state.lastEstimate;
  if (!e) return;
  state.valuations.unshift({ address: e.address, type: e.type, beds: e.beds, baths: e.baths, status: 'New · call within 24h' });
  state.leads.unshift({ who: e.address, via: 'Home valuation', when: 'Just now', today: true, what: `Seller lead · ${TYPE_LABEL[e.type]} ${e.beds} bd / ${e.baths} ba · est. ${money(e.low)} – ${money(e.high)}`, status: 'new', hot: true, agent: 'Maya' });
  const btn = $('[data-val-agent]');
  if (btn) {
    btn.disabled = true;
    btn.textContent = 'Requested · Maya will call within 24h';
  }
  toast('Sent to Maya · she will call within 24 hours');
  renderDesk();
};

/* ---------- agent desk ---------- */

const renderDesk = () => {
  const set = (sel, text) => {
    const el = $(sel);
    if (el) el.textContent = text;
  };
  set('[data-stat-leads]', String(state.leads.filter((l) => l.today).length));
  set('[data-stat-viewings]', String(state.viewings.length));
  set('[data-stat-saves]', String(IDS.reduce((n, id) => n + HOMES[id].saves, 0)));
  set('[data-stat-subs]', String(state.subs));

  const leads = $('[data-lead-list]');
  if (leads) {
    const shown = state.leads.map((l, i) => ({ l, i })).filter(({ l }) => state.leadFilter === 'all' || l.status === state.leadFilter);
    leads.innerHTML = shown.length
      ? shown
          .map(
            ({ l, i }) => `<li class="lead is-${l.status}">
          <div class="lead-main">
            <div class="lead-top"><b>${escapeHtml(l.who)}</b><span class="pill">${l.status === 'booked' ? 'Booked' : l.status === 'contacted' ? 'Contacted' : 'New'}</span>${l.hot ? '<span class="hot">Hot</span>' : ''}</div>
            <p>${escapeHtml(l.what)}</p>
            <small>${l.via} · ${l.when} · with ${l.agent}</small>
          </div>
          <div class="lead-actions">
            <button type="button" data-lead-contact="${i}" aria-pressed="${String(l.status !== 'new')}"${l.status === 'booked' ? ' disabled' : ''}>${l.status === 'new' ? 'Mark contacted' : 'Contacted'}</button>
            <button type="button" data-lead-assign="${i}" aria-pressed="${String(l.agent === 'Ravi')}">${l.agent === 'Ravi' ? 'With Ravi' : 'Hand to Ravi'}</button>
          </div>
        </li>`
          )
          .join('')
      : '<li class="lead-none">Nothing here - every lead in this list has moved on.</li>';
  }

  const viewings = $('[data-viewing-list]');
  if (viewings) {
    viewings.innerHTML = state.viewings
      .map((v, i) => ({ v, i }))
      .sort((a, b) => byWhen(a.v, b.v))
      .map(
        ({ v, i }) => `<li class="viewing${v.status === 'Confirmed' ? ' is-confirmed' : ''}">
          <div class="when"><b>${dayLabel(v.day)}</b><span>${v.time}</span></div>
          <div class="viewing-main"><b>${escapeHtml(HOMES[v.home].addr)}</b><span>${escapeHtml(v.who)} · ${v.mode}</span></div>
          <div class="viewing-actions">
            <span class="pill">${v.status}</span>
            ${v.status === 'Confirmed' ? `<button type="button" data-viewing-remind="${i}" aria-pressed="${String(v.reminded)}">${v.reminded ? 'Reminder sent' : 'Send reminder'}</button>` : `<button type="button" data-viewing-confirm="${i}">Confirm</button>`}
          </div>
        </li>`
      )
      .join('');
  }

  const hot = $('[data-hot-list]');
  if (hot) {
    hot.innerHTML = IDS.map((id) => HOMES[id])
      .sort((a, b) => b.saves - a.saves)
      .map(
        (h) => `<li>
          <span class="thumb" style="--photo:${h.photo}"></span>
          <div class="hot-main"><b>${escapeHtml(h.addr)}</b><span>${money(h.price)} · ${escapeHtml(HOODS[h.hood].name)}</span></div>
          <div class="hot-nums"><b>${h.saves}</b><span>${h.views}</span><span>${h.viewings}</span></div>
        </li>`
      )
      .join('');
  }

  const vals = $('[data-val-list]');
  if (vals) {
    vals.innerHTML = state.valuations
      .map((v) => {
        const est = estimate(v.type, v.beds, v.baths);
        return `<li><div><b>${escapeHtml(v.address)}</b><span>${TYPE_LABEL[v.type]} · ${v.beds} bd · ${v.baths} ba · est. ${money(est.low)} – ${money(est.high)}</span></div><span class="pill">${escapeHtml(v.status)}</span></li>`;
      })
      .join('');
  }
};

const toggleDesk = () => {
  const ns = $('.ns');
  const btn = $('[data-desk-toggle]');
  if (!ns || !btn) return;
  const on = ns.classList.toggle('is-agent');
  btn.setAttribute('aria-pressed', String(on));
  const label = $('[data-desk-label]', btn);
  if (label) label.textContent = on ? 'Buyer view' : 'Agent view';
  if (on) {
    closeHood();
    renderDesk();
    $('#desk')?.scrollIntoView({ block: 'start', behavior: 'smooth' });
  }
};

/* ---------- wiring ---------- */

function init() {
  // Per-sheet extras (mortgage calculator, similar homes)
  IDS.forEach((id) => {
    const host = $(`[data-extras="${id}"]`);
    if (host) host.innerHTML = buildExtras(id);
    calcMortgage(id);
  });
  applyFilters();
  renderSaved();
  renderDesk();

  document.addEventListener('click', (event) => {
    const t = event.target;
    if (!(t instanceof Element)) return;
    const hit = (sel) => t.closest(sel);
    let el;

    // Type chips (mockups.js already toggled is-hidden by type; re-apply the
    // combined filters so price / beds / baths and the count stay in sync).
    if (hit('.filters [data-filter]')) {
      applyFilters();
      return;
    }
    if (hit('[data-reset-filters]')) {
      resetFilters();
      return;
    }

    // Save / compare
    if ((el = hit('[data-save]'))) {
      toggleSave(Number(el.dataset.save));
      return;
    }
    if (hit('[data-saved-open]')) {
      renderSaved();
      openOverlay('#saved');
      return;
    }
    if ((el = hit('[data-view]'))) {
      // Rendered after mockups.js wired data-open, so open the sheet here.
      closeOverlay('#saved');
      $(`#detail-${el.dataset.view}`)?.classList.add('is-open');
      return;
    }
    if (hit('[data-compare-open]')) {
      const table = $('[data-compare-table]');
      if (table) table.innerHTML = compareRows(IDS.filter((id) => state.picks.has(id)));
      openOverlay('#compare');
      return;
    }

    // Detail sheet tools
    if ((el = hit('[data-mortgage-toggle]'))) {
      const id = el.dataset.mortgageToggle;
      const panel = $(`[data-mortgage="${id}"]`);
      const open = panel?.classList.toggle('is-open');
      el.setAttribute('aria-expanded', String(!!open));
      el.textContent = open ? 'Hide payments' : 'Estimate payments';
      return;
    }
    if ((el = hit('[data-m-amort]'))) {
      const id = Number(el.closest('[data-mortgage]')?.dataset.mortgage);
      if (!id) return;
      (state.mortgage[id] || (state.mortgage[id] = { down: 20, rate: 4.75, years: 25 })).years = Number(el.dataset.mAmort);
      calcMortgage(id);
      return;
    }
    if ((el = hit('[data-switch]'))) {
      $('.detail.is-open')?.classList.remove('is-open');
      $(el.dataset.switch)?.classList.add('is-open');
      $(`${el.dataset.switch} .sheet`)?.scrollTo?.(0, 0);
      return;
    }

    // Neighbourhood snapshot
    if ((el = hit('[data-hood-open]'))) {
      const fromSheet = el.closest('.detail');
      if (fromSheet) fromSheet.classList.remove('is-open');
      openHood(el.dataset.hoodOpen);
      if (fromSheet || window.innerWidth <= 900) $('.map')?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      return;
    }
    if (hit('[data-hood-close]')) {
      closeHood();
      return;
    }

    // Booking
    if ((el = hit('[data-book]'))) {
      closeOverlay('#compare');
      openBook(Number(el.dataset.book));
      return;
    }
    if ((el = hit('[data-book-mode]'))) {
      state.book.mode = el.dataset.bookMode;
      $$('[data-book-mode]').forEach((b) => b.setAttribute('aria-pressed', String(b === el)));
      renderBook();
      return;
    }
    if ((el = hit('[data-book-day]'))) {
      state.book.day = el.dataset.bookDay;
      state.book.time = null;
      renderBook();
      return;
    }
    if ((el = hit('[data-book-time]'))) {
      state.book.time = el.dataset.bookTime;
      renderBook();
      return;
    }
    if (hit('[data-book-confirm]')) {
      confirmBook();
      return;
    }
    if ((el = hit('[data-book-calendar]'))) {
      const on = el.getAttribute('aria-pressed') !== 'true';
      el.setAttribute('aria-pressed', String(on));
      el.textContent = on ? 'Added to calendar' : 'Add to calendar';
      if (on) toast('Added to your calendar with a 1-hour reminder');
      return;
    }

    // Alerts
    if (hit('[data-alerts-open]')) {
      openAlerts();
      return;
    }
    if ((el = hit('[data-freq]'))) {
      state.freq = el.dataset.freq;
      $$('[data-freq]').forEach((b) => b.setAttribute('aria-pressed', String(b === el)));
      return;
    }

    // Valuation
    if (hit('[data-val-agent]')) {
      requestValuation();
      return;
    }

    // Agent desk
    if (hit('[data-desk-toggle]')) {
      toggleDesk();
      return;
    }
    if ((el = hit('[data-lead-filter]'))) {
      state.leadFilter = el.dataset.leadFilter;
      $$('[data-lead-filter]').forEach((b) => b.setAttribute('aria-pressed', String(b === el)));
      renderDesk();
      return;
    }
    if ((el = hit('[data-lead-contact]'))) {
      const lead = state.leads[Number(el.dataset.leadContact)];
      if (lead && lead.status !== 'booked') {
        lead.status = lead.status === 'new' ? 'contacted' : 'new';
        toast(lead.status === 'contacted' ? `${lead.who} marked contacted` : `${lead.who} back to new`);
        renderDesk();
      }
      return;
    }
    if ((el = hit('[data-lead-assign]'))) {
      const lead = state.leads[Number(el.dataset.leadAssign)];
      if (lead) {
        lead.agent = lead.agent === 'Ravi' ? 'Maya' : 'Ravi';
        toast(lead.agent === 'Ravi' ? `${lead.who} handed to Ravi Dhillon` : `${lead.who} back with Maya`);
        renderDesk();
      }
      return;
    }
    if ((el = hit('[data-viewing-confirm]'))) {
      const v = state.viewings[Number(el.dataset.viewingConfirm)];
      if (v) {
        v.status = 'Confirmed';
        toast(`Confirmed · ${v.who} gets a text now`);
        renderDesk();
      }
      return;
    }
    if ((el = hit('[data-viewing-remind]'))) {
      const v = state.viewings[Number(el.dataset.viewingRemind)];
      if (v) {
        v.reminded = !v.reminded;
        if (v.reminded) toast(`Reminder sent to ${v.who} for ${dayLabel(v.day)} ${v.time}`);
        renderDesk();
      }
      return;
    }

    // Click on the dimmed backdrop of my overlays closes them
    if (t.classList.contains('ns-overlay') && t.classList.contains('is-open')) {
      t.classList.remove('is-open');
    }
  });

  // Live inputs
  document.addEventListener('input', (event) => {
    const t = event.target;
    if (!(t instanceof HTMLElement)) return;
    if (t.matches('[data-price]')) {
      state.price = Number(t.value);
      applyFilters();
    } else if (t.matches('[data-beds]')) {
      state.beds = Number(t.value);
      applyFilters();
    } else if (t.matches('[data-baths]')) {
      state.baths = Number(t.value);
      applyFilters();
    } else if (t.matches('[data-sort]')) {
      state.sort = t.value in SORTS ? t.value : 'newest';
      applyFilters();
    } else if (t.matches('[data-m-down], [data-m-rate]')) {
      const id = Number(t.closest('[data-mortgage]')?.dataset.mortgage);
      if (!id) return;
      const m = state.mortgage[id] || (state.mortgage[id] = { down: 20, rate: 4.75, years: 25 });
      if (t.matches('[data-m-down]')) m.down = Number(t.value);
      else m.rate = Number(t.value);
      calcMortgage(id);
    }
  });

  document.addEventListener('change', (event) => {
    const t = event.target;
    if (!(t instanceof HTMLInputElement) || !t.matches('[data-compare-pick]')) return;
    const id = Number(t.dataset.comparePick);
    if (t.checked && state.picks.size < 3) state.picks.add(id);
    else state.picks.delete(id);
    renderSaved();
  });

  document.addEventListener('submit', (event) => {
    const form = event.target;
    if (!(form instanceof HTMLFormElement)) return;
    if (form.matches('[data-alert-form]')) {
      event.preventDefault();
      const email = ($('[data-alert-email]', form)?.value || '').trim();
      if (!email) return;
      saveSearch(email);
    } else if (form.matches('[data-valuation]')) {
      event.preventDefault();
      runValuation();
    }
  });

  // Hovering a card lights up its pin on the map
  document.addEventListener('mouseover', (event) => {
    const wrap = event.target instanceof Element ? event.target.closest('[data-cards] [data-home]') : null;
    if (!wrap) return;
    $$('.pin.is-hot').forEach((p) => p.classList.remove('is-hot'));
    $(`.pin[data-home="${wrap.dataset.home}"]`)?.classList.add('is-hot');
  });
  document.addEventListener('mouseout', (event) => {
    const wrap = event.target instanceof Element ? event.target.closest('[data-cards] [data-home]') : null;
    if (!wrap || wrap.contains(event.relatedTarget)) return;
    $(`.pin[data-home="${wrap.dataset.home}"]`)?.classList.remove('is-hot');
  });

  // Keyboard: SVG neighbourhood labels act as buttons; Escape closes the top overlay
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      if (closeTopmost()) event.preventDefault();
      return;
    }
    if ((event.key === 'Enter' || event.key === ' ') && event.target instanceof Element && event.target.matches('.area[data-hood-open]')) {
      event.preventDefault();
      openHood(event.target.dataset.hoodOpen);
    }
  });
}

if (document.readyState !== 'loading') init();
else document.addEventListener('DOMContentLoaded', init);
