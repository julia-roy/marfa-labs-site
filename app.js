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

// Research has no page yet, but tapping it on a phone should still close the Solutions menu
// and give the white back to Research (a click listener also makes iOS treat it as tappable).
document.querySelector(".left > a").addEventListener("click", () => document.activeElement?.blur());

// Waitlist: sends the email to Formspree (the form's action is the Formspree endpoint).
// Without an action it keeps the old placeholder message.
const form = document.getElementById("join");
const note = document.getElementById("note");
form.addEventListener("submit", async (e) => {
  e.preventDefault();
  if (!form.getAttribute("action")) { note.textContent = "[ The waitlist opens in a few days ]"; return; }
  const button = form.querySelector("button");
  button.disabled = true;
  try {
    const res = await fetch(form.action, { method: "POST", body: new FormData(form), headers: { Accept: "application/json" } });
    if (!res.ok) throw new Error(res.status);
    form.reset();
    note.textContent = "You're on the list. We'll be in touch.";
  } catch {
    note.textContent = "Something went wrong. Please try again.";
  } finally {
    button.disabled = false;
  }
});
