import { useCallback, useEffect, useRef, useState } from "react";
import {
  AnimatePresence,
  motion,
  useAnimationFrame,
  useInView,
  useMotionValue,
  useScroll,
  useSpring,
  useTransform,
} from "motion/react";
import { useMotionEnabled } from "./runtime.jsx";
import TaliaFaceWarp from "./TaliaFaceWarp.jsx";
import "./talia.css";

const asset = (name) => `/work/motion-lab/talia/${name}.webp`;
const MAX_CHEEK_PULL = 0.032;
const CHEEK_PULL_RESISTANCE = 0.38;
const moods = [
  { id: "neutral", name: "Standby", hint: "Curiosity is always online." },
  {
    id: "angry",
    name: "Defiant",
    hint: "A little attitude. A lot of character.",
  },
  { id: "offline", name: "Offline", hint: "Eyes closed. Taking a little break." },
];
const projects = [
  {
    id: "01",
    name: "Human, with upgrades",
    tag: "CHARACTER / VISUAL IDENTITY",
    mood: "neutral",
    word: "HUMAN+",
    color: "#ff713f",
    text: "Soft rose hair, bright cyan eyes and a sharp mechanical silhouette. A character study in the details that make a future feel personal.",
  },
  {
    id: "02",
    name: "A signal of her own",
    tag: "EXPRESSION / INTERACTION",
    mood: "angry",
    word: "REACT.",
    color: "#a5e5ec",
    text: "A small gesture, an unmistakable reaction. Gentle cheek pulls and expressive eyes give this cel-shaded portrait a personality you can meet.",
  },
  {
    id: "03",
    name: "Beyond the frame",
    tag: "WORLD / ART DIRECTION",
    mood: "offline",
    word: "OFFLINE?",
    color: "#e9c3b5",
    text: "An imagined world of warm machinery, precise ink lines and characters who refuse to blend in. A starting point for stories, identities and digital experiences.",
  },
];

function Arrow({ diagonal = true }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d={diagonal ? "M5 19 19 5M5 5h14v14" : "M4 12h16m-7-7 7 7-7 7"}
        stroke="currentColor"
        strokeWidth="1.5"
      />
    </svg>
  );
}

function Reveal({ children, className = "" }) {
  const enabled = useMotionEnabled();
  return (
    <motion.div
      className={className}
      initial={enabled ? { opacity: 0, y: 32 } : false}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.15 }}
      transition={{ duration: enabled ? 0.7 : 0, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  );
}

function Character({
  heroRef,
  chosenMood,
  hoverMood,
  setHoverMood,
  chooseMood,
}) {
  const enabled = useMotionEnabled();
  const visible = useInView(heroRef);
  const gazeX = useMotionValue(0);
  const gazeY = useMotionValue(0);
  // The cursor moves only her eyes; the head stays in place.
  // These values update the DOM directly, without rendering React per frame.
  const float = useMotionValue(0);
  const pullX = useSpring(0, { stiffness: 270, damping: 19, mass: 0.55 });
  const pullY = useSpring(0, { stiffness: 270, damping: 19, mass: 0.55 });
  const anchorX = useMotionValue(0.37);
  const anchorY = useMotionValue(0.35);
  const characterRef = useRef(null);
  const grip = useRef(null);
  const pullBusy = useRef(false);
  const releaseTimer = useRef(null);
  const [dragging, setDragging] = useState(false);
  const [warpReady, setWarpReady] = useState(false);
  const clock = useRef(0);
  const [failed, setFailed] = useState([]);
  const requestedMood = hoverMood || chosenMood;
  const mood = failed.includes(requestedMood) ? "neutral" : requestedMood;

  const releasePull = useCallback(
    (immediately = false) => {
      const current = grip.current;
      grip.current = null;
      clearTimeout(releaseTimer.current);
      setDragging(false);
      if (current?.element?.hasPointerCapture(current.pointerId)) {
        current.element.releasePointerCapture(current.pointerId);
      }
      if (immediately || !enabled) {
        pullX.jump(0);
        pullY.jump(0);
        pullBusy.current = false;
      } else {
        pullX.set(0);
        pullY.set(0);
      }
    },
    [enabled, pullX, pullY],
  );

  useEffect(() => {
    if (!enabled || !warpReady || mood === "offline") releasePull(true);
    const cancel = () => releasePull(true);
    const hide = () => {
      if (document.hidden) cancel();
    };
    window.addEventListener("blur", cancel);
    window.addEventListener("resize", cancel);
    document.addEventListener("visibilitychange", hide);
    return () => {
      window.removeEventListener("blur", cancel);
      window.removeEventListener("resize", cancel);
      document.removeEventListener("visibilitychange", hide);
      clearTimeout(releaseTimer.current);
      const current = grip.current;
      grip.current = null;
      if (current?.element?.hasPointerCapture(current.pointerId))
        current.element.releasePointerCapture(current.pointerId);
    };
  }, [enabled, warpReady, mood, releasePull]);

  const setPull = (dx, dy) => {
    // Bound the combined displacement to keep the mesh smooth, even if the
    // pointer travels outside the head or viewport while captured.
    const scale = Math.min(1, MAX_CHEEK_PULL / (Math.hypot(dx, dy) || 1));
    pullX.jump(dx * scale);
    pullY.jump(dy * scale);
  };

  const cheek = (side) => ({
    disabled: !warpReady || mood === "offline",
    onPointerDown: (event) => {
      if (event.button !== 0 || !event.isPrimary || grip.current) return;
      const element = event.currentTarget;
      try {
        element.setPointerCapture(event.pointerId);
      } catch {
        return;
      }
      event.preventDefault();
      element.focus({ preventScroll: true });
      clearTimeout(releaseTimer.current);
      const rect = characterRef.current.getBoundingClientRect();
      grip.current = {
        element,
        pointerId: event.pointerId,
        rect,
        x: event.clientX,
        y: event.clientY,
      };
      pullBusy.current = true;
      setDragging(true);
      setHoverMood(null);
      anchorX.jump((event.clientX - rect.left) / rect.width);
      anchorY.jump(1 - (event.clientY - rect.top) / rect.height);
      setPull(0, 0);
    },
    onPointerMove: (event) => {
      const current = grip.current;
      if (!current || event.pointerId !== current.pointerId) return;
      setPull(
        ((event.clientX - current.x) / current.rect.width) *
          CHEEK_PULL_RESISTANCE,
        -((event.clientY - current.y) / current.rect.height) *
          CHEEK_PULL_RESISTANCE,
      );
    },
    onPointerUp: (event) => {
      if (grip.current?.pointerId === event.pointerId) releasePull();
    },
    onPointerCancel: (event) => {
      if (grip.current?.pointerId === event.pointerId) releasePull(true);
    },
    onLostPointerCapture: (event) => {
      if (grip.current?.pointerId === event.pointerId) releasePull();
    },
    onKeyDown: (event) => {
      if (event.key === "Escape") {
        releasePull(true);
        return;
      }
      const direction = {
        ArrowLeft: [-0.01, 0],
        ArrowRight: [0.01, 0],
        ArrowUp: [0, 0.01],
        ArrowDown: [0, -0.01],
      }[event.key];
      if (!direction || (grip.current && !grip.current.keyboard)) return;
      event.preventDefault();
      grip.current = { keyboard: true };
      pullBusy.current = true;
      setDragging(true);
      setHoverMood(null);
      anchorX.jump(side === "left" ? 0.37 : 0.63);
      anchorY.jump(0.35);
      setPull(pullX.get() + direction[0], pullY.get() + direction[1]);
    },
    onKeyUp: (event) => {
      if (event.key.startsWith("Arrow") && grip.current?.keyboard)
        releasePull();
    },
    onClick: (event) => {
      if (event.detail !== 0 || grip.current) return;
      anchorX.jump(side === "left" ? 0.37 : 0.63);
      anchorY.jump(0.35);
      pullBusy.current = true;
      setDragging(true);
      setHoverMood(null);
      setPull(side === "left" ? -0.026 : 0.026, 0.003);
      clearTimeout(releaseTimer.current);
      releaseTimer.current = setTimeout(() => releasePull(), 180);
    },
    onBlur: () => {
      if (grip.current?.keyboard) releasePull();
    },
  });

  useAnimationFrame((_, delta) => {
    if (!grip.current && Math.hypot(pullX.get(), pullY.get()) < 0.0002)
      pullBusy.current = false;
    if (pullBusy.current) return;
    if (!enabled || !visible || document.hidden || mood === "offline") return;
    clock.current += Math.min(delta, 32);
    float.set(Math.sin(clock.current / 1250) * 6);
  });

  useEffect(() => {
    const hero = heroRef.current;
    if (!enabled || mood === "offline") {
      gazeX.jump(0);
      gazeY.jump(0);
      float.jump(0);
      if (!enabled) setHoverMood(null);
      return;
    }
    const follow = (event) => {
      if (event.pointerType === "touch" || pullBusy.current) return;
      const rect = hero.getBoundingClientRect();
      gazeX.set(
        Math.max(
          -1,
          Math.min(1, ((event.clientX - rect.left) / rect.width - 0.5) * 2),
        ),
      );
      gazeY.set(
        Math.max(
          -1,
          Math.min(1, 1 - ((event.clientY - rect.top) / rect.height) * 2),
        ),
      );
    };
    const reset = () => {
      if (pullBusy.current) return;
      gazeX.set(0);
      gazeY.set(0);
      setHoverMood(null);
    };
    hero.addEventListener("pointermove", follow);
    hero.addEventListener("pointerleave", reset);
    return () => {
      hero.removeEventListener("pointermove", follow);
      hero.removeEventListener("pointerleave", reset);
    };
  }, [enabled, mood, heroRef, gazeX, gazeY, float, setHoverMood]);

  const zone = (name) => ({
    onPointerEnter: (event) => {
      if (enabled && chosenMood !== "offline" && event.pointerType !== "touch" && !pullBusy.current)
        setHoverMood(name);
    },
    onPointerLeave: () => setHoverMood(null),
    onClick: () => {
      setHoverMood(null);
      chooseMood(name);
    },
  });

  return (
    <div className="talia-character-stage">
      <motion.div
        className="talia-character-reveal"
        initial={enabled ? { opacity: 0, y: 80, scale: 0.92 } : false}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{
          duration: enabled ? 1.15 : 0,
          delay: enabled ? 0.15 : 0,
          ease: [0.16, 1, 0.3, 1],
        }}
      >
        <div className="talia-character-frame">
          <motion.div
            ref={characterRef}
            className="talia-character"
            style={{
              y: float,
              "--talia-pull-x": pullX,
              "--talia-pull-y": pullY,
            }}
            data-expression={dragging ? "angry" : mood}
            data-warp={warpReady ? "ready" : "fallback"}
            data-dragging={dragging}
          >
            <div className="talia-character-images">
              {failed.includes("neutral") ? (
                <div className="talia-character-fallback">
                  T<span>A little future. A lot of character.</span>
                </div>
              ) : (
                moods.map(({ id }) => (
                  <motion.img
                    key={id}
                    src={asset(id)}
                    alt={
                      id === "offline"
                        ? "Ava resting offline with both eyes gently closed, pale rose hair and an orange-black cybernetic face frame"
                        : "Ava, a cel-shaded character with pale rose hair, cyan eyes and an orange-black cybernetic face frame"
                    }
                    aria-hidden={id !== mood || undefined}
                    width="1280"
                    height="1280"
                    draggable="false"
                    decoding="async"
                    fetchPriority={id === "neutral" ? "high" : "low"}
                    initial={false}
                    animate={{ opacity: mood === id ? 1 : 0 }}
                    transition={{ duration: enabled ? 0.16 : 0 }}
                    onError={() =>
                      setFailed((current) =>
                        current.includes(id) ? current : [...current, id],
                      )
                    }
                  />
                ))
              )}
            </div>
            <TaliaFaceWarp
              mood={mood}
              angry={dragging}
              gazeX={gazeX}
              gazeY={gazeY}
              pullX={pullX}
              pullY={pullY}
              anchorX={anchorX}
              anchorY={anchorY}
              enabled={enabled}
              visible={visible}
              onReady={setWarpReady}
            />
            <button
              type="button"
              className="talia-zone talia-zone-hair"
              aria-label="Return Ava to standby"
              {...zone("neutral")}
            />
            <button
              type="button"
              className="talia-zone talia-zone-cheek talia-zone-cheek-left"
              aria-label="Pull Ava's left cheek"
              aria-describedby="talia-cheek-instructions"
              {...cheek("left")}
            />
            <button
              type="button"
              className="talia-zone talia-zone-cheek talia-zone-cheek-right"
              aria-label="Pull Ava's right cheek"
              aria-describedby="talia-cheek-instructions"
              {...cheek("right")}
            />
            <span id="talia-cheek-instructions" className="talia-sr">
              Gently tug a cheek to see Ava get angry; release to let it
              return. Keyboard: hold an arrow key to pull, release to return;
              Escape resets. Enter or Space gives it a quick tug.
            </span>
            <button
              type="button"
              className="talia-zone talia-zone-nose"
              aria-label="Show Ava’s defiant expression"
              {...zone("angry")}
            />
          </motion.div>
        </div>
      </motion.div>
    </div>
  );
}

export default function Ava() {
  const enabled = useMotionEnabled();
  const heroRef = useRef(null);
  const [chosenMood, setChosenMood] = useState("neutral");
  const [hoverMood, setHoverMood] = useState(null);
  const [openProject, setOpenProject] = useState(null);
  const [service, setService] = useState("A character with personality");
  const [briefReady, setBriefReady] = useState(false);
  const { scrollYProgress } = useScroll({
    target: heroRef,
    offset: ["start start", "end start"],
  });
  const titleY = useTransform(scrollYProgress, [0, 1], [0, 160]);
  const chooseMood = (id) => {
    setHoverMood(null);
    setChosenMood(id);
  };

  return (
    <main className="talia-page" id="main">
      <section className="talia-hero" ref={heroRef} aria-label="Meet Ava">
        <header className="talia-header">
          <nav aria-label="Ava portfolio">
            <a href="#talia-about">About</a>
            <a href="#talia-services">Services</a>
            <a href="#talia-projects">Projects</a>
            <a href="#talia-contact">
              Contact <span aria-hidden="true">↗</span>
            </a>
          </nav>
        </header>
        <motion.h1
          className="talia-title"
          style={{ y: enabled ? titleY : 0 }}
          aria-label="Hi, I'm Ava"
        >
          <motion.span
            initial={enabled ? { y: "105%" } : false}
            animate={{ y: 0 }}
            transition={{
              duration: enabled ? 1.1 : 0,
              ease: [0.16, 1, 0.3, 1],
            }}
          >
            HI, I'M AVA
          </motion.span>
        </motion.h1>
        <Character
          heroRef={heroRef}
          chosenMood={chosenMood}
          hoverMood={hoverMood}
          setHoverMood={setHoverMood}
          chooseMood={chooseMood}
        />
        <div className="talia-side-note" data-offline={chosenMood === "offline"}>
          <span className="talia-live-dot" />
          {chosenMood === "offline" ? "SIGNAL RESTING." : "SIGNAL FOUND."}
          <br />
          {chosenMood === "offline" ? "BACK IN A MOMENT." : "ALWAYS CURIOUS."}
        </div>
        <div
          className="talia-moods"
          role="group"
          aria-label="Choose Ava's expression"
        >
          <span className="talia-eyebrow">CURRENT STATE</span>
          {moods.map((mood, i) => (
            <button
              key={mood.id}
              type="button"
              aria-pressed={chosenMood === mood.id}
              onClick={() => chooseMood(mood.id)}
              data-mood={mood.id}
            >
              <span
                className={`talia-mood-dot talia-mood-dot-${mood.id}`}
                aria-hidden="true"
              >
                {i > 1 ? (i === 2 ? "◡" : "×") : ""}
              </span>
              <span>{mood.name}</span>
              {chosenMood === mood.id && (
                <span className="talia-mood-mark" aria-hidden="true">
                  ↗
                </span>
              )}
            </button>
          ))}
        </div>
        <div className="talia-hero-bottom">
          <p className="talia-intro">
            PART HUMAN.
            <br />
            PART POSSIBILITY.
            <br />
            ALL CHARACTER.
          </p>
          <div className="talia-play-hint">
            <span aria-hidden="true">✳</span>
            <p>
              <span className="talia-desktop-hint">
                {chosenMood === "offline" ? "OFFLINE. TAKING A BREATHER." : "GENTLE PULL. BIG ATTITUDE."}
              </span>
              <span className="talia-touch-hint">{chosenMood === "offline" ? "OFFLINE. TAKING A BREATHER." : "PULL GENTLY. I BITE."}</span>
              <br />
              <span className="talia-hint-sub">
                {chosenMood === "offline" ? "Select Standby to reconnect." : "My eyes follow your curiosity."}
              </span>
            </p>
          </div>
          <motion.a
            className="talia-contact-pill"
            href="#talia-contact"
            whileHover={enabled ? { scale: 1.04 } : {}}
            whileTap={enabled ? { scale: 0.97 } : {}}
          >
            CONTACT ME <Arrow />
          </motion.a>
        </div>
        <p className="talia-sr" role="status" aria-live="polite">
          {moods.find((m) => m.id === chosenMood).name} expression selected.
        </p>
        <a
          className="talia-scroll"
          href="#talia-about"
          aria-label="Scroll to about Ava"
        >
          <span>SCROLL TO MEET ME</span>↓
        </a>
      </section>

      <section className="talia-about talia-section" id="talia-about">
        <div className="talia-section-label">
          <span>01 / A LITTLE ABOUT ME</span>
          <span>IMAGINATION, WITH INTENTION.</span>
        </div>
        <Reveal>
          <h2>
            Good design gets noticed.
            <br />
            <span>Character gets remembered.</span>
          </h2>
        </Reveal>
        <div className="talia-about-bottom">
          <p>
            I’m Ava: a little human, a little hardware, and entirely my own
            person. This is a place for sharp lines, expressive characters, and
            imagined worlds that feel close enough to touch.
          </p>
          <p>
            Some things are better felt than explained.
            <br />
            So go on. Poke around.
          </p>
          <a href="#talia-projects" className="talia-text-link">
            Meet the work <Arrow />
          </a>
        </div>
      </section>

      <section className="talia-projects talia-section" id="talia-projects">
        <div className="talia-section-label">
          <span>02 / SELECTED EXPLORATIONS</span>
          <span>2026 — ONGOING</span>
        </div>
        <Reveal className="talia-section-heading">
          <h2>A few sides of me.</h2>
          <span>Click a study to get closer.</span>
        </Reveal>
        <div className="talia-project-grid">
          {projects.map((project) => (
            <Reveal key={project.id} className="talia-project-wrap">
              <article
                className="talia-project"
                style={{ "--talia-project-color": project.color }}
              >
                <button
                  className="talia-project-open"
                  type="button"
                  aria-expanded={openProject === project.id}
                  aria-controls={`talia-project-${project.id}`}
                  onClick={() =>
                    setOpenProject(
                      openProject === project.id ? null : project.id,
                    )
                  }
                >
                  <div className="talia-project-art">
                    <span className="talia-project-word" aria-hidden="true">
                      {project.word}
                    </span>
                    <motion.img
                      src={asset(project.mood)}
                      alt={`${project.name} character study`}
                      width="1280"
                      height="1280"
                      loading="lazy"
                      whileHover={
                        enabled
                          ? {
                              y: -12,
                              rotate: project.id === "02" ? -5 : 5,
                              scale: 1.035,
                            }
                          : {}
                      }
                      transition={{
                        type: "spring",
                        stiffness: 170,
                        damping: 18,
                      }}
                    />
                    <span className="talia-project-plus" aria-hidden="true">
                      {openProject === project.id ? "−" : "+"}
                    </span>
                  </div>
                  <span className="talia-project-meta">
                    {project.tag}
                    <span>{project.id}</span>
                  </span>
                  <h3>{project.name}</h3>
                </button>
                <div
                  id={`talia-project-${project.id}`}
                  hidden={openProject !== project.id}
                >
                  <AnimatePresence>
                    {openProject === project.id && (
                      <motion.p
                        initial={enabled ? { opacity: 0, y: 8 } : false}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: enabled ? 0.3 : 0 }}
                      >
                        {project.text}
                      </motion.p>
                    )}
                  </AnimatePresence>
                </div>
              </article>
            </Reveal>
          ))}
        </div>
      </section>

      <section className="talia-services talia-section" id="talia-services">
        <div className="talia-section-label">
          <span>03 / WHAT WE CAN MAKE</span>
          <span>SMALL DETAILS. BIG FEELINGS.</span>
        </div>
        <div className="talia-services-layout">
          <Reveal>
            <h2>
              Have a wild idea?
              <br />
              <span>I’m listening.</span>
            </h2>
            <p>
              From the first spark to the final little detail. Pick a starting
              point and let’s make it yours.
            </p>
          </Reveal>
          <div className="talia-service-list">
            {[
              [
                "01",
                "A character with personality",
                "Character concepts, expressive portraits, and visual worlds.",
              ],
              [
                "02",
                "A website that feels alive",
                "Distinctive art direction, playful interactions, and motion.",
              ],
              [
                "03",
                "Something a little unexpected",
                "Creative experiments, campaign visuals, and new possibilities.",
              ],
            ].map(([number, title, text]) => (
              <a
                href="#talia-contact"
                key={number}
                onClick={() => {
                  setService(title);
                  setBriefReady(false);
                }}
              >
                <span>{number}</span>
                <div>
                  <h3>{title}</h3>
                  <p>{text}</p>
                </div>
                <Arrow />
              </a>
            ))}
          </div>
        </div>
      </section>

      <section className="talia-contact talia-section" id="talia-contact">
        <div className="talia-section-label">
          <span>04 / LET’S MAKE SOMETHING</span>
          <span>
            <span className="talia-live-dot" /> OPEN TO GOOD IDEAS
          </span>
        </div>
        <Reveal>
          <h2>
            GOT A<br />
            <em>SIGNAL?</em>
            <span className="talia-contact-star" aria-hidden="true">
              ✳
            </span>
          </h2>
        </Reveal>
        <div className="talia-contact-bottom">
          <p>
            The best things start with a conversation.
            <br />
            Tell us what you have in mind.
          </p>
          <form
            onSubmit={(event) => {
              event.preventDefault();
              setBriefReady(true);
            }}
          >
            <label htmlFor="talia-brief">I’M THINKING ABOUT</label>
            <div className="talia-brief-row">
              <select
                id="talia-brief"
                value={service}
                onChange={(event) => {
                  setService(event.target.value);
                  setBriefReady(false);
                }}
              >
                <option>A character with personality</option>
                <option>A website that feels alive</option>
                <option>Something a little unexpected</option>
              </select>
              <button type="submit" aria-label="Prepare my project brief">
                <Arrow />
              </button>
            </div>
            <AnimatePresence>
              {briefReady && (
                <motion.div
                  className="talia-brief-ready"
                  role="status"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                >
                  <p>Let’s talk about “{service.toLowerCase()}”.</p>
                  <a className="talia-text-link" href="/#contact">
                    Continue to LocalNinja <Arrow />
                  </a>
                </motion.div>
              )}
            </AnimatePresence>
          </form>
        </div>
        <footer className="talia-footer">
          <a href="#main" aria-label="Ava back to top">
            AVA<span>®</span>
          </a>
          <p>A LOCALNINJA CHARACTER STUDY / 2026</p>
          <a href="/work.html#work-ui">
            BACK TO THE COLLECTION <Arrow />
          </a>
        </footer>
      </section>
    </main>
  );
}
