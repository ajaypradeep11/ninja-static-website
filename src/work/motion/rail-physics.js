export const createSpring = (value = 0) => ({ value, velocity: 0 });

export function settleSpring(spring, value = 0) {
  spring.value = value;
  spring.velocity = 0;
  return value;
}

// Small integration steps keep the same weight at 30, 60 and 120 fps.
export function advanceSpring(spring, target, delta, stiffness = 300, damping = 24) {
  const duration = Math.min(Math.max(delta, 0), 0.05);
  const steps = Math.max(1, Math.ceil(duration * 120));
  const dt = duration / steps;
  for (let i = 0; i < steps; i++) {
    spring.velocity += ((target - spring.value) * stiffness - spring.velocity * damping) * dt;
    spring.value += spring.velocity * dt;
  }
  if (Math.abs(target - spring.value) < 0.0001 && Math.abs(spring.velocity) < 0.0001) {
    settleSpring(spring, target);
  }
  return spring.value;
}

// Keep the shoulders fixed; lower fabric and sleeves flex with the hanger's inertia.
export function attachClothMotion(THREE, garment) {
  const bend = { value: new THREE.Vector3() };
  const declarations = `
    uniform vec3 railClothBend;
    vec3 railDeform(vec3 p) {
      float drop = clamp((0.5 - p.y) / 1.65, 0.0, 1.0);
      float weight = drop * drop;
      float ripple = sin(p.y * 9.0 + p.x * 4.0) * drop * 0.12;
      return p + vec3(
        railClothBend.x * weight,
        0.0,
        railClothBend.y * (weight + ripple) + railClothBend.z * p.x * weight
      );
    }
  `;
  const deform = (shader, normals) => {
    shader.uniforms.railClothBend = bend;
    shader.vertexShader = declarations + shader.vertexShader;
    shader.vertexShader = shader.vertexShader.replace(
      '#include <begin_vertex>',
      'vec3 transformed = railDeform(position);',
    );
    if (normals) {
      shader.vertexShader = shader.vertexShader.replace(
        '#include <beginnormal_vertex>',
        `#include <beginnormal_vertex>
        vec3 railAxis = abs(objectNormal.y) < 0.99 ? vec3(0.0, 1.0, 0.0) : vec3(1.0, 0.0, 0.0);
        vec3 railTangent = normalize(cross(railAxis, objectNormal));
        vec3 railBitangent = normalize(cross(objectNormal, railTangent));
        vec3 railOrigin = railDeform(position);
        objectNormal = normalize(cross(
          railDeform(position + railTangent * 0.003) - railOrigin,
          railDeform(position + railBitangent * 0.003) - railOrigin
        ));`,
      );
    }
  };
  const depth = new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking });
  depth.onBeforeCompile = (shader) => deform(shader, false);
  depth.customProgramCacheKey = () => 'rail-cloth-depth-v1';
  const materials = new Set();
  garment.traverse((mesh) => {
    if (!mesh.isMesh) return;
    materials.add(mesh.material);
    mesh.customDepthMaterial = depth;
  });
  materials.forEach((material) => {
    material.onBeforeCompile = (shader) => deform(shader, true);
    material.customProgramCacheKey = () => 'rail-cloth-v1';
    material.needsUpdate = true;
  });
  return { bend: bend.value, dispose: () => depth.dispose() };
}
