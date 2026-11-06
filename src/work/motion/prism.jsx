import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import Scene from "./Scene.jsx";
import { useMotionEnabled } from "./runtime.jsx";
import "./prism.css";

const finishes = {
  Clear: {
    color: "#d8e1d9",
    caption: "The absence of colour. The presence of everything else.",
    code: "CR—01",
  },
  Rose: {
    color: "#d58eab",
    caption: "A warmer way of looking. Rose, held in suspension.",
    code: "RS—02",
  },
  Cobalt: {
    color: "#5865d8",
    caption: "A deep blue thought, made unexpectedly tangible.",
    code: "CB—03",
  },
};

function buildPrism({ THREE, scene, camera }) {
  scene.children
    .filter((object) => object.isLight)
    .forEach((light) => {
      light.intensity *= 0.3;
    });
  const studio = document.createElement("canvas");
  studio.width = 1024;
  studio.height = 512;
  const lightMap = studio.getContext("2d");
  lightMap.fillStyle = "#252b31";
  lightMap.fillRect(0, 0, 1024, 512);
  lightMap.fillStyle = "#ffffff";
  lightMap.fillRect(80, 0, 100, 512);
  lightMap.fillRect(620, 40, 240, 420);
  lightMap.fillStyle = "#b1c5c7";
  lightMap.fillRect(320, 0, 90, 512);
  const reflection = new THREE.CanvasTexture(studio);
  reflection.mapping = THREE.EquirectangularReflectionMapping;
  reflection.colorSpace = THREE.SRGBColorSpace;
  scene.environment = reflection;
  camera.position.set(0, 0.15, 8.8);
  camera.lookAt(0, 0, 0);
  const assembly = new THREE.Group();
  scene.add(assembly);
  const material = new THREE.MeshPhysicalMaterial({
    color: "#d8e1d9",
    metalness: 0.15,
    roughness: 0.035,
    transmission: 0.82,
    thickness: 0.55,
    ior: 1.52,
    envMapIntensity: 1.8,
    clearcoat: 1,
    clearcoatRoughness: 0.05,
    iridescence: 0.42,
    iridescenceIOR: 1.35,
    iridescenceThicknessRange: [130, 400],
    attenuationColor: new THREE.Color("#c3d1c7"),
    attenuationDistance: 8,
    side: THREE.DoubleSide,
  });
  // A cut-corner aperture gives each piece eight distinct refracting faces.
  function outline(path, size, inset = false) {
    const half = size / 2;
    const cut = size * 0.21;
    const points = [
      [-half + cut, -half],
      [half - cut, -half],
      [half, -half + cut],
      [half, half - cut],
      [half - cut, half],
      [-half + cut, half],
      [-half, half - cut],
      [-half, -half + cut],
    ];
    if (inset) points.reverse();
    points.forEach(([x, y], index) =>
      index ? path.lineTo(x, y) : path.moveTo(x, y),
    );
    path.closePath();
  }
  const shape = new THREE.Shape();
  outline(shape, 2.55);
  const aperture = new THREE.Path();
  outline(aperture, 1.65, true);
  shape.holes.push(aperture);
  const geometry = new THREE.ExtrudeGeometry(shape, {
    depth: 0.54,
    bevelEnabled: true,
    bevelSegments: 1,
    steps: 1,
    bevelSize: 0.12,
    bevelThickness: 0.12,
    curveSegments: 1,
  });
  geometry.center();
  const pieces = [];
  const placements = [
    { y: -0.85, z: 0.2, rotation: -0.35, scale: 1.03 },
    { y: 0, z: -0.18, rotation: 0.42, scale: 0.98 },
    { y: 0.83, z: -0.04, rotation: -0.18, scale: 0.88 },
  ];
  placements.forEach((base, index) => {
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(0, base.y, base.z);
    mesh.rotation.set(-0.1 + index * 0.19, 0.42 - index * 0.21, base.rotation);
    mesh.scale.setScalar(base.scale);
    assembly.add(mesh);
    pieces.push({ mesh, base });
  });
  assembly.rotation.set(0.18, -0.43, -0.12);
  const softbox = new THREE.DirectionalLight("#fff6e7", 0.8);
  softbox.position.set(-4, 5, 5);
  scene.add(softbox);
  const rim = new THREE.PointLight("#e6ff92", 30, 20);
  rim.position.set(3, -1, -3);
  scene.add(rim);
  const colorTarget = new THREE.Color();
  let separation = 0;
  return {
    dispose() {
      reflection.dispose();
    },
    update({ time, delta, pointer, settings, reducedMotion }) {
      const speed = reducedMotion ? 1 : 1 - Math.exp(-delta * 6);
      const finish = finishes[settings.finish] || finishes.Clear;
      colorTarget.set(finish.color);
      material.color.lerp(colorTarget, speed);
      material.attenuationColor.lerp(colorTarget, speed);
      separation += ((settings.exploded ? 1 : 0) - separation) * speed;
      pieces.forEach(({ mesh, base }, index) => {
        mesh.position.y = base.y + (index - 1) * separation * 0.56;
        mesh.position.x = (index - 1) * separation * 0.39;
        mesh.position.z = base.z + (index - 1) * separation * 0.3;
        mesh.rotation.z = base.rotation + (index - 1) * separation * 0.2;
      });
      const targetY =
        -0.43 +
        (reducedMotion ? 0 : Math.sin(time * 0.23) * 0.17 + pointer.x * 0.3);
      const targetX = 0.18 + (reducedMotion ? 0 : pointer.y * 0.1);
      assembly.rotation.y += (targetY - assembly.rotation.y) * speed;
      assembly.rotation.x += (targetX - assembly.rotation.x) * speed;
      assembly.position.y = reducedMotion ? 0 : Math.sin(time * 0.65) * 0.055;
      assembly.scale.setScalar(1 - separation * 0.12);
    },
  };
}

const Arrow = () => (
  <svg viewBox="0 0 32 32" aria-hidden="true">
    <path
      d="M6 25 25 6M6 6h19v19"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
    />
  </svg>
);

export default function Prism() {
  const [finish, setFinish] = useState("Clear");
  const [exploded, setExploded] = useState(false);
  const motionEnabled = useMotionEnabled();
  const appearance = {
    initial: motionEnabled ? { opacity: 0, y: 18 } : false,
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.7 },
  };

  return (
    <div className="prism-page">
      <header className="prism-header">
        <a
          className="prism-wordmark"
          href="#main"
          aria-label="Prism atelier, back to top"
        >
          <span className="prism-mark" aria-hidden="true" />
          PRISM<span className="prism-wordmark-dot">®</span>
        </a>
        <span className="prism-header-note">
          An independent object atelier.
        </span>
        <a href="#prism-notes" className="prism-nav-link">
          Material matters <span aria-hidden="true">↗</span>
        </a>
      </header>

      <main id="main">
        <section className="prism-hero" aria-labelledby="prism-heading">
          <div className="prism-hero-copy">
            <motion.p {...appearance} className="prism-eyebrow">
              <span /> EDITION 001 / THE LIGHT STUDIES
            </motion.p>
            <motion.h1
              {...appearance}
              transition={{ duration: 0.85, delay: motionEnabled ? 0.1 : 0 }}
              id="prism-heading"
            >
              Nothing
              <br /> is quite
              <br />
              <em>solid.</em>
            </motion.h1>
            <motion.p
              {...appearance}
              transition={{ duration: 0.7, delay: motionEnabled ? 0.25 : 0 }}
              className="prism-intro"
            >
              Objects that hold light.
              <br />
              And make you look twice.
            </motion.p>
            <a className="prism-discover" href="#prism-notes">
              <span className="prism-arrow-circle">
                <Arrow />
              </span>
              <span>
                A study in
                <br />
                beautiful contradictions
              </span>
            </a>
          </div>

          <div className="prism-specimen">
            <div className="prism-specimen-top">
              <span>NO. 001 — INTERLOCK</span>
              <span className="prism-edition">A 3D MATERIAL STUDY</span>
            </div>
            <div className="prism-stage">
              <div className="prism-registration prism-registration-tl" />
              <div className="prism-registration prism-registration-tr" />
              <div className="prism-registration prism-registration-bl" />
              <div className="prism-registration prism-registration-br" />
              <span className="prism-dimension">320 MM</span>
              <span className="prism-object-number" aria-hidden="true">
                01
              </span>
              <Scene
                build={buildPrism}
                settings={{ finish, exploded }}
                label={`Interlocking faceted glass sculpture in ${finish.toLowerCase()} finish${exploded ? ", separated to reveal three components" : ""}`}
                className="prism-canvas"
              />
              <div className="prism-stage-caption">
                <span>
                  {exploded
                    ? "THREE FORMS. ONE CONVERSATION."
                    : "A DIFFERENT VIEW, AT EVERY ANGLE."}
                </span>
                <span aria-hidden="true">⊕</span>
              </div>
            </div>
            <div className="prism-product-controls">
              <div className="prism-product-name">
                <span className="prism-eyebrow">THE FINISH</span>
                <AnimatePresence mode="wait">
                  <motion.p
                    key={finish}
                    initial={motionEnabled ? { opacity: 0, y: 8 } : false}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: motionEnabled ? -8 : 0 }}
                    transition={{ duration: motionEnabled ? 0.17 : 0 }}
                  >
                    {finish}
                    <span>{finishes[finish].code}</span>
                  </motion.p>
                </AnimatePresence>
              </div>
              <div
                className="prism-finishes"
                role="group"
                aria-label="Glass finish"
              >
                {Object.entries(finishes).map(([name, value]) => (
                  <motion.button
                    key={name}
                    className={`prism-swatch ${finish === name ? "is-selected" : ""}`}
                    style={{ "--prism-swatch": value.color }}
                    onClick={() => setFinish(name)}
                    aria-label={`${name} finish`}
                    aria-pressed={finish === name}
                    whileTap={motionEnabled ? { scale: 0.92 } : undefined}
                  >
                    <span />
                    <span className="prism-swatch-label">{name}</span>
                  </motion.button>
                ))}
              </div>
              <button
                className={`prism-inspect ${exploded ? "is-inspecting" : ""}`}
                onClick={() => setExploded((value) => !value)}
                aria-pressed={exploded}
              >
                <span aria-hidden="true">{exploded ? "⊟" : "⊞"}</span>
                {exploded ? "Assemble" : "Take a closer look"}
              </button>
            </div>
            <p className="prism-finish-caption" aria-live="polite">
              {finishes[finish].caption}
            </p>
          </div>
        </section>

        <section
          id="prism-notes"
          className="prism-notes"
          aria-labelledby="prism-notes-title"
        >
          <div className="prism-notes-index">
            <span>ON MATERIAL</span>
            <span>01—03</span>
          </div>
          <motion.div
            className="prism-notes-copy"
            initial={motionEnabled ? { opacity: 0, y: 25 } : false}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.2 }}
            transition={{ duration: 0.7 }}
          >
            <h2 id="prism-notes-title">
              Less object.
              <br />
              <em>More possibility.</em>
            </h2>
            <p>
              Three cut forms. No fixed perspective. Interlock explores what
              happens when a familiar material becomes a little less familiar.
              Edges turn into colour. Empty space takes on weight. Light does
              the rest.
            </p>
          </motion.div>
          <dl className="prism-specs">
            <div>
              <dt>Composition</dt>
              <dd>Three interlocking forms</dd>
            </div>
            <div>
              <dt>Material study</dt>
              <dd>Optical glass / IOR 1.52</dd>
            </div>
            <div>
              <dt>Dimensions</dt>
              <dd>180 × 180 × 320 mm</dd>
            </div>
            <div>
              <dt>Available finishes</dt>
              <dd>Clear / Rose / Cobalt</dd>
            </div>
          </dl>
        </section>
        <footer className="prism-footer">
          <span>PRISM — OBJECTS IN A DIFFERENT LIGHT.</span>
          <span>A digital material study. © 2026</span>
        </footer>
      </main>
    </div>
  );
}
