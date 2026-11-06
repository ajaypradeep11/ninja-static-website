"""Build silent looping screen highlights from the portfolio's real screenshots.

Requires Pillow and ffmpeg. Live full-page recordings are built separately
by capture-scroll.mjs and must not be overwritten by these storyboards.
"""
from pathlib import Path
from PIL import Image, ImageOps
import math
import subprocess

ROOT = Path(__file__).resolve().parents[2]
PUBLIC = ROOT / 'public/work'
OUTPUT = PUBLIC / 'service-previews/motion'
OUTPUT.mkdir(parents=True, exist_ok=True)
STORYBOARDS = {
    'curriculearn': [PUBLIC / 'curriculearn' / name for name in ['dash.jpg', 'dash1.jpg', 'dash3.jpg']],
    'irina': [PUBLIC / 'irina' / name for name in ['workspace-dashboard.webp', 'jacket-technical-review.webp', 'jacket-3d-preview.webp']],
    'story': [PUBLIC / 'story' / name for name in ['pc-interactive.jpg', 'mobile-frame.jpg']],
}
SIZE = (768, 480)
FPS = 15
HOLD = 2.5
FADE = .5


def frame(image, progress):
    # A small, slow push keeps the screen legible between crossfades.
    zoom = 1 + .015 * (1 - math.cos(progress * math.pi)) / 2
    w, h = image.size
    return image.crop(((w-w/zoom)/2, 0, (w+w/zoom)/2, h/zoom)).resize(SIZE, Image.Resampling.LANCZOS)


for slug, paths in STORYBOARDS.items():
    images = []
    for source in paths:
        with Image.open(source) as image:
            images.append(ImageOps.fit(image.convert('RGB'), SIZE, centering=(.5, 0)))
    destination = OUTPUT / f'{slug}.mp4'
    command = ['ffmpeg', '-y', '-loglevel', 'error', '-f', 'rawvideo', '-pixel_format', 'rgb24',
               '-video_size', '768x480', '-framerate', str(FPS), '-i', '-', '-an',
               '-c:v', 'libx264', '-preset', 'slow', '-crf', '27', '-pix_fmt', 'yuv420p',
               '-movflags', '+faststart', str(destination)]
    encoder = subprocess.Popen(command, stdin=subprocess.PIPE)
    try:
        for tick in range(round(len(images) * HOLD * FPS)):
            time = tick / FPS
            index = int(time / HOLD)
            local = time % HOLD
            result = frame(images[index], local / HOLD)
            if local > HOLD - FADE:
                mix = (local - HOLD + FADE) / FADE
                mix = mix * mix * (3 - 2 * mix)
                result = Image.blend(result, frame(images[(index+1) % len(images)], 0), mix)
            encoder.stdin.write(result.tobytes())
    finally:
        encoder.stdin.close()
    if encoder.wait() != 0:
        raise RuntimeError(f'Encoding failed: {slug}')
    print(f'{slug}: {destination.stat().st_size / 1024:.0f} KiB', flush=True)
