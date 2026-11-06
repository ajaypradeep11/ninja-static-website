import { useCallback, useEffect, useRef, useState } from "react";
import {
  AnimatePresence,
  animate,
  motion,
  useMotionValue,
  useSpring,
  useTransform,
} from "motion/react";
import { useMotionEnabled } from "./runtime.jsx";
import "./softspot.css";

const cities = [
  {
    id: "ottawa",
    name: "Ottawa",
    color: "#3e6370",
    ink: "#f7f4e7",
    label: "A capital with a softer side.",
    detail:
      "Parliament rises above the river, the canal winds through the city, and quiet paths connect it all. This miniature brings Ottawa’s limestone landmarks, copper rooftops, and green spaces into one little world.",
    landmark: "Parliament Hill & Rideau Canal",
    waterfront: "Ottawa River",
    alt: "Miniature Ottawa with Parliament Hill, the Peace Tower, Rideau Canal locks, and riverside trees",
    number: "01",
  },
  {
    id: "toronto",
    name: "Toronto",
    color: "#626fb4",
    ink: "#fff9ed",
    label: "Big city. Little world.",
    detail:
      "A familiar needle above the skyline, a streetcar passing below, and blue water at the city’s edge. Toronto becomes a compact collection of glass towers, neighbourhood colour, and lakeside light.",
    landmark: "CN Tower & Rogers Centre",
    waterfront: "Lake Ontario",
    alt: "Miniature Toronto with the CN Tower, Rogers Centre, downtown skyline, a red streetcar, and Lake Ontario waterfront",
    number: "02",
  },
  {
    id: "windsor",
    name: "Windsor",
    color: "#c4d565",
    ink: "#28331b",
    label: "Life along the river.",
    detail:
      "A suspension bridge stretches across the water, with green parkland and a welcoming city along the shore. This miniature celebrates Windsor’s riverfront, public art, and the connections that shape it.",
    landmark: "Ambassador Bridge & riverfront",
    waterfront: "Detroit River",
    alt: "Miniature Windsor with the Ambassador Bridge over the Detroit River, a green riverfront promenade, and downtown buildings",
    number: "03",
  },
];

function Arrow({ direction = "right" }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      style={direction === "left" ? { transform: "rotate(180deg)" } : undefined}
    >
      <path
        d="M4 12h15M13 5l7 7-7 7"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function City({ city, enabled, direction, onNext, onExplore }) {
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const tilt = useSpring(0, { stiffness: 90, damping: 22 });
  const floatX = useSpring(0, { stiffness: 65, damping: 22 });
  const floatY = useSpring(0, { stiffness: 65, damping: 22 });
  const dragRotate = useTransform(x, [-300, 300], [-12, 12]);
  const reset = useRef(null);
  const wasDragged = useRef(false);
  const dragTimer = useRef(null);
  useEffect(
    () => () => {
      clearTimeout(dragTimer.current);
      reset.current?.stop();
    },
    [],
  );
  useEffect(() => {
    if (!enabled) {
      tilt.jump(0);
      floatX.jump(0);
      floatY.jump(0);
      x.jump(0);
      y.jump(0);
    }
  }, [enabled, floatX, floatY, tilt, x, y]);
  const pointerMove = (e) => {
    if (!enabled || e.pointerType === "touch") return;
    const box = e.currentTarget.getBoundingClientRect();
    const px = (e.clientX - box.left) / box.width - 0.5;
    const py = (e.clientY - box.top) / box.height - 0.5;
    floatX.set(px * 18);
    floatY.set(py * 12);
    tilt.set(px * 4);
  };
  return (
    <motion.div
      className={`softspot-city-position softspot-city-${city.id}`}
      custom={direction}
      initial={
        enabled
          ? {
              opacity: 0,
              x: direction * 700,
              rotate: direction * 18,
              scale: 0.76,
            }
          : false
      }
      animate={{ opacity: 1, x: 0, rotate: 0, scale: 1 }}
      variants={{
        departing: (travel) =>
          enabled
            ? {
                opacity: 0,
                x: travel * -700,
                rotate: travel * -18,
                scale: 0.78,
              }
            : { opacity: 0 },
      }}
      exit="departing"
      transition={{ duration: enabled ? 0.85 : 0, ease: [0.19, 1, 0.22, 1] }}
    >
      <motion.div
        className="softspot-city-parallax"
        style={{ x: floatX, y: floatY, rotate: tilt }}
      >
        <motion.div
          className="softspot-city-float"
          animate={
            enabled
              ? {
                  y: [0, -8, 0],
                  rotate: [0, 0.5, 0],
                }
              : { y: 0, rotate: 0 }
          }
          transition={{
            duration: 5,
            repeat: enabled ? Infinity : 0,
            ease: "easeInOut",
          }}
        >
          <motion.button
            type="button"
            className="softspot-city-touch"
            aria-label={`Explore ${city.name}. Drag left or right to change cities, or select to read about ${city.name}.`}
            drag="x"
            dragMomentum={false}
            dragElastic={0.7}
            dragConstraints={{ left: -180, right: 180 }}
            style={{ x, y, rotate: enabled ? dragRotate : 0 }}
            onDragStart={() => {
              wasDragged.current = true;
              reset.current?.stop();
            }}
            onDragEnd={(_, info) => {
              if (
                Math.abs(info.offset.x) > 65 ||
                Math.abs(info.velocity.x) > 450
              )
                onNext(info.offset.x < 0 ? 1 : -1);
              else
                reset.current = animate(x, 0, {
                  type: "spring",
                  stiffness: enabled ? 200 : 10000,
                  damping: enabled ? 19 : 200,
                });
              clearTimeout(dragTimer.current);
              dragTimer.current = setTimeout(() => {
                wasDragged.current = false;
              }, 100);
            }}
            onClick={() => { if (!wasDragged.current) onExplore(); }}
            onPointerMove={pointerMove}
            onPointerLeave={() => {
              floatX.set(0);
              floatY.set(0);
              tilt.set(0);
            }}
          >
            <img
              src={`/work/motion-lab/softspot/${city.id}.webp`}
              alt={city.alt}
              draggable="false"
              width="1280"
              height="1280"
            />
          </motion.button>
        </motion.div>
      </motion.div>
    </motion.div>
  );
}

export default function Softspot() {
  const enabled = useMotionEnabled();
  const [[index, direction], setSlide] = useState([0, 1]);
  const [panel, setPanel] = useState(null);
  const dialog = useRef(null);
  const savedFocus = useRef(null);
  const city = cities[index];
  useEffect(() => {
    cities.forEach(({ id }) => {
      const image = new Image();
      image.src = `/work/motion-lab/softspot/${id}.webp`;
    });
  }, []);
  const go = useCallback(
    (step) =>
      setSlide(([old]) => [
        (old + step + cities.length) % cities.length,
        Math.sign(step),
      ]),
    [],
  );
  const openPanel = (name) => {
    savedFocus.current = document.activeElement;
    setPanel(name);
  };
  useEffect(() => {
    if (panel) dialog.current?.showModal();
    else if (dialog.current?.open) {
      dialog.current.close();
      savedFocus.current?.focus();
    }
  }, [panel]);
  useEffect(() => {
    const onKey = (event) => {
      if (
        panel ||
        event.altKey ||
        event.ctrlKey ||
        event.metaKey ||
        /INPUT|TEXTAREA|SELECT/.test(event.target.tagName)
      )
        return;
      if (event.key === "ArrowRight" || event.key === "ArrowLeft") {
        event.preventDefault();
        go(event.key === "ArrowRight" ? 1 : -1);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [go, panel]);
  return (
    <motion.main
      id="main"
      className="softspot-page"
      animate={{ backgroundColor: city.color, color: city.ink }}
      transition={{ duration: enabled ? 0.7 : 0 }}
      data-city={city.id}
    >
      <header className="softspot-header">
        <a
          href="/work.html#work-ui"
          className="softspot-wordmark"
          aria-label="Pocket Cities, back to all designs"
        >
          POCKET
          <br />
          CITIES
        </a>
        <button
          type="button"
          className="softspot-contact-link"
          onClick={() => openPanel("contact")}
        >
          <span className="softspot-nav-line" />
          LET’S MAKE SOMETHING
        </button>
        <button
          type="button"
          onClick={() => openPanel("about")}
          className="softspot-about-link"
        >
          ABOUT THE STUDIO <span>↗</span>
        </button>
        <span className="softspot-header-note">
          A SOFT SPOT
          <br />
          FOR CITIES.
        </span>
      </header>

      <section
        className="softspot-world"
        aria-roledescription="carousel"
        aria-label="Ontario city collection"
      >
        <div className="softspot-side-note">
          <span>
            THREE ONTARIO CITIES.<br />
            THREE LITTLE WORLDS.
          </span>
          <Arrow />
        </div>
        <div className="softspot-right-note">
          FAMILIAR PLACES.
          <br />
          A NEW PERSPECTIVE.
        </div>
        <div className="softspot-horizon" aria-hidden="true" />
        <motion.div
          className="softspot-ground-shadow"
          aria-hidden="true"
          animate={
            enabled
              ? { scale: [1, 0.9, 1], opacity: [0.22, 0.16, 0.22] }
              : { scale: 1, opacity: 0.2 }
          }
          transition={{
            duration: 5,
            repeat: enabled ? Infinity : 0,
            ease: "easeInOut",
          }}
        />
        <AnimatePresence initial={false} custom={direction} mode="sync">
          <City
            key={city.id}
            city={city}
            enabled={enabled}
            direction={direction}
            onNext={go}
            onExplore={() => openPanel("city")}
          />
        </AnimatePresence>
        <div className="softspot-title-block">
          <div className="softspot-project-meta">
            <span>{city.number} / 03</span>
            <span>ONTARIO / CANADA</span>
          </div>
          <h1 aria-live="polite" aria-atomic="true">
            <span className="motion-sr">{city.name}</span>
            <AnimatePresence mode="wait" initial={false}>
              <motion.span
                key={city.id}
                aria-hidden="true"
                className="softspot-title-lines"
                initial={enabled ? { y: 36, opacity: 0, rotate: 2 } : false}
                animate={{ y: 0, opacity: 1, rotate: 0 }}
                exit={{ y: enabled ? -30 : 0, opacity: 0 }}
                transition={{ duration: enabled ? 0.25 : 0 }}
              >
                <span>{city.name}</span>
              </motion.span>
            </AnimatePresence>
          </h1>
          <button
            className="softspot-story-link"
            type="button"
            onClick={() => openPanel("city")}
          >
            EXPLORE {city.name.toUpperCase()} <span>↗</span>
          </button>
        </div>
        <div className="softspot-stage-caption">
          <span>↔</span> DRAG TO TRAVEL · TAP TO EXPLORE
        </div>
        <div className="softspot-navigation">
          <div className="softspot-slide-dots" aria-label="Choose a city">
            {cities.map((item, i) => (
              <button
                key={item.id}
                type="button"
                aria-label={`Show ${item.name}`}
                aria-pressed={i === index}
                onClick={() => setSlide([i, i >= index ? 1 : -1])}
              >
                <span />
              </button>
            ))}
          </div>
          <div className="softspot-arrows">
            <button
              type="button"
              aria-label="Previous city"
              onClick={() => go(-1)}
            >
              <Arrow direction="left" />
            </button>
            <button
              type="button"
              aria-label="Next city"
              onClick={() => go(1)}
            >
              <Arrow />
            </button>
          </div>
        </div>
        <button
          className="softspot-seal"
          type="button"
          onClick={() => openPanel("about")}
          aria-label="About Pocket Cities, made with a little heart"
        >
          <svg viewBox="0 0 100 100" aria-hidden="true">
            <defs>
              <path
                id="softspot-seal-path"
                d="M50,50 m-34,0 a34,34 0 1,1 68,0 a34,34 0 1,1 -68,0"
              />
            </defs>
            <circle
              cx="50"
              cy="50"
              r="48"
              fill="none"
              stroke="currentColor"
              strokeWidth="1"
            />
            <text>
              <textPath href="#softspot-seal-path" textLength="210">
                THREE CITIES · A LITTLE WONDER ·{" "}
              </textPath>
            </text>
            <path
              d="M50 63C25 49 39 32 50 43C61 32 75 49 50 63Z"
              fill="currentColor"
            />
          </svg>
        </button>
      </section>

      <dialog
        ref={dialog}
        className="softspot-dialog"
        onCancel={() => setPanel(null)}
        onClick={(event) => {
          if (event.target === event.currentTarget) setPanel(null);
        }}
        aria-labelledby="softspot-dialog-title"
      >
        <div className="softspot-dialog-inner">
          <button
            type="button"
            className="softspot-dialog-close"
            onClick={() => setPanel(null)}
            aria-label="Close panel"
          >
            ×
          </button>
          <span className="softspot-dialog-eyebrow">
            POCKET CITIES /{" "}
            {panel === "city"
              ? `CITY ${city.number} / ONTARIO`
              : "A CREATIVE PLAYGROUND"}
          </span>
          <h2 id="softspot-dialog-title">
            {panel === "city"
              ? city.label
              : panel === "contact"
                ? "Let’s build your little world."
                : "Made for the joy of it."}
          </h2>
          {panel === "city" ? (
            <>
              <p>{city.detail}</p>
              <dl>
                <div>
                  <dt>Landmarks</dt>
                  <dd>{city.landmark}</dd>
                </div>
                <div>
                  <dt>By the water</dt>
                  <dd>{city.waterfront}</dd>
                </div>
              </dl>
              <button
                type="button"
                className="softspot-dialog-cta"
                onClick={() => {
                  setPanel(null);
                  go(1);
                }}
              >
                EXPLORE THE NEXT CITY <Arrow />
              </button>
            </>
          ) : panel === "contact" ? (
            <>
              <p>
                Distinctive places, playful worlds, and identities with a sense of home.
                Tell us what you’re imagining, and we’ll take it from there.
              </p>
              <a className="softspot-dialog-cta" href="/#contact">
                START A PROJECT WITH POCKET CITIES <Arrow />
              </a>
              <p className="softspot-dialog-small">
                This takes you to our studio’s contact page.
              </p>
            </>
          ) : (
            <>
              <p>
                We have a soft spot for places that make people feel something.
                A familiar skyline. A walk by the water. A tiny world you want to
                spend a little longer in.
              </p>
              <p>
                Ottawa, Toronto, and Windsor, reimagined as illustrated
                miniatures. Swipe between cities, explore their landmarks,
                and find your favourite place.
              </p>
              <button
                type="button"
                className="softspot-dialog-cta"
                onClick={() => setPanel(null)}
              >
                BACK TO THE CITIES <Arrow />
              </button>
            </>
          )}
        </div>
      </dialog>
    </motion.main>
  );
}
