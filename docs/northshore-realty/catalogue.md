# Northshore Realty — 20-home catalogue

The sample property catalogue now includes 20 homes: five condos, five townhouses, five detached homes and five lofts. The original four listings remain, with 16 additional homes across Kitsilano, Burnaby Heights, North Vancouver and Gastown.

`src/work/realty-homes.js` supplies the listing cards, detail sheets, map markers, saved-home comparisons and agent desk. Each home has its own price, description, specifications, photograph and illustrative coordinates. Filtering and sorting operate on all 20 homes.

## Map

`src/work/realty-map.js` and `realty-map.css` replace the schematic grid with a Vancouver street map. Nearby homes cluster into count markers; zooming reveals individual prices. Each price opens a photo, address and specifications, with a button to the existing property detail sheet. The neighbourhood buttons focus Kitsilano, Gastown, North Vancouver or Burnaby Heights and expose the existing neighbourhood guide. Reset returns to all matching homes.

The map shares the listing filters, including empty states and agent offer flags. Card hover highlights the matching marker or cluster. Desktop keeps the map beside the listings; phones have a List/Map switch above the results. Using the map minimizes the assistant so it does not cover the controls. Keyboard controls, visible focus and reduced-motion behaviour are preserved.

Narrow phones use compact count circles to prevent neighbouring clusters from overlapping. Desktop retains the labelled cluster pills. The built site passed the same map checks at 1440, 390 and 320 px, including marker overlap checks, offer flags and card highlighting. The 17 pages affected by the decorative-asterisk removal also passed production checks at 1440 and 390 px with no JavaScript errors or page overflow.

The sample coordinates are approximate, not geocoded property addresses. [Leaflet 1.9.4](https://leafletjs.com/reference-1.9.4.html) and [Leaflet.markercluster 1.5.3](https://github.com/Leaflet/Leaflet.markercluster/tree/v1.5.3) render the map. Standard OpenStreetMap tiles load over HTTPS with visible attribution and normal browser caching, following the [tile usage policy](https://operations.osmfoundation.org/policies/tiles/). The map needs an internet connection for streets; if tiles fail, the markers and listing catalogue remain usable. No geocoding or location permission is requested.

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

The original catalogue checks at 1440, 390 and 320 px verified all 20 cards, photos and detail sheets; five results for every property type; price/bedroom/bathroom filters; sorting; saved-home comparison; mortgage controls; viewing selection; and agent listing updates. No bookings were submitted. There were no JavaScript errors, broken property images or page overflow.

The November 6 map revision was checked at 1440, 390 and 320 px for all 20 represented homes, filter synchronization, empty/reset states, keyboard-opened marker popups, property details, neighbourhood guides, and mobile List/Map switching. Automated interaction checks stub map tiles to avoid repeatedly requesting live tiles. A normal browser inspection verified actual street tiles on desktop and mobile; a separate failed-tile check verified the fallback message. Evidence is in `output/map-emoji/`. The 21st map review reported no errors or warnings.

Evidence is in the ignored `output/northshore-20/` directory. The 21st review reported no errors or warnings; informational suggestions concern existing styles.

The production build passed. Built-page checks at 1440 and 390 px confirmed the 20-home catalogue, filtering, new listing details, image decoding and updated gallery video playback, with no JavaScript errors or page overflow. The homepage tagline and pause-button removal also passed rotation and reduced-motion checks.

The portfolio tour in `scripts/service-previews/others-tours-a.mjs` scrolls through the expanded catalogue, opens a new loft, and demonstrates filtering, comparison and payment controls. Capture waits for the street map before recording. Its silent MP4 is 960 × 600 at 30 fps and runs 36.53 seconds. The refreshed poster and video use cache version `northshore-map-1`. Recording evidence is in `output/realty-scroll/`.
