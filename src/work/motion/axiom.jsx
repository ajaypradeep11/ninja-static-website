import React, { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import Scene from "./Scene.jsx";
import { useMotionEnabled } from "./runtime.jsx";
import "./axiom.css";

const experiments = [
  {
    name: "Lattice",
    code: "AX—001",
    title: "Order, entangled.",
    description:
      "A continuous knot. Thousands of intersections. One surface that refuses to stand still.",
    geometry: "Trefoil / woven surface",
    count: "4,320",
  },
  {
    name: "Flow",
    code: "AX—002",
    title: "Nothing holds its shape.",
    description:
      "A family of concentric paths bends into a single field. Change the tension to find its breaking point.",
    geometry: "Orbital / contour field",
    count: "6,144",
  },
  {
    name: "Structure",
    code: "AX—003",
    title: "A system under stress.",
    description:
      "A stack of measured grids twists against its own logic. Even a rigid system has room to move.",
    geometry: "Cubic / axial skeleton",
    count: "1,344",
  },
];

function buildAxiom({ THREE, scene, camera }) {
  camera.position.set(0, 0, 8.8);
  const sculpture = new THREE.Group();
  scene.add(sculpture);
  const material = new THREE.LineBasicMaterial({
    color: 0xff593a,
    transparent: true,
    opacity: 0.88,
    toneMapped: false,
  });
  const knotSource = new THREE.TorusKnotGeometry(1.4, 0.44, 180, 12, 2, 3);
  const knot = new THREE.WireframeGeometry(knotSource);
  knotSource.dispose();

  const flowPoints = [];
  const put = (target, a, b) => target.push(...a, ...b);
  for (let ring = 0; ring < 32; ring++) {
    const radius = 0.24 + ring * 0.061;
    const point = (angle) => [
      radius * Math.cos(angle),
      radius * Math.sin(angle) * 0.8,
      Math.cos(angle * 3 + ring * 0.11) * (0.2 + ring * 0.022),
    ];
    for (let i = 0; i < 96; i++)
      put(
        flowPoints,
        point((i / 96) * Math.PI * 2),
        point(((i + 1) / 96) * Math.PI * 2),
      );
  }
  const flow = new THREE.BufferGeometry();
  flow.setAttribute(
    "position",
    new THREE.Float32BufferAttribute(flowPoints, 3),
  );

  const structurePoints = [];
  const side = 1.45;
  for (let layer = 0; layer < 15; layer++) {
    const y = (layer / 14 - 0.5) * 3;
    const corners = [
      [-side, y, -side],
      [side, y, -side],
      [side, y, side],
      [-side, y, side],
    ];
    corners.forEach((corner, i) =>
      put(structurePoints, corner, corners[(i + 1) % 4]),
    );
    for (let grid = 0; grid < 8; grid++) {
      const d = (grid / 7 - 0.5) * 2 * side;
      put(structurePoints, [-side, y, d], [side, y, d]);
      put(structurePoints, [d, y, -side], [d, y, side]);
    }
  }
  const structure = new THREE.BufferGeometry();
  structure.setAttribute(
    "position",
    new THREE.Float32BufferAttribute(structurePoints, 3),
  );
  const meshes = [knot, flow, structure].map((geometry) => {
    const mesh = new THREE.LineSegments(geometry, material);
    mesh.userData.base = geometry.attributes.position.array.slice();
    mesh.frustumCulled = false;
    sculpture.add(mesh);
    return mesh;
  });
  let previous = "";
  return {
    update({ time, pointer, settings, reducedMotion }) {
      const variant = settings.variant ?? 0;
      const tension = (settings.tension ?? 42) / 100;
      meshes.forEach((mesh, index) => {
        mesh.visible = index === variant;
      });
      const signature = `${variant}-${tension}`;
      if (signature !== previous) {
        const mesh = meshes[variant];
        const attribute = mesh.geometry.attributes.position;
        const original = mesh.userData.base;
        for (let i = 0; i < original.length; i += 3) {
          const x = original[i],
            y = original[i + 1],
            z = original[i + 2];
          const twist = y * tension * (variant === 2 ? 1.15 : 0.45);
          attribute.array[i] = x * Math.cos(twist) - z * Math.sin(twist);
          attribute.array[i + 1] = y * (1 + tension * 0.18);
          attribute.array[i + 2] =
            x * Math.sin(twist) +
            z * Math.cos(twist) +
            (variant === 1 ? Math.sin(x * 2.5) * tension * 0.7 : 0);
        }
        attribute.needsUpdate = true;
        previous = signature;
      }
      sculpture.rotation.set(
        -0.27 + pointer.y * 0.08,
        0.35 + (reducedMotion ? 0 : time * 0.075) + pointer.x * 0.15,
        -0.15,
      );
    },
  };
}

function Diagram({ variant }) {
  return (
    <svg viewBox="0 0 60 48" fill="none" aria-hidden="true">
      {variant === 0 ? (
        Array.from({ length: 6 }, (_, i) => (
          <ellipse
            key={i}
            cx="30"
            cy="24"
            rx="19"
            ry="9"
            transform={`rotate(${i * 30} 30 24)`}
          />
        ))
      ) : variant === 1 ? (
        Array.from({ length: 5 }, (_, i) => (
          <ellipse
            key={i}
            cx="30"
            cy="24"
            rx={8 + i * 4}
            ry={3 + i * 3}
            transform="rotate(-25 30 24)"
          />
        ))
      ) : (
        <>
          <path d="M12 13 31 5 48 15 48 35 29 43 12 33Z M12 13 29 23 48 15 M29 23V43 M21 9 39 19V39 M12 23 29 33 48 25" />
        </>
      )}
    </svg>
  );
}

export default function Axiom() {
  const enabled = useMotionEnabled();
  const [variant, setVariant] = useState(0);
  const [tension, setTension] = useState(42);
  const [openNote, setOpenNote] = useState(0);
  const experiment = experiments[variant];
  const reveal = {
    initial: enabled ? { opacity: 0, y: 20 } : false,
    whileInView: { opacity: 1, y: 0 },
    viewport: { once: true },
    transition: { duration: 0.65 },
  };
  return (
    <div className="axiom-page">
      <header className="axiom-header">
        <a className="axiom-brand" href="#main" aria-label="AXIOM home">
          {" "}
          AXIOM<span className="axiom-brand-index">®</span>
        </a>
        <span className="axiom-header-discipline">
          Independent digital practice
          <br />
          Form. Code. Consequence.
        </span>
        <nav aria-label="AXIOM navigation">
          <a href="#axiom-experiments">
            Experiments <span>03</span>
          </a>
          <a href="#axiom-notes">Field notes ↗</a>
        </nav>
      </header>
      <main id="main">
        <section
          className="axiom-hero"
          id="axiom-experiments"
          aria-labelledby="axiom-title"
        >
          <div className="axiom-coordinate">
            <span>RESEARCH INDEX / VOL. 001</span>
            <span className="axiom-live">
              <i /> LIVE SPECIMEN
            </span>
          </div>
          <motion.h1
            id="axiom-title"
            initial={enabled ? { opacity: 0, y: 26 } : false}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.85, ease: [0.16, 1, 0.3, 1] }}
          >
            FORM
            <br />
            <span>UNDER</span>
            <br />
            TENSION<span className="axiom-period">.</span>
          </motion.h1>
          <div className="axiom-artwork">
            <span className="axiom-cross axiom-cross-one" aria-hidden="true">
              +
            </span>
            <span className="axiom-cross axiom-cross-two" aria-hidden="true">
              +
            </span>
            <Scene
              build={buildAxiom}
              settings={{ variant, tension }}
              className="axiom-sculpture"
              label={`${experiment.name}: orange wire sculpture with ${tension} percent tension`}
            />
            <span className="axiom-axis" aria-hidden="true">
              Y ↑<br />
              └── X
            </span>
            <span className="axiom-art-label">
              [ {experiment.code} ]<br />
              {experiment.geometry}
            </span>
          </div>
          <div className="axiom-selector" aria-label="Choose an experiment">
            <p>
              SELECT A STUDY <span>↓</span>
            </p>
            {experiments.map((item, index) => (
              <motion.button
                type="button"
                key={item.name}
                aria-pressed={variant === index}
                onClick={() => setVariant(index)}
                whileHover={enabled ? { x: 4 } : undefined}
                whileTap={enabled ? { scale: 0.98 } : undefined}
              >
                <span className="axiom-study-number">0{index + 1}</span>
                <Diagram variant={index} />
                <span>{item.name}</span>
                <span className="axiom-study-arrow" aria-hidden="true">
                  ↗
                </span>
              </motion.button>
            ))}
          </div>
          <div className="axiom-console">
            <div className="axiom-current" aria-live="polite">
              <span className="axiom-meta">CURRENT EXPERIMENT</span>
              <AnimatePresence mode="wait">
                <motion.p
                  key={variant}
                  initial={{ opacity: 0, y: enabled ? 8 : 0 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: enabled ? -8 : 0 }}
                  transition={{ duration: 0.16 }}
                >
                  {experiment.title}
                </motion.p>
              </AnimatePresence>
            </div>
            <div className="axiom-tension">
              <label htmlFor="axiom-tension">
                TENSION{" "}
                <output htmlFor="axiom-tension">
                  {String(tension).padStart(3, "0")}
                  <span>%</span>
                </output>
              </label>
              <input
                id="axiom-tension"
                type="range"
                min="0"
                max="100"
                value={tension}
                onChange={(event) => setTension(Number(event.target.value))}
                aria-valuetext={`${tension} percent`}
              />
              <div>
                <span>RELAXED</span>
                <span>COMPRESSED</span>
              </div>
            </div>
            <p className="axiom-console-note">
              Move your cursor to shift perspective.
              <br />
              Change the parameters. Find a new form.
            </p>
          </div>
        </section>
        <section
          className="axiom-manifesto"
          id="axiom-notes"
          aria-labelledby="axiom-notes-title"
        >
          <motion.div className="axiom-notes-heading" {...reveal}>
            <p className="axiom-meta">[ FIELD NOTES / 01—03 ]</p>
            <h2 id="axiom-notes-title">
              Less certainty.
              <br />
              <em>More possibility.</em>
            </h2>
            <p>
              We work at the intersection of design and computation. These are
              experiments in what happens when a system meets something it can’t
              quite contain.
            </p>
            <span className="axiom-notes-symbol" aria-hidden="true">
              ↗
            </span>
          </motion.div>
          <div className="axiom-notes-list">
            {experiments.map((item, index) => (
              <motion.article key={item.code} {...reveal}>
                <h3>
                  <button
                    type="button"
                    aria-expanded={openNote === index}
                    aria-controls={`axiom-note-${index}`}
                    onClick={() => setOpenNote(openNote === index ? -1 : index)}
                  >
                    <span>0{index + 1}</span>
                    {item.name}
                    <span aria-hidden="true">
                      {openNote === index ? "−" : "+"}
                    </span>
                  </button>
                </h3>
                <AnimatePresence>
                  {openNote === index && (
                    <motion.div
                      id={`axiom-note-${index}`}
                      initial={{ opacity: 0, y: enabled ? 6 : 0 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.18 }}
                    >
                      <p>{item.description}</p>
                      <a
                        href="#axiom-experiments"
                        onClick={() => setVariant(index)}
                      >
                        Explore this study <span>↗</span>
                      </a>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.article>
            ))}
          </div>
        </section>
        <footer className="axiom-footer">
          <span>AXIOM® — INDEPENDENT BY DESIGN.</span>
          <span>NO FINAL FORM.</span>
          <a href="#main">BACK TO TOP ↑</a>
        </footer>
      </main>
    </div>
  );
}
