import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import Scene from "./Scene.jsx";
import { useMotionEnabled } from "./runtime.jsx";
import "./helios.css";

const MODES = [
  {
    id: "dawn",
    name: "Dawn",
    time: "06:14",
    mood: "For beginning again.",
    detail:
      "A soft light on the edge of everything. Let the day arrive at its own pace.",
    frequency: "110",
    notes: [110, 164.81, 220],
    color: "#f58d52",
    temperature: "2,700 K",
    position: "01",
  },
  {
    id: "zenith",
    name: "Zenith",
    time: "12:00",
    mood: "For finding your flow.",
    detail:
      "Warmth without weight. An open space to settle into a thought and follow it.",
    frequency: "146.83",
    notes: [146.83, 220, 293.66],
    color: "#f5c86b",
    temperature: "5,200 K",
    position: "02",
  },
  {
    id: "eclipse",
    name: "Eclipse",
    time: "19:42",
    mood: "For letting it all go.",
    detail:
      "The beautiful quiet between two worlds. Stay a little longer in the dark.",
    frequency: "82.41",
    notes: [82.41, 123.47, 164.81],
    color: "#d0b2ff",
    temperature: "1,800 K",
    position: "03",
  },
];

function buildSolarScene({ THREE, scene, camera }) {
  camera.position.set(0, 0, 9);
  camera.fov = 36;
  camera.updateProjectionMatrix();
  const system = new THREE.Group();
  system.position.set(0.75, -0.15, 0);
  scene.add(system);
  const uniforms = {
    uTime: { value: 0 },
    uColor: { value: new THREE.Color("#f58d52") },
  };
  const sunMaterial = new THREE.ShaderMaterial({
    uniforms,
    vertexShader: `varying vec3 vPosition; varying vec3 vNormal; varying vec3 vWorld;
      void main(){vPosition=position;vNormal=normalize(normalMatrix*normal);vec4 world=modelMatrix*vec4(position,1.0);vWorld=world.xyz;gl_Position=projectionMatrix*viewMatrix*world;}`,
    fragmentShader: `uniform float uTime;uniform vec3 uColor;varying vec3 vPosition;varying vec3 vNormal;varying vec3 vWorld;
      float hash(vec3 p){p=fract(p*.3183099+vec3(.1,.2,.3));p*=17.;return fract(p.x*p.y*p.z*(p.x+p.y+p.z));}
      float noise(vec3 p){vec3 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(mix(hash(i),hash(i+vec3(1,0,0)),f.x),mix(hash(i+vec3(0,1,0)),hash(i+vec3(1,1,0)),f.x),f.y),mix(mix(hash(i+vec3(0,0,1)),hash(i+vec3(1,0,1)),f.x),mix(hash(i+vec3(0,1,1)),hash(i+vec3(1,1,1)),f.x),f.y),f.z);}
      float fbm(vec3 p){float v=0.;float a=.5;for(int i=0;i<5;i++){v+=a*noise(p);p=p*2.02+vec3(3.1,1.7,.9);a*=.5;}return v;}
      void main(){vec3 p=vPosition*3.6;float n=fbm(p+vec3(uTime*.035,0.,uTime*.018));float detail=fbm(p*4.+n*3.);float limb=pow(max(vNormal.z,0.),.38);vec3 dark=uColor*.42;vec3 bright=mix(uColor,vec3(1.,.91,.72),.66);vec3 color=mix(dark,bright,smoothstep(.22,.78,n*.7+detail*.3));color*=.48+limb*.78;gl_FragColor=vec4(color,1.);}`,
  });
  const sun = new THREE.Mesh(
    new THREE.SphereGeometry(1.48, 72, 48),
    sunMaterial,
  );
  system.add(sun);
  const haloUniforms = {
    uColor: { value: new THREE.Color("#e66a2e") },
    uStrength: { value: 0.9 },
    uTime: { value: 0 },
  };
  const corona = new THREE.Mesh(
    new THREE.PlaneGeometry(8.6, 8.6),
    new THREE.ShaderMaterial({
      uniforms: haloUniforms,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      vertexShader:
        "varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}",
      fragmentShader: `varying vec2 vUv;uniform vec3 uColor;uniform float uStrength;uniform float uTime;
      void main(){vec2 p=vUv-.5;float r=length(p);float angle=atan(p.y,p.x);float haze=exp(-r*10.)*.5;float ring=exp(-abs(r-.174)*44.)*.3;float ray=(.5+.5*sin(angle*11.+sin(angle*5.+uTime*.08)))*exp(-abs(r-.195)*14.)*.12;float alpha=(haze+ring+ray)*uStrength*(1.-smoothstep(.35,.5,r));gl_FragColor=vec4(uColor,alpha);}`,
    }),
  );
  corona.position.z = -0.25;
  system.add(corona);
  const shadow = new THREE.Mesh(
    new THREE.SphereGeometry(1.47, 64, 48),
    new THREE.MeshBasicMaterial({ color: "#080a0d", toneMapped: false }),
  );
  shadow.position.set(2.42, 0.88, 1.45);
  system.add(shadow);
  const orbitGroup = new THREE.Group();
  system.add(orbitGroup);
  const orbitMaterial = new THREE.LineBasicMaterial({
    color: "#7d7266",
    transparent: true,
    opacity: 0.33,
  });
  for (let i = 0; i < 3; i += 1) {
    const points = Array.from({ length: 180 }, (_, j) => {
      const angle = (j / 180) * Math.PI * 2;
      return new THREE.Vector3(
        Math.cos(angle) * (2.2 + i * 0.32),
        Math.sin(angle) * (2.2 + i * 0.32),
        0,
      );
    });
    const ring = new THREE.LineLoop(
      new THREE.BufferGeometry().setFromPoints(points),
      orbitMaterial,
    );
    ring.rotation.set(0.68 + i * 0.25, 0.32 - i * 0.2, -0.4 + i * 0.25);
    orbitGroup.add(ring);
  }
  const satellite = new THREE.Mesh(
    new THREE.SphereGeometry(0.037, 16, 12),
    new THREE.MeshBasicMaterial({ color: "#e5d9c4" }),
  );
  orbitGroup.add(satellite);
  let seed = 671;
  const random = () => {
    seed = (seed * 16807) % 2147483647;
    return (seed - 1) / 2147483646;
  };
  const positions = new Float32Array(190 * 3);
  for (let i = 0; i < 190; i += 1) {
    positions[i * 3] = (random() - 0.5) * 19;
    positions[i * 3 + 1] = (random() - 0.5) * 12;
    positions[i * 3 + 2] = -3 - random() * 4;
  }
  const starsGeometry = new THREE.BufferGeometry();
  starsGeometry.setAttribute(
    "position",
    new THREE.BufferAttribute(positions, 3),
  );
  scene.add(
    new THREE.Points(
      starsGeometry,
      new THREE.PointsMaterial({
        color: "#b7b3a9",
        size: 0.018,
        transparent: true,
        opacity: 0.55,
        sizeAttenuation: true,
      }),
    ),
  );
  const targetColor = new THREE.Color();
  const targetPosition = new THREE.Vector3();
  return {
    update({ time, delta, pointer, settings, reducedMotion }) {
      const mode =
        MODES.find((item) => item.id === settings.variant) || MODES[0];
      system.position.x = window.innerWidth <= 540 ? 0 : 0.75;
      const blend = reducedMotion
        ? 1
        : 1 - Math.exp(-Math.max(delta, 0.016) * 3);
      targetColor.set(mode.color);
      uniforms.uColor.value.lerp(targetColor, blend);
      haloUniforms.uColor.value.lerp(targetColor, blend);
      uniforms.uTime.value = time;
      haloUniforms.uTime.value = time;
      shadow.visible = mode.id === "eclipse";
      if (mode.id === "eclipse")
        targetPosition.set(-system.position.x * 0.18, 0.027, 1.62);
      else if (mode.id === "zenith") targetPosition.set(4.8, 1.7, -1);
      else targetPosition.set(2.42, 0.88, 1.45);
      shadow.position.lerp(targetPosition, blend);
      shadow.scale.setScalar(
        shadow.scale.x +
          ((mode.id === "eclipse" ? 0.81 : 1) - shadow.scale.x) * blend,
      );
      haloUniforms.uStrength.value +=
        ((mode.id === "eclipse" ? 1.8 : 0.9) - haloUniforms.uStrength.value) *
        blend;
      sun.rotation.y = reducedMotion ? 0 : time * 0.015;
      orbitGroup.rotation.z = reducedMotion
        ? -0.08
        : -0.08 + Math.sin(time * 0.07) * 0.045;
      const angle = reducedMotion ? 2.2 : time * 0.055 + 2.2;
      satellite.position.set(
        Math.cos(angle) * 2.52,
        Math.sin(angle) * 1.9,
        Math.sin(angle) * 0.8,
      );
      system.rotation.y +=
        ((reducedMotion ? 0 : pointer.x * 0.035) - system.rotation.y) * blend;
      system.rotation.x +=
        ((reducedMotion ? 0 : -pointer.y * 0.025) - system.rotation.x) * blend;
    },
  };
}

function SolarMark({ className = "" }) {
  return (
    <svg
      className={className}
      viewBox="0 0 32 32"
      fill="none"
      aria-hidden="true"
    >
      <circle cx="16" cy="16" r="7" stroke="currentColor" strokeWidth="1.2" />
      <ellipse
        cx="16"
        cy="16"
        rx="15"
        ry="5"
        transform="rotate(-35 16 16)"
        stroke="currentColor"
        strokeWidth="1.2"
      />
      <circle cx="25.5" cy="7.5" r="2" fill="currentColor" />
    </svg>
  );
}

export default function Helios() {
  const enabled = useMotionEnabled();
  const [selected, setSelected] = useState("dawn");
  const [playing, setPlaying] = useState(false);
  const [audioError, setAudioError] = useState("");
  const audioRef = useRef(null);
  const closeTimers = useRef(new Set());
  const mode = MODES.find((item) => item.id === selected);

  useEffect(() => {
    const current = audioRef.current;
    if (current)
      current.oscillators.forEach((oscillator, i) =>
        oscillator.frequency.setTargetAtTime(
          mode.notes[i],
          current.context.currentTime,
          0.75,
        ),
      );
  }, [selected]);

  useEffect(() => {
    const hide = () => {
      if (document.hidden && audioRef.current) {
        audioRef.current.context.close();
        audioRef.current = null;
        setPlaying(false);
      }
    };
    document.addEventListener("visibilitychange", hide);
    return () => {
      document.removeEventListener("visibilitychange", hide);
      audioRef.current?.context.close();
      closeTimers.current.forEach((timer) => {
        clearTimeout(timer.id);
        timer.context.close();
      });
    };
  }, []);

  const toggleSound = async () => {
    if (audioRef.current) {
      const current = audioRef.current;
      current.gain.gain.setTargetAtTime(0, current.context.currentTime, 0.12);
      audioRef.current = null;
      setPlaying(false);
      const timer = { context: current.context };
      timer.id = setTimeout(() => {
        current.context.close();
        closeTimers.current.delete(timer);
      }, 600);
      closeTimers.current.add(timer);
      return;
    }
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) {
      setAudioError("Sound is unavailable in this browser. Enjoy the view.");
      return;
    }
    try {
      const context = new AudioContext();
      const gain = context.createGain();
      gain.gain.value = 0;
      gain.connect(context.destination);
      const oscillators = mode.notes.map((note, i) => {
        const oscillator = context.createOscillator();
        const voice = context.createGain();
        voice.gain.value = i === 0 ? 0.55 : 0.2;
        oscillator.type = "sine";
        oscillator.frequency.value = note;
        oscillator.connect(voice);
        voice.connect(gain);
        oscillator.start();
        return oscillator;
      });
      audioRef.current = { context, gain, oscillators };
      await context.resume();
      if (audioRef.current?.context !== context) return;
      gain.gain.setTargetAtTime(0.075, context.currentTime, 1.2);
      setPlaying(true);
      setAudioError("");
    } catch {
      audioRef.current?.context.close();
      audioRef.current = null;
      setAudioError("Sound could not start. You can try again.");
    }
  };

  const reveal = (delay = 0) => ({
    initial: enabled ? { opacity: 0, y: 22 } : false,
    whileInView: { opacity: 1, y: 0 },
    viewport: { once: true, amount: 0.15 },
    transition: {
      duration: enabled ? 0.8 : 0,
      delay: enabled ? delay : 0,
      ease: [0.22, 1, 0.36, 1],
    },
  });

  return (
    <div
      className="helios-page"
      data-motion={enabled}
      style={{ "--helios-accent": mode.color }}
    >
      <header className="helios-nav">
        <a className="helios-brand" href="#main" aria-label="Helios home">
          <SolarMark />
          <span>HELIOS</span>
        </a>
        <p>A little space to feel human.</p>
        <a className="helios-nav-link" href="#observatory">
          The observatory <span aria-hidden="true">↗</span>
        </a>
      </header>
      <main id="main">
        <section className="helios-hero" aria-labelledby="helios-title">
          <div className="helios-space">
            <Scene
              build={buildSolarScene}
              settings={{ variant: selected }}
              label={`A glowing ${mode.name.toLowerCase()} sun with a shifting eclipse, fine orbital paths, and a field of stars`}
            />
          </div>
          <div className="helios-hero-topline">
            <span>YOUR DAILY MOMENT OF DISTANCE</span>
            <span className="helios-coordinate">
              23° 26′ 14″ N &nbsp; / &nbsp; SOL SYSTEM
            </span>
          </div>
          <motion.h1 id="helios-title" {...reveal(0.1)}>
            Find your
            <br />
            <span>frequency.</span>
          </motion.h1>
          <motion.div className="helios-intro" {...reveal(0.25)}>
            <span className="helios-small-rule" />
            <p>
              Step out of the rush.
              <br />
              There’s a whole universe in a quiet moment.
            </p>
          </motion.div>
          <div className="helios-sun-label" aria-hidden="true">
            <span className="helios-label-line" />
            <span>
              SOL / {mode.temperature}
              <small>ALWAYS IN MOTION</small>
            </span>
          </div>
          <div className="helios-controls">
            <div
              className="helios-modes"
              role="group"
              aria-label="Choose an atmosphere"
            >
              {MODES.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className={item.id === selected ? "is-selected" : ""}
                  aria-pressed={item.id === selected}
                  onClick={() => setSelected(item.id)}
                >
                  <span
                    className={`helios-phase helios-phase-${item.id}`}
                    aria-hidden="true"
                  />
                  {item.name}
                  {selected === item.id && (
                    <motion.span
                      className="helios-mode-underline"
                      layoutId="helios-mode"
                      transition={{ duration: enabled ? 0.4 : 0 }}
                    />
                  )}
                </button>
              ))}
            </div>
            <div className="helios-session">
              <AnimatePresence mode="wait" initial={false}>
                <motion.div
                  key={selected}
                  className="helios-track"
                  initial={{ opacity: enabled ? 0 : 1, y: enabled ? 8 : 0 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: enabled ? 0 : 1, y: enabled ? -8 : 0 }}
                  transition={{ duration: enabled ? 0.2 : 0 }}
                >
                  <span>NOW IN YOUR ORBIT</span>
                  <strong>{mode.mood}</strong>
                  <small>{mode.frequency} Hz · Generative ambient</small>
                </motion.div>
              </AnimatePresence>
              <button
                className={`helios-play ${playing ? "is-playing" : ""}`}
                type="button"
                onClick={toggleSound}
                aria-label={
                  playing
                    ? "Pause ambient sound"
                    : `Listen to ${mode.name.toLowerCase()} ambient sound`
                }
                aria-pressed={playing}
              >
                <span className="helios-play-icon" aria-hidden="true">
                  {playing ? (
                    <>
                      <i />
                      <i />
                    </>
                  ) : (
                    <svg viewBox="0 0 24 24">
                      <path d="M9 6.5 18 12l-9 5.5Z" fill="currentColor" />
                    </svg>
                  )}
                </span>
                <span>{playing ? "Pause sound" : "Listen in"}</span>
                <span className="helios-sound-bars" aria-hidden="true">
                  <i />
                  <i />
                  <i />
                  <i />
                </span>
              </button>
            </div>
          </div>
          <div className="helios-hero-foot">
            <span role="status">
              {audioError ||
                "Sound starts only when you press play. Headphones welcome."}
            </span>
            <a href="#observatory">
              Explore the atmospheres <span aria-hidden="true">↓</span>
            </a>
          </div>
        </section>
        <section
          id="observatory"
          className="helios-observatory"
          aria-labelledby="helios-observatory-title"
        >
          <motion.div className="helios-section-intro" {...reveal()}>
            <span className="helios-eyebrow">01 — THE OBSERVATORY</span>
            <h2 id="helios-observatory-title">
              Nothing to finish.
              <br />
              Nowhere to be.
            </h2>
            <p>
              Three atmospheres. One small invitation to slow down. Follow the
              light, choose a feeling, and take the time you need.
            </p>
          </motion.div>
          <div className="helios-atmospheres">
            {MODES.map((item, index) => (
              <motion.button
                {...reveal(index * 0.08)}
                key={item.id}
                type="button"
                className={`helios-atmosphere ${selected === item.id ? "is-active" : ""}`}
                onClick={() => {
                  setSelected(item.id);
                  document.getElementById("main").scrollIntoView({
                    behavior: enabled ? "smooth" : "instant",
                  });
                }}
                aria-label={`Enter the ${item.name.toLowerCase()} atmosphere`}
              >
                <span className="helios-atmosphere-time">
                  {item.time}
                  <small>LOCAL SOLAR TIME</small>
                </span>
                <span
                  className={`helios-mini-sun helios-mini-sun-${item.id}`}
                  aria-hidden="true"
                />
                <span className="helios-atmosphere-text">
                  <span className="helios-atmosphere-name">{item.name}</span>
                  <span>{item.detail}</span>
                </span>
                <span className="helios-atmosphere-arrow" aria-hidden="true">
                  ↗
                </span>
              </motion.button>
            ))}
          </div>
        </section>
      </main>
      <footer className="helios-footer">
        <a className="helios-brand" href="#main">
          <SolarMark />
          <span>HELIOS</span>
        </a>
        <p>Made of light. Made for a little less.</p>
        <span>AN EXPERIMENT IN PRESENCE © 2026</span>
      </footer>
    </div>
  );
}
