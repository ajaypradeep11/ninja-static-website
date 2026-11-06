import bpy, os, math, json
from mathutils import Vector
ROOT=os.path.abspath('public/work/motion-lab/echo-zero')
BAKES=os.path.abspath('output/echo-baked')
scene=bpy.context.scene;scene.render.engine='CYCLES';scene.cycles.samples=8
scene.render.bake.margin=8;scene.render.bake.use_clear=True
scene.render.image_settings.file_format='JPEG';scene.render.image_settings.quality=90
# Original pose is evaluated into a static mesh: no unsupported rig constraints in glTF.
collection=bpy.data.collections.new('ECHO_EXPORT');scene.collection.children.link(collection)
deps=bpy.context.evaluated_depsgraph_get()
sources=[o for o in bpy.data.objects if o.type=='MESH' and o.name.startswith('GEO-rain-') and o.visible_get() and not any(x in o.name for x in ['nomask','viewport','cornea','eye_dots','scarf'])]
export=[]
for source in sources:
 mesh=bpy.data.meshes.new_from_object(source.evaluated_get(deps),preserve_all_data_layers=True,depsgraph=deps)
 obj=bpy.data.objects.new(source.name.replace('GEO-rain-','Echo_'),mesh);collection.objects.link(obj);obj.matrix_world=source.matrix_world.copy();source.hide_set(True);source.hide_render=True
 for p in mesh.polygons:p.use_smooth=True
 export.append(obj)
for obj in export:
 print('BAKING',obj.name, len(obj.data.polygons),flush=True)
 mesh=obj.data
 if not mesh.uv_layers:continue
 original_uv=mesh.uv_layers.active.name
 original_data=mesh.uv_layers.active.data
 umin=math.floor(min(v.uv.x for v in original_data)+.0001); umax=math.ceil(max(v.uv.x for v in original_data)-.0001);span=max(1,umax-umin)
 newuv=mesh.uv_layers.new(name='EchoUV')
 for new,old in zip(newuv.data,original_data):new.uv=( (old.uv.x-umin)/span,old.uv.y )
 mesh.uv_layers.active=newuv;newuv.active_render=True
 size=2048 if obj.name in ['Echo_head','Echo_body'] else 1024 if any(x in obj.name for x in ['hair','jeans','top','shoes']) else 512
 image=bpy.data.images.new(obj.name+'_albedo',width=size,height=size,alpha=False)
 original_mats=list(mesh.materials);mesh.materials.clear()
 for mat in original_mats:
  m=mat.copy();mesh.materials.append(m);nt=m.node_tree;nodes=nt.nodes
  uvnode=nodes.new('ShaderNodeUVMap');uvnode.uv_map=original_uv
  for n in list(nodes):
   if n.type=='TEX_IMAGE' and not n.inputs['Vector'].is_linked:nt.links.new(uvnode.outputs['UV'],n.inputs['Vector'])
   if n.type=='TEX_COORD':
    for link in list(nt.links):
     if link.from_node==n and link.from_socket.name=='UV':target=link.to_socket;nt.links.remove(link);nt.links.new(uvnode.outputs['UV'],target)
  output=next((n for n in nodes if n.type=='OUTPUT_MATERIAL' and n.is_active_output),next(n for n in nodes if n.type=='OUTPUT_MATERIAL'))
  bsdf=next(n for n in nodes if n.type=='BSDF_PRINCIPLED')
  if obj.name=='Echo_eyes':
   eye_image=next(n for n in nodes if n.type=='TEX_IMAGE' and n.image and 'rain_eyes' in n.image.name)
   nt.links.new(eye_image.outputs['Color'],bsdf.inputs['Base Color'])
  # The top is deliberately matte charcoal; baked denim is darkened to match.
  emit=nodes.new('ShaderNodeEmission');base=bsdf.inputs['Base Color']
  if base.is_linked:
   fromsocket=base.links[0].from_socket
   if obj.name=='Echo_jeans':
    multiply=nodes.new('ShaderNodeMixRGB');multiply.blend_type='MULTIPLY';multiply.inputs[0].default_value=1;multiply.inputs[2].default_value=(.13,.16,.18,1);nt.links.new(fromsocket,multiply.inputs[1]);fromsocket=multiply.outputs[0]
   nt.links.new(fromsocket,emit.inputs['Color'])
  else:emit.inputs['Color'].default_value=base.default_value
  if obj.name=='Echo_shoes' and mat.name not in ['MAT-rain.metal']:
   for link in list(emit.inputs['Color'].links):nt.links.remove(link)
   emit.inputs['Color'].default_value=(.72,.72,.67,1)
  nt.links.new(emit.outputs[0],output.inputs['Surface'])
  target=nodes.new('ShaderNodeTexImage');target.image=image;nodes.active=target
 bpy.ops.object.select_all(action='DESELECT');obj.hide_set(False);obj.select_set(True);bpy.context.view_layer.objects.active=obj
 bpy.ops.object.bake(type='EMIT')
 image.filepath_raw=os.path.join(BAKES,obj.name+'.jpg');image.file_format='JPEG';image.save()
 # Store a single portable material per authored mesh. Tiny parts retain enough
 # resolution for close inspection; the face/body get two-kilopixel maps.
 material=bpy.data.materials.new(obj.name+'_PBR');material.use_nodes=True;nt=material.node_tree;bsdf=nt.nodes.get('Principled BSDF');tex=nt.nodes.new('ShaderNodeTexImage');tex.image=image;nt.links.new(tex.outputs['Color'],bsdf.inputs['Base Color'])
 rough=.55
 if 'hair' in obj.name:rough=.43
 if any(x in obj.name for x in ['top','jeans','shoes']):rough=.78
 if obj.name=='Echo_eyes':rough=.16
 if 'gums' in obj.name or 'tongue' in obj.name:rough=.4
 bsdf.inputs['Roughness'].default_value=rough;bsdf.inputs['Metallic'].default_value=0
 mesh.materials.clear();mesh.materials.append(material)
 for p in mesh.polygons:p.material_index=0
 for uv in list(mesh.uv_layers):
  if uv.name!='EchoUV':mesh.uv_layers.remove(uv)
 mesh.uv_layers.active=mesh.uv_layers['EchoUV'];mesh.uv_layers['EchoUV'].active_render=True
 # Keep the finished web model free of unused vertex color layers.
 for attr in list(mesh.color_attributes):mesh.color_attributes.remove(attr)
 image.pack()
for o in export:o.hide_set(False)
bpy.ops.object.select_all(action='DESELECT')
for o in export:o.select_set(True)
bpy.context.view_layer.objects.active=export[0]
triangles=sum(sum(len(p.vertices)-2 for p in o.data.polygons) for o in export)
print('EXPORTING',len(export),'meshes',triangles,'triangles',flush=True)
bpy.ops.wm.save_as_mainfile(filepath=os.path.abspath('output/echo-web-ready.blend'))
bpy.ops.export_scene.gltf(filepath=os.path.join(ROOT,'echo-rain.glb'),export_format='GLB',use_selection=True,export_animations=False,export_skins=False,export_morph=False,export_apply=True,export_image_format='JPEG',export_jpeg_quality=90,export_draco_mesh_compression_enable=True,export_draco_mesh_compression_level=6,export_draco_position_quantization=14,export_draco_normal_quantization=12,export_draco_texcoord_quantization=12,export_copyright='Rain Rig (CC) Blender Foundation | studio.blender.org — CC BY 4.0. Adapted for ECHO ZERO: pose, materials, texture baking, web optimization.')
open(os.path.join(ROOT,'model-info.json'),'w').write(json.dumps({'source':'https://studio.blender.org/characters/rain/v3/','license':'https://creativecommons.org/licenses/by/4.0/','credit':'Rain Rig (CC) Blender Foundation | studio.blender.org','modifications':['Crouched pose','Matte charcoal top and dark denim','Ivory footwear','Forward gaze and relaxed hands','Gravity-curved ponytail','Static mesh evaluation','Baked and resized PBR color maps','Draco compressed glTF export'],'meshes':len(export),'triangles':triangles,'sizeBytes':os.path.getsize(os.path.join(ROOT,'echo-rain.glb'))},indent=2))
