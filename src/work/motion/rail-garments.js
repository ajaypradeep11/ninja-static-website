import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";

const garmentType = (piece) =>
  piece.shape === "long" ? (piece.pattern === "track" ? "jacket" : "knit") : piece.shape;

function weaveTexture(THREE) {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = 64;
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "#808080";
  ctx.fillRect(0, 0, 64, 64);
  for (let y = 0; y < 64; y += 4) {
    for (let x = 0; x < 64; x += 4) {
      ctx.fillStyle = (x + y) % 8 ? "#ababab" : "#606060";
      ctx.fillRect(x, y, 2, 3);
    }
  }
  const map = new THREE.CanvasTexture(canvas);
  map.wrapS = map.wrapT = THREE.RepeatWrapping;
  map.repeat.set(28, 28);
  map.anisotropy = 4;
  return map;
}

function dress(THREE, template, piece, weave) {
  const model = template.clone(true);
  const base = new THREE.Color(piece.color);
  const fabric = new THREE.MeshPhysicalMaterial({
    map: fabricTexture(THREE, piece),
    roughness: 0.93,
    metalness: 0,
    vertexColors: true,
    sheen: 0.3,
    sheenColor: base.clone().lerp(new THREE.Color("#ffffff"), 0.2),
    sheenRoughness: 0.85,
    bumpMap: weave,
    bumpScale: piece.pattern === "check" ? 0.004 : 0.0015,
  });
  const plain = fabric.clone();
  plain.map = null;
  plain.color.copy(base);
  const rib = plain.clone();
  rib.color.copy(piece.pattern === "bloom" ? new THREE.Color("#34425a") : base.clone().multiplyScalar(0.82));
  rib.bumpScale = 0.004;
  const back = fabric.clone();
  back.map = fabricTexture(THREE, piece, true);
  const materials = {
    Fabric: fabric,
    FabricBack: back,
    Hood: plain,
    Rib: rib,
    Seam: new THREE.MeshStandardMaterial({ color: base.clone().multiplyScalar(0.75), roughness: 1 }),
    Cord: new THREE.MeshStandardMaterial({ color: "#d7d2bd", roughness: 0.95 }),
    Hardware: new THREE.MeshStandardMaterial({ color: "#adb5af", roughness: 0.3, metalness: 0.85 }),
    Piping: new THREE.MeshStandardMaterial({ color: piece.ink, roughness: 0.65 }),
  };
  const used = new Set();
  model.traverse((mesh) => {
    if (!mesh.isMesh) return;
    mesh.material = materials[mesh.material.name.replace(/\.\d+$/, "")] || materials[mesh.name] || fabric;
    used.add(mesh.material);
    mesh.castShadow = mesh.receiveShadow = true;
  });
  Object.values(materials).forEach((mat) => { if (!used.has(mat)) mat.dispose(); });
  return model;
}

function disposeTemplate(template, geometry = true) {
  template.traverse((mesh) => {
    if (!mesh.isMesh) return;
    if (geometry) mesh.geometry.dispose();
    mesh.material.dispose();
  });
}

// Each Scene owns its geometry; clones within that scene share the four templates.
// Late arrivals are disposed after unmount, including React StrictMode cleanups.
export function loadGarments({ THREE, scene, camera, renderer, pieces, onLoad }) {
  let cancelled = false;
  const host = renderer.domElement.parentElement;
  host.dataset.garments = "loading";
  const loader = new GLTFLoader();
  const types = [...new Set(pieces.map(garmentType))];
  Promise.allSettled(types.map((type) => loader.loadAsync(`/work/motion-lab/rail/${type}.glb?v=long-sleeves-v5`)))
    .then((results) => {
      if (cancelled || results.some((result) => result.status === "rejected")) {
        results.forEach((result) => {
          if (result.status === "fulfilled") disposeTemplate(result.value.scene);
        });
        if (!cancelled) {
          host.dataset.garments = "error";
          host.dataset.status = "fallback";
          console.warn("RAIL garment files could not be loaded.");
        }
        return;
      }
      const weave = weaveTexture(THREE);
      const templates = Object.fromEntries(results.map((result, i) => [types[i], result.value.scene]));
      pieces.forEach((piece, i) => onLoad(dress(THREE, templates[garmentType(piece)], piece, weave), i));
      Object.values(templates).forEach((template) => disposeTemplate(template, false));
      host.dataset.garments = "ready";
      renderer.render(scene, camera); // Also paints async assets while motion is paused.
    });
  return () => { cancelled = true; };
}

export function buildPiecePreview({ THREE, scene, camera, renderer }) {
  scene.environmentIntensity = 0.28;
  renderer.toneMappingExposure = 1;
  scene.children.find((light) => light.isHemisphereLight).intensity = 0.3;
  const lights = scene.children.filter((light) => light.isDirectionalLight);
  lights[0].position.set(-5, 4, 4);
  lights[0].intensity = 3.2;
  lights[0].color.set(0xfff5e8);
  lights[1].position.set(4, 3, -3);
  lights[1].intensity = 2.2;
  lights[1].color.set(0xe2eaff);
  const root = new THREE.Group();
  scene.add(root);
  let cancelLoad, initialized = false, target = 0;
  return {
    update({ settings, delta, reducedMotion }) {
      if (!initialized) {
        initialized = true;
        cancelLoad = loadGarments({
          THREE, scene, camera, renderer, pieces: [settings.piece],
          onLoad(garment) {
            root.add(garment);
          },
        });
      }
      target = settings.back ? Math.PI : -0.12;
      const blend = reducedMotion ? 1 : 1 - Math.exp(-Math.max(delta, 0.016) * 8);
      root.rotation.y += (target - root.rotation.y) * blend;
      const width = 2 * Math.tan(camera.fov * Math.PI / 360) * camera.aspect;
      camera.position.set(0, 0.4, Math.max(4.6, 2.6 / width));
      camera.lookAt(0, -0.15, 0);
    },
    dispose() { cancelLoad?.(); },
  };
}

function fabricTexture(THREE, piece, back = false) {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = 512;
  const c = canvas.getContext("2d");
  c.fillStyle = piece.color;
  c.fillRect(0, 0, 512, 512);
  c.strokeStyle = piece.ink;
  c.fillStyle = piece.ink;
  if (piece.pattern === "check") {
    for (let y = 0; y < 8; y++)
      for (let x = 0; x < 8; x++)
        if ((x + y) % 2) c.fillRect(x * 64, y * 64, 64, 64);
  } else if (piece.pattern === "orbit") {
    c.lineWidth = 3;
    for (let i = 0; i < 4; i++) {
      c.beginPath();
      c.ellipse(
        255,
        235,
        135 + i * 9,
        58 + i * 7,
        -0.8 + i * 0.3,
        0,
        Math.PI * 2,
      );
      c.stroke();
    }
  } else if (piece.pattern === "contour") {
    c.lineWidth = 9;
    for (let i = 0; i < 5; i++) {
      c.beginPath();
      c.moveTo(40 + i * 112, 0);
      c.bezierCurveTo(290 - i * 35, 220, 75 + i * 90, 180, 62 + i * 110, 512);
      c.stroke();
    }
    c.lineWidth = 17;
    c.beginPath();
    c.moveTo(0, 180);
    c.bezierCurveTo(180, 290, 330, 20, 512, 110);
    c.stroke();
  } else if (piece.pattern === "track") {
    c.fillStyle = piece.ink;
    if (!back) c.fillRect(310, 170, 23, 4);
  } else if (piece.pattern === "flame") {
    for (let x = 0; x < 512; x += 48) {
      c.beginPath();
      c.moveTo(x, 512);
      c.bezierCurveTo(x - 18, 405, x + 55, 395, x + 18, 310 + (x % 90));
      c.bezierCurveTo(x + 88, 390, x + 10, 435, x + 46, 512);
      c.fill();
    }
  } else if (piece.pattern === "bloom") {
    // Layered dye clouds, with irregular soft edges rather than stamped ellipses.
    const base = new THREE.Color(piece.color);
    const ink = new THREE.Color(piece.ink);
    base.convertLinearToSRGB();
    ink.convertLinearToSRGB();
    const pixels = c.getImageData(0, 0, 512, 512);
    const hash = (x, y) => {
      const n = Math.sin(x * 127.1 + y * 311.7) * 43758.5453;
      return n - Math.floor(n);
    };
    const noise = (x, y) => {
      const ix = Math.floor(x), iy = Math.floor(y);
      let fx = x - ix, fy = y - iy;
      fx = fx * fx * (3 - 2 * fx);
      fy = fy * fy * (3 - 2 * fy);
      const a = hash(ix, iy), b = hash(ix + 1, iy);
      const d = hash(ix, iy + 1), e = hash(ix + 1, iy + 1);
      return (a + (b - a) * fx) * (1 - fy) + (d + (e - d) * fx) * fy;
    };
    for (let y = 0; y < 512; y++) {
      for (let x = 0; x < 512; x++) {
        const cloud = noise(x / 37, y / 49) * 0.6 + noise(x / 16, y / 21) * 0.28 + noise(x / 6, y / 8) * 0.12;
        const mix = Math.max(0, Math.min(1, (cloud - 0.44) * 4));
        const grain = 0.96 + hash(x, y) * 0.08;
        const offset = (y * 512 + x) * 4;
        for (let channel = 0; channel < 3; channel++) {
          const key = ["r", "g", "b"][channel];
          pixels.data[offset + channel] = 255 * (base[key] * (1 - mix) + ink[key] * mix) * grain;
        }
      }
    }
    c.putImageData(pixels, 0, 0);
  }
  c.fillStyle = piece.pattern === "word" ? piece.ink : "#333a32";
  c.font = "bold 9px Arial";
  c.textAlign = "center";
  if (!back) c.fillText(
    piece.pattern === "word" ? "R A I L  /  A R C H I V E" : "RAIL®",
    piece.pattern === "word" ? 256 : 302,
    178,
  );
  // Deterministic fine cotton weave, kept subtle enough to avoid shimmer.
  for (let n = 0; n < 17000; n++) {
    const x = (n * 71.37) % 512,
      y = (n * 49.71) % 512;
    c.fillStyle = n % 2 ? "#ffffff0a" : "#00000009";
    c.fillRect(x, y, 1, 2);
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.flipY = false;
  texture.anisotropy = 4;
  return texture;
}
