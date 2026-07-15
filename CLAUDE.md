# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

A one-page static marketing site for LocalNinja (black theme, yellow/blue/green
accents) introducing three products — NinjaCommerce, NinjaBusiness (HR),
NinjaLearn. Vite + vanilla JS/CSS, no framework, no backend, no CMS. Design
rationale and behavior contracts live in
`docs/superpowers/specs/2026-07-09-localninja-site-design.md`.

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

## Architecture

Everything lives in three files plus assets:

- `index.html` — full page markup, single file, no templating. All four
  sections (`#home`, `#about`, `#products`, `#team`) plus header/footer live
  here as static HTML. CSS is linked directly (`<link href="/src/style.css">`),
  **not** imported from `main.js` — don't move it into JS.
- `src/main.js` — all interactivity, loaded as an ES module
  (`<script type="module">`). Structured as four independent `init*()`
  functions called from one `init()`: hero word rotator, product card 3D tilt,
  scroll-reveal (IntersectionObserver), mobile nav toggle. Comment at the top
  states the contract: **JS only toggles classes / sets inline transforms;
  CSS owns all transitions/animations.**
- `src/style.css` — all styling and animation/transition definitions.
- `public/` — static assets served from site root (`logo.png`, `team/*.jpg`).

### JS/CSS behavior contracts (don't break these)

- **Rotator**: words are `span.rotator-word[data-accent]` inside
  `span.rotator`; JS toggles `.is-active`, paused via
  `visibilitychange` while the tab is hidden. CSS owns per-accent color and
  enter/exit transition.
- **Tilt**: JS sets inline `transform` on `.product-card` from
  `pointermove` (rAF-throttled), clears it (`transform = ''`) on
  `pointerleave`. Skipped entirely when `prefers-reduced-motion: reduce` or
  no fine pointer. CSS must never set a hover `transform` on `.product-card`
  — hover styling is border/box-shadow/inner-element only.
- **Reveal**: elements with `.reveal` gain `.is-visible` once via an
  `IntersectionObserver` (threshold 0.15); falls back to revealing everything
  immediately if `IntersectionObserver` is unsupported. CSS defines the
  hidden/visible states and must show content even without `.is-visible` when
  `prefers-reduced-motion: reduce`.
- **Mobile nav**: `.nav-toggle` button toggles `.nav-open` on `.site-header`
  and updates `aria-expanded`; clicking a nav link closes the menu.

All new motion/animation must be gated on `prefers-reduced-motion`.
