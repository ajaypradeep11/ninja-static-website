import React, { useRef, useState } from "react";
import { AnimatePresence, motion, useMotionValueEvent, useScroll, useTransform } from "motion/react";
import { useMotionEnabled } from "./runtime.jsx";
import "./akai.css";

const asset = (name) => `/work/motion-lab/akai/katana/${name}.webp`;
const chapters = [
  { name: "The watcher", progress: 0, text: "High above the city, a swordsman watches in silence." },
  { name: "The eye", progress: 0.245, text: "His eye catches a presence. The city falls away. Everything turns red." },
  { name: "The presence", progress: 0.46, text: "Across the rooftops, a silver-haired rival waits." },
  { name: "The glance", progress: 0.645, text: "The rival turns. A glance is all it takes." },
  { name: "The clash", progress: 0.84, text: "Both move. Their katana cross. One moment becomes a story." },
];
const blades = [
  { id: "wind", name: "Wind", number: "01", color: "#286543", pale: "#dfe6d9", line: "Quiet by nature.", description: "An emerald silhouette with a flowing wind motif. For the one who finds their own direction.", finish: "Emerald green", detail: "Wind scrollwork · bronze-tone fittings", note: "The calm before the first strike." },
  { id: "water", name: "Water", number: "02", color: "#2857a2", pale: "#dce3ed", line: "A force that flows.", description: "Cobalt blue, rolling waves, and cool silver details. A collection piece with a rhythm of its own.", finish: "Cobalt blue", detail: "Ocean-wave guard · silver-tone fittings", note: "Still at the surface. Endless beneath." },
  { id: "fire", name: "Fire", number: "03", color: "#b22d29", pale: "#efddd5", line: "Impossible to ignore.", description: "Crimson lacquer and a sculpted flame motif. A vivid expression of the moment everything changes.", finish: "Crimson red", detail: "Flame guard · bronze-tone fittings", note: "A single spark. A different story." },
];

function Arrow({ diagonal = false }) {
  return <svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d={diagonal ? "M5 19 19 5M5 5h14v14" : "M4 12h15m-6-6 6 6-6 6"} stroke="currentColor" strokeWidth="1.5" /></svg>;
}
function ElementMark({ id }) {
  return <svg viewBox="0 0 48 48" fill="none" aria-hidden="true"><path d={id === "wind" ? "M6 17h25c12 0 12-12 4-12-4 0-6 2-6 5M4 25h32c11 0 11 14 3 14-4 0-6-2-6-5M11 33h10c9 0 9 10 3 10" : id === "water" ? "M3 15c7-10 14 10 21 0s14 10 21 0M3 25c7-10 14 10 21 0s14 10 21 0M3 35c7-10 14 10 21 0s14 10 21 0" : "M25 3c3 12 16 16 16 27 0 9-7 15-17 15S7 39 7 30c0-8 7-12 9-19 0 8 4 9 6 12 4-5 5-12 3-20ZM25 25c-2 7-9 9-9 14"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>;
}
function Brand() {
  return <a className="kn-brand" href="#main" aria-label="Ninja, back to the beginning"><span className="kn-brand-mark" aria-hidden="true">N</span>ninja<span className="kn-brand-period">.</span></a>;
}
function OpeningCopy() {
  return <div className="kn-opening-copy"><p className="kn-eyebrow">A NINJA ORIGINAL / CHAPTER 01</p><h1>SILENCE.<br />THEN <span>STEEL.</span></h1><p className="kn-opening-note">Every blade has a beginning.<br />This is ours.</p></div>;
}

function ClashArt({ progress, still = false }) {
  const leftX = useTransform(progress, [0.72, 0.795, 0.81], ["-85%", "3%", "0%"]);
  const rightX = useTransform(progress, [0.72, 0.795, 0.81], ["85%", "-3%", "0%"]);
  const leftRotate = useTransform(progress, [0.72, 0.81], [-9, 0]);
  const rightRotate = useTransform(progress, [0.72, 0.81], [9, 0]);
  const sparkOpacity = useTransform(progress, [0.787, 0.8, 0.825, 0.86], [0, 1, 1, 0]);
  const sparkScale = useTransform(progress, [0.787, 0.86], [0.3, 1.7]);
  return <div className="kn-clash-art">
    <svg className="kn-speed-lines" viewBox="0 0 1440 900" preserveAspectRatio="none" aria-hidden="true">{Array.from({ length: 28 }, (_, i) => { const angle = i * Math.PI / 14; return <path key={i} d={`M${720 + Math.cos(angle) * 340},${320 + Math.sin(angle) * 260} L${720 + Math.cos(angle) * 1200},${320 + Math.sin(angle) * 1200}`} />; })}</svg>
    <span className="kn-clash-ground" />
    <motion.img className="kn-fighter kn-fighter-hero" src={asset("hero-fighter")} alt="" width="1536" height="1024" style={still ? undefined : { x: leftX, rotate: leftRotate }} />
    <motion.img className="kn-fighter kn-fighter-enemy" src={asset("enemy-fighter")} alt="" width="1536" height="1024" style={still ? undefined : { x: rightX, rotate: rightRotate }} />
    <motion.svg className="kn-clash-spark" viewBox="0 0 100 100" aria-hidden="true" style={still ? undefined : { opacity: sparkOpacity, scale: sparkScale }}><path d="m50 0 7 37L86 14 63 43l37 7-37 7 23 29-29-23-7 37-7-37-29 23 23-29L0 50l37-7-23-29 29 23Z" fill="#f8f1df" /></motion.svg>
  </div>;
}

function ScrollStory() {
  const ref = useRef(null);
  const [chapter, setChapter] = useState(0);
  const { scrollYProgress: p } = useScroll({ target: ref, offset: ["start start", "end end"] });
  useMotionValueEvent(p, "change", (value) => {
    const next = value < 0.19 ? 0 : value < 0.37 ? 1 : value < 0.58 ? 2 : value < 0.72 ? 3 : 4;
    setChapter((current) => current === next ? current : next);
  });
  const hillScale = useTransform(p, [0, 0.19], [1, 3.8]);
  const hillPan = useTransform(p, [0, 0.19], [0, 1]);
  const hillOpacity = useTransform(p, [0.155, 0.205], [1, 0]);
  const titleOpacity = useTransform(p, [0, 0.075], [1, 0]);
  const titleY = useTransform(p, [0, 0.075], [0, -45]);
  const eyeOpacity = useTransform(p, [0.15, 0.19, 0.32, 0.37], [0, 1, 1, 0]);
  const eyeScale = useTransform(p, [0.19, 0.24, 0.35], [1, 1.3, 12]);
  const redClip = useTransform(p, [0.29, 0.37], ["circle(0% at 50% 50%)", "circle(110% at 50% 50%)"]);
  const enemyOpacity = useTransform(p, [0.37, 0.405, 0.57, 0.615], [0, 1, 1, 0]);
  const enemyScale = useTransform(p, [0.39, 0.59], [1, 1.17]);
  const glanceOpacity = useTransform(p, [0.56, 0.605, 0.70, 0.745], [0, 1, 1, 0]);
  const glanceX = useTransform(p, [0.56, 0.63], ["10%", "0%"]);
  const glanceScale = useTransform(p, [0.6, 0.72], [1, 1.12]);
  const insetClip = useTransform(p, [0.635, 0.665], ["inset(0% 100% 0% 0%)", "inset(0% 0% 0% 0%)"]);
  const clashOpacity = useTransform(p, [0.715, 0.75], [0, 1]);
  const endOpacity = useTransform(p, [0.91, 0.97], [0, 1]);
  const endY = useTransform(p, [0.91, 0.98], [40, 0]);
  const goTo = (index) => {
    const box = ref.current.getBoundingClientRect();
    window.scrollTo({ top: window.scrollY + box.top + (box.height - window.innerHeight) * chapters[index].progress, behavior: "smooth" });
  };
  return <section className="kn-story" id="story" ref={ref} aria-label="The first strike, an illustrated scroll story" data-chapter={chapters[chapter].name}>
    <ol className="motion-sr">{chapters.map((item) => <li key={item.name}>{item.text}</li>)}</ol>
    <div className="kn-stage">
      <motion.div className="kn-scene kn-hill" style={{ opacity: hillOpacity }}>
        <motion.img src={asset("hill")} alt="A dark-haired swordsman stands above a sprawling city, his pale scarf lifting in the wind." width="1672" height="941" fetchPriority="high" style={{ "--hill-scale": hillScale, "--hill-pan": hillPan }} />
        <motion.div style={{ opacity: titleOpacity, y: titleY }}><OpeningCopy /></motion.div>
        <motion.div className="kn-scroll-cue" style={{ opacity: titleOpacity }}><span>SCROLL TO ENTER THE STORY</span><span aria-hidden="true">↓</span></motion.div>
      </motion.div>
      <motion.div className="kn-scene kn-eye" style={{ opacity: eyeOpacity }} aria-hidden="true"><motion.img src={asset("eye")} alt="" width="1672" height="941" style={{ scale: eyeScale }} /><span className="kn-story-caption">SOMETHING<br />IN THE DISTANCE.</span></motion.div>
      <motion.div className="kn-scene kn-red" style={{ clipPath: redClip }} aria-hidden="true" />
      <motion.div className="kn-scene kn-enemy" style={{ opacity: enemyOpacity }} aria-hidden="true"><motion.img src={asset("enemy")} alt="" width="1672" height="941" style={{ scale: enemyScale }} /><span className="kn-story-caption">HE WASN’T<br />ALONE.</span></motion.div>
      <motion.div className="kn-scene kn-glance" style={{ opacity: glanceOpacity }} aria-hidden="true"><motion.img src={asset("glance")} alt="" width="1672" height="941" style={{ x: glanceX, scale: glanceScale }} /><motion.div className="kn-eye-inset" style={{ clipPath: insetClip }}><img src={asset("eye")} alt="" width="1672" height="941" /></motion.div><span className="kn-story-caption">ONE LOOK.<br />NO WORDS.</span></motion.div>
      <motion.div className="kn-scene kn-clash" style={{ opacity: clashOpacity }} aria-hidden="true"><ClashArt progress={p} /><span className="kn-clash-title">THE FIRST<br /><span>STRIKE.</span></span></motion.div>
      <motion.div className="kn-scene kn-story-end" style={{ opacity: endOpacity }} aria-hidden="true"><motion.div style={{ y: endY }}><p className="kn-eyebrow">THE STORY ENDS. YOURS BEGINS.</p><h2>CHOOSE<br />YOUR ELEMENT.</h2><div className="kn-end-elements">{blades.map((blade) => <span key={blade.id} style={{ "--element-color": blade.color }}><i />{blade.name}</span>)}</div><span className="kn-end-arrow">↓</span></motion.div></motion.div>
      <nav className="kn-chapters" aria-label="Story chapters">{chapters.map((item, index) => <button key={item.name} type="button" onClick={() => goTo(index)} aria-label={`Chapter ${index + 1}: ${item.name}`} aria-current={chapter === index ? "step" : undefined}><span aria-hidden="true">0{index + 1}</span></button>)}<span className="kn-chapter-name" aria-hidden="true">{chapters[chapter].name}</span></nav>
      <span className="kn-side-caption" aria-hidden="true">NINJA — THE FIRST STRIKE</span>
      <motion.div className="kn-story-progress" style={{ scaleX: p }} aria-hidden="true" />
    </div>
  </section>;
}

function StaticStory() {
  const ref = useRef(null);
  const { scrollYProgress } = useScroll({ target: ref });
  return <section className="kn-static-story" id="story" ref={ref} aria-label="The first strike, an illustrated story">
    <div className="kn-static-opening"><img src={asset("hill")} alt={chapters[0].text} width="1672" height="941" fetchPriority="high" /><OpeningCopy /></div>
    {["eye", "enemy", "glance"].map((name, index) => <figure className={`kn-static-panel kn-static-${name}`} key={name}><img src={asset(name)} alt={chapters[index + 1].text} width="1672" height="941" loading="lazy" /><figcaption><span>0{index + 2} / {chapters[index + 1].name}</span><p>{chapters[index + 1].text}</p></figcaption></figure>)}
    <figure className="kn-static-clash"><ClashArt progress={scrollYProgress} still /><figcaption><span className="kn-eyebrow">05 / THE CLASH</span><h2>THE FIRST STRIKE.</h2><p>{chapters[4].text}</p></figcaption></figure>
  </section>;
}

function Collection() {
  const enabled = useMotionEnabled();
  const [selected, setSelected] = useState(0);
  const [details, setDetails] = useState(false);
  const buttons = useRef([]);
  const blade = blades[selected];
  const choose = (index) => { setSelected(index); setDetails(false); };
  const navigate = (event, index) => {
    let next;
    if (event.key === "ArrowRight") next = (index + 1) % blades.length;
    if (event.key === "ArrowLeft") next = (index + blades.length - 1) % blades.length;
    if (event.key === "Home") next = 0;
    if (event.key === "End") next = blades.length - 1;
    if (next === undefined) return;
    event.preventDefault(); choose(next); buttons.current[next].focus();
  };
  const enquiry = `mailto:support@localninja.ca?subject=${encodeURIComponent(`Ninja ${blade.name} katana enquiry`)}&body=${encodeURIComponent(`Hi Ninja,\n\nI’m interested in the ${blade.name} katana. Please send me pricing, specifications, and availability.\n\nThank you!`)}`;
  return <section className="kn-collection" id="collection" aria-labelledby="kn-collection-title" style={{ "--element-color": blade.color, "--element-pale": blade.pale }}>
    <div className="kn-topline"><span>NINJA / THE ELEMENTAL COLLECTION</span><span>THREE BLADES. ONE BEGINNING.</span></div>
    <div className="kn-collection-heading"><h2 id="kn-collection-title">FIND YOUR<br /><span>NATURE.</span></h2><p>Three elements. Three expressions.<br />One that feels like you.</p></div>
    <div className="kn-element-tabs" role="tablist" aria-label="Choose your katana element">{blades.map((item, index) => <button key={item.id} type="button" role="tab" id={`kn-tab-${item.id}`} aria-selected={selected === index} aria-controls="kn-product" tabIndex={selected === index ? 0 : -1} ref={(node) => { buttons.current[index] = node; }} onClick={() => choose(index)} onKeyDown={(event) => navigate(event, index)} style={{ "--tab-color": item.color }}><span className="kn-tab-number">{item.number}</span><ElementMark id={item.id} /><span>{item.name}</span><span className="kn-tab-dot" aria-hidden="true" /></button>)}</div>
    <div id="kn-product" role="tabpanel" aria-labelledby={`kn-tab-${blade.id}`} tabIndex={0}>
      <div className="kn-product-stage">
        <span className="kn-product-index" aria-hidden="true">LN — {blade.number}<br />ELEMENTAL / KATANA</span>
        <span className="kn-product-ghost" aria-hidden="true">{blade.name}</span>
        <span className="kn-product-symbol" aria-hidden="true"><ElementMark id={blade.id} /></span>
        <AnimatePresence mode="wait" initial={false}><motion.img key={blade.id} className="kn-product-image" src={asset(blade.id)} alt={`${blade.finish} ${blade.name} katana with matching scabbard, ${blade.detail.toLowerCase()}.`} width="1800" height="600" loading="lazy" initial={{ opacity: 0, x: enabled ? 24 : 0 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: enabled ? -24 : 0 }} transition={{ duration: enabled ? 0.24 : 0 }} /></AnimatePresence>
        <span className="kn-product-note">{blade.note}</span>
      </div>
      <div className="kn-product-info" aria-live="polite" aria-atomic="true"><div><p className="kn-eyebrow">{blade.number} / THE {blade.name.toUpperCase()} KATANA</p><h3>{blade.line}</h3></div><p className="kn-product-description">{blade.description}</p><div className="kn-product-action"><a className="kn-enquire" href={enquiry}>Enquire about {blade.name} <Arrow diagonal /></a><span>Contact us for pricing & availability.</span></div></div>
      <button className="kn-detail-toggle" type="button" aria-expanded={details} aria-controls="kn-product-details" onClick={() => setDetails(!details)}>Explore the design <span aria-hidden="true">{details ? "−" : "+"}</span></button>
      <dl className="kn-product-details" id="kn-product-details" hidden={!details}><div><dt>Element</dt><dd>{blade.name}</dd></div><div><dt>Color</dt><dd>{blade.finish}</dd></div><div><dt>Design</dt><dd>{blade.detail}</dd></div><div><dt>Collection</dt><dd>Ninja Elemental</dd></div></dl>
    </div>
    <div className="kn-collection-bottom"><p>GREEN IS WIND. BLUE IS WATER. RED IS FIRE.</p><a href="#main">Replay the story <Arrow /></a></div>
  </section>;
}

export default function Ninja() {
  const enabled = useMotionEnabled();
  return <div className="kn-page"><header className="kn-header"><Brand /><p className="kn-header-note">THE FIRST STRIKE.<br />AN ELEMENTAL STORY.</p><a className="kn-shop-link" href="#collection">Shop the collection <Arrow diagonal /></a></header><main id="main">{enabled ? <ScrollStory /> : <StaticStory />}<Collection /></main><footer className="kn-footer"><div className="kn-footer-main"><Brand /><p>A moment of silence.<br />A story in steel.</p><a href="mailto:support@localninja.ca">Get in touch <Arrow diagonal /></a></div><div className="kn-footer-bottom"><span>NINJA / ORIGINAL DESIGN CONCEPT</span><a href="/work.html#work-ui">Explore all designs ↗</a></div></footer></div>;
}
