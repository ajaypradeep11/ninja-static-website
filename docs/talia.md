# AVA — a signal of her own

Renamed from Talia to Ava. Existing route and asset filenames retain the `talia` slug.

A separate character page based on the user's supplied anime portrait. Pale rose-white spiky hair, cyan eyes, cel shading, dark mechanical cheek framing and orange accents carry into the portrait and the warm ink/orange interface. MINA remains a separate page.

## Open and source

- Page: `/work/motion/talia.html`
- Gallery: `/work.html#work-ui`, search “Ava” — Motion Lab study 13
- Page and styles: `src/work/motion/talia.jsx`, `talia.css`
- Character renderer: `src/work/motion/TaliaFaceWarp.jsx`
- Entry: `src/work/motion/talia-entry.jsx`
- Gallery screenshot: `public/work/motion-lab/talia.png`

## Interactions

The eyes follow the cursor horizontally and vertically while the character is in Standby. Direct MotionValues keep the gaze attached to the pointer without spring lag or overshoot. Each iris, pupil and highlight moves as a rigid layer behind fixed eyelids and eye whites. The head has no cursor-driven translation or rotation. Its small independent idle float can be paused. Pointer leave immediately recenters the gaze.

Either cheek can be tugged a little. Pointer movement is resisted to 38% and the combined displacement is capped at 0.032 of the portrait width. AVA becomes angry while pulled, then returns to the selected state on release. Standby, Defiant and Offline are persistent selectable states. Offline uses a newly generated closed-eye portrait, stops gaze and idle float, and disables cheek pulling. Hover does not wake her; selecting Standby or explicitly clicking the hair restores the awake state. The hair region restores Standby and the central face region selects Defiant. Arrow keys pull a focused cheek, key release returns it, Escape resets, and native Enter/Space activation gives a short tug.

The navigation leads to real page sections. Each project expands its description. Service links preselect the contact inquiry topic, and preparing the brief reveals the existing LocalNinja contact link. No submission or remote data storage is implied.

## Implementation and limits

React and Motion (`motion/react`, formerly Framer Motion) handle entrances, expression fades, spring release, idle float and section/project motion. An isolated Three.js renderer deforms a 96 × 96 textured plane around the grabbed cheek. This is a cel-shaded image portrait with local mesh deformation, not an anatomical 3D head or character rig.

Three transparent textures supply the neutral, angry and offline expressions. A small editable SVG, `public/work/motion-lab/talia/eye-openings.svg`, clips two shader-drawn eyeballs behind the original eyelids and the left hair bang. Each cyan iris, dark pupil, and highlight moves together by up to 15 horizontal / 6 vertical artwork pixels. The eye whites and portrait UVs remain fixed. No gaze image crossfade or local image stretching is used. The angry expression blends over the face, retaining the neutral outer hair and collar. Texture mipmaps and trilinear filtering smooth the high-contrast anime lines. Canvas sizing uses untransformed layout dimensions so the entrance animation cannot leave an undersized drawing buffer; rendering uses 1.5–2× resolution.

The renderer draws on demand, stops while hidden/offscreen and disposes resources on unmount. Pointer capture, cancellation, blur, resize and visibility changes release a grip safely. Pause and the shared reduced-motion preference stop idle/gaze/scroll animation; explicit pulling remains available with an instant return. If graphics fail, the selected static portrait remains and cheek controls are disabled until context recovery. Static fallback eyes do not track the cursor.

## Artwork and provenance

The user supplied `/Users/ajaypradeepm/Downloads/Testing/beanie/untitled folder/images.jpeg`. Built-in image generation adapted that reference into a transparent front-facing cel-shaded portrait, then edited the neutral portrait into three aligned variants. No photoreal conversion was used.

Final project assets are all 1254 × 1254 transparent WebP:

- `public/work/motion-lab/talia/offline.webp` — new aligned closed-eye portrait
- `public/work/motion-lab/talia/neutral.webp` — 198,146 bytes
- `public/work/motion-lab/talia/angry.webp` — 194,192 bytes
- `public/work/motion-lab/talia/look-left.webp` — 196,682 bytes
- `public/work/motion-lab/talia/look-right.webp` — 195,842 bytes

Neutral, angry and offline are used at runtime, plus the small SVG eye mask; the two gaze variants are retained as generation artifacts and are no longer loaded by the page. WebP encoding used quality 90 and alpha quality 100; alpha bytes were verified identical to each generated PNG. Awake eyeballs are drawn by the shader and clipped by the authored SVG. Offline blends only the generated eyelid regions, fully covering the awake eyes while retaining the neutral brows, mouth, mechanical frame, hair and collar. The offline texture also supplies the static fallback and the OFFLINE? project card. Original generated PNG copies remain in ignored `output/talia-originals/`.

The exact final neutral and variant prompts, input reference and built-in generation mode are saved in [`public/work/motion-lab/talia/prompts.json`](../public/work/motion-lab/talia/prompts.json).

## Verification

Checked in cmux WebKit at 1440 × 900, 768 × 1024 and 375 × 812. The actual dark page shows clean portrait edges, with no visible colored fringe. The collar clears the interaction hint. No horizontal overflow, missing images or final browser errors were found.

- The ghosting correction was checked at horizontal midpoints (−0.5/+0.5), opposite corners (−1/+1 and +1/−1), and center. Live shader values matched the requested pointer position on the next render and remained unchanged after 120 ms without further movement. Pointer leave reset both axes to zero. The head frame transform remained `none` and its left position stayed fixed. Enlarged captures of intermediate and extreme gaze showed one pupil per eye, with no image crossfade.
- Repeated arrow input stopped at the 0.032 limit, showed anger and returned to zero. Releasing a pull restored either selected Standby or selected Defiant correctly.
- An injected mobile touch drag exceeding 300 px remained at the 0.032 combined limit. Cancellation reset immediately. Paused arrow input still reacted and returned immediately.
- Forced context loss showed the selected static portrait and disabled cheek controls; restoration returned to live graphics and reenabled them.
- Project expansion, section links, service preselection, brief preparation and the real `/#contact` destination worked on mobile.

After replacing the image warp with separate eyeballs, enlarged center/left/right/up/down captures showed rigid iris and pupil movement behind stationary lids. A GPU framebuffer comparison found 3,625 changed pixels inside the eye areas and zero changed pixels outside them. Paused keyboard pulling still showed anger and returned immediately on release; desktop/mobile rendering remained ready, with no horizontal overflow or application errors. The gallery preview was refreshed. The production build passed.

Injected pointer tests used a temporary capture shim because synthetic events cannot create a native active pointer. These checks validate handlers and rendering, not operating-system pointer capture. Native Enter/Space click synthesis is not claimed as browser-automated. The shared reduced-motion path is reused; this page's equivalent paused path was exercised directly.

QA screenshots are retained in ignored `output/talia-*.png`. The gallery preview is an actual 1440 × 900 screenshot, with the shared toolbar temporarily hidden only for capture and then restored. No publication or deployment is included.

## Offline portrait update

The user requested one additional render with closed eyes for Offline. The built-in image generator edited the existing neutral portrait, preserving transparent framing and character identity. The complete edit prompt is in `prompts.json` under `variants.offline`; the generated PNG remains in the generator output directory, and `offline.webp` is the project copy. Offline is an explicit character state, independent of browser network connectivity. The status and interaction hint reflect that she is resting. Reduced motion and Pause retain instant state selection.

Offline validation passed at 1440, 768, 375 and 320 pixels: the new image loads, hover does not wake her, a canvas screenshot remains identical across pointer movement, Standby/Defiant and cheek reactions still work, and graphics context loss/recovery preserves the selected closed-eye fallback. Pause and reduced motion were also checked. Local UI review reported zero errors and zero warnings.
