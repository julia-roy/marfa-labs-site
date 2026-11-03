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

// Research and Solutions: a calm letter scramble on hover. A short wave of 3 letters passes left to right
// (~380ms); the letters in it change about 16 times a second, the rest of the word stays readable.
// Mouse only, and off for people who ask for reduced motion.
if (matchMedia("(hover: hover) and (pointer: fine)").matches && !matchMedia("(prefers-reduced-motion: reduce)").matches) {
  const letters = "abcdefghijklmnopqrstuvwxyz";
  const pick = (c) => {
    const r = letters[Math.floor(Math.random() * letters.length)];
    return c === c.toUpperCase() ? r.toUpperCase() : r;
  };
  document.querySelectorAll(".left > a, .menu > a").forEach((a) => {
    const word = a.textContent;
    a.setAttribute("aria-label", word);
    let raf = 0;
    a.addEventListener("pointerenter", () => {
      cancelAnimationFrame(raf);
      const start = performance.now();
      let tick = -1;
      const step = (now) => {
        const done = Math.min(1, (now - start) / 380) * (word.length + 3); // where the wave has reached
        const t = Math.floor((now - start) / 60);
        if (t !== tick) { // new random letters only every 60ms
          tick = t;
          a.textContent = [...word].map((c, i) => (i < done - 3 || i >= done || c === " " ? c : pick(c))).join("");
        }
        if (done < word.length + 3) raf = requestAnimationFrame(step);
        else a.textContent = word;
      };
      raf = requestAnimationFrame(step);
    });
  });
}

// Waitlist: sends the email to Formspree (the form's action is the Formspree endpoint).
// Without an action it keeps the old placeholder message.
const form = document.getElementById("join");
const note = document.getElementById("note");
form?.addEventListener("submit", async (e) => { // only the homepage has the form
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
