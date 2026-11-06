const projects = {
  forma: {
    title: "Forma",
    category: "Brand identity / 2026",
    description:
      "Architecture begins with the way people live. We shaped a warm, precise identity for a practice that puts human experience at the center of every space.",
    services: "Brand strategy, visual identity, editorial system",
    approach:
      "A simple geometric mark and a flexible typographic grid bring the same clarity to a building sign and a project monograph.",
  },
  open: {
    title: "Open Archive",
    category: "Digital experience / 2026",
    description:
      "A cultural collection is only useful when people can find their own way into it. Open Archive makes discovery intuitive, inviting, and open to everyone.",
    services: "Content strategy, interface design, design system",
    approach:
      "Generous typography, clear indexing, and purposeful navigation turn a complex collection into an approachable digital resource.",
  },
  punkt: {
    title: "Punkt",
    category: "Strategy & identity / 2025",
    description:
      "Everyday objects deserve a thoughtful point of view. Punkt is a design label built around fewer, better things and the small details that make them matter.",
    services: "Positioning, naming, visual identity, packaging",
    approach:
      "One confident color, one graphic point, and a direct voice create an identity that makes room for the objects themselves.",
  },
  common: {
    title: "Common Ground",
    category: "Web design / 2024",
    description:
      "Good ideas grow through conversation. We imagined a welcoming digital home for an independent space connecting people, local culture, and new perspectives.",
    services: "Digital strategy, website design, art direction",
    approach:
      "An open grid and an earthy palette create a useful, flexible framework for an evolving calendar of conversations and events.",
  },
};

const rows = [...document.querySelectorAll("[data-project]")];
const filters = [...document.querySelectorAll("[data-filter]")];
const count = document.querySelector("#project-count");
filters.forEach((button) =>
  button.addEventListener("click", () => {
    const selected = button.dataset.filter;
    filters.forEach((item) =>
      item.setAttribute("aria-pressed", String(item === button)),
    );
    rows.forEach((row) => {
      row.hidden = selected !== "all" && row.dataset.category !== selected;
    });
    count.textContent = `${String(rows.filter((row) => !row.hidden).length).padStart(2, "0")} projects / 2024—2026`;
  }),
);

const dialog = document.querySelector(".project-dialog");
rows.forEach((row) =>
  row.addEventListener("click", () => {
    const project = projects[row.dataset.project];
    document.querySelector("#dialog-title").textContent = project.title;
    dialog.querySelector(".dialog-category").textContent = project.category;
    dialog.querySelector(".dialog-description").textContent =
      project.description;
    dialog.querySelector(".dialog-services").textContent = project.services;
    dialog.querySelector(".dialog-approach").textContent = project.approach;
    const preview = row.querySelector(".project-art");
    const artwork = dialog.querySelector(".dialog-art");
    artwork.className = `dialog-art art-${row.dataset.project}`;
    artwork.replaceChildren(
      ...[...preview.childNodes].map((node) => node.cloneNode(true)),
    );
    dialog.showModal();
  }),
);
dialog
  .querySelector(".dialog-close")
  .addEventListener("click", () => dialog.close());
dialog.addEventListener("click", (event) => {
  if (event.target !== dialog) return;
  const bounds = dialog.getBoundingClientRect();
  if (
    event.clientX < bounds.left ||
    event.clientX > bounds.right ||
    event.clientY < bounds.top ||
    event.clientY > bounds.bottom
  )
    dialog.close();
});
