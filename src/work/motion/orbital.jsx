import React, { useRef, useState } from "react";
import {
  AnimatePresence,
  motion,
  useScroll,
  useSpring,
  useTransform,
} from "motion/react";
import Scene from "./Scene.jsx";
import { useMotionEnabled } from "./runtime.jsx";
import "./orbital.css";

const worlds = [
  {
    name: "Common Ground",
    category: "Identity / Digital",
    year: "2026",
    color: "#234bea",
    background: "#d6e6f4",
    number: "01",
    title: "A little space for everyone.",
    text: "A new identity and digital home for a different kind of architecture practice. Built around the connections between people, places, and possibility.",
    detail: "Identity system · Art direction · Web design",
    className: "ground",
  },
  {
    name: "Soft Signal",
    category: "Culture / Experience",
    year: "2026",
    color: "#c13c25",
    background: "#eedcd1",
    number: "02",
    title: "Turn the feeling all the way up.",
    text: "An independent music platform with an identity you can almost hear. Tactile forms, an expressive rhythm, and room for the unexpected.",
    detail: "Strategy · Visual identity · Interactive design",
    className: "signal",
  },
  {
    name: "New Matter",
    category: "Objects / Direction",
    year: "2025",
    color: "#4b6e26",
    background: "#e0e6d3",
    number: "03",
    title: "Good things take a new shape.",
    text: "A material-first collection that gives everyday objects a second life. A considered brand world for a studio rethinking what comes next.",
    detail: "Art direction · Packaging · Digital design",
    className: "matter",
  },
];

function buildOrbital({ THREE, scene, camera }) {
  camera.position.set(0, 0, 8.7);
  camera.fov = 39;
  camera.updateProjectionMatrix();
  const group = new THREE.Group();
  scene.add(group);
  const blue = new THREE.MeshPhysicalMaterial({
    color: 0x234bea,
    metalness: 0.28,
    roughness: 0.14,
    clearcoat: 1,
    clearcoatRoughness: 0.12,
  });
  const chrome = new THREE.MeshStandardMaterial({
    color: 0xe2e6ee,
    metalness: 1,
    roughness: 0.2,
  });
  const white = new THREE.MeshPhysicalMaterial({
    color: 0xf7f7ee,
    metalness: 0.18,
    roughness: 0.27,
    side: THREE.DoubleSide,
    clearcoat: 0.5,
  });
  const dark = new THREE.MeshStandardMaterial({
    color: 0x142d49,
    metalness: 0.4,
    roughness: 0.38,
  });
  const objects = [];
  function add(geometry, material, position) {
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(...position);
    group.add(mesh);
    objects.push(mesh);
    return mesh;
  }
  const torus = add(
    new THREE.TorusGeometry(0.74, 0.29, 32, 72),
    blue,
    [-1.1, -0.45, 0.6],
  );
  torus.rotation.set(0.4, 0.35, -0.55);
  const stone = add(
    new THREE.IcosahedronGeometry(0.72, 0),
    chrome,
    [1.25, 1.1, 0.25],
  );
  stone.rotation.set(0.3, 0.4, 0.7);
  const sheetGeometry = new THREE.PlaneGeometry(1.45, 1.7, 20, 26);
  const vertices = sheetGeometry.attributes.position;
  for (let i = 0; i < vertices.count; i++) {
    const x = vertices.getX(i),
      y = vertices.getY(i);
    vertices.setXYZ(i, x, y, Math.abs(x) * 0.65 + Math.sin(y * 2.4) * 0.18);
  }
  sheetGeometry.computeVertexNormals();
  const sheet = add(sheetGeometry, white, [-0.65, 1.33, -0.1]);
  sheet.rotation.set(0.2, -0.45, -0.45);

  // A solid, twisted ribbon with a broad visible surface, rather than a tube.
  const ribbonGeometry = new THREE.BufferGeometry();
  const positions = [],
    indices = [];
  for (let i = 0; i <= 100; i++) {
    const t = i / 100,
      angle = t * Math.PI * 1.75;
    const center = new THREE.Vector3(
      Math.cos(angle) * 0.69,
      (t - 0.5) * 1.7,
      Math.sin(angle) * 0.45,
    );
    const width = new THREE.Vector3(
      Math.cos(angle + 0.5),
      0.2,
      Math.sin(angle + 0.5),
    )
      .normalize()
      .multiplyScalar(0.24);
    positions.push(
      center.x - width.x,
      center.y - width.y,
      center.z - width.z,
      center.x + width.x,
      center.y + width.y,
      center.z + width.z,
    );
    if (i < 100) {
      const n = i * 2;
      indices.push(n, n + 1, n + 2, n + 1, n + 3, n + 2);
    }
  }
  ribbonGeometry.setAttribute(
    "position",
    new THREE.Float32BufferAttribute(positions, 3),
  );
  ribbonGeometry.setIndex(indices);
  ribbonGeometry.computeVertexNormals();
  const ribbon = add(ribbonGeometry, white, [1.15, -1.1, 0.3]);
  ribbon.rotation.set(0.3, -0.4, -0.5);
  const bead = add(
    new THREE.SphereGeometry(0.21, 24, 16),
    blue,
    [-1.65, 1, 0.1],
  );
  const small = add(new THREE.OctahedronGeometry(0.25), dark, [0.3, -1.9, 0.1]);

  const orbitPoints = [];
  for (let i = 0; i <= 100; i++) {
    const angle = (i / 100) * Math.PI * 2;
    orbitPoints.push(
      new THREE.Vector3(Math.cos(angle) * 2.18, Math.sin(angle) * 2.18, 0),
    );
  }
  const orbit = new THREE.Mesh(
    new THREE.TubeGeometry(
      new THREE.CatmullRomCurve3(orbitPoints),
      100,
      0.007,
      5,
      true,
    ),
    dark,
  );
  orbit.rotation.set(0.3, -0.48, 0.25);
  group.add(orbit);
  const arrangements = [
    [
      [-1.1, -0.45, 0.6],
      [1.25, 1.1, 0.25],
      [-0.65, 1.33, -0.1],
      [1.15, -1.1, 0.3],
      [-1.65, 1, 0.1],
      [0.3, -1.9, 0.1],
    ],
    [
      [0.9, 0.1, 0.6],
      [-1.4, -1, 0.25],
      [-0.8, 1.1, -0.1],
      [1.1, -1.5, 0.3],
      [1.5, 1.4, 0.1],
      [-1.6, 0.1, 0.1],
    ],
    [
      [-0.2, 1.2, 0.6],
      [1.4, -0.9, 0.25],
      [-1.5, -0.4, -0.1],
      [0.5, -1.3, 0.3],
      [-1.4, 1.4, 0.1],
      [1.5, 0.9, 0.1],
    ],
  ];
  const targetColor = new THREE.Color();
  let active = 0;
  return {
    update({ time, delta, pointer, settings, reducedMotion }) {
      active = settings.variant || 0;
      const amount = reducedMotion
        ? 1
        : 1 - Math.exp(-Math.max(delta, 0.016) * 4);
      targetColor.set(worlds[active].color);
      blue.color.lerp(targetColor, amount);
      objects.forEach((object, i) => {
        const target = arrangements[active][i];
        object.position.x += (target[0] - object.position.x) * amount;
        object.position.y +=
          (target[1] +
            (reducedMotion ? 0 : Math.sin(time * 0.6 + i) * 0.09) -
            object.position.y) *
          amount;
        object.position.z += (target[2] - object.position.z) * amount;
      });
      group.rotation.y = reducedMotion
        ? -0.08
        : Math.sin(time * 0.16) * 0.1 + pointer.x * 0.12;
      group.rotation.x = reducedMotion ? 0.02 : pointer.y * -0.08;
      stone.rotation.y = 0.4 + time * 0.13;
      torus.rotation.z = -0.55 + Math.sin(time * 0.3) * 0.16;
      ribbon.rotation.y = -0.4 + Math.sin(time * 0.25) * 0.25;
      orbit.rotation.z = 0.25 + time * 0.025;
    },
  };
}

export default function Orbital() {
  const [selected, setSelected] = useState(0);
  const [expanded, setExpanded] = useState(null);
  const enabled = useMotionEnabled();
  const hero = useRef(null);
  const { scrollYProgress } = useScroll({
    target: hero,
    offset: ["start start", "end start"],
  });
  const drift = useSpring(useTransform(scrollYProgress, [0, 1], [0, 90]), {
    stiffness: 90,
    damping: 24,
  });
  const world = worlds[selected];
  const transition = enabled
    ? { type: "spring", stiffness: 220, damping: 26 }
    : { duration: 0 };
  return (
    <div
      className="orb-page"
      style={{
        "--orb-background": world.background,
        "--orb-accent": world.color,
      }}
    >
      <header className="orb-header">
        <a className="orb-logo" href="#main" aria-label="Orbital, back to top">
          <span className="orb-logomark" aria-hidden="true">
            ◎
          </span>{" "}
          orbital<span className="orb-logo-dot">®</span>
        </a>
        <span className="orb-header-note">
          Independent designer.
          <br />
          Connected thinking.
        </span>
        <a className="orb-contact" href="#orb-about">
          A little about me <span aria-hidden="true">↗</span>
        </a>
      </header>
      <main id="main">
        <section className="orb-hero" ref={hero} aria-labelledby="orb-title">
          <div className="orb-kicker">
            <span className="orb-status" /> Open to good conversations{" "}
            <span className="orb-coordinates">
              Based on Earth / Working everywhere
            </span>
          </div>
          <motion.h1
            id="orb-title"
            initial={enabled ? { opacity: 0, y: 30 } : false}
            animate={{ opacity: 1, y: 0 }}
            transition={transition}
          >
            Independent
            <br />
            <span>by design.</span>
            <i aria-hidden="true">*</i>
          </motion.h1>
          <motion.div
            className="orb-sculpture"
            style={{ y: enabled ? drift : 0 }}
          >
            <Scene
              build={buildOrbital}
              settings={{ variant: selected }}
              label={`A floating mobile of chrome, folded paper, and ${selected === 0 ? "blue" : selected === 1 ? "orange" : "green"} objects for ${world.name}`}
            />
            <span className="orb-art-note">
              Fig. 0{selected + 1} — Ideas in orbit
            </span>
          </motion.div>
          <div className="orb-intro">
            <p>
              I connect the dots between
              <br />a good idea and a feeling
              <br />
              you can’t quite put into words.
            </p>
            <a href="#orb-work">
              Explore selected work <span aria-hidden="true">↓</span>
            </a>
          </div>
          <div
            className="orb-world-controls"
            role="group"
            aria-label="Choose a project world"
          >
            <span className="orb-world-label">A change of perspective</span>
            {worlds.map((item, index) => (
              <motion.button
                key={item.name}
                type="button"
                aria-pressed={selected === index}
                onClick={() => setSelected(index)}
                whileHover={enabled ? { y: -3 } : undefined}
                whileTap={enabled ? { scale: 0.97 } : undefined}
                transition={transition}
              >
                <span className="orb-world-number">{item.number}</span>
                <span>{item.name}</span>
                <span className="orb-world-arrow" aria-hidden="true">
                  ↗
                </span>
              </motion.button>
            ))}
          </div>
          <div className="orb-current" aria-live="polite">
            <AnimatePresence mode="wait">
              <motion.p
                key={selected}
                initial={enabled ? { opacity: 0, y: 6 } : false}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: enabled ? -6 : 0 }}
                transition={{ duration: enabled ? 0.18 : 0 }}
              >
                <span>{world.category}</span>
                <span>{world.title}</span>
              </motion.p>
            </AnimatePresence>
          </div>
        </section>
        <section
          id="orb-work"
          className="orb-work"
          aria-labelledby="orb-work-title"
        >
          <div className="orb-section-title">
            <h2 id="orb-work-title">Selected connections</h2>
            <span>01 — 03 / 2025–26</span>
          </div>
          {worlds.map((item, index) => (
            <motion.article
              className={`orb-project orb-project-${item.className}`}
              key={item.name}
              initial={enabled ? { opacity: 0, y: 35 } : false}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.15 }}
              transition={{ duration: enabled ? 0.55 : 0 }}
            >
              <div className="orb-project-art" aria-hidden="true">
                {index === 0 ? (
                  <>
                    <span className="orb-ground-text">
                      common
                      <br />
                      ground.
                    </span>
                    <span className="orb-ground-door" />
                    <span className="orb-art-caption">
                      A place for possibility.
                    </span>
                  </>
                ) : index === 1 ? (
                  <>
                    <span className="orb-signal-disc" />
                    <span className="orb-signal-text">
                      SOFT
                      <br />
                      <i>SIGNAL</i>
                    </span>
                    <span className="orb-art-caption">Feel something new.</span>
                  </>
                ) : (
                  <>
                    <span className="orb-matter-loop" />
                    <span className="orb-matter-text">
                      new
                      <br />
                      <i>matter</i>
                    </span>
                    <span className="orb-art-caption">
                      Made from a different perspective.
                    </span>
                  </>
                )}
              </div>
              <div className="orb-project-copy">
                <span className="orb-project-index">/{item.number}</span>
                <div>
                  <span className="orb-project-category">
                    {item.category} — {item.year}
                  </span>
                  <h3>{item.name}</h3>
                  <p>{item.title}</p>
                  <button
                    type="button"
                    onClick={() => {
                      setSelected(index);
                      setExpanded(expanded === index ? null : index);
                    }}
                    aria-expanded={expanded === index}
                    aria-controls={`orb-project-details-${index}`}
                  >
                    {expanded === index
                      ? "Close project notes"
                      : "Read project notes"}{" "}
                    <span aria-hidden="true">
                      {expanded === index ? "−" : "+"}
                    </span>
                  </button>
                  <AnimatePresence>
                    {expanded === index && (
                      <motion.div
                        id={`orb-project-details-${index}`}
                        className="orb-project-details"
                        initial={{ opacity: 0, y: enabled ? 8 : 0 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: enabled ? 0.2 : 0 }}
                      >
                        <p>{item.text}</p>
                        <span>{item.detail}</span>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            </motion.article>
          ))}
        </section>
        <section className="orb-about" id="orb-about">

          <div>
            <span className="orb-project-category">
              A person, not a planet.
            </span>
            <h2>
              Small studio.
              <br />
              Wide-open thinking.
            </h2>
            <p>
              I’m Alex, an independent designer moving between identity, digital
              experiences, and objects. I like simple ideas with a slightly
              unexpected point of view. Every project starts with curiosity and
              ends somewhere new.
            </p>
            <a href="#orb-work">
              Take another look at the work <span aria-hidden="true">↗</span>
            </a>
          </div>
          <span className="orb-about-footnote">
            Orbital is a fictional design studio.
            <br />
            An interactive Motion Lab experiment.
          </span>
        </section>
      </main>
      <footer className="orb-footer">
        <span>Good ideas don’t happen in isolation.</span>
        <a href="#main">Back to orbit ↑</a>
        <span>Orbital © 2026</span>
      </footer>
    </div>
  );
}
