import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import Scene from "./Scene.jsx";
import { useMotionEnabled } from "./runtime.jsx";
import "./shelf.css";

const BOOKS = [
  {
    title: "The Shape of Letters",
    short: ["THE SHAPE", "OF LETTERS"],
    author: "Mira Okada",
    category: "Type",
    year: "2021",
    pages: 248,
    color: "#e7dfc9",
    ink: "#2d4031",
    height: 1.98,
    motif: "type",
    description:
      "A love letter to the space between letters. An exploration of the shapes, rhythms, and happy accidents that turn language into something we can see.",
  },
  {
    title: "Objects, Almost",
    short: ["OBJECTS,", "ALMOST."],
    author: "Studio Common",
    category: "Form",
    year: "2023",
    pages: 192,
    color: "#294638",
    ink: "#f1eddf",
    height: 2.2,
    motif: "circle",
    description:
      "Ordinary things, looked at for an extraordinary amount of time. A quiet collection of objects that sit somewhere between useful and beautiful.",
  },
  {
    title: "A Very Good Red",
    short: ["A VERY", "GOOD RED"],
    author: "June Palmer",
    category: "Color",
    year: "2024",
    pages: 160,
    color: "#dd4937",
    ink: "#f9e9cc",
    height: 1.86,
    motif: "square",
    description:
      "One color. A thousand associations. From painted doorways to the first mark on a blank page, a small study in the power of paying attention.",
  },
  {
    title: "Ways of Seeing Green",
    short: ["WAYS OF", "SEEING", "GREEN"],
    author: "Ada & Ellis",
    category: "Color",
    year: "2025",
    pages: 224,
    color: "#b4bd8b",
    ink: "#263d2c",
    height: 2.12,
    motif: "arch",
    description:
      "Beyond a color, into a way of looking. Field notes on nature, architecture, and all the surprising places we find a little room to grow.",
  },
  {
    title: "Between the Lines",
    short: ["BETWEEN", "THE LINES"],
    author: "Otto Weber",
    category: "Type",
    year: "2022",
    pages: 288,
    color: "#f0ece2",
    ink: "#252c27",
    height: 2.27,
    motif: "lines",
    description:
      "The margin is never empty. A considered collection of typographic experiments, where the pauses have as much to say as the words.",
  },
  {
    title: "Soft Structures",
    short: ["SOFT", "STRUCTURES"],
    author: "Lina Moreau",
    category: "Form",
    year: "2024",
    pages: 176,
    color: "#dba891",
    ink: "#422d2c",
    height: 1.94,
    motif: "soft",
    description:
      "What happens when a straight line changes its mind? A playful survey of organic form, handmade structures, and the beauty of a gentle curve.",
  },
  {
    title: "Nothing Is Neutral",
    short: ["NOTHING", "IS NEUTRAL"],
    author: "Field Work Press",
    category: "Color",
    year: "2025",
    pages: 208,
    color: "#e4bd4b",
    ink: "#34332a",
    height: 2.08,
    motif: "grid",
    description:
      "An invitation to notice the choices hiding in plain sight. Color studies and conversations about the way a palette can change everything.",
  },
];

function canvasTexture(THREE, width, height, draw) {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  draw(canvas.getContext("2d"), width, height);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  return texture;
}

function coverTexture(THREE, book, index) {
  return canvasTexture(THREE, 768, 1152, (ctx, w, h) => {
    ctx.fillStyle = book.color;
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = book.ink;
    ctx.strokeStyle = book.ink;
    ctx.font = "500 19px Arial";
    ctx.fillText("SHELF LIFE — INDEPENDENT EDITIONS", 48, 56);
    ctx.fillRect(48, 77, w - 96, 2);
    ctx.font = "bold 81px Arial";
    book.short.forEach((line, i) => ctx.fillText(line, 43, 178 + i * 85));
    const start = book.short.length === 3 ? 450 : 350;
    ctx.save();
    ctx.translate(w / 2, start + 225);
    if (book.motif === "arch") {
      ctx.lineWidth = 15;
      for (let i = 0; i < 9; i++) {
        ctx.beginPath();
        ctx.arc(0, 90, 235 - i * 22, Math.PI, 0);
        ctx.lineTo(235 - i * 22, 220);
        ctx.stroke();
      }
      ctx.fillRect(-242, 200, 484, 15);
    } else if (book.motif === "type") {
      ctx.font = "bold 450px Georgia";
      ctx.textAlign = "center";
      ctx.fillText("a", 0, 135);
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(-280, 135);
      ctx.lineTo(280, 135);
      ctx.moveTo(-280, -166);
      ctx.lineTo(280, -166);
      ctx.stroke();
    } else if (book.motif === "circle") {
      for (let i = 0; i < 4; i++) {
        ctx.beginPath();
        ctx.arc(
          (i % 2) * 220 - 110,
          Math.floor(i / 2) * 220 - 110,
          105,
          0,
          Math.PI * 2,
        );
        ctx.fill();
      }
      ctx.fillStyle = book.color;
      ctx.fillRect(-24, -250, 48, 500);
      ctx.fillRect(-250, -24, 500, 48);
    } else if (book.motif === "square") {
      for (let i = 0; i < 7; i++) {
        ctx.save();
        ctx.rotate(i * 0.07);
        ctx.strokeRect(
          -240 + i * 24,
          -240 + i * 24,
          480 - i * 48,
          480 - i * 48,
        );
        ctx.restore();
      }
      ctx.lineWidth = 7;
      ctx.strokeRect(-240, -240, 480, 480);
    } else if (book.motif === "lines") {
      ctx.lineWidth = 9;
      for (let i = 0; i < 18; i++) {
        ctx.beginPath();
        ctx.moveTo(-270, -230 + i * 27);
        ctx.bezierCurveTo(
          -80,
          -300 + i * 25,
          75,
          0 + i * 20,
          270,
          -230 + i * 27,
        );
        ctx.stroke();
      }
    } else if (book.motif === "soft") {
      ctx.beginPath();
      ctx.moveTo(-200, 170);
      ctx.bezierCurveTo(-360, -180, 60, -330, 185, -170);
      ctx.bezierCurveTo(370, 70, -30, 350, -200, 170);
      ctx.fill();
      ctx.fillStyle = book.color;
      ctx.beginPath();
      ctx.ellipse(0, 10, 65, 110, 0.8, 0, Math.PI * 2);
      ctx.fill();
    } else {
      for (let y = 0; y < 5; y++)
        for (let x = 0; x < 5; x++) {
          ctx.save();
          ctx.translate(-210 + x * 105, -210 + y * 105);
          ctx.rotate(((x + y) * Math.PI) / 8);
          ctx.fillRect(-40, -40, 80, 80);
          ctx.restore();
        }
    }
    ctx.restore();
    ctx.fillStyle = book.ink;
    ctx.fillRect(48, 1032, w - 96, 2);
    ctx.font = "500 25px Arial";
    ctx.fillText(book.author.toUpperCase(), 48, 1080);
    ctx.font = "19px Arial";
    ctx.fillText(`SL / 00${index + 1}`, 48, 1120);
    ctx.textAlign = "right";
    ctx.fillText(book.year, w - 48, 1120);
    // Subtle deterministic paper fibres remain visible at close range.
    for (let i = 0; i < 3500; i++) {
      ctx.fillStyle = i % 2 ? "rgba(255,255,255,.035)" : "rgba(0,0,0,.025)";
      ctx.fillRect((i * 197) % w, (i * 313) % h, 2, 1);
    }
  });
}

function buildShelf({ THREE, scene, camera }) {
  camera.position.set(0, 0.55, 7.3);
  camera.lookAt(0, 0.07, 0);
  const library = new THREE.Group();
  scene.add(library);
  const paper = canvasTexture(THREE, 64, 1024, (ctx, w, h) => {
    ctx.fillStyle = "#f5f0df";
    ctx.fillRect(0, 0, w, h);
    for (let y = 3; y < h; y += 7) {
      ctx.fillStyle = y % 3 ? "#d7d1c1" : "#e3ddcd";
      ctx.fillRect(0, y, w, 1);
    }
  });
  const shadow = canvasTexture(THREE, 256, 256, (ctx, w, h) => {
    const g = ctx.createRadialGradient(w / 2, h / 2, 5, w / 2, h / 2, w / 2);
    g.addColorStop(0, "rgba(45,47,32,.35)");
    g.addColorStop(0.45, "rgba(45,47,32,.15)");
    g.addColorStop(1, "rgba(45,47,32,0)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
  });
  const entries = BOOKS.map((book, i) => {
    const front = coverTexture(THREE, book, i);
    const spine = canvasTexture(THREE, 160, 1024, (ctx, w, h) => {
      ctx.fillStyle = book.color;
      ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = book.ink;
      ctx.fillRect(19, 51, 122, 3);
      ctx.font = "bold 31px Arial";
      ctx.textAlign = "center";
      ctx.fillText(`0${i + 1}`, w / 2, 112);
      ctx.save();
      ctx.translate(85, 164);
      ctx.rotate(Math.PI / 2);
      ctx.textAlign = "left";
      ctx.font = "bold 38px Arial";
      ctx.fillText(book.title.toUpperCase(), 0, 0, 670);
      ctx.restore();
      ctx.fillRect(19, 902, 122, 3);
      ctx.font = "bold 25px Arial";
      ctx.fillText("SL", w / 2, 958);
    });
    const plain = new THREE.MeshStandardMaterial({
      color: book.color,
      roughness: 0.88,
    });
    const pageMaterial = new THREE.MeshStandardMaterial({
      map: paper,
      roughness: 0.95,
    });
    const spineMaterial = new THREE.MeshBasicMaterial({
      map: spine,
      toneMapped: false,
    });
    const frontMaterial = new THREE.MeshBasicMaterial({
      map: front,
      toneMapped: false,
    });
    const body = new THREE.Mesh(
      new THREE.BoxGeometry(1.17, book.height, 0.27),
      [
        pageMaterial,
        spineMaterial,
        pageMaterial,
        pageMaterial,
        frontMaterial,
        plain,
      ],
    );
    const group = new THREE.Group();
    group.add(body);
    // Hardcover overhang catches the studio light along the edges.
    for (const z of [-0.146, 0.146]) {
      const cover = new THREE.Mesh(
        new THREE.BoxGeometry(1.2, book.height + 0.035, 0.022),
        [plain, plain, plain, plain, z > 0 ? frontMaterial : plain, plain],
      );
      cover.position.z = z;
      group.add(cover);
    }
    group.position.set((i - 3) * 0.39, book.height / 2 - 1.12, 0);
    group.rotation.y = Math.PI / 2;
    library.add(group);
    const contact = new THREE.Mesh(
      new THREE.PlaneGeometry(1.75, 0.9),
      new THREE.MeshBasicMaterial({
        map: shadow,
        transparent: true,
        depthWrite: false,
      }),
    );
    contact.rotation.x = -Math.PI / 2;
    contact.position.y = -1.15;
    library.add(contact);
    return { group, contact };
  });
  let initialized = false;
  return {
    update({ delta, pointer, settings, reducedMotion }) {
      const selected = settings.selected ?? 3;
      const available = settings.available ?? BOOKS.map((_, i) => i);
      const position = available.indexOf(selected);
      const compact = camera.aspect < 1.05;
      const ease =
        reducedMotion || !initialized
          ? 1
          : 1 - Math.exp(-Math.max(delta, 0.001) * 7);
      entries.forEach(({ group, contact }, i) => {
        const at = available.indexOf(i);
        const distance = at - position;
        const shown = at >= 0 && (!compact || Math.abs(distance) <= 2);
        group.visible = shown;
        contact.visible = shown;
        const selectedBook = i === selected;
        const x =
          distance * (compact ? 0.4 : 0.7) +
          (distance === 0 ? 0 : Math.sign(distance) * 0.5);
        const y = BOOKS[i].height / 2 - 1.12 + (selectedBook ? 0.035 : 0);
        const z = selectedBook ? 0.52 : 0;
        group.position.x += (x - group.position.x) * ease;
        group.position.y += (y - group.position.y) * ease;
        group.position.z += (z - group.position.z) * ease;
        const angle = selectedBook ? -0.18 : Math.PI / 2 - 0.05;
        group.rotation.y += (angle - group.rotation.y) * ease;
        contact.position.x = group.position.x;
        contact.position.z = group.position.z;
        contact.scale.x = selectedBook ? 1 : 0.48;
      });
      const maxDistance = Math.max(position, available.length - 1 - position);
      const width = compact ? 3.35 : Math.max(6.4, maxDistance * 1.4 + 2.2);
      const neededZ =
        width /
        (2 * Math.tan(THREE.MathUtils.degToRad(35) / 2) * camera.aspect);
      camera.position.z = Math.max(compact ? 5.3 : 4.3, neededZ);
      library.rotation.y +=
        ((reducedMotion ? 0 : pointer.x * 0.045) - library.rotation.y) * ease;
      initialized = true;
    },
  };
}

export default function Shelf() {
  const enabled = useMotionEnabled();
  const [category, setCategory] = useState("All");
  const [selected, setSelected] = useState(3);
  const [saved, setSaved] = useState([]);
  const available = BOOKS.map((book, index) => ({ book, index }))
    .filter(({ book }) => category === "All" || book.category === category)
    .map(({ index }) => index);
  const book = BOOKS[selected];
  const changeCategory = (value) => {
    setCategory(value);
    if (value !== "All" && book.category !== value)
      setSelected(BOOKS.findIndex((b) => b.category === value));
  };
  const step = (direction) =>
    setSelected(
      available[
        (available.indexOf(selected) + direction + available.length) %
          available.length
      ],
    );
  const reveal = {
    initial: enabled ? { opacity: 0, y: 18 } : false,
    whileInView: { opacity: 1, y: 0 },
    viewport: { once: true },
    transition: { duration: 0.65 },
  };
  return (
    <div className="shelf-page">
      <header className="shelf-header">
        <a className="shelf-wordmark" href="#main" aria-label="Shelf Life home">
          <span className="shelf-mark" aria-hidden="true">
            <i />
            <i />
            <i />
          </span>
          SHELF LIFE<span className="shelf-wordmark-dot">®</span>
        </a>
        <span className="shelf-header-note">
          A considered collection.
          <br />
          For the endlessly curious.
        </span>
        <a className="shelf-index-link" href="#shelf-index">
          The index <span>↗</span>
        </a>
      </header>
      <main id="main">
        <section className="shelf-collection" aria-labelledby="shelf-heading">
          <div className="shelf-intro">
            <motion.div {...reveal}>
              <span className="shelf-eyebrow">
                INDEPENDENT BOOKS. LASTING IDEAS.
              </span>
              <h1 id="shelf-heading">
                Good things
                <br />
                have <em>spines.</em>
              </h1>
            </motion.div>
            <motion.p {...reveal} transition={{ delay: 0.12, duration: 0.65 }}>
              A small shelf of big ideas.
              <br />
              Pull up a title. Stay for a while.
            </motion.p>
          </div>
          <div className="shelf-collection-top">
            <span className="shelf-eyebrow">
              THE COLLECTION{" "}
              <b>({String(available.length).padStart(2, "0")})</b>
            </span>
            <div className="shelf-filters" aria-label="Filter books by subject">
              {["All", "Type", "Form", "Color"].map((c) => (
                <button
                  key={c}
                  type="button"
                  aria-pressed={category === c}
                  onClick={() => changeCategory(c)}
                >
                  {c}
                </button>
              ))}
            </div>
            <span className="shelf-est">EST. 2021 / VOL. 01</span>
          </div>
          <div className="shelf-stage">
            <div className="shelf-stage-rule" />
            <span className="shelf-stage-caption">
              A LITTLE ANALOG
              <br />
              IN A DIGITAL WORLD.
            </span>
            <Scene
              build={buildShelf}
              settings={{ selected, available }}
              label={`Seven printed books. Selected: ${book.title}. Use the collection controls to browse.`}
              className="shelf-canvas"
            />
            <span className="shelf-stage-number" aria-hidden="true">
              {String(selected + 1).padStart(2, "0")}
              <span>/{String(BOOKS.length).padStart(2, "0")}</span>
            </span>
          </div>
          <div className="shelf-book-details">
            <div className="shelf-arrows">
              <button
                onClick={() => step(-1)}
                type="button"
                aria-label="Previous book"
              >
                ←
              </button>
              <button
                onClick={() => step(1)}
                type="button"
                aria-label="Next book"
              >
                →
              </button>
              <span>
                {String(available.indexOf(selected) + 1).padStart(2, "0")} —{" "}
                {String(available.length).padStart(2, "0")}
              </span>
            </div>
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={selected}
                className="shelf-selected"
                initial={enabled ? { opacity: 0, y: 9 } : false}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: enabled ? -9 : 0 }}
                transition={{ duration: 0.2 }}
                aria-live="polite"
              >
                <div>
                  <span className="shelf-eyebrow">
                    {book.category} / {book.year}
                  </span>
                  <h2>{book.title}</h2>
                  <span className="shelf-author">
                    By {book.author} · {book.pages} pages
                  </span>
                </div>
                <p>{book.description}</p>
              </motion.div>
            </AnimatePresence>
            <button
              className="shelf-save"
              type="button"
              onClick={() =>
                setSaved((items) =>
                  items.includes(selected)
                    ? items.filter((i) => i !== selected)
                    : [...items, selected],
                )
              }
              aria-pressed={saved.includes(selected)}
            >
              <span>{saved.includes(selected) ? "✓" : "+"}</span>
              {saved.includes(selected)
                ? "On your reading list"
                : "Add to reading list"}
            </button>
          </div>
        </section>
        <section
          id="shelf-index"
          className="shelf-index"
          aria-labelledby="shelf-index-heading"
        >
          <motion.div className="shelf-index-intro" {...reveal}>
            <span className="shelf-eyebrow">01 / AN OPEN INVITATION</span>
            <h2 id="shelf-index-heading">
              Less scrolling.
              <br />
              <em>More turning pages.</em>
            </h2>
            <p>
              We believe the best ideas deserve a place in the real world. These
              are the books we come back to. The ones with folded corners, full
              margins, and a little life in them.
            </p>
            <span className="shelf-reading-count" aria-live="polite">
              Your reading list: {saved.length}{" "}
              {saved.length === 1 ? "book" : "books"}
            </span>
          </motion.div>
          <div className="shelf-catalog">
            <div className="shelf-catalog-head">
              <span>THE COMPLETE INDEX</span>
              <span>7 INDEPENDENT EDITIONS</span>
            </div>
            {BOOKS.map((item, i) => (
              <a
                key={item.title}
                href="#shelf-heading"
                className={`shelf-catalog-row ${selected === i ? "is-selected" : ""}`}
                onClick={() => {
                  setCategory("All");
                  setSelected(i);
                }}
                aria-label={`View ${item.title}`}
              >
                <span className="shelf-catalog-number">0{i + 1}</span>
                <span
                  className="shelf-catalog-chip"
                  style={{ background: item.color }}
                />
                <span className="shelf-catalog-title">
                  {item.title}
                  <small>{item.author}</small>
                </span>
                <span className="shelf-catalog-category">{item.category}</span>
                <span aria-hidden="true">{saved.includes(i) ? "✓" : "↗"}</span>
              </a>
            ))}
          </div>
        </section>
      </main>
      <footer className="shelf-footer">
        <span>SHELF LIFE®</span>
        <span>Objects to keep. Ideas to carry.</span>
        <a href="#main">Back to the shelf ↑</a>
      </footer>
    </div>
  );
}
