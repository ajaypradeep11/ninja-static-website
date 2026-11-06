const filters = document.querySelectorAll("[data-acid-filter]");
const cards = document.querySelectorAll("[data-frequency]");
const status = document.querySelector("[data-filter-status]");

filters.forEach((button) => {
  button.addEventListener("click", () => {
    const selected = button.dataset.acidFilter;
    let visible = 0;
    filters.forEach((filter) =>
      filter.setAttribute("aria-pressed", String(filter === button)),
    );
    cards.forEach((card) => {
      card.hidden = selected !== "all" && card.dataset.frequency !== selected;
      if (!card.hidden) visible += 1;
    });
    status.textContent = `Showing ${visible} ${selected === "all" ? "" : button.textContent.toLowerCase() + " "}frequenc${visible === 1 ? "y" : "ies"}.`;
  });
});

document.querySelectorAll(".frequency-card a").forEach((link) => {
  link.addEventListener("click", () => {
    const session = document.querySelector(link.getAttribute("href"));
    if (session instanceof HTMLDetailsElement) session.open = true;
  });
});
