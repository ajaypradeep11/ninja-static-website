const worlds = {
  dusk: {
    number: "01 / 03",
    name: "The lavender hour",
    location: "Somewhere outside of time",
    description:
      "A lavender arch opens onto a peach sun above a quiet blue sea, with floating spheres and sculptural steps.",
  },
  tide: {
    number: "02 / 03",
    name: "A softer horizon",
    location: "Where the tide carries your thoughts",
    description:
      "A pale green arch opens onto a golden sun above a tranquil turquoise sea, with floating spheres and sculptural steps.",
  },
  rose: {
    number: "03 / 03",
    name: "The waking dream",
    location: "At the edge of the impossible",
    description:
      "A rose arch opens onto a cream sun above a lilac sea, with floating spheres and sculptural steps.",
  },
};

document.querySelectorAll("[data-world-choice]").forEach((button) => {
  button.addEventListener("click", () => {
    const choice = button.dataset.worldChoice;
    const world = worlds[choice];
    if (!world) return;
    document.body.dataset.world = choice;
    document.querySelectorAll("[data-world-choice]").forEach((option) => {
      const selected = option === button;
      option.classList.toggle("is-active", selected);
      option.setAttribute("aria-pressed", String(selected));
    });
    document.querySelector("#world-number").textContent = world.number;
    document.querySelector("#world-name").textContent = world.name;
    document.querySelector("#world-location").textContent = world.location;
    document
      .querySelector(".dream-world")
      .setAttribute("aria-label", world.description);
    document.querySelector(".world-status").textContent =
      `${world.name} is your new view. Follow “Return to your view” to step inside.`;
  });
});
