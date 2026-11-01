// The giant MARFA wordmark (crossbar-less A's drawn over Michroma) and a dithered
// glow of desert light rising behind it. The glow drifts and leans toward the cursor;
// the wordmark's gradient follows it.
(() => {
  const NS = "http://www.w3.org/2000/svg";
  const still = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const giant = document.getElementById("giant");
  const text = document.getElementById("giantText");
  const aLayer = document.getElementById("giantA");
  const grad = document.getElementById("wordGlow");
  let vb = null;

  function layoutWord() {
    const size = 200;
    const m = document.createElement("canvas").getContext("2d");
    m.font = `${size}px Michroma`;
    const capH = m.measureText("M").actualBoundingBoxAscent;
    const aBox = m.measureText("A");
    const sw = capH * 0.16;

    aLayer.replaceChildren();
    const clip = document.createElementNS(NS, "clipPath");
    clip.id = "aboveBaseline";
    const rect = document.createElementNS(NS, "rect");
    rect.setAttribute("x", -1000); rect.setAttribute("y", -capH - 50);
    rect.setAttribute("width", 99999); rect.setAttribute("height", capH + 50);
    clip.appendChild(rect);
    aLayer.appendChild(clip);
    aLayer.setAttribute("clip-path", "url(#aboveBaseline)");

    for (const i of [1, 4]) {
      const x0 = text.getStartPositionOfChar(i).x;
      const left = x0 - aBox.actualBoundingBoxLeft + sw * 0.5;
      const right = x0 + aBox.actualBoundingBoxRight - sw * 0.5;
      const path = document.createElementNS(NS, "path");
      path.setAttribute("d", `M${left} ${sw} L${(left + right) / 2} ${-capH + sw * 0.5} L${right} ${sw}`);
      path.setAttribute("stroke-width", sw);
      aLayer.appendChild(path);
    }

    const first = text.getStartPositionOfChar(0).x - m.measureText("M").actualBoundingBoxLeft;
    const last = text.getStartPositionOfChar(4).x + aBox.actualBoundingBoxRight;
    vb = { x: first, y: -capH, w: last - first, h: capH };
    giant.setAttribute("viewBox", `${vb.x} ${vb.y} ${vb.w} ${vb.h}`);
    giant.style.aspectRatio = `${vb.w} / ${vb.h}`;
    grad.setAttribute("r", vb.w * 0.55);
  }

  // Dithered glow.
  const canvas = document.getElementById("glow");
  const ctx = canvas.getContext("2d");
  const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map((v) => (v + 0.5) / 16);
  const CELL = 5, DOT = 3.4;
  const COLORS = ["#b9a9ff", "#f2a6c2", "#ff9470", "#ffc9a3"];
  let W, H, cols, rows;
  const mouse = { x: 0.5, y: 1.2, tx: 0.5, ty: 1.2 };

  function size() {
    const dpr = Math.min(devicePixelRatio || 1, 2);
    W = canvas.clientWidth; H = canvas.clientHeight;
    canvas.width = W * dpr; canvas.height = H * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    cols = Math.ceil(W / CELL); rows = Math.ceil(H / CELL);
  }

  function field(t) {
    const s = still ? 0 : t;
    return [
      { x: 0.4 + 0.08 * Math.sin(s * 0.00016), y: 1.1, sx: 0.26, sy: 0.62, w: 1.05 },
      { x: 0.74 + 0.08 * Math.sin(s * 0.00011 + 2), y: 1.15, sx: 0.18, sy: 0.45, w: 0.6 },
      { x: mouse.x, y: mouse.y, sx: 0.1, sy: 0.22, w: 0.55 },
    ];
  }

  let frameNo = 0;
  function draw(t) {
    if (!still) requestAnimationFrame(draw);
    if (frameNo++ % 2) return; // ~30fps is plenty for dither

    mouse.x += (mouse.tx - mouse.x) * 0.06;
    mouse.y += (mouse.ty - mouse.y) * 0.06;
    const blobs = field(t);

    ctx.clearRect(0, 0, W, H);
    for (let r = 0; r < rows; r++) {
      const fy = (r + 0.5) / rows;
      const taper = 0.3 + 0.7 * fy; // narrower toward the top: a cone of light
      const topFade = Math.min(1, fy / 0.6);
      for (let c = 0; c < cols; c++) {
        const fx = (c + 0.5) / cols;
        let v = 0;
        for (const b of blobs) {
          const dx = (fx - b.x) / (b.sx * taper), dy = (fy - b.y) / b.sy;
          v += b.w * Math.exp(-(dx * dx + dy * dy));
        }
        v *= topFade * topFade;
        if (v <= BAYER[(r & 3) * 4 + (c & 3)]) continue;
        ctx.fillStyle = COLORS[v > 0.95 ? 3 : v > 0.7 ? 2 : v > 0.45 ? 1 : 0];
        ctx.fillRect(c * CELL, r * CELL, DOT, DOT);
      }
    }

    if (vb) {
      grad.setAttribute("cx", vb.x + blobs[0].x * vb.w);
      grad.setAttribute("cy", vb.y + vb.h * 1.15);
    }
  }

  addEventListener("pointermove", (e) => {
    const r = canvas.getBoundingClientRect();
    mouse.tx = (e.clientX - r.left) / r.width;
    mouse.ty = (e.clientY - r.top) / r.height;
  }, { passive: true });
  addEventListener("pointerleave", () => { mouse.tx = 0.5; mouse.ty = 1.2; });
  addEventListener("resize", () => { size(); if (still) draw(0); });

  size();
  document.fonts.ready.then(() => { layoutWord(); if (still) draw(0); });
  requestAnimationFrame(draw);
})();
