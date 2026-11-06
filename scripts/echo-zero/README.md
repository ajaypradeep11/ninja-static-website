# ECHO character preparation

Run from the repository root with Blender 5.2.1. The character source is Blender Studio's Rain v3.3 ZIP, licensed CC BY 4.0. These scripts modify a local working copy; they do not enable or execute scripts embedded in the downloaded Blender file.

Download [Rain v3](https://studio.blender.org/characters/rain/v3/) into `output/rain-v33.zip`, then extract into `output/rain-v33/`. Archive SHA-256: `80217f163f6392dc829233d63c2cfb5e1376775bc34101ad14f39631fea70d24`. The expected input is `output/rain-v33/Rain v3.3/rain_v3.2.blend`.

```sh
mkdir -p output/echo-baked public/work/motion-lab/echo-zero
/Applications/Blender.app/Contents/MacOS/Blender -b 'output/rain-v33/Rain v3.3/rain_v3.2.blend' --disable-autoexec --python scripts/echo-zero/pose.py
/Applications/Blender.app/Contents/MacOS/Blender -b output/rain-posed.blend --disable-autoexec --python scripts/echo-zero/bake.py
/Applications/Blender.app/Contents/MacOS/Blender -b output/echo-web-ready.blend --disable-autoexec --python scripts/echo-zero/finalize.py
/Applications/Blender.app/Contents/MacOS/Blender -b output/echo-web-final.blend --disable-autoexec --python scripts/echo-zero/poster.py
```

The first script poses the production rig and renders an inspection image. The second evaluates the geometry and bakes portable maps. The third restores explicit pupil materials which otherwise depend on Blender-specific object shader attributes. The fourth renders the transparent static fallback poster. The final asset is `public/work/motion-lab/echo-zero/echo-rain.glb`; metadata is in `model-info.json`. Intermediate Blender files, source textures, and bakes remain in ignored `output/`.

The loader, interactive wardrobe materials and browser lighting are maintained in `src/work/motion/echo-zero.jsx`. The bundled `ATTRIBUTION.txt` must remain with redistributed assets. See `docs/echo-zero.md` for the interaction and verification details.
