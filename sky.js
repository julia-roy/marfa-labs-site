// Night sky behind the page: layered stars, slow dust, the odd shooting star,
// and a few "Marfa lights" — warm orbs that drift and fade above the hero horizon.
(() => {
  const canvas = document.getElementById("sky");
  const ctx = canvas.getContext("2d");
  const still = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const hero = document.querySelector(".hero");

  let W, H, dpr, stars = [], dust = [], lights = [], meteor = null;
  let mouseX = 0, mouseY = 0, scrollY = window.scrollY;
  const rand = (a, b) => a + Math.random() * (b - a);

  function build() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = canvas.clientWidth; H = canvas.clientHeight;
    canvas.width = W * dpr; canvas.height = H * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const n = Math.round((W * H) / 2600);
    stars = Array.from({ length: n }, () => {
      const depth = Math.random();
      return {
        x: Math.random() * W, y: Math.random() * H * 1.6,
        r: 0.25 + depth * 1.1, depth,
        a: rand(0.25, 0.95), tw: rand(0.4, 1.6), ph: rand(0, Math.PI * 2),
        hue: Math.random() < 0.15 ? "255,226,190" : Math.random() < 0.2 ? "190,205,255" : "240,238,250",
      };
    });
    dust = Array.from({ length: Math.round(W / 22) }, () => ({
      x: Math.random() * W, y: Math.random() * H,
      vx: rand(-0.06, 0.06), vy: rand(-0.12, -0.02), r: rand(0.6, 1.6), a: rand(0.05, 0.25),
    }));
    lights = Array.from({ length: W < 600 ? 3 : 5 }, (_, i) => newLight(i));
  }

  function newLight(i) {
    return {
      x: rand(0.1, 0.9) * W, yOff: rand(70, 150), vx: rand(-0.12, 0.12),
      r: rand(2, 3.6), life: 0, span: rand(500, 1100), delay: i * 140 + rand(0, 300),
      warm: Math.random() < 0.7,
    };
  }

  function star(s, t) {
    const par = s.depth * 0.35;
    const x = s.x + mouseX * s.depth * 6;
    let y = (s.y - scrollY * par) % (H * 1.6);
    if (y < 0) y += H * 1.6;
    if (y > H) return;
    const a = s.a * (0.6 + 0.4 * Math.sin(t * 0.001 * s.tw + s.ph));
    ctx.fillStyle = `rgba(${s.hue},${a})`;
    ctx.beginPath(); ctx.arc(x, y + mouseY * s.depth * 4, s.r, 0, Math.PI * 2); ctx.fill();
    if (s.r > 1.15) {
      ctx.fillStyle = `rgba(${s.hue},${a * 0.12})`;
      ctx.beginPath(); ctx.arc(x, y, s.r * 4, 0, Math.PI * 2); ctx.fill();
    }
  }

  function glow(x, y, r, rgb, a) {
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, `rgba(${rgb},${a})`);
    g.addColorStop(0.25, `rgba(${rgb},${a * 0.35})`);
    g.addColorStop(1, `rgba(${rgb},0)`);
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
  }

  function frame(t) {
    ctx.clearRect(0, 0, W, H);
    for (const s of stars) star(s, t);

    for (const d of dust) {
      if (!still) { d.x += d.vx; d.y += d.vy; }
      if (d.y < -5) { d.y = H + 5; d.x = Math.random() * W; }
      if (d.x < -5) d.x = W + 5; else if (d.x > W + 5) d.x = -5;
      ctx.fillStyle = `rgba(243,220,174,${d.a})`;
      ctx.beginPath(); ctx.arc(d.x, d.y, d.r, 0, Math.PI * 2); ctx.fill();
    }

    // Marfa lights sit just above the hero's mesa line and scroll away with it.
    const horizon = hero ? hero.offsetTop + hero.offsetHeight - 60 - scrollY : -1;
    if (horizon > -100 && horizon < H + 200) {
      lights.forEach((l, i) => {
        if (l.delay > 0) { l.delay--; return; }
        if (!still) { l.life++; l.x += l.vx + Math.sin((t + i * 900) * 0.0006) * 0.15; }
        const p = still ? 0.5 : l.life / l.span;
        if (p >= 1) { lights[i] = newLight(0); return; }
        const fade = Math.sin(p * Math.PI) * (0.75 + 0.25 * Math.sin(t * 0.004 + i));
        const y = horizon - l.yOff - Math.sin(p * Math.PI) * 18;
        const rgb = l.warm ? "255,214,160" : "200,215,255";
        glow(l.x, y, l.r * 14, rgb, 0.55 * fade);
        ctx.fillStyle = `rgba(255,248,235,${0.9 * fade})`;
        ctx.beginPath(); ctx.arc(l.x, y, l.r * 0.7, 0, Math.PI * 2); ctx.fill();
      });
    }

    if (!still) {
      if (!meteor && Math.random() < 0.0025) {
        meteor = { x: rand(0.2, 1) * W, y: rand(0, 0.35) * H, vx: -rand(6, 9), vy: rand(2, 3.2), life: 0 };
      }
      if (meteor) {
        meteor.life++;
        const { x, y, vx, vy } = meteor;
        const a = Math.max(0, 1 - meteor.life / 50);
        const g = ctx.createLinearGradient(x, y, x - vx * 14, y - vy * 14);
        g.addColorStop(0, `rgba(255,240,220,${a})`); g.addColorStop(1, "rgba(255,240,220,0)");
        ctx.strokeStyle = g; ctx.lineWidth = 1.2;
        ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x - vx * 14, y - vy * 14); ctx.stroke();
        meteor.x += vx; meteor.y += vy;
        if (a <= 0) meteor = null;
      }
      requestAnimationFrame(frame);
    }
  }

  window.addEventListener("resize", () => { build(); if (still) frame(0); });
  window.addEventListener("scroll", () => { scrollY = window.scrollY; if (still) frame(0); }, { passive: true });
  window.addEventListener("pointermove", (e) => {
    mouseX = e.clientX / W - 0.5; mouseY = e.clientY / H - 0.5;
  }, { passive: true });

  // Cards: a soft light follows the cursor along the top edge.
  document.querySelectorAll(".card").forEach((c) => {
    c.addEventListener("pointermove", (e) => {
      const r = c.getBoundingClientRect();
      c.style.setProperty("--mx", `${e.clientX - r.left}px`);
    });
  });

  build();
  requestAnimationFrame(frame);
})();
