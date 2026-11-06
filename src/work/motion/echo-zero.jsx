import React, { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { DRACOLoader } from "three/addons/loaders/DRACOLoader.js";
import Scene from "./Scene.jsx";
import { useMotionEnabled } from "./runtime.jsx";
import "./echo-zero.css";

const finishes = [
  { name: "Obsidian", shell: "#272d30", cloth: "#272d30", denim: "#ffffff" },
  { name: "Pebble", shell: "#969a8f", cloth: "#969a8f", denim: "#e1e3d7" },
  { name: "Signal", shell: "#a64a32", cloth: "#a64a32", denim: "#e6d2c6" },
];

// Rain is an authored Blender Studio character, posed and baked in Blender.
// Its CC BY 4.0 attribution is visible in the page and bundled with the model.
function buildEcho({ THREE, scene, camera, renderer }) {
  camera.position.set(0.2, 1.1, 7.6);
  camera.lookAt(0, 0.13, 0);
  renderer.toneMappingExposure = 1.04;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.VSMShadowMap;
  scene.environmentIntensity = 0.7;
  let mainLight = null;
  scene.traverse((object) => {
    if (object.isHemisphereLight) object.intensity = 1.0;
    if (object.isDirectionalLight) {
      object.intensity = object.position.z > 0 ? 2.15 : 1.15;
      if (object.position.z > 0) mainLight = object;
    }
  });
  if (mainLight) {
    mainLight.position.set(-1.5, 7, 3);
    mainLight.castShadow = true;
    mainLight.shadow.mapSize.set(1024, 1024);
    Object.assign(mainLight.shadow.camera, {
      left: -3,
      right: 3,
      top: 3,
      bottom: -3,
      near: 0.1,
      far: 20,
    });
    mainLight.shadow.normalBias = 0.025;
    mainLight.shadow.bias = -0.0002;
    mainLight.shadow.radius = 5;
    mainLight.shadow.blurSamples = 8;
  }
  const actor = new THREE.Group();
  scene.add(actor);
  const host = renderer.domElement.parentElement;
  host.dataset.modelStatus = "loading";
  let disposed = false,
    loaded = null,
    current = {},
    edition = -1,
    api = null;
  const wardrobe = [];
  const decoder = new DRACOLoader();
  decoder.setDecoderPath("/work/motion-lab/echo-zero/draco/");
  decoder.setDecoderConfig({ type: "wasm" });
  decoder.setWorkerLimit(1);
  const loader = new GLTFLoader().setDRACOLoader(decoder);
  const disposeAsset = (root) => {
    const resources = new Set();
    root.traverse((object) => {
      if (object.geometry) resources.add(object.geometry);
      for (const mat of Array.isArray(object.material)
        ? object.material
        : [object.material]) {
        if (!mat) continue;
        resources.add(mat);
        Object.values(mat).forEach((value) => {
          if (value?.isTexture) resources.add(value);
        });
      }
    });
    resources.forEach((resource) => resource.dispose());
  };
  const applyFinish = () => {
    const finish = finishes[current.finish ?? 0];
    wardrobe.forEach(({ material, type }) => {
      if (type === "top") material.color.set(finish.cloth);
      if (type === "jeans") material.color.set(finish.denim);
    });
    edition = current.finish;
  };
  loader.load(
    "/work/motion-lab/echo-zero/echo-rain.glb",
    (gltf) => {
      if (disposed) {
        disposeAsset(gltf.scene);
        return;
      }
      loaded = gltf.scene;
      const bounds = new THREE.Box3().setFromObject(loaded);
      const center = bounds.getCenter(new THREE.Vector3());
      const scale = 3.35 / bounds.getSize(new THREE.Vector3()).y;
      loaded.scale.setScalar(scale);
      loaded.position.set(
        -center.x * scale,
        -1.36 - bounds.min.y * scale,
        -center.z * scale,
      );
      loaded.traverse((object) => {
        if (!object.isMesh) return;
        object.castShadow = true;
        object.receiveShadow = false;
        const mat = object.material;
        mat.envMapIntensity = 0.75;
        if (mat.map)
          mat.map.anisotropy = Math.min(
            4,
            renderer.capabilities.getMaxAnisotropy(),
          );
        if (object.name === "Echo_top") {
          // The original top is a uniform matte fabric; a material color gives
          // wardrobe changes without recoloring skin, hair or baked denim detail.
          mat.map?.dispose();
          mat.map = null;
          mat.roughness = 0.82;
          mat.needsUpdate = true;
          wardrobe.push({ material: mat, type: "top" });
        }
        if (object.name === "Echo_jeans")
          wardrobe.push({ material: mat, type: "jeans" });
        if (object.name.includes("hair")) mat.roughness = 0.48;
        if (object.name.startsWith("Echo_eyes")) {
          mat.roughness = 0.48;
          mat.envMapIntensity = 0.1;
        }
      });
      actor.add(loaded);
      applyFinish();
      host.dataset.modelStatus = "ready";
      renderer.render(scene, camera);
    },
    undefined,
    (error) => {
      if (disposed) return;
      console.error("ECHO character could not load", error);
      host.dataset.modelStatus = "failed";
      host.dataset.status = "fallback";
      host.setAttribute(
        "aria-label",
        "Static preview of Rain by Blender Studio. The 3D character could not load; reload the page to try again.",
      );
    },
  );

  const shadowCanvas = document.createElement("canvas");
  shadowCanvas.width = shadowCanvas.height = 128;
  const ctx = shadowCanvas.getContext("2d");
  const gradient = ctx.createRadialGradient(64, 64, 9, 64, 64, 64);
  gradient.addColorStop(0, "rgba(35,41,30,.24)");
  gradient.addColorStop(0.5, "rgba(35,41,30,.10)");
  gradient.addColorStop(1, "rgba(35,41,30,0)");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 128, 128);
  const contact = new THREE.Mesh(
    new THREE.PlaneGeometry(3.9, 2.7),
    new THREE.MeshBasicMaterial({
      map: new THREE.CanvasTexture(shadowCanvas),
      transparent: true,
      depthWrite: false,
    }),
  );
  contact.position.set(0, -1.38, 0.08);
  contact.rotation.x = -Math.PI / 2;
  scene.add(contact);
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(16, 16),
    new THREE.ShadowMaterial({ opacity: 0.07, depthWrite: false }),
  );
  ground.position.y = -1.375;
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  scene.add(ground);
  const ring = new THREE.Mesh(
    new THREE.TorusGeometry(1.6, 0.0025, 6, 96),
    new THREE.MeshBasicMaterial({ color: "#b6bcae" }),
  );
  ring.rotation.x = Math.PI / 2;
  ring.position.y = -1.385;
  scene.add(ring);

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.target.set(0, 0.11, 0);
  controls.enablePan = false;
  controls.enableZoom = false;
  controls.enableDamping = true;
  controls.dampingFactor = 0.09;
  controls.minPolarAngle = 1.05;
  controls.maxPolarAngle = 1.62;
  controls.rotateSpeed = 0.65;
  controls.update();
  controls.saveState();
  const render = () => {
    if (!disposed) renderer.render(scene, camera);
  };
  controls.addEventListener("change", render);
  const rotate = (amount) => {
    const offset = camera.position.clone().sub(controls.target);
    const spherical = new THREE.Spherical().setFromVector3(offset);
    spherical.theta += amount;
    camera.position.copy(
      new THREE.Vector3().setFromSpherical(spherical).add(controls.target),
    );
    controls.update();
    render();
  };
  return {
    update({ settings, reducedMotion }) {
      current = settings;
      const size = Math.min(1, 650 / renderer.domElement.clientHeight);
      actor.scale.setScalar(size);
      // Scaling is anchored to the floor, keeping both shoes in contact.
      actor.position.y = -1.36 * (1 - size);
      if (loaded && edition !== settings.finish) applyFinish();
      if (api !== settings.api) {
        api = settings.api;
        if (api)
          api.current = {
            rotate,
            reset: () => {
              controls.reset();
              render();
            },
          };
      }
      controls.enableDamping = !reducedMotion;
      controls.autoRotate = !reducedMotion && !!settings.auto;
      controls.autoRotateSpeed = 0.55;
      controls.update();
    },
    dispose() {
      disposed = true;
      controls.removeEventListener("change", render);
      controls.dispose();
      decoder.dispose();
      if (api) api.current = null;
    },
  };
}

const tabs = [
  ["inspect", "Continue"],
  ["character", "Character"],
  ["archive", "Field notes"],
  ["settings", "Settings"],
];

export default function EchoZero() {
  const enabled = useMotionEnabled();
  const [tab, setTab] = useState("inspect"),
    [finish, setFinish] = useState(0),
    [auto, setAuto] = useState(false),
    [inspecting, setInspecting] = useState(false);
  const [notice, setNotice] = useState("");
  const api = useRef(null);
  const timer = useRef(null);
  useEffect(() => () => clearTimeout(timer.current), []);
  const announce = (text) => {
    setNotice(text);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setNotice(""), 2600);
  };
  const rotate = (amount) => {
    api.current?.rotate(amount);
    announce(amount > 0 ? "View rotated right" : "View rotated left");
  };
  const reset = () => {
    api.current?.reset();
    setAuto(false);
    announce("Front view restored");
  };
  const transition = { duration: enabled ? 0.24 : 0, ease: [0.2, 0.8, 0.2, 1] };
  return (
    <div className="echo-page">
      <header className="echo-header">
        <a className="echo-wordmark" href="#main" aria-label="Echo Zero home">
          ECHØ<span>ZERO®</span>
        </a>
        <span className="echo-header-caption">A HUMAN AFTER ALL.</span>
        <nav aria-label="Echo navigation">
          <button
            onClick={() => {
              setTab("inspect");
              setInspecting(false);
            }}
            aria-pressed={tab === "inspect"}
          >
            <span aria-hidden="true">⌂</span> HOME
          </button>
          <button
            onClick={() => setTab("archive")}
            aria-pressed={tab === "archive"}
          >
            <span aria-hidden="true">▤</span> ARCHIVE
          </button>
          <button
            onClick={() => setTab("character")}
            aria-pressed={tab === "character"}
          >
            <span aria-hidden="true">⊹</span> CHARACTER
          </button>
        </nav>
        <span className="echo-online">
          <i /> SYSTEM ONLINE
        </span>
      </header>
      <main id="main" className="echo-main">
        <div className="echo-corner echo-corner-tl" aria-hidden="true" />
        <div className="echo-corner echo-corner-tr" aria-hidden="true" />
        <div className="echo-edition">
          CHARACTER STUDY / 001
          <br />
          <span>DESIGNED FOR ANOTHER TOMORROW</span>
        </div>
        <motion.div
          className="echo-side-menu"
          initial={enabled ? { opacity: 0, x: -15 } : false}
          animate={{ opacity: 1, x: 0 }}
          transition={transition}
        >
          <span className="echo-eyebrow">SAVE POINT — 00:42:16</span>
          <nav aria-label="Character menu">
            {tabs.map(([id, label], i) => (
              <button
                key={id}
                aria-pressed={tab === id}
                onClick={() => {
                  setTab(id);
                  if (id === "inspect") {
                    setInspecting(true);
                    announce(
                      "Inspection mode active. Drag the character to orbit.",
                    );
                  }
                }}
              >
                <span className="echo-menu-number">0{i + 1}</span>
                <span className="echo-menu-slash">/</span>
                {label}
                <span className="echo-menu-arrow" aria-hidden="true">
                  ↗
                </span>
                {tab === id && (
                  <motion.i
                    layoutId={enabled ? "echo-menu-active" : undefined}
                    transition={transition}
                  />
                )}
              </button>
            ))}
          </nav>
          <div className="echo-menu-foot">
            <span className="echo-status-dot" />
            {inspecting ? "INSPECTION MODE ACTIVE" : "READY WHEN YOU ARE"}
          </div>
        </motion.div>
        <div
          className="echo-stage"
          tabIndex={0}
          role="group"
          aria-label="3D character viewer. Drag to orbit. Use left and right arrow keys to rotate; Home resets the view."
          onKeyDown={(event) => {
            if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
              event.preventDefault();
              rotate(event.key === "ArrowLeft" ? -0.35 : 0.35);
            }
            if (event.key === "Home") {
              event.preventDefault();
              reset();
            }
          }}
        >
          <Scene
            build={buildEcho}
            settings={{ finish, auto, api }}
            label="Rain by Blender Studio, adapted for ECHO: a detailed crouching woman with textured skin, sculpted dark hair, matte clothing and ivory sneakers. Drag to rotate in three dimensions."
          />
          <span className="echo-stage-coordinate" aria-hidden="true">
            X: 00.00
            <br />
            Y: 00.00
            <br />
            Z: 01.00
          </span>
        </div>
        <aside className="echo-profile" aria-label="Character information">
          <div className="echo-profile-heading">
            <span className="echo-symbol" aria-hidden="true">
              ✳
            </span>
            <div>
              <span className="echo-eyebrow">SUBJECT 001</span>
              <h1>ECHO</h1>
            </div>
            <span className="echo-profile-code">[ ZR ]</span>
          </div>
          <div className="echo-vital">
            <span />
          </div>
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={tab}
              initial={enabled ? { opacity: 0, y: 7 } : false}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: enabled ? -5 : 0 }}
              transition={transition}
              className="echo-panel"
            >
              {tab === "inspect" && (
                <>
                  <span className="echo-eyebrow">THE QUIET REBELLION</span>
                  <p>
                    Part human.
                    <br />
                    Part possibility.
                  </p>
                  <dl>
                    <div>
                      <dt>CLASS</dt>
                      <dd>Wayfinder</dd>
                    </div>
                    <div>
                      <dt>ORIGIN</dt>
                      <dd>Sector 07</dd>
                    </div>
                    <div>
                      <dt>STATUS</dt>
                      <dd>
                        <i /> At ease
                      </dd>
                    </div>
                    <div>
                      <dt>WARDROBE</dt>
                      <dd>{finishes[finish].name}</dd>
                    </div>
                  </dl>
                  <span className="echo-file-mark">
                    E—001 / NO FIXED DESTINATION
                  </span>
                </>
              )}
              {tab === "character" && (
                <>
                  <span className="echo-eyebrow">PERSONALIZE / WARDROBE</span>
                  <p>
                    A different
                    <br />
                    point of view.
                  </p>
                  <div
                    className="echo-finishes"
                    role="group"
                    aria-label="Wardrobe finish"
                  >
                    {finishes.map((f, i) => (
                      <button
                        key={f.name}
                        aria-pressed={finish === i}
                        onClick={() => setFinish(i)}
                      >
                        <span style={{ background: f.shell }} />
                        {f.name}
                        <span aria-hidden="true">
                          {finish === i ? "●" : "○"}
                        </span>
                      </button>
                    ))}
                  </div>
                  <span className="echo-file-mark">
                    ONE SOUL. THREE EXPRESSIONS.
                  </span>
                </>
              )}
              {tab === "archive" && (
                <>
                  <span className="echo-eyebrow">FIELD NOTE / 001</span>
                  <p>
                    Stillness is
                    <br />a superpower.
                  </p>
                  <div className="echo-note">
                    Between the last city and the next frontier, Echo waits. A
                    little worn. A little wired. Entirely her own.
                  </div>
                  <span className="echo-file-mark">
                    A STUDY IN HUMAN CONNECTION
                  </span>
                </>
              )}
              {tab === "settings" && (
                <>
                  <span className="echo-eyebrow">VIEWER PREFERENCES</span>
                  <p>
                    Your own
                    <br />
                    point of view.
                  </p>
                  <button
                    className="echo-setting"
                    aria-pressed={auto}
                    disabled={!enabled}
                    onClick={() => setAuto((v) => !v)}
                  >
                    Auto orbit<span>{auto && enabled ? "ON" : "OFF"}</span>
                  </button>
                  <button className="echo-setting" onClick={reset}>
                    Reset camera<span>↺</span>
                  </button>
                  <span className="echo-file-mark">
                    {enabled
                      ? "DRAG TO ORBIT · ← → TO ROTATE"
                      : "MOTION PAUSED · DRAG STILL AVAILABLE"}
                  </span>
                </>
              )}
            </motion.div>
          </AnimatePresence>
        </aside>
        <div className="echo-view-controls">
          <span className="echo-eyebrow">DRAG TO DISCOVER</span>
          <div>
            <button
              onClick={() => rotate(-Math.PI / 6)}
              aria-label="Rotate character left"
            >
              ←
            </button>
            <button className="echo-reset" onClick={reset}>
              RESET VIEW <span aria-hidden="true">↺</span>
            </button>
            <button
              onClick={() => rotate(Math.PI / 6)}
              aria-label="Rotate character right"
            >
              →
            </button>
          </div>
          <span className="echo-view-description">
            A FULL 360°. EVERY SIDE OF YOU.
          </span>
        </div>
        <div className="echo-signal" aria-hidden="true">
          <span />
          01 — 07
        </div>
        <div className="echo-bottom-left">
          <svg viewBox="0 0 58 32" aria-hidden="true">
            <path d="M1 30 8 8 13 30 20 1 25 30 33 15 39 30 45 4 51 30 57 22" />
          </svg>
          <span>
            INDEPENDENT CHARACTERS.
            <br />
            <b>UNCOMMON BY DESIGN.</b>
            <a
              className="echo-credit"
              href="https://studio.blender.org/characters/rain/v3/"
              target="_blank"
              rel="noreferrer"
            >
              Rain Rig (CC) Blender Foundation ↗
            </a>
          </span>
        </div>
        <div className="echo-bottom-right">
          NO DESTINATION.
          <br />
          <b>JUST DIRECTION. ↗</b>
        </div>
        <div className="echo-corner echo-corner-bl" aria-hidden="true" />
        <div className="echo-corner echo-corner-br" aria-hidden="true" />
        <div className="echo-announcement" role="status" aria-live="polite">
          {notice}
        </div>
      </main>
    </div>
  );
}
