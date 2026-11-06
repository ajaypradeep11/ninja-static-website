const styles = [
  ["acidwave", "Acidwave"],
  ["y2k-futurism", "Y2K Futurism"],
  ["k-design", "K-Design"],
  ["dreamscape", "Dreamscape"],
  ["halftone", "Halftone"],
  ["hyperbloom", "Hyperbloom"],
  ["neo-brutalism", "Neo-brutalism"],
  ["neo-swiss", "Neo-Swiss"],
  ["synthwave", "Synthwave"],
  ["vector-surrealism", "Vector-surrealism"],
];
const current = styles.findIndex(
  ([slug]) => slug === document.body.dataset.design,
);
if (current !== -1) {
  const toolbar = document.createElement("nav");
  toolbar.className = "lab-toolbar";
  toolbar.setAttribute("aria-label", "Design Lab navigation");
  const next = styles[(current + 1) % styles.length];
  toolbar.innerHTML = `<a href="/work.html#work-ui">← All designs</a>
    <label><span class="lab-sr-only">Explore a design style</span>
    <select>${styles.map(([slug, name], i) => `<option value="${slug}"${i === current ? " selected" : ""}>${String(i + 1).padStart(2, "0")} · ${name}</option>`).join("")}</select></label>
    <a class="lab-next" href="/work/designs/${next[0]}.html" aria-label="Next design: ${next[1]}">→</a>`;
  toolbar.querySelector("select").addEventListener("change", (event) => {
    location.href = `/work/designs/${event.target.value}.html`;
  });
  document.body.append(toolbar);
  const main = document.querySelector("main");
  if (main && !document.querySelector('a[class$="-skip"], .skip-link')) {
    main.id ||= "design-main";
    const skip = document.createElement("a");
    skip.className = "lab-skip";
    skip.href = `#${main.id}`;
    skip.textContent = "Skip to content";
    document.body.prepend(skip);
  }
}
