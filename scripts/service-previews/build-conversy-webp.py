"""Convert the complete Conversy scroll recording to a looping WebP.

Requires ffmpeg and Pillow with WebP support. Run capture-conversy-scroll.mjs
first when the public website has changed; otherwise reuse the saved recording.
"""
from pathlib import Path
from PIL import Image
import subprocess

ROOT = Path(__file__).resolve().parents[2]
DIRECTORY = ROOT / 'public/work/service-previews/motion'
SOURCE = DIRECTORY / 'conversy-site.mp4'
DESTINATION = DIRECTORY / 'conversy-site.webp'
SIZE = (640, 400)
FPS = 15

decoder = subprocess.Popen([
    'ffmpeg', '-v', 'error', '-i', str(SOURCE),
    '-vf', f'fps={FPS},scale={SIZE[0]}:{SIZE[1]}:flags=lanczos',
    '-f', 'rawvideo', '-pix_fmt', 'rgb24', 'pipe:1',
], stdout=subprocess.PIPE)
frames = []
try:
    while data := decoder.stdout.read(SIZE[0] * SIZE[1] * 3):
        frames.append(Image.frombytes('RGB', SIZE, data))
finally:
    decoder.stdout.close()
if decoder.wait() != 0 or not frames:
    raise RuntimeError('Could not decode the Conversy scroll recording.')

# Alternate integer durations so the image keeps the recording's timing.
durations = [round((i + 1) * 1000 / FPS) - round(i * 1000 / FPS) for i in range(len(frames))]
temporary = DESTINATION.with_suffix('.tmp.webp')
frames[0].save(temporary, format='WEBP', save_all=True, append_images=frames[1:],
               duration=durations, loop=0, quality=65, method=4, minimize_size=True)
temporary.replace(DESTINATION)
print(f'{len(frames)} frames, {sum(durations) / 1000:.2f}s, '
      f'{DESTINATION.stat().st_size / 1_000_000:.2f} MB: {DESTINATION}')
