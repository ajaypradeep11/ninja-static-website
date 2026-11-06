import React, { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import Scene from "./Scene.jsx";
import { useMotionEnabled } from "./runtime.jsx";
import "./bloomfield.css";

const seasons = {
  dusk: {
    label: "Dusk",
    time: "19:24",
    colors: [0xf29bb8, 0xffd2ad, 0xc77f99],
    center: 0x6b2438,
    glow: "#6c263e",
    description: "Rose-colored light. The last warmth of the day.",
    notes:
      "The garden softens into dusty rose, peach, and deep mulberry. Watch the curled edges catch the evening light.",
  },
  golden: {
    label: "Golden hour",
    time: "17:42",
    colors: [0xffb34c, 0xf3dcb7, 0xea7255],
    center: 0x593321,
    glow: "#79451e",
    description: "Honey on the petals. Everything, a little warmer.",
    notes:
      "Apricot and butter-yellow petals gather the afternoon sun. Wide-open blooms reveal their warm, saffron centers.",
  },
  moon: {
    label: "Moonlight",
    time: "23:08",
    colors: [0xc4b5ec, 0xe2e3d7, 0x899fc9],
    center: 0x3b3154,
    glow: "#3b345f",
    description: "A quiet blue hour. Stay for a little while.",
    notes:
      "Lavender and ivory emerge against the night. A pale sheen traces each petal, like a little piece of moonlight.",
  },
};

function createPetal(THREE, length = 0.74, width = 0.27) {
  const vertices = [],
    indices = [],
    uvs = [],
    across = 10,
    along = 18;
  for (let j = 0; j <= along; j++) {
    const t = j / along;
    for (let i = 0; i <= across; i++) {
      const s = (i / across - 0.5) * 2;
      const w = Math.pow(Math.sin(Math.PI * t), 0.64) * width;
      vertices.push(
        s * w,
        0.06 + t * length,
        0.2 * Math.sin(t * Math.PI) -
          0.22 * t * t +
          s * s * 0.11 * Math.sin(t * Math.PI),
      );
      uvs.push(i / across, t);
      if (j < along && i < across) {
        const a = j * (across + 1) + i,
          b = a + across + 1;
        indices.push(a, b, a + 1, b, b + 1, a + 1);
      }
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute(
    "position",
    new THREE.Float32BufferAttribute(vertices, 3),
  );
  geometry.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

function buildGarden({ THREE, scene, camera }) {
  camera.position.set(0, 0, 9.5);
  const garden = new THREE.Group();
  scene.add(garden);
  const petalGeometry = createPetal(THREE);
  const leafGeometry = createPetal(THREE, 0.75, 0.17);
  const green = new THREE.MeshStandardMaterial({
    color: 0x687442,
    roughness: 0.58,
    side: THREE.DoubleSide,
  });
  const centerMaterial = new THREE.MeshStandardMaterial({
    color: seasons.dusk.center,
    roughness: 0.95,
  });
  const petalMaterials = seasons.dusk.colors.map(
    (color) =>
      new THREE.MeshPhysicalMaterial({
        color,
        roughness: 0.47,
        metalness: 0,
        side: THREE.DoubleSide,
        sheen: 0.85,
        sheenColor: new THREE.Color(0xffd6df),
        sheenRoughness: 0.65,
      }),
  );
  const centerGeometry = new THREE.SphereGeometry(0.13, 20, 12);
  const layouts = [
    [-3.27, 1.16, 1.1, -0.26, 0.23],
    [-3.0, -1.45, 1.22, 0.28, -0.34],
    [-1.67, -2.5, 0.75, -0.1, 0.2],
    [3.16, 1.43, 1.06, -0.34, -0.35],
    [2.92, -0.97, 1.16, 0.3, 0.36],
    [1.78, -2.63, 0.87, -0.3, -0.1],
    [-1.15, 2.9, 0.66, 0.25, 0.3],
    [1.45, 2.99, 0.8, 0.2, -0.16],
  ];
  const flowers = layouts.map(([x, y, scale, tiltX, tiltY], index) => {
    const root = new THREE.Group();
    garden.add(root);
    const head = new THREE.Group();
    root.add(head);
    head.rotation.set(tiltX, tiltY, index * 0.7);
    const petals = [];
    for (let p = 0; p < 8; p++) {
      const pivot = new THREE.Group();
      pivot.rotation.z = (p / 8) * Math.PI * 2;
      head.add(pivot);
      const petal = new THREE.Mesh(petalGeometry, petalMaterials[index % 3]);
      petal.rotation.x = 0.1;
      pivot.add(petal);
      petals.push(petal);
    }
    const center = new THREE.Mesh(centerGeometry, centerMaterial);
    center.scale.z = 0.65;
    center.position.z = 0.08;
    head.add(center);
    const stemCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0, 0, -0.07),
      new THREE.Vector3(0.14, -0.65, -0.25),
      new THREE.Vector3(-0.12, -1.5, -0.5),
      new THREE.Vector3(0.25, -2.5, -0.8),
    ]);
    root.add(
      new THREE.Mesh(
        new THREE.TubeGeometry(stemCurve, 20, 0.018, 5, false),
        green,
      ),
    );
    [-1, 1].forEach((direction, l) => {
      const leaf = new THREE.Mesh(leafGeometry, green);
      leaf.position.set(0.05, -0.6 - l * 0.6, -0.24 - l * 0.17);
      leaf.rotation.set(0.35, direction * 0.4, direction * 1.15);
      root.add(leaf);
    });
    root.scale.setScalar(scale);
    return { root, head, petals, x, y, index, tiltX, tiltY };
  });
  const dustGeometry = new THREE.BufferGeometry();
  const dust = new Float32Array(54 * 3);
  for (let i = 0; i < 54; i++) {
    dust[i * 3] = Math.sin(i * 71.37) * 4.3;
    dust[i * 3 + 1] = Math.cos(i * 33.91) * 3.2;
    dust[i * 3 + 2] = -0.5 + Math.sin(i * 8.13);
  }
  dustGeometry.setAttribute("position", new THREE.BufferAttribute(dust, 3));
  const motes = new THREE.Points(
    dustGeometry,
    new THREE.PointsMaterial({
      color: 0xf5dfaa,
      size: 0.018,
      transparent: true,
      opacity: 0.5,
      sizeAttenuation: true,
    }),
  );
  scene.add(motes);
  let previousMode = "";
  return {
    update({ time, pointer, settings, reducedMotion }) {
      const mode = seasons[settings.season] || seasons.dusk;
      if (previousMode !== settings.season) {
        petalMaterials.forEach((material, i) =>
          material.color.setHex(mode.colors[i]),
        );
        centerMaterial.color.setHex(mode.center);
        previousMode = settings.season;
      }
      const mobile = camera.aspect < 0.85;
      const narrow = Math.max(0.5, Math.min(1, camera.aspect / 1.45));
      flowers.forEach((flower) => {
        flower.root.position.set(
          flower.x * narrow,
          flower.y * (mobile ? 1.04 : 1),
          Math.sin(flower.index * 3) * 0.3,
        );
        flower.head.rotation.x =
          flower.tiltX +
          (reducedMotion ? 0 : Math.sin(time * 0.55 + flower.index) * 0.07);
        flower.head.rotation.y = flower.tiltY + pointer.x * 0.08;
        flower.root.rotation.z = reducedMotion
          ? 0
          : Math.sin(time * 0.38 + flower.index * 2) * 0.025;
        flower.petals.forEach((petal, i) => {
          petal.rotation.x =
            (1 - (settings.bloom ?? 88) / 100) * 1.38 + Math.sin(i * 2) * 0.04;
        });
      });
      garden.rotation.y = pointer.x * 0.018;
      garden.rotation.x = pointer.y * 0.012;
      motes.rotation.z = reducedMotion ? 0 : Math.sin(time * 0.08) * 0.12;
    },
  };
}

function FlowerMark() {
  return (
    <svg viewBox="0 0 36 36" fill="none" aria-hidden="true">
      <g stroke="currentColor" strokeWidth="1.2">
        {Array.from({ length: 6 }, (_, i) => (
          <ellipse
            key={i}
            cx="18"
            cy="11"
            rx="4"
            ry="8"
            transform={`rotate(${i * 60} 18 18)`}
          />
        ))}
        <circle cx="18" cy="18" r="3" />
      </g>
    </svg>
  );
}

export default function Bloomfield() {
  const [season, setSeason] = useState("dusk");
  const [bloom, setBloom] = useState(88);
  const enabled = useMotionEnabled();
  const current = seasons[season];
  const reveal = {
    initial: enabled ? { opacity: 0, y: 22 } : false,
    whileInView: { opacity: 1, y: 0 },
    viewport: { once: true },
    transition: { duration: 0.85 },
  };
  return (
    <main id="main" className="bf-page" style={{ "--bf-glow": current.glow }}>
      <section className="bf-garden" aria-label="Interactive digital garden">
        <div className="bf-garden-art">
          <Scene
            build={buildGarden}
            settings={{ season, bloom }}
            label={`${current.label} garden of sculptural flowers, ${bloom} percent open`}
          />
        </div>
        <header className="bf-header">
          <a className="bf-wordmark" href="#main">
            <FlowerMark />
            bloomfield<span>®</span>
          </a>
          <span className="bf-header-note">
            An ever-changing digital garden
          </span>
          <a className="bf-notes-link" href="#field-notes">
            Field notes <span aria-hidden="true">↗</span>
          </a>
        </header>
        <div className="bf-edition">
          <span>01 / AN EXERCISE IN SLOWING DOWN</span>
          <span className="bf-time">
            {current.time} <i /> {current.label}
          </span>
        </div>
        <div className="bf-center">
          <motion.span className="bf-eyebrow" {...reveal}>
            A place to just be.
          </motion.span>
          <motion.h1
            initial={enabled ? { opacity: 0, y: 30 } : false}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1.2, delay: 0.1 }}
          >
            A little
            <br />
            more <em>wild.</em>
          </motion.h1>
          <AnimatePresence mode="wait" initial={false}>
            <motion.p
              className="bf-description"
              key={season}
              initial={enabled ? { opacity: 0, y: 6 } : false}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: enabled ? 0.3 : 0 }}
            >
              {current.description}
            </motion.p>
          </AnimatePresence>
          <motion.a
            className="bf-enter"
            href="#field-notes"
            whileHover={enabled ? { y: 3 } : {}}
          >
            Wander a little <span aria-hidden="true">↓</span>
          </motion.a>
        </div>
        <div className="bf-controls">
          <div className="bf-season-control">
            <span className="bf-control-label">CHANGE THE LIGHT</span>
            <div
              className="bf-seasons"
              role="group"
              aria-label="Garden lighting"
            >
              {Object.entries(seasons).map(([key, value]) => (
                <button
                  type="button"
                  key={key}
                  onClick={() => setSeason(key)}
                  aria-pressed={season === key}
                >
                  {season === key && (
                    <motion.span
                      className="bf-selected"
                      layoutId="bf-season"
                      transition={{ duration: enabled ? 0.3 : 0 }}
                    />
                  )}
                  <span>{value.label}</span>
                </button>
              ))}
            </div>
          </div>
          <label className="bf-bloom-control">
            <span className="bf-control-label">
              LET IT BLOOM <output htmlFor="bf-bloom">{bloom}%</output>
            </span>
            <input
              id="bf-bloom"
              type="range"
              min="15"
              max="100"
              value={bloom}
              onChange={(event) => setBloom(Number(event.target.value))}
              aria-label="Flower openness"
            />
          </label>
          <span className="bf-made-note">
            A small world.
            <br />A different perspective.
          </span>
        </div>
      </section>
      <section className="bf-field-notes" id="field-notes">
        <motion.div className="bf-field-title" {...reveal}>
          <span className="bf-eyebrow">THE FIELD NOTES — VOL. 01</span>
          <h2>
            Nothing here
            <br />
            grows in a straight line.
          </h2>
          <p>
            Eight impossible flowers. Three passing moods. One invitation to
            step out of the rush and notice the small things.
          </p>
        </motion.div>
        <div className="bf-observations">
          <motion.article {...reveal}>
            <span className="bf-note-index">01</span>
            <div>
              <h3>Follow the light</h3>
              <p>{current.notes}</p>
              <span className="bf-specimen-tag">
                OBSERVATION / {current.label.toUpperCase()}
              </span>
            </div>
          </motion.article>
          <motion.article {...reveal}>
            <span className="bf-note-index">02</span>
            <div>
              <h3>Give it room</h3>
              <p>
                Move the bloom control to unfold every flower. From a quiet,
                cupped bud to a wide-open canopy, each curved petal turns toward
                you.
              </p>
              <span className="bf-specimen-tag">
                GROWTH /{" "}
                {bloom < 45
                  ? "JUST BEGINNING"
                  : bloom < 80
                    ? "OPENING UP"
                    : "IN FULL BLOOM"}
              </span>
            </div>
          </motion.article>
          <motion.article {...reveal}>
            <span className="bf-note-index">03</span>
            <div>
              <h3>Stay a moment</h3>
              <p>
                There is no finish line in this garden. Let the stems sway,
                trace the little specks of pollen, and enjoy a moment that asks
                nothing of you.
              </p>
              <a href="#main">
                Return to the garden <span aria-hidden="true">↗</span>
              </a>
            </div>
          </motion.article>
        </div>
        <footer className="bf-footer">
          <span>bloomfield®</span>
          <span>Made of light. Rooted in curiosity.</span>
          <FlowerMark />
        </footer>
      </section>
    </main>
  );
}
