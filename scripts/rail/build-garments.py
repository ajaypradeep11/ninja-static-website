"""Rebuild RAIL's original cloth assets with the local Blender installation."""
import shutil
import subprocess
import sys
from pathlib import Path

blender = shutil.which('blender') or '/Applications/Blender.app/Contents/MacOS/Blender'
if not Path(blender).is_file():
    raise SystemExit('Blender is required. Install it or put the blender executable on PATH.')
script = Path(__file__).with_name('simulate-garments.py').resolve()
command = [blender, '--background', '--factory-startup', '--python-exit-code', '1', '--threads', '6', '--python', str(script)]
if len(sys.argv) > 1:
    command += ['--', *sys.argv[1:]]
subprocess.run(command, cwd=script.parents[2], check=True)
