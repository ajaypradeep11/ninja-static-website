# Motion Lab — Vol.02

Sixteen interactive studies added to Work → UI / UX. These extend the existing ten Vol.01 designs. The public MotionSites previews informed composition and interaction; no MotionSites template source or reference artwork is bundled. TALIA adapts a portrait supplied by the user, and ECHO ZERO includes an attributed Blender Studio character.

| Page | Reference reviewed | Original direction / interaction |
| --- | --- | --- |
| OUTFORM | [Sparkform](https://motionsites.ai/?prompt=sparkform) | Orange character-led studio, oversized stacked type, scroll layering, color palettes and project worlds. |
| HELIOS | [Solar Fog](https://motionsites.ai/?prompt=lumen-roof-hero) | Extends atmospheric day/night switching into a solar observatory with a procedural sun, eclipse and optional synthesized audio. |
| PRISM | [Facet Glass](https://motionsites.ai/?prompt=facet-glass-hero) | Editorial glass atelier with finish selection and separated components. |
| BLOOMFIELD | [Flower Valley](https://motionsites.ai/?prompt=fernhollow) | Sculptural garden with lighting presets and opening petals. |
| RIBBON | [Video Ribbon](https://motionsites.ai/?prompt=vante-ribbon-hero) | Curved spatial portfolio with original generated canvas artwork and project navigation. |
| SHELF LIFE | [Shelf Hero](https://motionsites.ai/?prompt=vasari-vhs-hero) | Physical book archive with original covers, filters and selected-book movement. |
| ORBITAL | [3D Portfolio](https://motionsites.ai/?prompt=3d-jack-portfolio-hero) | Extends a dimensional portfolio into a powder-blue mobile of sculptural objects and project worlds. |
| TOTEM | [3D Collectible Hero](https://motionsites.ai/?prompt=3d-collectible-hero) | Original procedural collectible character with appearance controls. |
| AXIOM | [AXON](https://motionsites.ai/?prompt=axon) | Spatial research interface and interactive geometry study. |
| SYNAPSE | [Mind AI](https://motionsites.ai/?prompt=mind-ai) | Original thought interface with responsive particle forms. |

Four more studies were added from the user’s recordings: [MINA](mina.md), with shader-deformed cheeks and original character artwork; [SOFT SPOT](softspot.md), a three-character carousel; [RAIL](rail.md), an interactive clothing rack; and [ECHO ZERO](echo-zero.md), a character orbit interface. Each keeps the reference’s main interaction within an original implementation. [TALIA](talia.md) adds a fifth character study based on the user’s anime portrait, with eye tracking and a gentle cheek reaction.

## Architecture

Each page is an isolated Vite HTML entry in `work/motion/`, mounting a React page from `src/work/motion/`. Existing portfolio pages and Vol.01 remain vanilla. `runtime.jsx` shares Motion context, pause/reduced-motion behavior and collection navigation. `Scene.jsx` shares Three.js setup, resize, capped device-pixel ratio, offscreen/hidden-tab suspension, cleanup and WebGL fallback. Geometry and materials stay with each design. The gallery loads screenshots rather than running the specimens' WebGL scenes.

Use `npm run dev -- --host 127.0.0.1 --port 5174` and open `/work.html#work-ui`. `npm run build` emits all pages into `dist`. Screenshots live in `public/work/motion-lab/`; replace them after material visual changes. Fonts are loaded from Google Fonts; system fallbacks remain available.

## Original character asset

Built-in image generation produced `public/work/motion-lab/outform-character.png` with transparent alpha. It is 2D artwork layered with Motion; the star below it and the other pages' scenes use real Three.js geometry.

Generation prompt:

> Use case: stylized-concept. Asset type: transparent hero character cutout for a bold creative studio website with an orange background and enormous white typography behind. Create an ORIGINAL premium stylized 3D rendered character bust, not a website screenshot. Young androgynous creative artist with warm medium-brown skin, enormous sculptural cobalt-blue spiky sculpted hair in thick soft rounded tufts (NOT braids), acid-lime oversized wraparound translucent sunglasses, a small silver ear cuff, expressive calm confident face, chin lifted slightly, coral and ivory technical jacket with lime ribbed turtleneck collar. Fashion-forward, toy-meets-high-fashion art direction, detailed believable skin, soft subsurface scattering, glossy hair, polished cinema quality, striking silhouette. Waist/chest-up centered composition, arms down, head completely visible with generous clear edge padding, front three-quarter view looking slightly to viewer right, studio lighting with warm key and cobalt rim. Transparent background with real alpha, no floor, no background, no lettering, no logos, no watermark. Portrait composition. This artwork will layer over oversized text on an orange page.

## Verification

The first ten Motion Lab routes were rendered in the cmux WebKit browser at 1440, 768 and 375 pixels, with live WebGL scenes, no document overflow, and valid section links. Palette, material, project, archive, atmosphere, character, geometry and thought-exercise controls were exercised. Shared motion pause, emulated reduced-motion preference changes, and WebGL context loss/restoration were checked. Gallery search, mood filters, empty state and reset work independently of Vol.01. Original desktop screenshots are included for every page.

The additions have individual verification notes linked above. SOFT SPOT, RAIL, ECHO ZERO and TALIA passed desktop, tablet and mobile checks, including their navigation, selection and pause controls. MINA and TALIA use local mesh deformation on rendered artwork for their cheek interactions; SOFT SPOT also uses rendered character layers. MINA and TALIA track the cursor with their eyes while keeping the head stationary. RAIL's garments are live procedural 3D geometry. ECHO ZERO uses an authored Blender Studio character posed and optimized in Blender, with attribution included in the page and asset metadata. Synthetic PointerEvents exercised drag handlers where cmux could not provide native hardware drag; keyboard controls were also exercised.

The integrated gallery contains 25 cards and 25 preview files, with 15 Motion Lab entries. Searches for the new names, including TALIA, were checked in the browser. Expressive, Spatial and Immersive filters return 7, 5 and 3 entries respectively while the original ten-card collection remains independent. All gallery routes and preview paths resolve to project files.

The production build and dependency audit pass. The local 21st reviews report zero errors and zero warnings; their color-token suggestions are intentional across independent visual systems. Three.js remains the largest shared download, loaded only by specimen pages that use it. No deployment or remote publication is included.

## LocalNinja katana story

[LocalNinja — The first strike](akai.md) is study 16, replacing the earlier AKAI concept at the same URL. The user-authored story travels from a hilltop city overlook through an eye zoom, red world, rival glance, and two moving fighters crossing swords. It ends with three selectable katana: Wind (green), Water (blue), and Fire (red). It brings the gallery to 26 designs. Artwork and implementation are original; the user explicitly excluded copied MotionSites prompts and third-party site assets. Gallery previews are `public/work/motion-lab/akai.webp` and `public/work/service-previews/akai.webp`.

## MINA visibility update

The user subsequently requested hiding the entire MINA design. Work and homepage Services now show 15 visible Motion studies and 25 designs overall. MINA is also excluded from the shared picker and Next navigation; its standalone files remain available for restoration. Visible study numbers after SYNAPSE have been updated to match the picker.

## ECHO ZERO visibility update

ECHO ZERO is also hidden at the user’s request. Work and homepage Services now contain 14 visible Motion studies and 24 designs overall. The shared picker and Next links skip ECHO ZERO; its standalone files remain available for restoration. TALIA and LocalNinja are numbered 13 and 14.
