# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

A static marketing site for LocalNinja. The homepage is a single-page,
neo-brutalist services site (light/dark ground, 3px borders + hard offset
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
  share `src/work/shell.css` (Studio shell styles and footer) and otherwise
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
  Its container stretches to 2240px; project cards use real screenshot thumbnails
  from `public/work/service-previews/`. The Voice bots panel shows the actual
  assistant without a preview screenshot. The Motion collection begins with filters
  and projects; its former Motion Lab heading and introductory copy are removed.
  Its header/footer are copies of the homepage's, so same-page anchors are
  written as `/#services`, `/#contact` … If you add a nav item or change
  the footer, change it in **both** files.
- `index.html` — homepage markup, no templating. Sections in order: header,
  `#home` hero, marquee band, `#services` (8 service tabs with project galleries;
  tabs have `id="svc-*"` so the header dropdown can deep-link),
  `#process` (six-step "How we work" cards), `#about`
  (+ team), `#contact` (form), footer (`#products` links). CSS is linked directly
  (`<link href="/src/style.css">`), **not** imported from `main.js` — don't
  move it into JS.
  Any new page must be added to `vite.config.js` `rollupOptions.input` or
  the build won't emit it.
- `src/main.js` — shared interactivity, loaded as an ES module
  (`<script type="module">`). Independent `init*()` functions handle
  scroll-reveal (IntersectionObserver), mobile nav, work tabs, the voice showcase
  and contact form (builds a `mailto:` URL). Comment at the top states the
  contract: **CSS owns all transitions/animations. JS initializes content, toggles
  interaction state, and builds URLs.**
- `src/style.css` — all styling and every animation/transition.
- `src/theme.css` and `public/theme.js` — shared Studio themes. A synchronous
  head script applies the stored `localninja-theme` preference before CSS paints;
  otherwise it follows the system. Header buttons switch modes across homepage,
  Work, project galleries, and shared sample-project bars/footers. Standalone design
  studies and embedded sample-product interfaces retain their authored palettes.
  Dark mode uses black for Hero, Services, About, Footer, Work, and the contact form;
  Contact uses deep navy blue `#0b2447` in both themes, with light copy and a
  themed form. Custom solutions uses `#292929` in dark mode and `#eeeeee` in
  light mode. The homepage Work teaser has been removed; link to `/work.html`.
- `public/` — static assets served from site root (`logo-animated.svg`,
  `logo.png`).

### JS/CSS behavior contracts (don't break these)

- **Hero service wheel**: `initServiceWheel()` enhances seven service links into
  a tilted CSS 3D cylinder. Cards remain tangent to the wheel, with mirrored
  reverse faces to keep service names readable. A visual copy of each service
  fills out the desktop ring; copies are hidden from assistive technology and
  omitted from the mobile/static grid. Original links follow the existing
  `#svc-*` routing. CSS owns the rotation and focus positioning; card hover,
  keyboard focus, offscreen visibility and hidden tabs stop motion.
  The hero tagline and manual Pause/Play button are removed.
  Reduced motion presents all seven services in a static grid without controls.

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
  menu link closes it. Menu links are `#svc-*` hashes; `src/services.js`
  selects the matching service tab on `hashchange`/load.
- **Services galleries**: `src/services.js` is loaded only on the homepage. It
  reads `work.html?raw` through an inert template so titles and demo URLs stay
  aligned with Work. UI/UX shows 24 visible design studies (MINA and ECHO ZERO are hidden); the remaining seven
  tabs show relevant products. `.service-tab` controls a `.service-panel` with
  `aria-selected`, roving tabindex and Left/Right/Home/End navigation. Inactive
  panels are hidden; their gallery images render on first selection. Existing
  service copy remains in native “What’s included” details. Preview WebPs live
  in `public/work/service-previews/`; update a preview when its project changes.
  The homepage content is 1520px wide; Services uses a near-full-width project
  gallery with 1–5 columns by viewport size. Cards follow a stable left-to-right
  grid order; generic #services links preserve the current service selection. CSS owns hover/reduced motion.
  Every service tab reuses available recordings from `src/service-preview-catalog.js`.
  It maps each recorded project to one poster/video URL pair and cache version;
  update that catalog when adding a recording. Repeated projects across categories
  must use identical media URLs. Cards remain deduplicated within each tab.
  `src/service-previews.js`
  defers animation loading until visible, pauses offscreen/hidden tabs, and provides a
  gallery Play/Pause button. Reduced motion/data saver default to stills. Clips
  and regeneration instructions live in `scripts/service-previews/` and
  `public/work/service-previews/motion/`; projects without a recording use their still image.
  Conversy, ajaypradeep.com, NinjaLearn and NinjaCommerce use 30 fps MP4s captured
  from live browser frames with `capture-scroll.mjs <slug>`. Ajay's tour shows
  About → Design → the Crimson Lancer project. NinjaLearn starts in System Design,
  opens Chat System and demonstrates simulated messages and reconnection. Neither
  tour records the site's homepage. Preserve timestamps and still holds, and update
  their poster images together with the videos. The 24 UI tours use
  `motion-tours.mjs`, `more-motion-tours.mjs`, `design-tours-a.mjs` and
  `design-tours-b.mjs` to demonstrate each design's controls and detail views.
  New visible design cards require matching MP4 and WebP assets before release.
  Each gallery owns its playback controls; animated cards use a 1.6 aspect ratio.
  Others has eight tours: Conversy App, NinjaHR and the six sample projects.
  `others-gallery-tours.mjs`, `others-tours-a.mjs` and `others-tours-b.mjs`
  drive their existing screenshot lightboxes and native product controls.
  Conversy App/NinjaHR share these upgraded clips with Web Development.
  The eight Others destination pages omit `.ln-bar`; their
  `body[data-project-standalone]` uses `--ln-bar-h: 0px` for sticky controls,
  drawer offsets and full-height layouts. Keep each product's own navigation
  and footer links. Hide floating assistant widgets only during capture;
  preserve the actual page widgets. Do not submit bookings, orders or chats
  while generating previews.
- **Work tabs** (on `work.html`): `.work-tab[data-work-tab]` buttons toggle `.is-active`
  (+ `aria-selected`) on themselves and on the matching `.work-grid` id;
  seven tabs (Voice bots, UI/UX, Web development, E-commerce, AI, Chatbots,
  Sample projects); Voice bots is first and visible on load unless a category
  hash is supplied. Maple Clinic, Ember & Oak, Northshore Realty, Pulse,
  Rideau Motorworks, and Copper & Coil are sample projects, grouped first in
  UI/UX and also listed under Sample projects. Use their canonical business
  names across categories; tags reflect the active project type, with a sample
  badge for demos. The CSS sliding pill supports all seven positions.
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
