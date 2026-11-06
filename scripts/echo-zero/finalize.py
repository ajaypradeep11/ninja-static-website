import bpy,os,json
obj=bpy.data.objects['Echo_eyes'];mesh=obj.data
pupil=bpy.data.materials.new('Echo_pupil_PBR');pupil.use_nodes=True;p=pupil.node_tree.nodes.get('Principled BSDF');p.inputs['Base Color'].default_value=(.001,.0015,.002,1);p.inputs['Roughness'].default_value=.34;p.inputs['Specular IOR Level'].default_value=.15
mesh.materials.append(pupil)
adj={v.index:set() for v in mesh.vertices}
for e in mesh.edges:a,b=e.vertices;adj[a].add(b);adj[b].add(a)
remaining=set(adj)
while remaining:
 todo=[next(iter(remaining))];part=set()
 while todo:
  x=todo.pop()
  if x in part:continue
  part.add(x);todo.extend(adj[x]-part)
 remaining-=part
 if len(part)<20:
  for face in mesh.polygons:
   if face.vertices[0] in part:face.material_index=1
  print('PUPIL CAP',len(part))
exports=[o for o in bpy.data.objects if o.name.startswith('Echo_') and o.type=='MESH']
bpy.ops.object.select_all(action='DESELECT')
for o in exports:o.select_set(True)
bpy.context.view_layer.objects.active=obj
bpy.ops.wm.save_as_mainfile(filepath=os.path.abspath('output/echo-web-final.blend'))
path=os.path.abspath('public/work/motion-lab/echo-zero/echo-rain.glb')
bpy.ops.export_scene.gltf(filepath=path,export_format='GLB',use_selection=True,export_animations=False,export_skins=False,export_morph=False,export_apply=True,export_image_format='JPEG',export_jpeg_quality=90,export_draco_mesh_compression_enable=True,export_draco_mesh_compression_level=6,export_draco_position_quantization=14,export_draco_normal_quantization=12,export_draco_texcoord_quantization=12,export_copyright='Rain Rig (CC) Blender Foundation | studio.blender.org — CC BY 4.0. Adapted for ECHO ZERO: pose, materials, texture baking, web optimization.')
p='public/work/motion-lab/echo-zero/model-info.json';j=json.load(open(p));j['sizeBytes']=os.path.getsize(path);j['modifications'].append('Explicit dark pupil-cap material for glTF');open(p,'w').write(json.dumps(j,indent=2))
