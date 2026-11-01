// Two Texas skies on one canvas.
//   Day:   hard overhead sun, vertical shafts of light, mesas in the haze, dust in the beams.
//   Night: a Milky Way of particle stars you can push (hover) or gather (press and hold),
//          plus the Marfa mystery lights drifting above the horizon.
(() => {
  const canvas = document.getElementById("sky");
  const ctx = canvas.getContext("2d");
  const root = document.documentElement;
  const still = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const rand = (a, b) => a + Math.random() * (b - a);
  const gauss = () => (Math.random() + Math.random() + Math.random() + Math.random() - 2) / 2; // ~N(0, .58)

  let W, H, HORIZON, dpr;
  let dayLayer, nightLayer, ridge, mesas;
  let stars = [], motes = [], lights = [];
  let mix = root.dataset.theme === "dark" ? 1 : 0; // 0 = day, 1 = night
  const pointer = { x: -9999, y: -9999, vx: 0, vy: 0, active: false, down: false };

  const layer = () => {
    const c = document.createElement("canvas");
    c.width = W * dpr; c.height = H * dpr;
    const g = c.getContext("2d"); g.setTransform(dpr, 0, 0, dpr, 0, 0);
    return [c, g];
  };

  // Milky Way band: a slightly tilted vertical axis right of centre, like the real one over Marfa.
  const band = (t) => ({ x: W * (0.6 - 0.1 * t), y: H * (-0.05 + 1.1 * t) });
  const bandWidth = () => Math.max(120, W * 0.14);

  function build() {
    dpr = Math.min(devicePixelRatio || 1, 2);
    W = innerWidth; H = innerHeight; HORIZON = H * 0.74;
    canvas.width = W * dpr; canvas.height = H * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    // Night ridge: low West Texas mountains.
    ridge = new Path2D();
    ridge.moveTo(0, H);
    for (let x = 0; x <= W + 8; x += 8) {
      const y = HORIZON + 14
        - Math.max(0, Math.sin(x / W * 3.1 + 0.4)) * H * 0.05
        - Math.max(0, Math.sin(x / W * 7.3 + 1.7)) * H * 0.018
        - Math.sin(x / W * 23) * 2;
      ridge.lineTo(x, y);
    }
    ridge.lineTo(W, H); ridge.closePath();

    // Day mesas: flat tops, softened by distance.
    mesas = new Path2D();
    mesas.moveTo(0, HORIZON);
    const tops = [[0.02, 0.17, 0.028], [0.3, 0.42, 0.04], [0.64, 0.73, 0.022], [0.81, 0.98, 0.034]];
    for (const [a, b, h] of tops) {
      const y = HORIZON - H * h, slope = Math.min(H * h * 1.6, (b - a) * W * 0.35); // keep slopes inside the mesa on narrow screens
      mesas.lineTo(W * a, HORIZON);
      mesas.quadraticCurveTo(W * a + slope * 0.5, y + H * h * 0.15, W * a + slope, y);
      mesas.lineTo(W * b - slope, y);
      mesas.quadraticCurveTo(W * b - slope * 0.5, y + H * h * 0.15, W * b, HORIZON);
    }
    mesas.lineTo(W, HORIZON); mesas.lineTo(W, HORIZON + 2); mesas.lineTo(0, HORIZON + 2); mesas.closePath();

    buildDay(); buildNight();

    // Night stars as particles: most crowd the band, the rest scatter across the sky.
    const n = Math.min(2400, Math.round((W * H) / 650));
    stars = Array.from({ length: n }, (_, i) => {
      let x, y;
      if (i < n * 0.55) {
        const p = band(Math.random()), off = gauss() * bandWidth() * 1.2;
        x = p.x + off; y = p.y + gauss() * 20;
      } else { x = Math.random() * W; y = Math.random() * HORIZON; }
      const bright = Math.random() < 0.035;
      const tint = Math.random();
      return {
        hx: x, hy: y, x, y, vx: 0, vy: 0,
        r: bright ? rand(1.3, 2.2) : rand(0.35, 1.05),
        bright, a: bright ? rand(0.75, 1) : rand(0.25, 0.85),
        rgb: tint < 0.12 ? "190,210,255" : tint < 0.2 ? "255,214,170" : "246,244,255",
        tw: rand(0.4, 2), ph: rand(0, 6.28),
      };
    });

    motes = Array.from({ length: Math.round(W / 9) }, () => ({
      hx: rand(0, W), hy: rand(H * 0.05, HORIZON), x: 0, y: 0, vx: 0, vy: 0,
      r: rand(0.6, 1.8), a: rand(0.2, 0.7), ph: rand(0, 6.28), sp: rand(0.05, 0.25),
    }));
    motes.forEach((m) => { m.x = m.hx; m.y = m.hy; });

    lights = Array.from({ length: W < 600 ? 3 : 5 }, (_, i) => newLight(i));
  }

  function buildDay() {
    let g; [dayLayer, g] = layer();
    // Sky: deep zenith blue down to a white-hot horizon haze.
    const sky = g.createLinearGradient(0, 0, 0, HORIZON);
    sky.addColorStop(0, "#2f74c4");
    sky.addColorStop(0.45, "#7fb6e6");
    sky.addColorStop(0.85, "#e4eef3");
    sky.addColorStop(1, "#fbf3e3");
    g.fillStyle = sky; g.fillRect(0, 0, W, HORIZON + 2);
    // Mesas in atmospheric haze.
    g.fillStyle = "rgba(160,176,198,.32)";
    g.fillRect(0, HORIZON - H * 0.012, W, H * 0.014);
    g.fillStyle = "rgba(150,166,190,.42)"; g.fill(mesas);
    // Heat haze where land meets sky.
    const haze = g.createLinearGradient(0, HORIZON - H * 0.08, 0, HORIZON + H * 0.05);
    haze.addColorStop(0, "rgba(255,250,240,0)");
    haze.addColorStop(0.6, "rgba(255,250,240,.55)");
    haze.addColorStop(1, "rgba(255,250,240,0)");
    g.fillStyle = haze; g.fillRect(0, HORIZON - H * 0.08, W, H * 0.13);
    // Ground: bleached sand, warmer and darker toward the viewer.
    const ground = g.createLinearGradient(0, HORIZON, 0, H);
    ground.addColorStop(0, "#e8cfa6");
    ground.addColorStop(0.25, "#d2ad78");
    ground.addColorStop(1, "#a9763f");
    g.fillStyle = ground; g.fillRect(0, HORIZON, W, H - HORIZON);
    // Fine scrub texture on the ground.
    for (let i = 0; i < W * 1.4; i++) {
      const y = HORIZON + Math.pow(Math.random(), 1.6) * (H - HORIZON);
      const depth = (y - HORIZON) / (H - HORIZON);
      g.fillStyle = `rgba(${Math.random() < 0.5 ? "120,90,50" : "90,95,60"},${0.12 + depth * 0.25})`;
      g.fillRect(Math.random() * W, y, 1 + depth * 3, 0.6 + depth * 1.6);
    }
  }

  function buildNight() {
    let g; [nightLayer, g] = layer();
    const sky = g.createLinearGradient(0, 0, 0, HORIZON);
    sky.addColorStop(0, "#020309");
    sky.addColorStop(0.75, "#05060f");
    sky.addColorStop(1, "#0c0b16");
    g.fillStyle = sky; g.fillRect(0, 0, W, H);

    // Galactic glow: hundreds of soft clouds along the band.
    const bw = bandWidth();
    for (let i = 0; i < 700; i++) {
      const p = band(Math.random()), off = gauss() * bw * 0.9;
      const r = rand(bw * 0.15, bw * 0.75);
      const warm = Math.random() < 0.35;
      const c = g.createRadialGradient(p.x + off, p.y, 0, p.x + off, p.y, r);
      c.addColorStop(0, warm ? "rgba(255,226,196,.065)" : "rgba(200,212,255,.06)");
      c.addColorStop(1, "rgba(0,0,0,0)");
      g.fillStyle = c; g.beginPath(); g.arc(p.x + off, p.y, r, 0, 6.283); g.fill();
    }
    // Brighter core toward the lower part of the band.
    for (let i = 0; i < 120; i++) {
      const p = band(rand(0.45, 0.9)), r = rand(bw * 0.2, bw * 0.6);
      const c = g.createRadialGradient(p.x + gauss() * bw * 0.4, p.y, 0, p.x, p.y, r);
      c.addColorStop(0, "rgba(255,236,214,.05)"); c.addColorStop(1, "rgba(0,0,0,0)");
      g.fillStyle = c; g.beginPath(); g.arc(p.x, p.y, r, 0, 6.283); g.fill();
    }
    // Dark dust lanes that split the band.
    for (let i = 0; i < 260; i++) {
      const t = Math.random(), p = band(t);
      const off = Math.sin(t * 9) * bw * 0.25 + bw * 0.12 + gauss() * bw * 0.18;
      const r = rand(bw * 0.06, bw * 0.22);
      const c = g.createRadialGradient(p.x + off, p.y, 0, p.x + off, p.y, r);
      c.addColorStop(0, "rgba(2,3,9,.22)"); c.addColorStop(1, "rgba(2,3,9,0)");
      g.fillStyle = c; g.beginPath(); g.arc(p.x + off, p.y, r, 0, 6.283); g.fill();
    }
    // Unresolved star dust: thousands of faint points, densest in the band.
    for (let i = 0; i < (W * H) / 90; i++) {
      let x, y;
      if (Math.random() < 0.6) { const p = band(Math.random()); x = p.x + gauss() * bw; y = p.y; }
      else { x = Math.random() * W; y = Math.random() * HORIZON; }
      g.fillStyle = `rgba(235,235,255,${rand(0.04, 0.22)})`;
      g.fillRect(x, y, 0.8, 0.8);
    }
    // Faint glow on the horizon.
    const glow = g.createLinearGradient(0, HORIZON - H * 0.15, 0, HORIZON + 20);
    glow.addColorStop(0, "rgba(60,40,70,0)"); glow.addColorStop(1, "rgba(70,45,70,.35)");
    g.fillStyle = glow; g.fillRect(0, HORIZON - H * 0.15, W, H * 0.15 + 20);
  }

  function newLight(i) {
    return {
      x: rand(0.08, 0.92) * W, yOff: rand(H * 0.015, H * 0.07), vx: rand(-0.15, 0.15),
      r: rand(1.6, 3), life: 0, span: rand(420, 1000), delay: i * 120 + rand(0, 400),
      rgb: ["255,206,140", "255,240,220", "255,150,110", "200,220,255"][Math.floor(Math.random() * 4)],
    };
  }

  function physics(p, R, push, spring) {
    p.vx += (p.hx - p.x) * spring; p.vy += (p.hy - p.y) * spring;
    const dx = p.x - pointer.x, dy = p.y - pointer.y, d = Math.hypot(dx, dy);
    if (pointer.down && d < R * 2.2 && d > 1) {
      // Pressing gathers stars toward the cursor, like a small gravity well.
      const f = (1 - d / (R * 2.2)) * 1.4;
      p.vx -= (dx / d) * f - (dy / d) * f * 0.6;
      p.vy -= (dy / d) * f + (dx / d) * f * 0.6;
    } else if (d < R && d > 0.01) {
      const f = (1 - d / R) ** 2 * push;
      p.vx += (dx / d) * f - (dy / d) * f * 0.4 + pointer.vx * 0.05 * (1 - d / R);
      p.vy += (dy / d) * f + (dx / d) * f * 0.4 + pointer.vy * 0.05 * (1 - d / R);
    }
    p.vx *= 0.9; p.vy *= 0.9;
    p.x += p.vx; p.y += p.vy;
  }

  function drawDay(t) {
    ctx.drawImage(dayLayer, 0, 0, W, H);

    // The sun, straight overhead: a white-hot bloom at the top edge.
    const sun = ctx.createRadialGradient(W * 0.5, -H * 0.08, 0, W * 0.5, -H * 0.08, H * 0.75);
    sun.addColorStop(0, "rgba(255,255,252,1)");
    sun.addColorStop(0.18, "rgba(255,252,240,.85)");
    sun.addColorStop(0.5, "rgba(255,248,230,.25)");
    sun.addColorStop(1, "rgba(255,248,230,0)");
    ctx.fillStyle = sun; ctx.fillRect(0, 0, W, HORIZON);

    // Vertical shafts of light, slowly breathing.
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    for (let i = 0; i < 9; i++) {
      const cx = W * (0.5 + (i - 4) * 0.075) + Math.sin(t * 0.00015 + i) * 14;
      const top = W * 0.02, bottom = W * (0.07 + (i % 3) * 0.025);
      const a = 0.025 + 0.02 * Math.sin(t * 0.0004 + i * 1.7);
      const g = ctx.createLinearGradient(0, 0, 0, HORIZON);
      g.addColorStop(0, `rgba(255,252,240,${a * 2})`);
      g.addColorStop(0.7, `rgba(255,250,235,${a})`);
      g.addColorStop(1, "rgba(255,250,235,0)");
      ctx.fillStyle = g;
      const lean = (i - 4) * W * 0.03;
      for (const k of [1, 0.66, 0.33]) { // nested beams fake a soft edge
        ctx.beginPath();
        ctx.moveTo(cx - top * k, 0); ctx.lineTo(cx + top * k, 0);
        ctx.lineTo(cx + bottom * k + lean, HORIZON); ctx.lineTo(cx - bottom * k + lean, HORIZON);
        ctx.closePath(); ctx.fill();
      }
    }
    ctx.restore();

    // Dust drifting through the light.
    for (const m of motes) {
      if (!still) {
        m.hy -= m.sp * 0.3; m.hx += Math.sin(t * 0.0005 + m.ph) * 0.15;
        if (m.hy < 0) { m.hy = HORIZON; m.hx = rand(0, W); m.x = m.hx; m.y = m.hy; }
        physics(m, 110, 2.6, 0.02);
      }
      const a = m.a * (0.6 + 0.4 * Math.sin(t * 0.002 + m.ph));
      ctx.fillStyle = `rgba(255,244,220,${a})`;
      ctx.beginPath(); ctx.arc(m.x, m.y, m.r, 0, 6.283); ctx.fill();
    }
  }

  function drawNight(t) {
    ctx.drawImage(nightLayer, 0, 0, W, H);

    for (const s of stars) {
      if (!still) {
        s.hx += 0.012; // the sky turns, very slowly
        if (s.hx > W + 10) { s.hx -= W + 20; s.x = s.hx; }
        physics(s, 120, 3.4, 0.008);
      }
      const tw = 0.6 + 0.4 * Math.sin(t * 0.0015 * s.tw + s.ph);
      const moving = Math.min(1, Math.hypot(s.vx, s.vy) / 3);
      const a = Math.min(1, s.a * tw + moving * 0.4);
      if (s.bright) {
        const g = ctx.createRadialGradient(s.x, s.y, 0, s.x, s.y, s.r * 6);
        g.addColorStop(0, `rgba(${s.rgb},${a * 0.35})`); g.addColorStop(1, `rgba(${s.rgb},0)`);
        ctx.fillStyle = g; ctx.beginPath(); ctx.arc(s.x, s.y, s.r * 6, 0, 6.283); ctx.fill();
        // Diffraction spikes.
        ctx.fillStyle = `rgba(${s.rgb},${a * 0.5})`;
        ctx.fillRect(s.x - s.r * 5, s.y - 0.35, s.r * 10, 0.7);
        ctx.fillRect(s.x - 0.35, s.y - s.r * 4, 0.7, s.r * 8);
      }
      ctx.fillStyle = `rgba(${s.rgb},${a})`;
      if (s.r < 0.8) ctx.fillRect(s.x, s.y, s.r * 1.6, s.r * 1.6);
      else { ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, 6.283); ctx.fill(); }
    }

    // Mountains, then the Marfa lights hovering just above them.
    ctx.fillStyle = "#010104"; ctx.fill(ridge);
    lights.forEach((l, i) => {
      if (l.delay > 0) { l.delay = still ? 0 : l.delay - 1; return; }
      if (!still) { l.life++; l.x += l.vx + Math.sin((t + i * 800) * 0.0007) * 0.2; }
      const p = still ? 0.5 : l.life / l.span;
      if (p >= 1) { lights[i] = newLight(0); return; }
      const flicker = 0.75 + 0.25 * Math.sin(t * 0.006 + i * 2) * Math.sin(t * 0.0023 + i);
      const fade = Math.sin(p * Math.PI) * flicker;
      const y = HORIZON - l.yOff - Math.sin(p * Math.PI) * 10;
      const g = ctx.createRadialGradient(l.x, y, 0, l.x, y, l.r * 16);
      g.addColorStop(0, `rgba(${l.rgb},${0.6 * fade})`);
      g.addColorStop(0.2, `rgba(${l.rgb},${0.22 * fade})`);
      g.addColorStop(1, `rgba(${l.rgb},0)`);
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(l.x, y, l.r * 16, 0, 6.283); ctx.fill();
      ctx.fillStyle = `rgba(255,250,240,${0.95 * fade})`;
      ctx.beginPath(); ctx.arc(l.x, y, l.r * 0.6, 0, 6.283); ctx.fill();
    });
  }

  function frame(t) {
    const target = root.dataset.theme === "dark" ? 1 : 0;
    mix += (target - mix) * (still ? 1 : 0.05);
    if (Math.abs(target - mix) < 0.002) mix = target;

    ctx.clearRect(0, 0, W, H);
    if (mix < 1) drawDay(t);
    if (mix > 0) { ctx.globalAlpha = mix; drawNight(t); ctx.globalAlpha = 1; }

    pointer.vx *= 0.85; pointer.vy *= 0.85;
    if (!still) requestAnimationFrame(frame);
  }

  addEventListener("pointermove", (e) => {
    if (pointer.active) { pointer.vx = e.clientX - pointer.x; pointer.vy = e.clientY - pointer.y; }
    pointer.x = e.clientX; pointer.y = e.clientY; pointer.active = true;
  }, { passive: true });
  addEventListener("pointerdown", (e) => {
    if (e.target.closest("a, button, input, form")) return;
    pointer.down = true; pointer.x = e.clientX; pointer.y = e.clientY; pointer.active = true;
  });
  const release = (e) => {
    pointer.down = false;
    if (e && e.pointerType === "touch") { pointer.active = false; pointer.x = pointer.y = -9999; }
  };
  addEventListener("pointerup", release);
  addEventListener("pointercancel", release);
  document.addEventListener("pointerleave", () => { pointer.active = pointer.down = false; pointer.x = pointer.y = -9999; });
  addEventListener("resize", () => { build(); if (still) frame(0); });
  document.getElementById("theme")?.addEventListener("click", () => { if (still) requestAnimationFrame(frame); });

  build();
  requestAnimationFrame(frame);
})();
