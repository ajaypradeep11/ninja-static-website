import bpy, os
from mathutils import Vector

scene = bpy.context.scene
floor = bpy.data.objects.get('ECHO_Floor')
if floor:
    floor.hide_render = True
camera = scene.camera
camera.location = (0.02, -4, 1.17)
camera.rotation_euler = (Vector((0, -0.05, 0.59)) - camera.location).to_track_quat('-Z', 'Y').to_euler()
camera.data.type = 'ORTHO'
camera.data.ortho_scale = 1.42
scene.render.film_transparent = True
scene.render.engine = 'CYCLES'
scene.cycles.samples = 48
scene.render.resolution_x = 800
scene.render.resolution_y = 1000
scene.render.resolution_percentage = 100
scene.render.image_settings.file_format = 'PNG'
scene.render.image_settings.color_mode = 'RGBA'
scene.render.filepath = os.path.abspath('public/work/motion-lab/echo-zero/echo-poster.png')
bpy.ops.render.render(write_still=True)
