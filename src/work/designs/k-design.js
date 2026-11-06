const filterButtons = [...document.querySelectorAll("[data-form-filter]")];
const products = [...document.querySelectorAll("[data-form-category]")];
const count = document.querySelector(".form-count");

filterButtons.forEach((button) => {
  button.addEventListener("click", () => {
    filterButtons.forEach((item) =>
      item.setAttribute("aria-pressed", String(item === button)),
    );
    products.forEach((product) => {
      product.hidden =
        button.dataset.formFilter !== "all" &&
        product.dataset.formCategory !== button.dataset.formFilter;
    });
    const visibleCount = products.filter((product) => !product.hidden).length;
    count.textContent = `Showing ${visibleCount} object${visibleCount === 1 ? "" : "s"}`;
  });
});

const objectDetails = {
  lamp: {
    name: "Dome lamp",
    category: "OBJECT 01 / LIGHTING",
    description:
      "A generous curve, a quiet pool of light. Dome brings a little warmth to a bedside, a reading corner, or the last hour of your day.",
    material: "Powder-coated steel",
    dimensions: "Ø 32 × H 38 cm",
    color: "Tomato",
  },
  bowl: {
    name: "Daily bowl",
    category: "OBJECT 02 / LIVING",
    description:
      "For the fruit on your table and the things you set down when you come home. A softly glazed, generous bowl that makes a ritual of the ordinary.",
    material: "Glazed stoneware",
    dimensions: "Ø 26 × H 11 cm",
    color: "Oat",
  },
  stool: {
    name: "Pause stool",
    category: "OBJECT 03 / LIVING",
    description:
      "An extra seat. A place for a book. A companion to your favorite corner. Solid oak, softened edges, and a form that finds its place wherever you need it.",
    material: "Solid oak, oil finish",
    dimensions: "Ø 30 × H 42 cm",
    color: "Natural",
  },
};
const dialog = document.querySelector(".form-dialog");
document.querySelectorAll("[data-form-object]").forEach((button) => {
  button.addEventListener("click", () => {
    const key = button.dataset.formObject;
    const object = objectDetails[key];
    document.querySelector("#form-dialog-title").textContent = object.name;
    ["category", "description", "material", "dimensions", "color"].forEach(
      (field) => {
        document.querySelector(`#form-dialog-${field}`).textContent =
          object[field];
      },
    );
    dialog.querySelector("use").setAttribute("href", `#form-${key}`);
    dialog.showModal();
  });
});
dialog
  .querySelector(".form-dialog-close")
  .addEventListener("click", () => dialog.close());
dialog.addEventListener("click", (event) => {
  if (event.target === dialog) {
    const rect = dialog.getBoundingClientRect();
    if (
      event.clientX < rect.left ||
      event.clientX > rect.right ||
      event.clientY < rect.top ||
      event.clientY > rect.bottom
    )
      dialog.close();
  }
});
