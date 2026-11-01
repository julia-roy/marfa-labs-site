// Star particles that drift on a slow current and scatter away from the cursor,
// springing back once it passes, plus flowing horizon lines that rise toward it.
(() => {
  const canvas = document.getElementById("sky");
  const ctx = canvas.getContext("2d");
  const still = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const root = document.documentElement;

  const PALETTE = {
    light: { stars: ["26,23,38", "110,92,214", "226,128,82"], line: ["150,128,230", "240,150,110"], glow: 0 },
    dark: { stars: ["251,244,234", "255,214,168", "201,190,255"], line: ["190,175,255", "255,180,140"], glow: 1 },
  };

  let W, H, stars = [];
  const pointer = { x: -9999, y: -9999, vx: 0, vy: 0, active: false };

  function build() {
    const dpr = Math.min(devicePixelRatio || 1, 2);
    W = innerWidth; H = innerHeight;
    canvas.width = W * dpr; canvas.height = H * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const n = Math.min(320, Math.round((W * H) / 4200));
    stars = Array.from({ length: n }, () => {
      const hx = Math.random() * W, hy = Math.random() * H * 0.82;
      const big = Math.random() < 0.18;
      return {
        hx, hy, x: hx, y: hy, vx: 0, vy: 0,
        r: big ? 3.2 + Math.random() * 4 : 0.6 + Math.random() * 1.2,
        big, hue: Math.random() < 0.55 ? 0 : Math.random() < 0.5 ? 1 : 2,
        a: 0.35 + Math.random() * 0.6, tw: 0.5 + Math.random() * 1.5, ph: Math.random() * 6.28,
        spin: (Math.random() - 0.5) * 0.4,
      };
    });
  }

  // Compact four-point star with curved sides, like the logo.
  function sparkle(x, y, r, rot) {
    const v = r * 0.78, k = r * 0.16;
    ctx.save(); ctx.translate(x, y); ctx.rotate(rot);
    ctx.beginPath();
    ctx.moveTo(r, 0);
    ctx.quadraticCurveTo(k, k, 0, v);
    ctx.quadraticCurveTo(-k, k, -r, 0);
    ctx.quadraticCurveTo(-k, -k, 0, -v);
    ctx.quadraticCurveTo(k, -k, r, 0);
    ctx.fill(); ctx.restore();
  }

  function frame(t) {
    const pal = PALETTE[root.dataset.theme === "dark" ? "dark" : "light"];
    ctx.clearRect(0, 0, W, H);

    // Flowing horizon: lines that bend up toward the cursor.
    const grad = ctx.createLinearGradient(0, 0, W, 0);
    grad.addColorStop(0, `rgba(${pal.line[0]},0)`);
    grad.addColorStop(0.3, `rgba(${pal.line[0]},.8)`);
    grad.addColorStop(0.6, `rgba(${pal.line[1]},.85)`);
    grad.addColorStop(1, `rgba(${pal.line[1]},0)`);
    ctx.strokeStyle = grad;
    for (let i = 0; i < 6; i++) {
      ctx.globalAlpha = 0.9 - i * 0.13;
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      const base = H * (0.8 + i * 0.032);
      for (let x = 0; x <= W + 10; x += 10) {
        let y = base
          + Math.sin(x * 0.0035 + t * 0.00035 + i * 0.9) * (10 + i * 2)
          + Math.sin(x * 0.0012 - t * 0.00021 + i * 2.1) * 18;
        if (pointer.active) {
          const dx = (x - pointer.x) / 160, near = Math.max(0, 1 - Math.abs(pointer.y - base) / 260);
          y -= 46 * Math.exp(-dx * dx) * near;
        }
        x === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
      }
      ctx.stroke();
    }
    ctx.globalAlpha = 1;

    // Stars.
    const R = 130;
    for (const s of stars) {
      if (!still) {
        // Slow current so the sky never sits still.
        const a = Math.sin(s.hy * 0.004 + t * 0.00008) + Math.cos(s.hx * 0.003 - t * 0.00006);
        s.hx += Math.cos(a) * 0.12; s.hy += Math.sin(a) * 0.06;
        if (s.hx < -20) s.hx += W + 40; else if (s.hx > W + 20) s.hx -= W + 40;
        if (s.hy < -20) s.hy += H * 0.82; else if (s.hy > H * 0.85) s.hy -= H * 0.82;
        if (Math.abs(s.x - s.hx) > W / 2) s.x = s.hx; // wrapped: jump with it

        // Spring home, scatter from the cursor, with a little swirl.
        s.vx += (s.hx - s.x) * 0.012; s.vy += (s.hy - s.y) * 0.012;
        const dx = s.x - pointer.x, dy = s.y - pointer.y, d = Math.hypot(dx, dy);
        if (d < R && d > 0.01) {
          const f = (1 - d / R) ** 2 * 3.2;
          s.vx += (dx / d) * f - (dy / d) * f * 0.35 + pointer.vx * 0.04 * (1 - d / R);
          s.vy += (dy / d) * f + (dx / d) * f * 0.35 + pointer.vy * 0.04 * (1 - d / R);
        }
        s.vx *= 0.9; s.vy *= 0.9;
        s.x += s.vx; s.y += s.vy;
      }

      const tw = 0.55 + 0.45 * Math.sin(t * 0.0012 * s.tw + s.ph);
      const speed = Math.min(1, Math.hypot(s.vx, s.vy) / 4);
      const alpha = Math.min(1, s.a * tw + speed * 0.5);
      const rgb = pal.stars[s.hue];
      if (s.big) {
        if (pal.glow) {
          const g = ctx.createRadialGradient(s.x, s.y, 0, s.x, s.y, s.r * 3.4);
          g.addColorStop(0, `rgba(${rgb},${alpha * 0.28})`);
          g.addColorStop(1, `rgba(${rgb},0)`);
          ctx.fillStyle = g;
          ctx.beginPath(); ctx.arc(s.x, s.y, s.r * 3.4, 0, 6.283); ctx.fill();
        }
        ctx.fillStyle = `rgba(${rgb},${alpha})`;
        sparkle(s.x, s.y, s.r * (1 + speed * 0.4), s.spin * t * 0.001 + s.ph);
      } else {
        ctx.fillStyle = `rgba(${rgb},${alpha})`;
        ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, 6.283); ctx.fill();
      }
    }

    pointer.vx *= 0.85; pointer.vy *= 0.85;
    if (!still) requestAnimationFrame(frame);
  }

  addEventListener("pointermove", (e) => {
    if (pointer.active) { pointer.vx = e.clientX - pointer.x; pointer.vy = e.clientY - pointer.y; }
    pointer.x = e.clientX; pointer.y = e.clientY; pointer.active = true;
  }, { passive: true });
  document.addEventListener("pointerleave", () => { pointer.active = false; pointer.x = pointer.y = -9999; });
  addEventListener("pointerup", (e) => { if (e.pointerType === "touch") { pointer.active = false; pointer.x = pointer.y = -9999; } });
  addEventListener("resize", () => { build(); if (still) frame(0); });
  document.getElementById("theme")?.addEventListener("click", () => { if (still) requestAnimationFrame(frame); });

  build();
  requestAnimationFrame(frame);
})();
