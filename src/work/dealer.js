// Rideau Motorworks - parts & service portal. Loaded after mockups.js, which
// still owns the generic hooks (data-tab/data-panel for the section and
// counter tabs, data-filter/data-type for the category rail, data-toggle for
// the picker and order drawer, data-close, data-go/data-steps for the service
// booking, data-select-group/data-out for service choices, data-scroll,
// data-collapse, data-say). This module owns the catalogue itself: fitment
// against the pinned vehicle, OEM vs aftermarket pricing and stock, the part
// drawer, the order/checkout drawer, the work-order tracker and the parts
// counter staff view.
// Contract: JS only toggles classes / attributes / text and builds strings.
// CSS owns every transition and animation.

const HST = 0.13;
const TIER = 0.12; // trade tier 2
const COURIER = 18.5;
const DEPOSIT_OVER = 250;

const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
const money = (n) => `$${n.toFixed(2)}`;
const escapeHtml = (s) =>
  String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

/* ---------- vehicles ---------- */

const GARAGE = [
  { id: 'f150', year: 2021, make: 'Ford', model: 'F-150', trim: 'XLT', engine: '3.5L EcoBoost V6', vin: '1FTFW1E85MFA10394', plate: 'CRO 481', km: '96,410 km' },
  { id: 'transit', year: 2019, make: 'Ford', model: 'Transit 250', trim: 'Cargo Medium Roof', engine: '3.7L V6', vin: '1FTYR2CM4KKA88213', plate: 'CRO 902', km: '184,220 km' },
  { id: 'ram', year: 2020, make: 'Ram', model: '1500', trim: 'Big Horn', engine: '5.7L HEMI V8', vin: '1C6SRFFT4LN214776', plate: 'CRO 355', km: '71,880 km' },
];

const CATALOGUE = {
  Ford: {
    'F-150': ['XL · 3.3L V6', 'XLT · 3.5L EcoBoost V6', 'Lariat · 5.0L V8', 'Raptor · 3.5L HO V6'],
    'Transit 250': ['Cargo Low Roof · 3.5L V6', 'Cargo Medium Roof · 3.7L V6'],
    Escape: ['S · 2.5L I4', 'SE · 1.5L EcoBoost I3', 'Titanium · 2.0L EcoBoost I4'],
    Explorer: ['XLT · 2.3L EcoBoost I4', 'Limited · 3.0L V6'],
  },
  Ram: {
    1500: ['Tradesman · 3.6L V6', 'Big Horn · 5.7L HEMI V8', 'Laramie · 5.7L HEMI V8'],
    2500: ['Tradesman · 6.4L HEMI V8', 'Laramie · 6.7L Cummins I6'],
    'ProMaster 2500': ['High Roof 159" · 3.6L V6'],
  },
  Chevrolet: {
    'Silverado 1500': ['WT · 4.3L V6', 'LT · 5.3L V8', 'RST · 5.3L V8'],
    Equinox: ['LS · 1.5L Turbo I4', 'RS · 1.5L Turbo I4'],
    Malibu: ['LT · 1.5L Turbo I4'],
  },
};
const YEARS = [2024, 2023, 2022, 2021, 2020, 2019, 2018, 2017, 2016, 2015];

const VINS = [
  { p: '1FTFW1E', v: { year: 2021, make: 'Ford', model: 'F-150', trim: 'XLT', engine: '3.5L EcoBoost V6' } },
  { p: '1FTYR2C', v: { year: 2019, make: 'Ford', model: 'Transit 250', trim: 'Cargo Medium Roof', engine: '3.7L V6' } },
  { p: '1C6SRFF', v: { year: 2020, make: 'Ram', model: '1500', trim: 'Big Horn', engine: '5.7L HEMI V8' } },
  { p: '3GCUYDE', v: { year: 2022, make: 'Chevrolet', model: 'Silverado 1500', trim: 'LT', engine: '5.3L V8' } },
];

/* ---------- catalogue ---------- */

const CATS = {
  brakes: 'Brakes',
  filters: 'Filters',
  suspension: 'Suspension',
  electrical: 'Electrical',
  body: 'Body & glass',
  fluids: 'Fluids',
};

// stock: on the Merivale shelf / at the Kanata store. eta = when a
// back-ordered line lands from the Brampton distribution centre.
const PARTS = [
  {
    id: 'p1', name: 'Front brake pad set, ceramic', cat: 'brakes', models: ['F-150'], years: [2015, 2023],
    oem: { pn: 'BR-1414-B', brand: 'Motorcraft', price: 189.95, core: 0, m: 6, k: 2 },
    am: { pn: 'EHT1414H', brand: 'Raybestos Element3', price: 118.5, core: 0, m: 11, k: 4 },
    specs: [['Position', 'Front axle'], ['Friction', 'Ceramic, low dust'], ['In the box', '4 pads, shims, hardware kit'], ['Rotor min. thickness', '32.0 mm'], ['Warranty', '24 months / 40,000 km']],
  },
  {
    id: 'p2', name: 'Front brake rotor, vented 350 mm', cat: 'brakes', models: ['F-150'], years: [2015, 2023],
    oem: { pn: 'BRR-179', brand: 'Motorcraft', price: 154.0, core: 0, m: 2, k: 0 },
    am: { pn: '50011600', brand: 'Bosch QuietCast', price: 96.75, core: 0, m: 8, k: 3 },
    specs: [['Diameter', '350 mm'], ['Type', 'Vented, e-coated'], ['New thickness', '34.0 mm'], ['Discard at', '32.0 mm'], ['Sold as', 'Each - order two']],
  },
  {
    id: 'p3', name: 'Rear brake caliper, driver side (reman)', cat: 'brakes', models: ['F-150'], years: [2015, 2023],
    oem: { pn: 'BRC-586', brand: 'Motorcraft', price: 412.0, core: 85, m: 0, k: 0, eta: 'Tue, Sep 8' },
    am: { pn: '19-3421', brand: 'Cardone', price: 228.0, core: 60, m: 2, k: 1 },
    supersedes: 'Supersedes BRC-501 - bracket bolts changed to M12 for 2018 and later. Old stock will not bolt up.',
    specs: [['Position', 'Rear, driver side'], ['Piston', 'Single 54 mm, phenolic'], ['Includes', 'Bleeder, bracket bolts'], ['Core return', 'Within 30 days, drained'], ['Warranty', 'Lifetime, reman']],
  },
  {
    id: 'p4', name: 'Engine oil filter', cat: 'filters', models: ['F-150', 'Transit 250', 'Expedition'], years: [2011, 2024],
    oem: { pn: 'FL-500S', brand: 'Motorcraft', price: 12.95, core: 0, m: 24, k: 9 },
    am: { pn: '57502', brand: 'Wix', price: 9.4, core: 0, m: 30, k: 12 },
    specs: [['Thread', '3/4"-16 UNF'], ['Bypass valve', '12-16 psi'], ['Anti-drainback', 'Silicone'], ['Height', '92 mm'], ['Torque to', '3/4 turn past contact']],
  },
  {
    id: 'p5', name: 'Engine air filter', cat: 'filters', models: ['F-150'], years: [2015, 2023],
    oem: { pn: 'FA-1927', brand: 'Motorcraft', price: 38.5, core: 0, m: 5, k: 1 },
    am: { pn: '33-5044', brand: 'K&N washable', price: 79.99, core: 0, m: 3, k: 0 },
    specs: [['Shape', 'Panel'], ['Media', 'Pleated cellulose'], ['Service', 'Every 30,000 km'], ['Size', '289 × 216 × 41 mm'], ['Note', 'Dusty sites: check at every oil change']],
  },
  {
    id: 'p6', name: 'Cabin air filter, charcoal', cat: 'filters', models: ['F-150'], years: [2015, 2023],
    oem: { pn: 'FP-84', brand: 'Motorcraft', price: 34.25, core: 0, m: 11, k: 5 },
    am: { pn: 'CF12172', brand: 'Fram Fresh Breeze', price: 21.99, core: 0, m: 16, k: 6 },
    specs: [['Location', 'Behind the glovebox'], ['Media', 'Activated charcoal'], ['Service', 'Every 20,000 km'], ['Fit time', '10 minutes, no tools'], ['Size', '242 × 205 × 30 mm']],
  },
  {
    id: 'p7', name: 'Front shock absorber, gas', cat: 'suspension', models: ['F-150'], years: [2015, 2023],
    oem: { pn: 'ASH-24172', brand: 'Motorcraft', price: 178.0, core: 0, m: 2, k: 0 },
    am: { pn: '24-286502', brand: 'Bilstein 4600', price: 214.0, core: 0, m: 4, k: 2 },
    specs: [['Position', 'Front, either side'], ['Type', 'Monotube gas'], ['Extended length', '541 mm'], ['Sold as', 'Each - replace in pairs'], ['Alignment', 'Not required']],
  },
  {
    id: 'p8', name: 'Upper control arm, left front', cat: 'suspension', models: ['F-150'], years: [2015, 2023],
    oem: { pn: 'BK3Z-3084-C', brand: 'Ford genuine', price: 246.0, core: 0, m: 0, k: 0, eta: 'Thu, Sep 10' },
    am: { pn: 'RK622878', brand: 'Moog Problem Solver', price: 151.25, core: 0, m: 2, k: 0 },
    supersedes: 'Supersedes BK3Z-3084-B - ball joint boot revised January 2019.',
    specs: [['Position', 'Left front, upper'], ['Ball joint', 'Pressed, greasable (Moog)'], ['Bushings', 'Included'], ['After fitting', 'Four-wheel alignment required'], ['Warranty', '12 months / 20,000 km']],
  },
  {
    id: 'p9', name: 'Front stabilizer bar link kit', cat: 'suspension', models: ['F-150'], years: [2015, 2023],
    oem: { pn: 'FL3Z-5K483-A', brand: 'Motorcraft', price: 84.0, core: 0, m: 8, k: 3 },
    am: { pn: 'K750176', brand: 'Moog', price: 46.8, core: 0, m: 14, k: 5 },
    specs: [['Position', 'Front, either side'], ['Length', '196 mm centre to centre'], ['Hardware', 'Nuts included'], ['Common symptom', 'Clunk over speed bumps'], ['Sold as', 'One link']],
  },
  {
    id: 'p10', name: 'AGM battery, group 65 · 760 CCA', cat: 'electrical', models: ['F-150', 'Transit 250', 'Expedition', 'Silverado 1500'], years: [2011, 2024],
    oem: { pn: 'BXT-65-650', brand: 'Motorcraft', price: 289.95, core: 30, m: 3, k: 1 },
    am: { pn: '65-AGM-760', brand: 'NorthStar', price: 259.99, core: 30, m: 5, k: 2 },
    specs: [['Group size', '65'], ['Cold cranking amps', '760 CCA at −18 °C'], ['Reserve capacity', '150 minutes'], ['Chemistry', 'AGM, sealed'], ['Warranty', '36 months free replacement']],
  },
  {
    id: 'p11', name: 'Alternator, 200 A (reman)', cat: 'electrical', models: ['F-150'], years: [2015, 2023],
    oem: { pn: 'GL-8940', brand: 'Motorcraft', price: 612.0, core: 110, m: 0, k: 0, eta: 'Wed, Sep 9' },
    am: { pn: '210-1197', brand: 'Denso', price: 398.5, core: 85, m: 1, k: 0 },
    specs: [['Output', '200 A'], ['Pulley', '6-groove clutch pulley'], ['Regulator', 'Integrated, LIN-controlled'], ['Core return', 'Within 30 days'], ['Warranty', '24 months / unlimited km']],
  },
  {
    id: 'p12', name: 'Spark plug set of 8 · 5.7L HEMI', cat: 'electrical', models: ['1500', '2500'], years: [2013, 2023],
    oem: { pn: 'SP-149', brand: 'Mopar', price: 96.0, core: 0, m: 6, k: 2 },
    am: { pn: '6619 (8 pack)', brand: 'NGK Iridium IX', price: 78.4, core: 0, m: 9, k: 3 },
    specs: [['Quantity', '8 plugs - HEMI runs 16, order two sets for a full job'], ['Gap', '0.043" pre-gapped'], ['Electrode', 'Iridium'], ['Service', 'Every 160,000 km'], ['Torque', '13 lb-ft']],
  },
  {
    id: 'p13', name: 'Headlamp assembly, right (halogen)', cat: 'body', models: ['F-150'], years: [2018, 2020],
    oem: { pn: 'ML3Z-13008-K', brand: 'Ford genuine', price: 748.0, core: 0, m: 1, k: 0 },
    am: { pn: '330-1170R-AS', brand: 'Depo', price: 312.0, core: 0, m: 0, k: 0, eta: 'Mon, Sep 7' },
    specs: [['Side', 'Right / passenger'], ['Bulb type', 'Halogen, H11 low beam'], ['Includes', 'Housing and mounting tabs'], ['Bulbs', 'Not included'], ['Aim', 'Adjust after fitting']],
  },
  {
    id: 'p14', name: 'Front bumper air deflector', cat: 'body', models: ['F-150'], years: [2015, 2023],
    oem: { pn: 'JL3Z-17626-AB', brand: 'Ford genuine', price: 164.5, core: 0, m: 4, k: 1 },
    am: { pn: 'F014901', brand: 'Replace', price: 88.0, core: 0, m: 6, k: 2 },
    specs: [['Location', 'Under the front bumper'], ['Material', 'Textured black PP'], ['Hardware', 'Clips included'], ['Why it matters', 'Worth about 2% on highway fuel'], ['Fit time', '30 minutes']],
  },
  {
    id: 'p15', name: 'Wiper blade set, 22" / 22"', cat: 'body', models: ['F-150'], years: [2015, 2023],
    oem: { pn: 'WW-2202-PF', brand: 'Motorcraft', price: 52.0, core: 0, m: 9, k: 4 },
    am: { pn: '8A221', brand: 'Rain-X Latitude', price: 38.5, core: 0, m: 12, k: 6 },
    specs: [['Sizes', '22" driver, 22" passenger'], ['Type', 'Beam, winter-ready'], ['Connector', 'J-hook'], ['Sold as', 'Pair'], ['Fit time', 'Two minutes at the counter']],
  },
  {
    id: 'p16', name: 'Full synthetic 5W-20 · 5 L jug', cat: 'fluids', models: ['F-150', 'Transit 250', 'Expedition'], years: [2011, 2024],
    oem: { pn: 'XO-5W20-5QSP', brand: 'Motorcraft', price: 42.95, core: 0, m: 30, k: 14 },
    am: { pn: 'GTX-5W20-5L', brand: 'Castrol GTX', price: 34.99, core: 0, m: 22, k: 10 },
    specs: [['Grade', 'SAE 5W-20 full synthetic'], ['Spec', 'Ford WSS-M2C960-A1'], ['Capacity', '3.5L EcoBoost takes 6.0 L'], ['Volume', '5 L jug'], ['Note', 'Order two jugs for a full change']],
  },
  {
    id: 'p17', name: 'DOT 3 brake fluid · 946 mL', cat: 'fluids', models: ['F-150', 'Transit 250', '1500', 'Silverado 1500'], years: [2011, 2024],
    oem: { pn: 'PM-1-C', brand: 'Motorcraft', price: 14.75, core: 0, m: 18, k: 7 },
    am: { pn: 'AS401', brand: 'Prestone', price: 9.99, core: 0, m: 24, k: 9 },
    specs: [['Spec', 'DOT 3, high boiling point'], ['Dry boiling point', '260 °C'], ['Volume', '946 mL'], ['Shelf life', '12 months once opened'], ['Note', 'Flush every 3 years']],
  },
  {
    id: 'p18', name: 'Orange coolant concentrate · 3.78 L', cat: 'fluids', models: ['F-150', 'Transit 250', 'Expedition'], years: [2011, 2024],
    oem: { pn: 'VC-3DIL-B', brand: 'Motorcraft', price: 39.95, core: 0, m: 7, k: 3 },
    am: { pn: 'ZXP-OR', brand: 'Zerex', price: 28.49, core: 0, m: 10, k: 4 },
    specs: [['Colour', 'Orange, silicate-free'], ['Spec', 'Ford WSS-M97B44-D'], ['Mix', '50/50 with distilled water'], ['Volume', '3.78 L concentrate'], ['Do not mix', 'With yellow or green coolant']],
  },
];

const ART = {
  brakes: '<svg viewBox="0 0 140 100" role="img" aria-label="Brake part"><circle cx="70" cy="50" r="34" fill="none" stroke="#7d92ad" stroke-width="6"/><circle cx="70" cy="50" r="17" fill="none" stroke="#9fb3cc" stroke-width="4"/><circle cx="70" cy="50" r="5" fill="#9fb3cc"/><circle cx="70" cy="26" r="3" fill="#0f1722"/><circle cx="90" cy="62" r="3" fill="#0f1722"/><circle cx="50" cy="62" r="3" fill="#0f1722"/><rect x="96" y="34" width="16" height="32" rx="4" fill="#ff6a1f"/></svg>',
  filters: '<svg viewBox="0 0 140 100" role="img" aria-label="Filter part"><rect x="52" y="24" width="36" height="52" rx="4" fill="#8ea0b8"/><ellipse cx="70" cy="76" rx="18" ry="6" fill="#63779a"/><path d="M58 30v40M64 30v40M70 30v40M76 30v40M82 30v40" stroke="#3a4b66" stroke-width="2"/><ellipse cx="70" cy="24" rx="18" ry="6" fill="#ff6a1f"/></svg>',
  suspension: '<svg viewBox="0 0 140 100" role="img" aria-label="Suspension part"><rect x="66" y="14" width="8" height="20" rx="4" fill="#9fb3cc"/><path d="M56 36h28l-28 8h28l-28 8h28l-28 8h28l-28 8h28" fill="none" stroke="#ff6a1f" stroke-width="5" stroke-linejoin="round"/><rect x="60" y="76" width="20" height="12" rx="3" fill="#9fb3cc"/></svg>',
  electrical: '<svg viewBox="0 0 140 100" role="img" aria-label="Electrical part"><rect x="40" y="32" width="60" height="42" rx="5" fill="#63779a"/><rect x="48" y="24" width="10" height="9" rx="2" fill="#ff6a1f"/><rect x="82" y="24" width="10" height="9" rx="2" fill="#9fb3cc"/><path d="M70 40l-9 16h8l-3 12 13-18h-8z" fill="#ffb020"/></svg>',
  body: '<svg viewBox="0 0 140 100" role="img" aria-label="Body part"><path d="M34 36h58l14 14-14 16H34z" fill="#8ea0b8"/><path d="M42 44h44l8 6-8 8H42z" fill="#0f1722"/><circle cx="62" cy="52" r="7" fill="#ffb020"/><path d="M106 44l16-6M106 52h18M106 60l16 6" stroke="#ff6a1f" stroke-width="3" stroke-linecap="round"/></svg>',
  fluids: '<svg viewBox="0 0 140 100" role="img" aria-label="Fluid product"><rect x="52" y="30" width="36" height="52" rx="6" fill="#8ea0b8"/><rect x="64" y="18" width="12" height="14" rx="2" fill="#63779a"/><rect x="62" y="14" width="16" height="7" rx="2" fill="#ff6a1f"/><rect x="58" y="44" width="24" height="22" rx="3" fill="#0f1722"/><path d="M62 56h16" stroke="#ffb020" stroke-width="3"/></svg>',
};

/* ---------- service ---------- */

const SERVICES = {
  oil: { label: 'Oil & filter change', mins: 45, wait: true, price: '$89.95' },
  brakes: { label: 'Brake service', mins: 60, wait: true, price: 'from $59.95' },
  diag: { label: 'Diagnostics', mins: 60, wait: true, price: '$149.00' },
  tires: { label: 'Tire changeover & balance', mins: 75, wait: true, price: '$99.95' },
  align: { label: 'Four-wheel alignment', mins: 90, wait: true, price: '$139.95' },
  timing: { label: 'Timing chain & cover reseal', mins: 960, wait: false, price: '$1,480.00' },
};

const DAYS = {
  fri: { label: 'Fri, Sep 4', full: ['9:00'], closed: [], cars: 4 },
  sat: { label: 'Sat, Sep 5', full: ['10:30', '13:00'], closed: ['14:30', '16:00'], cars: 0 },
  mon: { label: 'Mon, Sep 7', full: [], closed: [], cars: 6 },
  tue: { label: 'Tue, Sep 8', full: ['7:30', '10:30'], closed: [], cars: 2 },
  wed: { label: 'Wed, Sep 9', full: [], closed: [], cars: 5 },
};

/* ---------- state ---------- */

const state = {
  vehicle: { ...GARAGE[0] },
  mode: 'oem',
  search: '',
  fitOnly: false,
  lines: [], // { pid, mode, qty, unverified }
  recent: [],
  drawer: { pid: null, mode: 'oem', qty: 1 },
  cstep: 'cart',
  fulfil: 'pickup',
  nextOrder: 20418,
  lastOrder: null,
  nextRO: 88221,
  ro: { stage: 'parts', quote: 'open', total: 272.4 },
  svc: { key: 'oil', day: 'fri', time: '', timeLabel: '', mode: 'drop', courtesy: false },
  openOrders: [
    { kind: 'order', title: 'RM-20411 · 2 lines · $318.72', note: 'Placed yesterday 4:12 PM · PO CC-1191', tag: 'Picking now' },
    { kind: 'backorder', title: 'Upper control arm · BK3Z-3084-C', note: 'Special order for the 2021 F-150 · deposit taken', tag: 'Arrives Thu, Sep 10' },
  ],
  queue: [
    { no: 'RM-20411', cust: 'Croteau Contracting', lines: 2, total: '$318.72', status: 'new' },
    { no: 'RM-20409', cust: 'Beaudry Auto Repair', lines: 5, total: '$742.15', status: 'picking' },
    { no: 'RM-20408', cust: 'Walk-in · S. Nadeau', lines: 1, total: '$42.95', status: 'packed' },
    { no: 'RM-20405', cust: 'City of Ottawa fleet', lines: 9, total: '$2,184.30', status: 'ready' },
  ],
  low: [
    { pn: 'BRR-179', name: 'Front brake rotor, vented 350 mm', hand: 2, min: 4, qty: 6, ordered: false },
    { pn: 'ASH-24172', name: 'Front shock absorber, gas', hand: 2, min: 4, qty: 4, ordered: false },
    { pn: 'ML3Z-13008-K', name: 'Headlamp assembly, right', hand: 1, min: 2, qty: 2, ordered: false },
    { pn: 'FA-1927', name: 'Engine air filter', hand: 5, min: 6, qty: 12, ordered: false },
    { pn: 'BXT-65-650', name: 'AGM battery, group 65', hand: 3, min: 6, qty: 6, ordered: false },
  ],
  inbound: [
    { pn: 'BRC-586', name: 'Rear brake caliper (reman)', who: 'Croteau Contracting · RM-20411', eta: 'Tue, Sep 8', got: false },
    { pn: 'GL-8940', name: 'Alternator, 200 A (reman)', who: 'Beaudry Auto Repair · RM-20396', eta: 'Wed, Sep 9', got: false },
    { pn: 'BK3Z-3084-C', name: 'Upper control arm, left front', who: 'Croteau Contracting · RM-20402', eta: 'Thu, Sep 10', got: false },
  ],
  bays: [
    { n: 1, veh: '2019 Transit 250', ro: 'RO-88207', tech: 'Kayla Doucette', job: 'Front brakes + oil service', status: 'parts', eta: '3:30 PM' },
    { n: 2, veh: '2022 Silverado 1500', ro: 'RO-88211', tech: 'Owen Tremblay', job: 'Oil & filter change', status: 'hoist', eta: '11:15 AM' },
    { n: 3, veh: '', ro: '', tech: 'Owen Tremblay', job: '', status: 'free', eta: '' },
    { n: 4, veh: '2020 Ram 1500', ro: 'RO-88209', tech: 'Priya Sandhu', job: 'Four-wheel alignment', status: 'hoist', eta: '1:00 PM' },
  ],
  modal: { onOk: null, returnFocus: null },
  overlayFocus: null,
};

const byId = (pid) => PARTS.find((p) => p.id === pid);
const variant = (part, mode) => part[mode || state.mode];
const vehLabel = (v) => `${v.year} ${v.make} ${v.model}`;
const vehFull = (v) => `${v.year} ${v.make} ${v.model} ${v.trim} · ${v.engine}`;
const fits = (part, v = state.vehicle) => !!v && part.models.includes(v.model) && v.year >= part.years[0] && v.year <= part.years[1];
const fitLine = (part) => `${part.years[0]}-${part.years[1]} ${part.models.join(' · ')}`;
const onHand = (va) => (va.m || 0) + (va.k || 0);

/* ---------- toast ---------- */

let toastTimer = 0;
function toast(text) {
  const el = $('[data-dl-toast]');
  if (!el) return;
  el.textContent = text;
  el.classList.add('is-shown');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('is-shown'), 2800);
}

/* ---------- modal ---------- */

function openModal({ flag, title, body, ok, onOk }) {
  const host = $('[data-dl-modal]');
  if (!host) return;
  $('[data-dl-modal-flag]', host).textContent = flag;
  $('#dl-modal-title').textContent = title;
  $('#dl-modal-body').textContent = body;
  $('[data-dl-modal-ok]', host).textContent = ok;
  state.modal.onOk = onOk;
  state.modal.returnFocus = document.activeElement;
  host.classList.add('is-open');
  $('.dl-modal-card', host).focus();
}

function closeModal() {
  const host = $('[data-dl-modal]');
  if (!host || !host.classList.contains('is-open')) return;
  host.classList.remove('is-open');
  state.modal.onOk = null;
  state.modal.returnFocus?.focus?.();
  state.modal.returnFocus = null;
}

/* ---------- garage / vehicle ---------- */

function renderGarage() {
  const host = $('[data-dl-garage]');
  if (!host) return;
  const cars = GARAGE.slice();
  if (!cars.some((c) => c.vin === state.vehicle.vin)) cars.push(state.vehicle);
  host.innerHTML = cars
    .map((c) => {
      const on = c.vin === state.vehicle.vin;
      return `<button type="button" class="gar-chip${on ? ' is-selected' : ''}" aria-pressed="${on}" data-dl-veh="${escapeHtml(c.vin)}"><b>${escapeHtml(vehLabel(c))}</b><span>${escapeHtml(c.trim)}</span></button>`;
    })
    .join('');
  $('[data-dl-vehicle-line]').innerHTML = `<b>${escapeHtml(vehFull(state.vehicle))}</b> · VIN <code>${escapeHtml(state.vehicle.vin)}</code>${state.vehicle.plate ? ` · plate ${escapeHtml(state.vehicle.plate)} · ${escapeHtml(state.vehicle.km)}` : ''}`;
  $$('[data-dl-svc-vehicle]').forEach((el) => (el.textContent = `your ${vehLabel(state.vehicle)}`));
  $$('[data-dl-svc-veh]').forEach((el) => (el.textContent = vehFull(state.vehicle)));
}

function setVehicle(v, note) {
  state.vehicle = { ...v };
  renderGarage();
  renderParts();
  if (state.drawer.pid) renderDrawer(state.drawer.pid);
  if (note) toast(note);
}

/* ---------- vehicle picker ---------- */

function fillSelect(sel, items, placeholder) {
  sel.innerHTML = `<option value="">${placeholder}</option>` + items.map((i) => `<option value="${escapeHtml(String(i))}">${escapeHtml(String(i))}</option>`).join('');
}

function initPicker() {
  const year = $('[data-dl-sel="year"]');
  const make = $('[data-dl-sel="make"]');
  const model = $('[data-dl-sel="model"]');
  const trim = $('[data-dl-sel="trim"]');
  if (!year) return;
  fillSelect(year, YEARS, 'Select year');
  const pin = $('[data-dl-pin]');

  const reset = (sel, placeholder) => {
    sel.innerHTML = `<option value="">${placeholder}</option>`;
    sel.disabled = true;
  };

  year.addEventListener('change', () => {
    if (year.value) {
      fillSelect(make, Object.keys(CATALOGUE), 'Select make');
      make.disabled = false;
    } else reset(make, 'Select make');
    reset(model, 'Select model');
    reset(trim, 'Select trim');
    pin.disabled = true;
  });
  make.addEventListener('change', () => {
    if (make.value) {
      fillSelect(model, Object.keys(CATALOGUE[make.value]), 'Select model');
      model.disabled = false;
    } else reset(model, 'Select model');
    reset(trim, 'Select trim');
    pin.disabled = true;
  });
  model.addEventListener('change', () => {
    if (model.value) {
      fillSelect(trim, CATALOGUE[make.value][model.value], 'Select trim');
      trim.disabled = false;
    } else reset(trim, 'Select trim');
    pin.disabled = true;
  });
  trim.addEventListener('change', () => {
    pin.disabled = !trim.value;
  });

  pin.addEventListener('click', () => {
    if (!trim.value) return;
    const [trimName, engine] = trim.value.split(' · ');
    setVehicle(
      { year: Number(year.value), make: make.value, model: model.value, trim: trimName, engine: engine || '', vin: 'Not decoded', plate: '', km: '' },
      `Pinned ${year.value} ${make.value} ${model.value} to your garage.`
    );
    $('#dl-picker')?.classList.remove('is-open');
    $('[data-dl-picker-btn]')?.setAttribute('aria-expanded', 'false');
  });

  $('[data-dl-vin-form]').addEventListener('submit', (event) => {
    event.preventDefault();
    const raw = ($('#dl-vin').value || '').trim().toUpperCase();
    const msg = $('[data-dl-vin-msg]');
    msg.classList.remove('is-ok', 'is-bad');
    if (raw.length !== 17) {
      msg.classList.add('is-bad');
      msg.textContent = raw ? `A VIN is 17 characters - that one is ${raw.length}. Check the door jamb sticker or the base of the windshield.` : 'Type a VIN, or use the year / make / model picker.';
      return;
    }
    const hit = VINS.find((entry) => raw.startsWith(entry.p));
    if (!hit) {
      msg.classList.add('is-bad');
      msg.textContent = "That VIN isn't in our Canadian catalogue. Use the picker, or send it to the parts desk in the assistant and Marc will look it up.";
      return;
    }
    const known = GARAGE.find((g) => g.vin === raw);
    setVehicle(known || { ...hit.v, vin: raw, plate: '', km: '' }, `VIN decoded: ${hit.v.year} ${hit.v.make} ${hit.v.model}.`);
    msg.classList.add('is-ok');
    msg.textContent = `Decoded: ${vehFull(hit.v)} - pinned to your garage.`;
    $('#dl-picker')?.classList.remove('is-open');
    $('[data-dl-picker-btn]')?.setAttribute('aria-expanded', 'false');
  });
}

/* ---------- catalogue ---------- */

const activeCat = () => $('.dl-cats [data-filter].is-active')?.dataset.filter || 'all';

function matchesSearch(part) {
  const q = state.search.trim().toLowerCase();
  if (!q) return true;
  return (
    part.name.toLowerCase().includes(q) ||
    part.oem.pn.toLowerCase().includes(q) ||
    part.am.pn.toLowerCase().includes(q) ||
    part.oem.brand.toLowerCase().includes(q) ||
    part.am.brand.toLowerCase().includes(q) ||
    CATS[part.cat].toLowerCase().includes(q)
  );
}

const passesFilters = (part) => matchesSearch(part) && (!state.fitOnly || fits(part));

function stockLine(va) {
  const total = onHand(va);
  if (va.m >= 6) return { cls: 'is-in', text: `In stock · Merivale · ${va.m} on the shelf` };
  if (va.m > 0) return { cls: 'is-low', text: `In stock · Merivale · only ${va.m} left` };
  if (va.k > 0) return { cls: 'is-low', text: `Kanata store · ${va.k} left · shuttled here by 10 AM tomorrow` };
  if (total === 0 && va.eta) return { cls: 'is-out', text: `Back-ordered · arrives ${va.eta} from the Brampton DC` };
  return { cls: 'is-out', text: 'Back-ordered · ask the counter for an ETA' };
}

function partCard(part) {
  const va = variant(part);
  const st = stockLine(va);
  const ok = fits(part);
  const out = onHand(va) === 0;
  const tier = va.price * (1 - TIER);
  return `<article class="part" data-type="${part.cat}" data-dl-card="${part.id}">
    <div class="part-art">${ART[part.cat]}<span class="art-tag">${state.mode === 'oem' ? 'OEM' : 'Aftermarket'}</span></div>
    <div class="part-main">
      <p class="part-cat">${escapeHtml(CATS[part.cat])}</p>
      <h3>${escapeHtml(part.name)}</h3>
      <p class="pn"><code>${escapeHtml(va.pn)}</code> <span>${escapeHtml(va.brand)}</span></p>
      <p class="fit ${ok ? 'is-ok' : 'is-no'}">${ok ? `✓ Fits your ${escapeHtml(vehLabel(state.vehicle))}` : `⚠ Does not fit your ${escapeHtml(vehLabel(state.vehicle))} · ${escapeHtml(fitLine(part))}`}</p>
      <p class="stock ${st.cls}">${escapeHtml(st.text)}</p>
    </div>
    <div class="part-foot">
      <div class="price-box">
        <b class="price">${money(va.price)}</b>
        <span class="tier-price">Trade −12% · ${money(tier)}</span>
        ${va.core ? `<span class="core">+ ${money(va.core)} core charge</span>` : ''}
      </div>
      <div class="part-acts">
        <button class="btn btn-ghost btn-sm" type="button" data-dl-detail="${part.id}">Details</button>
        <button class="btn btn-primary btn-sm" type="button" data-dl-add="${part.id}">${out ? 'Order it in' : 'Add to order'}</button>
      </div>
    </div>
  </article>`;
}

function renderParts() {
  const grid = $('[data-dl-grid]');
  if (!grid) return;
  const cat = activeCat();
  const pool = PARTS.filter(passesFilters);
  const shown = pool.filter((p) => cat === 'all' || p.cat === cat);
  grid.innerHTML = shown.map(partCard).join('');

  $$('[data-dl-count]').forEach((el) => {
    const key = el.dataset.dlCount;
    el.textContent = String(key === 'all' ? pool.length : pool.filter((p) => p.cat === key).length);
  });

  const bits = [`Showing ${shown.length} part${shown.length === 1 ? '' : 's'}`];
  if (cat !== 'all') bits.push(CATS[cat].toLowerCase());
  if (state.search.trim()) bits.push(`matching “${state.search.trim()}”`);
  bits.push(state.mode === 'oem' ? 'OEM pricing' : 'aftermarket pricing');
  if (state.fitOnly) bits.push(`${vehLabel(state.vehicle)} only`);
  $('[data-dl-results]').textContent = bits.join(' · ');
  $('[data-dl-grid-empty]').hidden = shown.length > 0;
}

function renderRecent() {
  const host = $('[data-dl-recent]');
  if (!host) return;
  host.hidden = state.recent.length === 0;
  $('[data-dl-recent-row]').innerHTML = state.recent
    .map((pid) => {
      const part = byId(pid);
      const va = variant(part);
      return `<button type="button" class="recent-chip" data-dl-detail="${part.id}"><span class="ra">${ART[part.cat]}</span><span class="rt"><b>${escapeHtml(part.name)}</b><span>${escapeHtml(va.pn)} · ${money(va.price)}</span></span></button>`;
    })
    .join('');
}

/* ---------- part drawer ---------- */

// mockups.js owns data-toggle / data-close and flips .is-open on its own, so
// the panel classes are not a reliable record of what is open: `shown` is.
const shown = { cart: false, drawer: false };

function syncScrim() {
  $('[data-dl-scrim]')?.classList.toggle('is-open', shown.cart || shown.drawer);
}

function restoreFocus() {
  state.overlayFocus?.focus?.();
  state.overlayFocus = null;
}

function openDrawer(pid) {
  const drawer = $('#dl-drawer');
  if (!drawer) return;
  closeCart();
  state.drawer = { pid, mode: state.mode, qty: 1 };
  state.recent = [pid, ...state.recent.filter((id) => id !== pid)].slice(0, 4);
  renderDrawer(pid);
  renderRecent();
  if (!shown.drawer) state.overlayFocus = document.activeElement;
  shown.drawer = true;
  drawer.classList.add('is-open');
  syncScrim();
  drawer.focus();
}

function closeDrawer() {
  const drawer = $('#dl-drawer');
  if (!drawer) return;
  drawer.classList.remove('is-open');
  if (!shown.drawer) return;
  shown.drawer = false;
  state.drawer.pid = null;
  syncScrim();
  restoreFocus();
}

function renderDrawer(pid) {
  const part = byId(pid);
  if (!part) return;
  const mode = state.drawer.mode;
  const va = variant(part, mode);
  const st = stockLine(va);
  const ok = fits(part);
  const out = onHand(va) === 0;
  const qty = state.drawer.qty;
  const lineTotal = va.price * (1 - TIER) * qty + va.core * qty;
  const deposit = va.price * qty * 0.25;

  $('[data-dl-drawer-cat]').textContent = CATS[part.cat];
  $('[data-dl-drawer-title]').textContent = part.name;
  $('[data-dl-drawer-body]').innerHTML = `
    <div class="d-art">${ART[part.cat]}</div>
    <p class="fit ${ok ? 'is-ok' : 'is-no'}">${ok ? `✓ Fits your ${escapeHtml(vehFull(state.vehicle))}` : `⚠ Does not fit your ${escapeHtml(vehLabel(state.vehicle))}`}</p>

    <h3 class="d-h">Two ways to buy it</h3>
    <div class="d-modes" role="group" aria-label="OEM or aftermarket">
      ${['oem', 'am']
        .map((m) => {
          const v = part[m];
          const s = stockLine(v);
          const on = m === mode;
          return `<button type="button" class="d-mode${on ? ' is-selected' : ''}" aria-pressed="${on}" data-dl-dmode="${m}">
            <b>${m === 'oem' ? 'OEM / genuine' : 'Aftermarket'}</b>
            <code>${escapeHtml(v.pn)}</code>
            <span>${escapeHtml(v.brand)}</span>
            <em>${money(v.price)}</em>
            <i class="${s.cls}">${escapeHtml(s.text)}</i>
          </button>`;
        })
        .join('')}
    </div>

    ${part.supersedes ? `<p class="d-note"><b>Supersession</b> ${escapeHtml(part.supersedes)}</p>` : ''}
    ${out ? `<p class="d-note is-warn"><b>Special order</b> Not on the shelf. We can have it here ${escapeHtml(va.eta || 'within the week')}. Orders over ${money(DEPOSIT_OVER)} take a 25% deposit (${money(deposit)}) billed to TR-4417 when we place it - the rest is on the invoice at pickup.</p>` : ''}

    <h3 class="d-h">Specifications</h3>
    <div class="table-wrap">
      <table class="d-specs">
        <caption class="sr-only">Specifications for ${escapeHtml(part.name)}</caption>
        <tbody>${part.specs.map(([k, v]) => `<tr><th scope="row">${escapeHtml(k)}</th><td>${escapeHtml(v)}</td></tr>`).join('')}</tbody>
      </table>
    </div>

    <h3 class="d-h">Fits these vehicles</h3>
    <ul class="d-fits">${part.models.map((m) => `<li>${part.years[0]}-${part.years[1]} ${escapeHtml(m)}</li>`).join('')}</ul>
    <p class="d-fine">Fitment shown for Canadian-market vehicles. Give the counter your VIN if the truck has been modified.</p>

    <div class="d-buy">
      <div class="d-qty">
        <span class="lbl">Quantity</span>
        <div class="qty">
          <button type="button" data-dl-dqty="-1" aria-label="One fewer">−</button>
          <output data-dl-dqty-out>${qty}</output>
          <button type="button" data-dl-dqty="1" aria-label="One more">+</button>
        </div>
      </div>
      <div class="d-price">
        <span>${money(va.price)} each${va.core ? ` + ${money(va.core)} core` : ''}</span>
        <b>${money(lineTotal)}</b>
        <small>Your trade price, before HST</small>
      </div>
      <button class="btn btn-primary btn-wide" type="button" data-dl-drawer-add="${part.id}">${out ? `Order it in · arrives ${escapeHtml(va.eta || 'soon')}` : 'Add to order'}</button>
    </div>`;
}

/* ---------- cart ---------- */

const lineUnit = (line) => byId(line.pid)[line.mode].price;
const lineCore = (line) => byId(line.pid)[line.mode].core || 0;
const isBackordered = (line) => onHand(byId(line.pid)[line.mode]) === 0;

function totals() {
  const sub = state.lines.reduce((s, l) => s + lineUnit(l) * l.qty, 0);
  const disc = sub * TIER;
  const cores = state.lines.reduce((s, l) => s + lineCore(l) * l.qty, 0);
  const ship = state.fulfil === 'courier' && state.lines.length ? COURIER : 0;
  const taxable = sub - disc + cores + ship;
  const hst = taxable * HST;
  return { sub, disc, cores, ship, hst, total: taxable + hst };
}

function addLine(pid, mode, qty, unverified) {
  const existing = state.lines.find((l) => l.pid === pid && l.mode === mode);
  if (existing) existing.qty += qty;
  else state.lines.push({ pid, mode, qty, unverified: !!unverified });
  renderCart();
  bumpFab();
}

function bumpFab() {
  const fab = $('[data-dl-fab]');
  if (!fab) return;
  fab.classList.add('is-bump');
  setTimeout(() => fab.classList.remove('is-bump'), 500);
}

function totalsHtml() {
  const t = totals();
  const rows = [
    ['Parts subtotal', money(t.sub)],
    ['Trade tier 2 discount', `−${money(t.disc)}`],
  ];
  if (t.cores) rows.push(['Core charges <small>refunded when the old unit comes back</small>', money(t.cores)]);
  rows.push([state.fulfil === 'courier' ? 'Courier · next business day' : 'Counter pickup', t.ship ? money(t.ship) : 'Free']);
  rows.push(['HST 13%', money(t.hst)]);
  return (
    rows.map(([k, v]) => `<div><dt>${k}</dt><dd>${v}</dd></div>`).join('') +
    `<div class="is-total"><dt>Total</dt><dd>${money(t.total)}</dd></div>`
  );
}

function renderCart() {
  const list = $('[data-dl-lines]');
  if (!list) return;
  list.innerHTML = state.lines
    .map((l, i) => {
      const part = byId(l.pid);
      const va = part[l.mode];
      const bo = isBackordered(l);
      return `<li class="cline">
        <span class="cl-art">${ART[part.cat]}</span>
        <div class="cl-main">
          <b>${escapeHtml(part.name)}</b>
          <span class="cl-pn"><code>${escapeHtml(va.pn)}</code> · ${l.mode === 'oem' ? 'OEM' : 'Aftermarket'} · ${escapeHtml(va.brand)}</span>
          ${bo ? `<span class="cl-tag is-bo">Back-ordered · arrives ${escapeHtml(va.eta || 'soon')}</span>` : ''}
          ${l.unverified ? '<span class="cl-tag is-warn">Fitment not verified</span>' : ''}
          ${va.core ? `<span class="cl-tag">+ ${money(va.core)} core charge each</span>` : ''}
        </div>
        <div class="cl-qty">
          <button type="button" data-dl-qty="${i}|-1" aria-label="One fewer ${escapeHtml(part.name)}">−</button>
          <output>${l.qty}</output>
          <button type="button" data-dl-qty="${i}|1" aria-label="One more ${escapeHtml(part.name)}">+</button>
        </div>
        <div class="cl-price"><b>${money(va.price * l.qty)}</b><button type="button" class="cl-rm" data-dl-rm="${i}">Remove</button></div>
      </li>`;
    })
    .join('');

  const count = state.lines.reduce((s, l) => s + l.qty, 0);
  $$('[data-dl-cart-count]').forEach((el) => {
    el.textContent = String(count);
    el.classList.toggle('is-zero', count === 0);
  });
  $('[data-dl-cart-empty]').hidden = state.lines.length > 0;
  $('[data-dl-to-po]').disabled = state.lines.length === 0;
  const html = state.lines.length ? totalsHtml() : '';
  $('[data-dl-totals]').innerHTML = html;
  $('[data-dl-totals-2]').innerHTML = html;
  $$('[data-dl-fulfil]').forEach((b) => {
    const on = b.dataset.dlFulfil === state.fulfil;
    b.classList.toggle('is-selected', on);
    b.setAttribute('aria-pressed', String(on));
  });
}

function openCart() {
  const cart = $('#dl-cart');
  if (!cart) return;
  closeDrawer();
  if (!shown.cart) state.overlayFocus = document.activeElement;
  shown.cart = true;
  cart.classList.add('is-open');
  $('[data-dl-fab]').setAttribute('aria-expanded', 'true');
  syncScrim();
  renderCart();
  cart.focus();
}

function closeCart() {
  const cart = $('#dl-cart');
  if (!cart) return;
  cart.classList.remove('is-open');
  $('[data-dl-fab]')?.setAttribute('aria-expanded', 'false');
  if (!shown.cart) return;
  shown.cart = false;
  syncScrim();
  restoreFocus();
}

function setCartStep(name) {
  state.cstep = name;
  const cart = $('#dl-cart');
  cart.dataset.dlCstep = name;
  const order = ['cart', 'po', 'done'];
  $$('.dl-cart-steps li', cart).forEach((li) => {
    const i = order.indexOf(li.dataset.cstepName);
    li.classList.toggle('is-active', li.dataset.cstepName === name);
    li.classList.toggle('is-done', i < order.indexOf(name));
  });
  cart.scrollTop = 0;
}

function placeOrder() {
  const po = ($('#dl-po').value || '').trim();
  const msg = $('[data-dl-po-msg]');
  if (!po) {
    msg.hidden = false;
    $('#dl-po').focus();
    return;
  }
  msg.hidden = true;
  const t = totals();
  const no = `RM-${state.nextOrder}`;
  state.nextOrder += 1;
  const count = state.lines.reduce((s, l) => s + l.qty, 0);
  const bo = state.lines.filter(isBackordered);
  const hold = $('[data-dl-hold]').checked;
  const pickup = state.fulfil === 'pickup';

  $('[data-dl-order-no]').textContent = no;
  $('[data-dl-done-line]').textContent = `${state.lines.length} line${state.lines.length === 1 ? '' : 's'} · ${count} item${count === 1 ? '' : 's'} · ${money(t.total)} incl. HST · PO ${po}`;
  $('[data-dl-done-window]').innerHTML = pickup
    ? '<b>Ready</b> Today between 2:40 and 3:40 PM at the Merivale parts counter, door 2'
    : '<b>Courier</b> Tomorrow before 10:30 AM to 44 Iber Rd, Stittsville - signature required';
  const boRow = $('[data-dl-done-bo]');
  if (bo.length) {
    const names = bo.map((l) => `${byId(l.pid).name} (${byId(l.pid)[l.mode].pn}, ${byId(l.pid)[l.mode].eta || 'ETA to follow'})`).join('; ');
    boRow.innerHTML = `<b>On order</b> ${escapeHtml(names)}. ${hold ? 'Held so the order ships complete.' : 'The rest goes on the counter today - we text again when the back-order lands.'}`;
    boRow.hidden = false;
  } else boRow.hidden = true;

  state.queue.unshift({ no, cust: 'Croteau Contracting (online)', lines: state.lines.length, total: money(t.total), status: 'new', mine: true });
  state.openOrders.unshift({ kind: 'order', title: `${no} · ${state.lines.length} lines · ${money(t.total)}`, note: `Placed just now · PO ${po}`, tag: pickup ? 'Being picked' : 'Courier booked' });
  state.lastOrder = no;
  state.lines = [];
  renderCart();
  renderOpenOrders();
  renderStaff();
  setCartStep('done');
  toast(`Order ${no} sent to the parts counter.`);
}

/* ---------- open orders (customer side) ---------- */

function renderOpenOrders() {
  const host = $('[data-dl-open-list]');
  if (!host) return;
  host.innerHTML = state.openOrders
    .map(
      (o) => `<li class="oo ${o.kind === 'backorder' ? 'is-bo' : ''}">
        <div><b>${escapeHtml(o.title)}</b><span>${escapeHtml(o.note)}</span></div>
        <span class="oo-tag">${escapeHtml(o.tag)}</span>
      </li>`
    )
    .join('');
  $$('[data-dl-open-count]').forEach((el) => (el.textContent = String(state.openOrders.length)));
}

/* ---------- service booking ---------- */

function setStep(host, n) {
  host.dataset.step = String(n);
  $$('.dl-stepper li', host).forEach((li, i) => {
    li.classList.toggle('is-active', i + 1 === n);
    li.classList.toggle('is-done', i + 1 < n);
  });
}

function selectGroupTo(group, label) {
  $$(`[data-select-group="${group}"]`).forEach((b) => {
    const on = b.dataset.label === label;
    b.classList.toggle('is-selected', on);
    b.setAttribute('aria-pressed', String(on));
  });
  $$(`[data-out="${group}"]`).forEach((out) => (out.textContent = label));
}

function renderService() {
  const svc = SERVICES[state.svc.key];
  const day = DAYS[state.svc.day];
  $('[data-dl-svc-note]').textContent = svc.wait
    ? `${svc.label} · ${svc.mins} minutes · short enough to wait for in the lounge.`
    : `${svc.label} · book-time job, about ${Math.round(svc.mins / 480)} days in the shop. Courtesy car included.`;

  $$('[data-dl-day]').forEach((b) => {
    const d = DAYS[b.dataset.dlDay];
    const free = 6 - d.full.length - d.closed.length;
    $('[data-dl-day-free]', b).textContent = free === 0 ? 'full' : `${free} open`;
    b.classList.toggle('is-full', free === 0);
  });

  $$('[data-dl-time]').forEach((b) => {
    const t = b.dataset.dlTime;
    const closed = day.closed.includes(t);
    const full = day.full.includes(t);
    b.disabled = closed || full;
    b.classList.toggle('is-full', full);
    b.classList.toggle('is-closed', closed);
    b.title = closed ? 'Outside shop hours that day' : full ? 'Already booked' : '';
    if (b.disabled && b.classList.contains('is-selected')) {
      b.classList.remove('is-selected');
      b.setAttribute('aria-pressed', 'false');
      state.svc.time = '';
      state.svc.timeLabel = '';
      $$('[data-out="svctime"]').forEach((o) => (o.textContent = '-'));
    }
  });

  const openCount = 6 - day.full.length - day.closed.length;
  $('[data-dl-time-note]').textContent = state.svc.time
    ? `${state.svc.timeLabel || state.svc.time} on ${day.label} · you'll be out by ${svc.wait ? 'lunch' : 'the second day'} - we text at every stage.`
    : `${openCount} drop-off time${openCount === 1 ? '' : 's'} left on ${day.label}. Greyed-out slots are booked or outside shop hours.`;

  const courtesy = $('[data-dl-courtesy]');
  const waiting = state.svc.mode === 'wait';
  courtesy.disabled = waiting || day.cars === 0;
  if (courtesy.disabled) courtesy.checked = false;
  state.svc.courtesy = courtesy.checked;
  $('[data-dl-courtesy-note]').textContent = waiting
    ? "Not needed - you're waiting for it."
    : day.cars === 0
      ? 'No courtesy cars on Saturdays - the loaner fleet is off.'
      : `Free on trade accounts · ${day.cars} left on ${day.label}`;
  $('[data-dl-courtesy-out]').textContent = state.svc.courtesy ? 'Yes · held in your name' : 'No';
}

function bookService() {
  const svc = SERVICES[state.svc.key];
  const day = DAYS[state.svc.day];
  const ro = `RO-${state.nextRO}`;
  state.nextRO += 1;
  $('[data-dl-ro]').textContent = ro;
  const timeLabel = $('[data-out="svctime"]')?.textContent || state.svc.time;
  $('[data-dl-book-line]').textContent = `${svc.label} on ${day.label} at ${timeLabel} · ${vehFull(state.vehicle)} · ${state.svc.mode === 'wait' ? 'you wait in the lounge' : 'drop off'}`;
  const extra = $('[data-dl-book-extra]');
  extra.hidden = !state.svc.courtesy;
  state.openOrders.unshift({
    kind: 'service',
    title: `${ro} · ${svc.label}`,
    note: `${vehLabel(state.vehicle)} · ${day.label} at ${timeLabel} · advisor Marc Lefebvre`,
    tag: state.svc.courtesy ? 'Courtesy car held' : 'Booked',
  });
  renderOpenOrders();
  toast(`Work order ${ro} booked for ${day.label}.`);
}

/* ---------- work order tracker ---------- */

const STAGES = ['received', 'hoist', 'parts', 'ready'];

function renderTracker() {
  const rail = $('[data-dl-track]');
  if (!rail) return;
  const idx = STAGES.indexOf(state.ro.stage);
  $$('[data-dl-stage]', rail).forEach((li) => {
    const i = STAGES.indexOf(li.dataset.dlStage);
    li.classList.toggle('is-done', i < idx);
    li.classList.toggle('is-current', i === idx);
    li.classList.toggle('is-skip', li.dataset.dlStage === 'parts' && state.ro.quote === 'declined');
  });

  const note = $('[data-dl-stage-note]');
  const ready = $('[data-dl-ready-note]');
  if (state.ro.quote === 'open') {
    note.textContent = 'Waiting on your approval before we pull the rotors';
    ready.textContent = 'Estimated 3:30 PM today';
  } else if (state.ro.quote === 'approved') {
    note.textContent = 'Approved 10:44 AM · pads and rotors pulled from the shelf, Kayla is back on it';
    ready.textContent = 'Estimated 4:45 PM today · the extra work adds about 1.2 hours';
  } else {
    note.textContent = 'Skipped · nothing ordered, noted on the repair order';
    ready.textContent = 'Estimated 2:15 PM today';
  }

  const quote = $('[data-dl-quote]');
  quote.dataset.state = state.ro.quote;
  const acts = $('[data-dl-quote-acts]');
  const stateLine = $('[data-dl-quote-state]');
  acts.hidden = state.ro.quote !== 'open';
  stateLine.hidden = state.ro.quote === 'open';
  if (state.ro.quote === 'approved') stateLine.textContent = '✓ Approved at 10:44 AM. Marc has the parts on the counter - the extra work is on this repair order.';
  if (state.ro.quote === 'declined') stateLine.textContent = '✕ Declined. Kayla noted the 2 mm measurement on the file so it gets re-checked at your next oil change.';
  $('[data-dl-ro-total]').textContent = money(state.ro.total);
}

function renderPhotos() {
  const host = $('[data-dl-photos]');
  if (!host) return;
  const caps = ['Rear pad · 2 mm left', 'Rotor face, scored', 'Measurement, 19.1 mm'];
  host.innerHTML = caps
    .map(
      (c, i) => `<figure class="q-photo"><span class="ph ph-${i + 1}" aria-hidden="true"></span><figcaption>${escapeHtml(c)}</figcaption></figure>`
    )
    .join('');
}

function decideQuote(kind) {
  state.ro.quote = kind;
  if (kind === 'approved') {
    state.ro.total = 612.4;
    const bay = state.bays.find((b) => b.n === 1);
    if (bay) bay.job = 'Front brakes + oil + approved rear brakes';
    toast('Extra work approved - Kayla is back on the truck.');
  } else {
    state.ro.stage = 'ready';
    const bay = state.bays.find((b) => b.n === 1);
    if (bay) bay.status = 'ready';
    toast('Declined - noted on the repair order.');
  }
  renderTracker();
  renderStaff();
}

/* ---------- staff view ---------- */

const QUEUE_NEXT = { new: 'picking', picking: 'packed', packed: 'ready', ready: 'out' };
const QUEUE_LABEL = { new: 'New', picking: 'Picking', packed: 'Packed', ready: 'Ready · on the counter', out: 'Picked up' };
const QUEUE_BTN = { new: 'Start picking', picking: 'Mark packed', packed: 'Mark ready', ready: 'Mark picked up' };
const BAY_NEXT = { received: 'hoist', hoist: 'parts', parts: 'ready', ready: 'free', free: 'received' };
const BAY_LABEL = { received: 'Checked in', hoist: 'On the hoist', parts: 'Waiting on parts', ready: 'Ready for pickup', free: 'Bay free' };
const BAY_BTN = { received: 'Put it on the hoist', hoist: 'Waiting on parts', parts: 'Mark ready', ready: 'Close and free the bay', free: 'Take the next car' };

function renderStaff() {
  if (!$('[data-dl-staff]')) return;
  const toPick = state.queue.filter((o) => o.status === 'new' || o.status === 'picking').length;
  const inbound = state.inbound.filter((i) => !i.got).length;
  const busy = state.bays.filter((b) => b.status !== 'free').length;
  const kpis = [
    ['Orders to pick', String(toPick), 'oldest waiting 18 min'],
    ['Special orders inbound', String(inbound), 'next truck 7:30 AM'],
    ['Bays in use', `${busy}/4`, busy === 4 ? 'no room until 11:15' : 'one hoist free'],
    ['Counter wait', '4 min', '2 people at the wicket'],
  ];
  $('[data-dl-kpis]').innerHTML = kpis.map(([l, n, s]) => `<div class="kpi"><b>${n}</b><span>${escapeHtml(l)}</span><small>${escapeHtml(s)}</small></div>`).join('');

  $('[data-dl-queue]').innerHTML = state.queue
    .map(
      (o, i) => `<tr class="${o.mine ? 'is-mine' : ''}">
        <th scope="row"><code>${escapeHtml(o.no)}</code>${o.mine ? '<span class="row-tag">Just placed online</span>' : ''}</th>
        <td>${escapeHtml(o.cust)}</td>
        <td>${o.lines}</td>
        <td>${escapeHtml(o.total)}</td>
        <td><span class="pill is-${o.status}">${escapeHtml(QUEUE_LABEL[o.status])}</span></td>
        <td>${o.status === 'out' ? '<span class="done-dash">—</span>' : `<button class="btn btn-primary btn-sm" type="button" data-dl-queue-next="${i}">${escapeHtml(QUEUE_BTN[o.status])}</button>`}</td>
      </tr>`
    )
    .join('');

  $('[data-dl-stock]').innerHTML = state.low
    .map(
      (r, i) => `<tr class="${r.ordered ? 'is-ordered' : ''}">
        <th scope="row">${escapeHtml(r.name)}</th>
        <td><code>${escapeHtml(r.pn)}</code></td>
        <td><b class="${r.hand <= 2 ? 'is-red' : 'is-amber'}">${r.hand}</b></td>
        <td>${r.min}</td>
        <td>${r.ordered ? '<span class="pill is-ready">Ordered · ETA Tue, Sep 8</span>' : `<button class="btn btn-ghost btn-sm" type="button" data-dl-restock="${i}">Order ${r.qty} in</button>`}</td>
      </tr>`
    )
    .join('');

  $('[data-dl-inbound]').innerHTML = state.inbound
    .map(
      (r, i) => `<li class="${r.got ? 'is-got' : ''}">
        <div><b>${escapeHtml(r.name)}</b><span><code>${escapeHtml(r.pn)}</code> · ${escapeHtml(r.who)}</span></div>
        ${r.got ? '<span class="side-tag">Received · customer texted · will-call shelf B</span>' : `<span class="side-acts"><span class="eta">ETA ${escapeHtml(r.eta)}</span><button class="btn btn-primary btn-sm" type="button" data-dl-received="${i}">Mark received</button></span>`}
      </li>`
    )
    .join('');

  $('[data-dl-bays]').innerHTML = state.bays
    .map(
      (b, i) => `<article class="bay is-${b.status}">
        <header><b>Hoist ${b.n}</b><span class="pill is-${b.status}">${escapeHtml(BAY_LABEL[b.status])}</span></header>
        ${b.status === 'free' ? `<p class="bay-free">Open · ${escapeHtml(b.tech)} is between jobs</p>` : `<p class="bay-veh">${escapeHtml(b.veh)}</p><p class="bay-meta"><code>${escapeHtml(b.ro)}</code> · ${escapeHtml(b.tech)}</p><p class="bay-job">${escapeHtml(b.job)}</p><p class="bay-eta">Out by ${escapeHtml(b.eta)}</p>`}
        <button class="btn btn-ghost btn-sm" type="button" data-dl-bay="${i}">${escapeHtml(BAY_BTN[b.status])}</button>
      </article>`
    )
    .join('');
}

function openStaff() {
  const host = $('[data-dl-staff]');
  if (!host) return;
  closeCart();
  closeDrawer();
  renderStaff();
  state.overlayFocus = document.activeElement;
  host.classList.add('is-open');
  $$('[data-dl-staff-open]').forEach((b) => b.setAttribute('aria-expanded', 'true'));
  host.focus();
}

function closeStaff() {
  const host = $('[data-dl-staff]');
  if (!host || !host.classList.contains('is-open')) return;
  host.classList.remove('is-open');
  $$('[data-dl-staff-open]').forEach((b) => b.setAttribute('aria-expanded', 'false'));
  state.overlayFocus?.focus?.();
  state.overlayFocus = null;
}

function advanceBay(i) {
  const bay = state.bays[i];
  if (bay.n === 1 && bay.status === 'parts' && state.ro.quote === 'open') {
    toast("Bay 1 is waiting on Dan's approval for the $340 extra work.");
    return;
  }
  const next = BAY_NEXT[bay.status];
  bay.status = next;
  if (next === 'free') {
    bay.veh = '';
    bay.ro = '';
    bay.job = '';
    bay.eta = '';
  }
  if (next === 'received') {
    bay.veh = '2018 Escape Titanium';
    bay.ro = 'RO-88214';
    bay.job = 'Cabin filter + wiper blades';
    bay.eta = '2:45 PM';
  }
  if (bay.n === 1) {
    if (next === 'ready') state.ro.stage = 'ready';
    else if (next === 'parts') state.ro.stage = 'parts';
    renderTracker();
  }
  renderStaff();
  toast(`Hoist ${bay.n} · ${BAY_LABEL[bay.status]}.`);
}

/* ---------- add to order (with fitment check) ---------- */

function tryAdd(pid, mode, qty) {
  const part = byId(pid);
  const va = part[mode];
  const doAdd = (unverified) => {
    addLine(pid, mode, qty, unverified);
    toast(onHand(va) === 0 ? `${part.name} added as a special order · ${va.eta || 'ETA to follow'}.` : `${part.name} added to your order.`);
  };
  if (!fits(part)) {
    openModal({
      flag: 'Fitment check',
      title: `That part won't fit your ${vehLabel(state.vehicle)}`,
      body: `${part.name} (${va.pn}) is listed for ${fitLine(part)}. Your pinned vehicle is a ${vehFull(state.vehicle)}. You can still order it - parts that don't match the VIN on the invoice are non-returnable once the box is open.`,
      ok: 'Order it anyway',
      onOk: () => doAdd(true),
    });
    return;
  }
  doAdd(false);
}

/* ---------- wiring ---------- */

function init() {
  if (!$('.dl')) return;

  renderGarage();
  initPicker();
  renderParts();
  renderCart();
  setCartStep('cart');
  renderOpenOrders();
  renderService();
  renderPhotos();
  renderTracker();
  renderStaff();

  $('#dl-search')?.addEventListener('input', (event) => {
    state.search = event.target.value;
    renderParts();
  });
  $('[data-dl-fitonly]')?.addEventListener('change', (event) => {
    state.fitOnly = event.target.checked;
    renderParts();
  });
  $('[data-dl-courtesy]')?.addEventListener('change', renderService);

  document.addEventListener('click', (event) => {
    const t = event.target.closest('button');
    if (!t) return;

    // Section / counter tabs (mockups.js switches the panels; we keep ARIA true)
    if (t.matches('[data-tab]')) {
      const host = t.closest('[data-tabs]');
      $$('[data-tab]', host).forEach((b) => {
        if (b.closest('[data-tabs]') === host) b.setAttribute('aria-selected', String(b === t));
      });
      return;
    }

    // mockups.js moves [data-steps] but only restyles a ".stepper"; ours is
    // ".dl-stepper", so mirror the step onto it. No return - the buttons that
    // carry data-go have their own handlers further down.
    if (t.matches('[data-go]')) {
      const host = t.closest('[data-steps]');
      if (host) setStep(host, Number(t.dataset.go));
    }

    // Garage
    if (t.matches('[data-dl-veh]')) {
      const vin = t.dataset.dlVeh;
      const car = GARAGE.find((c) => c.vin === vin) || state.vehicle;
      setVehicle(car, `Now shopping for the ${vehLabel(car)}.`);
      return;
    }
    if (t.matches('[data-dl-picker-btn]')) {
      t.setAttribute('aria-expanded', String($('#dl-picker').classList.contains('is-open')));
      return;
    }

    // Catalogue
    if (t.matches('[data-filter]')) {
      renderParts();
      return;
    }
    if (t.matches('[data-dl-mode]')) {
      state.mode = t.dataset.dlMode;
      $$('[data-dl-mode]').forEach((b) => {
        const on = b === t;
        b.classList.toggle('is-active', on);
        b.setAttribute('aria-pressed', String(on));
      });
      renderParts();
      renderRecent();
      toast(state.mode === 'oem' ? 'Showing OEM / genuine numbers and pricing.' : 'Showing aftermarket equivalents - different numbers, different stock.');
      return;
    }
    if (t.matches('[data-dl-detail]')) return openDrawer(t.dataset.dlDetail);
    if (t.matches('[data-dl-add]')) return tryAdd(t.dataset.dlAdd, state.mode, 1);
    if (t.matches('[data-dl-ask]')) {
      $('#assistant')?.classList.remove('is-collapsed');
      const btn = $('[data-collapse="#assistant"]');
      if (btn) {
        btn.textContent = '–';
        btn.setAttribute('aria-expanded', 'true');
        btn.setAttribute('aria-label', 'Minimise assistant');
      }
      $('#assistant .composer input')?.focus();
      return;
    }

    // Part drawer
    if (t.matches('[data-dl-dmode]')) {
      state.drawer.mode = t.dataset.dlDmode;
      renderDrawer(state.drawer.pid);
      return;
    }
    if (t.matches('[data-dl-dqty]')) {
      state.drawer.qty = Math.min(20, Math.max(1, state.drawer.qty + Number(t.dataset.dlDqty)));
      renderDrawer(state.drawer.pid);
      return;
    }
    if (t.matches('[data-dl-drawer-add]')) {
      tryAdd(t.dataset.dlDrawerAdd, state.drawer.mode, state.drawer.qty);
      closeDrawer();
      return;
    }
    if (t.matches('[data-dl-drawer-close]')) return closeDrawer();

    // Order drawer. data-toggle (mockups.js) has already flipped .is-open by
    // the time this delegated handler runs, so the class says what was asked.
    if (t.matches('[data-dl-fab]')) {
      if ($('#dl-cart').classList.contains('is-open')) openCart();
      else closeCart();
      return;
    }
    if (t.matches('[data-dl-cart-close]')) return closeCart();
    if (t.matches('[data-dl-qty]')) {
      const [i, delta] = t.dataset.dlQty.split('|');
      const line = state.lines[Number(i)];
      if (!line) return;
      line.qty += Number(delta);
      if (line.qty < 1) state.lines.splice(Number(i), 1);
      renderCart();
      return;
    }
    if (t.matches('[data-dl-rm]')) {
      const removed = state.lines.splice(Number(t.dataset.dlRm), 1)[0];
      renderCart();
      if (removed) toast(`${byId(removed.pid).name} taken off the order.`);
      return;
    }
    if (t.matches('[data-dl-fulfil]')) {
      state.fulfil = t.dataset.dlFulfil;
      renderCart();
      return;
    }
    if (t.matches('[data-dl-new-order]')) {
      $('#dl-po').value = '';
      $('[data-dl-po-msg]').hidden = true;
      setCartStep('cart');
      return;
    }
    if (t.matches('[data-dl-step]')) return setCartStep(t.dataset.dlStep);
    if (t.matches('[data-dl-place]')) return placeOrder();
    if (t.matches('[data-dl-reorder]')) {
      t.dataset.dlReorder.split('|').forEach((chunk) => {
        const [pid, qty] = chunk.split(':');
        addLine(pid, state.mode, Number(qty), false);
      });
      setCartStep('cart');
      openCart();
      toast('Previous order copied onto a new one - change quantities before you send it.');
      return;
    }

    // Service booking
    if (t.matches('[data-dl-svc]')) {
      const key = t.dataset.dlSvc;
      if (!SERVICES[key].wait && state.svc.mode === 'wait') {
        state.svc.mode = 'drop';
        selectGroupTo('svcmode', 'Drop off');
        toast('A timing chain job is a two-day booking - we switched you to drop-off.');
      }
      state.svc.key = key;
      renderService();
      return;
    }
    if (t.matches('[data-dl-day]')) {
      state.svc.day = t.dataset.dlDay;
      renderService();
      return;
    }
    if (t.matches('[data-dl-time]')) {
      state.svc.time = t.dataset.dlTime;
      state.svc.timeLabel = t.dataset.label;
      renderService();
      return;
    }
    if (t.matches('[data-dl-mode-visit]')) {
      const want = t.dataset.dlModeVisit;
      if (want === 'wait' && !SERVICES[state.svc.key].wait) {
        selectGroupTo('svcmode', 'Drop off');
        toast(`${SERVICES[state.svc.key].label} keeps the truck overnight - that one has to be a drop-off.`);
        return;
      }
      state.svc.mode = want;
      renderService();
      return;
    }
    if (t.matches('[data-dl-to-confirm]')) {
      if (!state.svc.time) {
        setStep($('#dl-book'), 2);
        toast('Pick a drop-off time first.');
      }
      return;
    }
    if (t.matches('[data-dl-book]')) return bookService();
    if (t.matches('[data-dl-book-again]')) {
      state.svc.time = '';
      state.svc.timeLabel = '';
      $$('[data-select-group="svctime"]').forEach((b) => {
        b.classList.remove('is-selected');
        b.setAttribute('aria-pressed', 'false');
      });
      $$('[data-out="svctime"]').forEach((o) => (o.textContent = '-'));
      renderService();
      return;
    }

    // Work order
    if (t.matches('[data-dl-approve]')) {
      openModal({
        flag: 'Approve extra work',
        title: 'Approve $340.00 of extra work?',
        body: 'Rear brake pads and rotors on RO-88207 - $212.40 parts, $127.60 labour. Approving adds about 1.2 hours; Kayla has the parts on the shelf, so the truck still goes out today.',
        ok: 'Approve $340.00',
        onOk: () => decideQuote('approved'),
      });
      return;
    }
    if (t.matches('[data-dl-decline]')) {
      openModal({
        flag: 'Decline extra work',
        title: 'Decline the rear brake work?',
        body: "We'll finish the front brakes and the oil service only. The 2 mm measurement stays on file and Kayla will re-check it at your next visit - if the rotors let go before then it becomes a bigger job.",
        ok: 'Decline for now',
        onOk: () => decideQuote('declined'),
      });
      return;
    }

    // Staff view
    if (t.matches('[data-dl-staff-open]')) return openStaff();
    if (t.matches('[data-dl-staff-close]')) return closeStaff();
    if (t.matches('[data-dl-queue-next]')) {
      const o = state.queue[Number(t.dataset.dlQueueNext)];
      o.status = QUEUE_NEXT[o.status];
      renderStaff();
      toast(`${o.no} · ${QUEUE_LABEL[o.status]}.`);
      return;
    }
    if (t.matches('[data-dl-restock]')) {
      const r = state.low[Number(t.dataset.dlRestock)];
      r.ordered = true;
      state.inbound.push({ pn: r.pn, name: r.name, who: 'Shelf stock · counter order', eta: 'Tue, Sep 8', got: false });
      renderStaff();
      toast(`${r.qty} × ${r.pn} added to tomorrow's DC order.`);
      return;
    }
    if (t.matches('[data-dl-received]')) {
      const r = state.inbound[Number(t.dataset.dlReceived)];
      r.got = true;
      renderStaff();
      toast(`${r.pn} received - customer texted, will-call shelf B.`);
      return;
    }
    if (t.matches('[data-dl-bay]')) return advanceBay(Number(t.dataset.dlBay));

    // Modal
    if (t.matches('[data-dl-modal-close]')) return closeModal();
    if (t.matches('[data-dl-modal-ok]')) {
      const fn = state.modal.onOk;
      closeModal();
      fn?.();
      return;
    }
  });

  // Scrim closes whichever drawer is open
  $('[data-dl-scrim]')?.addEventListener('click', () => {
    closeCart();
    closeDrawer();
  });

  // Escape closes the topmost overlay: modal, then staff, then a drawer
  document.addEventListener('keydown', (event) => {
    if (event.key !== 'Escape') return;
    if ($('[data-dl-modal]')?.classList.contains('is-open')) return closeModal();
    if ($('[data-dl-staff]')?.classList.contains('is-open')) return closeStaff();
    if ($('#dl-cart')?.classList.contains('is-open')) return closeCart();
    if ($('#dl-drawer')?.classList.contains('is-open')) return closeDrawer();
  });
}

if (document.readyState !== 'loading') init();
else document.addEventListener('DOMContentLoaded', init);
