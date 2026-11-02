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

// "A place to think" writes itself in, letter by letter, as if someone were typing it live.
// When it's done, the blinking full stop takes over, as if the sentence could go on.
(() => {
  const line = document.querySelector(".kicker");
  const dot = line.querySelector(".blink");
  const text = line.firstChild.textContent;
  const chars = [...text].map((c) => {
    const s = document.createElement("span");
    s.className = "ch"; s.textContent = c;
    return s;
  });
  line.firstChild.replaceWith(...chars);
  if (matchMedia("(prefers-reduced-motion: reduce)").matches) {
    chars.forEach((c) => c.classList.add("on"));
    line.classList.add("ready");
    return;
  }
  dot.classList.add("wait");
  const caret = document.createElement("span");
  caret.className = "caret";
  line.insertBefore(caret, chars[0]);
  line.classList.add("ready");
  let i = 0;
  const type = () => {
    chars[i++].classList.add("on");
    line.insertBefore(caret, chars[i] || dot);
    if (i < chars.length) setTimeout(type, 70 + Math.random() * 90); // uneven, like a hand on keys
    else setTimeout(() => { caret.remove(); dot.classList.remove("wait"); }, 350);
  };
  (document.fonts ? document.fonts.ready : Promise.resolve()).then(() => setTimeout(type, 600));
})();
