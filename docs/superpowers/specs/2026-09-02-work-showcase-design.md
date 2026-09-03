# Work showcase: UI mockups + bot demos

**Date:** 2026-09-02
**Status:** approved

## Goal

Give visitors sample projects to look at: four live UI/UX mockups and four
chatbot / voice-bot demos, linked from a new **Work** section on the
homepage. Bots run against ChatGPT through a small Firebase Cloud Function
relay so the API key never ships to the browser; until the key is
configured they answer from canned scripts.

## Homepage

- New `#work` section between `#process` and `#about`. Kicker "Sample
  projects", heading `THINGS WE'VE` `BUILT`(highlighted), note "Sample
  projects built to show our range - names and data are fictional."
- Two labelled groups of brutalist cards (border, hard shadow, hover
  lift): **UI / UX** (4) and **Chatbots & voice bots** (4). Each card:
  colour swatch strip in the mockup's own palette, name, one-line pitch,
  tag ("Web app", "Voice bot" …), "Open demo →".
- Nav and footer gain "Work".

## Demo pages (`/work/*.html`)

Every page shares `src/work/shell.css` + `src/work/shell.js`: a slim
top bar (LocalNinja mark, "Sample project · <name>", "← Back to site")
and a footer line. Below the bar each page is its own world.

### UI / UX mockups

| Slug | Product | Look | Interactions |
|---|---|---|---|
| `clinic` | Maple Clinic - patient booking | calm teal, rounded, sans | doctor → slot → confirm (3 steps) |
| `restaurant` | Ember & Oak - menu & ordering | dark, warm, serif headings | category tabs, add to cart, cart drawer |
| `realty` | Northshore Realty - listings | airy white, photo-led, map placeholder | filter chips, listing → detail panel |
| `dashboard` | Pulse - SaaS analytics | dark, dense, mono numbers | sidebar nav, range toggle re-draws inline SVG chart |

No external images: visuals are CSS gradients and inline SVG. All
interactions are class toggles handled in `src/work/mockups.js`.

### Bot demos

| Slug | Bot | Mode | Fictional business data in system prompt |
|---|---|---|---|
| `bot-clinic` | Maple Clinic assistant | chat | doctors, hours, visit types |
| `bot-restaurant` | Ember & Oak host | voice | seating, hours, party sizes |
| `bot-store` | Northshore Goods support | chat | three sample orders, return policy |
| `bot-realty` | Northshore Realty lead bot | voice | listings, neighbourhoods, budgets |

Layout: scenario panel (what the bot does, "Try saying…" chips) beside a
phone frame holding the widget. Widget (`src/work/bot.js`):

- Message list, typing indicator, text input. Voice mode adds a mic
  button (Web Speech API `SpeechRecognition`) and speaks replies with
  `speechSynthesis`; if recognition is unsupported the mic is hidden and
  text input remains.
- Sends `POST /api/chat` `{ bot, messages }` (last 12 turns). On any
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
