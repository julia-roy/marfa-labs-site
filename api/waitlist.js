// Vercel serverless function: forwards waitlist signups to WAITLIST_WEBHOOK_URL
// (a Formspree / Google Apps Script / Zapier endpoint). Returns 503 until that's set.
export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "POST only" });

  const email = String(req.body?.email || "").trim();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return res.status(400).json({ error: "Invalid email" });

  const hook = process.env.WAITLIST_WEBHOOK_URL;
  if (!hook) return res.status(503).json({ error: "Waitlist not connected yet" });

  const r = await fetch(hook, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({ email, source: "marfa-labs.com", at: new Date().toISOString() }),
  });
  if (!r.ok) return res.status(502).json({ error: "Could not save signup" });
  res.status(200).json({ ok: true });
}
