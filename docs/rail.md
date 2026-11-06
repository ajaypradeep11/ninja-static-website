# RAIL — a spatial clothing archive

Reference: the user-supplied `Screen Recording 2026-11-03 at 8.13.19 PM.mov` (10.48 seconds). The recording shows an atmospheric grey showroom, a chrome clothing rail, side-facing garments that turn towards the viewer, a camera push into a collection, acid-green product labels, and Store / Man / Woman navigation.

RAIL is an original implementation of that interaction and composition. It uses the existing React Motion Lab shell, Motion (`motion/react`) and Three.js. No reference-site assets are copied.

## Route and files

- `/work/motion/rail.html`
- `src/work/motion/rail.jsx`
- `src/work/motion/rail.css`
- `src/work/motion/rail-garments.js` — GLB loading, fabric materials and product viewer
- `src/work/motion/rail-physics.js` — damped springs and shoulder-anchored fabric deformation
- `scripts/rail/build-garments.py` — Blender build launcher
- `scripts/rail/simulate-garments.py` — sewn patterns, cloth simulation and shading bake
- `public/work/motion-lab/rail/{tee,knit,jacket,hoodie}.glb` — four reusable silhouettes
- `src/work/motion/rail-entry.jsx`
- `work/motion/rail.html`
- `public/work/motion-lab/rail.png` — gallery capture, 1440 × 900

## What is implemented

Nine garments use four original Blender-authored GLB silhouettes. Sewn front/back panels are supported at the shoulders, settled with an 80-frame cloth simulation, then shaped to keep empty sleeves open and hoods folded. Thin fabric, relaxed vertical drape, open collars/cuffs, stitched hems and jacket hardware replace the previous inflated parametric shells. Local ambient occlusion is baked into vertex colours; physical fabric materials add restrained sheen and weave. The acid-blue tee uses layered dye clouds, and front/back materials keep lettering off the reverse. The straight chrome rack has rounded corners, soft ground shading, and quieter cast shadows. Non-selected garments turn almost side-on as in the reference recording.

Garments sit closely together along the rail. Moving over one brings it forward to face the camera while its neighbours slide aside to reveal the full silhouette. Hover selection responds immediately to the garment under the pointer, and the turn/slide retargets without waiting for the previous animation. Selecting Man or Woman filters the rail and moves the camera closer, using a Motion spring. Previous/next buttons, labelled garment swatches, and horizontal touch swipes select pieces. Mobile also tracks the selected piece horizontally, with framing that keeps longer garments above the product label. The room returns to the wide collection.

A product panel shows the same 3D garment with accessible Front / Back buttons, plus a description, indicative archive value, a size selector, and a local saved bag. View changes animate when motion is enabled and are immediate when paused. Saved pieces persist in localStorage; removal works from the bag. This is explicitly a fictional collection and there is no checkout or payment. The full edit below the showroom provides a keyboard-accessible index to every piece.

The Motion toolbar pause and system reduced-motion preference stop idle movement and make camera/garment changes immediate. Dialogs trap focus, restore it on close, and close with Escape. The shared Scene lifecycle handles sizing, offscreen/hidden rendering, WebGL failure, and disposal.

## Asset provenance

All geometry and textures are original project assets, generated locally in code. No external models, remote textures, image generation, or copied reference assets are used. The product panel and showroom share the same garment geometry and material definitions.

Regenerate all four files with `python3 scripts/rail/build-garments.py`, or pass `tee`, `knit`, `jacket`, or `hoodie`. The launcher uses the local Blender executable (tested with 5.2.1 LTS). Blender started successfully for this revision; the earlier standalone parametric exporter has been replaced. The shipped files total approximately 6.2 MB, with 50–67k triangles per silhouette. Subdivision and surface reduction run during the build; no cloth simulation runs in the browser. Geometry is shared within a showroom, while product viewers own and dispose their resources independently. Top-origin Blender UVs require runtime texture `flipY = false`.

These are original cloth-simulated garment studies, not photogrammetric scans. The baked pose provides the base mesh; browser springs move each hanger and add restrained fabric bending during interaction. This is not a full browser cloth or collision solver.

## Verification

- JSX parsed with the installed esbuild.
- Local 21st review: zero errors and zero warnings. Catalog search was unavailable because the CLI is not authenticated; implementation reuses the project Scene and Motion runtime.
- Native cmux WebKit at 1440 × 900, 768 × 1024, and 375 × 812: live WebGL ready, no browser errors, no horizontal overflow. Visually inspected room and collection views; corrected heading/rack overlaps and viewport fitting.
- Collection filters show seven Man and five Woman pieces. Hover raycasting selected the Orbit tee, and a synthetic horizontal touch swipe advanced to the Contour tee. Previous/next and individual garment controls were exercised.
- Product inspection, size L, save confirmation, localStorage persistence, bag removal, Escape dismissal, and focus return were exercised. A synthetic Shift+Tab verified focus wrapping to the last dialog button.
- Shared Pause switched `data-motion` off, and selections/filter changes still worked immediately. Motion was restored after checks.
- Final gallery screenshot captured at 1440 × 900 with the toolbar temporarily hidden and then restored.
- Parent performs the integrated production build and gallery checks.

## Garment quality revision — 2026-11-04

- Inspected desktop showroom, tee and jacket product panels, hoodie front/back, and the 375 × 812 showroom and product panel in the cmux WebKit browser.
- All nine product viewers loaded their GLBs and switched to Back successfully; closing all viewers left only the showroom canvas.
- Man / Woman filters retained 7 / 5 pieces. A touch pointer tap on the new jacket mesh opened the matching product panel.
- Mobile had no horizontal page overflow. Size L save, localStorage entry, bag removal, Escape dismissal and focus return passed.
- Paused motion retained immediate selection, camera and product-view changes. Browser errors: none.
- 21st review of the three runtime files: zero errors and zero warnings (informational palette suggestions only).
- Production build passed; the existing shared Three.js chunk-size advisory remains.
- Work and Services RAIL previews refreshed to show the new geometry.

## Cloth revision — 2026-11-04

The user rejected the first refinement as still looking artificial. Revisited the original recording at 1, 5 and 8 seconds, rebuilt the assets using Blender, reduced inflated volume, shaped relaxed sleeves and folded hoods, and replaced stamped botanical shapes with a dye texture. Palette and lighting now give fabric more depth. The original page navigation, collection filters, saved bag and panel accessibility remain in place.

Desktop and 375 × 812 visual review covered the showroom and actual product viewers. All nine assets loaded, all Back controls worked, Man/Woman counts remained 7/5, and closing the viewers left one showroom canvas. Browser errors were empty. Work and Services captures were regenerated after the revision.

Final cloth revision checks: touch raycasting opened the matching Contour tee panel; size L save, removal and focus restoration passed. Production build passed, with the existing shared Three.js chunk-size advisory. 21st review reported zero errors and warnings.

## Compact rail and hover reveal — 2026-11-04

Reduced garment spacing from 1.13 to 0.62 scene units. Selected pieces move forward 1.7 units and face the actual camera; neighbouring pieces move outward 0.78 units to leave clear space. Hover uses the visible garment meshes, with a 75 ms dwell and 180 ms transition lock. Pointer leave, cancellation and disposal clear pending selection. Phone framing keeps the revealed hoodie clear of the title and label in both room and collection views.

Verified hover selection across all nine pieces, including deliberate selection of the Contour tee and Circuit jersey, and checked that small pointer movements on the selected tee did not switch selection. Inspected desktop at 1440 × 900 and mobile at 375 × 812 and 375 × 760. Paused selection, touch inspection, swipe navigation and 7/5 collection filters passed; mobile had no horizontal overflow. Work and Services previews were refreshed.

## Hanger fit — 2026-11-04

The original hanger triangle was entirely above the garment. Reshaped and widened the support arms to follow the GLB shoulder seams inside the fabric, reduced their thickness, shortened the hook, and raised the cloth to seat its neckline around the stem. Both remain children of the same group, preserving their alignment during selection and rotation.

Visually inspected tee, knit, jacket and hoodie in the desktop showroom, including side-facing neighbours, plus the hoodie in the mobile collection at 375 × 760. The mobile garment clears its label and the page has no horizontal overflow. Work and Services previews were refreshed.

## Immediate hover — 2026-11-04

Removed the 75 ms hover dwell and 180 ms transition lock at the user’s request. Selection now changes on the pointer event, even during an unfinished turn. Garment easing uses a faster response (20 rather than 8), while camera easing stays unchanged; the product label transition is 100 ms. Paused/reduced-motion changes remain immediate.

A rapid left-to-right and reverse pointer sweep selected all nine pieces across the two passes, with observed selection updates by the next sampled frame (19–26 ms). Small movements within the revealed hoodie retained its selection. Paused selection worked, and browser errors were empty.

## Dark showroom and hover physics — 2026-11-04

Changed the showroom to near-black at the top fading into charcoal grey below. Navigation, archive index, footer, bag and product panels share the dark palette with off-white text and lime controls. The final user-selected garment palette uses clear red in place of orange, deep blue in place of sky blue, parrot green in place of muted green, and black hoodies. Product descriptions and swatches match those colours. Warm key lighting, cool rim lighting and a soft spotlight following the selected piece keep the fabric visible against the darker room. Product viewers use matching studio lighting. Work and Services previews reflect the new direction.

Garment translation and turning now use damped springs with immediate retargeting. Hanger sway responds to lateral movement; lower fabric and sleeves lag behind movement and settle with bounded bending and twisting. Pointer travel adds a small fabric impulse. GPU deformation fixes the upper shoulder region, adjusts normals and cast shadows, and shares the mesh across colourways. Custom shadow materials are disposed on unmount. Pausing or requesting reduced motion snaps positions to their targets and clears all spring velocities and fabric offsets.

Verified spring settling at 30/60/120 fps (approximately 3.5% overshoot), rapid retargeting stability, and velocity reset. Native cmux browser checks covered desktop 1440 × 900, mobile 375 × 812, rapid hover changes, touch swipe, 7/5 Man/Woman filters, product Front/Back, Escape/focus restoration, and pause. Both viewports had no horizontal overflow; live WebGL and garment loading remained ready with no browser errors.

The final production build passed, with the existing shared Three.js chunk-size advisory. 21st review of the four runtime files reported zero errors and zero warnings (informational palette suggestions only). Gallery previews were recaptured after the final colour selection.

## Sleeve reference and side profile — 2026-11-04

Rebuilt all four Blender assets from the user's sleeve reference. Short sleeves angle downward with open ends; longer sleeves hang closer to the body. After the user rejected a tubular side profile, reduced sleeve depth, softened the openings into pinched ovals, removed the contrasting tee cuff band, reduced stitching to a fine single seam, and added modest torso depth. Resting garments now turn about 71 degrees from their own camera-facing direction, keeping garments at both rail ends from appearing edge-on. The selected palette, hanger fit and hover springs remain intact. Asset URLs use `sleeves-v4` to refresh cached meshes.

Verified all four silhouettes in front/back product views, the showroom side profiles, desktop 1440 × 900 and mobile 375 × 812. Hover, pause, cleanup to one canvas, and horizontal overflow checks passed; browser errors were empty. Mesh bounds were finite with no stray geometry, at 50,816–67,748 triangles per silhouette. Production build passed with the existing shared Three.js size advisory; 21st review had zero errors and warnings. Work and Services previews were refreshed.

## Long-sleeve side profiles — 2026-11-04

Compared the jacket, knit and hoodie directly in Blender through MCP against the user's new still reference. Rebuilt those three GLBs with gently forward-hanging sleeves, shallow elbow folds and tapered ribbed cuffs. The hood crown now folds toward the back of the neckline. Long-sleeve pieces rest at about 82 degrees to the camera so their sleeves overlap in profile; tees retain their geometry and resting angle. The loader uses `long-sleeves-v5` to refresh cached meshes.

Verified the final meshes in Blender and the browser from the side, front and back. All coordinates were finite. The existing browser checks passed at 1440 × 900 and 375 × 812, including all four silhouettes, hover, pause, canvas cleanup and no horizontal overflow or browser errors. Production build passed with the existing Three.js chunk-size advisory. Work and Services previews were refreshed.
