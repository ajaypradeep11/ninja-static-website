# LocalNinja Static Website - Design Spec

**Date:** 2026-07-09 · **Status:** Approved by Ajay

## Goal

A one-page static marketing site for LocalNinja introducing three products:
NinjaCommerce, NinjaHR, NinjaLearn. Black-dominant theme with yellow accents
(matching the ninja logo). Built with Vite + vanilla JS, no framework.

## Stack & Layout

- Vite + vanilla JS/CSS in repo root. `index.html` at root, `src/style.css`,
  `src/main.js`, logo at `public/logo.png`.
- CSS linked directly from `index.html` (`/src/style.css`); JS as module
  (`/src/main.js`).
- One page, smooth-scroll anchor nav: Home · About · Products · Team.

## Sections

1. **Hero (`#home`)** - Full-viewport black. Sticky header: circular logo mark +
   "LocalNinja" wordmark, anchor nav, yellow "Get in touch" mailto button
   (`mailto:ceotwopeace@gmail.com` - placeholder, easy to change). Headline
   "We build ninjas for" + auto-rotating word every ~2.5 s:
   **ecommerce** (yellow) → **HR** (blue) → **learning** (green). Mascot image
   floats beside copy with a subtle bob.
2. **About (`#about`)** - Statement about who LocalNinja is, plus three
   "how we operate" points (small, fast, quality-obsessed). Placeholder copy.
3. **Products (`#products`)** - Three cards: NinjaCommerce (yellow #FFD84D),
   NinjaHR (blue #4DA3FF), NinjaLearn (green #4ADE80). Rest state: dark card,
   colored icon + name. Hover: 3D tilt-toward-cursor, lift, colored glow/border
   flood. Each card: one-line pitch + 3 feature bullets.
4. **Team (`#team`)** - Ajay and Aleena, circular initial-avatars (photos
   swap in later), name + role.
5. **Footer** - brand, mini nav, `© 2026 LocalNinja. All rights reserved.`

## Behavior contract (JS ↔ CSS)

- **Rotator:** words are `span.rotator-word[data-accent]` stacked in
  `span.rotator`; JS toggles `.is-active` on the current word. CSS owns the
  enter/exit transition and per-accent color.
- **Tilt:** JS sets inline `transform` on `.product-card` from mousemove
  (perspective rotateX/rotateY + translate lift), resets on leave. CSS must not
  fight card transform on hover - hover styling uses border/box-shadow/inner
  elements.
- **Reveal:** elements with `.reveal` get `.is-visible` from an
  IntersectionObserver. CSS defines hidden/visible states.
- All motion gated on `prefers-reduced-motion`.

## Non-goals

- No build-time frameworks, no backend, no contact form, no CMS.
- Real team photos and final copy come later; structure must make swaps trivial.

## Testing / verification

- `npm run build` succeeds; site verified visually in browser (hero rotation,
  card hover, reveal on scroll, mobile layout at ~375 px).
