# Northshore Realty image prompts

Generated with the built-in `image_gen` tool on 2026-11-05. These are fictional property concepts for the sample website, aligned with the Vancouver listing descriptions; they are not photographs of the listed addresses.

Four images are delivered as 960 × 640 WebPs and 480 × 320 responsive variants in `public/work/realty/` (eight files, 802,162 bytes total). The smaller variants use the same filenames with `-480` before `.webp` and total 179,480 bytes. Original generated PNGs remain in the image tool's output directory.

Each matching image is reused across the homepage listing, detail sheet and saved, compare, similar-home and agent views. The first two homepage images load eagerly; subsequent images and detail/thumbnail images load lazily, with explicit dimensions and descriptive alt text for the main photographs. Thumbnails are decorative alongside the repeated listing address.

Verified at 1440, 390 and 320 px: all four distinct images load, no horizontal overflow or JavaScript errors, and property filtering, details, saved homes, comparison and the agent desk retain their matching images. The parent task handles the production build and portfolio preview refresh.

## Shared direction

Use case: photorealistic-natural.
Asset type: horizontal property-listing photograph for Northshore Realty, a Vancouver real-estate demo website.
Style: premium but believable professional Canadian real-estate photography, natural material texture, balanced exposure, restrained colour grading, architectural verticals straight, no fisheye.
Composition: landscape 3:2, 1536 x 1024, with the main architecture or room centred and kept legible within a wide 2.3:1 crop. Camera at standing eye level with a 28mm architectural lens.
Lighting: bright early-autumn daylight with softly diffused sunlight, inviting and lived-in without clutter.
Constraints: a plausible fictional property concept appropriate to the description, not a purported photograph of a real street address. No people, cars dominating the foreground, real-estate signs, logos, captions, watermarks, price tags or readable text. Render one coherent photograph, not a collage.

## Kitsilano condo

- Asset: `public/work/realty/kitsilano-condo.webp`
- Alt text: Contemporary Kitsilano condo building with a glass wraparound balcony and landscaped street frontage

Subject: a 2009 low-rise corner condominium building in Kitsilano, Vancouver, featuring pale grey stucco, red-brown brick accents, tall windows and a prominent glass-railed wraparound balcony for a two-bedroom corner unit. Three to four storeys, human scale, attractive small landscaped entrance with grasses and street trees, glimpses of neighbouring coastal Vancouver buildings. Three-quarter exterior view from the street, centred on the corner balcony. The building should feel like a desirable compact neighbourhood condo, not a luxury high-rise or detached mansion.

The full prompt for this asset is the shared direction above followed by this subject description.

## Burnaby Heights townhouse

- Asset: `public/work/realty/burnaby-townhouse.webp`
- Alt text: Three-level Burnaby Heights townhouse with cedar accents, a fenced garden and roof deck

Subject: a 2016 THREE-STOREY attached townhouse in Burnaby Heights, British Columbia, approximately 1480 sq ft, with a compact fenced front garden and a flat-roof deck. ESSENTIAL architecture: show exactly THREE complete above-ground storeys clearly stacked, each with its own visible row of windows; the ground floor has entrance and a window, the middle floor has windows, the third floor has windows, and ABOVE the third floor is a separate rooftop terrace with a black railing. The roof terrace must not replace the third storey. Frame the entire tall townhouse from front garden to rooftop with space above. Warm natural cedar cladding paired with cream render, dark window frames, modern recessed entrance, clean contemporary Canadian residential architecture. A near-frontal three-quarter view of this narrow townhouse unit within a small attached row, a little context from neighbours, foreground perennial planting. Believable compact three-level townhouse, not a two-storey house or high-rise.

The full prompt for this asset is the shared direction above followed by this subject description.

## North Vancouver detached home

- Asset: `public/work/realty/north-vancouver-midcentury.webp`
- Alt text: Mid-century North Vancouver detached home with cedar siding, mature landscaping and forested mountain views

Subject: a modestly upscale 1958 mid-century detached home in North Vancouver, approximately 2350 sq ft including a lower-level suite, on a generous mature garden lot. Low-pitched gabled roof, broad horizontal front windows, honey-toned cedar siding, pale stone accents, visible lower level responding to a gently sloped site, simple concrete path and lush established evergreen landscaping. Three-quarter exterior view, entire house mostly visible, a hint of forested North Shore mountains beyond and a detached garage glimpsed at the side. Believable renovated mid-century family house, not a giant contemporary mansion.

The full prompt for this asset is the shared direction above followed by this subject description.

## Gastown heritage loft

- Asset: `public/work/realty/gastown-heritage-loft.webp`
- Alt text: Gastown heritage loft interior with exposed brick, timber beams, steel-framed windows and polished concrete floors

Subject: interior of a compact 720 sq ft one-bedroom loft in a restored 1911 Gastown warehouse, Vancouver. Authentic weathered red-brick walls, original heavy timber ceiling beams and posts at 12-foot height, tall black steel-framed windows, polished concrete floor. An inviting oatmeal linen sofa, restrained walnut furniture, a woven rug and a small dining area; simple kitchen subtly visible in the background. Bright natural window light, realistic room proportions, warm material detail. Wide living-room view with both brick and windows visible, premium careful styling without excessive decor, no stairs or invented mezzanine.

The full prompt for this asset is the shared direction above followed by this subject description.
