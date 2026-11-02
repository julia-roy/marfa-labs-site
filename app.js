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

// MARFA writes itself in, letter by letter, as if someone were typing it live.
(() => {
  const word = document.querySelector(".giant > span");
  const chars = [...word.textContent].map((c) => {
    const s = document.createElement("span");
    s.className = "ch"; s.textContent = c;
    return s;
  });
  word.replaceChildren(...chars);
  word.classList.add("ready");
  if (matchMedia("(prefers-reduced-motion: reduce)").matches) { chars.forEach((c) => c.classList.add("on")); return; }

  const caret = document.createElement("span");
  caret.className = "caret";
  word.insertBefore(caret, chars[0]);
  let i = 0;
  const type = () => {
    chars[i++].classList.add("on");
    word.insertBefore(caret, chars[i] || null);
    if (i < chars.length) setTimeout(type, 140 + Math.random() * 110); // uneven, like a hand on keys
    else setTimeout(() => caret.remove(), 1200);
  };
  (document.fonts ? document.fonts.ready : Promise.resolve()).then(() => setTimeout(type, 500));
})();
