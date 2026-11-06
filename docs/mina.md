# MINA — expressive character portfolio

Added as Motion Lab study 11, following the user's November 3 screen recording. The reference's charcoal canvas, oversized silver introduction, centered floating head, minimal navigation, hair-color reaction and expressive face informed this implementation. The character is original generated artwork.

## Open

- Page: `/work/motion/mina.html`
- Gallery: `/work.html#work-ui`, search “Mina”
- Source: `src/work/motion/mina.jsx` and `mina.css`

## Interaction and implementation

React + Motion (`motion/react`, the Framer Motion library) drives the title entrance, floating movement, eye tracking, expression transitions, scroll parallax, section reveals and project hover gestures. The character uses five aligned expression images and an SVG eye-opening mask on a deformable Three.js surface. A 96 × 96 plane mesh stretches continuously around the grabbed cheek, with a smooth local falloff; this is image-based mesh deformation, not a rigged anatomical head. [Motion values](https://motion.dev/docs/react-motion-value) and [useSpring](https://motion.dev/docs/react-use-spring) underpin pointer movement without React renders every frame.

Gently drag either cheek: Mina knits her brows, squints and grimaces while the cheek stretches slightly. Release restores the selected expression and returns the cheek with a restrained spring. Pointer movement is resisted to 42% and the combined displacement is capped at 0.045 of the image width, down from 0.16; the smaller deformation region keeps the reaction local. The angry artwork blends only over the face, preserving Electric hair. Keyboard arrow steps are 0.012 and the quick tug is 0.035. Hover the hair for blue or the nose for a cheeky face. Select Playful for the wink. Clicking/tapping the hair/nose regions or the four visible mood controls selects a persistent expression. The eyes follow the pointer left/right and up/down in “Just me” and “Electric”. The original hazel iris and pupil are sampled as one rigid layer, moving up to 14 horizontal / 6 vertical artwork pixels behind stationary eyelid masks and continuous shaded eye whites. The small upper iris arc normally hidden by the lid is reconstructed from its lower texture when revealed. Direct MotionValues attach gaze to the pointer without spring delay. There is no gaze-image crossfade or portrait stretching; surrounding facial features and hair stay fixed. Pointer leave immediately recenters the eyes. Wink, pout and the angry pull retain their intended eye expressions. The head has no pointer-driven translation or rotation; only its independent idle float remains. The shared pause and reduced-motion controls stop floating, gaze movement and scroll transforms; expressions remain selectable. Cheek dragging still follows deliberate input, with an instant return instead of a spring when motion is paused or reduced. Floating updates suspend offscreen and when the document is hidden. The cheek controls also support arrow-key pulling, key release to return, Escape to reset, and Enter/Space for a quick tug. Pointer capture keeps a drag attached outside the cheek. Pointer cancellation, window blur, visibility changes and resize release the grip. The renderer caps DPR at 1.5, draws on demand, stops while hidden/offscreen and disposes its GPU resources. Static selected-mood artwork is retained on WebGL failure, with cheek handles disabled until graphics recover; gaze is static in that fallback.

Project studies expand their descriptions. Service links preselect the local inquiry topic. Preparing the inquiry reveals a link to the existing LocalNinja contact section; this concept page does not submit or store contact data.

## Assets and generation

Built-in image generation was used. Final optimized assets, all transparent WebP with alpha preserved, are saved at:

- `public/work/motion-lab/mina/neutral.webp`
- `public/work/motion-lab/mina/blue.webp`
- `public/work/motion-lab/mina/wink.webp`
- `public/work/motion-lab/mina/pout.webp`
- `public/work/motion-lab/mina/look-left.webp`
- `public/work/motion-lab/mina/look-right.webp`
- `public/work/motion-lab/mina/angry.webp` (1254 × 1254, 328,442 bytes)

The two left/right gaze images are retained as generation artifacts and no longer loaded. The editable mask is `public/work/motion-lab/mina/eye-openings.svg`; the source raster artwork remains unchanged. Original generated PNG copies are retained locally in ignored `output/mina-originals/`. WebP encoding uses quality 88 and alpha quality 100; no visual retouching was performed outside the image-generation tool. The gallery uses the actual page screenshot at `public/work/motion-lab/mina.png`.

Base prompt:

> Use case: stylized-concept. Asset type: transparent character head cutout for a high-end interactive designer portfolio. Create one beautiful original stylized 3D female adult character floating HEAD ONLY, no neck, no shoulders, no body. Front-facing symmetric head, large warm hazel eyes looking directly at camera, softly sculpted face, subtle confident closed-mouth smile, warm ivory skin with fine realistic texture and soft subsurface scattering, small elegant dangling pearl earrings. Luxurious chestnut-brown shoulder-length butterfly-cut hair, center part, curtain bangs sweeping away from face, finely detailed thick flowing locks curling outward at the bottom. Hair surrounds the head like an elegant silhouette. A premium cinema-3D editorial character, cute but sophisticated, exquisitely rendered hair and eye reflections, not plastic, not flat illustration. Soft bright studio key light from upper left and subtle cool rim, no cast shadow outside the head. Center the full head with ALL hair fully visible and 8% transparent margin, straight-on camera, square canvas. Real transparent alpha background, no ground, no text, no marks, no props. This is a separate original asset, not a webpage screenshot.

Each variant edited the neutral head with this prefix:

> Use case: identity-preserve. Edit target: the supplied transparent original 3D character head.

### blue

> Change ONLY the hair color to rich luminous periwinkle cobalt blue. Preserve realistic hair texture, natural light and dark strands. Preserve the face, skin colors, eyebrows, expression, eyes, earrings, exact head position, hair silhouette, framing, and all other details pixel-aligned as closely as possible. Do NOT tint the skin or earrings. Keep transparent alpha. One head only.

### wink

> Change ONLY the facial expression: a playful wink with her right eye (viewer-left) fully closed and a warm broad open-mouth smile showing a little upper teeth. The other eye looks at camera. Preserve the exact brunette hair, face identity, skin texture, earrings, lighting, head position, hair silhouette, scale and framing. Keep transparent alpha. One head only.

### pout

> Change ONLY the facial expression: a cheeky pursed-lips kiss/pout, with both hazel eyes gently crossed looking toward the tip of her nose, cute and humorous. Preserve the exact brunette hair, face identity, skin texture, earrings, lighting, head position, hair silhouette, scale and framing. Keep transparent alpha. One head only.

### look-left

> Change ONLY the direction of BOTH eyeballs: shift both irises and pupils clearly toward the LEFT SIDE OF THE IMAGE, as if glancing at a cursor on the left. Keep the head perfectly front-facing and unmoved. Both eyes remain normally open. Do not change the smile, face, skin, hair, eyebrows, earrings, lighting, composition, scale, or transparent background. Pixel-align everything except the irises as closely as possible.

### look-right

> Change ONLY the direction of BOTH eyeballs: shift both irises and pupils clearly toward the RIGHT SIDE OF THE IMAGE, as if glancing at a cursor on the right. Keep the head perfectly front-facing and unmoved. Both eyes remain normally open. Do not change the smile, face, skin, hair, eyebrows, earrings, lighting, composition, scale, or transparent background. Pixel-align everything except the irises as closely as possible.

## Validation

Desktop (1440 × 900), tablet (768 × 1024) and mobile (375 × 812) checked in cmux WebKit. No horizontal overflow or broken character images. Verified hair hover, expression selection, eye tracking and the fixed head, pause/resume, initial reduced motion and live preference changes, project expansion, service selection and the real contact destination. Cheek arrow-key input and release are verified in the live browser. Other controls retain native HTML button/link semantics; native Enter/Space click synthesis is not claimed as browser-automated.

The shared gallery contains fifteen Motion Lab studies and ten original Design Lab studies. Mina search and filter integration, valid section anchors, production output and build are checked. No remote publication is included.


## Cheek and eye refinement verification

The original recording's extracted frame 07 shows tightly drawn eyebrows, narrowed eyes, a tense mouth and local cheek displacement. A separate angry render was created from the original neutral asset using the built-in image tool; the earlier kissing/cross-eyed pout remains a separate mood.

Desktop (1440 × 900) and mobile (375 × 812) checks passed in cmux WebKit with live WebGL. Keyboard pulling produced the angry expression and the 0.045 maximum pull; release returned both displacement values to zero and restored the selected Electric mood. The blue hair remained blue throughout. An injected mobile touch drag of more than 300 px stayed within the 0.045 combined limit, with no page overflow. Cancellation returned to neutral immediately; a different pointer ID did not cancel the active grip. Paused arrow input still allowed a deliberate subtle pull and returned immediately. The quick-tug click handler activated anger and restored neutral. Native Enter/Space click synthesis is not claimed as browser-automated.

Injected pointer tests temporarily shim pointer capture because synthetic events do not create a native active pointer. They validate handlers and rendering, not operating-system pointer capture. Mobile touch-action is restricted to the cheek handles.

A forced WebGL context loss during a pull released the grip, restored the static selected-mood portrait and disabled cheek handles. Context restoration returned to the live renderer and reenabled the handles. The final check produced no browser errors.

Live shader checks confirmed left/right gaze weights near 1 at opposite pointer extremes and vertical gaze values near +1 and −1. Pointer leave returned horizontal gaze to zero and vertical gaze toward zero. At all positions the head frame transform remained `none` and its horizontal position stayed exactly 396.5 px; the remaining vertical movement was the independent idle float. Electric tracking worked on both axes, and tracking resumed after the angry pull finished. Screenshots of upper/lower gaze, Electric diagonal gaze and angry desktop/mobile interaction are kept in ignored `output/`.

### Angry expression prompt

Built-in image generation edited `public/work/motion-lab/mina/neutral.webp`. The original generated PNG is retained in `output/mina-originals/angry.png`; its optimized project asset is `public/work/motion-lab/mina/angry.webp`. No image retouching was performed outside the image-generation tool; WebP encoding used quality 88 and alpha quality 100.

> Use case: identity-preserve. Asset type: transparent expression variant for an interactive character head. Edit target: the supplied original transparent Mina head. Change ONLY her facial expression to clearly irritated/angry because someone gently tugged her cheek: eyebrows knit and angled down toward the center with a small crease between them, eyes narrowed almost closed in annoyed squint, nose lightly scrunched, tense slightly open mouth showing a small strip of clenched teeth. The mood is a playful frustrated grimace, not horror, crying, or pain. Keep the face frontal, centered and symmetric; do NOT stretch either cheek in this image because the website will do that dynamically. Preserve exact head identity, chestnut hair strands, hair silhouette, earrings, skin texture, lighting, scale, framing and location, and preserve actual transparent alpha background. Match the original 1280 x 1280 image. Outside the facial expression, make no changes. No hands, extra objects, text, background, neck or body.

## Separate eyeball verification

The final gaze implementation was checked in cmux WebKit at 1440 × 900 and 375 × 812, with enlarged center/left/right/up/down inspection. A GPU framebuffer comparison between opposite horizontal glances found 1,746 changed pixels inside the eye areas and zero outside them. The head frame transform stayed `none`. Electric uses the same hazel eye layer with blue hair preserved; wink and pout disable tracking and retain their original eye expressions. Paused arrow-key cheek pulling showed anger, then restored Electric on release. The mobile scene stayed ready with no horizontal overflow, and the browser reported no errors. The gallery preview was refreshed. Production compilation passed.

## Visibility

On 2026-11-04 the user requested hiding the whole MINA design. It is excluded from Work, homepage Services, and the shared Motion Lab picker/Next navigation. Its Work card is stored in an inert template; the standalone implementation remains available for restoration.
