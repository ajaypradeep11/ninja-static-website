# RAIL garment assets

Run `python3 scripts/rail/build-garments.py` from the repository root. Blender is required (tested with the user's installed Blender 5.2.1 LTS); no extra Python packages are needed. Pass `tee`, `knit`, `jacket`, or `hoodie` to rebuild just one silhouette.

`simulate-garments.py` builds sewn front/back garment panels, supports their shoulders, and settles each with an 80-frame Blender cloth solve. It then shapes the sleeve support and drape, adds collars, cuffs, stitched hems, hardware and a folded hood/pocket, smooths and reduces the surface, and bakes local ambient occlusion into vertex colours. The exported meshes retain actual openings and fabric thickness.

The sleeve pattern follows the user's clothing reference: short sleeves slope downward, long sleeves hang close to the torso, and softly pinched oval cuffs retain an opening without looking inflated. The post-simulation support preserves those openings while retaining gravity wrinkles. Fine cuff seams and modest torso depth keep the side silhouette continuous with the shoulders.

Long sleeves have a slight forward pitch, shallow elbow folds and a gathered transition into the ribbed wrist. Their supported rest pose keeps the sleeve distinct from the torso in profile. The hood crown folds toward the back of the neckline. Long-sleeve pieces rest at about 82 degrees to the showroom camera; tees retain their existing 71-degree angle.

Four GLB 2.0 assets are written under `public/work/motion-lab/rail/`. All geometry, prints and dye textures are original project work. Blender exports Y-up geometry and top-origin UVs; runtime CanvasTextures therefore use `flipY = false`. Material names select the archive fabric/trim in `src/work/motion/rail-garments.js`; front and back use separate materials to keep lettering off the back.

This is a baked cloth pose. Browser hover adds damped hanger springs and shoulder-anchored GPU fabric bending in `src/work/motion/rail-physics.js`; it does not run the Blender cloth or collision solver. Geometry is shared among colourways within a Scene and disposed independently for product viewers.
