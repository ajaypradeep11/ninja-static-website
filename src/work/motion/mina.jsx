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
import MinaFaceWarp from "./MinaFaceWarp.jsx";
import "./mina.css";

const asset = (name) => `/work/motion-lab/mina/${name}.webp`;
const MAX_CHEEK_PULL = 0.045;
const CHEEK_PULL_RESISTANCE = 0.42;
const moods = [
  {
    id: "neutral",
    name: "Just me",
    hint: "A little curiosity goes a long way.",
  },
  { id: "blue", name: "Electric", hint: "New hair. Same imagination." },
  { id: "wink", name: "Playful", hint: "Taking fun very seriously." },
  { id: "pout", name: "Cheeky", hint: "Too close? No such thing." },
];
const projects = [
  {
    id: "01",
    name: "Electric personality",
    tag: "CHARACTER / LOOK DEVELOPMENT",
    mood: "blue",
    color: "#8d96fb",
    text: "An experiment in how a single change of color can give a character a completely different energy. Cobalt hair, warm skin, and an unmistakable silhouette.",
  },
  {
    id: "02",
    name: "A wink of an idea",
    tag: "EXPRESSION / ART DIRECTION",
    mood: "wink",
    color: "#e2a583",
    text: "Small expressions make a big impression. A study of warmth, exaggeration, and the moment a digital character starts to feel like someone you know.",
  },
  {
    id: "03",
    name: "Serious about play",
    tag: "INTERACTION / MOTION",
    mood: "pout",
    color: "#d1b8e2",
    text: "A little mischief for the browser. Expressive poses, tactile spring movement, and unexpected reactions bring the audience into the work.",
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
  const anchorX = useMotionValue(0.34);
  const anchorY = useMotionValue(0.36);
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
    if (!enabled || !warpReady) releasePull(true);
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
  }, [enabled, warpReady, releasePull]);

  const setPull = (dx, dy) => {
    // Bound the combined displacement to keep the mesh smooth, even if the
    // pointer travels outside the head or viewport while captured.
    const scale = Math.min(1, MAX_CHEEK_PULL / (Math.hypot(dx, dy) || 1));
    pullX.jump(dx * scale);
    pullY.jump(dy * scale);
  };

  const cheek = (side) => ({
    disabled: !warpReady,
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
        ArrowLeft: [-0.012, 0],
        ArrowRight: [0.012, 0],
        ArrowUp: [0, 0.012],
        ArrowDown: [0, -0.012],
      }[event.key];
      if (!direction || (grip.current && !grip.current.keyboard)) return;
      event.preventDefault();
      grip.current = { keyboard: true };
      pullBusy.current = true;
      setDragging(true);
      setHoverMood(null);
      anchorX.jump(side === "left" ? 0.345 : 0.675);
      anchorY.jump(0.36);
      setPull(pullX.get() + direction[0], pullY.get() + direction[1]);
    },
    onKeyUp: (event) => {
      if (event.key.startsWith("Arrow") && grip.current?.keyboard)
        releasePull();
    },
    onClick: (event) => {
      if (event.detail !== 0 || grip.current) return;
      anchorX.jump(side === "left" ? 0.345 : 0.675);
      anchorY.jump(0.36);
      pullBusy.current = true;
      setDragging(true);
      setHoverMood(null);
      setPull(side === "left" ? -0.035 : 0.035, 0.004);
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
    if (!enabled || !visible || document.hidden) return;
    clock.current += Math.min(delta, 32);
    float.set(Math.sin(clock.current / 1250) * 6);
  });

  useEffect(() => {
    const hero = heroRef.current;
    if (!enabled) {
      gazeX.jump(0);
      gazeY.jump(0);
      float.jump(0);
      setHoverMood(null);
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
  }, [enabled, heroRef, gazeX, gazeY, float, setHoverMood]);

  const zone = (name) => ({
    onPointerEnter: (event) => {
      if (enabled && event.pointerType !== "touch" && !pullBusy.current)
        setHoverMood(name);
    },
    onPointerLeave: () => setHoverMood(null),
    onClick: () => {
      setHoverMood(null);
      chooseMood(name);
    },
  });

  return (
    <div className="mina-character-stage">
      <motion.div
        className="mina-character-reveal"
        initial={enabled ? { opacity: 0, y: 80, scale: 0.92 } : false}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{
          duration: enabled ? 1.15 : 0,
          delay: enabled ? 0.15 : 0,
          ease: [0.16, 1, 0.3, 1],
        }}
      >
        <div className="mina-character-frame">
          <motion.div
            ref={characterRef}
            className="mina-character"
            style={{ y: float, "--mina-pull-x": pullX, "--mina-pull-y": pullY }}
            data-expression={dragging ? "angry" : mood}
            data-warp={warpReady ? "ready" : "fallback"}
            data-dragging={dragging}
          >
            <div className="mina-character-images">
              {failed.includes("neutral") ? (
                <div className="mina-character-fallback">
                  M<span>A little imagination.</span>
                </div>
              ) : (
                moods.map(({ id }) => (
                  <motion.img
                    key={id}
                    src={asset(id)}
                    alt={
                      id === "neutral"
                        ? "Mina, a floating character with flowing hair and pearl earrings"
                        : ""
                    }
                    aria-hidden={id !== "neutral" || undefined}
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
            <MinaFaceWarp
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
              className="mina-zone mina-zone-hair"
              aria-label="Give Mina electric blue hair"
              {...zone("blue")}
            />
            <button
              type="button"
              className="mina-zone mina-zone-cheek mina-zone-cheek-left"
              aria-label="Pull Mina's left cheek"
              aria-describedby="mina-cheek-instructions"
              {...cheek("left")}
            />
            <button
              type="button"
              className="mina-zone mina-zone-cheek mina-zone-cheek-right"
              aria-label="Pull Mina's right cheek"
              aria-describedby="mina-cheek-instructions"
              {...cheek("right")}
            />
            <span id="mina-cheek-instructions" className="mina-sr">
              Gently tug a cheek to see Mina get angry; release to let it
              return. Keyboard: hold an arrow key to pull, release to return;
              Escape resets. Enter or Space gives it a quick tug.
            </span>
            <button
              type="button"
              className="mina-zone mina-zone-nose"
              aria-label="Make Mina pull a cheeky face"
              {...zone("pout")}
            />
          </motion.div>
        </div>
      </motion.div>
    </div>
  );
}

export default function Mina() {
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
    <main className="mina-page" id="main">
      <section className="mina-hero" ref={heroRef} aria-label="Meet Mina">
        <header className="mina-header">
          <nav aria-label="Mina portfolio">
            <a href="#mina-about">About</a>
            <a href="#mina-services">Services</a>
            <a href="#mina-projects">Projects</a>
            <a href="#mina-contact">
              Contact <span aria-hidden="true">↗</span>
            </a>
          </nav>
        </header>
        <motion.h1
          className="mina-title"
          style={{ y: enabled ? titleY : 0 }}
          aria-label="Hi, I'm Mina"
        >
          <motion.span
            initial={enabled ? { y: "105%" } : false}
            animate={{ y: 0 }}
            transition={{
              duration: enabled ? 1.1 : 0,
              ease: [0.16, 1, 0.3, 1],
            }}
          >
            HI, I'M MINA
          </motion.span>
        </motion.h1>
        <Character
          heroRef={heroRef}
          chosenMood={chosenMood}
          hoverMood={hoverMood}
          setHoverMood={setHoverMood}
          chooseMood={chooseMood}
        />
        <div className="mina-side-note">
          <span className="mina-live-dot" />
          INDEPENDENT
          <br />
          BY NATURE.
        </div>
        <div
          className="mina-moods"
          role="group"
          aria-label="Choose Mina's expression"
        >
          <span className="mina-eyebrow">A LITTLE PERSONALITY</span>
          {moods.map((mood, i) => (
            <button
              key={mood.id}
              type="button"
              aria-pressed={chosenMood === mood.id}
              onClick={() => chooseMood(mood.id)}
              data-mood={mood.id}
            >
              <span
                className={`mina-mood-dot mina-mood-dot-${mood.id}`}
                aria-hidden="true"
              >
                {i > 1 ? (i === 2 ? "◡" : "×") : ""}
              </span>
              <span>{mood.name}</span>
              {chosenMood === mood.id && (
                <span className="mina-mood-mark" aria-hidden="true">
                  ↗
                </span>
              )}
            </button>
          ))}
        </div>
        <div className="mina-hero-bottom">
          <p className="mina-intro">
            A DIGITAL CREATOR
            <br />
            CRAFTING CHARACTERS
            <br />
            AND EXPERIENCES
            <br />
            WITH A PULSE.
          </p>
          <div className="mina-play-hint">
            <span aria-hidden="true">✳</span>
            <p>
              <span className="mina-desktop-hint">DRAG MY CHEEKS. LET GO.</span>
              <span className="mina-touch-hint">
                PULL A CHEEK. WATCH IT BOUNCE.
              </span>
              <br />
              <span className="mina-hint-sub">Try my hair and nose, too.</span>
            </p>
          </div>
          <motion.a
            className="mina-contact-pill"
            href="#mina-contact"
            whileHover={enabled ? { scale: 1.04 } : {}}
            whileTap={enabled ? { scale: 0.97 } : {}}
          >
            CONTACT ME <Arrow />
          </motion.a>
        </div>
        <p className="mina-sr" role="status" aria-live="polite">
          {moods.find((m) => m.id === chosenMood).name} expression selected.
        </p>
        <a
          className="mina-scroll"
          href="#mina-about"
          aria-label="Scroll to about Mina"
        >
          <span>SCROLL TO MEET ME</span>↓
        </a>
      </section>

      <section className="mina-about mina-section" id="mina-about">
        <div className="mina-section-label">
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
        <div className="mina-about-bottom">
          <p>
            I’m Mina, a digital creator exploring the space between art,
            personality, and interaction. I turn curious ideas into characters
            and experiences you can’t help but play with.
          </p>
          <p>
            Some things are better felt than explained.
            <br />
            So go on. Poke around.
          </p>
          <a href="#mina-projects" className="mina-text-link">
            Meet the work <Arrow />
          </a>
        </div>
      </section>

      <section className="mina-projects mina-section" id="mina-projects">
        <div className="mina-section-label">
          <span>02 / SELECTED EXPLORATIONS</span>
          <span>2026 — ONGOING</span>
        </div>
        <Reveal className="mina-section-heading">
          <h2>A few sides of me.</h2>
          <span>Click a study to get closer.</span>
        </Reveal>
        <div className="mina-project-grid">
          {projects.map((project) => (
            <Reveal key={project.id} className="mina-project-wrap">
              <article
                className="mina-project"
                style={{ "--mina-project-color": project.color }}
              >
                <button
                  className="mina-project-open"
                  type="button"
                  aria-expanded={openProject === project.id}
                  aria-controls={`mina-project-${project.id}`}
                  onClick={() =>
                    setOpenProject(
                      openProject === project.id ? null : project.id,
                    )
                  }
                >
                  <div className="mina-project-art">
                    <span className="mina-project-word" aria-hidden="true">
                      {project.mood === "blue"
                        ? "ELECTRIC"
                        : project.mood === "wink"
                          ? "GOOD MOOD"
                          : "PLAY."}
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
                    <span className="mina-project-plus" aria-hidden="true">
                      {openProject === project.id ? "−" : "+"}
                    </span>
                  </div>
                  <span className="mina-project-meta">
                    {project.tag}
                    <span>{project.id}</span>
                  </span>
                  <h3>{project.name}</h3>
                </button>
                <div
                  id={`mina-project-${project.id}`}
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

      <section className="mina-services mina-section" id="mina-services">
        <div className="mina-section-label">
          <span>03 / WHAT WE CAN MAKE</span>
          <span>SMALL DETAILS. BIG FEELINGS.</span>
        </div>
        <div className="mina-services-layout">
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
          <div className="mina-service-list">
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
                href="#mina-contact"
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

      <section className="mina-contact mina-section" id="mina-contact">
        <div className="mina-section-label">
          <span>04 / LET’S MAKE SOMETHING</span>
          <span>
            <span className="mina-live-dot" /> OPEN TO GOOD IDEAS
          </span>
        </div>
        <Reveal>
          <h2>
            GOT A<br />
            <em>FEELING?</em>
            <span className="mina-contact-star" aria-hidden="true">
              ✳
            </span>
          </h2>
        </Reveal>
        <div className="mina-contact-bottom">
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
            <label htmlFor="mina-brief">I’M THINKING ABOUT</label>
            <div className="mina-brief-row">
              <select
                id="mina-brief"
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
                  className="mina-brief-ready"
                  role="status"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                >
                  <p>Let’s talk about “{service.toLowerCase()}”.</p>
                  <a className="mina-text-link" href="/#contact">
                    Continue to LocalNinja <Arrow />
                  </a>
                </motion.div>
              )}
            </AnimatePresence>
          </form>
        </div>
        <footer className="mina-footer">
          <a href="#main" aria-label="Mina back to top">
            MINA<span>®</span>
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
