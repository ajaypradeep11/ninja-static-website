const world = document.querySelector("[data-vs-world]");
const paletteButtons = document.querySelectorAll("[data-vs-palette]");
paletteButtons.forEach((button) => {
  button.addEventListener("click", () => {
    world.dataset.palette = button.dataset.vsPalette;
    paletteButtons.forEach((option) =>
      option.setAttribute("aria-pressed", String(option === button)),
    );
    document.querySelector("[data-vs-status]").textContent =
      `${button.textContent.trim()} palette selected.`;
  });
});

const projects = {
  odd: {
    title: "Odd Company",
    type: "IDENTITY & STRATEGY",
    description:
      "An identity for a fictional collective of unconventional thinkers. A modular staircase, unexpected proportions, and a generous helping of cobalt turn a familiar architectural language into something delightfully unfamiliar.",
  },
  day: {
    title: "Day Off",
    type: "PACKAGING & ILLUSTRATION",
    description:
      "A fictional botanical brand that makes room for a slower kind of day. Playful plants and impossible flowers become a flexible illustration system, with terracotta, sage, and lilac giving each imaginary product its own personality.",
  },
  portal: {
    title: "Portal",
    type: "DIGITAL EXPERIENCE",
    description:
      "A concept for a digital exhibition where every doorway leads to another perspective. Flat architectural shapes, curious little symbols, and color-led navigation make exploration the heart of the experience.",
  },
};
const dialog = document.querySelector("[data-vs-dialog]");
document.querySelectorAll("[data-vs-project]").forEach((button) => {
  button.addEventListener("click", () => {
    const project = projects[button.dataset.vsProject];
    document.querySelector("#vs-dialog-title").textContent = project.title;
    dialog.querySelector("[data-vs-dialog-type]").textContent = project.type;
    dialog.querySelector("[data-vs-dialog-description]").textContent =
      project.description;
    dialog
      .querySelector("[data-vs-dialog-art]")
      .replaceChildren(button.querySelector("svg").cloneNode(true));
    dialog.showModal();
  });
});
dialog
  .querySelector("[data-vs-close]")
  .addEventListener("click", () => dialog.close());
dialog.addEventListener("click", (event) => {
  const bounds = dialog.getBoundingClientRect();
  if (
    event.clientX < bounds.left ||
    event.clientX > bounds.right ||
    event.clientY < bounds.top ||
    event.clientY > bounds.bottom
  )
    dialog.close();
});
