// A desert bloom drawn in SVG (two rings of veined petals that slowly breathe),
// plus a canvas of pollen motes drifting up around it.
(() => {
  const NS = "http://www.w3.org/2000/svg";
  const svg = document.getElementById("flower");
  const still = matchMedia("(prefers-reduced-motion: reduce)").matches;

  // Seeded random so the flower is the same on every visit.
  let seed = 7;
  const rnd = () => {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const j = (v, amt) => v + (rnd() - 0.5) * amt;
  const el = (tag, attrs, parent) => {
    const n = document.createElementNS(NS, tag);
    for (const k in attrs) n.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(n);
    return n;
  };

  const defs = el("defs", {}, svg);
  const petalFill = el("linearGradient", { id: "pf", x1: 0, y1: 1, x2: 0, y2: 0 }, defs);
  [[0, "#1a0501"], [0.25, "#6a1d04"], [0.6, "#d4561a"], [0.88, "#f58b3a"], [1, "#ffbf80"]]
    .forEach(([o, c]) => el("stop", { offset: o, "stop-color": c }, petalFill));
  const petalBack = el("linearGradient", { id: "pb", x1: 0, y1: 1, x2: 0, y2: 0 }, defs);
  [[0, "#120401"], [0.4, "#55180a"], [0.85, "#b0461a"], [1, "#e07a3e"]]
    .forEach(([o, c]) => el("stop", { offset: o, "stop-color": c }, petalBack));
  // Side shading so each petal reads as curved, not flat.
  const sheen = el("linearGradient", { id: "sh", x1: 0, y1: 0, x2: 1, y2: 0 }, defs);
  [[0, "rgba(0,0,0,.45)"], [0.42, "rgba(255,214,170,.10)"], [0.55, "rgba(255,214,170,.16)"], [1, "rgba(0,0,0,.5)"]]
    .forEach(([o, c]) => el("stop", { offset: o, "stop-color": c }, sheen));
  const core = el("radialGradient", { id: "core" }, defs);
  [[0, "#f4b65e"], [0.35, "#7a2a08"], [1, "#160502"]]
    .forEach(([o, c]) => el("stop", { offset: o, "stop-color": c }, core));

  function petalPath(L, w) {
    const p = (x, y) => `${j(x * w, w * 0.06).toFixed(1)} ${j(-y * L, L * 0.04).toFixed(1)}`;
    return `M0 0 C ${p(-0.3, 0.1)}, ${p(-0.58, 0.45)}, ${p(-0.48, 0.78)}
      C ${p(-0.4, 0.99)}, ${p(-0.12, 1.04)}, ${p(0, 1.02)}
      C ${p(0.12, 1.05)}, ${p(0.42, 0.98)}, ${p(0.48, 0.77)}
      C ${p(0.57, 0.45)}, ${p(0.3, 0.1)}, 0 0 Z`;
  }

  const petals = [];
  function ring(count, L, w, offset, fill, veinAlpha) {
    const g = el("g", {}, svg);
    for (let i = 0; i < count; i++) {
      const angle = offset + (360 / count) * i + j(0, 14);
      const len = j(L, L * 0.12), wid = j(w, w * 0.14);
      const pg = el("g", {}, g);
      const d = petalPath(len, wid);
      el("path", { d, fill: `url(#${fill})` }, pg);
      el("path", { d, fill: "url(#sh)" }, pg);
      for (let v = -2; v <= 2; v++) {
        const tx = v * wid * 0.12, ty = -len * j(0.86, 0.08);
        el("path", {
          d: `M0 ${-len * 0.08} Q ${tx * 1.6} ${-len * 0.5} ${tx} ${ty}`,
          fill: "none", stroke: `rgba(255,205,160,${veinAlpha})`, "stroke-width": 0.8,
        }, pg);
      }
      el("path", { d, fill: "none", stroke: "rgba(255,190,140,.18)", "stroke-width": 0.7 }, pg);
      petals.push({ g: pg, angle, phase: rnd() * Math.PI * 2, amp: j(0.03, 0.02) });
    }
  }
  ring(8, 240, 132, 10, "pb", 0.1);
  ring(7, 190, 108, 34, "pf", 0.16);
  ring(5, 118, 82, 60, "pf", 0.2);

  el("circle", { r: 30, fill: "url(#core)" }, svg);
  const stamens = el("g", {}, svg);
  for (let i = 0; i < 34; i++) {
    const a = (i / 34) * Math.PI * 2 + j(0, 0.1);
    const r1 = 8, r2 = j(40, 14);
    const x = Math.cos(a) * r2, y = Math.sin(a) * r2;
    el("line", { x1: Math.cos(a) * r1, y1: Math.sin(a) * r1, x2: x, y2: y, stroke: "rgba(244,194,114,.55)", "stroke-width": 0.9 }, stamens);
    el("circle", { cx: x, cy: y, r: j(2.2, 1.2), fill: "#f6c97c" }, stamens);
  }

  // Pollen motes.
  const canvas = document.getElementById("motes");
  const ctx = canvas.getContext("2d");
  let W, H, motes = [];
  function size() {
    const dpr = Math.min(devicePixelRatio || 1, 2);
    W = canvas.clientWidth; H = canvas.clientHeight;
    canvas.width = W * dpr; canvas.height = H * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    motes = Array.from({ length: W < 600 ? 28 : 48 }, () => spawn(true));
  }
  function spawn(anywhere) {
    const spread = Math.min(W, 900);
    return {
      x: W / 2 + (Math.random() - 0.5) * spread,
      y: anywhere ? Math.random() * H : H + 10,
      vy: -(0.08 + Math.random() * 0.25), sway: Math.random() * Math.PI * 2,
      r: 0.6 + Math.random() * 1.8, a: 0.15 + Math.random() * 0.55,
    };
  }

  function frame(t) {
    for (const p of petals) {
      const s = 1 + Math.sin(t * 0.0006 + p.phase) * p.amp;
      p.g.setAttribute("transform", `rotate(${p.angle.toFixed(2)}) scale(${s.toFixed(4)})`);
    }

    ctx.clearRect(0, 0, W, H);
    const light = document.documentElement.dataset.theme === "light";
    const rgb = light ? "214,112,48" : "255,196,140";
    for (let i = 0; i < motes.length; i++) {
      const m = motes[i];
      if (!still) { m.y += m.vy; m.sway += 0.01; }
      const x = m.x + Math.sin(m.sway) * 12;
      const fade = Math.min(1, m.y / (H * 0.3), (H - m.y) / (H * 0.2) + 0.2);
      if (m.y < -10) { motes[i] = spawn(false); continue; }
      ctx.fillStyle = `rgba(${rgb},${(m.a * Math.max(0, fade)).toFixed(3)})`;
      ctx.beginPath(); ctx.arc(x, m.y, m.r, 0, Math.PI * 2); ctx.fill();
    }
    if (!still) requestAnimationFrame(frame);
  }

  addEventListener("resize", () => { size(); if (still) frame(0); });
  document.getElementById("theme")?.addEventListener("click", () => { if (still) requestAnimationFrame(frame); });
  size();
  requestAnimationFrame(frame);
})();
