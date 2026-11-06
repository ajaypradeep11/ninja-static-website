document.querySelectorAll(".design-lab").forEach((lab) => {
  const cards = [...lab.querySelectorAll("[data-design-card]")];
  const filters = [...lab.querySelectorAll("[data-mood-filter]")];
  const search = lab.querySelector('input[type="search"]');
  const count = lab.querySelector("[data-design-count]");
  let mood = "all";
  lab.querySelector(".design-lab-tools").hidden = false;
  const filter = () => {
    const query = search.value.trim().toLowerCase();
    let visible = 0;
    cards.forEach((card) => {
      card.hidden =
        !(mood === "all" || card.dataset.mood === mood) ||
        !card.dataset.name.includes(query);
      if (!card.hidden) visible++;
    });
    count.textContent = `${visible} ${visible === 1 ? "design" : "designs"}`;
    lab.querySelector(".design-empty").hidden = visible > 0;
    filters.forEach((button) =>
      button.setAttribute(
        "aria-pressed",
        String(button.dataset.moodFilter === mood),
      ),
    );
  };
  filters.forEach((button) =>
    button.addEventListener("click", () => {
      mood = button.dataset.moodFilter;
      filter();
    }),
  );
  search.addEventListener("input", filter);
  lab.querySelector("[data-design-reset]").addEventListener("click", () => {
    mood = "all";
    search.value = "";
    filter();
    search.focus();
  });
});
