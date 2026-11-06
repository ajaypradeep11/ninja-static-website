import React, { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import Scene from "./Scene.jsx";
import { useMotionEnabled } from "./runtime.jsx";
import "./synapse.css";

const modes = [
  { id: "focus", name: "Focus", note: "Find the thread.", color: "#6658b3" },
  {
    id: "explore",
    name: "Explore",
    note: "Follow a new connection.",
    color: "#326b8e",
  },
  {
    id: "dream",
    name: "Dream",
    note: "Leave room for the unlikely.",
    color: "#96559c",
  },
];

function buildMind({ THREE, scene, camera }) {
  camera.position.set(0, 0.15, 8.6);
  const sculpture = new THREE.Group();
  sculpture.scale.setScalar(1.22);
  scene.add(sculpture);
  const count = 6200;
  const states = modes.map(() => new Float32Array(count * 3));
  const positions = new Float32Array(count * 3);
  const colors = new Float32Array(count * 3);
  let seed = 42;
  const random = () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 4294967296;
  };
  const low = new THREE.Color("#56408c");
  const high = new THREE.Color("#aab4f0");
  const color = new THREE.Color();
  for (let i = 0; i < count; i++) {
    const side = i % 2 ? 1 : -1;
    const phi = Math.acos(1 - 2 * random());
    const theta = random() * Math.PI * 2;
    const fold = 1 + 0.075 * Math.sin(theta * 9 + phi * 4) * Math.cos(phi * 11);
    const depth =
      i % 5 === 0 ? Math.pow(random(), 0.33) : 0.97 + random() * 0.035;
    const radius = fold * depth;
    const x = side * (0.56 + Math.sin(phi) * Math.cos(theta) * 0.66 * radius);
    const y = Math.cos(phi) * 1.52 * radius;
    const z = Math.sin(phi) * Math.sin(theta) * 1.1 * radius;
    states[0].set([x, y, z], i * 3);
    states[1].set(
      [
        x * 1.3 + Math.sin(phi * 4) * 0.13,
        y * 0.8 + Math.cos(theta * 2) * 0.18,
        z * 1.08 + Math.sin(phi * 3 + theta) * 0.25,
      ],
      i * 3,
    );
    const curl = theta + phi * 1.3;
    const dreamRadius = 1.12 + 0.38 * Math.cos(phi * 3);
    states[2].set(
      [
        Math.cos(curl) * Math.sin(phi) * dreamRadius * 1.15,
        Math.cos(phi) * 1.75 + Math.sin(theta * 3) * 0.12,
        Math.sin(curl) * Math.sin(phi) * dreamRadius,
      ],
      i * 3,
    );
    color.copy(low).lerp(high, (y + 1.55) / 3.1);
    color.toArray(colors, i * 3);
  }
  positions.set(states[0]);
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));
  const stamp = document.createElement("canvas");
  stamp.width = stamp.height = 32;
  const ctx = stamp.getContext("2d");
  const gradient = ctx.createRadialGradient(16, 16, 0, 16, 16, 16);
  gradient.addColorStop(0, "rgba(255,255,255,1)");
  gradient.addColorStop(0.28, "rgba(255,255,255,0.9)");
  gradient.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 32, 32);
  const material = new THREE.PointsMaterial({
    size: 0.048,
    map: new THREE.CanvasTexture(stamp),
    vertexColors: true,
    transparent: true,
    opacity: 0.88,
    depthWrite: false,
    sizeAttenuation: true,
  });
  sculpture.add(new THREE.Points(geometry, material));

  // Nearby particle pairs trace a fine connective tissue through the volume.
  const pairs = [];
  for (let i = 0; i < count; i += 6) {
    let found = 0;
    for (let j = i + 2; j < Math.min(i + 350, count); j += 2) {
      const dx = positions[i * 3] - positions[j * 3];
      const dy = positions[i * 3 + 1] - positions[j * 3 + 1];
      const dz = positions[i * 3 + 2] - positions[j * 3 + 2];
      if (dx * dx + dy * dy + dz * dz < 0.12) {
        pairs.push([i, j]);
        if (++found === 2) break;
      }
    }
  }
  const threads = new Float32Array(pairs.length * 6);
  const threadGeometry = new THREE.BufferGeometry();
  threadGeometry.setAttribute(
    "position",
    new THREE.BufferAttribute(threads, 3),
  );
  const threadMaterial = new THREE.LineBasicMaterial({
    color: "#8574b9",
    transparent: true,
    opacity: 0.18,
    depthWrite: false,
  });
  sculpture.add(new THREE.LineSegments(threadGeometry, threadMaterial));

  // Wispy arcs give the cloud a readable silhouette without a solid outer shell.
  const strands = new THREE.Group();
  const strandMaterial = new THREE.LineBasicMaterial({
    color: "#b4a8d5",
    transparent: true,
    opacity: 0.32,
    depthWrite: false,
  });
  for (let strand = 0; strand < 22; strand++) {
    const pts = [];
    const side = strand % 2 ? 1 : -1;
    const longitude = (strand / 22) * Math.PI * 2;
    for (let k = 0; k <= 96; k++) {
      const phi = (k / 96) * Math.PI;
      const theta = longitude + Math.sin(phi * 7 + strand) * 0.12;
      pts.push(
        new THREE.Vector3(
          side * (0.56 + Math.sin(phi) * Math.cos(theta) * 0.68),
          Math.cos(phi) * 1.55,
          Math.sin(phi) * Math.sin(theta) * 1.13,
        ),
      );
    }
    strands.add(
      new THREE.Line(
        new THREE.BufferGeometry().setFromPoints(pts),
        strandMaterial,
      ),
    );
  }
  sculpture.add(strands);
  const targetColor = new THREE.Color();
  let currentMode = -1;
  let morphing = true;
  return {
    update({ time, delta, pointer, settings, reducedMotion }) {
      const mode = Math.max(
        0,
        modes.findIndex((item) => item.id === settings.mode),
      );
      if (currentMode !== mode) {
        currentMode = mode;
        morphing = true;
      }
      if (morphing) {
        const amount = reducedMotion
          ? 1
          : Math.min(1, Math.max(delta, 0.016) * 4.5);
        let distance = 0;
        for (let i = 0; i < positions.length; i++) {
          const change = states[mode][i] - positions[i];
          positions[i] += change * amount;
          distance += Math.abs(change);
        }
        geometry.attributes.position.needsUpdate = true;
        pairs.forEach(([a, b], i) => {
          for (let axis = 0; axis < 3; axis++) {
            threads[i * 6 + axis] = positions[a * 3 + axis];
            threads[i * 6 + 3 + axis] = positions[b * 3 + axis];
          }
        });
        threadGeometry.attributes.position.needsUpdate = true;
        morphing = distance > 0.02;
        targetColor
          .set(modes[mode].color)
          .lerp(new THREE.Color("#ffffff"), 0.48);
        material.color.lerp(targetColor, amount);
        threadMaterial.color.lerp(targetColor, amount);
        strands.visible = mode === 0;
      }
      sculpture.rotation.y =
        -0.42 + Math.sin(time * 0.15) * 0.2 + pointer.x * 0.13;
      sculpture.rotation.z = 0.13 + Math.sin(time * 0.12) * 0.04;
      sculpture.rotation.x = -0.12 + pointer.y * 0.08;
      sculpture.position.y = Math.sin(time * 0.5) * 0.055;
    },
  };
}

const exercises = {
  focus: [
    {
      title: "Find the smallest next step.",
      text: "Describe what progress could look like in just ten minutes. Leave the larger plan outside the room for a moment.",
      tag: "A little clarity",
    },
    {
      title: "Give the important part a name.",
      text: "Finish this sentence: what I really want to understand is… Keep rewriting it until only one question remains.",
      tag: "One good question",
    },
  ],
  explore: [
    {
      title: "Borrow a different pair of eyes.",
      text: "How would a gardener, a musician, and a curious child each approach this? Write down the unexpected connection between their answers.",
      tag: "A change of perspective",
    },
    {
      title: "Make a map of the edges.",
      text: "Write your idea in the middle of a page. Add five things it reminds you of. Follow the connection that feels the least obvious.",
      tag: "Follow your curiosity",
    },
  ],
  dream: [
    {
      title: "Let the impossible have a turn.",
      text: "For a minute, remove one rule you usually accept. Time, gravity, cost, convention. What could your idea become without it?",
      tag: "Permission to wander",
    },
    {
      title: "Send a postcard from the future.",
      text: "Imagine your idea already exists. Describe a small, ordinary moment in the world it has changed. What can you bring back to today?",
      tag: "A possible tomorrow",
    },
  ],
};

export default function Synapse() {
  const enabled = useMotionEnabled();
  const [mode, setMode] = useState("focus");
  const [thought, setThought] = useState("");
  const [result, setResult] = useState(null);
  const [turn, setTurn] = useState(0);
  const selected = modes.find((item) => item.id === mode);
  const reveal = {
    initial: enabled ? { opacity: 0, y: 26 } : false,
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.9, ease: [0.16, 1, 0.3, 1] },
  };
  function changeMode(next) {
    setMode(next);
    setResult(null);
    setTurn(0);
  }
  function openThought(event) {
    event.preventDefault();
    setResult({
      ...exercises[mode][turn % exercises[mode].length],
      thought: thought.trim(),
      key: turn,
    });
    setTurn((value) => value + 1);
  }
  return (
    <div className="synapse-root">
      <header className="synapse-nav">
        <a className="synapse-brand" href="#main" aria-label="Synapse home">
          <span className="synapse-symbol" aria-hidden="true">
            ✳
          </span>{" "}
          synapse
        </a>
        <a className="synapse-nav-note" href="#synapse-about">
          A little more headspace
        </a>
        <a className="synapse-nav-cta" href="#synapse-playground">
          Find your thought <span aria-hidden="true">↗</span>
        </a>
      </header>

      <main id="main">
        <section className="synapse-hero" aria-labelledby="synapse-title">
          <div className="synapse-intro">
            <motion.p className="synapse-eyebrow" {...reveal}>
              <span /> A quiet space for curious minds
            </motion.p>
            <motion.h1
              id="synapse-title"
              {...reveal}
              transition={{ ...reveal.transition, delay: enabled ? 0.1 : 0 }}
            >
              Room for
              <br />a <em>bigger</em>
              <br />
              thought.
            </motion.h1>
            <motion.a
              className="synapse-start"
              href="#synapse-playground"
              {...reveal}
              transition={{ ...reveal.transition, delay: enabled ? 0.2 : 0 }}
              whileHover={enabled ? { x: 4 } : undefined}
            >
              Make a little space <span aria-hidden="true">↗</span>
            </motion.a>
          </div>
          <div className="synapse-art">
            <span className="synapse-art-label">THE SHAPE OF A THOUGHT</span>
            <Scene
              build={buildMind}
              settings={{ mode }}
              className="synapse-brain"
              label={`A floating, translucent particle sculpture in ${selected.name.toLowerCase()} mode`}
            />
            <span className="synapse-art-index" aria-hidden="true">
              01 — ∞<br />
              <span>Possibility, in motion</span>
            </span>
            <p className="synapse-art-copy">
              Good ideas need room to breathe.
              <br />A pause. A new perspective.
              <br />A small leap into the unknown.
            </p>
          </div>
          <div className="synapse-mindset">
            <p>Where is your mind today?</p>
            <div
              className="synapse-modes"
              role="group"
              aria-label="Choose a thinking mode"
            >
              {modes.map((item, index) => (
                <motion.button
                  key={item.id}
                  type="button"
                  aria-pressed={mode === item.id}
                  onClick={() => changeMode(item.id)}
                  whileHover={enabled ? { y: -2 } : undefined}
                  whileTap={enabled ? { scale: 0.96 } : undefined}
                  transition={{ type: "spring", stiffness: 330, damping: 24 }}
                >
                  <span className="synapse-mode-dot" data-mode={item.id} />
                  {item.name}
                  <small>0{index + 1}</small>
                </motion.button>
              ))}
            </div>
            <AnimatePresence mode="wait">
              <motion.span
                className="synapse-mode-note"
                key={mode}
                initial={enabled ? { opacity: 0, y: 5 } : false}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: enabled ? 0.2 : 0 }}
              >
                {selected.note}
              </motion.span>
            </AnimatePresence>
          </div>
        </section>

        <section
          className="synapse-playground"
          id="synapse-playground"
          aria-labelledby="synapse-play-title"
        >
          <motion.div
            className="synapse-play-intro"
            initial={enabled ? { opacity: 0, y: 24 } : false}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.2 }}
            transition={{ duration: 0.7 }}
          >
            <p className="synapse-eyebrow">A THOUGHT EXPERIMENT</p>
            <h2 id="synapse-play-title">
              Start with
              <br />
              <em>a little wonder.</em>
            </h2>
            <p>
              You don’t need a perfect question.
              <br />
              Just something you’re curious about.
            </p>
          </motion.div>
          <div className="synapse-workspace">
            <div className="synapse-exercise-label">
              <span>YOUR SPACE</span>
              <span>
                {selected.name} mode{" "}
                <i style={{ background: selected.color }} />
              </span>
            </div>
            <form onSubmit={openThought}>
              <label htmlFor="synapse-thought">What’s on your mind?</label>
              <textarea
                id="synapse-thought"
                maxLength={180}
                rows={2}
                placeholder="An idea, a question, a what if…"
                value={thought}
                onChange={(event) => setThought(event.target.value)}
              />
              <div className="synapse-form-bottom">
                <span>A small thought is a good beginning.</span>
                <motion.button
                  type="submit"
                  whileHover={enabled ? { scale: 1.04 } : undefined}
                  whileTap={enabled ? { scale: 0.96 } : undefined}
                >
                  Open a possibility <span aria-hidden="true">↗</span>
                </motion.button>
              </div>
            </form>
            <div aria-live="polite" aria-atomic="true">
              <AnimatePresence mode="wait">
                {result && (
                  <motion.div
                    className="synapse-result"
                    key={`${mode}-${result.key}`}
                    initial={enabled ? { opacity: 0, y: 15 } : false}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: enabled ? -8 : 0 }}
                    transition={{ duration: enabled ? 0.3 : 0 }}
                  >
                    <span>{result.tag}</span>
                    {result.thought && (
                      <p className="synapse-your-thought">
                        Thinking about “{result.thought}”
                      </p>
                    )}
                    <h3>{result.title}</h3>
                    <p>{result.text}</p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
            <p className="synapse-honest-note">
              A creative exercise from our collection of prompts.
              <br />
              Your thoughts stay in this browser.
            </p>
          </div>
        </section>
        <footer className="synapse-footer" id="synapse-about">
          <span className="synapse-brand">
            <span className="synapse-symbol" aria-hidden="true">
              ✳
            </span>{" "}
            synapse
          </span>
          <p>Less noise. More possibility.</p>
          <span>A space for the unfinished.</span>
        </footer>
      </main>
    </div>
  );
}
