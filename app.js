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

// The slogan writes itself in, letter by letter, as if someone were typing it live.
// When it's done, the blinking full stop takes over, as if the sentence could go on.
// After three blinks the sentence fades away, like the Marfa lights, and the agent line
// and the email field appear in its place.
(() => {
  const line = document.querySelector(".kicker");
  const below = document.querySelector(".below");
  const dot = line.querySelector(".blink");
  const text = line.firstChild.textContent;
  const chars = [];
  const letter = (c) => {
    const s = document.createElement("span");
    s.className = "ch"; s.textContent = c;
    chars.push(s);
    return s;
  };
  // Letters are grouped into words, so a line only ever breaks between words.
  const parts = text.split(/(\s+)/).filter(Boolean).map((part) => {
    if (/^\s+$/.test(part)) return letter(part);
    const word = document.createElement("span");
    word.className = "word";
    word.append(...[...part].map(letter));
    return word;
  });
  line.firstChild.replaceWith(...parts);
  if (matchMedia("(prefers-reduced-motion: reduce)").matches) {
    chars.forEach((c) => c.classList.add("on"));
    line.classList.add("ready");
    below.classList.add("revealed");
    return;
  }
  let blinks = 0;
  dot.addEventListener("animationiteration", () => {
    if (++blinks !== 3) return;
    line.classList.add("gone");
    setTimeout(() => below.classList.add("revealed"), 1400);
    setTimeout(() => dispatchEvent(new Event("marfa:text")), 1900); // let the stars back where the sentence was
  });
  dot.classList.add("wait");
  const caret = document.createElement("span");
  caret.className = "caret";
  chars[0].before(caret);
  line.classList.add("ready");
  let i = 0;
  const type = () => {
    chars[i++].classList.add("on");
    if (chars[i]) chars[i].before(caret); else chars[i - 1].after(caret);
    if (i < chars.length) setTimeout(type, 40 + Math.random() * 55); // uneven, like a hand on keys
    else setTimeout(() => { caret.remove(); dot.classList.remove("wait"); }, 350);
  };
  (document.fonts ? document.fonts.ready : Promise.resolve()).then(() => setTimeout(type, 600));
})();
