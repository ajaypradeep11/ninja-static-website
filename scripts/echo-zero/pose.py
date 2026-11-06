import bpy, math, os, json
from mathutils import Vector, Matrix
rig=bpy.data.objects['RIG-rain']; pb=rig.pose.bones
# Keep the studio rig's built-in constraints, without executing bundled UI scripts.
props=pb['Properties_Character_Rain']; props['Quality']=2;props['Scarf']=False;props['Eye_Dots']=False
pb['Properties_IKFK']['ik_stretch_arms']=0.0
for o in bpy.data.objects:
 if o.type=='MESH' and o.name.startswith('GEO-'):
  for mod in o.modifiers:
   if mod.type=='SUBSURF':
    # Remove quality drivers so the portable export receives real smoothing.
    try:mod.driver_remove('levels')
    except:pass
    mod.levels=2 if any(s in o.name for s in ['head','hair','eyebrows','eyelashes']) else 1
    mod.render_levels=mod.levels
bpy.context.view_layer.update()
def move(name,pos):
 p=pb[name]; m=p.matrix.copy(); m.translation=Vector(pos);p.matrix=m;bpy.context.view_layer.update()
def rotate(name,axis,angle):
 p=pb[name]; m=p.matrix.copy();r=Matrix.Rotation(math.radians(angle),4,axis);pos=m.translation.copy();m.translation=Vector((0,0,0));m=r@m;m.translation=pos;p.matrix=m;bpy.context.view_layer.update()
head_rest = pb['FK-Head'].matrix.to_quaternion().copy()
hand_rest = {s: pb['IK-Hand.'+s].matrix.copy() for s in ['L','R']}
move('MSTR-Pelvis',(0,.16,.35))
rotate('MSTR-Pelvis','X',32)
for side,sgn in [('L',1),('R',-1)]:
 move('MSTR-Foot.'+side,(sgn*.24,-.01,.078))
 rotate('MSTR-Foot.'+side,'Z',sgn*-12)
 move('IK-Pole-Shin.'+side,(sgn*.5,-.65,.35))
 move('IK-Hand.'+side,(sgn*.13,-.28,.37))
 move('IK-Pole-Forearm.'+side,(sgn*.60,-.10,.64))
p=pb['FK-Head'];p.matrix=Matrix.LocRotScale(p.matrix.translation,head_rest,Vector((1,1,1)));bpy.context.view_layer.update()
for side,sgn in [('L',1),('R',-1)]:
 p=pb['IK-Hand.'+side];old=hand_rest[side];direction=old.to_3x3()@Vector((0,1,0));q=direction.rotation_difference(Vector((sgn*.08,-.15,-1)).normalized());p.matrix=Matrix.LocRotScale(p.matrix.translation,q@old.to_quaternion(),Vector((1,1,1)));bpy.context.view_layer.update()
for c in pb['TGT-Eyes'].constraints:c.mute=True
move('TGT-Eyes',(0,-4,1.03))
# Pose the authored ponytail into a gravity-led arc, rather than its rig rest pose.
rotate('FK-Hair_Ponytail1','X',-20)
rotate('FK-Hair_Ponytail2','X',-45)
rotate('FK-Hair_Ponytail3','X',-25)
rotate('FK-Hair_Ponytail4','X',12)
for side in ['L','R']:
 p=pb['ACT-Lips_Corner.'+side];position=p.matrix.translation.copy();position.z+=.0025;move(p.name,position)
bpy.context.view_layer.update()
print('BONE_POSED',[(n,list(pb[n].head)) for n in ['MSTR-Pelvis','MSTR-Chest','FK-Head','FK-Upperarm.L','FK-Forearm.L','FK-Thigh.L','FK-Shin.L','IK-Hand.L']])
# Matte technical fabric; keep the original weave bump.
m=bpy.data.materials['MAT-rain.top'];bsdf=next(n for n in m.node_tree.nodes if n.type=='BSDF_PRINCIPLED')
for key in ['Base Color','Roughness','Metallic']:
 for link in list(bsdf.inputs[key].links):m.node_tree.links.remove(link)
bsdf.inputs['Base Color'].default_value=(.017,.022,.024,1);bsdf.inputs['Roughness'].default_value=.78;bsdf.inputs['Metallic'].default_value=0
# Render an honest posed asset proof.
for o in bpy.data.objects:
 if o.type in ['CAMERA','LIGHT']:bpy.data.objects.remove(o,do_unlink=True)
world=bpy.data.worlds.new('ECHO Studio');bpy.context.scene.world=world;world.use_nodes=True;world.node_tree.nodes['Background'].inputs[0].default_value=(.72,.73,.68,1);world.node_tree.nodes['Background'].inputs[1].default_value=.45
bpy.ops.mesh.primitive_plane_add(size=200,location=(0,0,-.003));floor=bpy.context.object;floor.name='ECHO_Floor';mat=bpy.data.materials.new('ECHO_Floor_Mat');mat.diffuse_color=(.68,.70,.64,1);floor.data.materials.append(mat)
def area(name,loc,power,size,color):
 data=bpy.data.lights.new(name,'AREA');data.energy=power;data.shape='DISK';data.size=size;data.color=color;o=bpy.data.objects.new(name,data);bpy.context.collection.objects.link(o);o.location=loc;o.rotation_euler=(Vector((0,0,.65))-o.location).to_track_quat('-Z','Y').to_euler()
area('Key',(-2,-3,4),400,4,(1,.88,.76));area('Fill',(2,-1,2),180,3,(.76,.85,1));area('Rim',(0,2,3),450,3,(1,1,1))
bpy.ops.object.camera_add(location=(.14,-4,1.25));cam=bpy.context.object;cam.rotation_euler=(Vector((0,-.05,.65))-cam.location).to_track_quat('-Z','Y').to_euler();cam.data.type='ORTHO';cam.data.ortho_scale=1.55;bpy.context.scene.camera=cam
sc=bpy.context.scene;sc.render.engine='CYCLES';sc.cycles.samples=32;sc.render.resolution_x=900;sc.render.resolution_y=900;sc.render.resolution_percentage=100;sc.render.image_settings.file_format='PNG';sc.render.filepath=os.path.abspath('output/rain-pose.png');sc.view_settings.view_transform='AgX'
bpy.ops.wm.save_as_mainfile(filepath=os.path.abspath('output/rain-posed.blend'))
bpy.ops.render.render(write_still=True)
