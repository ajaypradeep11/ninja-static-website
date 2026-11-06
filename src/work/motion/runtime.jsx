import React, { createContext, useContext, useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import { MotionConfig } from "motion/react";
import { motionDesigns } from "./catalog.js";
import "./runtime.css";

const MotionContext = createContext(true);
export const useMotionEnabled = () => useContext(MotionContext);

function Lab({ Page, slug }) {
  const [reduced, setReduced] = useState(
    () => window.matchMedia("(prefers-reduced-motion: reduce)").matches,
  );
  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduced(query.matches);
    query.addEventListener("change", update);
    update();
    return () => query.removeEventListener("change", update);
  }, []);
  const [paused, setPaused] = useState(false);
  const enabled = !paused && !reduced;
  const current = motionDesigns.findIndex((d) => d.slug === slug);
  const next = motionDesigns[(current + 1) % motionDesigns.length];
  useEffect(() => {
    document.documentElement.dataset.motion = enabled ? "on" : "off";
  }, [enabled]);
  return (
    <MotionContext.Provider value={enabled}>
      <MotionConfig reducedMotion={enabled ? "never" : "always"}>
        <a className="motion-skip" href="#main">
          Skip to content
        </a>
        <Page />
        <nav className="motion-toolbar" aria-label="Motion Lab navigation">
          <a className="motion-back" href="/work.html#work-ui">
            <span aria-hidden="true">↖</span> <span>All designs</span>
          </a>
          <span className="motion-toolbar-divider" />
          <label className="motion-picker">
            <span className="motion-sr">Choose a motion design</span>
            <select
              aria-label="Choose a motion design"
              value={slug}
              onChange={(e) => {
                location.href = `/work/motion/${e.target.value}.html`;
              }}
            >
              {motionDesigns.map((d, i) => (
                <option key={d.slug} value={d.slug}>
                  {String(i + 1).padStart(2, "0")} / {d.name}
                </option>
              ))}
            </select>
          </label>
          <button
            className="motion-toggle"
            type="button"
            onClick={() => setPaused((p) => !p)}
            aria-pressed={paused}
            disabled={!!reduced}
            title={reduced ? "Your system requests reduced motion" : undefined}
          >
            {reduced
              ? "Reduced motion"
              : paused
                ? "Resume motion"
                : "Pause motion"}
          </button>
          <a
            className="motion-next"
            href={`/work/motion/${next.slug}.html`}
            aria-label={`Next design: ${next.name}`}
          >
            Next <span aria-hidden="true">↗</span>
          </a>
        </nav>
      </MotionConfig>
    </MotionContext.Provider>
  );
}

export function mount(Page, slug) {
  createRoot(document.getElementById("app")).render(
    <Lab Page={Page} slug={slug} />,
  );
}
