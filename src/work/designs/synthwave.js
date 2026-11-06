const stations = {
  night: {
    name: "Midnight run",
    frequency: "88.4 FM",
    description: "A pink horizon for the road ahead.",
  },
  coast: {
    name: "Pacific horizon",
    frequency: "96.2 FM",
    description: "A golden sunset along the coastline.",
  },
  after: {
    name: "After hours",
    frequency: "104.8 FM",
    description: "A violet sky for the last lights of the city.",
  },
};

document.querySelectorAll("[data-select-station]").forEach((button) => {
  button.addEventListener("click", () => {
    const id = button.dataset.selectStation;
    const station = stations[id];
    document.body.dataset.station = id;
    document.querySelector("[data-station-name]").textContent = station.name;
    document.querySelector("[data-frequency]").textContent = station.frequency;
    document.querySelector("[data-station-status]").textContent =
      `${station.name} selected. ${station.description} Visual station preview.`;
    document.querySelectorAll("[data-select-station]").forEach((preset) => {
      preset.setAttribute(
        "aria-pressed",
        String(preset.dataset.selectStation === id),
      );
    });
  });
});
