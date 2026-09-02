# LocalNinja homepage — neo-brutalist redesign

**Date:** 2026-09-01
**Status:** approved
**Reference:** https://ui-ux-pro-max-skill.nextlevelbuilder.io/demo/creative-agency

## Goal

Remodel `index.html` into a single-page, neo-brutalist services site in the
style of the reference "creative agency" demo, with `#4da3ff` as the brand
accent (the "Ninja" in LocalNinja) and the company's 6 core services as the core
content. `solutions.html` (the old NinjaSolution page) is removed.

## Visual system

- **Ground:** white `#ffffff`, text black `#000000`.
- **Accent:** `#4da3ff` (brand word, highlighted heading words, primary
  buttons, service numbers, contact band). Secondary deep blue `#1d4ed8` for
  hover/marquee details. No yellow/green/purple accents remain on the homepage.
- **Borders/shadows:** `3px solid #000`, hard offset shadow `6px 6px 0 #000`
  (`4px 4px 0` on small elements). No border-radius, no gradients, no glows.
- **Type:** Syne 800 for display headings (uppercase, tight leading), Inter
  for body/UI. Loaded from Google Fonts.
- **Highlight word:** `<span class="hl">` — solid `#4da3ff` block behind white
  or black text inside a heading (like the reference's `BOLD`).
- **Motion:** button/card hover shifts `translate(-2px,-2px)` with a bigger
  shadow; marquee scrolls via CSS keyframes; `.reveal` fade-up on scroll. All
  gated on `prefers-reduced-motion: reduce` (marquee stops, reveal shows
  immediately, hover shift disabled).

## Page structure (`index.html`)

1. **Header** — sticky, white, bottom border. Brand: mascot SVG +
   `Local<span class="brand-accent">Ninja</span>`. Nav: **Services** (dropdown:
   "All services", the 6 core services deep-linking to `#svc-*`, and an
   "Others ▸" sub-toggle revealing the 5 secondary ones), Process, About,
   Contact, Products (→ `#products` footer block). On ≤900px the dropdown
   renders inline inside the stacked mobile nav. CTA button "Let's talk"
   (`mailto:`). Mobile `.nav-toggle` as today.
2. **Hero** (`#home`) — kicker pill "Software · Solutions · People".
   Headline: `WE BUILD` / `NINJA` (highlighted) / `SOLUTIONS`. Sub-copy, two
   buttons ("See services" → `#services`, "Get in touch" → `#contact`). Right
   column: stacked rotated squares (deep blue, blue, white) with hard
   shadows; the white front card holds the six-step flow TALK ↓ QUOTE ↓
   PROTOTYPE ↓ BUILD ↓ TEST ↓ DELIVER (last word highlighted), staggered
   fade-in on load.
3. **Marquee** — full-width black band; repeating service names separated by
   `✦` in the accent color; duplicated track for a seamless loop.
4. **Services** (`#services`) — black band. Kicker "What we do", heading
   `OUR` `SERVICES`(highlighted). Six numbered rows:
   01 AI Chatbot & Voice Bot · 02 Web Development · 03 E-commerce
   Development · 04 Custom Software (its details carry the "bring us
   anything" pitch and a link to `#process`) · 05 IT Consulting ·
   06 Maintenance & Support — then an
   **Others** row (`+`) whose details list the secondary services:
   Automation & AI Integration, Cloud & DevOps, UI/UX Design, HR & People
   Operations, Staff Augmentation. Each row has `id="svc-*`. Each row: accent number, name, one-line
   description, `→`. Rows separated by 1px white/20% lines; hover inverts the
   number/arrow to white and shifts the arrow right. Each row is an
   accordion: the arrow is a `<button>` (`aria-expanded`/`aria-controls`);
   clicking it or the row toggles `.is-open`, revealing `.service-details`
   (intro line + ✦ bullet list of what's included).
5. **Process** (`#process`) — white. Kicker "Custom solutions", heading
   `HOW WE` `WORK`(highlighted), intro paragraph on the right. Six bordered
   step cards in a 3×2 grid (2 cols ≤900px, 1 col ≤640px), each with a blue
   number sticker overlapping the top-left corner, uppercase Syne title,
   description, and a "You get" outcome line: 01 Talk → a clear scope ·
   02 Quote → a signed quote · 03 Prototype → a clickable prototype ·
   04 Build → a working product · 05 Test → your sign-off · 06 Deliver → a
   live product. `→` between cards on the same desktop row. Closes with a
   black CTA bar → `#contact`.
6. **About + Team** (`#about`) — two columns. Left: kicker "About us",
   `WE ARE` / `LOCALNINJA`(highlighted), two paragraphs, three stat tiles
   (placeholders: `3 Products`, `6 Services`, `2026 Founded`). Right: "The
   team" with six bordered cards in a 3-column grid (2 on ≤640px): Ajay —
   Co-founder and Aleena — Owner (with LinkedIn links), plus AI Specialist
   Ninja, Frontend Ninja, Backend Ninja and Cloud Ninja. Every card uses the mascot SVG in a blue
   bordered square as its avatar — no photos.
7. **Contact** (`#contact`) — `#4da3ff` band. Left: kicker "Get in touch",
   `LET'S BUILD` / `SOMETHING` / `SHARP`(black block, white text), email and
   location lines. Right: bordered white form card — Name, Email, Message,
   "Send message →". Submit is intercepted by JS, which opens
   `mailto:support@localninja.ca?subject=…&body=…` with the fields prefilled.
   Form has `required` fields and native validation; no network calls.
8. **Footer** (`#products` lives here) — three columns: brand + one-line
   blurb / Links (Services, About, Contact) / Products (NinjaCommerce →
   localninja.ca, NinjaLearn → learn.localninja.ca). Bottom row: copyright.

## Code changes

- `index.html` — rewritten to the structure above.
- `src/style.css` — rewritten for the new system. Reset, tokens, layout
  utilities, header/nav, hero, marquee, services, about/team, contact, footer,
  responsive (≤900px stacks columns, ≤640px tightens type), reduced-motion.
- `src/main.js` — keep `init()` + independent `init*()` pattern. Keep
  `initReveal()` and `initMobileNav()` unchanged. Remove `initRotator()` and
  `initTilt()` (no rotator / product cards on the new homepage). Add
  `initContactForm()`: on `submit` of `#contact-form`, `preventDefault`,
  read name/email/message, build the `mailto:` URL with
  `encodeURIComponent`, and set `window.location.href`. Contract unchanged:
  JS only toggles classes / builds a URL; CSS owns transitions.
- `solutions.html` — deleted, along with its `vite.config.js` input entry.
- `CLAUDE.md` — updated to describe the new homepage, dropped behaviors,
  and the legacy stylesheet arrangement.

## Out of scope (revisit later)

- Real stat numbers, real case studies, a backend for the contact form.
