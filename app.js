// Theme toggle (sun/moon) and the waitlist form.

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

// Waitlist: placeholder until a form backend (Formspree) is connected.
document.getElementById("join").addEventListener("submit", (e) => {
  e.preventDefault();
  document.getElementById("note").textContent = "[ The waitlist opens in a few days ]";
});
