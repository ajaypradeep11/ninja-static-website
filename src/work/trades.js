// Copper & Coil - plumbing + heating booking and dispatch.
// Loaded after mockups.js, which still owns the generic hooks
// (data-go / data-steps, data-select-group + data-out, data-scroll,
// data-filter + data-filter-target + data-type, data-collapse, data-say).
// This module layers the product on top: problem triage with an emergency
// path, the service-area check, the live estimate, the four-step booking
// flow, the job tracker (ETA + map + quote + invoice + review), the
// price-book search, the text-the-tech drawer, reschedule and payment
// dialogs, and the dispatch board staff view.
//
// Contract: JS only toggles classes / attributes / text content and builds
// strings. Every transition and animation lives in trades.css, and the
// reduced-motion block there switches all of them off. Nothing here reads
// the wall clock or Math.random - the ETA is a plain 1-second counter and
// every price is derived from fixed numbers.

const DIAGNOSTIC = 89;
const HST = 0.13;
const AFTER_HOURS = 70;
const CLUB_FEE = 19;
const CLUB_OFF = 0.15;
const CAPACITY_TOTAL = 7;
const ETA_START = 22;

const TECHS = {
  marcus: {
    name: 'Marcus Delaine',
    initials: 'MD',
    role: 'Gas &amp; heating · 11 years with Copper &amp; Coil',
    skills: 'Furnaces, boilers, gas lines',
    licence: 'TSSA G2-40118',
    rating: 4.9,
    jobs: 1842,
    note: 'On the 8–6 rotation',
  },
  priya: {
    name: 'Priya Raghunathan',
    initials: 'PR',
    role: 'Drains &amp; water · 8 years with Copper &amp; Coil',
    skills: 'Drains, camera work, sump pumps',
    licence: 'P-30877',
    rating: 4.8,
    jobs: 1190,
    note: 'On the 7–4 rotation',
  },
  ty: {
    name: 'Ty Bergeron',
    initials: 'TB',
    role: 'HVAC &amp; water heaters · 6 years with Copper &amp; Coil',
    skills: 'AC, heat pumps, tanks and tankless',
    licence: 'G2-51204',
    rating: 4.9,
    jobs: 964,
    note: 'After-hours rotation from 6 pm',
  },
};

const JOBTYPES = {
  heat: { label: 'Furnace no heat', phrase: 'a furnace no-heat call', low: 249, high: 540, cat: 'heating' },
  leak: { label: 'Water leak', phrase: 'a water leak', low: 340, high: 760, cat: 'water' },
  drain: { label: 'Blocked drain', phrase: 'a blocked drain', low: 189, high: 410, cat: 'drains' },
  water: { label: 'Water heater', phrase: 'a water heater call', low: 285, high: 470, cat: 'water' },
  ac: { label: 'AC not cooling', phrase: 'an AC no-cooling call', low: 229, high: 395, cat: 'cooling' },
  tuneup: { label: 'Furnace tune-up', phrase: 'a seasonal furnace tune-up', low: 169, high: 169, cat: 'heating' },
};

const TRIAGE = {
  heat: {
    job: 'heat',
    urgency: 'No heat is a same-day call. In September it is uncomfortable; below freezing it becomes a burst-pipe problem, so we hold furnace slots open every afternoon.',
    when: 'Today · furnace slots held',
    tip: 'Two things to try first, because they cancel about a third of our no-heat calls: flip the furnace switch on the joist or wall (it looks like a light switch) off and back on, and check the thermostat is set to Heat with fresh batteries.',
  },
  leak: {
    job: 'leak',
    urgent: true,
    urgency: 'Water actively leaking? Shut off the valve - we\'ll get someone there today.',
    when: 'Today · we bump the board for active leaks',
    tip: 'The main shut-off is usually where the water line enters the basement, near the meter. Turn it clockwise until it stops, then open a tap on the lowest floor to drain the line. Photograph the leak before you mop - it helps the tech and your insurer.',
  },
  drain: {
    job: 'drain',
    urgency: 'A single slow drain can wait for a normal window. If every drain in the house is backing up, that is the main stack and it needs someone today before it comes up through the basement floor.',
    when: 'Next available window',
    tip: 'Skip the drain chemicals - they cook the trap and the tech has to work around caustic water. A plunger and a kettle of hot (not boiling) water is the safe home attempt.',
  },
  water: {
    job: 'water',
    urgency: 'No hot water is usually an element or a thermostat, and it is a same-day fix. If the tank itself is weeping from the seam, it is replacement time and we will say so plainly.',
    when: 'Today or tomorrow morning',
    tip: 'Check the breaker panel first - a tripped 30-amp double breaker is a two-minute fix. If there is water on the floor around the tank, shut the cold inlet valve on top and call the after-hours line.',
  },
  ac: {
    job: 'ac',
    urgency: 'Blowing warm is rarely an emergency, but on a heat-warning day we prioritise homes with infants, seniors or anyone on oxygen. Tell us on the booking form and dispatch moves you up.',
    when: 'Within 24 hours',
    tip: 'Change or pull the furnace filter and check the outdoor unit is clear of grass clippings. A frozen indoor coil means turning the system to Fan Only for two hours before the tech arrives, or there is nothing to diagnose.',
  },
  other: {
    job: 'heat',
    urgency: 'Not on the list is fine - most of our work starts as "something is wrong and I do not know the word for it." Describe it on the booking form and dispatch routes it to the right trade.',
    when: 'Next available window',
    tip: 'A photo of the unit\'s rating plate and a short video of the noise it makes will get you a far more accurate quote before anyone knocks on your door.',
  },
};

const AREA_NAMES = {
  K1S: 'the Glebe', K1Y: 'Hintonburg', K1N: 'Lowertown', K2P: 'Centretown',
  K1H: 'Alta Vista', K2B: 'Britannia', K2K: 'Kanata', K2J: 'Barrhaven',
  K1C: 'Orléans', K1V: 'Riverside South', K1G: 'Elmvale Acres', K1Z: 'Westboro',
};

const QUOTE_OPTIONS = {
  good: { price: 289, label: 'Hot-surface ignitor replacement', short: 'Ignitor only' },
  better: { price: 429, label: 'Ignitor + flame sensor + burner clean and combustion test', short: 'Ignitor, sensor and clean' },
  best: { price: 649, label: 'Ignitor, flame sensor, burner clean, inducer service + 2-year parts &amp; labour warranty', short: 'Full service with warranty' },
};
const ADDON = { price: 95, label: 'Gas shut-off valve replacement (seized)' };

const TECH_REPLIES = [
  [/far|eta|when|long|away|min/i, "About 12 minutes - I'm at Bank and Fifth behind a bus. I'll text again when I turn onto your street."],
  [/park|driveway|door|side|garage/i, "Perfect, I'll take the driveway. I'll knock rather than ring so I don't wake anyone."],
  [/dog|cat|pet/i, "Dogs are no trouble - tell me his name and I'll say hello before I head down to the furnace."],
  [/humid|also|while you|add|look at/i, "Happy to look at that while I'm there. I'll price it separately and send it to your phone - nothing gets added to the bill unless you say yes."],
  [/cost|price|much|quote|charge/i, "I can't price it honestly until I see it. The flat-rate book is on the site, and you'll get the exact quote on your phone before I open the toolbag."],
  [/thank|thanks|great|perfect|ok/i, 'No problem at all. See you shortly.'],
  [/./, "Got it, thanks Jamie - noted on the work order. See you shortly."],
];

/* ---------- helpers ---------- */

const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
const escapeHtml = (s) =>
  String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const money = (n) => `$${n.toLocaleString('en-CA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const dollars = (n) => `$${Math.round(n).toLocaleString('en-CA')}`;
const setText = (sel, text) => $$(sel).forEach((el) => (el.textContent = text));

let toastTimer = 0;
const toast = (msg) => {
  const el = $('[data-cc-toast]');
  if (!el) return;
  el.textContent = msg;
  el.classList.add('is-shown');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('is-shown'), 3600);
};

const state = {
  jobType: 'heat',
  after: false,
  club: false,
  access: new Set(),
  photos: [],
  windowLabel: 'Today, Wed Sep 2 · 2–4 pm',
  windowTech: 'marcus',
  nextRef: 4477,
  job: {
    ref: 'CC-4477',
    stage: 0,
    tech: 'marcus',
    title: 'Furnace no heat · 214 Fifth Ave',
    win: 'Today, Wed Sep 2 · 2–4 pm arrival window',
    booked: false,
  },
  quote: { open: false, option: 'better', addon: false, settled: null },
  invoice: { open: false, paid: false },
  review: { stars: 0, posted: false },
  eta: ETA_START,
  etaTimer: 0,
  newWindow: null,
  payMethod: 'saved',
  boardTech: 'all',
  focusReturn: null,
};

// The dispatch board. Column index === the customer-facing stage index:
// 0 Unassigned · 1 Assigned · 2 En route · 3 On site · 4 Done.
const BOARD = [
  { ref: 'CC-4471', who: 'D. Okonjo', addr: '118 Bell St N', what: 'Furnace tune-up', win: '8–10 am', stage: 4, tech: 'marcus', pri: 'normal', value: 169 },
  { ref: 'CC-4472', who: 'R. Vaillancourt', addr: '2210 Alta Vista Dr', what: 'Kitchen drain blocked', win: '10–12', stage: 3, tech: 'priya', pri: 'normal', value: 189 },
  { ref: 'CC-4473', who: 'S. Beauchamp', addr: '47 Rideau Terr, Unit 3', what: 'Water heater weeping', win: '12–2 pm', stage: 2, tech: 'ty', pri: 'urgent', value: 1240 },
  { ref: 'CC-4474', who: 'A. Fortin', addr: '883 Merivale Rd', what: 'AC not cooling', win: '2–4 pm', stage: 1, tech: 'marcus', pri: 'normal', value: 395 },
  { ref: 'CC-4475', who: 'L. Nadeau', addr: '56 Springfield Rd', what: 'Burst pipe, basement flooding', win: 'ASAP', stage: 0, tech: null, pri: 'emergency', value: 760 },
  { ref: 'CC-4476', who: 'M. Sirois', addr: '305 Carruthers Ave', what: 'Furnace tune-up', win: '4–6 pm', stage: 0, tech: null, pri: 'normal', value: 169 },
  { ref: 'CC-4477', who: 'J. Whitfield', addr: '214 Fifth Ave', what: 'Furnace no heat', win: '2–4 pm', stage: 0, tech: null, pri: 'normal', value: 429, mine: true },
];
const mine = () => BOARD.find((j) => j.mine);

/* ---------- estimate ---------- */

function estimate() {
  const t = JOBTYPES[state.jobType];
  let low = t.low;
  let high = t.high;
  if (state.after) {
    low += AFTER_HOURS;
    high += AFTER_HOURS;
  }
  if (state.club) {
    low = Math.round(low * (1 - CLUB_OFF));
    high = Math.round(high * (1 - CLUB_OFF));
  }
  return { low, high };
}

function renderEstimate() {
  const { low, high } = estimate();
  setText('[data-cc-est-low]', dollars(low));
  setText('[data-cc-est-high]', dollars(high));
  setText('[data-cc-est-job]', JOBTYPES[state.jobType].phrase);

  const flags = [];
  if (state.after) flags.push(`after-hours +${dollars(AFTER_HOURS)}`);
  if (state.club) flags.push('Comfort Club −15%');
  setText('[data-cc-est-flags]', flags.join(' · '));

  const note = $('[data-cc-est-note]');
  if (note) {
    note.textContent = state.jobType === 'tuneup'
      ? 'Tune-ups are one flat price - no range, no upsell script. If we find something, you get a separate quote.'
      : state.after
        ? 'Evenings, Sundays and holidays carry a $70 dispatch fee. Comfort Club members never pay it.'
        : 'The range covers the usual causes for this job. Your quote on the day is one exact number.';
  }
}

/* ---------- triage ---------- */

function showTriage(key) {
  const out = $('[data-cc-triage-out]');
  const em = $('[data-cc-emergency]');
  $$('[data-cc-problem]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.ccProblem === key)));

  if (key === 'gas') {
    out.hidden = true;
    em.hidden = false;
    em.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    return;
  }
  em.hidden = true;

  const t = TRIAGE[key] || TRIAGE.other;
  const jt = JOBTYPES[t.job];
  out.hidden = false;
  out.classList.toggle('is-urgent', !!t.urgent);
  out.dataset.ccJobKey = t.job;
  $('[data-cc-urgency]').textContent = t.urgency;
  $('[data-cc-triage-job]').textContent = jt.label;
  $('[data-cc-triage-range]').textContent = jt.low === jt.high ? `${dollars(jt.low)} flat` : `${dollars(jt.low)} – ${dollars(jt.high)}`;
  $('[data-cc-triage-when]').textContent = t.when;
  $('[data-cc-triage-tip]').textContent = t.tip;
}

function clearTriage() {
  $$('[data-cc-problem]').forEach((b) => b.setAttribute('aria-pressed', 'false'));
  $('[data-cc-triage-out]').hidden = true;
  $('[data-cc-emergency]').hidden = true;
}

/* ---------- booking flow ---------- */

// Mirror of the mockups.js data-go behaviour, for programmatic jumps.
function setStep(n) {
  const app = $('.cc-book .app');
  if (!app) return;
  app.dataset.step = String(n);
  $$('.stepper li', app).forEach((li, i) => {
    li.classList.toggle('is-active', i + 1 === n);
    li.classList.toggle('is-done', i + 1 < n);
  });
}

function pickJob(key) {
  const btn = $(`.job[data-cc-job="${key}"]`);
  if (btn) btn.click(); // mockups.js handles the selection + data-out echo
  state.jobType = key;
  renderEstimate();
}

function renderAccess() {
  const labels = {
    dog: 'dog on site',
    gate: 'gate code needed',
    stairs: 'tight basement stairs',
    lockbox: 'lockbox entry - nobody home',
    shoes: 'boot covers please',
  };
  const picked = [...state.access].map((k) => labels[k]);
  const note = $('[data-cc-access-note]');
  const out = $('[data-cc-access-out]');
  $('[data-cc-gate-field]').hidden = !(state.access.has('gate') || state.access.has('lockbox'));

  if (!picked.length) {
    note.textContent = 'Nothing selected - the tech will ring the front bell.';
    out.textContent = 'Ring the front bell';
    return;
  }
  const text = picked.join(' · ');
  note.textContent = `On the work order: ${text}. Marcus sees this on his phone before he pulls in.`;
  out.textContent = text.charAt(0).toUpperCase() + text.slice(1);
}

function renderAddress() {
  const line = [$('#cc-addr').value.trim(), $('#cc-unit').value.trim()].filter(Boolean).join(', ');
  const city = `${$('#cc-city').value.trim()} ${$('#cc-pc').value.trim()}`.trim();
  $('[data-cc-addr-out]').textContent = [line, city].filter(Boolean).join(', ') || 'Address not set';
}

function renderPhotos() {
  const list = $('[data-cc-shots]');
  list.innerHTML = state.photos
    .map(
      (p, i) => `<li><span class="thumb" aria-hidden="true"></span>${escapeHtml(p.name)}<br />${escapeHtml(p.what)}
        <button type="button" class="drop-x" data-cc-photo-remove="${i}" aria-label="Remove ${escapeHtml(p.name)}">×</button></li>`
    )
    .join('');
  $('[data-cc-photo]').classList.toggle('is-full', state.photos.length >= 3);
}

/* ---------- job tracker ---------- */

const STAGE_LINES = [
  'Dispatch has your job. A tech is assigned when the morning board is built - or right away if you picked a today window.',
  'Assigned. Your tech has the work order, the model number and your access notes on his phone.',
  'On the way. You would have had a text with his photo and the van plate a minute ago.',
  'On site. He diagnoses first, then sends a flat-rate quote to your phone. Nothing starts until you approve it.',
  'Complete. The furnace ran through two full cycles before he packed up, and your invoice is below.',
];
const STAGE_NAMES = ['Booked', 'Assigned', 'On the way', 'On site', 'Complete'];
const ADVANCE_LABELS = [
  'Simulate: assign a tech →',
  'Simulate: tech leaves for you →',
  'Simulate: tech arrives →',
  'Simulate: work finished →',
  'Job closed',
];

function stopEta() {
  clearInterval(state.etaTimer);
  state.etaTimer = 0;
}

function etaSub(min) {
  const km = (min * 0.28).toFixed(1);
  if (min > 15) return `Van 4 left the Bells Corners depot · ${km} km out`;
  if (min > 5) return `Heading east on Carling Ave · ${km} km out`;
  if (min > 0) return `On Fifth Ave now · looking for a spot in the driveway`;
  return 'Pulling up outside';
}

function startEta() {
  stopEta();
  state.eta = ETA_START;
  $('[data-cc-eta]').textContent = String(state.eta);
  $('[data-cc-eta-sub]').textContent = etaSub(state.eta);
  state.etaTimer = setInterval(() => {
    state.eta -= 1;
    if (state.eta <= 0) {
      stopEta();
      setStage(3, 'Marcus is at the door.');
      return;
    }
    $('[data-cc-eta]').textContent = String(state.eta);
    $('[data-cc-eta-sub]').textContent = etaSub(state.eta);
  }, 1000);
}

function setStage(n, msg) {
  const job = mine();
  state.job.stage = n;
  if (job) {
    job.stage = n;
    if (n >= 1 && !job.tech) job.tech = state.windowTech;
  }
  state.job.tech = (job && job.tech) || state.windowTech;
  if (n === 3 && !state.quote.settled) state.quote.open = true;
  if (n === 4) {
    state.invoice.open = true;
    state.quote.open = state.quote.open || !!state.quote.settled;
  }
  if (n !== 2) stopEta();
  renderTrack();
  renderBoard();
  if (msg) toast(msg);
}

function renderTechCards() {
  const key = TECHS[state.job.tech] ? state.job.tech : 'marcus';
  const t = TECHS[key];
  const extra = state.review.posted ? 1 : 0;
  // CSS owns the per-tech colour; JS only stamps which tech this is.
  $$('[data-cc-tech-ava]').forEach((el) => {
    el.textContent = t.initials;
    el.dataset.tech = key;
  });
  $$('[data-cc-tech-name]').forEach((el) => (el.textContent = t.name));
  $$('[data-cc-tech-role]').forEach((el) => (el.innerHTML = t.role));
  $$('[data-cc-tech-meta]').forEach(
    (el) => (el.textContent = `${t.rating} ★ · ${(t.jobs + extra).toLocaleString('en-CA')} jobs · Licence ${t.licence}`)
  );
  const head = $('#cc-thread .drawer-head');
  if (head) {
    $('.ava', head).textContent = t.initials;
    $('.ava', head).dataset.tech = key;
    $('#cc-thread-title').textContent = t.name;
  }
}

function renderTrack() {
  const card = $('[data-cc-jobcard]');
  const n = state.job.stage;
  card.dataset.stage = String(n);
  $('[data-cc-job-ref]').textContent = state.job.ref;
  $('[data-cc-job-title]').textContent = state.job.title;
  $('[data-cc-job-win]').textContent = state.job.win;
  $('[data-cc-job-status]').textContent = STAGE_NAMES[n];
  $('[data-cc-job-line]').textContent = STAGE_LINES[n];

  $$('[data-cc-rail]').forEach((li) => {
    const i = Number(li.dataset.ccRail);
    li.classList.toggle('is-done', i < n);
    li.classList.toggle('is-now', i === n);
  });

  $('[data-cc-track-tech]').hidden = n < 1;
  $('[data-cc-enroute]').hidden = n !== 2;
  if (n === 2 && !state.etaTimer) startEta();

  $('[data-cc-quote]').hidden = !state.quote.open;
  $('[data-cc-invoice]').hidden = !state.invoice.open;
  $('[data-cc-review]').hidden = !state.invoice.paid;

  const adv = $('[data-cc-advance]');
  adv.textContent = ADVANCE_LABELS[n];
  adv.disabled = n >= 4;

  renderTechCards();
  renderQuote();
  renderInvoice();
}

/* ---------- quote ---------- */

function quoteRepair() {
  return QUOTE_OPTIONS[state.quote.option].price + (state.quote.addon ? ADDON.price : 0);
}

function renderQuote() {
  const wrap = $('[data-cc-quote]');
  $$('[data-cc-quote-opt]').forEach((b) => {
    const on = b.dataset.ccQuoteOpt === state.quote.option;
    b.classList.toggle('is-selected', on);
    b.setAttribute('aria-pressed', String(on));
  });
  $('[data-cc-quote-total]').textContent = money(quoteRepair());
  $('[data-cc-quote-note]').textContent = state.club
    ? 'before HST · diagnostic waived · Comfort Club 15% comes off at the invoice'
    : 'before HST · the $89 diagnostic is waived when you approve';

  const st = $('[data-cc-quote-state]');
  wrap.classList.toggle('is-settled', !!state.quote.settled);
  if (state.quote.settled === 'approved') {
    st.hidden = false;
    st.classList.remove('is-declined');
    st.textContent = `Approved ${money(quoteRepair())} - ${QUOTE_OPTIONS[state.quote.option].short}${state.quote.addon ? ' plus the shut-off valve' : ''}. Marcus started at 3:04 pm.`;
  } else if (state.quote.settled === 'declined') {
    st.hidden = false;
    st.classList.add('is-declined');
    st.textContent = 'Declined for today. Marcus has left the written quote with you - it holds for 30 days. Only the $89 diagnostic is billed.';
  } else {
    st.hidden = true;
  }
}

/* ---------- invoice ---------- */

function invoiceTotals() {
  const approved = state.quote.settled === 'approved';
  const repair = approved ? quoteRepair() : 0;
  const clubDiscount = approved && state.club ? Math.round(repair * CLUB_OFF * 100) / 100 : 0;
  const clubFee = state.club ? CLUB_FEE : 0;
  const diagnostic = DIAGNOSTIC;
  const waived = approved ? DIAGNOSTIC : 0;
  const subtotal = repair + diagnostic - waived - clubDiscount + clubFee;
  const tax = Math.round(subtotal * HST * 100) / 100;
  return { approved, repair, clubDiscount, clubFee, diagnostic, waived, subtotal, tax, total: Math.round((subtotal + tax) * 100) / 100 };
}

function renderInvoice() {
  const body = $('[data-cc-inv-lines]');
  const foot = $('[data-cc-inv-foot]');
  if (!body || !foot) return;
  const t = invoiceTotals();
  const rows = [];

  if (t.approved) {
    const opt = QUOTE_OPTIONS[state.quote.option];
    rows.push(['Repair · flat rate', opt.label, money(opt.price), '']);
    if (state.quote.addon) rows.push(['Add-on', ADDON.label, money(ADDON.price), '']);
    rows.push(['Diagnostic visit', 'Fault found: cracked ignitor, carboned flame sensor', money(t.diagnostic), '']);
    rows.push(['Diagnostic waived', 'Repair approved the same visit', `−${money(t.waived)}`, 'is-credit']);
  } else {
    rows.push(['Diagnostic visit', 'Fault identified and written up · repair declined', money(t.diagnostic), '']);
  }
  if (t.clubDiscount) rows.push(['Comfort Club discount', '15% off the repair, applied today', `−${money(t.clubDiscount)}`, 'is-credit']);
  if (t.clubFee) rows.push(['Comfort Club', 'First month · two tune-ups a year, priority booking', money(t.clubFee), '']);

  body.innerHTML = rows
    .map(([a, b, c, cls]) => `<tr><th scope="row">${a}</th><td>${b}</td><td class="num ${cls}">${c}</td></tr>`)
    .join('');
  foot.innerHTML = `
    <tr><th scope="row">Subtotal</th><td></td><td class="num">${money(t.subtotal)}</td></tr>
    <tr><th scope="row">HST 13%</th><td>Reg. 81992 4471 RT0001</td><td class="num">${money(t.tax)}</td></tr>`;

  $('[data-cc-inv-ref]').textContent = state.job.ref;
  $('[data-cc-pay-ref]').textContent = state.job.ref;
  $('[data-cc-inv-total]').textContent = money(t.total);
  setText('[data-cc-pay-amount]', money(t.total));
  $('[data-cc-invoice]').classList.toggle('is-paid', state.invoice.paid);
}

/* ---------- price book ---------- */

function renderPricebook() {
  const q = ($('[data-cc-search]').value || '').trim().toLowerCase();
  let shown = 0;
  $$('.prow', $('[data-cc-pricebook]')).forEach((row) => {
    const hay = `${row.dataset.name || ''} ${row.textContent}`.toLowerCase();
    const miss = q && !hay.includes(q);
    row.classList.toggle('is-nomatch', !!miss);
    if (!miss && !row.classList.contains('is-hidden')) shown += 1;
  });
  $('[data-cc-found]').textContent = shown === 1 ? '1 job' : `${shown} jobs`;
  $('[data-cc-price-empty]').hidden = shown > 0;
}

/* ---------- overlays ---------- */

function openDispatch() {
  const el = $('[data-cc-dispatch]');
  state.focusReturn = document.activeElement;
  el.classList.add('is-open');
  document.body.classList.add('cc-lock');
  $('[data-cc-dispatch-open]').setAttribute('aria-expanded', 'true');
  $$('[data-cc-view]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.ccView === 'dispatch')));
  el.focus({ preventScroll: true });
}

function closeDispatch() {
  const el = $('[data-cc-dispatch]');
  el.classList.remove('is-open');
  document.body.classList.remove('cc-lock');
  $('[data-cc-dispatch-open]').setAttribute('aria-expanded', 'false');
  $$('[data-cc-view]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.ccView === 'home')));
  if (state.focusReturn && document.contains(state.focusReturn)) state.focusReturn.focus({ preventScroll: true });
}

function openThread() {
  const el = $('[data-cc-thread]');
  el.classList.add('is-open');
  $('[data-cc-thread-close]').focus({ preventScroll: true });
}

const closeThread = () => $('[data-cc-thread]').classList.remove('is-open');

function openModal(sel) {
  const el = $(sel);
  el.classList.add('is-open');
  $('.cc-modal-card', el).focus({ preventScroll: true });
}

const closeModal = (sel) => $(sel).classList.remove('is-open');

function threadSay(role, from, text) {
  const li = document.createElement('li');
  li.className = `msg ${role}`;
  li.innerHTML = `<span class="from">${escapeHtml(from)}</span><p>${escapeHtml(text)}</p>`;
  const list = $('[data-cc-thread-list]');
  list.appendChild(li);
  list.scrollTop = list.scrollHeight;
}

function sendToTech(text) {
  const clean = text.trim();
  if (!clean) return;
  threadSay('me', 'You · now', clean);
  const reply = TECH_REPLIES.find(([re]) => re.test(clean))[1];
  setTimeout(() => threadSay('them', `${TECHS[state.job.tech].name.split(' ')[0]} · now`, reply), 700);
}

/* ---------- dispatch board ---------- */

const COLS = [
  { i: 0, name: 'Unassigned' },
  { i: 1, name: 'Assigned' },
  { i: 2, name: 'En route' },
  { i: 3, name: 'On site' },
  { i: 4, name: 'Done' },
];

function jobCardHtml(j) {
  const t = j.tech ? TECHS[j.tech] : null;
  const acts =
    j.stage === 0
      ? Object.keys(TECHS)
          .map((k) => `<button type="button" data-cc-assign="${j.ref}|${k}">→ ${TECHS[k].name.split(' ')[0]}</button>`)
          .join('')
      : j.stage < 4
        ? `<button type="button" data-cc-move="${j.ref}|1">Advance →</button><button type="button" data-cc-move="${j.ref}|-1">← Back</button>`
        : `<button type="button" data-cc-move="${j.ref}|-1">← Reopen</button>`;
  return `<article class="jcard${j.mine ? ' is-mine' : ''}${j.pri === 'emergency' ? ' is-emergency' : ''}">
    <span class="jref">${escapeHtml(j.ref)}${j.mine ? ' · this demo' : ''}</span>
    <b>${escapeHtml(j.what)}</b>
    <span class="jmeta">${escapeHtml(j.who)} · ${escapeHtml(j.addr)}<br />${escapeHtml(j.win)}${j.pri === 'emergency' ? ' · EMERGENCY' : j.pri === 'urgent' ? ' · urgent' : ''}</span>
    ${t ? `<span class="jtech">${escapeHtml(t.name)}</span>` : ''}
    <div class="jacts">${acts}</div>
  </article>`;
}

function renderBoard() {
  const board = $('[data-cc-board]');
  if (!board) return;
  const visible = BOARD.filter((j) => state.boardTech === 'all' || j.tech === state.boardTech);
  board.innerHTML = COLS.map((c) => {
    const jobs = visible.filter((j) => j.stage === c.i);
    return `<section class="col" aria-label="${c.name}">
      <header class="col-head">${c.name} <b>${jobs.length}</b></header>
      ${jobs.length ? jobs.map(jobCardHtml).join('') : '<p class="col-empty">Nothing here.</p>'}
    </section>`;
  }).join('');
  renderRoster();
  renderEmq();
  renderKpis();
}

function renderRoster() {
  const list = $('[data-cc-roster]');
  if (!list) return;
  list.innerHTML = Object.entries(TECHS)
    .map(([k, t]) => {
      const active = BOARD.filter((j) => j.tech === k && j.stage >= 1 && j.stage <= 3).length;
      const cls = active === 0 ? 'free' : active >= 3 ? 'off' : 'busy';
      const label = active === 0 ? 'Free now' : active === 1 ? 'On one job' : `${active} jobs in hand`;
      return `<li>
        <span class="ava" data-tech="${k}" aria-hidden="true">${t.initials}</span>
        <b>${escapeHtml(t.name)}</b>
        <span>${escapeHtml(t.skills)} · ${escapeHtml(t.note)}</span>
        <span class="avail ${cls}">${label}</span>
      </li>`;
    })
    .join('');
}

function renderEmq() {
  const wrap = $('[data-cc-emq]');
  const list = $('[data-cc-emq-list]');
  if (!wrap || !list) return;
  const q = BOARD.filter((j) => j.pri === 'emergency' && j.stage === 0);
  $('[data-cc-emq-count]').textContent = String(q.length);
  wrap.classList.toggle('is-clear', q.length === 0);
  list.innerHTML = q.length
    ? q
        .map(
          (j) => `<li><b>${escapeHtml(j.ref)} · ${escapeHtml(j.what)}</b><span>${escapeHtml(j.who)} · ${escapeHtml(j.addr)} · called 14 min ago</span>
            <button type="button" class="btn btn-primary btn-sm" data-cc-assign="${j.ref}|priya">Send Priya now</button></li>`
        )
        .join('')
    : '<li><b>All clear</b><span>No emergencies waiting. Next check-in with the after-hours line at 6 pm.</span></li>';
}

function renderKpis() {
  const assigned = BOARD.filter((j) => j.stage >= 1).length;
  const open = BOARD.filter((j) => j.stage === 0).length;
  const rev = BOARD.filter((j) => j.stage >= 1).reduce((s, j) => s + j.value, 0);
  const left = Math.max(0, CAPACITY_TOTAL - assigned);
  $('[data-cc-capacity]').textContent = left === 1 ? '1 slot left' : `${left} slots left`;
  $('[data-cc-kpi-jobs]').textContent = String(BOARD.length);
  $('[data-cc-kpi-open]').textContent = String(open);
  $('[data-cc-kpi-rev]').textContent = dollars(rev);
}

function boardAssign(ref, tech) {
  const j = BOARD.find((x) => x.ref === ref);
  if (!j) return;
  j.tech = tech;
  j.stage = Math.max(1, j.stage);
  if (j.mine) {
    state.job.tech = tech;
    setStage(j.stage);
  }
  renderBoard();
  toast(`${TECHS[tech].name} assigned to ${ref}${j.mine ? " - the homeowner's tracker just updated" : ''}.`);
}

function boardMove(ref, dir) {
  const j = BOARD.find((x) => x.ref === ref);
  if (!j) return;
  const next = Math.min(4, Math.max(0, j.stage + dir));
  if (j.mine) {
    if (next === 4 && !state.quote.settled) {
      toast('That job has an unapproved quote - the homeowner has to answer it first.');
      return;
    }
    setStage(next);
    toast(`${ref} moved to ${STAGE_NAMES[next]}.`);
    renderBoard();
    return;
  }
  j.stage = next;
  if (next === 0) j.tech = null;
  renderBoard();
  toast(`${ref} moved to ${COLS[next].name}.`);
}

/* ---------- init ---------- */

function init() {
  if (!$('.cc')) return;

  document.addEventListener('click', (event) => {
    const el = event.target.closest('button, a');
    if (!el) return;

    /* --- triage --- */
    if (el.matches('[data-cc-problem]')) {
      showTriage(el.dataset.ccProblem);
      return;
    }
    if (el.matches('[data-cc-triage-clear]')) {
      clearTriage();
      return;
    }
    if (el.matches('[data-cc-triage-book]')) {
      const key = $('[data-cc-triage-out]').dataset.ccJobKey || 'heat';
      pickJob(key);
      setStep(1);
      $('#cc-book').scrollIntoView({ block: 'start', behavior: 'smooth' });
      toast(`Booking form pre-filled with "${JOBTYPES[key].label}".`);
      return;
    }
    if (el.matches('[data-cc-triage-price]')) {
      const key = $('[data-cc-triage-out]').dataset.ccJobKey || 'heat';
      const chip = $(`.chips [data-filter="${JOBTYPES[key].cat}"]`);
      if (chip) chip.click();
      $('#cc-prices').scrollIntoView({ block: 'start', behavior: 'smooth' });
      return;
    }

    /* --- price book --- */
    if (el.matches('[data-filter]')) {
      el.parentElement.querySelectorAll('[data-filter]').forEach((c) => c.setAttribute('aria-pressed', String(c === el)));
      renderPricebook();
      return;
    }
    if (el.matches('[data-cc-book-row]')) {
      pickJob(el.dataset.ccBookRow);
      setStep(1);
      $('#cc-book').scrollIntoView({ block: 'start', behavior: 'smooth' });
      toast('Job type set. Tell us a bit more and pick a window.');
      return;
    }

    /* --- booking flow --- */
    if (el.matches('[data-cc-job]')) {
      state.jobType = el.dataset.ccJob;
      renderEstimate();
      return;
    }
    if (el.matches('[data-cc-reminder-book]')) {
      pickJob('tuneup');
      setStep(1);
      $('[data-cc-reminder]').classList.add('is-done');
      $('#cc-detail').value = 'Annual furnace tune-up - Lennox ML193, installed 2013. Last serviced Oct 14, 2025.';
      $('#cc-detail').dispatchEvent(new Event('input', { bubbles: true }));
      toast('Tune-up pre-filled, including your furnace model. Just pick a window.');
      return;
    }
    if (el.matches('[data-cc-photo]')) {
      const shots = [
        { name: 'IMG_2418.jpg', what: 'Rating plate' },
        { name: 'IMG_2419.jpg', what: 'Furnace front' },
        { name: 'IMG_2421.jpg', what: 'Error code' },
      ];
      if (state.photos.length >= 3) {
        toast('Three photos is plenty - that is more than most techs get.');
        return;
      }
      state.photos.push(shots[state.photos.length]);
      renderPhotos();
      return;
    }
    if (el.matches('[data-cc-photo-remove]')) {
      state.photos.splice(Number(el.dataset.ccPhotoRemove), 1);
      renderPhotos();
      return;
    }
    if (el.matches('[data-cc-access]')) {
      const k = el.dataset.ccAccess;
      const on = !state.access.has(k);
      if (on) state.access.add(k);
      else state.access.delete(k);
      el.setAttribute('aria-pressed', String(on));
      renderAccess();
      return;
    }
    if (el.matches('[data-select-group="window"]')) {
      state.windowLabel = el.dataset.label;
      state.windowTech = el.dataset.ccTech;
      state.after = el.dataset.ccAfter === '1';
      $('[data-cc-after-switch]').checked = state.after;
      setText('[data-cc-window-tech]', TECHS[state.windowTech].name);
      renderEstimate();
      return;
    }
    if (el.matches('[data-cc-confirm]')) {
      const job = mine();
      state.job.ref = `CC-${state.nextRef}`;
      state.job.title = `${JOBTYPES[state.jobType].label} · ${$('#cc-addr').value.trim()}`;
      state.job.win = `${state.windowLabel} arrival window`;
      state.job.tech = state.windowTech;
      state.job.booked = true;
      state.quote = { open: false, option: 'better', addon: false, settled: null };
      state.invoice = { open: false, paid: false };
      state.review = { stars: 0, posted: false };
      $$('[data-cc-star]').forEach((b) => {
        b.classList.remove('is-lit');
        b.setAttribute('aria-pressed', 'false');
      });
      $('[data-cc-review-thanks]').hidden = true;
      $('[data-cc-review-send]').disabled = true;
      if (job) {
        job.ref = state.job.ref;
        job.what = JOBTYPES[state.jobType].label;
        job.addr = $('#cc-addr').value.trim();
        job.win = state.windowLabel.split('·').pop().trim();
        job.value = estimate().high;
        job.tech = null;
        job.stage = 0;
      }
      setText('[data-cc-ref]', state.job.ref);
      setStage(0);
      renderBoard();
      toast(`Booked - ${state.job.ref}. A confirmation text is on its way to (613) 555-0198.`);
      return;
    }

    /* --- tracker --- */
    if (el.matches('[data-cc-advance]')) {
      const n = state.job.stage;
      if (n === 3 && !state.quote.settled) {
        toast('Approve or decline the quote first - Marcus will not start without it.');
        return;
      }
      if (n < 4) setStage(n + 1);
      return;
    }
    if (el.matches('[data-cc-thread-open]')) {
      openThread();
      return;
    }
    if (el.matches('[data-cc-thread-close]')) {
      closeThread();
      return;
    }
    if (el.matches('[data-cc-thread-chip]')) {
      sendToTech(el.dataset.ccThreadChip);
      return;
    }
    if (el.matches('[data-cc-reschedule]')) {
      state.newWindow = null;
      $$('[data-cc-newwin]').forEach((b) => b.setAttribute('aria-pressed', 'false'));
      $('[data-cc-modal-ok]').disabled = true;
      openModal('[data-cc-modal]');
      return;
    }
    if (el.matches('[data-cc-newwin]')) {
      state.newWindow = el.dataset.ccNewwin;
      $$('[data-cc-newwin]').forEach((b) => b.setAttribute('aria-pressed', String(b === el)));
      $('[data-cc-modal-ok]').disabled = false;
      return;
    }
    if (el.matches('[data-cc-modal-ok]')) {
      if (!state.newWindow) return;
      const [label, tech] = state.newWindow.split('|');
      state.windowLabel = label;
      state.windowTech = tech;
      state.job.win = `${label} arrival window`;
      state.job.tech = tech;
      const job = mine();
      if (job) {
        job.tech = tech;
        job.win = label.split('·').pop().trim();
      }
      setText('[data-cc-window-tech]', TECHS[tech].name);
      closeModal('[data-cc-modal]');
      setStage(1, `Moved to ${label}. Your old slot is back on the board for the emergency list.`);
      return;
    }
    if (el.matches('[data-cc-modal-close]')) {
      closeModal('[data-cc-modal]');
      return;
    }

    /* --- quote --- */
    if (el.matches('[data-cc-quote-opt]')) {
      state.quote.option = el.dataset.ccQuoteOpt;
      renderQuote();
      renderInvoice();
      return;
    }
    if (el.matches('[data-cc-quote-approve]')) {
      state.quote.settled = 'approved';
      renderQuote();
      renderInvoice();
      renderBoard();
      toast('Approved. Marcus has the go-ahead and the parts are on the van.');
      return;
    }
    if (el.matches('[data-cc-quote-decline]')) {
      state.quote.settled = 'declined';
      renderQuote();
      renderInvoice();
      toast('Declined. Only the $89 diagnostic is billed, and the written quote holds for 30 days.');
      return;
    }
    if (el.matches('[data-cc-quote-ask]')) {
      openThread();
      sendToTech(`About the ${money(quoteRepair())} quote - how much of that is parts, and does the warranty cover the board too?`);
      return;
    }

    /* --- invoice + payment --- */
    if (el.matches('[data-cc-pay-open]')) {
      openModal('[data-cc-pay]');
      return;
    }
    if (el.matches('[data-cc-pay-close]')) {
      closeModal('[data-cc-pay]');
      return;
    }
    if (el.matches('[data-cc-pay-method]')) {
      state.payMethod = el.dataset.ccPayMethod;
      $$('[data-cc-pay-method]').forEach((b) => {
        b.classList.toggle('is-selected', b === el);
        b.setAttribute('aria-pressed', String(b === el));
      });
      $('[data-cc-pay-card]').hidden = state.payMethod !== 'new';
      return;
    }
    if (el.matches('[data-cc-pay-go]')) {
      const t = invoiceTotals();
      state.invoice.paid = true;
      closeModal('[data-cc-pay]');
      const how =
        state.payMethod === 'etransfer'
          ? 'An e-Transfer request for'
          : state.payMethod === 'new'
            ? 'Charged to the new card:'
            : 'Charged to Visa •••• 4242:';
      const paid = $('[data-cc-inv-paid]');
      paid.hidden = false;
      paid.textContent = `${how} ${money(t.total)}. Receipt and the signed work order emailed to jamie.whitfield@example.com${state.club ? '. Comfort Club starts today - your spring AC tune-up is already on the board.' : '.'}`;
      renderTrack();
      toast('Paid. Receipt emailed - and the two-year warranty is registered under your address.');
      return;
    }

    /* --- review --- */
    if (el.matches('[data-cc-star]')) {
      const n = Number(el.dataset.ccStar);
      state.review.stars = n;
      $$('[data-cc-star]').forEach((b) => {
        b.classList.toggle('is-lit', Number(b.dataset.ccStar) <= n);
        b.setAttribute('aria-pressed', String(Number(b.dataset.ccStar) === n));
      });
      $('[data-cc-review-send]').disabled = false;
      return;
    }

    /* --- dispatch board --- */
    if (el.matches('[data-cc-view]')) {
      if (el.dataset.ccView === 'dispatch') openDispatch();
      else closeDispatch();
      return;
    }
    if (el.matches('[data-cc-dispatch-open]')) {
      openDispatch();
      return;
    }
    if (el.matches('[data-cc-dispatch-close]')) {
      closeDispatch();
      return;
    }
    if (el.matches('[data-cc-board-tech]')) {
      state.boardTech = el.dataset.ccBoardTech;
      $$('[data-cc-board-tech]').forEach((b) => b.setAttribute('aria-pressed', String(b === el)));
      renderBoard();
      return;
    }
    if (el.matches('[data-cc-assign]')) {
      const [ref, tech] = el.dataset.ccAssign.split('|');
      boardAssign(ref, tech);
      return;
    }
    if (el.matches('[data-cc-move]')) {
      const [ref, dir] = el.dataset.ccMove.split('|');
      boardMove(ref, Number(dir));
    }
  });

  /* --- inputs --- */
  document.addEventListener('input', (event) => {
    const el = event.target;
    if (el.id === 'cc-detail') {
      $('[data-cc-count]').textContent = `${el.value.length}/240`;
      return;
    }
    if (el.matches('[data-cc-search]')) {
      renderPricebook();
      return;
    }
    if (['cc-addr', 'cc-unit', 'cc-city', 'cc-pc'].includes(el.id)) renderAddress();
  });

  document.addEventListener('change', (event) => {
    const el = event.target;
    if (el.matches('[data-cc-after-switch]')) {
      state.after = el.checked;
      renderEstimate();
      return;
    }
    if (el.matches('[data-cc-club]') || el.matches('[data-cc-club-add]')) {
      state.club = el.checked;
      const other = el.matches('[data-cc-club]') ? $('[data-cc-club-add]') : $('[data-cc-club]');
      if (other) other.checked = state.club;
      renderEstimate();
      renderQuote();
      renderInvoice();
      return;
    }
    if (el.matches('[data-cc-addon]')) {
      state.quote.addon = el.checked;
      renderQuote();
      renderInvoice();
    }
  });

  /* --- forms --- */
  $('[data-cc-area-form]').addEventListener('submit', (event) => {
    event.preventDefault();
    const raw = ($('#cc-postal').value || '').replace(/\s+/g, '').toUpperCase();
    const out = $('[data-cc-area-out]');
    out.classList.remove('is-ok', 'is-no');
    if (!/^[A-Z]\d[A-Z]/.test(raw)) {
      out.textContent = 'That does not look like a Canadian postal code yet - try the first three characters, e.g. K1S.';
      return;
    }
    const fsa = raw.slice(0, 3);
    if (fsa >= 'K1A' && fsa <= 'K4C') {
      const hood = AREA_NAMES[fsa];
      out.classList.add('is-ok');
      out.textContent = `${fsa}${hood ? ` - ${hood}` : ''}: that's us. Standard rates, no travel charge, and a van is usually within 20 minutes.`;
    } else {
      out.classList.add('is-no');
      out.textContent = `${fsa} is outside the area our vans cover, and we would rather say so than turn up two hours late. For that end of the valley, Rideau Mechanical at (613) 555-0177 do good work - tell them we sent you.`;
    }
  });

  $('[data-cc-thread-form]').addEventListener('submit', (event) => {
    event.preventDefault();
    const input = $('#cc-thread-input');
    sendToTech(input.value);
    input.value = '';
  });

  $('[data-cc-review-form]').addEventListener('submit', (event) => {
    event.preventDefault();
    if (!state.review.stars) return;
    state.review.posted = true;
    const box = $('[data-cc-review-thanks]');
    box.hidden = false;
    box.textContent = `Thanks - ${state.review.stars} star${state.review.stars === 1 ? '' : 's'} posted to ${TECHS[state.job.tech].name}'s profile. It shows on his card in about a minute, and the whole crew sees it Monday.`;
    $('[data-cc-review-send]').disabled = true;
    $('#cc-rev-text').value = '';
    renderTechCards();
  });

  /* --- escape closes the topmost overlay --- */
  document.addEventListener('keydown', (event) => {
    if (event.key !== 'Escape') return;
    if ($('[data-cc-pay]').classList.contains('is-open')) {
      closeModal('[data-cc-pay]');
      return;
    }
    if ($('[data-cc-modal]').classList.contains('is-open')) {
      closeModal('[data-cc-modal]');
      return;
    }
    if ($('[data-cc-thread]').classList.contains('is-open')) {
      closeThread();
      return;
    }
    if ($('[data-cc-dispatch]').classList.contains('is-open')) closeDispatch();
  });

  // Backdrop clicks close the drawer and the dialogs.
  $('[data-cc-thread]').addEventListener('click', (event) => {
    if (event.target === event.currentTarget) closeThread();
  });
  $$('.cc-modal').forEach((m) => {
    m.addEventListener('click', (event) => {
      if (event.target === m) m.classList.remove('is-open');
    });
  });

  /* --- first paint --- */
  renderEstimate();
  renderAccess();
  renderAddress();
  renderPhotos();
  renderPricebook();
  renderTrack();
  renderBoard();
}

if (document.readyState !== 'loading') init();
else document.addEventListener('DOMContentLoaded', init);
