---
name: verify
description: Build, launch, and drive the LocalNinja static site to verify changes end-to-end
---

# Verifying the LocalNinja site

## Build & launch

```bash
npm run build                      # vite build → dist/
npx vite preview --port 4188 &     # serve the built site
curl -s -o /dev/null -w "%{http_code}" http://localhost:4188/   # expect 200
```

`npm run dev` also works for unbuilt verification, but preview exercises the real build.

## Drive (Playwright)

Playwright browsers already installed at `~/Library/Caches/ms-playwright` (chromium).
The `playwright` npm module is NOT a project dep — install it in the scratchpad with
`PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1 npm i playwright --no-save` and run a node script
from there. Needs sandbox disabled (browser launch + localhost).

## Flows worth driving

1. **Hero rotator** — `.rotator-word.is-active` text changes every ~2.6 s
   (ecommerce → HR → learning).
2. **Scroll reveal** — click nav anchors; `.reveal` elements gain `.is-visible`.
3. **Product 3D tilt** — `mouse.move` over a `.product-card`; its inline
   `style.transform` becomes `perspective(...) rotateX(...) rotateY(...)`;
   resets to `""` on pointer leave. Accent flood: border/glow per `data-accent`.
4. **Mobile nav** — 375px viewport: `.nav-toggle` visible; click toggles
   `.nav-open` on `.site-header` + `aria-expanded`; clicking a nav link closes it.
5. **Reduced motion** — new page with `reducedMotion: 'reduce'`; `.reveal`
   elements must still be visible (CSS override, opacity 1) even without
   `.is-visible`.
6. Check `pageerror`/console errors are empty.

## Gotchas

- CSS is linked from index.html (`/src/style.css`), not imported in main.js.
- JS owns `.product-card` inline transform — CSS must not set hover transform.
