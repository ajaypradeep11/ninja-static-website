# Ninja — The first strike

The katana theme is named **Ninja**. Existing route and asset filenames retain the `akai` slug.

Route: `/work/motion/akai.html` (the existing study URL is retained). Motion Lab study 15 in the visible collection, listed in Work and automatically in homepage Services → UI/UX. This replaces the earlier AKAI botanical-soda concept at the user's request. The theme brand is Ninja.

The user authored the new sequence: a swordsman on a hill overlooking the city; a scroll into his eye; a red world; a waiting rival; the rival's glance; both fighters crossing swords; then three katana. Wind is green, Water is blue, Fire is red. The artwork, interface, and written direction are original. No MotionSites prompts, website code, or third-party site artwork were used for this revision.

## Interaction

- A pinned scroll timeline controls the hill zoom, eye close-up, circular red reveal, rival entrance, returned glance, and two separate fighters moving into the sword clash. It ends with an invitation to choose an element.
- Five chapter buttons jump to meaningful positions in the story. The header's shop link skips to the collection.
- Wind, Water, and Fire tabs change the katana artwork, color, description, design details, and enquiry. Arrow keys, Home, and End move through the tabs.
- The design-details button expands a definition list. Changing element resets it.
- Enquiry links open a draft addressed to the existing `support@localninja.ca`, identifying the selected katana and requesting pricing, specifications, and availability. No prices, inventory, checkout, or payment processing are invented.
- Paused/reduced-motion mode replaces the pinned timeline with sequential illustrated panels and retains all three product selections.

## Implementation and artwork

`src/work/motion/akai.jsx` and `akai.css` are isolated React + Motion modules, mounted through the existing Motion Lab runtime. No dependencies were added for this revision. All CSS is scoped to `kn-` classes. The story uses original raster artwork and CSS/Motion transforms, rather than a video or skeletal character animation.

Nine original assets are in `public/work/motion-lab/akai/katana/`: hill, eye, enemy, glance, two transparent fighters, and three transparent katana illustrations. These optimized WebPs total approximately 2.8 MB. The opening illustration is preloaded. Product images load lazily. The full blade and scabbard remain visible on narrow screens.

The built-in image generation tool created the artwork from the user's story and original written descriptions. Character and product continuity references were generated within this project; no recording frames or third-party site artwork were submitted. Prompts are preserved in `public/work/motion-lab/akai/katana/artwork-prompts.json`. Old AKAI assets remain in their original directory but are not loaded by the new page.

## Verification

Chrome checks at 1440×900, 768×1024, and 375×812 cover all scroll scenes, chapter navigation, the shop shortcut, all three element selections, keyboard controls, design details, enquiry destinations, section anchors, image loading, horizontal overflow, motion pause/resume, and runtime errors. Reduced-motion mode is separately checked with product selection still working. Desktop, tablet, and mobile screenshots are visually reviewed, including eye framing, sword contact, and the product art.

After the user’s subsequent request to hide MINA, Work shows 15 visible Motion Lab studies and 25 designs overall. Searching Ninja finds the updated card; its route and the homepage Services card load successfully. Both gallery preview assets are refreshed from the new page. The Vite production build passes with the existing shared Three.js chunk-size warning; this page does not import Three.js.

The local 21st review reports zero errors and zero warnings. Its color-token suggestions are intentional for this isolated design study. No external catalog component was retrieved or used. No deployment or purchase transaction is included.
