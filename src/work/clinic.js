// Maple Clinic - page-specific booking behaviour. Loaded after mockups.js,
// which still owns the generic hooks (data-go, data-select-group, data-out,
// data-scroll, data-collapse, data-say). This module layers the patient
// portal on top: visit types with doctor eligibility, the month calendar,
// slot availability + waitlist, "earliest available", the confirm-step
// fields, post-booking toggles, My visits (reschedule / cancel), Messages
// and Profile. Listeners are delegated at document level so they run after
// the element-level handlers in mockups.js.
// Contract: JS only toggles classes / attributes / text and builds strings.
// CSS owns every transition and animation.

const TODAY = '2026-09-02';
const NOW_MINUTES = 13 * 60 + 45; // demo clock: 13:45 on the demo date
const TIMES = ['8:30', '9:00', '9:30', '10:15', '11:00', '13:30', '14:15', '15:45'];
const DOW = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const DOCTORS = {
  'Dr. Priya Nair': { short: 'Dr. Nair', spec: 'Family medicine', days: [1, 2, 3, 4], hint: 'Dr. Nair sees patients Mon-Thu.' },
  'Dr. Sam Okafor': { short: 'Dr. Okafor', spec: 'Pediatrics', days: [2, 3, 4, 5], hint: 'Dr. Okafor sees patients Tue-Fri.' },
  'Dr. Lena Roy': { short: 'Dr. Roy', spec: 'Dermatology', days: [3, 5], hint: 'Dr. Roy is in on Wednesdays and Fridays only.' },
};
const ALL = Object.keys(DOCTORS);

const TYPES = {
  new: {
    label: 'New patient',
    mins: 30,
    doctors: ALL,
    note: 'New patients can see any of our three doctors. Bring photo ID and your health card to the first visit.',
  },
  follow: {
    label: 'Follow-up',
    mins: 15,
    doctors: ALL,
    note: 'Follow-ups are 15 minutes and usually with the doctor you saw last - Dr. Nair asked to see you in the next few weeks.',
  },
  annual: {
    label: 'Annual check-up',
    mins: 30,
    doctors: ['Dr. Priya Nair', 'Dr. Sam Okafor'],
    note: 'Annual check-ups are with Dr. Nair (adults) or Dr. Okafor (patients under 18). Dr. Roy only takes skin consults.',
  },
  skin: {
    label: 'Skin consult',
    mins: 20,
    doctors: ['Dr. Lena Roy'],
    note: 'Skin consults are with Dr. Roy, our dermatologist. She is in Wednesdays and Fridays - no referral needed.',
  },
};

const REPLIES = [
  [/refill|prescri|renew/i, 'Refill requests go straight to Dr. Nair - allow two business days and we will send it to Shoppers on Quinpool Rd.'],
  [/result|blood|lab|test/i, 'Your latest results are the Aug 20 blood work above. Anything newer shows up here as soon as the doctor signs off on it.'],
  [/park|where|address|directions/i, 'We are at 1420 Quinpool Rd, second floor. Free parking behind the building - the entrance is off Preston St.'],
  [/cancel|resched|move/i, 'You can move or cancel any upcoming visit yourself under My visits - no need to call. Same-day cancellations are fine, no fee.'],
  [/./, 'Thanks Jordan - the front desk will get back to you within one business day. If it is urgent, call (902) 555-0100.'],
];

const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
const escapeHtml = (s) =>
  String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

const state = {
  waitlist: new Set(), // "doctor|date|time"
  visits: [
    { id: 'v0', ref: 'MC-4788', doctor: 'Dr. Sam Okafor', type: 'follow', date: '2026-09-02', time: '14:15', reason: 'Ear infection - re-check after antibiotics', patient: 'maya', confirmed: true },
    { id: 'v1', ref: 'MC-4790', doctor: 'Dr. Lena Roy', type: 'skin', date: '2026-09-18', time: '11:00', reason: 'Mole on left shoulder - changed shape', patient: 'self', confirmed: false },
  ],
  nextRef: 4821,
  nextId: 2,
  resched: null, // visit id being moved
  lastAdded: null,
  profile: {},
  unread: 1,
  // --- portal extensions ---
  held: new Set(['Dr. Sam Okafor|2026-09-02|14:15', 'Dr. Lena Roy|2026-09-18|11:00']), // slots this family holds
  freed: new Set(), // taken slots released to us from the waitlist
  patient: 'self',
  checkin: { status: 'due', pos: 2, wait: 12, timer: 0, acked: false },
  refills: [],
  nextRx: 1,
  board: new Map(), // "doctor|time" -> status override (front desk)
  staffDoc: 'all',
  wlOffered: new Set(),
  wlOffer: null,
  wlTimer: 0,
  where: 'clinic', // 'clinic' | 'video' for the booking being made
  dev: { visit: null, timers: [], ready: false, returnFocus: null }, // video device check
};

/* ---------- date helpers ---------- */

const toDate = (s) => {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d);
};
const iso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const fmtLong = (s) => {
  const d = toDate(s);
  return `${DOW[d.getDay()]}, ${MON[d.getMonth()]} ${d.getDate()}`;
};
const minutes = (t) => {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
};
const fmtNext = (date, time) => {
  if (date === TODAY) return `Today ${time}`;
  const d = toDate(date);
  const t = toDate(TODAY);
  t.setDate(t.getDate() + 1);
  if (iso(t) === date) return `Tomorrow ${time}`;
  return `${DOW[d.getDay()]} ${MON[d.getMonth()]} ${d.getDate()} · ${time}`;
};

/* ---------- availability (deterministic, no backend) ---------- */

function hash(str) {
  let h = 5381;
  for (let i = 0; i < str.length; i += 1) h = ((h << 5) + h + str.charCodeAt(i)) | 0;
  return Math.abs(h);
}

const isPast = (date, time) => date < TODAY || (date === TODAY && minutes(time) < NOW_MINUTES);
const isTaken = (doctor, date, time) => {
  const key = `${doctor}|${date}|${time}`;
  if (state.freed.has(key)) return false;
  if (state.held.has(key)) return true;
  return hash(key) % 100 < 32;
};
const isOpen = (doctor, date, time) => !isPast(date, time) && !isTaken(doctor, date, time);
const worksOn = (doctor, date) => DOCTORS[doctor].days.includes(toDate(date).getDay());
const dayOk = (doctor, date) => date >= TODAY && worksOn(doctor, date);

function earliestFor(doctors, fromDate = TODAY) {
  const d = toDate(fromDate);
  for (let i = 0; i < 70; i += 1) {
    const date = iso(d);
    let best = null;
    doctors.forEach((doc) => {
      if (!dayOk(doc, date)) return;
      const t = TIMES.find((time) => isOpen(doc, date, time));
      if (t && (!best || minutes(t) < minutes(best.time))) best = { doctor: doc, date, time: t };
    });
    if (best) return best;
    d.setDate(d.getDate() + 1);
  }
  return null;
}

/* ---------- DOM state readers ---------- */

const selectedDoctor = () => $('.doctors .doctor.is-selected')?.dataset.label || ALL[0];
const selectedType = () => $('.types .type.is-selected')?.dataset.visit || 'annual';
const selectedDate = () => $('.cal-month button.is-selected')?.dataset.date || null;
const selectedSlot = () => $('.slots .slot > button:first-child.is-selected')?.textContent.trim() || null;
const phone = () => ($('#cl-phone')?.value || '').trim() || '(902) 555-0142';

/* ---------- toast / modal ---------- */

let toastTimer = 0;
function toast(text) {
  const el = $('[data-toast]');
  if (!el) return;
  el.textContent = text;
  el.classList.add('is-shown');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('is-shown'), 2800);
}

const modal = { onOk: null, returnFocus: null };
function openModal({ title, body, ok, danger = false, onOk }) {
  const host = $('[data-modal]');
  if (!host) return;
  $('#cl-dlg-title').textContent = title;
  $('#cl-dlg-body').textContent = body;
  const okBtn = $('[data-modal-ok]', host);
  okBtn.textContent = ok;
  okBtn.classList.toggle('is-danger', danger);
  modal.onOk = onOk;
  modal.returnFocus = document.activeElement;
  host.classList.add('is-open');
  $('.cl-modal-card', host).focus();
}
function closeModal() {
  const host = $('[data-modal]');
  if (!host || !host.classList.contains('is-open')) return;
  host.classList.remove('is-open');
  modal.onOk = null;
  modal.returnFocus?.focus?.();
  modal.returnFocus = null;
}

/* ---------- portal tabs ---------- */

function showPortal(name) {
  $$('[data-portal]').forEach((tab) => {
    const on = tab.dataset.portal === name;
    tab.classList.toggle('is-active', on);
    tab.setAttribute('aria-selected', String(on));
  });
  $$('[data-portal-pane]').forEach((pane) => pane.classList.toggle('is-active', pane.dataset.portalPane === name));
  if (name === 'messages') markRead();
}

function setBadge(name, n) {
  $$(`[data-badge="${name}"]`).forEach((b) => {
    b.textContent = String(n);
    b.hidden = n === 0;
  });
}

/* ---------- visit type + doctor eligibility ---------- */

function typeLabel(type) {
  const t = TYPES[type];
  return `${t.label} · ${t.mins} min`;
}

function applyType(type) {
  const t = TYPES[type];
  $$('.types .type').forEach((b) => {
    const on = b.dataset.visit === type;
    b.classList.toggle('is-selected', on);
    b.setAttribute('aria-pressed', String(on));
  });
  const note = $('[data-type-note]');
  if (note) {
    note.textContent = t.note;
    note.hidden = false;
  }
  $$('[data-visit-out]').forEach((o) => (o.textContent = typeLabel(type)));
  const calSub = $('[data-cal-add-sub]');
  if (calSub) calSub.textContent = `Google, Apple or Outlook - ${t.mins} min block with the clinic address`;

  $$('[data-select-group="doctor"]').forEach((b) => {
    const ok = t.doctors.includes(b.dataset.label);
    b.disabled = !ok;
    b.title = ok ? '' : `${DOCTORS[b.dataset.label].short} does not take ${t.label.toLowerCase()} visits`;
  });
  if (!t.doctors.includes(selectedDoctor())) {
    const first = $$('.doctors .doctor').find((b) => !b.disabled);
    first?.click();
  }
  refreshCalendar();
  syncWhere();
}

/* ---------- calendar ---------- */

function setMonth(index) {
  const months = $$('.cal-month');
  const i = Math.max(0, Math.min(months.length - 1, index));
  months.forEach((m, k) => m.classList.toggle('is-active', k === i));
  const title = $('[data-cal-title]');
  if (title) title.textContent = months[i].getAttribute('aria-label') || '';
  const prev = $('[data-cal-nav="-1"]');
  const next = $('[data-cal-nav="1"]');
  if (prev) prev.disabled = i === 0;
  if (next) next.disabled = i === months.length - 1;
}

function showMonthOf(date) {
  const months = $$('.cal-month');
  const idx = months.findIndex((m) => m.dataset.month === date.slice(0, 7));
  if (idx >= 0) setMonth(idx);
}

function refreshCalendar() {
  const doctor = selectedDoctor();
  $$('.cal-month button[data-date]').forEach((b) => {
    const date = b.dataset.date;
    const dow = toDate(date).getDay();
    const weekend = dow === 0 || dow === 6;
    const past = date < TODAY;
    const off = !weekend && !past && !worksOn(doctor, date);
    b.disabled = weekend || past || off;
    b.classList.toggle('is-off', off);
    b.classList.toggle('is-weekend', weekend);
    b.classList.toggle('is-past', past);
  });
  const hint = $('[data-cal-hint]');
  if (hint) hint.textContent = `${DOCTORS[doctor].hint} Weekends and past dates are closed.`;

  const current = selectedDate();
  if (!current || !dayOk(doctor, current)) {
    const first = $$('.cal-month button[data-date]').find((b) => !b.disabled);
    if (first) {
      showMonthOf(first.dataset.date);
      first.click(); // mockups selects it; the delegated day handler refreshes slots
      return;
    }
  }
  refreshSlots();
}

/* ---------- slots + waitlist ---------- */

function refreshSlots() {
  const doctor = selectedDoctor();
  const date = selectedDate();
  if (!date) return;
  let open = 0;
  let taken = 0;
  let past = 0;
  $$('.slots .slot').forEach((slot) => {
    const btn = slot.querySelector('button');
    const wl = slot.querySelector('.wl');
    const time = btn.textContent.trim();
    const p = isPast(date, time);
    const t = !p && isTaken(doctor, date, time);
    btn.disabled = p || t;
    slot.classList.toggle('is-taken', t);
    slot.classList.toggle('is-past', p);
    if (p) past += 1;
    else if (t) taken += 1;
    else open += 1;
    if (wl) {
      const on = state.waitlist.has(`${doctor}|${date}|${time}`);
      wl.classList.toggle('is-on', on);
      wl.setAttribute('aria-pressed', String(on));
      wl.textContent = on ? 'On waitlist ✓' : 'Waitlist';
    }
  });

  const note = $('[data-slots-note]');
  if (note) {
    const bits = [`${open} ${open === 1 ? 'time' : 'times'} open`];
    if (taken) bits.push(`${taken} taken`);
    if (past) bits.push(`${past} already passed today`);
    note.textContent =
      open === 0
        ? `${bits.join(' · ')}. Nothing left on ${fmtLong(date)} - pick another day, or join a waitlist and we'll text you if a time frees up.`
        : `${bits.join(' · ')}. Join the waitlist for a taken time and we'll text ${phone()} if it frees up.`;
  }

  const sel = $('.slots .slot > button:first-child.is-selected');
  if (!sel || sel.disabled) {
    sel?.classList.remove('is-selected');
    sel?.setAttribute('aria-pressed', 'false');
    const first = $$('.slots .slot > button:first-child').find((b) => !b.disabled);
    if (first) first.click();
    else $$('[data-out="slot"]').forEach((o) => (o.textContent = '-'));
  }
  syncReviewButton();
}

function syncReviewButton() {
  const btn = $('.panel-2 [data-go="3"]');
  if (btn) btn.disabled = !selectedSlot();
}

function toggleWaitlist(time) {
  const key = `${selectedDoctor()}|${selectedDate()}|${time}`;
  if (state.waitlist.has(key)) {
    state.waitlist.delete(key);
    toast(`Removed from the ${time} waitlist`);
  } else {
    state.waitlist.add(key);
    toast(`On the waitlist - we'll text ${phone()} if ${time} on ${fmtLong(selectedDate())} opens up`);
  }
  refreshSlots();
}

/* ---------- earliest available ---------- */

function pickEarliest() {
  const t = TYPES[selectedType()];
  const best = earliestFor(t.doctors);
  if (!best) {
    toast('Nothing open in the next ten weeks - try the waitlist');
    return;
  }
  const docBtn = $$('.doctors .doctor').find((b) => b.dataset.label === best.doctor);
  docBtn?.click();
  showMonthOf(best.date);
  $(`.cal-month button[data-date="${best.date}"]`)?.click();
  $$('.slots .slot > button:first-child').find((b) => b.textContent.trim() === best.time)?.click();
  const note = $('[data-earliest-note]');
  if (note) {
    note.textContent = `⚡ Earliest opening across your eligible doctors: ${fmtLong(best.date)} at ${best.time} with ${DOCTORS[best.doctor].short}. Change anything with ← Back.`;
    note.hidden = false;
  }
  $('.panel-2 [data-go="3"]')?.click();
}

/* ---------- doctor "Next:" labels ---------- */

function labelNextOpenings() {
  $$('.doctors .doctor').forEach((b) => {
    const best = earliestFor([b.dataset.label]);
    const next = b.querySelector('.next');
    if (next && best) next.textContent = `Next: ${fmtNext(best.date, best.time)}`;
  });
  const heroNair = $('.mc-art .card.one span');
  const bestNair = earliestFor(['Dr. Priya Nair']);
  if (heroNair && bestNair) heroNair.textContent = `Family medicine · next ${fmtNext(bestNair.date, bestNair.time).toLowerCase()}`;
  const todayOpen = $('[data-today-open]');
  if (todayOpen) {
    const n = ALL.reduce((sum, doc) => sum + (worksOn(doc, TODAY) ? TIMES.filter((t) => isOpen(doc, TODAY, t)).length : 0), 0);
    todayOpen.textContent = `${n} open this afternoon`;
  }
}

/* ---------- confirm step ---------- */

function updateCount() {
  const ta = $('#cl-reason');
  const out = $('[data-count]');
  if (!ta || !out) return;
  const n = ta.value.length;
  out.textContent = `${n}/${ta.maxLength}`;
  out.classList.toggle('is-near', n >= ta.maxLength - 20);
}

function reminderText() {
  const on = $('[data-reminder]')?.checked;
  const card = $('#cl-card')?.checked;
  return on ? `The day before, to ${phone()}${card ? ' · includes the health card reminder' : ''}` : 'No text - you can turn reminders back on in Profile.';
}

function confirmBooking() {
  const doctor = selectedDoctor();
  const date = selectedDate();
  const time = selectedSlot();
  const type = selectedType();
  const reason = ($('#cl-reason')?.value || '').trim();
  const card = !!$('#cl-card')?.checked;
  if (!date || !time) return;

  let visit;
  let moved = null;
  if (state.resched) {
    visit = state.visits.find((v) => v.id === state.resched);
    if (visit) {
      moved = `${fmtLong(visit.date)} ${visit.time}`;
      Object.assign(visit, { doctor, date, time, type, reason: reason || visit.reason, where: state.where, joined: false });
    }
  }
  if (!visit) {
    visit = { id: `v${state.nextId}`, ref: `MC-${state.nextRef}`, doctor, date, time, type, reason, patient: state.patient, confirmed: false, where: state.where };
    state.nextId += 1;
    state.nextRef += 1;
    state.visits.push(visit);
  }
  state.held.add(`${doctor}|${date}|${time}`);
  state.lastAdded = visit.id;
  state.resched = null;

  const who = PEOPLE[visit.patient || 'self'];
  $('[data-success-title]').textContent = moved ? 'Visit moved' : visit.patient && visit.patient !== 'self' ? `${who.short} is booked` : "You're booked";
  $('[data-success-ref]').textContent = visit.ref;
  const rem = $('[data-reminder]');
  if (rem) rem.checked = state.profile.sms !== false;
  $('[data-reminder-text]').textContent = reminderText();
  const video = visit.where === 'video';
  const cardLine = $('[data-card-line]');
  if (cardLine) cardLine.hidden = !card || video;
  const videoLine = $('[data-video-line]');
  if (videoLine) videoLine.hidden = !video;
  const calAdd = $('[data-cal-add]');
  if (calAdd) {
    calAdd.setAttribute('aria-pressed', 'false');
    $('[data-cal-add-label]').textContent = 'Add to calendar';
  }
  hideReschedUi();
  renderVisits();
  toast(moved ? `Moved to ${fmtLong(date)} ${time} · your ${moved} slot is released` : `Booked · ${visit.ref}`);
}

function resetForNext() {
  const note = $('[data-earliest-note]');
  if (note) note.hidden = true;
  const ta = $('#cl-reason');
  if (ta) ta.value = '';
  updateCount();
  state.resched = null;
  hideReschedUi();
}

/* ---------- my visits ---------- */

function renderVisits() {
  const list = $('[data-visits]');
  if (!list) return;
  const upcoming = state.visits
    .filter((v) => v.date >= TODAY)
    .sort((a, b) => (a.date === b.date ? minutes(a.time) - minutes(b.time) : a.date < b.date ? -1 : 1));
  setBadge('visits', upcoming.length);
  if (!upcoming.length) {
    list.innerHTML =
      '<li class="visits-empty">No upcoming visits. Same-day openings most afternoons.<button class="btn btn-primary btn-sm" type="button" data-portal-go="book">Book a visit</button></li>';
    return;
  }
  list.innerHTML = upcoming
    .map((v) => {
      const d = toDate(v.date);
      const remind = toDate(v.date);
      remind.setDate(remind.getDate() - 1);
      const isNew = v.id === state.lastAdded ? ' is-new' : '';
      const video = v.where === 'video';
      const forTag = `${v.patient && v.patient !== 'self' ? `<span class="for-tag">For ${escapeHtml(PEOPLE[v.patient].name)}</span>` : ''}${
        video ? '<span class="for-tag is-video">Video</span>' : ''
      }`;
      const today = v.date === TODAY;
      const status = today
        ? checkinPill()
        : v.joined
          ? '<span class="vpill is-live"><i></i>In the waiting room</span>'
          : v.confirmed
            ? '<span class="vpill is-ok">Confirmed ✓</span>'
            : '<span class="vpill">Not confirmed yet</span>';
      const videoAct = video
        ? v.joined
          ? `<span class="vhint">${DOCTORS[v.doctor].short} starts the call from their side</span>`
          : `<button class="btn btn-primary btn-sm" type="button" data-video-check="${v.id}">Test camera &amp; mic</button>`
        : '';
      const acts = today
        ? checkinAct()
        : `${videoAct}${v.confirmed || v.joined ? '' : `<button class="btn btn-primary btn-sm" type="button" data-visit-confirm="${v.id}">I'm coming ✓</button>`}<button class="btn btn-ghost btn-sm" type="button" data-visit-resched="${v.id}">Reschedule</button><button class="btn btn-ghost btn-sm is-danger-ghost" type="button" data-visit-cancel="${v.id}">Cancel</button>`;
      return `<li class="visit${isNew}${today ? ' is-today' : ''}" data-visit-id="${v.id}">
        <div class="when"><b>${MON[d.getMonth()]}</b><span>${d.getDate()}</span><small>${today ? 'Today' : DOW[d.getDay()]}</small></div>
        <div class="what"><strong>${escapeHtml(v.doctor)} ${forTag}</strong><span>${typeLabel(v.type)} · ${v.time} ${status}</span><span class="ref-sm">${v.ref} · ${remindLabel()} reminder ${DOW[remind.getDay()]}</span>${
          v.reason ? `<span>“${escapeHtml(v.reason)}”</span>` : ''
        }</div>
        <div class="acts">${acts}</div>
      </li>`;
    })
    .join('');
  state.lastAdded = null;
}

function hideReschedUi() {
  const banner = $('[data-resched-banner]');
  if (banner) banner.hidden = true;
  const row = $('[data-resched-row]');
  if (row) row.hidden = true;
}

function startReschedule(id) {
  const v = state.visits.find((x) => x.id === id);
  if (!v) return;
  state.resched = id;
  const from = `${fmtLong(v.date)} at ${v.time} with ${DOCTORS[v.doctor].short}`;
  $$('[data-resched-from]').forEach((o) => (o.textContent = from));
  const banner = $('[data-resched-banner]');
  if (banner) banner.hidden = false;
  const row = $('[data-resched-row]');
  if (row) row.hidden = false;
  const note = $('[data-earliest-note]');
  if (note) note.hidden = true;
  applyType(v.type);
  $$('.doctors .doctor').find((b) => b.dataset.label === v.doctor)?.click();
  showMonthOf(v.date);
  $(`.cal-month button[data-date="${v.date}"]:not(:disabled)`)?.click();
  showPortal('book');
  $('.panel-1 [data-go="2"]')?.click();
}

function keepOriginal() {
  state.resched = null;
  hideReschedUi();
  $('.panel-2 [data-go="1"]')?.click();
  showPortal('visits');
  toast('Kept your original time');
}

function cancelVisit(id) {
  const v = state.visits.find((x) => x.id === id);
  if (!v) return;
  openModal({
    title: 'Cancel this visit?',
    body: `${fmtLong(v.date)} at ${v.time} with ${v.doctor} (${v.ref}) will be released to anyone on the waitlist. No fee - you can book again any time.`,
    ok: 'Cancel visit',
    danger: true,
    onOk: () => {
      const li = $(`[data-visit-id="${id}"]`);
      li?.classList.add('is-leaving');
      state.visits = state.visits.filter((x) => x.id !== id);
      setTimeout(renderVisits, 260);
      toast(`Cancelled ${v.ref} · slot released`);
      addClinicMessage(`Your ${fmtLong(v.date)} ${v.time} visit with ${DOCTORS[v.doctor].short} is cancelled. Nothing owed - book again whenever you're ready.`);
    },
  });
}

function bookAgain(spec) {
  const [doctor, type] = spec.split('|');
  if (TYPES[type]) applyType(type);
  $$('.doctors .doctor').find((b) => b.dataset.label === doctor && !b.disabled)?.click();
  state.resched = null;
  hideReschedUi();
  showPortal('book');
  $('.panel-1 [data-go="2"]')?.click();
}

/* ---------- messages ---------- */

function markRead() {
  $$('.msg.is-unread').forEach((m) => m.classList.remove('is-unread'));
  state.unread = 0;
  setBadge('messages', 0);
}

function addClinicMessage(text, from = 'Maple Clinic · Just now') {
  const thread = $('[data-thread]');
  if (!thread) return;
  const li = document.createElement('li');
  const active = $('[data-portal-pane="messages"]')?.classList.contains('is-active');
  li.className = `msg them is-new${active ? '' : ' is-unread'}`;
  li.innerHTML = `<span class="from">${escapeHtml(from)}</span><p>${escapeHtml(text)}</p>`;
  thread.appendChild(li);
  if (!active) {
    state.unread += 1;
    setBadge('messages', state.unread);
  }
}

function sendMessage(text) {
  const thread = $('[data-thread]');
  if (!thread || !text) return;
  const me = document.createElement('li');
  me.className = 'msg me is-new';
  me.innerHTML = `<span class="from">You · Just now</span><p>${escapeHtml(text)}</p>`;
  thread.appendChild(me);
  const typing = document.createElement('li');
  typing.className = 'msg them typing';
  typing.setAttribute('aria-label', 'Maple Clinic is typing');
  typing.innerHTML = '<i></i><i></i><i></i>';
  thread.appendChild(typing);
  const reply = REPLIES.find(([re]) => re.test(text))[1];
  setTimeout(() => {
    typing.remove();
    addClinicMessage(reply, 'Maple Clinic front desk · Just now');
  }, 1300);
}

/* ---------- profile ---------- */

function readProfile(form) {
  const out = {};
  $$('input, select', form).forEach((el) => {
    out[el.name] = el.type === 'checkbox' ? el.checked : el.value;
  });
  return out;
}

function writeProfile(form, data) {
  $$('input, select', form).forEach((el) => {
    if (!(el.name in data)) return;
    if (el.type === 'checkbox') el.checked = data[el.name];
    else el.value = data[el.name];
  });
}

function profileDirty(form) {
  return JSON.stringify(readProfile(form)) !== JSON.stringify(state.profile);
}

function syncProfileButtons(form) {
  const dirty = profileDirty(form);
  const save = $('[data-profile-save]', form);
  const discard = $('[data-profile-discard]', form);
  if (save) {
    save.disabled = !dirty;
    save.textContent = dirty ? 'Save changes' : 'Saved';
  }
  if (discard) discard.disabled = !dirty;
}

function applyProfile() {
  const p = state.profile;
  const initials = (p.name || 'Jordan Park')
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
  const user = $('[data-initials]');
  if (user) {
    user.textContent = initials;
    user.setAttribute('aria-label', `Signed in as ${p.name || 'Jordan Park'}`);
  }
  const ph = $('#cl-phone');
  if (ph && p.phone) ph.value = p.phone;
  const rt = $('[data-reminder-text]');
  if (rt) rt.textContent = reminderText();
}

function saveProfile(form) {
  const save = $('[data-profile-save]', form);
  if (!save || !profileDirty(form)) return;
  save.disabled = true;
  save.textContent = 'Saving…';
  setTimeout(() => {
    state.profile = readProfile(form);
    applyProfile();
    syncProfileButtons(form);
    renderVisits();
    toast('Profile updated · applies to your next booking');
  }, 700);
}

/* ---------- wiring ---------- */

function init() {
  const app = $('.mc-app .app');
  if (!app) return;

  // Delegated clicks: element-level handlers in mockups.js run first.
  document.addEventListener('click', (event) => {
    const t = event.target.closest('button, [data-modal]');
    if (!t) return;

    if (t.matches('[data-portal]')) return showPortal(t.dataset.portal);
    if (t.matches('[data-portal-go]')) return showPortal(t.dataset.portalGo);
    if (t.matches('[data-visit]')) return applyType(t.dataset.visit);
    if (t.matches('[data-select-group="doctor"]')) return refreshCalendar();
    if (t.matches('.cal-month button[data-date]')) return refreshSlots();
    if (t.matches('.slots [data-select-group="slot"]')) return syncReviewButton();
    if (t.matches('[data-waitlist]')) return toggleWaitlist(t.dataset.waitlist);
    if (t.matches('[data-cal-nav]')) {
      const idx = $$('.cal-month').findIndex((m) => m.classList.contains('is-active'));
      return setMonth(idx + Number(t.dataset.calNav));
    }
    if (t.matches('[data-earliest]')) return pickEarliest();
    if (t.matches('[data-confirm]')) return confirmBooking();
    if (t.matches('[data-book-another]')) return resetForNext();
    if (t.matches('[data-cal-add]')) {
      const on = t.getAttribute('aria-pressed') !== 'true';
      t.setAttribute('aria-pressed', String(on));
      $('[data-cal-add-label]').textContent = on ? 'Added to your calendar ✓' : 'Add to calendar';
      if (on) toast(`Calendar event added · ${TYPES[selectedType()].mins} min at Maple Clinic`);
      return undefined;
    }
    if (t.matches('[data-visit-resched]')) return startReschedule(t.dataset.visitResched);
    if (t.matches('[data-visit-cancel]')) return cancelVisit(t.dataset.visitCancel);
    if (t.matches('[data-resched-keep]')) return keepOriginal();
    if (t.matches('[data-book-again]')) return bookAgain(t.dataset.bookAgain);
    if (t.matches('[data-modal-ok]')) {
      const fn = modal.onOk;
      closeModal();
      fn?.();
      return undefined;
    }
    if (t.matches('[data-modal-close]')) return closeModal();
    if (t.matches('[data-modal]') && event.target === t) return closeModal();
    return undefined;
  });

  document.addEventListener('keydown', (event) => {
    const host = $('[data-modal]');
    if (!host?.classList.contains('is-open')) return;
    if (event.key === 'Escape') {
      event.preventDefault();
      closeModal();
    } else if (event.key === 'Tab') {
      const focusables = $$('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])', host).filter((el) => !el.disabled);
      if (!focusables.length) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      if (event.shiftKey && (document.activeElement === first || document.activeElement === host.firstElementChild)) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }
  });

  // Confirm-step fields
  $('#cl-reason')?.addEventListener('input', updateCount);
  $('#cl-phone')?.addEventListener('input', () => {
    const rt = $('[data-reminder-text]');
    if (rt) rt.textContent = reminderText();
  });
  $('[data-reminder]')?.addEventListener('change', () => {
    $('[data-reminder-text]').textContent = reminderText();
  });

  // Messages composer
  $('[data-thread-form]')?.addEventListener('submit', (event) => {
    event.preventDefault();
    const input = $('#cl-msg');
    const text = (input?.value || '').trim();
    if (!text) return;
    input.value = '';
    sendMessage(text);
  });

  // Profile form
  const form = $('[data-profile-form]');
  if (form) {
    state.profile = readProfile(form);
    form.addEventListener('input', () => syncProfileButtons(form));
    form.addEventListener('change', () => syncProfileButtons(form));
    form.addEventListener('submit', (event) => {
      event.preventDefault();
      saveProfile(form);
    });
    $('[data-profile-discard]', form)?.addEventListener('click', () => {
      writeProfile(form, state.profile);
      syncProfileButtons(form);
      toast('Changes discarded');
    });
  }

  // Initial state
  labelNextOpenings();
  setMonth(0);
  applyType(selectedType());
  updateCount();
  renderVisits();
  setBadge('messages', state.unread);
  applyProfile();
  initExtras();
}

/* =====================================================================
   PORTAL EXTENSIONS - family members, symptom triage, same-day check-in
   with a live queue, results, refills, "I'm coming" confirmations, the
   waitlist "a time opened up" offer, and the front-desk view. Same
   contract: JS toggles classes / attributes / text; CSS owns motion.
   ===================================================================== */

const PEOPLE = {
  self: { name: 'Jordan Park', short: 'Jordan', label: 'Jordan Park (you)', doctor: null, note: '' },
  maya: {
    name: 'Maya Park',
    short: 'Maya',
    label: 'Maya Park (daughter, 6)',
    doctor: 'Dr. Sam Okafor',
    note: 'Maya is 6, so Dr. Okafor (pediatrics) is the right fit - we picked him for you. Her MSI card is already on file.',
  },
  ravi: {
    name: 'Ravi Park',
    short: 'Ravi',
    label: 'Ravi Park (father, 71)',
    doctor: 'Dr. Priya Nair',
    note: "Ravi sees Dr. Nair. You're listed as his caregiver, so reminders for his visits come to your phone too.",
  },
};

const TRIAGE = {
  skin: { type: 'skin', doctor: 'Dr. Lena Roy', lead: 'Sounds like a skin consult with Dr. Roy, our dermatologist - no referral needed.' },
  cold: { type: 'follow', doctor: 'Dr. Priya Nair', lead: 'A 15-minute visit covers this, and we keep afternoon times open for same-day.' },
  physical: { type: 'annual', doctor: 'Dr. Priya Nair', lead: 'Annual check-ups are 30 minutes. Fast from midnight if you want blood work done the same morning.' },
  child: { type: 'follow', doctor: 'Dr. Sam Okafor', patient: 'maya', lead: 'We switched the visit to Maya with Dr. Okafor (pediatrics). Under 3 months with a fever? Go to the IWK emergency instead.' },
  refill: { refill: true, lead: 'No visit needed - request the renewal from the Refills tab. Your doctor reviews it, usually within 2 business days.' },
  emergency: { emergency: true },
};

const CHECKIN_ID = 'v0';
const ROOM = 'Room 3';
const STAFF_NAMES = ['Aisha Ahmed', 'Tom Leblanc', 'Grace Chen', 'Noah MacDonald', 'Fatima Ali', 'Liam Boudreau', 'Sophie Landry', 'Ben Ferguson', 'Omar Haddad', 'Emily Sutherland'];
const STAFF_TYPES = { 'Dr. Priya Nair': ['follow', 'annual', 'new'], 'Dr. Sam Okafor': ['follow', 'annual'], 'Dr. Lena Roy': ['skin'] };
const STATUS_LABEL = { booked: 'Booked', checked: 'Checked in', room: 'In room', done: 'Done', noshow: 'No-show' };

const checkinVisit = () => state.visits.find((v) => v.id === CHECKIN_ID);
const remindLabel = () => {
  const via = state.profile.remindvia || 'Text';
  return via === 'Text and email' ? 'Text + email' : via;
};

/* ---------- who is the visit for ---------- */

function setPatient(key) {
  const p = PEOPLE[key];
  if (!p) return;
  state.patient = key;
  $$('[data-patient]').forEach((b) => {
    const on = b.dataset.patient === key;
    b.classList.toggle('is-selected', on);
    b.setAttribute('aria-pressed', String(on));
  });
  $$('[data-patient-out]').forEach((o) => (o.textContent = p.label));
  const note = $('[data-patient-note]');
  if (note) {
    note.textContent = p.note;
    note.hidden = !p.note;
  }
  if (p.doctor) {
    const btn = $$('.doctors .doctor').find((b) => b.dataset.label === p.doctor);
    if (btn && !btn.disabled) btn.click();
    else if (note && btn) note.textContent = `${p.note} ${TYPES[selectedType()].label} visits are with ${DOCTORS[selectedDoctor()].short} for all ages.`;
  }
}

/* ---------- symptom triage ---------- */

function applyTriage(key) {
  const t = TRIAGE[key];
  if (!t) return;
  $$('[data-triage]').forEach((b) => {
    const on = b.dataset.triage === key;
    b.classList.toggle('is-selected', on);
    b.setAttribute('aria-pressed', String(on));
  });
  const out = $('[data-triage-out]');
  const em = $('[data-emergency]');
  if (t.emergency) {
    if (out) out.hidden = true;
    if (em) em.hidden = false;
    return;
  }
  if (em) em.hidden = true;
  const go = $('[data-triage-go]');
  const rx = $('[data-triage-refills]');
  if (t.refill) {
    $('[data-triage-text]').textContent = t.lead;
    if (go) go.hidden = true;
    if (rx) rx.hidden = false;
    if (out) out.hidden = false;
    return;
  }
  if (t.patient) setPatient(t.patient);
  applyType(t.type);
  const docBtn = $$('.doctors .doctor').find((b) => b.dataset.label === t.doctor && !b.disabled);
  docBtn?.click();
  const doctor = selectedDoctor();
  const best = earliestFor([doctor]);
  const todayOpen = worksOn(doctor, TODAY) ? TIMES.filter((time) => isOpen(doctor, TODAY, time)).length : 0;
  const soon = key === 'cold' || key === 'child' ? (todayOpen ? ` ${todayOpen} ${todayOpen === 1 ? 'time is' : 'times are'} still open this afternoon with ${DOCTORS[doctor].short}.` : ` Nothing left today - the earliest is ${best ? fmtNext(best.date, best.time) : 'next week'} with ${DOCTORS[doctor].short}.`) : ` Next opening: ${best ? fmtNext(best.date, best.time) : 'next week'} with ${DOCTORS[doctor].short}.`;
  $('[data-triage-text]').textContent = `${t.lead}${soon} We've set the visit type and doctor for you.`;
  if (go) go.hidden = false;
  if (rx) rx.hidden = true;
  if (out) out.hidden = false;
}

function clearTriage() {
  $$('[data-triage]').forEach((b) => {
    b.classList.remove('is-selected');
    b.setAttribute('aria-pressed', 'false');
  });
  const out = $('[data-triage-out]');
  if (out) out.hidden = true;
  const em = $('[data-emergency]');
  if (em) em.hidden = true;
}

/* ---------- same-day check-in + live queue ---------- */

function checkinPill() {
  const s = state.checkin.status;
  if (s === 'checked') return `<span class="vpill is-live"><i></i>#${state.checkin.pos} in line · ~${state.checkin.wait} min</span>`;
  if (s === 'room') return `<span class="vpill is-live"><i></i>Ready · ${ROOM}</span>`;
  if (s === 'done' || s === 'hidden') return '<span class="vpill is-ok">Seen ✓</span>';
  return '<span class="vpill is-ok">Confirmed ✓</span>';
}

function checkinAct() {
  const s = state.checkin.status;
  if (s === 'due') return `<button class="btn btn-primary btn-sm" type="button" data-checkin="${CHECKIN_ID}">I've arrived</button>`;
  if (s === 'checked') return '<span class="vhint">Checked in - live queue in the bar above</span>';
  if (s === 'room') return `<span class="vhint">Go to ${ROOM}</span>`;
  return '<span class="vhint">Summary in Messages by 5 pm</span>';
}

function renderArrive() {
  const bar = $('[data-arrive]');
  const v = checkinVisit();
  if (!bar || !v) return;
  const { status, pos, wait, acked } = state.checkin;
  const who = PEOPLE[v.patient || 'self'];
  const doc = DOCTORS[v.doctor].short;
  const title = $('[data-arrive-title]');
  const sub = $('[data-arrive-sub]');
  const acts = $('[data-arrive-acts]');
  bar.dataset.state = status;
  bar.hidden = status === 'hidden';
  if (status === 'due') {
    title.textContent = `${who.short}'s ${v.time} with ${doc} is today`;
    sub.textContent = 'In the building? Check in from your phone - no line at reception.';
    acts.innerHTML = `<button class="btn btn-primary btn-sm" type="button" data-checkin="${v.id}">I've arrived</button>`;
  } else if (status === 'checked') {
    title.textContent = `Checked in · #${pos} in line`;
    sub.textContent = `About ${wait} min - ${doc} is running on time. Wait in the car or the lounge; this updates itself and we text you too.`;
    acts.innerHTML = '<span class="queue-pill"><i></i>Waiting</span>';
  } else if (status === 'room') {
    title.textContent = `${doc} is ready - ${ROOM}`;
    sub.textContent = 'Second floor, past reception. The nurse will meet you at the door.';
    acts.innerHTML = acked
      ? '<span class="queue-pill is-ok">On our way ✓</span>'
      : '<button class="btn btn-primary btn-sm" type="button" data-arrive-ack>We’re on our way</button>';
  } else if (status === 'done') {
    title.textContent = `Thanks for coming in, ${who.short}!`;
    sub.textContent = `${doc}'s visit summary lands in Messages by 5 pm. Need a follow-up? Book below.`;
    acts.innerHTML = '<button class="btn btn-ghost btn-sm" type="button" data-arrive-dismiss>Dismiss</button>';
  }
  renderVisits();
  if ($('[data-staff]')?.classList.contains('is-open')) renderStaff();
}

function stopQueue() {
  clearInterval(state.checkin.timer);
  state.checkin.timer = 0;
}

function setCheckin(status) {
  const c = state.checkin;
  if (c.status === status) return;
  stopQueue();
  c.status = status;
  if (status === 'checked') {
    c.pos = 2;
    c.wait = 12;
    c.timer = setInterval(() => {
      if (c.pos > 1) {
        c.pos -= 1;
        c.wait = 6;
        renderArrive();
      } else {
        setCheckin('room');
        toast(`${DOCTORS[checkinVisit().doctor].short} is ready · ${ROOM}`);
      }
    }, 5000);
  }
  renderArrive();
}

function checkIn() {
  const v = checkinVisit();
  if (!v || state.checkin.status !== 'due') return;
  setCheckin('checked');
  toast(`Checked in · ${PEOPLE[v.patient].short} is #${state.checkin.pos} in line for ${DOCTORS[v.doctor].short}`);
}

/* ---------- "I'm coming" confirmations ---------- */

function confirmComing(id) {
  const v = state.visits.find((x) => x.id === id);
  if (!v || v.confirmed) return;
  v.confirmed = true;
  renderVisits();
  $$(`[data-msg-confirm="${id}"]`).forEach((b) => {
    b.disabled = true;
    b.textContent = 'Confirmed ✓';
  });
  toast(`Confirmed ${v.ref} · see you ${fmtLong(v.date)} at ${v.time}`);
  if ($('[data-staff]')?.classList.contains('is-open')) renderStaff();
}

function sendReminderNow(id) {
  const v = state.visits.find((x) => x.id === id);
  if (!v || v.reminded) return;
  v.reminded = true;
  const thread = $('[data-thread]');
  if (thread) {
    const li = document.createElement('li');
    const active = $('[data-portal-pane="messages"]')?.classList.contains('is-active');
    li.className = `msg them is-new${active ? '' : ' is-unread'}`;
    const who = PEOPLE[v.patient || 'self'];
    li.innerHTML = `<span class="from">Maple Clinic reminders · Just now</span><p>${escapeHtml(
      `Reminder: ${who.short === 'Jordan' ? 'your' : `${who.short}'s`} ${typeLabel(v.type).split(' · ')[0].toLowerCase()} is ${fmtLong(v.date)} at ${v.time} with ${DOCTORS[v.doctor].short} (${v.ref}). Reply C to confirm, or tap below.`
    )}</p><button class="btn btn-primary btn-sm" type="button" data-msg-confirm="${v.id}">Confirm I'm coming</button>`;
    thread.appendChild(li);
    if (!active) {
      state.unread += 1;
      setBadge('messages', state.unread);
    }
  }
  toast(`Reminder sent by ${remindLabel().toLowerCase()} to ${phone()}`);
  renderStaff();
}

/* ---------- results ---------- */

function markResultsRead() {
  setBadge('results', 0);
  $$('.result.is-new').forEach((r) => r.classList.remove('is-new'));
}

function toggleResult(btn) {
  const open = btn.getAttribute('aria-expanded') !== 'true';
  btn.setAttribute('aria-expanded', String(open));
  const body = document.getElementById(btn.getAttribute('aria-controls'));
  if (body) body.hidden = !open;
}

function askAboutResult(prefill) {
  showPortal('messages');
  const input = $('#cl-msg');
  if (!input) return;
  input.value = prefill;
  input.focus();
  input.setSelectionRange(input.value.length, input.value.length);
}

/* ---------- refills ---------- */

const selectedMed = () => $('.meds .med.is-selected');
const selectedUrgency = () => $('.urgency [aria-pressed="true"]')?.dataset.urgency || 'days';

function syncRefillForm() {
  const med = selectedMed();
  const send = $('[data-refill-send]');
  const note = $('[data-refill-note]');
  if (send) send.disabled = !med;
  if (!note) return;
  if (!med) {
    note.textContent = 'Pick a medication to see who reviews it and how long it usually takes.';
    return;
  }
  const doc = DOCTORS[med.dataset.medDoc].short;
  const urgent = selectedUrgency() === 'out';
  note.textContent = urgent
    ? `${doc} gets this flagged urgent - usually reviewed the same day. If you're out of your inhaler and short of breath, call 811 or go to emergency.`
    : `${doc} reviews this, usually within 2 business days, and we send it to ${$('#cl-rx-pharm')?.value || 'your pharmacy'}. We'll message you when it's done.`;
}

function rxStatusText(r) {
  const doc = DOCTORS[r.doc].short;
  if (r.step === 1) return r.urgency === 'out' ? `Sent to ${doc} · flagged urgent · usually same day` : `Sent to ${doc} · usually within 2 business days`;
  if (r.step === 2) return `${doc} approved it · sending to ${r.pharm}`;
  if (r.step === 3) return `At ${r.pharm} · ready for pickup after 4 pm tomorrow`;
  return `${doc} would like a quick visit first - book a 15-min follow-up`;
}

function renderRefills() {
  const list = $('[data-refill-list]');
  if (!list) return;
  if (!state.refills.length) {
    list.innerHTML = '<li class="visits-empty" data-refill-empty>No open requests. Approved refills also show up in Messages.</li>';
    return;
  }
  list.innerHTML = state.refills
    .slice()
    .reverse()
    .map((r) => {
      const steps = ['Sent', 'Doctor review', 'At pharmacy']
        .map((s, i) => `<li class="${r.step === 'visit' ? (i === 0 ? 'is-done' : '') : i + 1 < r.step ? 'is-done' : i + 1 === r.step ? 'is-active' : ''}">${s}</li>`)
        .join('');
      return `<li class="rx${r.fresh ? ' is-new' : ''}${r.step === 'visit' ? ' is-visit' : ''}" data-rx-id="${r.id}">
        <div class="rx-top"><strong>${escapeHtml(r.med)}</strong><span class="ref-sm">RX-${String(r.id).padStart(3, '0')}${r.urgency === 'out' ? ' · urgent' : ''}</span></div>
        <p class="rx-status">${escapeHtml(rxStatusText(r))}</p>
        ${r.step === 'visit' ? `<button class="btn btn-primary btn-sm" type="button" data-book-again="${r.doc}|follow">Book the follow-up</button>` : `<ol class="rx-steps" aria-label="Request progress">${steps}</ol>`}
      </li>`;
    })
    .join('');
  state.refills.forEach((r) => (r.fresh = false));
}

function advanceRefill(id) {
  const r = state.refills.find((x) => x.id === id);
  if (!r || r.step === 'visit' || r.step >= 3) return;
  clearTimeout(r.timer);
  r.step += 1;
  if (r.step === 3) {
    addClinicMessage(`Your ${r.med} refill is approved and sent to ${r.pharm}. Ready for pickup after 4 pm tomorrow - no visit needed.`, `${DOCTORS[r.doc].short} · Just now`);
    toast(`Refill approved · sent to ${r.pharm}`);
  } else {
    r.timer = setTimeout(() => advanceRefill(id), r.urgency === 'out' ? 4000 : 6000);
  }
  renderRefills();
  renderStaff();
}

function refillNeedsVisit(id) {
  const r = state.refills.find((x) => x.id === id);
  if (!r || r.step === 'visit' || r.step === 3) return;
  clearTimeout(r.timer);
  r.step = 'visit';
  addClinicMessage(`About your ${r.med} refill - it has been a while since we checked in, so I'd like a quick 15-minute visit before renewing. Book a follow-up and I'll sort the prescription there.`, `${DOCTORS[r.doc].short} · Just now`);
  toast(`${DOCTORS[r.doc].short} asked for a visit first`);
  renderRefills();
  renderStaff();
}

function sendRefill() {
  const med = selectedMed();
  if (!med) return;
  const r = {
    id: state.nextRx,
    med: med.dataset.med,
    doc: med.dataset.medDoc,
    pharm: $('#cl-rx-pharm')?.value || 'Shoppers Drug Mart - Quinpool Rd',
    urgency: selectedUrgency(),
    step: 1,
    fresh: true,
    timer: 0,
  };
  state.nextRx += 1;
  state.refills.push(r);
  r.timer = setTimeout(() => advanceRefill(r.id), r.urgency === 'out' ? 4000 : 6000);
  med.classList.remove('is-selected');
  med.setAttribute('aria-pressed', 'false');
  syncRefillForm();
  renderRefills();
  renderStaff();
  toast(`Request sent to ${DOCTORS[r.doc].short}${r.urgency === 'out' ? ' · flagged urgent' : ''}`);
}

/* ---------- waitlist offer ---------- */

function offerSlot(key) {
  if (!state.waitlist.has(key) || state.wlOffered.has(key)) return;
  const [doctor, date, time] = key.split('|');
  state.wlOffered.add(key);
  state.wlOffer = key;
  const note = $('[data-wlnote]');
  if (!note) return;
  $('[data-wlnote-body]').textContent = `${time} on ${fmtLong(date)} with ${DOCTORS[doctor].short} was just cancelled. You're first on the waitlist - it's yours if you want it.`;
  note.hidden = false;
  note.classList.add('is-open');
  note.focus();
  renderStaff();
}

function closeOffer() {
  const note = $('[data-wlnote]');
  if (!note || note.hidden) return;
  note.classList.remove('is-open');
  note.hidden = true;
  state.wlOffer = null;
}

function takeOffer() {
  const key = state.wlOffer;
  if (!key) return;
  const [doctor, date, time] = key.split('|');
  state.freed.add(key);
  state.waitlist.delete(key);
  closeOffer();
  if (!TYPES[selectedType()].doctors.includes(doctor)) {
    const type = Object.keys(TYPES).find((k) => TYPES[k].doctors.includes(doctor));
    if (type) applyType(type);
  }
  showPortal('book');
  $$('.doctors .doctor').find((b) => b.dataset.label === doctor)?.click();
  showMonthOf(date);
  $(`.cal-month button[data-date="${date}"]`)?.click();
  $$('.slots .slot > button:first-child').find((b) => b.textContent.trim() === time)?.click();
  const note = $('[data-earliest-note]');
  if (note) {
    note.textContent = `🔔 Grabbed from the waitlist: ${fmtLong(date)} at ${time} with ${DOCTORS[doctor].short}. Confirm below to make it yours.`;
    note.hidden = false;
  }
  $('.panel-2 [data-go="3"]')?.click();
  toast(`${time} is held for you for 10 minutes - confirm below`);
  renderStaff();
}

/* ---------- front desk view ---------- */

function boardRows() {
  const rows = [];
  const maya = checkinVisit();
  ALL.forEach((doctor) => {
    if (!worksOn(doctor, TODAY)) return;
    TIMES.forEach((time) => {
      const key = `${doctor}|${TODAY}|${time}`;
      const past = minutes(time) < NOW_MINUTES;
      const row = { doctor, time, key, past };
      if (maya && maya.doctor === doctor && maya.time === time) {
        const map = { due: 'booked', checked: 'checked', room: 'room', done: 'done', hidden: 'done' };
        Object.assign(row, { patient: PEOPLE[maya.patient].name, type: TYPES[maya.type].label, status: map[state.checkin.status], mine: true, note: maya.reason });
      } else if (isTaken(doctor, TODAY, time)) {
        const h = hash(key);
        const types = STAFF_TYPES[doctor];
        Object.assign(row, {
          patient: STAFF_NAMES[h % STAFF_NAMES.length],
          type: TYPES[types[h % types.length]].label,
          status: state.board.get(key) || (past ? 'done' : 'booked'),
        });
      } else {
        row.open = true;
        row.waitlisted = state.waitlist.has(key);
      }
      rows.push(row);
    });
  });
  return rows;
}

function renderStaff() {
  const host = $('[data-staff]');
  if (!host || !host.classList.contains('is-open')) return;
  const rows = boardRows();
  const count = (s) => rows.filter((r) => r.status === s).length;
  const openLeft = rows.filter((r) => r.open && !r.past).length;
  const kpis = [
    ['Booked', count('booked'), 'still to come'],
    ['Checked in', count('checked'), 'in the lounge'],
    ['In room', count('room'), 'with a doctor'],
    ['Done', count('done'), 'seen today'],
    ['Open', openLeft, 'left this afternoon'],
    ['Waitlist', state.waitlist.size, 'patients listed'],
  ];
  $('[data-staff-kpis]').innerHTML = kpis.map(([l, n, s]) => `<div class="kpi"><b>${n}</b><span>${l}</span><small>${s}</small></div>`).join('');

  $$('[data-staff-doc]').forEach((b) => {
    const on = b.dataset.staffDoc === state.staffDoc;
    b.classList.toggle('is-selected', on);
    b.setAttribute('aria-pressed', String(on));
  });

  const shown = rows.filter((r) => state.staffDoc === 'all' || r.doctor === state.staffDoc);
  const groups = ALL.filter((d) => shown.some((r) => r.doctor === d));
  $('[data-staff-board]').innerHTML = groups
    .map((doctor) => {
      const list = shown
        .filter((r) => r.doctor === doctor)
        .map((r) => {
          if (r.open) {
            return `<li class="brow is-open${r.past ? ' is-past' : ''}"><span class="btime">${r.time}</span><span class="bwho"><em>${r.past ? 'Was open' : 'Open · bookable online'}</em></span><span class="bacts">${
              r.waitlisted && !r.past ? `<button class="btn btn-primary btn-sm" type="button" data-staff-offer="${r.key}">Offer to waitlist (1)</button>` : ''
            }</span></li>`;
          }
          let acts = '';
          if (r.status === 'booked') acts = `<button class="btn btn-primary btn-sm" type="button" data-staff-status="${r.key}|checked">Check in</button><button class="btn btn-ghost btn-sm" type="button" data-staff-status="${r.key}|noshow">No-show</button>`;
          else if (r.status === 'checked') acts = `<button class="btn btn-primary btn-sm" type="button" data-staff-status="${r.key}|room">To ${ROOM}</button>`;
          else if (r.status === 'room') acts = `<button class="btn btn-primary btn-sm" type="button" data-staff-status="${r.key}|done">Done</button>`;
          else if (r.status === 'noshow') acts = `<button class="btn btn-ghost btn-sm" type="button" data-staff-status="${r.key}|booked">Undo</button>`;
          return `<li class="brow is-${r.status}${r.mine ? ' is-mine' : ''}"><span class="btime">${r.time}</span><span class="bwho"><strong>${escapeHtml(r.patient)}${
            r.mine ? ' <i class="mine-tag">portal demo</i>' : ''
          }</strong><em>${r.type}${r.note ? ` · “${escapeHtml(r.note)}”` : ''}</em></span><span class="bstatus is-${r.status}">${STATUS_LABEL[r.status]}</span><span class="bacts">${acts}</span></li>`;
        })
        .join('');
      return `<section class="bgroup"><h4><span class="ava" style="background:${doctor === 'Dr. Priya Nair' ? '#0f9d8a' : doctor === 'Dr. Sam Okafor' ? '#f59e0b' : '#6366f1'}">${doctor
        .split(' ')
        .slice(1)
        .map((w) => w[0])
        .join('')}</span>${doctor} <small>${DOCTORS[doctor].spec}</small></h4><ul class="brows">${list}</ul></section>`;
    })
    .join('');

  const wl = Array.from(state.waitlist);
  $('[data-staff-waitlist]').innerHTML = wl.length
    ? wl
        .map((key) => {
          const [doctor, date, time] = key.split('|');
          const offered = state.wlOffered.has(key);
          return `<li><span><strong>Jordan Park</strong><em>${fmtLong(date)} ${time} · ${DOCTORS[doctor].short}</em></span>${
            offered ? '<span class="side-tag">Offered</span>' : `<button class="btn btn-primary btn-sm" type="button" data-staff-offer="${key}">Offer slot</button>`
          }</li>`;
        })
        .join('')
    : '<li class="side-empty">Nobody waiting. Patients join from any taken time in the booking flow.</li>';

  $('[data-staff-refills]').innerHTML = state.refills.length
    ? state.refills
        .slice()
        .reverse()
        .map((r) => {
          const acts =
            r.step === 1
              ? `<span class="side-acts"><button class="btn btn-primary btn-sm" type="button" data-staff-rx="${r.id}|ok">Approve</button><button class="btn btn-ghost btn-sm" type="button" data-staff-rx="${r.id}|visit">Needs a visit</button></span>`
              : `<span class="side-tag">${r.step === 'visit' ? 'Visit requested' : r.step === 2 ? 'Approved' : 'At pharmacy'}</span>`;
          return `<li><span><strong>${escapeHtml(r.med)}${r.urgency === 'out' ? ' <i class="urgent-tag">urgent</i>' : ''}</strong><em>Jordan Park · for ${DOCTORS[r.doc].short} · ${escapeHtml(r.pharm)}</em></span>${acts}</li>`;
        })
        .join('')
    : '<li class="side-empty">No refill requests. They arrive here the moment a patient sends one.</li>';

  const unconfirmed = state.visits.filter((v) => v.date > TODAY && !v.confirmed).sort((a, b) => (a.date < b.date ? -1 : 1));
  $('[data-staff-unconfirmed]').innerHTML = unconfirmed.length
    ? unconfirmed
        .map(
          (v) => `<li><span><strong>${escapeHtml(PEOPLE[v.patient || 'self'].name)}</strong><em>${fmtLong(v.date)} ${v.time} · ${DOCTORS[v.doctor].short} · ${v.ref}</em></span>${
            v.reminded ? '<span class="side-tag">Reminder sent</span>' : `<button class="btn btn-ghost btn-sm" type="button" data-staff-remind="${v.id}">Send reminder now</button>`
          }</li>`
        )
        .join('')
    : '<li class="side-empty">Every upcoming visit is confirmed. Reminders go out automatically the day before.</li>';
}

const staffState = { returnFocus: null };
function openStaff() {
  const host = $('[data-staff]');
  if (!host) return;
  staffState.returnFocus = document.activeElement;
  host.classList.add('is-open');
  document.body.classList.add('cl-staff-lock');
  $$('[data-staff-open]').forEach((b) => b.setAttribute('aria-expanded', 'true'));
  renderStaff();
  host.focus();
}
function closeStaff() {
  const host = $('[data-staff]');
  if (!host?.classList.contains('is-open')) return;
  host.classList.remove('is-open');
  document.body.classList.remove('cl-staff-lock');
  $$('[data-staff-open]').forEach((b) => b.setAttribute('aria-expanded', 'false'));
  staffState.returnFocus?.focus?.();
  staffState.returnFocus = null;
}

function setBoardStatus(key, status) {
  const maya = checkinVisit();
  if (maya && key === `${maya.doctor}|${TODAY}|${maya.time}`) {
    const map = { booked: 'due', checked: 'checked', room: 'room', done: 'done' };
    if (status === 'noshow') {
      toast(`${PEOPLE[maya.patient].short} checked in online - not a no-show`);
      return;
    }
    setCheckin(map[status]);
    if (status === 'room') toast(`Patient's phone now says: ${DOCTORS[maya.doctor].short} is ready - ${ROOM}`);
    return;
  }
  state.board.set(key, status);
  renderStaff();
}

/* ---------- video visits: in-clinic / video choice + device check ---------- */

const VIDEO_TYPES = ['follow', 'new'];
const videoOk = (type) => VIDEO_TYPES.includes(type);
const WHERE_LABEL = { clinic: 'In the clinic', video: 'Video call' };
const DEV_STEPS = [
  { dev: 'cam', msg: 'Front camera found · picture looks good', delay: 700 },
  { dev: 'mic', msg: 'Built-in microphone · level is good', delay: 1400 },
  { dev: 'net', msg: 'Wi-Fi · fast enough for HD', delay: 2100 },
];

function whereNote() {
  const type = selectedType();
  const t = TYPES[type];
  if (!videoOk(type)) return `${t.label}s are in person - the doctor needs to examine you. Follow-ups and new-patient visits can be done by video.`;
  if (state.where === 'video') return `Video visit · ${t.label} · ${t.mins} min. You get a join link 15 minutes before; no app to install. No health card needed - it's on file.`;
  return `${t.label} visits also work by video if that's easier - same doctor, same length, no parking.`;
}

function syncWhere() {
  const type = selectedType();
  const ok = videoOk(type);
  if (!ok && state.where === 'video') state.where = 'clinic';
  $$('[data-where]').forEach((b) => {
    const on = b.dataset.where === state.where;
    b.classList.toggle('is-selected', on);
    b.setAttribute('aria-pressed', String(on));
    if (b.dataset.where === 'video') {
      b.disabled = !ok;
      b.title = ok ? '' : `${TYPES[type].label}s are in person only`;
    }
  });
  $$('[data-where-out]').forEach((o) => (o.textContent = WHERE_LABEL[state.where]));
  const note = $('[data-where-note]');
  if (note) note.textContent = whereNote();
}

function setWhere(key) {
  if (!WHERE_LABEL[key]) return;
  if (key === 'video' && !videoOk(selectedType())) {
    toast(`${TYPES[selectedType()].label}s are in person only`);
    return;
  }
  state.where = key;
  syncWhere();
}

function resetDevRows() {
  $$('[data-dev]').forEach((li) => {
    li.classList.remove('is-ok');
    li.classList.add('is-checking');
    $('[data-dev-msg]', li).textContent = 'Checking…';
    $('[data-dev-state]', li).textContent = '…';
  });
}

function openDevCheck(id) {
  const v = state.visits.find((x) => x.id === id);
  const host = $('[data-devcheck]');
  if (!v || !host) return;
  const d = state.dev;
  d.visit = id;
  d.ready = false;
  d.timers.forEach(clearTimeout);
  d.timers = [];
  d.returnFocus = document.activeElement;
  resetDevRows();
  const sub = $('[data-devcheck-sub]');
  if (sub) sub.textContent = `${fmtLong(v.date)} at ${v.time} with ${DOCTORS[v.doctor].short}. Checking your camera, microphone and connection - takes a few seconds.`;
  const join = $('[data-devcheck-join]');
  if (join) {
    join.disabled = true;
    join.textContent = 'Join call';
  }
  host.classList.add('is-open');
  $('.cl-modal-card', host).focus();
  DEV_STEPS.forEach((step, i) => {
    d.timers.push(
      setTimeout(() => {
        const li = $(`[data-dev="${step.dev}"]`);
        if (li) {
          li.classList.remove('is-checking');
          li.classList.add('is-ok');
          $('[data-dev-msg]', li).textContent = step.msg;
          $('[data-dev-state]', li).textContent = 'Ready ✓';
        }
        if (i === DEV_STEPS.length - 1) {
          d.ready = true;
          if (sub) sub.textContent = `All set. ${DOCTORS[v.doctor].short} will start the call at ${v.time} - join a few minutes early and wait in the virtual waiting room.`;
          if (join) join.disabled = false;
        }
      }, step.delay)
    );
  });
}

function closeDevCheck() {
  const host = $('[data-devcheck]');
  if (!host?.classList.contains('is-open')) return;
  const d = state.dev;
  d.timers.forEach(clearTimeout);
  d.timers = [];
  host.classList.remove('is-open');
  d.returnFocus?.focus?.();
  d.returnFocus = null;
  d.visit = null;
}

function joinCall() {
  const d = state.dev;
  const v = state.visits.find((x) => x.id === d.visit);
  if (!v || !d.ready) return;
  v.joined = true;
  v.confirmed = true;
  d.returnFocus = null; // the "Test camera & mic" button is about to be re-rendered away
  closeDevCheck();
  renderVisits();
  $(`[data-visit-id="${v.id}"] [data-visit-resched]`)?.focus();
  addClinicMessage(
    `You're in the waiting room for ${fmtLong(v.date)} ${v.time}. ${DOCTORS[v.doctor].short} will start the call - keep this tab open, or we'll text you a link to rejoin.`,
    'Maple Clinic video · Just now'
  );
  toast(`In the waiting room · ${DOCTORS[v.doctor].short} starts the call from their side`);
  if ($('[data-staff]')?.classList.contains('is-open')) renderStaff();
}

/* ---------- wiring ---------- */

function initExtras() {
  REPLIES.unshift([/video|camera|join|link/i, 'Video visits use a link we text you 15 minutes before - no app needed. Test your camera and mic any time from My visits.']);

  document.addEventListener('keydown', (event) => {
    const host = $('[data-devcheck]');
    if (!host?.classList.contains('is-open')) return;
    if (event.key === 'Escape') {
      event.preventDefault();
      event.stopImmediatePropagation();
      closeDevCheck();
    } else if (event.key === 'Tab') {
      const focusables = $$('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])', host).filter((el) => !el.disabled);
      if (!focusables.length) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      if (event.shiftKey && (document.activeElement === first || document.activeElement === host.firstElementChild)) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }
  });
  $('[data-devcheck]')?.addEventListener('click', (event) => {
    if (event.target === event.currentTarget) closeDevCheck();
  });

  document.addEventListener('click', (event) => {
    const t = event.target.closest('button');
    if (!t) return;

    if (t.matches('[data-patient]')) return setPatient(t.dataset.patient);
    if (t.matches('[data-triage]')) return applyTriage(t.dataset.triage);
    if (t.matches('[data-triage-go]')) return $('.panel-1 [data-go="2"]')?.click();
    if (t.matches('[data-triage-refills]')) return showPortal('refills');
    if (t.matches('[data-emergency-close]')) return clearTriage();
    if (t.matches('[data-book-another]')) {
      clearTriage();
      return setWhere('clinic');
    }

    if (t.matches('[data-where]')) return setWhere(t.dataset.where);
    if (t.matches('[data-visit-resched]')) {
      // startReschedule (registered earlier) has already set the type; carry the visit's location over.
      const v = state.visits.find((x) => x.id === t.dataset.visitResched);
      return setWhere(v?.where === 'video' && videoOk(selectedType()) ? 'video' : 'clinic');
    }
    if (t.matches('[data-video-check]')) return openDevCheck(t.dataset.videoCheck);
    if (t.matches('[data-devcheck-close]')) return closeDevCheck();
    if (t.matches('[data-devcheck-join]')) return joinCall();

    if (t.matches('[data-checkin]')) return checkIn();
    if (t.matches('[data-arrive-ack]')) {
      state.checkin.acked = true;
      renderArrive();
      return toast('Told the front desk you are on your way');
    }
    if (t.matches('[data-arrive-dismiss]')) {
      state.checkin.status = 'hidden';
      return renderArrive();
    }
    if (t.matches('[data-visit-confirm]')) return confirmComing(t.dataset.visitConfirm);
    if (t.matches('[data-msg-confirm]')) return confirmComing(t.dataset.msgConfirm);

    if (t.matches('[data-portal="results"]')) return markResultsRead();
    if (t.matches('[data-result-toggle]')) return toggleResult(t);
    if (t.matches('[data-ask-result]')) return askAboutResult(t.dataset.askResult);

    if (t.matches('[data-med]')) {
      const on = !t.classList.contains('is-selected');
      $$('.meds .med').forEach((m) => {
        m.classList.toggle('is-selected', on && m === t);
        m.setAttribute('aria-pressed', String(on && m === t));
      });
      return syncRefillForm();
    }
    if (t.matches('[data-urgency]')) {
      $$('[data-urgency]').forEach((u) => u.setAttribute('aria-pressed', String(u === t)));
      return syncRefillForm();
    }

    if (t.matches('[data-waitlist]')) {
      const key = `${selectedDoctor()}|${selectedDate()}|${t.dataset.waitlist}`;
      clearTimeout(state.wlTimer);
      if (state.waitlist.has(key) && !state.wlOffered.has(key)) state.wlTimer = setTimeout(() => offerSlot(key), 7000);
      return renderStaff();
    }
    if (t.matches('[data-wlnote-take]')) return takeOffer();
    if (t.matches('[data-wlnote-dismiss]')) {
      closeOffer();
      return toast("No problem - you're still on the waitlist");
    }

    if (t.matches('[data-staff-open]')) return openStaff();
    if (t.matches('[data-staff-close]')) return closeStaff();
    if (t.matches('[data-staff-doc]')) {
      state.staffDoc = t.dataset.staffDoc;
      return renderStaff();
    }
    if (t.matches('[data-staff-status]')) {
      const [doctor, date, time, status] = t.dataset.staffStatus.split('|');
      return setBoardStatus(`${doctor}|${date}|${time}`, status);
    }
    if (t.matches('[data-staff-offer]')) {
      clearTimeout(state.wlTimer);
      closeStaff();
      offerSlot(t.dataset.staffOffer);
      return toast('Offer sent to the patient - they have 10 minutes to take it');
    }
    if (t.matches('[data-staff-rx]')) {
      const [id, action] = t.dataset.staffRx.split('|');
      return action === 'ok' ? advanceRefill(Number(id)) : refillNeedsVisit(Number(id));
    }
    if (t.matches('[data-staff-remind]')) return sendReminderNow(t.dataset.staffRemind);
    return undefined;
  });

  // Escape closes the topmost overlay: the confirm modal (handled above),
  // then the waitlist offer, then the front-desk view.
  document.addEventListener('keydown', (event) => {
    if (event.key !== 'Escape') return;
    if ($('[data-modal]')?.classList.contains('is-open')) return;
    const note = $('[data-wlnote]');
    if (note && !note.hidden) {
      event.preventDefault();
      closeOffer();
      return;
    }
    if ($('[data-staff]')?.classList.contains('is-open')) {
      event.preventDefault();
      closeStaff();
    }
  });

  $('[data-refill-form]')?.addEventListener('submit', (event) => {
    event.preventDefault();
    sendRefill();
  });
  $('#cl-rx-pharm')?.addEventListener('change', syncRefillForm);

  setPatient('self');
  syncRefillForm();
  renderRefills();
  renderArrive();
}

if (document.readyState !== 'loading') init();
else document.addEventListener('DOMContentLoaded', init);
