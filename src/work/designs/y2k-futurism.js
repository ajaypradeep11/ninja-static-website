const device = document.querySelector(".orbit-device");
const finishes = {
  ice: { name: "Ice blue", description: "Cool, calm, light-years away." },
  lilac: { name: "Cosmic lilac", description: "Soft focus. Cosmic energy." },
  lime: {
    name: "Digital lime",
    description: "A bright little world of your own.",
  },
};

document.querySelectorAll(".finish-option").forEach((button) => {
  button.addEventListener("click", () => {
    const finish = finishes[button.dataset.finish];
    device.dataset.finish = button.dataset.finish;
    document.querySelectorAll(".finish-option").forEach((option) => {
      const selected = option === button;
      option.classList.toggle("is-selected", selected);
      option.setAttribute("aria-pressed", String(selected));
    });
    document.querySelector("#device-title").textContent =
      `Orbit O–01 in ${finish.name}`;
    document.querySelector("#device-description").textContent =
      `A sculpted silver and translucent ${finish.name.toLowerCase()} digital music player, with a luminous display and a circular chrome control wheel.`;
    document.querySelector(".finish-feedback").textContent =
      `${finish.name} selected. ${finish.description}`;
  });
});

const tracks = [
  { title: "Moonwalk", artist: "Lunar FM" },
  { title: "Blue hour", artist: "Soft Signal" },
  { title: "Afterglow.exe", artist: "Angel Cache" },
];
let selectedTrack = 0;

function selectTrack(index) {
  selectedTrack = (index + tracks.length) % tracks.length;
  const track = tracks[selectedTrack];
  document.querySelector("#device-track").textContent = track.title;
  document.querySelector("#device-artist").textContent =
    track.artist.toUpperCase();
  document.querySelectorAll(".track").forEach((button) => {
    const selected = Number(button.dataset.track) === selectedTrack;
    button.classList.toggle("is-active", selected);
    button.setAttribute("aria-pressed", String(selected));
  });
  document.querySelector(".track-feedback").textContent =
    `On the player: ${track.title} by ${track.artist}.`;
}

document.querySelectorAll(".track").forEach((button) => {
  button.addEventListener("click", () =>
    selectTrack(Number(button.dataset.track)),
  );
});
document
  .querySelector(".device-previous")
  .addEventListener("click", () => selectTrack(selectedTrack - 1));
document
  .querySelector(".device-next")
  .addEventListener("click", () => selectTrack(selectedTrack + 1));
document
  .querySelector(".device-visualizer")
  .addEventListener("click", (event) => {
    const active = device.classList.toggle("is-visualizing");
    event.currentTarget.setAttribute("aria-pressed", String(active));
    event.currentTarget.setAttribute(
      "aria-label",
      active ? "Stop visualizer preview" : "Start visualizer preview",
    );
  });
