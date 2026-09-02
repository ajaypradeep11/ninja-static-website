# LocalNinja homepage — neo-brutalist redesign

**Date:** 2026-09-01
**Status:** approved
**Reference:** https://ui-ux-pro-max-skill.nextlevelbuilder.io/demo/creative-agency

## Goal

Remodel `index.html` into a single-page, neo-brutalist services site in the
style of the reference "creative agency" demo, with `#4da3ff` as the brand
accent (the "Ninja" in LocalNinja) and the company's 10 services as the core
content. `solutions.html` is left visually unchanged for now.

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
   `Local<span class="brand-accent">Ninja</span>`. Nav: Services, About,
   Contact, Products (→ `#products` footer block). CTA button "Let's talk"
   (`mailto:`). Mobile `.nav-toggle` as today.
2. **Hero** (`#home`) — kicker pill "Software · Solutions · People".
   Headline: `WE BUILD` / `NINJA` (highlighted) / `SOLUTIONS`. Sub-copy, two
   buttons ("See services" → `#services`, "Get in touch" → `#contact`). Right
   column: `logo-animated.svg` centered on stacked rotated squares (blue,
   black outline, white) with hard shadows.
3. **Marquee** — full-width black band; repeating service names separated by
   `✦` in the accent color; duplicated track for a seamless loop.
4. **Services** (`#services`) — black band. Kicker "What we do", heading
   `OUR` `SERVICES`(highlighted). Ten numbered rows:
   01 Web Development · 02 E-commerce Development · 03 Custom Software ·
   04 IT Consulting · 05 Automation & AI Integration · 06 Cloud & DevOps ·
   07 UI/UX Design · 08 HR & People Operations · 09 Staff Augmentation ·
   10 Maintenance & Support. Each row: accent number, name, one-line
   description, `→`. Rows separated by 1px white/20% lines; hover inverts the
   number/arrow to white and shifts the arrow right.
5. **About + Team** (`#about`) — two columns. Left: kicker "About us",
   `WE ARE` / `LOCALNINJA`(highlighted), two paragraphs, three stat tiles
   (placeholders: `3 Products`, `10 Services`, `2026 Founded`). Right: "The
   team" with two bordered cards (Ajay — Co-founder, Aleena — Owner) using
   `public/team/*.jpg` in a bordered square, LinkedIn link.
6. **Contact** (`#contact`) — `#4da3ff` band. Left: kicker "Get in touch",
   `LET'S BUILD` / `SOMETHING` / `SHARP`(black block, white text), email and
   location lines. Right: bordered white form card — Name, Email, Message,
   "Send message →". Submit is intercepted by JS, which opens
   `mailto:ceotwopeace@gmail.com?subject=…&body=…` with the fields prefilled.
   Form has `required` fields and native validation; no network calls.
7. **Footer** (`#products` lives here) — three columns: brand + one-line
   blurb / Links (Services, About, Contact) / Products (NinjaCommerce →
   shop.localninja.ca, NinjaLearn → learn.localninja.ca, NinjaSolution →
   `/solutions.html`). Bottom row: copyright.

## Code changes

- `index.html` — rewritten to the structure above.
- `src/style.css` — rewritten for the new system. Reset, tokens, layout
  utilities, header/nav, hero, marquee, services, about/team, contact, footer,
  responsive (≤900px stacks columns, ≤640px tightens type), reduced-motion.
- `src/legacy.css` — verbatim copy of the current `src/style.css`, linked
  only by `solutions.html` so that page looks identical to today.
- `src/main.js` — keep `init()` + independent `init*()` pattern. Keep
  `initReveal()` and `initMobileNav()` unchanged. Remove `initRotator()` and
  `initTilt()` (no rotator / product cards on the new homepage). Add
  `initContactForm()`: on `submit` of `#contact-form`, `preventDefault`,
  read name/email/message, build the `mailto:` URL with
  `encodeURIComponent`, and set `window.location.href`. Contract unchanged:
  JS only toggles classes / builds a URL; CSS owns transitions.
- `solutions.html` — only change: stylesheet link → `/src/legacy.css`.
- `vite.config.js` — unchanged (both pages still built).
- `CLAUDE.md` — updated to describe the new homepage, dropped behaviors,
  and the legacy stylesheet arrangement.

## Out of scope (revisit later)

- Whether to retire or restyle `solutions.html`.
- Real stat numbers, real case studies, a backend for the contact form.
