import React, { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import Scene from "./Scene.jsx";
import { useMotionEnabled } from "./runtime.jsx";
import "./totem.css";

const editions = [
  {
    name: "Moon milk",
    code: "001",
    shell: "#f2ebff",
    suit: "#a995df",
    light: "#c9ff66",
    chip: "#b9a5ed",
    mood: "Soft shell. Curious soul.",
    character: "The quiet one with very loud ideas.",
  },
  {
    name: "Acid apple",
    code: "002",
    shell: "#c8fa65",
    suit: "#547c51",
    light: "#fff1a4",
    chip: "#c8fa65",
    mood: "A little green. A little strange.",
    character: "Always the first to take the scenic route.",
  },
  {
    name: "Night shift",
    code: "003",
    shell: "#353142",
    suit: "#635875",
    light: "#ff99da",
    chip: "#363142",
    mood: "After hours. Other worlds.",
    character: "An excellent listener. A terrible sleeper.",
  },
];

function buildTotem({ THREE, scene, camera }) {
  camera.position.set(0, 0.8, 8.8);
  camera.lookAt(0, 0.1, 0);
  const creature = new THREE.Group();
  scene.add(creature);
  const shell = new THREE.MeshPhysicalMaterial({
    color: editions[0].shell,
    roughness: 0.22,
    metalness: 0.06,
    clearcoat: 0.85,
    clearcoatRoughness: 0.16,
  });
  const suit = new THREE.MeshStandardMaterial({
    color: editions[0].suit,
    roughness: 0.55,
    metalness: 0.05,
  });
  const trim = new THREE.MeshStandardMaterial({
    color: "#f2eafa",
    roughness: 0.5,
  });
  const dark = new THREE.MeshPhysicalMaterial({
    color: "#18131f",
    roughness: 0.12,
    metalness: 0.35,
    clearcoat: 1,
  });
  const light = new THREE.MeshStandardMaterial({
    color: editions[0].light,
    emissive: editions[0].light,
    emissiveIntensity: 0.8,
    roughness: 0.3,
  });
  const sole = new THREE.MeshStandardMaterial({
    color: "#3c304e",
    roughness: 0.7,
  });
  const metal = new THREE.MeshStandardMaterial({
    color: "#c5bdcf",
    metalness: 0.8,
    roughness: 0.28,
  });
  const add = (geometry, material, position, parent = creature) => {
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(...position);
    parent.add(mesh);
    return mesh;
  };
  const round = (w, h, d, radius = 0.15) =>
    new RoundedBoxGeometry(w, h, d, 5, radius);
  const head = new THREE.Group();
  head.position.y = 0.91;
  creature.add(head);
  add(round(2.28, 1.55, 1.46, 0.48), shell, [0, 0.25, 0], head);
  add(round(1.94, 0.86, 0.37, 0.28), dark, [0, 0.19, 0.68], head);
  const eyes = [];
  for (const side of [-1, 1]) {
    const eye = add(
      new THREE.CapsuleGeometry(0.075, 0.17, 5, 14),
      light,
      [side * 0.39, 0.25, 0.88],
      head,
    );
    eyes.push(eye);
    const cheek = add(
      new THREE.SphereGeometry(0.055, 14, 12),
      light,
      [side * 0.65, 0.07, 0.87],
      head,
    );
    cheek.scale.set(1.3, 0.55, 0.45);
    const ear = add(
      new THREE.CylinderGeometry(0.28, 0.28, 0.22, 28),
      suit,
      [side * 1.15, 0.25, 0],
      head,
    );
    ear.rotation.z = Math.PI / 2;
    const earring = add(
      new THREE.CylinderGeometry(0.13, 0.13, 0.23, 24),
      light,
      [side * 1.17, 0.25, 0],
      head,
    );
    earring.rotation.z = Math.PI / 2;
    const foot = add(round(0.66, 0.4, 0.98, 0.17), shell, [
      side * 0.43,
      -1.43,
      0.16,
    ]);
    foot.rotation.y = side * 0.08;
    const base = add(round(0.68, 0.12, 1.01, 0.055), sole, [
      side * 0.43,
      -1.6,
      0.16,
    ]);
    base.rotation.y = side * 0.08;
    add(new THREE.CylinderGeometry(0.22, 0.25, 0.38, 24), suit, [
      side * 0.43,
      -1.07,
      0,
    ]);
    add(round(0.3, 0.055, 0.025, 0.02), light, [side * 0.43, -1.4, 0.66]);
  }
  const smile = add(
    new THREE.TorusGeometry(0.13, 0.023, 8, 24, Math.PI),
    light,
    [0, 0.07, 0.89],
    head,
  );
  smile.rotation.z = Math.PI;
  add(
    new THREE.CylinderGeometry(0.055, 0.09, 0.43, 20),
    metal,
    [0, 1.18, 0],
    head,
  );
  add(new THREE.SphereGeometry(0.17, 24, 18), light, [0, 1.42, 0], head);
  const antennaRing = add(
    new THREE.TorusGeometry(0.28, 0.025, 8, 32),
    shell,
    [0, 1.42, 0],
    head,
  );
  antennaRing.rotation.x = Math.PI / 2.8;
  add(round(1.49, 1.23, 0.99, 0.28), suit, [0, -0.32, 0]);
  const collar = add(
    new THREE.TorusGeometry(0.44, 0.12, 12, 36),
    trim,
    [0, 0.26, 0],
  );
  collar.rotation.x = Math.PI / 2;
  add(round(1.5, 0.16, 1.01, 0.075), trim, [0, -0.81, 0]);
  add(round(0.045, 0.74, 0.045, 0.02), trim, [0, -0.24, 0.51]);
  add(round(0.09, 0.14, 0.055, 0.03), metal, [0, 0.02, 0.54]);
  add(round(0.32, 0.26, 0.06, 0.065), dark, [-0.4, -0.13, 0.51]);
  add(new THREE.SphereGeometry(0.06, 14, 12), light, [-0.4, -0.13, 0.56]);
  for (const side of [-1, 1]) {
    add(round(0.3, 0.22, 0.055, 0.04), suit, [side * 0.4, -0.58, 0.52]);
  }
  const arms = [];
  for (const side of [-1, 1]) {
    const arm = new THREE.Group();
    arm.position.set(side * 0.84, 0.04, 0);
    creature.add(arm);
    add(new THREE.CapsuleGeometry(0.23, 0.35, 6, 20), suit, [0, -0.26, 0], arm);
    add(
      new THREE.CylinderGeometry(0.235, 0.235, 0.12, 24),
      trim,
      [0, -0.52, 0],
      arm,
    );
    const hand = add(
      new THREE.SphereGeometry(0.25, 24, 18),
      shell,
      [0, -0.69, 0.025],
      arm,
    );
    hand.scale.set(0.95, 1.08, 0.85);
    add(
      new THREE.SphereGeometry(0.11, 16, 12),
      shell,
      [-side * 0.19, -0.61, 0.07],
      arm,
    );
    arms.push(arm);
  }
  const platform = add(
    new THREE.CylinderGeometry(1.5, 1.55, 0.17, 64),
    new THREE.MeshStandardMaterial({ color: "#ede5f9", roughness: 0.7 }),
    [0, -1.77, 0],
    scene,
  );
  add(
    new THREE.CylinderGeometry(1.54, 1.55, 0.04, 64),
    sole,
    [0, -1.86, 0],
    scene,
  );
  const shadow = add(
    new THREE.CircleGeometry(1.8, 64),
    new THREE.MeshBasicMaterial({
      color: "#58436f",
      transparent: true,
      opacity: 0.09,
      depthWrite: false,
    }),
    [0, -1.9, 0],
    scene,
  );
  shadow.rotation.x = -Math.PI / 2;
  let currentEdition = -1;
  return {
    update({ time, delta, pointer, settings, reducedMotion }) {
      if (currentEdition !== settings.edition) {
        const edition = editions[settings.edition ?? 0];
        shell.color.set(edition.shell);
        suit.color.set(edition.suit);
        light.color.set(edition.light);
        light.emissive.set(edition.light);
        currentEdition = settings.edition;
      }
      const ease = reducedMotion ? 1 : 1 - Math.exp(-delta * 7);
      const turn = reducedMotion
        ? -0.13
        : -0.13 + pointer.x * 0.28 + Math.sin(time * 0.42) * 0.1;
      creature.rotation.y += (turn - creature.rotation.y) * ease;
      head.rotation.z = reducedMotion ? 0 : Math.sin(time * 0.72) * 0.035;
      head.rotation.x = reducedMotion ? 0 : pointer.y * -0.045;
      const wave = settings.wave
        ? 2.25 + (reducedMotion ? 0 : Math.sin(time * 5) * 0.18)
        : 0.12;
      arms[1].rotation.z += (wave - arms[1].rotation.z) * ease;
      arms[0].rotation.z = -0.16;
      const blink = !reducedMotion && time % 5.6 > 5.42 ? 0.15 : 1;
      eyes.forEach((eye) => {
        eye.scale.y = blink;
      });
      antennaRing.rotation.z = reducedMotion ? 0 : time * 0.22;
      platform.rotation.y = 0;
    },
  };
}

export default function Totem() {
  const enabled = useMotionEnabled();
  const [selected, setSelected] = useState(0);
  const [wave, setWave] = useState(false);
  const edition = editions[selected];
  const spring = enabled
    ? { type: "spring", stiffness: 260, damping: 23 }
    : { duration: 0 };
  return (
    <div className="totem-page">
      <header className="totem-header">
        <a className="totem-brand" href="#main" aria-label="Totem, back to top">
          <span className="totem-brand-mark" aria-hidden="true">
            ✳
          </span>{" "}
          TOTEM<span className="totem-registered">®</span>
        </a>
        <span className="totem-header-note">
          Good company.
          <br />
          From another planet.
        </span>
        <nav aria-label="Totem navigation">
          <a href="#totem-story">
            Meet your Totem <span aria-hidden="true">↗</span>
          </a>
          <a className="totem-nav-pill" href="#totem-edition">
            The editions <span aria-hidden="true">↓</span>
          </a>
        </nav>
      </header>
      <main id="main">
        <section className="totem-hero" aria-labelledby="totem-heading">
          <div className="totem-hero-topline">
            <span>INDEPENDENT COLLECTIBLE LAB</span>
            <span>EARTH EDITION / VOL. 01</span>
          </div>
          <h1 id="totem-heading" className="totem-title" aria-label="Totem">
            <span aria-hidden="true">
              {"TOTEM".split("").map((letter, i) => (
                <motion.span
                  key={i}
                  initial={enabled ? { y: 80, opacity: 0 } : false}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ ...spring, delay: enabled ? i * 0.055 : 0 }}
                >
                  {letter}
                </motion.span>
              ))}
            </span>
          </h1>
          <div className="totem-art">
            <Scene
              build={buildTotem}
              settings={{ edition: selected, wave }}
              label={`${edition.name} Totem: a vinyl alien with a luminous visor, little flight jacket, and curious antenna.`}
            />
          </div>
          <div className="totem-side-left">
            <span className="totem-mini-label">
              SMALL OBJECT.
              <br />
              BIG PERSONALITY.
            </span>
            <p>
              A friend for
              <br />
              your weird
              <br />
              <em>little world.</em>
            </p>
            <span className="totem-coordinate">↳ 100% GOOD ENERGY</span>
          </div>
          <div className="totem-side-right">
            <div className="totem-orbit-stamp" aria-hidden="true">
              <span>✳</span>
              <span>
                MADE OF
                <br />
                OTHERWORLDLY
                <br />
                GOODNESS
              </span>
            </div>
            <motion.button
              type="button"
              className="totem-wave"
              aria-pressed={wave}
              onClick={() => setWave((v) => !v)}
              whileHover={enabled ? { rotate: -3, scale: 1.035 } : {}}
              whileTap={enabled ? { scale: 0.95 } : {}}
              transition={spring}
            >
              <span aria-hidden="true">{wave ? "✧" : "↗"}</span>
              {wave ? "Back to daydreaming" : "Say hello"}
            </motion.button>
            <p>Go on. They’re friendly.</p>
          </div>
          <div className="totem-picker" id="totem-edition">
            <span className="totem-mini-label">PICK YOUR PERSONALITY</span>
            <div
              className="totem-colorways"
              role="group"
              aria-label="Choose a Totem edition"
            >
              {editions.map((item, i) => (
                <motion.button
                  key={item.code}
                  type="button"
                  className="totem-colorway"
                  aria-label={item.name}
                  aria-pressed={selected === i}
                  onClick={() => setSelected(i)}
                  whileTap={enabled ? { scale: 0.9 } : {}}
                  transition={spring}
                >
                  <span
                    className="totem-color-dot"
                    style={{ background: item.chip }}
                  />
                  <span>{item.name}</span>
                  {selected === i && (
                    <motion.span
                      className="totem-color-selected"
                      layoutId={enabled ? "totem-selection" : undefined}
                      transition={spring}
                    />
                  )}
                </motion.button>
              ))}
            </div>
          </div>
          <div className="totem-edition-number" aria-live="polite">
            <span>EDITION</span>
            <strong>
              {edition.code}
              <span>/ 003</span>
            </strong>
          </div>
        </section>
        <section
          className="totem-story"
          id="totem-story"
          aria-labelledby="totem-story-title"
        >
          <div className="totem-story-intro">
            <span className="totem-mini-label">
              NOT FROM HERE. RIGHT AT HOME.
            </span>
            <motion.h2
              id="totem-story-title"
              initial={enabled ? { opacity: 0, y: 30 } : false}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.3 }}
              transition={spring}
            >
              Less ordinary.
              <br />
              <span>More you.</span>
            </motion.h2>
            <p>
              Objects with a little soul and absolutely no idea what a
              spreadsheet is. Meet your desk’s new favorite daydreamer.
            </p>
          </div>
          <div className="totem-passport" aria-live="polite">
            <div className="totem-passport-top">
              <span>CREATURE PASSPORT</span>
              <span>✳</span>
            </div>
            <AnimatePresence mode="wait">
              <motion.div
                key={selected}
                initial={enabled ? { opacity: 0, y: 10 } : false}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: enabled ? -8 : 0 }}
                transition={{ duration: enabled ? 0.18 : 0 }}
              >
                <span className="totem-passport-code">No. {edition.code}</span>
                <h3>{edition.name}</h3>
                <p>
                  {edition.mood}
                  <br />
                  {edition.character}
                </p>
              </motion.div>
            </AnimatePresence>
            <dl>
              <div>
                <dt>SPECIES</dt>
                <dd>Friendly unknown</dd>
              </div>
              <div>
                <dt>SUPERPOWER</dt>
                <dd>Making your day</dd>
              </div>
              <div>
                <dt>HOME PLANET</dt>
                <dd>Wherever you are</dd>
              </div>
            </dl>
            <span className="totem-passport-foot">
              IMAGINED ON EARTH. MADE FOR THE CURIOUS.
            </span>
          </div>
        </section>
        <footer className="totem-footer">
          <a className="totem-brand" href="#main">
            TOTEM®
          </a>
          <span>SMALL THINGS. BIG FEELINGS.</span>
          <a href="#totem-edition">Find your little weirdo ↗</a>
        </footer>
      </main>
    </div>
  );
}
