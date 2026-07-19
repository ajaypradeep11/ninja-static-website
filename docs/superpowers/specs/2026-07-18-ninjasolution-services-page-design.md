# NinjaSolution services page — design

**Date:** 2026-07-18
**Status:** Approved

## Goal

Replace the NinjaBusiness (HR) product card on the homepage with **NinjaSolution**,
a services offering, and add a new `/solutions.html` page listing the services
LocalNinja provides. The old external link to `hr.localninja.ca` goes away; HR
lives on as one of the listed services.

## Services offered (page content)

1. **Software development** — custom web & mobile apps, e-commerce builds
2. **IT consulting & solutions** — business/IT consulting, digital
   transformation, automation
3. **HR & people operations** — hiring, onboarding, payroll (the former
   NinjaBusiness offering)
4. **Design & marketing** — branding, UI/UX design, websites, digital marketing

## Homepage changes (`index.html`)

- Card 2 renamed **NinjaBusiness → NinjaSolution**:
  - Unit code: "Unit 02 · Services & solutions"; tag: "Solutions studio".
  - Pitch: full-service team framing (software, consulting, people ops, design).
  - Feature bullets: the four service areas, short form.
  - `href` changes from `https://hr.localninja.ca` (new tab) to
    `/solutions.html` (same tab, no `target="_blank"`).
  - Ninja SVG (happy-arc eyes) and blue accent unchanged; internal
    `data-accent="hr"` key kept to avoid CSS churn.
- Copy updates to match: `<meta name="description">`, hero rotator word
  "business" → "solutions" (accent key stays `hr`), hero sub, and the
  about-section statement referencing the "HR product".

## New page: `solutions.html`

- Reuses `src/style.css` and `src/main.js` unchanged. The JS init functions
  guard for missing elements, so scroll-reveal and mobile nav work; rotator
  and product-card tilt simply don't activate.
- Same header (logo + nav) and footer as the homepage, with nav links pointing
  back to `/#home`, `/#about`, `/#products`, `/#team`.
- Small hero: kicker + "NinjaSolution" title + one-line tagline.
- 2×2 grid (1 column on mobile) of `.service-card` elements — a new class,
  deliberately **not** `.product-card` so the 3D tilt stays exclusive to
  product cards. Each card: accent color, title, one-line description,
  2–3 bullets. Cards use the existing `.reveal` scroll animation.
- Bottom CTA: "Get in touch" button → `mailto:support@localninja.ca`.
- All motion inherits the existing `prefers-reduced-motion` handling in
  `style.css`.

## Build config

- Add minimal `vite.config.js` with `build.rollupOptions.input` listing both
  `index.html` and `solutions.html` (Vite only builds `index.html` by default).
- No Firebase changes: `/solutions.html` is served as a plain static file.

## Verification

- `npm run build` passes (GitHub Actions deploys depend on it).
- Drive both pages with the `ninja-static-website:verify` skill (Playwright):
  homepage card navigates to the services page, nav works both directions,
  reveal fires, reduced-motion still shows content, mobile nav toggles.
