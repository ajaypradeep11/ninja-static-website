# Homepage project previews

All eight homepage service galleries reuse available silent H.264 MP4 loops under `public/work/service-previews/motion/`. `src/service-preview-catalog.js` maps the 39 recorded projects to one poster/video pair and cache version each. A project uses those same URLs everywhere it appears, including AI & Voice Bots, Custom Software, IT Consulting and Maintenance & Support. Each gallery has its own Play/Pause control. MINA and ECHO ZERO remain hidden. The clinic voice-assistant panel and standalone store chatbot have no recording and retain their still previews.

Add a recording to the shared catalog only after its matching MP4 and WebP exist. Keep any revised cache version in that one catalog; do not add service-tab-specific media rules. Work remains the source for titles, links and categories, with duplicate destinations removed within each gallery. Project membership in more than one relevant service is intentional.

Conversy AI's marketing preview records the entire public homepage at https://conversyai.com/: hero, scroll animations, features, testimonials, FAQs and footer. It scrolls down for 30 seconds, holds briefly at each end, then crossfades back to the opening. The 960 × 600 MP4 plays at 30 fps for about 33 seconds and is approximately 2.2 MB. It uses actual browser frames captured at approximately 60 fps, rather than increasing the frame rate of the old 15 fps WebP. The eased crossfade joins the next frame of the opening footage for a continuous loop.

The same capture method is used for ajaypradeep.com, NinjaLearn and NinjaCommerce. The storefront scrolls from its homepage hero through the footer. Ajay's preview starts on About, briefly scrolls the introduction and work experience, clicks Design, opens Crimson Lancer, then scrolls its renders and wireframes. NinjaLearn starts at the System Design grid's Classic Designs cards, clicks Chat System, and demonstrates simulated message delivery, disconnection and reconnection. Neither of these two tours includes homepage footage. `detail-tours.mjs` drives their actual page controls. Captures warm images and export at 960 × 600 and 30 fps.

The remaining three Web Development clips stay at 768 × 480 and 15 fps, using the product screenshots already published in this portfolio. No ThreeUI source or media is used.

`motion-tours.mjs` records the first five local designs through their real controls: AVA's gaze, cheek pull, offline expression and project disclosure; RAIL's garments, front/back viewer and collection filter; OUTFORM's palettes and project tabs; BLOOMFIELD's lighting and petal openness; RIBBON's carousel and project notes. Each tour also scrolls through the page. Capture hides only the shared portfolio navigation overlay, preserving each design's interface. Matching still posters use the opening frame. Animated UI cards retain the recording's 1.6 aspect ratio so controls are not cropped.

The remaining tours are grouped in three modules. All use actual page controls, contain deliberate reading pauses, and end at the footer or an open detail view before crossfading to the opening:

| Module | Designs | Highlighted interactions |
| --- | --- | --- |
| `more-motion-tours.mjs` | HELIOS, PRISM, SHELF, ORBITAL, TOTEM, AXIOM, SYNAPSE, Pocket Cities (`softspot`), Ninja (`akai`) | Atmospheres, finishes, reading list, project disclosures, creature editions, tension, local thought exercise, city details, story chapters and katana elements |
| `design-tours-a.mjs` | Acidwave, Y2K Futurism, K-Design, Dreamscape, Halftone | Session filters, player and finish controls, product details, world selection, stories and editions |
| `design-tours-b.mjs` | Hyperbloom, Neo-brutalism, Neo-Swiss, Synthwave, Vector Surrealism | Palettes, event filters, membership preview, project dialogs and station moods |

The UI gallery follows the visible Work catalog automatically, with one preview per design. New catalog designs therefore need a matching MP4 and still poster before being added.

To regenerate an individual live recording, install Playwright, Chrome and ffmpeg (plus Python/Pillow for tour posters), then run the corresponding command:

```sh
node scripts/service-previews/capture-scroll.mjs conversy-site
node scripts/service-previews/capture-scroll.mjs ajay-portfolio
node scripts/service-previews/capture-scroll.mjs ninja-learn
node scripts/service-previews/capture-scroll.mjs ninja-commerce
node scripts/service-previews/capture-scroll.mjs talia
node scripts/service-previews/capture-scroll.mjs rail
node scripts/service-previews/capture-scroll.mjs outform
node scripts/service-previews/capture-scroll.mjs bloomfield
node scripts/service-previews/capture-scroll.mjs ribbon
# The same command supports every visible Motion Lab / Design Lab slug:
node scripts/service-previews/capture-scroll.mjs orbital
node scripts/service-previews/capture-scroll.mjs neo-swiss
```

The script waits for images/fonts, captures the browser compositor, verifies the final view and source frame pacing, and encodes the selected project's MP4. Timestamped frames, scene screenshots and capture metrics are saved under ignored `output/<slug>-scroll/` (Conversy retains `output/conversy-scroll/`). Static views receive their full hold even when the browser stops emitting changed frames. Interaction tours check median capture cadence because their intentional still holds reduce the average source frame rate. Still WebP posters are refreshed from the opening design frame, About view or active Chat System simulation, as appropriate. The storefront's timed newsletter modal is dismissed if it appears; no form is submitted. Uneven or obscured recordings do not replace the published file. `capture-conversy-scroll.mjs` remains a compatible entry point for Conversy.

The optional `build-conversy-webp.py` script can recreate the previous WebP experiment with Pillow and ffmpeg. The homepage uses only the MP4; it never requests the animated WebP.

To regenerate the other three screenshot clips, install Pillow and ffmpeg:

```sh
python3 scripts/service-previews/build.py
```

`PLAYWRIGHT_MODULE` may point to an existing Playwright module. The recorder uses installed Chrome. Local design captures default to `http://localhost:5174`; set `PREVIEW_BASE_URL` to use another server, such as a production preview. Capture designs sequentially to avoid GPU contention. Storyboards and encoding settings are in `build.py`; it only rebuilds the three screenshot clips and preserves all live recordings. `capture-sites.mjs` is retained only for the earlier screenshot experiment.

`src/service-previews.js` controls playback. Videos receive a source only when their card is visible in its active service tab. They pause when scrolled out of view, when switching tabs, or when the browser tab is hidden. Each gallery's Play/Pause button pauses and resumes at the current frame. Reduced motion and data saver start with still previews; visitors can explicitly choose Play. Failed media and blocked autoplay leave the existing still images and project links usable.

The original eight-clip verification covered lazy loading, pause/resume, offscreen playback, rapid tab changes, reduced motion, data saver, rejected autoplay, failed video requests, unchanged destinations and desktop/mobile overflow. The production build and deterministic 21st review passed; the build retains the existing shared Three.js chunk-size advisory.

The current Conversy export was captured at 59.86 fps and encoded at 30 fps: 32.767 seconds, 2,222,851 bytes, no audio. A scrolling feature section contains 30 distinct frames per second. A six-second desktop browser sample presented 181 frames at 30 fps with zero dropped frames. The production build, mobile playback, loop restart, pause/resume, offscreen/tab pausing, reduced motion, data saver and blocked-autoplay fallback passed.

The November 5 additions use the same silent 960 × 600, 30 fps export:

| Preview | Source average fps | Duration | File size |
| --- | ---: | ---: | ---: |
| ajaypradeep.com (About + Design) | 53.32 | 21.200 s | 1,389,310 bytes |
| NinjaLearn (Chat System) | 46.92 | 19.267 s | 267,557 bytes |
| NinjaCommerce | 60.00 | 25.267 s | 3,862,252 bytes |

The two revised tours have a median capture interval of 16.67 ms; their source averages include intentional still holds. Original gallery checks covered independent controls, offscreen/tab pausing, lazy loading, reduced motion, data saver, failed-media fallback, links and horizontal overflow. The revised clips are verified separately on desktop and at 375 px, including new cache versions, matching posters, pause/resume and loop restart. Asset checks confirm the scene URLs are detail pages and all other media, including Conversy and NinjaCommerce, are unchanged. Reports and screenshots for the revised tours are in ignored `output/detail-preview/` and `output/<slug>-scroll/`.

Both revised clips presented 30 fps with zero dropped frames in desktop and mobile browser samples, measured using `requestVideoFrameCallback`'s `presentedFrames` counter (JavaScript callbacks can miss a presentation even when the video does not drop a frame). Ajay's scrolling footage also contains 60 distinct decoded frames in a two-second sample. The production build and browser checks passed with no page errors.

The initial five UI / UX tours use silent 960 × 600, 30 fps exports with a median source capture interval of 16.67 ms:

| Preview | Duration | File size |
| --- | ---: | ---: |
| TALIA | 19.567 s | 1,267,361 bytes |
| RAIL | 21.933 s | 804,700 bytes |
| OUTFORM | 18.733 s | 1,046,047 bytes |
| BLOOMFIELD | 15.767 s | 707,392 bytes |
| RIBBON | 16.100 s | 723,333 bytes |

RAIL finishes in its garment detail view and crossfades back to the opening after touring the archive. This avoids recording the focus-restoration scroll when closing the dialog. All five clips were checked in the production gallery at 1440 px and 375 px, including full-frame aspect ratio, links, loop restart, pause/resume, offscreen and tab pausing, independent gallery controls, reduced motion, data saver and failed-media fallback. Existing Web Development and E-commerce clips retain their file checksums, and no GLB assets are loaded on the homepage. Capture reports, contact sheets and browser results are under ignored `output/design-previews/` and `output/<slug>-scroll/`.

The full UI / UX set now contains 24 interaction previews. The 19 additional clips are 15.567–25.067 seconds and 0.44–3.67 MB each (20.48 MB combined); the entire UI preview set is 25.02 MB on disk. Every clip is silent H.264 at 960 × 600 and 30 fps, with a 16.67 ms median source frame interval. All encoded contact sheets and detail frames passed visual review. AKAI’s opening chapter control uses its native smooth-scroll ramp; the two larger scroll deltas are continuous motion, not a snap. Loop boundary frame differences were checked for all 24 exports, and every preexisting video/animated asset retains its checksum.

All 24 clips passed production-gallery checks at 1440 × 900 and 375 × 812: 48 playback samples presented 30 fps, with 0–1 dropped frames per two-second sample. Checks also cover matching posters, full-frame aspect ratio, project destinations, loop restart, pause/resume, offscreen and inactive-gallery pausing, independent controls, reduced motion, data saver, failed-media fallback, hidden-design exclusion, unchanged Web/E-commerce counts and no homepage GLB requests. The production build passed with the existing shared Three.js chunk-size advisory. Rehearsal/visual-review reports are in `output/design-tours-a/`, `output/design-tours-b/` and `output/more-motion-tours/`; consolidated capture, asset and browser evidence is in ignored `output/all-design-previews/`.


The Others gallery records Conversy App, NinjaHR, Maple Clinic, Ember & Oak, Northshore Realty, Pulse, Rideau Motorworks and Copper & Coil. `others-gallery-tours.mjs` scrolls the local Conversy/NinjaHR screenshot showcases and opens their real lightboxes. Those two 30 fps clips also replace their earlier Web Development storyboards. `others-tours-a.mjs` drives clinic, restaurant and realty controls; `others-tours-b.mjs` drives dashboard, dealer and trades controls. Each stops before external submissions or booking confirmations. The restaurant recording uses a fixed dinner-service clock for a sensible pickup estimate; animation and timers run normally.

These eight project pages permanently omit the shared LocalNinja top bar, retaining their own navigation and footer links. `body[data-project-standalone]` sets `--ln-bar-h: 0px`, keeping sticky controls, drawers and full-height layouts aligned with the viewport. The native sample form colors remain unchanged in both Studio themes. Captures omit floating assistant widgets so they do not cover the product UI; the widgets remain unchanged on the actual pages. Others owns an independent Play/Pause control, lazy media loading and the same preference/fallback behavior as the existing galleries. Shared project cards use the updated poster/video cache version.

```sh
node scripts/service-previews/capture-scroll.mjs clinic
node scripts/service-previews/capture-scroll.mjs conversy-app
# Also supports restaurant, realty, dashboard, dealer, trades and ninja-hr.
```

The eight Others exports are 19.47–26.40 seconds, 0.60–1.87 MB each (8.21 MB combined), silent H.264 at 960 × 600 and 30 fps. All have matching opening posters and a 16.67 ms median source frame interval. The final Dealer tour explicitly reveals its next-step button through a smooth scroll, avoiding click-driven automatic scrolling. Clinic’s native shorter review panel clamps the page position as it changes steps; this was reviewed as a normal layout transition.

All eight actual destination pages passed header/offset/no-overflow checks at 1440 × 900 and 375 × 812. All 16 gallery playback samples presented 30 fps with 0–1 dropped frames per two-second sample. Production checks also cover pause/resume, loop restart, lazy loading, active/offscreen tabs, independent controls, reduced motion, data saver, failed-media posters, unchanged project URLs and the existing gallery counts. The production build and 21st review passed (11 reviewed files, no findings); 67 unrelated preview assets retain their checksums. Evidence is in ignored `output/others-previews/` and `output/<slug>-scroll/`.

## Shared previews across services

The November 5 reuse fix removes service-specific animation eligibility. The 39 recorded projects now share canonical media across all eight galleries. AI & Voice Bots plays 10 of its 12 cards; Custom Software plays all 7; Consulting all 3; Support all 8. The remaining two bot cards have no recorded MP4. Every gallery remains unique by project destination.

Production browser checks passed at 1440 and 375 pixels: all 28 newly enabled card instances play, repeated project poster/video URLs match, all thumbnails decode, and Conversy marketing/App reuse their existing recordings. Verification also covers independent pause controls, rapid tab switching, offscreen/inactive pausing, reduced motion, data saver, blocked autoplay, failed media, no duplicate cards, and no page errors or horizontal overflow. The production build passed; local UI review reported no findings.

### Ninja, Ava and Pocket Cities name refresh

The katana theme is Ninja, the character portfolio is Ava, and the city carousel is Pocket Cities. Existing `akai`, `talia` and `softspot` routes and asset names remain stable. All three opening screenshots, WebP posters and 30 fps MP4 tours were regenerated with the new names; their shared cache version is `theme-names-1`. Ninja runs 24.87 seconds, Ava runs 19.70 seconds and Pocket Cities runs 15.60 seconds.
