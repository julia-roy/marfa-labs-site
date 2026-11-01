// Soft particles that belong to the photo rather than sitting on top of it.
//   Night: faint warm-cream specks of starlight that twinkle slowly in the sky.
//   Day:   pale-gold dust / grass seed drifting sideways like wind over the grassland.
// Clearly visible but quiet at rest; they brighten, drift away from the cursor and
// ease back slowly. They fade out around the text, and the effect is off on touch
// devices and for people who ask for reduced motion.
(() => {
  const canvas = document.getElementById("sky");
  const ctx = canvas.getContext("2d");
  const root = document.documentElement;
  const off = matchMedia("(prefers-reduced-motion: reduce)").matches
    || !matchMedia("(hover: hover) and (pointer: fine)").matches;
  if (off) return;

  const MODES = {
    dark: { rgb: "255,244,226", top: 0, bottom: 0.6 },    // warm cream, sky only
    light: { rgb: "255,247,226", top: 0.2, bottom: 0.95 }, // sunlit pale gold, bright enough to read on the pale sky
  };
  const R = 170;          // cursor reach
  const PAD = 36, FADE = 70; // clear zone around text, then fade back in

  let W, H, mode, particles = [], textRects = [], sprite;
  const pointer = { x: -9999, y: -9999 };
  const rand = (a, b) => a + Math.random() * (b - a);

  // One soft dot, pre-rendered and tinted for the current mode.
  function makeSprite(rgb) {
    const s = document.createElement("canvas");
    s.width = s.height = 32;
    const g = s.getContext("2d");
    const grad = g.createRadialGradient(16, 16, 0, 16, 16, 16);
    grad.addColorStop(0, `rgba(${rgb},1)`);
    grad.addColorStop(0.7, `rgba(${rgb},1)`);
    grad.addColorStop(1, `rgba(${rgb},0)`);
    g.fillStyle = grad; g.fillRect(0, 0, 32, 32);
    return s;
  }

  function measureText() {
    textRects = [".giant span", ".kicker", ".sub", ".join"]
      .map((sel) => document.querySelector(sel)?.getBoundingClientRect())
      .filter(Boolean);
  }

  // 0 inside the padded text box, rising to 1 over FADE px.
  function textFade(x, y) {
    let f = 1;
    for (const r of textRects) {
      const dx = Math.max(r.left - PAD - x, 0, x - r.right - PAD);
      const dy = Math.max(r.top - PAD - y, 0, y - r.bottom - PAD);
      f = Math.min(f, Math.min(1, Math.hypot(dx, dy) / FADE));
    }
    return f;
  }

  function build() {
    const dpr = Math.min(devicePixelRatio || 1, 2);
    W = innerWidth; H = innerHeight;
    canvas.width = W * dpr; canvas.height = H * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    mode = root.dataset.theme === "dark" ? "dark" : "light";
    const m = MODES[mode];
    sprite = makeSprite(m.rgb);
    const n = Math.max(110, Math.min(220, Math.round((W * H) / 7000)));
    particles = Array.from({ length: n }, () => {
      const hx = rand(0, W), hy = rand(m.top, m.bottom) * H;
      return {
        hx, hy, x: hx, y: hy, vx: 0, vy: 0,
        size: rand(1, 3),                 // diameter in px
        a: rand(0.4, 0.75),               // resting opacity
        tw: rand(0.6, 1.4), ph: rand(0, 6.28),
        wind: rand(0.12, 0.32),           // day only: sideways drift
      };
    });
    measureText();
  }

  function frame(t) {
    ctx.clearRect(0, 0, W, H);
    const m = MODES[mode];
    for (const p of particles) {
      if (mode === "light") {
        // Wind over the grassland: slow sideways drift with a gentle lift and fall.
        p.hx += p.wind;
        p.hy += Math.sin(t * 0.0004 + p.ph) * 0.08;
        if (p.hx > W + 10) { p.hx = -10; p.x = p.hx; p.hy = rand(m.top, m.bottom) * H; p.y = p.hy; }
      }

      // Gentle: drift away from the cursor, ease back slowly.
      const dx = p.x - pointer.x, dy = p.y - pointer.y, d = Math.hypot(dx, dy);
      const near = d < R ? (1 - d / R) ** 2 : 0;
      if (near > 0 && d > 0.01) { p.vx += (dx / d) * near * 0.35; p.vy += (dy / d) * near * 0.35; }
      p.vx += (p.hx - p.x) * 0.004; p.vy += (p.hy - p.y) * 0.004;
      p.vx *= 0.94; p.vy *= 0.94;
      p.x += p.vx; p.y += p.vy;

      const twinkle = mode === "dark" ? 0.65 + 0.35 * Math.sin(t * 0.0006 * p.tw + p.ph) : 1;
      const alpha = Math.min(1, p.a * twinkle + near * 0.6) * textFade(p.x, p.y);
      if (alpha < 0.01) continue;
      const s = p.size * 1.25; // solid dot with just a soft rim, no halo
      ctx.globalAlpha = alpha;
      ctx.drawImage(sprite, p.x - s / 2, p.y - s / 2, s, s);
    }
    ctx.globalAlpha = 1;
    requestAnimationFrame(frame);
  }

  addEventListener("pointermove", (e) => { pointer.x = e.clientX; pointer.y = e.clientY; }, { passive: true });
  document.addEventListener("pointerleave", () => { pointer.x = pointer.y = -9999; });
  addEventListener("resize", build);
  document.fonts?.ready.then(measureText);
  // Rebuild with the other mode's particles when the theme switches.
  new MutationObserver(build).observe(root, { attributes: true, attributeFilter: ["data-theme"] });

  build();
  requestAnimationFrame(frame);
})();
