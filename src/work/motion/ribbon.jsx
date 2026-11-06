import React, { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import Scene from "./Scene.jsx";
import { useMotionEnabled } from "./runtime.jsx";
import "./ribbon.css";

const projects = [
  {
    name: "RADIANT",
    type: "Music & culture",
    title: "Turn the volume all the way up.",
    year: "2026",
    color: "#ff623c",
    detail:
      "A living identity for a new generation of sound. Bold forms, restless rhythm, and a visual language that refuses to stand still.",
  },
  {
    name: "FORM / 01",
    type: "Objects & spaces",
    title: "A different way to see the everyday.",
    year: "2026",
    color: "#b9c6ff",
    detail:
      "An exploration of everyday objects, told through unexpected scale and sculptural compositions. A little familiar. A little otherworldly.",
  },
  {
    name: "OFFLINE",
    type: "Community & culture",
    title: "Good things happen out there.",
    year: "2025",
    color: "#efab78",
    detail:
      "A warm invitation to close the laptop and find your people. A tactile campaign built around real connections and imperfect moments.",
  },
  {
    name: "LUMA",
    type: "Beauty & wellness",
    title: "Let a different kind of light in.",
    year: "2026",
    color: "#e4aaff",
    detail:
      "Fluid form meets soft science. A sensorial visual world for a new beauty ritual, moving between the microscopic and the magnificent.",
  },
  {
    name: "OUTSIDE",
    type: "Sport & adventure",
    title: "There is no ordinary way out.",
    year: "2025",
    color: "#e5ef5a",
    detail:
      "Energy you can almost touch. We made an outdoor brand feel as alive as the places it takes you, with kinetic type and fearless color.",
  },
  {
    name: "ECHO",
    type: "Sound & technology",
    title: "A sound that stays with you.",
    year: "2026",
    color: "#b0ebaa",
    detail:
      "A sonic identity made visible. Layered frequencies, hypnotic patterns, and a digital experience tuned to the feeling of your favorite track.",
  },
  {
    name: "SOL",
    type: "Food & hospitality",
    title: "Meet you on the sunny side.",
    year: "2025",
    color: "#ff909e",
    detail:
      "Sun-soaked optimism, bottled. A bright and playful world for the neighborhood gathering place that makes every day feel like a weekend.",
  },
];

function drawProject(THREE, index) {
  const canvas = document.createElement("canvas");
  canvas.width = 768;
  canvas.height = 960;
  const c = canvas.getContext("2d");
  const w = canvas.width,
    h = canvas.height;
  const circle = (x, y, r, color) => {
    c.fillStyle = color;
    c.beginPath();
    c.arc(x, y, r, 0, Math.PI * 2);
    c.fill();
  };
  const label = (text, x, y, size = 24, color = "#131313", font = "Arial") => {
    c.fillStyle = color;
    c.font = `700 ${size}px ${font}`;
    c.fillText(text, x, y);
  };
  c.fillStyle = [
    "#ff5c35",
    "#152fdf",
    "#eee5d3",
    "#d0a4eb",
    "#dce94c",
    "#102b22",
    "#fa8492",
  ][index];
  c.fillRect(0, 0, w, h);
  if (index === 0) {
    c.save();
    c.translate(385, 470);
    c.rotate(-0.34);
    for (let i = 14; i > 0; i--) {
      c.fillStyle = i % 2 ? "#23130e" : "#ff5c35";
      c.beginPath();
      c.ellipse(0, 0, 210 + i * 11, 120 + i * 20, 0, 0, Math.PI * 2);
      c.fill();
    }
    c.restore();
    label("RADIANT", 35, 184, 128, "#fff2cb");
    label("SOUND WITHOUT LIMITS", 42, 224, 22, "#fff2cb");
    label("FEEL EVERYTHING.", 42, 883, 32, "#fff2cb");
  } else if (index === 1) {
    label("FORM", 38, 160, 142, "#e9ecff");
    label("OBJECT STUDIES / VOL. 01", 44, 205, 22, "#e9ecff");
    c.save();
    c.translate(395, 530);
    c.rotate(-0.28);
    for (let i = 3; i >= 0; i--) {
      const y = i * 83 - 130;
      const grad = c.createLinearGradient(-210, y, 220, y + 130);
      grad.addColorStop(0, "#859bff");
      grad.addColorStop(0.45, "#fffef5");
      grad.addColorStop(1, "#8a9edf");
      c.fillStyle = grad;
      c.beginPath();
      c.roundRect(-230, y, 460, 158, 76);
      c.fill();
    }
    c.restore();
    label("A NEW PERSPECTIVE.", 43, 885, 29, "#e9ecff");
  } else if (index === 2) {
    label("OFFLINE", 40, 157, 124);
    label("GO FIND YOUR PEOPLE.", 44, 207, 25);
    c.save();
    c.translate(390, 525);
    for (let i = 0; i < 12; i++) {
      c.rotate(Math.PI / 6);
      c.fillStyle = i % 2 ? "#e45d32" : "#b44828";
      c.beginPath();
      c.ellipse(120, 0, 174, 60, 0, 0, Math.PI * 2);
      c.fill();
    }
    c.restore();
    circle(390, 525, 87, "#edc877");
    label("LESS SCREEN.", 44, 838, 50);
    label("MORE SCENE.", 44, 894, 50);
  } else if (index === 3) {
    const grad = c.createLinearGradient(0, 0, w, h);
    grad.addColorStop(0, "#efb8df");
    grad.addColorStop(0.5, "#a5a0ef");
    grad.addColorStop(1, "#f3bfab");
    c.fillStyle = grad;
    c.fillRect(0, 0, w, h);
    c.save();
    c.translate(384, 470);
    c.rotate(0.35);
    for (let i = 20; i > 0; i--) {
      c.strokeStyle =
        i % 3 === 0 ? "#fceada" : i % 3 === 1 ? "#6968ac" : "#d3d5ff";
      c.lineWidth = 8;
      c.beginPath();
      c.ellipse(0, 0, 42 + i * 12, 105 + i * 12, 0, 0, Math.PI * 2);
      c.stroke();
    }
    c.restore();
    label("LUMA", 44, 177, 153, "#2c215b");
    label("A RITUAL IN A NEW LIGHT", 47, 874, 27, "#2c215b");
  } else if (index === 4) {
    label("OUT", 30, 279, 264);
    label("SIDE", 28, 505, 232);
    label("THE ORDINARY.", 41, 560, 43);
    c.save();
    c.translate(390, 744);
    c.rotate(-0.22);
    c.strokeStyle = "#151515";
    c.lineWidth = 24;
    for (let i = 0; i < 4; i++) {
      c.beginPath();
      c.moveTo(-250 + i * 85, -80);
      c.lineTo(-130 + i * 85, 0);
      c.lineTo(-250 + i * 85, 80);
      c.stroke();
    }
    c.restore();
    label("GO YOUR OWN WAY ↗", 42, 908, 25);
  } else if (index === 5) {
    for (let i = 0; i < 20; i++) {
      c.strokeStyle = i % 2 ? "#b1eca8" : "#4a7657";
      c.lineWidth = 8;
      c.beginPath();
      c.ellipse(386, 478, 50 + i * 23, 70 + i * 22, 0.5, 0, Math.PI * 2);
      c.stroke();
    }
    c.fillStyle = "#102b22";
    c.fillRect(0, 352, w, 235);
    label("ECHO", 39, 535, 222, "#d1ffbe");
    label("FEEL THE FREQUENCY", 42, 888, 29, "#d1ffbe");
  } else {
    circle(385, 500, 260, "#e94a29");
    circle(385, 500, 158, "#ffcd62");
    c.strokeStyle = "#722f28";
    c.lineWidth = 9;
    for (let i = 0; i < 14; i++) {
      const angle = (i / 14) * Math.PI * 2;
      c.beginPath();
      c.moveTo(385 + Math.cos(angle) * 290, 500 + Math.sin(angle) * 290);
      c.lineTo(385 + Math.cos(angle) * 345, 500 + Math.sin(angle) * 345);
      c.stroke();
    }
    label("SOL", 43, 235, 232, "#722f28");
    label("THE SUNNY SIDE OF LIFE", 42, 888, 27, "#722f28");
  }
  label("R /", 42, 48, 19, index === 1 || index === 5 ? "#eaf5e1" : "#221d20");
  c.textAlign = "right";
  label(
    `0${index + 1} — ${projects[index].year}`,
    725,
    48,
    18,
    index === 1 || index === 5 ? "#eaf5e1" : "#221d20",
  );
  c.textAlign = "left";
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  return texture;
}

function buildRibbon({ THREE, scene, camera }) {
  camera.position.set(0, 0.1, 7.1);
  const group = new THREE.Group();
  scene.add(group);
  const radius = 7.5;
  const panels = projects.map((_, i) => {
    const geometry = new THREE.PlaneGeometry(2.15, 2.72, 36, 1);
    const positions = geometry.attributes.position;
    for (let n = 0; n < positions.count; n++) {
      const x = positions.getX(n),
        theta = x / radius;
      positions.setX(n, Math.sin(theta) * radius);
      positions.setZ(n, (Math.cos(theta) - 1) * radius);
    }
    geometry.computeVertexNormals();
    const mesh = new THREE.Mesh(
      geometry,
      new THREE.MeshBasicMaterial({
        map: drawProject(THREE, i),
        side: THREE.DoubleSide,
        toneMapped: false,
      }),
    );
    group.add(mesh);
    return mesh;
  });
  let rotation = 0;
  return {
    update({ time, delta, pointer, settings, reducedMotion }) {
      const target = settings.selected || 0;
      let distance = ((((target - rotation + 3.5) % 7) + 7) % 7) - 3.5;
      rotation += reducedMotion ? distance : distance * Math.min(delta * 7, 1);
      if (Math.abs(distance) < 0.0001) rotation = target;
      panels.forEach((panel, i) => {
        const slot = ((((i - rotation + 3.5) % 7) + 7) % 7) - 3.5;
        const theta = slot * 0.324;
        panel.position.set(
          Math.sin(theta) * radius,
          Math.abs(slot) * 0.035 +
            (reducedMotion ? 0 : Math.sin(time * 0.55 + i * 0.7) * 0.025),
          (Math.cos(theta) - 1) * radius,
        );
        panel.rotation.y = theta;
      });
      group.rotation.z = reducedMotion ? -0.035 : -0.035 + pointer.x * 0.008;
      group.rotation.x = reducedMotion ? 0.025 : 0.025 + pointer.y * 0.015;
    },
  };
}

export default function Ribbon() {
  const [selected, setSelected] = useState(0);
  const [showDetail, setShowDetail] = useState(false);
  const enabled = useMotionEnabled();
  const project = projects[selected];
  const choose = (index) => {
    setSelected((index + projects.length) % projects.length);
    setShowDetail(false);
  };
  return (
    <div className="ribbon-page">
      <header className="ribbon-header">
        <a className="ribbon-wordmark" href="#main" aria-label="Ribbon home">
          RIBBON<span>®</span>
        </a>
        <span className="ribbon-header-note">
          Independent minds.
          <br />
          Extraordinary motion.
        </span>
        <a href="#ribbon-studio" className="ribbon-studio-link">
          The studio <span aria-hidden="true">↗</span>
        </a>
      </header>
      <main id="main">
        <section className="ribbon-hero" aria-labelledby="ribbon-title">
          <div className="ribbon-heading">
            <motion.p
              initial={enabled ? { opacity: 0, y: 12 } : false}
              animate={{ opacity: 1, y: 0 }}
            >
              A DESIGN & MOTION STUDIO
            </motion.p>
            <h1 id="ribbon-title">
              <motion.span
                initial={enabled ? { y: 75, opacity: 0 } : false}
                animate={{ y: 0, opacity: 1 }}
                transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
              >
                Ideas in <em>motion.</em>

              </motion.span>
            </h1>
            <motion.p
              className="ribbon-heading-sub"
              initial={enabled ? { opacity: 0 } : false}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.35 }}
            >
              We turn a spark of an idea into something you can’t look away
              from.
            </motion.p>
          </div>
          <div className="ribbon-stage">
            <span className="ribbon-stage-tag">SELECTED WORK / 2025—26</span>
            <Scene
              build={buildRibbon}
              settings={{ selected }}
              className="ribbon-canvas"
              label={`Curved three-dimensional gallery of seven original project posters. Selected project: ${project.name}.`}
            />
            <div className="ribbon-stage-shade" />
          </div>
          <div className="ribbon-project-bar">
            <div
              className="ribbon-project-info"
              aria-live="polite"
              aria-atomic="true"
            >
              <span className="ribbon-eyebrow">IN FOCUS</span>
              <AnimatePresence mode="wait">
                <motion.div
                  key={selected}
                  initial={enabled ? { opacity: 0, y: 12 } : false}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: enabled ? -8 : 0 }}
                  transition={{ duration: 0.18 }}
                >
                  <h2>
                    {project.name}
                    <span>{project.year}</span>
                  </h2>
                  <p>{project.type}</p>
                </motion.div>
              </AnimatePresence>
            </div>
            <button
              className="ribbon-project-open"
              type="button"
              onClick={() => setShowDetail((v) => !v)}
              aria-expanded={showDetail}
              aria-controls="ribbon-project-detail"
            >
              {showDetail ? "Close project notes" : "Inside the project"}
              <span aria-hidden="true">{showDetail ? "−" : "↗"}</span>
            </button>
            <div
              className="ribbon-controls"
              aria-label="Project carousel"
              onKeyDown={(event) => {
                if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
                  event.preventDefault();
                  choose(selected + (event.key === "ArrowRight" ? 1 : -1));
                }
              }}
            >
              <button
                type="button"
                aria-label="Previous project"
                onClick={() => choose(selected - 1)}
              >
                ←
              </button>
              <span>
                {String(selected + 1).padStart(2, "0")} <i>/</i> 07
              </span>
              <button
                type="button"
                aria-label="Next project"
                onClick={() => choose(selected + 1)}
              >
                →
              </button>
            </div>
          </div>
          <div className="ribbon-progress" aria-label="Choose a project">
            {projects.map((p, i) => (
              <button
                type="button"
                key={p.name}
                aria-label={`Show ${p.name}`}
                aria-pressed={selected === i}
                onClick={() => choose(i)}
              >
                <span style={{ "--project-color": p.color }} />
                <span className="ribbon-project-dot-label">{p.name}</span>
              </button>
            ))}
          </div>
          <AnimatePresence>
            {showDetail && (
              <motion.div
                className="ribbon-detail"
                id="ribbon-project-detail"
                initial={enabled ? { opacity: 0, y: 14 } : false}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
              >
                <span style={{ color: project.color }}>
                  THE IDEA / 0{selected + 1}
                </span>
                <h3>{project.title}</h3>
                <p>{project.detail}</p>
                <div>
                  <span>Creative direction</span>
                  <span>Visual identity</span>
                  <span>Motion design</span>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </section>
        <section className="ribbon-about" id="ribbon-studio">
          <div>
            <span className="ribbon-eyebrow">SMALL STUDIO. BIG FEELINGS.</span>
            <motion.h2
              initial={enabled ? { opacity: 0, y: 30 } : false}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.5 }}
              transition={{ duration: 0.65 }}
            >
              Good ideas
              <br />
              deserve to <em>move.</em>
            </motion.h2>
          </div>
          <div className="ribbon-about-copy">
            <p>
              We’re a collective of designers, thinkers, and frame-by-frame
              obsessives. We connect strategy, identity, and motion to make
              brands feel alive.
            </p>
            <div className="ribbon-services">
              <span>01 / Creative direction</span>
              <span>02 / Brand identity</span>
              <span>03 / 3D & motion</span>
              <span>04 / Digital experiences</span>
            </div>
            <a href="#ribbon-title">
              Back to the work <span aria-hidden="true">↗</span>
            </a>
          </div>
        </section>
        <footer className="ribbon-footer">
          <a className="ribbon-wordmark" href="#main">
            RIBBON<span>®</span>
          </a>
          <p>Always moving. Always curious.</p>
          <span>© 2026 / A studio concept</span>
        </footer>
      </main>
    </div>
  );
}
