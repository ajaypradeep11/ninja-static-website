"""Author and settle sewn garment patterns in Blender, then export web GLBs.

Blender --background --factory-startup --python scripts/rail/simulate-garments.py -- tee
Coordinates in pattern helpers are Y-up, with one display unit = 0.48 metres.
"""
import bpy
import bmesh
import math
import os
import sys
from mathutils import Vector
from mathutils.bvhtree import BVHTree

SCALE = .48
OUT = os.path.abspath('public/work/motion-lab/rail')
os.makedirs(OUT, exist_ok=True)
KINDS = sys.argv[sys.argv.index('--')+1:] if '--' in sys.argv else ['tee','knit','jacket','hoodie']
if not KINDS or any(kind not in ['tee','knit','jacket','hoodie'] for kind in KINDS):
    raise ValueError('Choose tee, knit, jacket or hoodie.')


def native(p): return (p[0]*SCALE, -p[2]*SCALE, p[1]*SCALE)
def display(p): return (p[0]/SCALE, p[2]/SCALE, -p[1]/SCALE)


def smoothstep(start, end, value):
    t=max(0,min(1,(value-start)/(end-start)))
    return t*t*(3-2*t)


def material(name, color=(.4,.46,.42,1)):
    mat=bpy.data.materials.get(name) or bpy.data.materials.new(name)
    mat.diffuse_color=color
    return mat


def mesh_object(name, verts, faces, slots=None, face_materials=None, uvs=None):
    mesh=bpy.data.meshes.new(name)
    mesh.from_pydata([native(v) for v in verts],[],faces)
    mesh.update()
    obj=bpy.data.objects.new(name,mesh)
    bpy.context.collection.objects.link(obj)
    for slot in slots or ['Fabric']: mesh.materials.append(material(slot))
    if face_materials:
        for poly,mat in zip(mesh.polygons,face_materials):poly.material_index=mat
    uv=mesh.uv_layers.new(name='UVMap')
    for poly in mesh.polygons:
        poly.use_smooth=True
        for loop in poly.loop_indices:
            p=verts[mesh.loops[loop].vertex_index]
            uv.data[loop].uv=((p[0]+1.16)/2.32,(p[1]+1.24)/2.05)
    bm=bmesh.new();bm.from_mesh(mesh);bmesh.ops.recalc_face_normals(bm,faces=bm.faces);bm.to_mesh(mesh);bm.free()
    return obj


def activate(obj):
    bpy.ops.object.select_all(action='DESELECT')
    obj.select_set(True);bpy.context.view_layer.objects.active=obj


def apply(obj,mod):
    activate(obj);bpy.ops.object.modifier_apply(modifier=mod.name)


def curve(name, points, radius, mat):
    data=bpy.data.curves.new(name,'CURVE');data.dimensions='3D'
    data.bevel_depth=radius*SCALE;data.bevel_resolution=2;data.resolution_u=10
    spline=data.splines.new('POLY');spline.points.add(len(points)-1)
    for p,co in zip(spline.points,points):p.co=(*native(co),1)
    obj=bpy.data.objects.new(name,data);bpy.context.collection.objects.link(obj)
    data.materials.append(material(mat));activate(obj);bpy.ops.object.convert(target='MESH')
    for p in obj.data.polygons:p.use_smooth=True
    return obj


def pattern(kind):
    nx,ny,arm=40,48,12
    verts=[];faces=[];mats=[];pins={};body={};sleeves={}
    def face(indices,mat=0):faces.append(indices);mats.append(mat)
    for back in [False,True]:
        sign=-1 if back else 1
        for j in range(ny+1):
            t=j/ny
            for i in range(nx+1):
                x=-.60+1.20*i/nx
                ax=abs(x)
                top=(.47+.18*(ax/.21)**2 if ax<.21 else .65-.25*(ax-.21)/.39)
                if back and ax<.21:top=.65-.025*(1-(ax/.21)**2)
                y=top*(1-t)+(-1.15+.012*math.sin(x*8+.4))*t
                # The garment starts as two close sewn panels, never a filled torso.
                fullness=(.026+.031*math.sin(t*math.pi))*(.55+.45*math.cos(x*2.4))
                fold=.012*math.sin(x*20+t*4)*math.sin(t*math.pi)+.005*math.sin(x*35-t*8)*t
                neck_depth=.09*max(0,1-ax/.36)*math.exp(-t*12)
                z=sign*(fullness+neck_depth)+fold
                x*=1+.08*math.sin(t*math.pi/2)
                index=len(verts);body[back,j,i]=index;verts.append((x,y,z))
                if j==0:pins[index]=1.0
                elif j==1:pins[index]=.65
                elif j==2:pins[index]=.15
        for j in range(ny):
            for i in range(nx):
                mat=int(back)
                face([body[back,j,i],body[back,j,i+1],body[back,j+1,i+1],body[back,j+1,i]],mat)
    # Sew shoulders and side seams, leaving neck, sleeve and hem openings.
    for i in range(nx):
        if abs(-.6+1.2*(i+.5)/nx)>.21:
            face([body[False,0,i],body[True,0,i],body[True,0,i+1],body[False,0,i+1]])
    for side in [-1,1]:
        col=0 if side<0 else nx
        for j in range(arm,ny):
            face([body[False,j,col],body[False,j+1,col],body[True,j+1,col],body[True,j,col]])
        length=16 if kind=='tee' else 30
        for back in [False,True]:
            sign=-1 if back else 1
            for u in range(length+1):
                t=u/length
                for v in range(arm+1):
                    if u==0:
                        sleeves[side,back,u,v]=body[back,v,col]
                        continue
                    angle=math.pi*v/arm
                    a=math.cos(angle)
                    root=verts[body[back,v,col]]
                    # A sloping, hollow sleeve: the short cuff opens outward,
                    # while long sleeves fall beside the torso with a soft elbow.
                    cx=.60+(.36 if kind=='tee' else .25)*t-.035*math.sin(t*math.pi)
                    cy=.205-(.48 if kind=='tee' else 1.36)*t
                    half=.19375*(1-t)+(.20 if kind=='tee' else .125)*t
                    nxp,nyp=(.80,.60) if kind=='tee' else (.985,.17)
                    opening=min(1,t*2)
                    opening=opening*opening*(3-2*opening)
                    x=side*(cx+half*a*nxp*opening)
                    y=cy+(root[1]-.205)*(1-opening)+half*a*nyp*opening
                    depth=(.12 if kind in ['hoodie','jacket'] else .11)*(1-t)+(.095 if kind=='tee' else .075)*t
                    # Empty fabric relaxes into a softly pinched oval, not a tube.
                    ellipse=sign*(.003+depth*math.sin(angle)*(1-.22*t*t*math.sin(angle)**2))
                    z=root[2]*(1-opening)+ellipse*opening
                    z+=.008*math.sin(t*9+a*3)*math.sin(t*math.pi)*math.sin(angle)
                    z+=.009*t*t*math.sin(angle*2+side*.7)
                    y-=.018*t*t*math.sin(angle)**2
                    if kind!='tee':
                        # A dropped sleeve has its own side silhouette: a rounded
                        # shoulder, a soft forward elbow and a gathered wrist.
                        opening=smoothstep(0,.5,t)
                        cuff=smoothstep(.86,.94,t)
                        cx=.60+.25*t-.035*math.sin(t*math.pi)
                        cy=.205-1.40*t
                        half=.19375*(1-t)+.13*t-.025*cuff
                        x=side*(cx+half*a*.985*opening)
                        y=cy+(root[1]-.205)*(1-opening)+half*a*.17*opening
                        center=.095*smoothstep(0,1,t)+.025*math.sin(t*math.pi)
                        depth=(.125-.033*t-.018*cuff)*(1-.18*math.sin(angle)**2)
                        # Shallow folds gather at the inner elbow and above the rib.
                        elbow=math.exp(-((t-.56)/.17)**2)
                        gather=math.exp(-((t-.84)/.07)**2)
                        fold=(.006*elbow+.004*gather)*math.sin(t*37+a*2+side*.5)
                        z=root[2]*(1-opening)+(center+sign*(.003+depth*math.sin(angle))+fold*math.sin(angle))*opening
                        y-=.012*math.sin(angle)**2*t
                    index=len(verts);sleeves[side,back,u,v]=index;verts.append((x,y,z))
                    if v<=2 and u<=4:pins[index]=[1,.95,.75,.4,.12][u]*(1-v*.2)
            for u in range(length):
                for v in range(arm):
                    mat=2 if kind!='tee' and u>=length-3 else int(back)
                    face([sleeves[side,back,u,v],sleeves[side,back,u+1,v],sleeves[side,back,u+1,v+1],sleeves[side,back,u,v+1]],mat)
        for edge in [0,arm]:
            for u in range(length):
                face([sleeves[side,False,u,edge],sleeves[side,True,u,edge],sleeves[side,True,u+1,edge],sleeves[side,False,u+1,edge]])
    hood=[]
    if kind=='hoodie':
        for j in range(19):
            t=j/18
            row=[]
            width=(.23+.045*math.sin(t*math.pi))*(1-.94*t**4)
            for i in range(33):
                a=-.65+i/32*(math.pi+1.3)
                x=width*math.cos(a)
                # Fold the crown toward the back of the neckline instead of
                # leaving a horizontal, visor-like lip in the side view.
                y=.64+.39*math.sin(t*math.pi/2)-.055*math.sin(a)*math.sin(t*math.pi)
                z=-.035-.22*t-(.13+.10*math.sin(t*math.pi))*(1-.9*t**4)*math.sin(a)
                z+=.012*math.sin(a*3+t*11)*math.sin(t*math.pi)
                index=len(verts);row.append(index);verts.append((x,y,z))
                if j==0:pins[index]=1
                elif j==1:pins[index]=.6
            hood.append(row)
        for j in range(18):
            for i in range(32):face([hood[j][i],hood[j][i+1],hood[j+1][i+1],hood[j+1][i]],3)
        face(hood[-1],3)
    obj=mesh_object('Garment',verts,faces,['Fabric','FabricBack','Rib','Hood'],mats)
    obj['hood_indices']=[i for row in hood for i in row]
    obj['cut_pattern']=[c for point in verts for c in point]
    group=obj.vertex_groups.new(name='Hanger support')
    for index,weight in pins.items():group.add([index],weight,'REPLACE')
    cloth=obj.modifiers.new('Gravity drape','CLOTH')
    cs=cloth.settings
    cs.quality=8;cs.mass=.22;cs.air_damping=2
    cs.tension_stiffness=28;cs.compression_stiffness=28;cs.shear_stiffness=12
    cs.bending_stiffness=.22 if kind in ['hoodie','jacket'] else .24
    cs.tension_damping=8;cs.compression_damping=8;cs.shear_damping=8;cs.bending_damping=.8
    cs.vertex_group_mass=group.name;cs.pin_stiffness=1
    cloth.collision_settings.use_self_collision=True
    cloth.collision_settings.self_distance_min=.003
    cloth.collision_settings.self_friction=5
    cloth.collision_settings.distance_min=.003
    cloth.point_cache.frame_start=1;cloth.point_cache.frame_end=80
    return obj,cloth,body,sleeves,nx,ny,arm


def finish(kind,obj,cloth,body,sleeves,nx,ny,arm):
    apply(obj,cloth)
    # Art-directed rest support retains the width of empty sleeves and a folded
    # hood, while keeping the small wrinkles produced by the cloth solve.
    initial=list(obj['cut_pattern'])
    original=[initial[i:i+3] for i in range(0,len(initial),3)]
    for j in range(3,ny+1):
        t=j/ny
        for i in range(nx+1):
            for back in [False,True]:
                index=body[back,j,i]
                p=list(display(obj.data.vertices[index].co))
                sign=-1 if back else 1
                x=p[0]
                drape=(.027*math.sin(x*16+t*1.7)+.014*math.sin(x*27-t*1.1))*math.sin(t*math.pi/2)
                target=sign*(.075+.030*math.cos(x*2.8))+drape
                p[2]=p[2]*.35+target*.65
                obj.data.vertices[index].co=native(p)
    for (side,back,u,v),index in sleeves.items():
        if u==0:continue
        p=display(obj.data.vertices[index].co)
        amount=.78 if kind=='tee' else .85
        amount*=min(1,u/4)
        q=original[index]
        supported=[p[k]*(1-amount)+q[k]*amount for k in range(3)]
        # Retain a real cuff opening after gravity brings the panels together.
        depth_support=(.82 if kind=='tee' else .93)*min(1,u/5)
        supported[2]=p[2]*(1-depth_support)+q[2]*depth_support
        obj.data.vertices[index].co=native(supported)
    for index in obj['hood_indices']:
        p=display(obj.data.vertices[index].co);q=original[index]
        obj.data.vertices[index].co=native([p[k]*.12+q[k]*.88 for k in range(3)])
    obj.data.update()
    positions=[display(v.co) for v in obj.data.vertices]
    # Binding follows the settled fabric instead of floating above it.
    neck=[positions[body[False,0,i]] for i in range(13,28)]
    neck += [positions[body[True,0,i]] for i in range(27,12,-1)]
    neck.append(neck[0])
    ring=[]
    for j in range(3):
        t=j/2
        ring += [(x*(1+.08*t),y-(.035*t if kind!='jacket' else -.10*(1-t)),z*(1+.08*t)) for x,y,z in neck[:-1]]
    n=len(neck)-1
    collar=mesh_object('Collar',ring,[(j*n+i,j*n+(i+1)%n,(j+1)*n+(i+1)%n,(j+1)*n+i) for j in range(2) for i in range(n)],['Rib'])
    mod=collar.modifiers.new('Soft binding','SUBSURF');mod.levels=2;apply(collar,mod)
    mod=collar.modifiers.new('Binding thickness','SOLIDIFY');mod.thickness=.003;apply(collar,mod)
    # Subdivision rounds cloth folds without inflating the silhouette.
    mod=obj.modifiers.new('Fabric surface','SUBSURF');mod.levels=1;apply(obj,mod)
    mod=obj.modifiers.new('Web surface budget','DECIMATE');mod.ratio=.55;apply(obj,mod)
    mod=obj.modifiers.new('Fabric thickness','SOLIDIFY');mod.thickness=.0012;mod.offset=0;apply(obj,mod)
    for p in obj.data.polygons:p.use_smooth=True
    # Neck label and very fine doubled hem stitch.
    curve('Neck seam',neck,.0014,'Seam')
    for back in [False,True]:
        for row in [ny-1,ny-2]:
            points=[positions[body[back,row,i]] for i in range(nx+1)]
            curve('Hem stitch',points,.0009,'Seam')
    for side in [-1,1]:
        length=16 if kind=='tee' else 30
        for row in [length-1]:
            points=[positions[sleeves[side,False,row,v]] for v in range(arm+1)]
            points += [positions[sleeves[side,True,row,v]] for v in range(arm,-1,-1)]
            points.append(points[0])
            curve('Cuff stitch',points,.0007,'Seam')
    if kind=='jacket':
        points=[positions[body[False,j,nx//2]] for j in range(1,ny)]
        points=[(x,y,z+.007) for x,y,z in points]
        curve('Zip',points,.006,'Hardware')
        p=points[2];curve('Pull',[(p[0]-.014,p[1],p[2]+.005),(p[0]-.014,p[1]-.055,p[2]+.02),(p[0]+.014,p[1]-.055,p[2]+.02),(p[0]+.014,p[1],p[2]+.005)],.004,'Hardware')
    if kind=='jacket':
        for side in [-1,1]:
            cols=range(nx//2+3,nx) if side>0 else range(nx//2-3,0,-1)
            points=[positions[body[False,6,i]] for i in cols]
            curve('Yoke piping',[(x,y,z+.006) for x,y,z in points],.003,'Piping')
            points=[positions[sleeves[side,False,u,3]] for u in range(2,29)]
            curve('Arm piping',[(x,y,z+.006) for x,y,z in points],.004,'Piping')
    if kind=='hoodie':
        ids=list(obj['hood_indices'])
        edge=ids[::33]+list(reversed(ids[32::33]))
        curve('Hood binding',[positions[i] for i in edge],.006,'Rib')
        for side in [-1,1]:
            col=nx//2+side*5
            points=[positions[body[False,j,col]] for j in range(2,19)]
            points=[(x+side*.012*math.sin(n*.3),y,z+.018) for n,(x,y,z) in enumerate(points)]
            curve('Drawstring',points,.006,'Cord')
            curve('Aglet',points[-2:],.008,'Hardware')
        pocket=[]
        for j in range(28,42):
            for i in range(12,29):
                x,y,z=positions[body[False,j,i]]
                pocket.append((x,y,z+.012+.012*math.sin((i-12)/16*math.pi)))
        patch=mesh_object('Pocket',pocket,[(j*17+i,j*17+i+1,(j+1)*17+i+1,(j+1)*17+i) for j in range(13) for i in range(16)],['Fabric'])
        mod=patch.modifiers.new('Pocket surface','SUBSURF');mod.levels=1;apply(patch,mod)
        mod=patch.modifiers.new('Pocket thickness','SOLIDIFY');mod.thickness=.001;apply(patch,mod)
        for i in [0,16]:curve('Pocket edge',[pocket[j*17+i] for j in range(14)],.0016,'Seam')
    # Local ambient occlusion gives folded cloth and collar interiors depth.
    # Bake vertex colours once; the browser performs no ray sampling.
    all_verts=[];all_faces=[]
    for item in bpy.context.scene.objects:
        if item.type!='MESH':continue
        offset=len(all_verts);all_verts.extend(v.co.copy() for v in item.data.vertices)
        all_faces.extend([offset+i for i in face.vertices] for face in item.data.polygons)
    tree=BVHTree.FromPolygons(all_verts,all_faces)
    for item in bpy.context.scene.objects:
        if item.type!='MESH' or len(item.data.vertices)<1000:continue
        mesh=item.data
        colors=mesh.color_attributes.new(name='Cloth occlusion',type='BYTE_COLOR',domain='POINT')
        for v,color in zip(mesh.vertices,colors.data):
            normal=v.normal.normalized()
            tangent=normal.cross(Vector((0,0,1)))
            if tangent.length<.01:tangent=normal.cross(Vector((0,1,0)))
            tangent.normalize();bitangent=normal.cross(tangent)
            origin=v.co+normal*.0018
            shade=0
            for k in range(8):
                a=k*math.tau/8
                direction=(normal*.6+tangent*(.8*math.cos(a))+bitangent*(.8*math.sin(a))).normalized()
                hit,_,_,dist=tree.ray_cast(origin,direction,.10)
                if hit is not None:shade+=(1-dist/.10)/8
            value=1-.48*shade
            color.color=(value,value,value,1)
    # Export real-scale geometry transformed back to the existing showroom units.
    for item in list(bpy.context.scene.objects):
        if item.type=='MESH':
            for v in item.data.vertices:v.co/=SCALE
    bpy.ops.object.select_all(action='SELECT')
    bpy.ops.export_scene.gltf(filepath=os.path.join(OUT,kind+'.glb'),export_format='GLB',use_selection=True,export_yup=True,export_materials='EXPORT',export_animations=False,export_vertex_color='ACTIVE',export_all_vertex_colors=False)
    print('RAIL_EXPORTED',kind,flush=True)


for kind in KINDS:
    bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
    bpy.context.scene.frame_set(1)
    obj,cloth,body,sleeves,nx,ny,arm=pattern(kind)
    for frame in range(1,81):
        bpy.context.scene.frame_set(frame)
        bpy.context.view_layer.update()
        if frame%10==0:print('RAIL_SIM',kind,frame,flush=True)
    finish(kind,obj,cloth,body,sleeves,nx,ny,arm)
