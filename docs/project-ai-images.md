# Project AI image upgrades

Generated on 2026-11-05 using the built-in image generation tool, with one independent image per subject. Originals remain in the tool output directories; the website uses optimized responsive WebP files saved in this workspace.

| Project | Images | Delivered assets | Prompt set |
| --- | ---: | --- | --- |
| Ember & Oak | 15 dishes, including two specials | [Restaurant menu images](../public/work/restaurant/menu/) — 30 WebPs, 1,708,828 bytes | [Final prompts](ember-oak/image-prompts.md) |
| Northshore Realty | 20 distinct property listings | [Property images](../public/work/realty/) — 40 WebPs, 3,852,494 bytes | [Catalogue and all prompt sets](northshore-realty/catalogue.md) |
| Copper & Coil | 1 furnace-service hero photograph | [Service photograph](../public/work/trades/) — 2 WebPs, 105,854 bytes | [Final prompt](copper-coil/image-prompts.md) |

The 36 images have 72 responsive delivery files totaling 5,667,176 bytes. Menu/property detail and thumbnail views reuse the corresponding photo. Copper & Coil retains icons and text for its functional booking controls.

The imagery is illustrative content for the existing fictional sample projects. In particular, Northshore's property concepts are matched to listing descriptions, not photographs of the named street addresses.

Each project passed desktop and phone checks for image loading, matching details, existing interactions and horizontal overflow. Verification evidence is in the ignored `output/ember-oak/`, `output/northshore-images-qa/`, `output/copper-coil/` and `output/ai-project-images/` directories.

Their portfolio posters and silent 960 × 600, 30 fps MP4 loops were refreshed. `src/service-preview-catalog.js` uses cache version `ai-images-1` for restaurant and trades, and `northshore-map-1` for the realty tour with its updated street map, so every service category shows the same updated recording. Restaurant runs 23.83 seconds and trades 24.63 seconds; Northshore was recorded again after the map update. The tours exercise the pages without submitting orders, reservations or bookings. The initial three-project refresh verified that all 77 unrelated preview files retained their original checksums; the subsequent catalogue expansion regenerated only Northshore's preview pair.

Final production build passed. Built-page checks at 1440 and 390 px confirm generated images decode, pages have no horizontal overflow or JavaScript errors, and all three refreshed previews play using the new cache version. The 21st review reported no errors or warnings; its informational suggestions reflect the existing project styles.
