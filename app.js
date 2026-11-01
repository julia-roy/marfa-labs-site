// Client-side "machine tell" detector + calls to the /api/rewrite agent endpoint.

const TELLS = [
  { label: "overused word", weight: 3, re: /\b(delve|delving|tapestry|testament|realm|landscape|navigate|navigating|leverage|leveraging|seamless(ly)?|robust|elevate|unlock|unleash|embark|journey|pivotal|crucial|vibrant|bustling|intricate|myriad|paramount|holistic|synergy|game[- ]changer|cutting[- ]edge|transformative|empower(ing)?|foster(ing)?|harness(ing)?|meticulous(ly)?)\b/gi },
  { label: "stock opener", weight: 6, re: /\b(in today's (fast[- ]paced|digital|ever[- ]changing) (world|landscape|age)|in an era (of|where)|let's dive in|buckle up|picture this|imagine a world)\b/gi },
  { label: "email filler", weight: 5, re: /\b(i hope this (email|message) finds you well|i wanted to reach out|just circling back|please don't hesitate to reach out|looking forward to hearing from you)\b/gi },
  { label: "not X, it's Y", weight: 6, re: /\b(it's|it is|this is) not (just|only|merely)? ?(a|an|about)? ?[\w\s-]{1,30}?[,—–-]+\s*(it's|it is|this is)\b/gi },
  { label: "hedge / wrap-up", weight: 4, re: /\b(in conclusion|ultimately|at the end of the day|it's (important|worth) (to note|noting)|whether you're .{1,40} or .{1,40}|the possibilities are endless)\b/gi },
  { label: "triplet of adjectives", weight: 3, re: /\b\w+(ly)?,\s\w+(ly)?,\s(and|&)\s\w+\b/gi },
  { label: "em dash", weight: 1, re: /—/g },
  { label: "emoji bullet", weight: 2, re: /^[\s]*[🚀✨💡🔥✅👉📈🎯]/gmu },
];

const SAMPLES = {
  email: "Hi Sarah,\n\nI hope this email finds you well! I wanted to reach out because in today's fast-paced world, teams need seamless, intuitive, and powerful tools. Our platform isn't just a tool — it's a game-changer that will empower your team to unlock their full potential.\n\nPlease don't hesitate to reach out if you'd like to delve deeper.\n\nLooking forward to hearing from you!",
  marketing: "In an era where content is king, Lumen is a testament to what's possible. It's not just a writing app — it's a movement. Navigate the ever-evolving landscape of modern marketing with robust, cutting-edge, and transformative features. Whether you're a solo creator or a global brand, the possibilities are endless. 🚀",
  social: "🚀 Let's dive in! Productivity isn't about doing more — it's about doing what matters. Here are 3 game-changing habits that will elevate your mornings:\n✨ Wake up early\n💡 Journal\n🔥 Move your body\nUltimately, it's a journey. What's yours?",
  thread: "1/ In today's fast-paced world, AI is transforming the landscape of work. Here's a thread on why it matters 🧵\n2/ It's not just automation — it's augmentation. Teams that harness AI will unlock unprecedented, transformative, and lasting value.\n3/ At the end of the day, the realm of possibility is endless.",
  longform: "In the bustling tapestry of modern life, it's important to note that creativity remains a pivotal force. As we navigate this intricate landscape, we must delve into what makes writing truly human. Ultimately, it is not merely a skill — it is a testament to who we are.",
};

const $ = (id) => document.getElementById(id);
const input = $("input");

function escapeHtml(s) {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

function scan(text) {
  const hits = [];
  for (const t of TELLS) {
    for (const m of text.matchAll(t.re)) {
      hits.push({ start: m.index, end: m.index + m[0].length, label: t.label, weight: t.weight, text: m[0] });
    }
  }
  // Drop overlapping hits, keeping the heavier one.
  hits.sort((a, b) => a.start - b.start || b.weight - a.weight);
  const kept = [];
  for (const h of hits) {
    const last = kept[kept.length - 1];
    if (last && h.start < last.end) {
      if (h.weight > last.weight) kept[kept.length - 1] = h;
      continue;
    }
    kept.push(h);
  }
  const words = Math.max(1, (text.match(/\S+/g) || []).length);
  const raw = kept.reduce((s, h) => s + h.weight, 0);
  const score = Math.min(99, Math.round((raw / words) * 150));
  return { hits: kept, score };
}

function renderReport(text) {
  const { hits, score } = scan(text);
  let html = "", i = 0;
  for (const h of hits) {
    html += escapeHtml(text.slice(i, h.start)) + `<mark title="${h.label}">${escapeHtml(text.slice(h.start, h.end))}</mark>`;
    i = h.end;
  }
  html += escapeHtml(text.slice(i));
  $("highlighted").innerHTML = html;
  $("scoreNum").textContent = score;

  const counts = {};
  hits.forEach((h) => (counts[h.label] = (counts[h.label] || 0) + 1));
  $("findings").innerHTML = Object.keys(counts).length
    ? Object.entries(counts).map(([k, v]) => `<li>${k} × ${v}</li>`).join("")
    : "<li>no obvious tells</li>";
  $("report").hidden = false;
}

$("sample").addEventListener("click", () => {
  input.value = SAMPLES[$("format").value];
  renderReport(input.value);
});

$("scan").addEventListener("click", () => {
  if (input.value.trim()) renderReport(input.value);
});

$("rewrite").addEventListener("click", async () => {
  const text = input.value.trim();
  if (!text) return;
  const btn = $("rewrite");
  const takes = $("takes");
  btn.disabled = true;
  btn.textContent = "Drafting wide…";
  takes.hidden = false;
  takes.innerHTML = `<p class="msg">Running the loop: sampling several takes with probabilities, critiquing, removing tells.</p>`;
  try {
    const res = await fetch("/api/rewrite", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text, format: $("format").value }),
    });
    const data = await res.json().catch(() => ({ error: "no API on this server" }));
    if (!res.ok || !data.takes) throw new Error(data.error || "Request failed");
    takes.innerHTML = data.takes
      .map((t, n) => {
        const s = scan(t.text).score;
        return `<article class="take${t.pick ? " pick" : ""}">
          <header><span>Take ${n + 1}${t.pick ? " · Marfa's pick" : ""} · ${escapeHtml(t.angle || "")}</span>
          <span class="prob">p≈${Number(t.probability).toFixed(2)} · tells ${s}</span></header>
          <p>${escapeHtml(t.text)}</p></article>`;
      })
      .join("");
  } catch (err) {
    takes.innerHTML = `<p class="msg">The rewrite agent isn't reachable here (${escapeHtml(err.message)}). It runs once the site is deployed with an API key; the detector above works offline.</p>`;
  } finally {
    btn.disabled = false;
    btn.textContent = "Rewrite with Marfa";
  }
});

// Waitlist: placeholder until a form backend is connected (see PLAN.md).
$("waitlistForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const email = e.target.email.value;
  try {
    const res = await fetch("/api/waitlist", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    if (!res.ok) throw new Error();
    $("waitlistNote").textContent = "You're on the list. We'll write (like a person).";
    e.target.reset();
  } catch {
    $("waitlistNote").textContent = "The waitlist opens in a few days. Check back soon.";
  }
});
