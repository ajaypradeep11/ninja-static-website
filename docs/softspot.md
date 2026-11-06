# Pocket Cities

Route: `/work/motion/softspot.html`. The route is retained so existing links continue to work.

The study presents **Ottawa, Toronto and Windsor** as miniature city worlds. Its current name is **Pocket Cities**, used by the header, dialogs, browser title and Work/Services catalog. The existing `softspot` route and asset filenames remain stable.

## City artwork

Each city uses an original, transparent miniature diorama generated with the built-in `image_gen` tool. These are illustrated landmark compositions, not scale-accurate maps or live 3D models. Camera tilt and gentle floating animate the rendered layers.

- `public/work/motion-lab/softspot/ottawa.webp` — Parliament, canal locks and a river edge.
- `public/work/motion-lab/softspot/toronto.webp` — CN Tower, Rogers Centre, skyline and waterfront.
- `public/work/motion-lab/softspot/windsor.webp` — Ambassador Bridge, riverfront and city blocks.
- `public/work/motion-lab/softspot/city-prompts.json` — complete prompts and generator provenance.

The generated PNG originals remain in the generator’s output directory. Project assets use WebP quality 88 and lossless alpha (`cwebp -q 88 -alpha_q 100`). Original animal assets and their `prompts.json` remain preserved but are no longer referenced by this page.

Landmark context was checked against [the National Capital Commission](https://ncc-ccn.gc.ca/blog/from-0-0-to-7-8-a-trip-down-the-rideau-canal-skateway), [Rogers Centre directions](https://www.mlb.com/bluejays/ballpark/transportation/driving-directions), and [Windsor’s parks map](https://citywindsor.ca/documents/visitors/maps/parks-trails-recreation-map_map_and_index.pdf). No source photographs, website artwork or MotionSites prompts were used.

## Interaction

The existing React Motion carousel keeps its direction-aware transitions, pointer parallax, drag/swipe, arrow-key navigation, previous/next buttons and direct selection. Tapping a city opens its details, including landmarks and waterfront. The former animal hop reaction is replaced with that useful action. A drag does not open the details panel. About and contact dialogs use the same native dialog implementation; contact leads to `/#contact`.

The existing three palettes remain: slate blue for Ottawa, periwinkle for Toronto and lime for Windsor. Single-line city names have their own mobile spacing, and navigation remains below them. Pause and reduced motion stop continuous movement while navigation and city details remain usable.

## Files and previews

- `src/work/motion/softspot.jsx` and `softspot.css`
- `work/motion/softspot.html`
- `src/work/motion/catalog.js` and the card in `work.html`
- `public/work/motion-lab/softspot.png` — actual 1440 × 900 page screenshot for Work.
- `public/work/service-previews/softspot.webp` — 960 × 600 version for homepage Services.

Gallery screenshots hide the shared Motion toolbar only during capture; normal visitors retain the toolbar.

## Verification

Playwright checks cover all three cities at 1440, 768, 375 and 320 pixels, image loading, title/control layout, city details, next/previous wrapping, keyboard arrows, native mouse drag, pause, reduced motion, about/contact dialogs and JavaScript errors. Local 21st review reported zero errors and zero warnings. The existing project carousel was reused; catalog search was unavailable without sign-in.
