# Work showcase: UI mockups + bot demos

**Date:** 2026-09-02
**Status:** approved

## Goal

Give visitors sample projects to look at: four live UI/UX mockups and four
chatbot / voice-bot demos, linked from a new **Work** section on the
homepage. Bots run against ChatGPT through a small Firebase Cloud Function
relay so the API key never ships to the browser; until the key is
configured they answer from canned scripts.

## Where it lives

The full showcase is its own page, **`/work.html`** — the tab bar plus every
card. Its shell (header, footer) is copied from the homepage, so in-page
anchors there are absolute (`/#services`). The homepage keeps a short
**teaser** (`#work`): heading, four highlighted demos as a `.work-strip`, and
a black CTA bar with "See our work →". Nav and footer "Work" links point at
`/work.html`.

## Showcase page

- The `#work` teaser sits between `#process` and `#about` on the homepage. Kicker "Sample
  projects", heading `THINGS WE'VE` `BUILT`(highlighted), note "Sample
  projects built to show our range - names and data are fictional."
- Six brutalist tab buttons switch between card grids (border, hard
  shadow, hover lift); only **UI / UX** is shown on load.
  - **UI / UX** — everything: the four mockups followed by every real
    project card (the same cards also appear under their own tabs).
  - **Web development** — real projects with a "Live" ribbon: the
    conversyai.com launch site and ajaypradeep.com (external links), plus
    screen galleries for Conversy AI dashboard, NinjaHR, NinjaLearn,
    CurricuLearn, IRINA and AI Interactive Story.
  - **E-commerce** — the live localninja.ca anime store as a screen
    gallery (captures of the live Shopify storefront: home, all products,
    lamp collection, product page).
  - **AI** — every AI project: Conversy AI site + dashboard, NinjaHR,
    CurricuLearn, AI Interactive Story, and the four bot demos.
  - **Chatbots** (2) and **Voice bots** (2) — the bot demos.
  Screen galleries are `work/<slug>.html` pages sharing
  `src/work/gallery.css` (facts box, browser-framed shots with numbered
  captions, lightbox via `mockups.js` `data-open`/`data-close`); images
  live in `public/work/<dir>/` and were sourced from the co-founder's
  portfolio case studies.
- Nav and footer gain "Work".

## Demo pages (`/work/*.html`)

Every page shares `src/work/shell.css`: a slim top bar (LocalNinja mark, "Sample project · <name>", "← Back to site")
and a footer line. Below the bar each page is its own world.

### UI / UX mockups

| Slug | Product | Look | Interactions |
|---|---|---|---|
| `clinic` | Maple Clinic - patient booking | the same clinic site chrome as `bot-clinic` (nav, hero, info strip; reuses `bot-clinic.css`) with the booking flow as the main section | hero doctor chips pre-select + scroll into the flow; doctor → slot → confirm (3 steps) |
| `restaurant` | Ember & Oak - menu & ordering | dark, warm, serif headings | category tabs, add to cart, cart drawer |
| `realty` | Northshore Realty - listings | airy white, photo-led, map placeholder | filter chips, listing → detail panel |
| `dealer` | Rideau Motorworks - dealership parts & service | graphite-navy, signal orange, condensed industrial | VIN / year-make-model vehicle pin, catalogue with fitment + OEM/aftermarket pricing, part drawer, order with core charges and PO checkout, service booking, repair tracker with quote approval, parts-counter staff view |
| `trades` | Copper & Coil - plumbing & heating dispatch | bone paper, slate ink, copper + safety amber | problem triage with an emergency path, book-a-job flow with arrival windows, upfront pricing, job tracker with tech ETA, quote approval, invoice + membership upsell, dispatch board staff view |
| `dashboard` | Pulse - SaaS analytics | dark, dense, mono numbers | sidebar nav, range toggle re-draws inline SVG chart |

No external images: visuals are CSS gradients and inline SVG. Generic
interactions are class toggles handled in `src/work/mockups.js`; the
`dashboard`, `restaurant` and `clinic` pages add a page module
(`src/work/<slug>.js`) for deeper product flows:

- **Pulse** — sidebar switches real views (Overview, Customers with
  search/filter/sort, Revenue with a churn what-if forecast, Events with
  severity filters, Settings with dirty-state save); KPI tiles re-target
  the chart; chart hover/keyboard tooltip; "Live" auto-refresh with an
  updated-ago counter; customer and event detail drawers with actions.
- **Ember & Oak** — dietary filter chips, dish detail modal with
  modifiers, cart lines with quantity/remove and subtotal/HST/tip/total,
  pickup vs dine-in with time slots and table number, three-step checkout
  (details → fake payment → confirmation with a live order tracker),
  busy-kitchen banner.
- **Maple Clinic** — visit-type picker that filters eligible doctors, a
  month calendar with closed days, taken slots with a waitlist, "earliest
  available", reason-for-visit with counter, post-booking calendar /
  reminder toggles, and a patient portal (My visits with reschedule and
  cancel-with-confirm, Messages with auto-reply, Profile with save state).
  Second pass added: book for a family member, symptom triage with an
  emergency banner, same-day check-in with a live queue, lab results,
  prescription refills with a status tracker, "I'm coming" confirmations,
  waitlist offers, video visits with a device check, and a front-desk
  staff view.
- **Ember & Oak (second pass)** — floor-plan table reservations with a
  hold timer, Ember Club loyalty with redemption, gift cards, tonight's
  specials with live stock, dish ratings and "most loved" sorting, and a
  kitchen-display / host-stand staff view.
- **Pulse (second pass)** — Ask Pulse (keyword-routed insight box), chart
  annotations, Growth view (funnel + cohort retention heatmap), Alerts
  view (rules builder), Team view (invites, roles, plan upgrade),
  Integrations, and a status-page preview.
- **Northshore Realty** (`src/work/realty.js`) — price/beds/baths filters
  and sort, save/shortlist drawer with compare, mortgage calculator and
  similar homes in each sheet, neighbourhood snapshots from the map,
  book-a-viewing flow, saved-search alerts, home valuation lead capture,
  and an agent/CRM view.

### Bot demos

| Slug | Bot | Mode | Fictional business data in system prompt |
|---|---|---|---|
| (on `clinic`) | Maple Clinic assistant | chat | doctors, hours, visit types |
| (on `restaurant`) | Ember & Oak host | voice | seating, hours, party sizes |
| `bot-store` | Northshore Goods support | chat | three sample orders, return policy |
| (on `realty`) | Northshore Realty lead bot | voice | listings, neighbourhoods, budgets |

The clinic, restaurant and realty bots live **on their mockup pages** as an
on-site widget (`src/work/widget.css`, `.ln-widget`, themed per page with
`--w-*` variables, minimisable via `data-toggle`): Maple Clinic gets a chat
assistant, Ember & Oak a voice host (bottom-left, clear of the cart), and
Northshore Realty a voice lead assistant. One page therefore serves both
the UI/UX card and the Chatbot / Voice bot card (`#assistant` links). Only
`bot-store` (Northshore Goods support) is a standalone page - a customer
portal layout (`bot-store.css`) - because it has no web-app twin.

Widget (`src/work/bot.js`):

- Message list, typing indicator, text input. Voice mode adds a mic
  button (Web Speech API `SpeechRecognition`) and speaks replies with
  `speechSynthesis`; if recognition is unsupported the mic is hidden and
  text input remains.
- Chips are opt-in via `[data-say]`. Sends `POST /api/chat` `{ bot, messages }` (last 12 turns). On any
  non-OK response (503 `not_configured`, 429, network) it switches to
  **scripted mode**: replies come from a per-bot canned sequence and a
  small "Demo mode" badge appears. Scripted mode is the placeholder
  until the key exists.
- JS toggles classes; CSS owns animation; reduced-motion respected.

## Relay (`functions/`)

- `firebase-functions` v2 `onRequest` named `chat`, Node 22, region
  `us-central1`, `maxInstances: 2`.
- Secret `OPENAI_API_KEY` via `defineSecret`. Missing → 503
  `{ error: "not_configured" }`.
- Validates `bot` ∈ known ids, `messages` ≤ 12 items of
  `{ role: user|assistant, content ≤ 500 chars }`. System prompt is
  server-side per bot; clients cannot override it.
- Rate limit: 30 requests / 10 min per IP (in-memory), 429 when exceeded.
- Calls `gpt-4o-mini`, `max_tokens: 300`, `temperature: 0.6`; returns
  `{ reply }`.
- `firebase.json`: `functions.source = "functions"`, hosting rewrite
  `/api/chat` → function `chat`. Vite dev server proxies `/api` to
  `https://localninja.web.app` so local demos hit the deployed relay.
- Deployed manually: `firebase deploy --only functions`. Hosting stays
  on the GitHub Actions workflow.

## Owner steps (not automated)

1. `firebase login --reauth`
2. Upgrade `localninja-test` to Blaze.
3. `firebase functions:secrets:set OPENAI_API_KEY` (paste key).
4. `firebase deploy --only functions`.

## Out of scope

Real client projects (cards are structured so one can be swapped in at a
time), analytics on demo usage, persisting conversations.
