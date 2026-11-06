import React, { useRef, useState } from "react";
import { AnimatePresence, motion, useScroll, useTransform } from "motion/react";
import { useMotionEnabled } from "./runtime.jsx";
import Scene from "./Scene.jsx";
import "./outform.css";

const palettes = [
  { id: "heat", name: "Heat", color: "#f45323" },
  { id: "volt", name: "Volt", color: "#d9f348" },
  { id: "ultra", name: "Ultra", color: "#163bec" },
];

const projects = [
  {
    name: "OFF SCRIPT",
    type: "Culture / Brand world",
    year: "01",
    color: "#d9f348",
    ink: "#182dff",
    description:
      "An identity for the ideas that refuse to sit still. Loud forms, loose rules, and an attitude that moves.",
  },
  {
    name: "AFTER HOURS",
    type: "Music / Digital experience",
    year: "02",
    color: "#f4baf1",
    ink: "#4315a8",
    description:
      "A nocturnal playground for a new wave of sound. Built around the feeling of finding your people on the dance floor.",
  },
  {
    name: "UNCOMMON",
    type: "Objects / Art direction",
    year: "03",
    color: "#97c6f8",
    ink: "#fc4d28",
    description:
      "Everyday objects with an unexpected point of view. A visual language that turns a second glance into a lasting impression.",
  },
];

function buildStar({ THREE, scene, camera }) {
  camera.position.set(0, 0, 7.7);
  const group = new THREE.Group();
  const shape = new THREE.Shape();
  for (let i = 0; i < 24; i++) {
    const a = (i / 24) * Math.PI * 2;
    const r = i % 2 ? 0.72 : 1.7;
    const x = Math.cos(a) * r;
    const y = Math.sin(a) * r;
    if (i === 0) shape.moveTo(x, y);
    else shape.lineTo(x, y);
  }
  shape.closePath();
  const geometry = new THREE.ExtrudeGeometry(shape, {
    depth: 0.32,
    bevelEnabled: true,
    bevelSegments: 5,
    steps: 1,
    bevelSize: 0.12,
    bevelThickness: 0.12,
  });
  geometry.center();
  const material = new THREE.MeshPhysicalMaterial({
    color: "#e7eafa",
    metalness: 1,
    roughness: 0.16,
    clearcoat: 1,
  });
  const star = new THREE.Mesh(geometry, material);
  group.add(star);
  const orbit = new THREE.Mesh(
    new THREE.TorusGeometry(2.05, 0.035, 12, 100),
    new THREE.MeshStandardMaterial({
      color: "#192dff",
      metalness: 0.25,
      roughness: 0.3,
    }),
  );
  orbit.rotation.x = 1.03;
  orbit.rotation.y = 0.4;
  group.add(orbit);
  group.rotation.set(0.2, -0.25, -0.1);
  scene.add(group);
  return {
    update({ time, pointer, settings, reducedMotion }) {
      orbit.material.color.set(settings.ink || "#192dff");
      star.rotation.z = reducedMotion ? 0 : time * 0.12;
      group.rotation.y = -0.25 + (reducedMotion ? 0 : pointer.x * 0.25);
      group.rotation.x = 0.2 + (reducedMotion ? 0 : pointer.y * 0.15);
    },
  };
}

function Arrow({ diagonal = false }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d={diagonal ? "M5 19 19 5M5 5h14v14" : "M4 12h16m-7-7 7 7-7 7"}
        stroke="currentColor"
        strokeWidth="1.7"
      />
    </svg>
  );
}

export default function Outform() {
  const enabled = useMotionEnabled();
  const [palette, setPalette] = useState("heat");
  const [selected, setSelected] = useState(0);
  const heroRef = useRef(null);
  const { scrollYProgress } = useScroll({
    target: heroRef,
    offset: ["start start", "end start"],
  });
  const titleY = useTransform(scrollYProgress, [0, 1], [0, 160]);
  const characterY = useTransform(scrollYProgress, [0, 1], [0, -70]);
  const asideY = useTransform(scrollYProgress, [0, 1], [0, 110]);
  const project = projects[selected];

  return (
    <div className={`out-page out-palette-${palette}`}>
      <header className="out-header">
        <a className="out-logo" href="#main" aria-label="Outform home">
          outform<span>®</span>
        </a>
        <span className="out-header-note">
          INDEPENDENT MINDS.
          <br />
          UNEXPECTED OUTCOMES.
        </span>
        <nav aria-label="Studio navigation">
          <a href="#out-work">
            Our work <span>03</span>
          </a>
          <a href="#out-studio">
            The studio <Arrow diagonal />
          </a>
        </nav>
      </header>

      <main id="main">
        <section
          className="out-hero"
          ref={heroRef}
          aria-label="Outform creative studio"
        >
          <motion.h1
            className="out-title"
            style={{ y: enabled ? titleY : 0 }}
            initial={enabled ? { opacity: 0 } : false}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          >
            OUTFORM
          </motion.h1>
          <motion.div
            className="out-side-copy"
            style={{ y: enabled ? asideY : 0 }}
          >
            <span className="out-eyebrow">CREATIVE BY NATURE.</span>
            <p>
              We make brands
              <br />
              feel something.
              <br />
              <strong>Then do something.</strong>
            </p>
            <a href="#out-work" className="out-text-link">
              Explore our world <Arrow />
            </a>
          </motion.div>
          <motion.div
            className="out-character"
            style={{ y: enabled ? characterY : 0 }}
            initial={enabled ? { opacity: 0, scale: 0.96 } : false}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 1, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
          >
            <img
              src="/work/motion-lab/outform-character.png"
              alt="Original creative character with electric blue sculpted hair, yellow glasses and an orange jacket"
              width="1199"
              height="1312"
              fetchPriority="high"
            />
          </motion.div>
          <motion.div
            className="out-hero-words"
            aria-hidden="true"
            style={{ y: enabled ? asideY : 0 }}
          >
            <span>MORE</span>
            <span>THAN</span>
            <span>EXPECTED.</span>
          </motion.div>
          <motion.a
            className="out-round-link"
            href="#out-work"
            whileHover={enabled ? { rotate: -8, scale: 1.04 } : undefined}
            whileTap={enabled ? { scale: 0.96 } : undefined}
          >
            <span>
              MAKE
              <br />
              SOME
              <br />
              NOISE.
            </span>
            <Arrow diagonal />
          </motion.a>
          <div className="out-hero-footer">
            <span>
              GOOD IDEAS DON’T
              <br />
              FIT IN BOXES. ↙
            </span>
            <fieldset className="out-palette-picker">
              <legend>CHANGE THE ENERGY</legend>
              <div>
                {palettes.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    aria-label={`${item.name} color palette`}
                    aria-pressed={palette === item.id}
                    onClick={() => setPalette(item.id)}
                    style={{ "--swatch": item.color }}
                  >
                    <span />
                  </button>
                ))}
              </div>
            </fieldset>
          </div>
        </section>

        <section className="out-studio" id="out-studio">
          <div className="out-section-label">
            <span>01 / THE WAY WE THINK</span>
            <span>NO SAME OLD, SAME OLD.</span>
          </div>
          <motion.h2
            initial={enabled ? { opacity: 0, y: 30 } : false}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.3 }}
            transition={{ duration: 0.6 }}
          >
            A LITTLE
            <br />
            OUT OF <span>LINE.</span>
          </motion.h2>
          <div className="out-studio-bottom">
            <span className="out-asterisk" aria-hidden="true">
              ✳
            </span>
            <p>
              We’re a creative studio for brands with something to say.
              Strategy, identity, digital experiences — all shaped by curiosity,
              a little instinct, and a healthy disregard for the expected.
            </p>
            <a href="#out-work" className="out-studio-cta">
              See what that looks like <Arrow diagonal />
            </a>
          </div>
        </section>

        <section
          className="out-work"
          id="out-work"
          aria-labelledby="out-work-heading"
        >
          <div className="out-section-label">
            <h2 id="out-work-heading">02 / SELECTED EXPERIMENTS</h2>
            <span>THREE WAYS TO STAND OUT.</span>
          </div>
          <div className="out-project-layout">
            <div className="out-project-selector">
              <p>
                Pick a different
                <br />
                <strong>point of view.</strong>
              </p>
              <div role="tablist" aria-label="Selected projects">
                {projects.map((item, index) => (
                  <button
                    key={item.name}
                    id={`out-tab-${index}`}
                    type="button"
                    role="tab"
                    aria-selected={selected === index}
                    aria-controls="out-project-panel"
                    onClick={() => setSelected(index)}
                    onKeyDown={(event) => {
                      if (
                        event.key === "ArrowDown" ||
                        event.key === "ArrowRight" ||
                        event.key === "ArrowUp" ||
                        event.key === "ArrowLeft"
                      ) {
                        event.preventDefault();
                        const next =
                          (selected +
                            (event.key === "ArrowDown" ||
                            event.key === "ArrowRight"
                              ? 1
                              : 2)) %
                          3;
                        setSelected(next);
                        document.getElementById(`out-tab-${next}`)?.focus();
                      }
                    }}
                  >
                    <span>{item.year}</span>
                    {item.name}
                    <Arrow diagonal />
                  </button>
                ))}
              </div>
            </div>
            <div
              id="out-project-panel"
              className="out-project-panel"
              role="tabpanel"
              aria-labelledby={`out-tab-${selected}`}
              style={{
                "--project-color": project.color,
                "--project-ink": project.ink,
              }}
            >
              <div className="out-project-art">
                <span className="out-art-corner">
                  OF / EXPERIMENT {project.year}
                </span>
                <AnimatePresence mode="wait">
                  <motion.div
                    className="out-project-title"
                    key={project.name}
                    initial={enabled ? { opacity: 0, y: 25 } : false}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: enabled ? -20 : 0 }}
                    transition={{ duration: 0.25 }}
                    aria-hidden="true"
                  >
                    {project.name}
                  </motion.div>
                </AnimatePresence>
                <Scene
                  build={buildStar}
                  settings={{ ink: project.ink }}
                  label="Rotating polished twelve-point chrome star with a colored orbit"
                  className="out-star-scene"
                />
                <span className="out-art-footer">
                  UNUSUAL IS A GOOD PLACE TO START. <span>↗</span>
                </span>
              </div>
              <div className="out-project-caption" aria-live="polite">
                <div>
                  <h3>{project.name}</h3>
                  <span>{project.type}</span>
                </div>
                <p>{project.description}</p>
              </div>
            </div>
          </div>
        </section>
        <footer className="out-footer">
          <a href="#main" className="out-logo">
            outform<span>®</span>
          </a>
          <span>STAY CURIOUS. MAKE A LITTLE NOISE.</span>
          <a href="#main">Back to the top ↑</a>
        </footer>
      </main>
    </div>
  );
}
