# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

A static marketing site for LocalNinja. The homepage is a single-page,
neo-brutalist services site (white ground, black 3px borders + hard offset
shadows, `#4da3ff` accent on the "Ninja" word and highlighted heading words)
listing the company's 6 core services (plus an "Others" group), about/team, and a mailto-backed contact
form, plus a **Work** showcase of eight sample projects under `/work/`
(four UI mockups, four chatbot / voice-bot demos). Vite + vanilla JS/CSS,
no framework, no CMS. The only backend is one Firebase Cloud Function
(`functions/`) that relays bot chats to OpenAI. Design rationale and
behavior contracts live in
`docs/superpowers/specs/2026-09-01-neo-brutalist-homepage-redesign.md`
(homepage) and `docs/superpowers/specs/2026-09-02-work-showcase-design.md`
(showcase + relay); older specs describe retired pages.

## Commands

```bash
npm run dev       # vite dev server
npm run build     # vite build -> dist/
npm run preview   # serve the dist/ build locally
```

There is no lint script and no test suite. Use the `ninja-static-website:verify`
skill (`.claude/skills/verify/SKILL.md`) to build, launch, and drive the site
end-to-end with Playwright when validating changes — it documents the specific
flows worth exercising (hero rotator, scroll reveal, product card tilt, mobile
nav, reduced-motion) and known gotchas.

## Deployment

Firebase Hosting, site `localninja`, project `localninja-test` (`.firebaserc`).
`firebase.json` serves `dist/` with a 1-year immutable cache on `/assets/**`.
Deploys are handled entirely by GitHub Actions — there is no manual
`firebase deploy` workflow expected:

- `.github/workflows/firebase-hosting-pull-request.yml` — on PRs from the same
  repo, builds and deploys to a preview channel.
- `.github/workflows/firebase-hosting-merge.yml` — on push to `master`, builds
  and deploys to the `live` channel.

Both run `npm ci && npm run build` on Node 22 before deploying, so a change
that breaks the build will break deploys — verify `npm run build` succeeds
before treating work as done.

The Cloud Function is **not** deployed by CI. Deploy it manually with
`firebase deploy --only functions` (needs `firebase login`, the Blaze plan,
and the `OPENAI_API_KEY` secret set via `firebase functions:secrets:set`).
`firebase.json` rewrites `/api/chat` to it; the Vite dev server proxies
`/api` to `https://localninja.web.app` so local demos use the deployed relay.

## Architecture

Everything lives in a few files plus assets:

- `work/*.html` — eight demo pages, each listed in `vite.config.js`. They
  share `src/work/shell.css` (LocalNinja top bar + footer) and otherwise
  own their look: `clinic`, `restaurant`, `realty`, `dashboard`, `dealer`, `trades` each have a
  matching `src/work/<slug>.css` and use `src/work/mockups.js` (generic
  data-attribute behaviours: steps, tabs, select groups, cart, filters,
  overlays, chart ranges). `dashboard`, `restaurant`, `clinic`, `realty`, `dealer` and `trades`
  also load a page module `src/work/<slug>.js` for their richer flows (views,
  drawers, checkout, calendar, portal tabs); page modules use their own
  `data-*` names and never re-implement the generic ones. `clinic`, `restaurant` and `realty` also embed
  the bot as an on-site widget (`src/work/widget.css` + `bot.js`, root
  `[data-bot][data-mode]`), so one page serves both a UI/UX card and a
  bot card. `bot-store` is the only standalone bot page.
  `conversy-app`, `ninja-hr`, `ninja-learn`, `curriculearn`, `irina`,
  `story` and `ninja-commerce` are screenshot galleries
  (`src/work/gallery.css`, images in `public/work/<dir>/`) for real
  products; all share the same markup shape (facts box + `.shot` list +
  `.lightbox` overlays).
  Demo pages carry `<meta name="robots" content="noindex">`.
- `functions/index.js` — the `chat` relay. Server-side system prompts per
  bot id (`clinic`, `restaurant`, `store`, `realty`), input validation,
  per-IP rate limit, `gpt-4o-mini`. Returns 503 `not_configured` without
  the secret; the widget then switches to scripted replies.
- `work.html` — the showcase page: the tab bar and every project card.
  Its header/footer are copies of the homepage's, so same-page anchors are
  written as `/#services`, `/#contact` … If you add a nav item or change
  the footer, change it in **both** files.
- `index.html` — homepage markup, no templating. Sections in order: header,
  `#home` hero, marquee band, `#services` (6 numbered accordion rows + an
  "Others" row; rows have `id="svc-*"` so the header dropdown can deep-link),
  `#process` (six-step "How we work" cards), `#work` (a teaser strip of four
  demos + a "See our work →" button pointing at `/work.html`), `#about`
  (+ team), `#contact` (form), footer (`#products` links). CSS is linked directly
  (`<link href="/src/style.css">`), **not** imported from `main.js` — don't
  move it into JS.
  Any new page must be added to `vite.config.js` `rollupOptions.input` or
  the build won't emit it.
- `src/main.js` — all interactivity, loaded as an ES module
  (`<script type="module">`). Three independent `init*()` functions called
  from one `init()`: scroll-reveal (IntersectionObserver), mobile nav toggle,
  services accordion, work tabs, contact form (builds a `mailto:` URL). Comment at the top states the
  contract: **JS only toggles classes / builds URLs; CSS owns all
  transitions/animations.**
- `src/style.css` — all styling and every animation/transition.
- `public/` — static assets served from site root (`logo-animated.svg`,
  `logo.png`).

### JS/CSS behavior contracts (don't break these)

- **Reveal**: elements with `.reveal` gain `.is-visible` once via an
  `IntersectionObserver` (threshold 0.15); falls back to revealing everything
  immediately if `IntersectionObserver` is unsupported. CSS defines the
  hidden/visible states and must show content even without `.is-visible` when
  `prefers-reduced-motion: reduce`.
- **Mobile nav**: `.nav-toggle` button toggles `.nav-open` on `.site-header`
  and updates `aria-expanded`; clicking a nav link closes the menu.
- **Services dropdown**: `.has-menu > .nav-menu-toggle` toggles `.is-open`
  on `.has-menu` (click only — no hover-open); nested `.nav-others-toggle`
  toggles `.is-open` on `.nav-others`. Outside click / Escape / following a
  menu link closes it. Menu links are `#svc-*` hashes; `initServices()`
  opens the matching row on `hashchange`/load.
- **Services accordion**: `.service-row` click (or its `.service-toggle`
  button) toggles `.is-open` and `aria-expanded`; CSS animates
  `.service-details` height via `grid-template-rows` (instant under
  reduced motion). Clicks inside `.service-details` don't collapse it.
- **Work tabs** (on `work.html`): `.work-tab[data-work-tab]` buttons toggle `.is-active`
  (+ `aria-selected`) on themselves and on the matching `.work-grid` id;
  seven tabs (Voice bots, UI/UX, Web development, E-commerce, AI, Chatbots,
  Sample projects); Voice bots is first and visible on load unless a category
  hash is supplied. Rideau, Ember & Oak, and Northshore voice demos live under
  Sample projects and carry sample badges. The CSS sliding pill supports all seven positions.
- **Assistant widget collapse**: the `.wmin` button (`data-collapse`)
  toggles `.is-collapsed`, its `+`/`–` label and `aria-expanded`;
  `mockups.js` collapses it on load at `(max-width: 640px)` so it never
  covers a phone screen. Desktop starts expanded.
- **Bot widget**: `bot.js` posts `{ bot, messages }` to `/api/chat`; any
  non-OK response flips it to scripted mode (canned `SCRIPTS`, "Demo mode"
  pill) for the rest of the text-chat session. Voice mode delegates to
  `src/work/voice.js` and the Vapi Web SDK, using public build-time keys and
  fixed assistant IDs. It never falls back to scripted replies. Clinic/dealer
  voice links use `?mode=voice#assistant`; normal links preserve chat mode.
  Setup lives in `docs/voice-assistants.md`; the independent tenant booking API
  is in the sibling `../generic-backend` directory.
- **Contact form**: `#contact-form` submit is intercepted; after
  `reportValidity()` JS sets `window.location.href` to a `mailto:` with the
  subject/body prefilled. No network request, no backend.
- **Marquee**: CSS-only (`.marquee-track` translates -50% over a duplicated
  `.marquee-group`); stopped under `prefers-reduced-motion`.
- **Display headings**: Syne 800 is ~1em wide per glyph. Single long words
  (`SOLUTIONS`, `LOCALNINJA`) are what overflow on narrow screens — size
  them with `vw` clamps per breakpoint rather than letting them wrap.

All new motion/animation must be gated on `prefers-reduced-motion`.
