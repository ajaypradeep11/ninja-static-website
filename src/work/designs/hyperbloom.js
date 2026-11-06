const palettes = {
  spring: {
    light: "#ffd1ee",
    mid: "#ff69b6",
    dark: "#e21d78",
    caption: "01 / Spring crush",
    description:
      "Sculptural pink, blue and orange flowers with folded petals, lime green leaves and a striped cobalt vase.",
  },
  summer: {
    light: "#fff6a2",
    mid: "#ffb14a",
    dark: "#ed5428",
    caption: "02 / Summer fever",
    description:
      "Sculptural golden orange, blue and tangerine flowers with folded petals, lime green leaves and a striped cobalt vase.",
  },
  twilight: {
    light: "#e8d3ff",
    mid: "#af8eea",
    dark: "#7045ba",
    caption: "03 / Twilight bloom",
    description:
      "Sculptural lavender, blue and orange flowers with folded petals, lime green leaves and a striped cobalt vase.",
  },
};

const art = document.querySelector(".botanical");
const caption = document.querySelector("#season-caption");
const description = document.querySelector("#sculpture-desc");
const swatches = document.querySelectorAll("[data-palette]");

swatches.forEach((button) => {
  button.addEventListener("click", () => {
    const name = button.dataset.palette;
    const palette = palettes[name];
    art.dataset.season = name;
    art.style.setProperty("--petal-light", palette.light);
    art.style.setProperty("--petal-mid", palette.mid);
    art.style.setProperty("--petal-dark", palette.dark);
    caption.textContent = palette.caption;
    description.textContent = palette.description;
    swatches.forEach((swatch) =>
      swatch.setAttribute("aria-pressed", String(swatch === button)),
    );
  });
});
