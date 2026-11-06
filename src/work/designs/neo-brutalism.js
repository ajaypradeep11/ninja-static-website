const typeButtons = [...document.querySelectorAll("[data-event-type]")];
const daySelect = document.querySelector("#gc-day");
const events = [...document.querySelectorAll(".gc-event")];
let selectedType = "all";

function filterEvents() {
  let visible = 0;
  events.forEach((event) => {
    const matchesType =
      selectedType === "all" || event.dataset.type === selectedType;
    const matchesDay =
      daySelect.value === "all" || event.dataset.day === daySelect.value;
    event.hidden = !(matchesType && matchesDay);
    if (!event.hidden) visible += 1;
  });
  document.querySelector("#gc-event-status").textContent = visible
    ? `${visible} ${visible === 1 ? "event" : "events"} to get you out of the house.`
    : "No events for this combination. Try another day or event type.";
}

typeButtons.forEach((button) =>
  button.addEventListener("click", () => {
    selectedType = button.dataset.eventType;
    typeButtons.forEach((item) => {
      const active = item === button;
      item.classList.toggle("is-active", active);
      item.setAttribute("aria-pressed", String(active));
    });
    filterEvents();
  }),
);
daySelect.addEventListener("change", filterEvents);

const plans = {
  casual: [
    "Desk buddy · $49 / month",
    "Four days to get out of your home office, meet your people, and make something good.",
  ],
  resident: [
    "Regular face · $149 / month",
    "Your everyday creative home. Unlimited coworking days, community events, and a familiar face at the coffee machine.",
  ],
};
document.querySelectorAll('input[name="gc-plan"]').forEach((input) => {
  input.addEventListener("change", () => {
    const [title, detail] = plans[input.value];
    document.querySelector("#gc-plan-summary").textContent = title;
    document.querySelector("#gc-plan-detail").textContent = detail;
  });
});
