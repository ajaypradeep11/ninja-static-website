# Northshore Realty — 20-home catalogue

The sample property catalogue now includes 20 homes: five condos, five townhouses, five detached homes and five lofts. The original four listings remain, with 16 additional homes across Kitsilano, Burnaby Heights, North Vancouver and Gastown.

`src/work/realty-homes.js` supplies the listing cards, detail sheets, map markers, saved-home comparisons and agent desk. Each home has its own price, description, specifications and photograph. Filtering and sorting operate on all 20 homes. The mobile map scrolls sideways to keep its markers readable.

## Images

All 16 new property images were generated individually with the built-in image generation tool, visually inspected, and exported as responsive WebPs. No CLI/API image generation was used. These are fictional property concepts for the existing sample project.

- [Delivered images](../../public/work/realty/): 40 WebPs for 20 homes, totaling 3,852,494 bytes.
- Each image has a 960 × 640 version and a 480 × 320 version. The 20 small variants total 868,798 bytes.
- [Original four prompts](image-prompts.md).
- [New-home prompts, IDs 5–12](expansion-prompts-a.md).
- [New-home prompts, IDs 13–20](expansion-prompts-b.md).
- [Expansion specifications](expanded-image-specs.json).

Listing images load lazily after the opening cards. Detail, comparison and agent views reuse the matching property image.

## Verification

Browser checks at 1440, 390 and 320 px verified all 20 cards, photos, detail sheets and map markers; five results for every property type; price/bedroom/bathroom filters; sorting; saved-home comparison; mortgage controls; viewing selection; and agent listing updates. No bookings were submitted. There were no JavaScript errors, broken property images or page overflow. The mobile map also passed a focused sideways-scrolling check after its layout adjustment.

Evidence is in the ignored `output/northshore-20/` directory. The 21st review reported no errors or warnings; informational suggestions concern existing styles.

The production build passed. Built-page checks at 1440 and 390 px confirmed the 20-home catalogue, filtering, new listing details, image decoding and updated gallery video playback, with no JavaScript errors or page overflow. The homepage tagline and pause-button removal also passed rotation and reduced-motion checks.

The refreshed portfolio tour in `scripts/service-previews/others-tours-a.mjs` scrolls through the expanded catalogue, opens a new loft, and demonstrates filtering, comparison and payment controls. Its silent MP4 is 960 × 600 at 30 fps, runs 36.40 seconds, and is 4,552,269 bytes. The poster and video use cache version `northshore-20-1`. Recording evidence is in `output/realty-scroll/`.
