import React, { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useSpring } from "motion/react";
import { loadGarments, buildPiecePreview } from "./rail-garments.js";
import { createSpring, advanceSpring, settleSpring, attachClothMotion } from "./rail-physics.js";
import Scene from "./Scene.jsx";
import { useMotionEnabled } from "./runtime.jsx";
import "./rail.css";

const pieces = [
  {
    name: "Afterhours hoodie",
    color: "#111114",
    ink: "#c6c9cc",
    pattern: "word",
    shape: "hoodie",
    year: "2002",
    price: 145,
    group: "man",
    note: "Black fleece with a roomy silhouette. The one you keep reaching for.",
  },
  {
    name: "Pixel knit",
    color: "#d690aa",
    ink: "#e7e4df",
    pattern: "check",
    shape: "long",
    year: "2004",
    price: 95,
    group: "woman",
    note: "Powder pink, off-white checks, and the slightly oversized sleeves of a good memory.",
  },
  {
    name: "Velocity track top",
    color: "#76ce24",
    ink: "#c4f16e",
    pattern: "track",
    shape: "long",
    year: "2001",
    price: 125,
    group: "man",
    note: "Parrot-green technical fabric with bright piping. A late-night train ride, in jacket form.",
  },
  {
    name: "Orbit tee",
    color: "#bd1d2d",
    ink: "#f2c9cd",
    pattern: "orbit",
    shape: "tee",
    year: "2000",
    price: 65,
    group: "both",
    note: "Rich red cotton with an orbital line print. Softened by time.",
  },
  {
    name: "Contour tee",
    color: "#e7e3d5",
    ink: "#d21530",
    pattern: "contour",
    shape: "tee",
    year: "2003",
    price: 85,
    group: "both",
    note: "An asymmetric red contour print, cut from heavyweight bone cotton. Made to stand out quietly.",
  },
  {
    name: "Night shift hoodie",
    color: "#0e0e11",
    ink: "#c4c7cc",
    pattern: "flame",
    shape: "hoodie",
    year: "1999",
    price: 150,
    group: "man",
    note: "Black fleece, liquid silver flames. A little turn-of-the-century after-dark energy.",
  },
  {
    name: "Acid bloom tee",
    color: "#2146c7",
    ink: "#8bd927",
    pattern: "bloom",
    shape: "tee",
    year: "2005",
    price: 75,
    group: "both",
    note: "Deep blue and parrot-green dye clouds with a navy ringer collar. Somewhere between digital and organic.",
  },
  {
    name: "Circuit jersey",
    color: "#d5cdae",
    ink: "#8d5a54",
    pattern: "track",
    shape: "long",
    year: "2002",
    price: 110,
    group: "woman",
    note: "Sand-coloured jersey traced with muted red seams. Quietly futuristic, still.",
  },
  {
    name: "Blank slate tee",
    color: "#e0dcd0",
    ink: "#6d7973",
    pattern: "word",
    shape: "tee",
    year: "2001",
    price: 55,
    group: "man",
    note: "The perfect blank. A generous cut, dense cotton, and almost no explanation needed.",
  },
];

const railSpacing = 0.62;
const revealGap = 0.78;
const revealDepth = 1.7;

function buildRail({ THREE, scene, camera, renderer }) {
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  renderer.toneMappingExposure = 1;
  scene.fog = new THREE.FogExp2(0x101114, 0.012);
  const key = scene.children.find((o) => o.isDirectionalLight);
  key.intensity = 2.8;
  key.color.set(0xfff5e8);
  scene.environmentIntensity = 0.28;
  const rim = scene.children.filter((o) => o.isDirectionalLight)[1];
  if (rim) {
    rim.intensity = 2.2;
    rim.color.set(0xe2eaff);
    rim.position.set(4, 4, -3);
  }
  key.position.set(-6, 5, 5);
  key.castShadow = true;
  key.shadow.mapSize.set(1024, 1024);
  key.shadow.camera.left = -9;
  key.shadow.camera.right = 9;
  key.shadow.camera.top = 6;
  key.shadow.camera.bottom = -6;
  key.shadow.bias = -0.001;
  scene.children.find((o) => o.isHemisphereLight).intensity = 0.3;
  // A soft studio light follows the revealed garment without lighting the room.
  const spotlight = new THREE.SpotLight(0xfff7eb, 55, 20, Math.PI / 5, 0.85, 2);
  spotlight.position.set(-2, 6, 5);
  spotlight.target.position.set(0, 0, revealDepth);
  scene.add(spotlight, spotlight.target);
  camera.fov = 31;
  const silver = new THREE.MeshStandardMaterial({
    color: 0xd0d5cf,
    metalness: 0.92,
    roughness: 0.2,
  });
  const hangerMat = new THREE.MeshStandardMaterial({
    color: 0x2b3430,
    metalness: 0.45,
    roughness: 0.48,
  });
  const tube = (points, radius, mat, parent = scene) => {
    const curve = new THREE.CatmullRomCurve3(
      points.map((p) => new THREE.Vector3(...p)),
    );
    const mesh = new THREE.Mesh(
      new THREE.TubeGeometry(curve, 64, radius, 8, false),
      mat,
    );
    mesh.castShadow = true;
    parent.add(mesh);
    return mesh;
  };
  const frame = new THREE.CurvePath();
  frame.add(new THREE.LineCurve3(new THREE.Vector3(-5.7, -2.5, 0), new THREE.Vector3(-5.7, 1.6, 0)));
  frame.add(new THREE.QuadraticBezierCurve3(new THREE.Vector3(-5.7, 1.6, 0), new THREE.Vector3(-5.7, 1.95, 0), new THREE.Vector3(-5.35, 1.95, 0)));
  frame.add(new THREE.LineCurve3(new THREE.Vector3(-5.35, 1.95, 0), new THREE.Vector3(5.35, 1.95, 0)));
  frame.add(new THREE.QuadraticBezierCurve3(new THREE.Vector3(5.35, 1.95, 0), new THREE.Vector3(5.7, 1.95, 0), new THREE.Vector3(5.7, 1.6, 0)));
  frame.add(new THREE.LineCurve3(new THREE.Vector3(5.7, 1.6, 0), new THREE.Vector3(5.7, -2.5, 0)));
  const rack = new THREE.Mesh(new THREE.TubeGeometry(frame, 128, 0.045, 12, false), silver);
  rack.castShadow = true;
  scene.add(rack);
  for (const x of [-5.7, 5.7]) {
    tube(
      [
        [x, -2.46, -0.9],
        [x, -2.46, 0.9],
      ],
      0.06,
      silver,
    );
    for (const z of [-0.73, 0.73]) {
      const foot = new THREE.Mesh(
        new THREE.CylinderGeometry(0.11, 0.11, 0.1, 12),
        hangerMat,
      );
      foot.position.set(x, -2.52, z);
      scene.add(foot);
    }
  }
  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(150, 150),
    new THREE.ShadowMaterial({ color: 0x000000, opacity: 0.08 }),
  );
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = -2.62;
  floor.receiveShadow = true;
  scene.add(floor);
  const shadowCanvas = document.createElement("canvas");
  shadowCanvas.width = shadowCanvas.height = 128;
  const context = shadowCanvas.getContext("2d");
  const fade = context.createRadialGradient(64, 64, 0, 64, 64, 64);
  fade.addColorStop(0, "rgba(0,0,0,.32)");
  fade.addColorStop(0.55, "rgba(0,0,0,.14)");
  fade.addColorStop(1, "rgba(0,0,0,0)");
  context.fillStyle = fade;
  context.fillRect(0, 0, 128, 128);
  const contact = new THREE.Mesh(
    new THREE.PlaneGeometry(13, 3.8),
    new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(shadowCanvas), transparent: true, depthWrite: false, toneMapped: false }),
  );
  contact.rotation.x = -Math.PI / 2;
  contact.position.y = -2.61;
  scene.add(contact);
  const selectable = [],
    garments = pieces.map((piece, index) => {
      const group = new THREE.Group();
      group.position.set((index - 4) * railSpacing, 1.94, 0);
      scene.add(group);
      const hanger = new THREE.Group();
      group.add(hanger);
      tube(
        [
          [0.006, 0, 0],
          [0.072, 0.065, 0],
          [0.117, 0.013, 0],
          [0.098, -0.091, 0],
          [0, -0.156, 0],
          [0, -0.32, 0],
        ],
        0.014,
        hangerMat,
        hanger,
      );
      tube(
        [
          // Follow the GLB's shoulder seam inside the cloth: neck at ±0.27,
          // shoulder ends at ±0.76 after the garment's 1.27 scale/-1.2 offset.
          [0, -0.32, 0],
          [-0.26, -0.42, 0],
          [-0.58, -0.63, 0],
          [-0.73, -0.73, 0],
          [-0.67, -0.80, 0],
          [0, -0.80, 0],
          [0.67, -0.80, 0],
          [0.73, -0.73, 0],
          [0.58, -0.63, 0],
          [0.26, -0.42, 0],
          [0, -0.32, 0],
        ],
        0.018,
        hangerMat,
        hanger,
      );
      group.rotation.y = 1.15;
      return group;
    });
  const physics = garments.map((garment) => ({
    x: createSpring(garment.position.x),
    y: createSpring(garment.position.y),
    z: createSpring(garment.position.z),
    turn: createSpring(garment.rotation.y),
    swing: createSpring(),
    clothX: createSpring(),
    clothZ: createSpring(),
    twist: createSpring(),
    cloth: null,
  }));
  const cancelLoad = loadGarments({
    THREE, scene, camera, renderer, pieces,
    onLoad(garment, index) {
      garment.position.y = -1.2;
      garment.scale.setScalar(1.27);
      garments[index].add(garment);
      physics[index].cloth = attachClothMotion(THREE, garment);
      garment.traverse((mesh) => {
        if (!mesh.isMesh) return;
        mesh.userData.piece = index;
        selectable.push(mesh);
      });
    },
  });
  const raycaster = new THREE.Raycaster();
  const mouse = new THREE.Vector2(9, 9);
  let activeSettings = {};
  let pointerDown = null;
  let previousPointerX = null;
  let hovered = null;
  const hover = (event) => {
    if (event.pointerType === "touch" || pointerDown) return;
    const rect = renderer.domElement.getBoundingClientRect();
    mouse.set(
      ((event.clientX - rect.left) / rect.width) * 2 - 1,
      1 - ((event.clientY - rect.top) / rect.height) * 2,
    );
    raycaster.setFromCamera(mouse, camera);
    const hit = raycaster.intersectObjects(
      selectable.filter((m) => garments[m.userData.piece].visible),
    )[0];
    renderer.domElement.style.cursor = hit ? "pointer" : "grab";
    const candidate = hit?.object.userData.piece;
    const travel = previousPointerX == null ? 0 : (event.clientX - previousPointerX) / rect.width;
    previousPointerX = event.clientX;
    hovered = candidate ?? null;
    if (candidate != null && document.documentElement.dataset.motion === "on") {
      const impulse = THREE.MathUtils.clamp(travel * 12, -0.32, 0.32);
      const body = physics[candidate];
      body.clothX.velocity = THREE.MathUtils.clamp(body.clothX.velocity + impulse, -1.2, 1.2);
      body.twist.velocity = THREE.MathUtils.clamp(body.twist.velocity + impulse * 0.6, -0.8, 0.8);
    }
    // Retarget immediately, including while the previous piece is still turning.
    if (candidate != null && candidate !== activeSettings.selected) {
      activeSettings.onSelect?.(candidate);
    }
  };
  const down = (event) => {
    pointerDown = { x: event.clientX, y: event.clientY };
  };
  const cancel = () => {
    pointerDown = null;
    previousPointerX = null;
    hovered = null;
  };
  const up = (event) => {
    if (!pointerDown) return;
    const dx = event.clientX - pointerDown.x,
      dy = event.clientY - pointerDown.y;
    if (Math.abs(dx) > 45 && Math.abs(dx) > Math.abs(dy)) {
      activeSettings.onStep?.(dx > 0 ? -1 : 1);
    } else if (Math.abs(dx) < 10 && Math.abs(dy) < 10) {
      const rect = renderer.domElement.getBoundingClientRect();
      mouse.set(
        ((event.clientX - rect.left) / rect.width) * 2 - 1,
        1 - ((event.clientY - rect.top) / rect.height) * 2,
      );
      raycaster.setFromCamera(mouse, camera);
      const hit = raycaster.intersectObjects(
        selectable.filter((m) => garments[m.userData.piece].visible),
      )[0];
      if (hit) {
        activeSettings.onSelect?.(hit.object.userData.piece);
        activeSettings.onInspect?.();
      }
    }
    pointerDown = null;
  };
  renderer.domElement.addEventListener("pointermove", hover);
  renderer.domElement.addEventListener("pointerdown", down);
  renderer.domElement.addEventListener("pointerup", up);
  renderer.domElement.addEventListener("pointerleave", cancel);
  renderer.domElement.addEventListener("pointercancel", cancel);
  const target = new THREE.Vector3();
  let currentX = 0;
  return {
    update({ delta, time, pointer, settings, reducedMotion }) {
      activeSettings = settings;
      const visible = pieces
        .map((p, i) => ({ p, i }))
        .filter(
          ({ p }) =>
            settings.category === "room" ||
            p.group === settings.category ||
            p.group === "both",
        )
        .map((v) => v.i);
      const selected = visible.indexOf(settings.selected);
      const spacing = railSpacing;
      const activeX = (selected - (visible.length - 1) / 2) * spacing;
      const zoom = reducedMotion
        ? settings.category === "room"
          ? 0
          : 1
        : settings.zoom.get();
      const blend = reducedMotion
        ? 1
        : 1 - Math.exp(-Math.max(delta, 0.016) * 8);
      const mobile = window.innerWidth < 600;
      const frameWidth =
        2 * Math.tan((camera.fov * Math.PI) / 360) * camera.aspect;
      const wideZ = mobile ? 10.9 : Math.max(12.8, 12.7 / frameWidth);
      const closeZ = mobile ? 10.4 : Math.max(10.6, 7.5 / frameWidth);
      const cameraX = (mobile ? 1 : zoom * 0.72) * activeX;
      currentX += (cameraX - currentX) * blend;
      camera.position.set(
        currentX + (reducedMotion ? 0 : pointer.x * 0.1),
        0.65,
        wideZ + (closeZ - wideZ) * zoom,
      );
      target.set(currentX, mobile ? -0.85 : -0.25, 0);
      camera.lookAt(target);
      camera.updateProjectionMatrix();
      garments.forEach((g, i) => {
        const n = visible.indexOf(i);
        g.visible = n >= 0;
        if (n < 0) return;
        const active = i === settings.selected;
        const x =
          (n - (visible.length - 1) / 2) * spacing +
          (active ? 0 : n < selected ? -revealGap : revealGap);
        const body = physics[i];
        const move = (spring, value) => reducedMotion
          ? settleSpring(spring, value)
          : advanceSpring(spring, value, delta);
        g.position.x = move(body.x, x);
        g.position.y = move(body.y, active ? 1.65 : 1.94);
        g.position.z = move(body.z, active ? revealDepth : 0);
        const facing = Math.atan2(camera.position.x - g.position.x, camera.position.z - g.position.z);
        // Long sleeves overlap in profile, as they do on a closely hung rail.
        const restingTurn = pieces[i].shape === "tee" ? 1.24 : 1.43;
        const turn = facing + (active ? 0 : restingTurn);
        g.rotation.y = move(body.turn, turn);
        if (reducedMotion) {
          [body.swing, body.clothX, body.clothZ, body.twist].forEach((spring) => settleSpring(spring));
        } else {
          const sway = THREE.MathUtils.clamp(body.x.velocity * 0.012, -0.06, 0.06);
          advanceSpring(body.swing, sway + (hovered === i ? mouse.x * 0.025 : 0), delta, 95, 10);
          advanceSpring(body.clothX, THREE.MathUtils.clamp(-body.x.velocity * 0.025, -0.12, 0.12), delta, 85, 8);
          advanceSpring(body.clothZ, THREE.MathUtils.clamp(-body.z.velocity * 0.025, -0.12, 0.12), delta, 85, 8);
          advanceSpring(body.twist, THREE.MathUtils.clamp(-body.turn.velocity * 0.018, -0.12, 0.12), delta, 75, 8);
        }
        g.rotation.z = body.swing.value + (reducedMotion ? 0 : Math.sin(time * 0.6 + i * 0.7) * 0.005);
        body.cloth?.bend.set(body.clothX.value, body.clothZ.value, body.twist.value);
      });
      const litGarment = garments[settings.selected];
      spotlight.position.x = litGarment.position.x - 2;
      spotlight.target.position.set(litGarment.position.x, 0, litGarment.position.z);
    },
    dispose() {
      cancel();
      cancelLoad();
      physics.forEach((body) => body.cloth?.dispose());
      renderer.domElement.removeEventListener("pointermove", hover);
      renderer.domElement.removeEventListener("pointerdown", down);
      renderer.domElement.removeEventListener("pointerup", up);
      renderer.domElement.removeEventListener("pointerleave", cancel);
      renderer.domElement.removeEventListener("pointercancel", cancel);
    },
  };
}

function PiecePreview({ piece }) {
  const [back, setBack] = useState(false);
  return (
    <div className="rail-panel-art">
      <Scene
        build={buildPiecePreview}
        className="rail-piece-scene"
        label={`${piece.name}, ${back ? "back" : "front"} view`}
        settings={{ piece, back }}
      />
      <div className="rail-view-controls" role="group" aria-label="Garment view">
        <button aria-pressed={!back} onClick={() => setBack(false)}>Front</button>
        <button aria-pressed={back} onClick={() => setBack(true)}>Back</button>
      </div>
      <span className="rail-sticker">RE-WEAR. REPEAT.</span>
    </div>
  );
}

export default function Rail() {
  const enabled = useMotionEnabled();
  const [category, setCategory] = useState("room"),
    [selected, setSelected] = useState(4),
    [panel, setPanel] = useState(null),
    [size, setSize] = useState("M"),
    [message, setMessage] = useState("");
  const [bag, setBag] = useState(() => {
    try {
      return JSON.parse(
        localStorage.getItem("rail-saved-pieces") || "[]",
      ).filter(
        (v) =>
          Number.isInteger(v.index) &&
          pieces[v.index] &&
          ["S", "M", "L"].includes(v.size),
      );
    } catch {
      return [];
    }
  });
  const zoom = useSpring(0, { stiffness: 85, damping: 22 });
  const dialogRef = useRef(null),
    previousFocus = useRef(null);
  const visible = pieces
    .map((p, i) => ({ p, i }))
    .filter(
      ({ p }) =>
        category === "room" || p.group === category || p.group === "both",
    )
    .map((v) => v.i);
  const piece = pieces[selected];
  useEffect(() => {
    zoom.set(category === "room" ? 0 : 1);
  }, [category, zoom]);
  useEffect(() => {
    try {
      localStorage.setItem("rail-saved-pieces", JSON.stringify(bag));
    } catch {
      /* The selection still works when storage is unavailable. */
    }
  }, [bag]);
  useEffect(() => {
    if (!panel) return;
    previousFocus.current = document.activeElement;
    dialogRef.current?.querySelector("button")?.focus();
    const old = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const key = (e) => {
      if (e.key === "Escape") setPanel(null);
      if (e.key === "Tab") {
        const nodes = [
          ...dialogRef.current.querySelectorAll(
            "button,a,input,select,[tabindex='0']",
          ),
        ].filter((n) => !n.disabled);
        const first = nodes[0],
          last = nodes.at(-1);
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last?.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first?.focus();
        }
      }
    };
    document.addEventListener("keydown", key);
    return () => {
      document.body.style.overflow = old;
      document.removeEventListener("keydown", key);
      previousFocus.current?.focus();
    };
  }, [panel]);
  const select = (i) => {
    setSelected(i);
    setMessage("");
  };
  const step = (direction) => {
    const n = visible.indexOf(selected);
    select(visible[(n + direction + visible.length) % visible.length]);
  };
  const changeCategory = (value) => {
    setCategory(value);
    if (
      value !== "room" &&
      pieces[selected].group !== value &&
      pieces[selected].group !== "both"
    )
      select(pieces.findIndex((p) => p.group === value || p.group === "both"));
  };
  const save = () => {
    if (bag.some((v) => v.index === selected && v.size === size)) {
      setMessage("Already in your saved bag.");
      return;
    }
    setBag([...bag, { index: selected, size }]);
    setMessage("Saved. A good find.");
  };
  const transition = { duration: enabled ? 0.6 : 0, ease: [0.22, 1, 0.36, 1] };
  return (
    <div className="rail-root">
      <header className="rail-header">
        <a href="#main" className="rail-logo" aria-label="Rail archive home">
          rail<span>®</span>
        </a>
        <span className="rail-edition">ARCHIVE 001 / 1999—2005</span>
        <nav aria-label="Archive navigation">
          <button onClick={() => setPanel("about")}>
            The idea <span>↗</span>
          </button>
          <button onClick={() => setPanel("bag")}>
            Bag <span>({bag.length})</span>
          </button>
        </nav>
      </header>
      <main id="main">
        <section
          className="rail-room"
          data-view={category === "room" ? "wide" : "close"}
          aria-label="Interactive clothing archive"
        >
          <div className="rail-heading">
            <span className="rail-eyebrow">PAST LIVES. NEXT CHAPTERS.</span>
            <AnimatePresence mode="wait">
              <motion.h1
                key={category}
                initial={{ opacity: 0, y: enabled ? 12 : 0 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: enabled ? -10 : 0 }}
                transition={transition}
              >
                {category === "room" ? "archive" : category} /<br />
                clothing
              </motion.h1>
            </AnimatePresence>
          </div>
          <div className="rail-stage">
            <Scene
              build={buildRail}
              settings={{
                category,
                selected,
                zoom,
                onSelect: select,
                onStep: step,
                onInspect: () => setPanel("piece"),
              }}
              label={`A chrome clothing rail with ${visible.length} original vintage-inspired garments. Selected: ${piece.name}. Use the garment buttons below to explore.`}
              className="rail-scene"
            />
          </div>
          <div className="rail-room-note">
            <span>
              Curated, not
              <br />
              mass produced.
            </span>
            <span className="rail-dot" />{" "}
            <span>
              ONE RAIL.
              <br />
              MANY PAST LIVES.
            </span>
          </div>
          <div className="rail-selection" aria-live="polite">
            <motion.span
              key={selected}
              initial={{ opacity: 0, y: enabled ? 5 : 0 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: enabled ? 0.1 : 0 }}
              className="rail-sticker"
            >
              {piece.name.toUpperCase()}
            </motion.span>
            <button onClick={() => setPanel("piece")}>
              Explore this piece <span>↗</span>
            </button>
          </div>
          <div className="rail-controls">
            <button
              className="rail-arrow"
              onClick={() => step(-1)}
              aria-label="Previous garment"
            >
              ←
            </button>
            <div className="rail-piece-dots" aria-label="Choose a garment">
              {visible.map((i) => (
                <button
                  key={i}
                  onClick={() => select(i)}
                  aria-label={pieces[i].name}
                  aria-pressed={selected === i}
                  style={{ "--swatch": pieces[i].color }}
                >
                  <span />
                </button>
              ))}
            </div>
            <button
              className="rail-arrow"
              onClick={() => step(1)}
              aria-label="Next garment"
            >
              →
            </button>
          </div>
          <nav className="rail-collections" aria-label="Clothing collections">
            {[
              ["room", "The room"],
              ["man", "Man"],
              ["woman", "Woman"],
            ].map(([key, name]) => (
              <button
                key={key}
                onClick={() => changeCategory(key)}
                aria-pressed={category === key}
              >
                {category === key && (
                  <motion.span
                    layoutId="rail-tab"
                    className="rail-tab-active"
                    transition={transition}
                  />
                )}
                <span>{name}</span>
                <small>
                  {key === "room"
                    ? "09"
                    : pieces
                        .filter((p) => p.group === key || p.group === "both")
                        .length.toString()
                        .padStart(2, "0")}
                </small>
              </button>
            ))}
          </nav>
          <span className="rail-room-index">SELECT / ROTATE / REDISCOVER</span>
          <a className="rail-index-link" href="#rail-index">
            The full edit ↓
          </a>
        </section>
        <section className="rail-index" id="rail-index">
          <div className="rail-index-intro">
            <p>THE ARCHIVE / NO. 001</p>
            <h2>
              Nothing new.
              <br />
              Everything next.
            </h2>
            <p>
              Good clothes don't have an expiry date.
              <br />A small edit of turn-of-the-century energy,
              <br />
              ready for a different kind of tomorrow.
            </p>
          </div>
          <div className="rail-index-list">
            {pieces.map((p, i) => (
              <button
                key={p.name}
                onClick={() => {
                  changeCategory("room");
                  select(i);
                  setPanel("piece");
                }}
              >
                <span className="rail-list-number">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <span
                  className="rail-list-swatch"
                  style={{ background: p.color }}
                />
                <span>{p.name}</span>
                <small>{p.year}</small>
                <span>↗</span>
              </button>
            ))}
          </div>
        </section>
        <footer className="rail-footer">
          <span>RAIL® — KEEP GOOD THINGS GOING.</span>
          <span>A fictional archive. An interactive design study.</span>
          <a href="#main">Back to the rail ↑</a>
        </footer>
      </main>
      <AnimatePresence>
        {panel && (
          <motion.div
            className="rail-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: enabled ? 0.25 : 0 }}
            onClick={() => setPanel(null)}
          >
            <motion.section
              ref={dialogRef}
              className="rail-panel"
              role="dialog"
              aria-modal="true"
              aria-labelledby="rail-panel-title"
              initial={{ x: enabled ? "100%" : 0 }}
              animate={{ x: 0 }}
              exit={{ x: enabled ? "100%" : 0 }}
              transition={transition}
              onClick={(e) => e.stopPropagation()}
            >
              <button
                className="rail-close"
                onClick={() => setPanel(null)}
                aria-label="Close panel"
              >
                ×
              </button>
              {panel === "piece" ? (
                <>
                  <span className="rail-panel-eyebrow">
                    ARCHIVE / {piece.year} / NO.{" "}
                    {String(selected + 1).padStart(2, "0")}
                  </span>
                  <PiecePreview key={selected} piece={piece} />
                  <h2 id="rail-panel-title">{piece.name}</h2>
                  <p>{piece.note}</p>
                  <div className="rail-piece-facts">
                    <span>Archive estimate</span>
                    <strong>${piece.price}</strong>
                  </div>
                  <fieldset className="rail-sizes">
                    <legend>Choose your fit</legend>
                    {["S", "M", "L"].map((v) => (
                      <button
                        key={v}
                        aria-pressed={size === v}
                        onClick={() => {
                          setSize(v);
                          setMessage("");
                        }}
                      >
                        {v}
                      </button>
                    ))}
                  </fieldset>
                  <button className="rail-save" onClick={save}>
                    {bag.some((v) => v.index === selected && v.size === size)
                      ? "Saved to bag ✓"
                      : "Save this piece ↗"}
                  </button>
                  <p className="rail-status" role="status">
                    {message || "Your favourites stay saved on this device."}
                  </p>
                  <p className="rail-disclaimer">
                    Concept collection. These pieces are for exploring; no
                    purchase or payment is taken.
                  </p>
                </>
              ) : panel === "bag" ? (
                <>
                  <span className="rail-panel-eyebrow">
                    GOOD FINDS / YOUR EDIT
                  </span>
                  <h2 id="rail-panel-title">
                    Saved for
                    <br />
                    another day.
                  </h2>
                  {bag.length ? (
                    <div className="rail-bag-list">
                      {bag.map((item, i) => (
                        <div key={`${item.index}-${item.size}`}>
                          <span
                            style={{ background: pieces[item.index].color }}
                          />
                          <div>
                            <strong>{pieces[item.index].name}</strong>
                            <small>
                              Size {item.size} · ${pieces[item.index].price}
                            </small>
                          </div>
                          <button
                            aria-label={`Remove ${pieces[item.index].name}, size ${item.size}`}
                            onClick={() =>
                              setBag(bag.filter((_, j) => j !== i))
                            }
                          >
                            ×
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p>
                      Your bag is a blank slate. Explore the rail and save a
                      piece that feels like you.
                    </p>
                  )}
                  <button className="rail-save" onClick={() => setPanel(null)}>
                    Back to the rail ↗
                  </button>
                  <p className="rail-disclaimer">
                    A local wishlist for this design study. No checkout, just a
                    little inspiration.
                  </p>
                </>
              ) : (
                <>
                  <span className="rail-panel-eyebrow">
                    LESS NEW. MORE YOU.
                  </span>
                  <h2 id="rail-panel-title">
                    A past life.
                    <br />A future
                    <br />
                    favourite.
                  </h2>
                  <p>
                    RAIL is an imagined clothing archive for the pieces that
                    deserve a second look. Nine silhouettes, all carrying a
                    little of that strange, optimistic turn-of-the-century
                    feeling.
                  </p>
                  <p>
                    Move across the rail to turn a piece. Choose a collection to
                    step closer. Save what catches your eye.
                  </p>
                  <div className="rail-about-sticker">
                    GOOD THINGS
                    <br />
                    COME AROUND. ↺
                  </div>
                  <button className="rail-save" onClick={() => setPanel(null)}>
                    Come on in ↗
                  </button>
                </>
              )}
            </motion.section>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
