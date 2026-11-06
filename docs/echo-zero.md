# ECHO ZERO — character orbit study

The composition is inspired by the user-provided `Screen Recording 2026-11-03 at 8.19.31 PM.mov` (7.65 seconds, 728 × 404): a pale game menu, a crouching female character, navigation on the left, profile information on the right, and drag rotation. The production character model replaces the first procedural prototype, which was rejected for insufficient visual quality.

## Open

- Page: `/work/motion/echo-zero.html`
- Gallery: `/work.html#work-ui`, search “Echo”
- Source: `src/work/motion/echo-zero.jsx` and `echo-zero.css`
- Entry: `src/work/motion/echo-zero-entry.jsx`
- Actual gallery screenshot: `public/work/motion-lab/echo-zero.png` (1440 × 900)

## Controls

Drag with a mouse or touch to orbit through a full 360 degrees. Vertical orbit is limited; wheel zoom and panning are disabled. The left and right buttons turn the camera in 30-degree steps. Focus the viewer and use the arrow keys for smaller steps; Home or Reset View restores the initial camera and stops automatic rotation.

Continue selects the inspection panel and its active status. Character offers Obsidian, Pebble and Signal wardrobe finishes, changing the top and tinting the denim while preserving skin, hair and footwear. Field Notes opens the character's short dossier. Settings controls automatic orbit and camera reset. Header buttons select the corresponding panels. This is a character study, not a playable game or a saved session. No visitor settings or data are persisted.

The shared Motion Lab toolbar pauses automatic rotation and menu animation. System reduced motion uses the same context. Deliberate drag, buttons, keyboard rotation, wardrobe choices and panels remain usable; orbit damping is disabled while motion is paused. The character holds a fixed pose and does not have idle body animation.

## Character source and license

The character is **Rain by Blender Studio**, a professionally authored stylized character, licensed under [Creative Commons Attribution 4.0](https://creativecommons.org/licenses/by/4.0/). The source is the official [Rain v3 download page](https://studio.blender.org/characters/rain/v3/). The downloaded archive is named `rain-v33.zip` and contains `Rain v3.3/rain_v3.2.blend`.

Required credit: **Rain Rig (CC) Blender Foundation | studio.blender.org**. It appears on the page and in `public/work/motion-lab/echo-zero/ATTRIBUTION.txt`, the GLB's embedded copyright, and `model-info.json`. The underlying sculpt, topology, rig, hair, clothes and original textures are Blender Studio's work. Our changes are the crouched pose, gaze, relaxed hands, gravity-curved ponytail, charcoal wardrobe, texture preparation, web materials and viewer integration.

No model or artwork was extracted from the reference recording or the reference website. The static fallback poster is rendered from the same licensed adapted Rain model. The local Draco decoder comes from the installed Three.js distribution and includes its Apache 2.0 license.

## Implementation

React and Motion (`motion/react`) animate menu selection and panel transitions. The shared `runtime.jsx` supplies motion preferences and collection navigation. The shared `Scene.jsx` supplies Three.js setup, resize handling, a device-pixel ratio capped at 1.5, hidden-tab/offscreen suspension, resource disposal and WebGL context recovery.

Blender 5.2.1 prepares the production asset. Its existing rig is posed into a low crouch with coherent knees, ankles, elbows and hands. The chin and eye target face forward. Four authored ponytail controls produce a downward curve. The rig's evaluated meshes retain the detailed face, shaped hair, clothing seams, shoe details and continuous anatomy. Bundled scripts in the downloaded Blender file are not executed (`--disable-autoexec`).

Color maps are baked into portable textures, up to 2048 pixels for the head/body and 1024 for the main clothing/hair. Explicit dark pupil-cap materials replace Blender-specific shader attributes that otherwise exported as white pupils. The exported static GLB contains 15 authored meshes, 16 materials, and 543,882 triangles; Draco compression and JPEG maps bring the transfer size to approximately 2.5 MB. This is detailed geometry with compressed transfer, not a low-poly model. The rig and animation data are not shipped. Reproduction commands and scripts are in `scripts/echo-zero/`.

GLTFLoader and a locally hosted Draco decoder load the asset without third-party runtime requests. OrbitControls provides genuine 360-degree camera movement. Matte fabric, textured skin, restrained eye highlights, studio lighting, a soft contact shadow and a faint cast shadow complete the scene. The loader disposes assets arriving after unmount; attached geometries, textures and materials use the shared scene cleanup. A transparent Blender-rendered poster and a reload message remain visible if model loading or WebGL fails.

## Verification and limits

The authored model has been visually inspected in Blender and in the live cmux WebKit page from the front, side and rear. This review caught and corrected white pupil caps, overly bright eye reflections, excessive shadow strength, and the ponytail's rigid rest pose. The replacement character loaded successfully at 1440 × 900, 768 × 1024 and 375 × 812 with no horizontal overflow or normal-load browser errors. Its Signal wardrobe was checked on the phone layout; native arrow-key/Home rotation and reset were rechecked on desktop. The initial interface verification also covered menu panels, automatic orbit, shared pause behavior, and mobile panel spacing. The profile rule was shortened so it does not cross the adjacent mobile panel heading.

A separate temporary browser surface deliberately rejected only the GLB fetch. The resulting model-failure path retained the rendered poster, visible reload guidance, and an accessible static-preview label. This check exposed a fast-failure race with the shared scene readiness attribute; the page now uses its own model-failure attribute for fallback presentation. The temporary test surface was closed afterward. The gallery preview was recaptured from the final live page with the toolbar hidden temporarily using an inline style, then restored.

The final local 21st review reported zero errors, zero warnings and 32 advisory suggestions. A direct whitespace scan of the page, entry and documentation found no trailing whitespace. The final GLB was also parsed to confirm its Draco requirement, embedded copyright, 15 meshes and 16 materials.

Drag handling was exercised using injected PointerEvents with temporary pointer-capture shims, because synthetic events cannot establish native active pointer capture. That checks the event path and camera result, not operating-system touch behavior. A real mobile device's GPU performance and a system-level reduced-motion toggle were not independently measured. The page consumes the shared reduced-motion context whose pause path was checked. Production compilation and collection integration are handled by the parent task. No deployment is included.

Rain is a polished **stylized** character, not the reference's photorealistic cyberpunk woman. It does not reproduce the reference's identity, tattoos, mechanical arm or exact clothing. The browser asset is a fixed posed mesh with real orbit; it has no exported skeleton, facial deformation, cheek interaction, motion capture or character animation.
