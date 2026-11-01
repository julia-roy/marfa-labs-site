// Theme toggle (sun/moon), the Marfa clock, and the waitlist form.

const root = document.documentElement;
const toggle = document.getElementById("theme");

function setLabel() {
  toggle.setAttribute("aria-label", root.dataset.theme === "dark" ? "Switch to light mode" : "Switch to dark mode");
}
setLabel();

toggle.addEventListener("click", () => {
  root.dataset.theme = root.dataset.theme === "dark" ? "light" : "dark";
  try { localStorage.setItem("marfa-theme", root.dataset.theme); } catch {}
  setLabel();
});

// Local time in Marfa, Texas, with a sun by day and a moon by night.
function tick() {
  const now = new Date();
  document.getElementById("clock").textContent =
    now.toLocaleTimeString("en-US", { timeZone: "America/Chicago", hour: "numeric", minute: "2-digit" });
  const hour = Number(now.toLocaleString("en-US", { timeZone: "America/Chicago", hour: "numeric", hour12: false }));
  document.getElementById("clockIcon").textContent = hour >= 7 && hour < 19 ? "☀" : "☾";
}
tick();
setInterval(tick, 15000);

// Waitlist: placeholder until a form backend (Formspree) is connected.
document.getElementById("join").addEventListener("submit", (e) => {
  e.preventDefault();
  document.getElementById("note").textContent = "[ The waitlist opens in a few days ]";
});
