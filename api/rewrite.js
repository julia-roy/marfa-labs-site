// Vercel serverless function: Marfa's two-step agent loop on Claude Opus.
//   1. Draft wide  — verbalized sampling: several takes, each with a model-stated probability.
//   2. De-slop     — an editor pass that strips machine tells and picks the strongest take.
import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic(); // reads ANTHROPIC_API_KEY from the environment
const MODEL = "claude-opus-5-5";

const FORMATS = {
  email: "a short email",
  marketing: "marketing copy",
  social: "a social media post",
  thread: "a multi-post thread",
  longform: "a long-form passage",
};

const STYLE_RULES = `Write like a specific person with opinions, not a brand voice.
Avoid: "delve", "tapestry", "landscape", "seamless", "unlock", "elevate", "game-changer", "journey", "testament";
stock openers ("In today's fast-paced world", "Let's dive in", "I hope this email finds you well");
the "it's not X, it's Y" construction; lists of three adjectives; em dashes; emoji bullets; wrap-ups like "Ultimately" or "At the end of the day".
Prefer concrete nouns, specific details, uneven sentence lengths, and one surprising choice.`;

const DRAFT_SYSTEM = `You are the drafting stage of Marfa, a writing agent built to avoid the sameness of LLM prose.
Use verbalized sampling: generate 5 distinct rewrites of the user's text, each from a genuinely different angle,
and estimate the probability (0 to 1) that you would produce each one if asked once. Make at least two of them
low-probability takes (p < 0.15) that are still good and on-brief. Keep the author's facts and intent.
${STYLE_RULES}
Return only JSON: {"takes":[{"angle":"2-5 word label","probability":0.0,"text":"..."}]}`;

const EDIT_SYSTEM = `You are the editing stage of Marfa. You receive candidate drafts. For the three least typical
drafts that still serve the brief, do a light line edit that removes any remaining machine tells without flattening
the voice. Then mark exactly one as the pick: the one a sharp human editor would send.
${STYLE_RULES}
Return only JSON: {"takes":[{"angle":"...","probability":0.0,"text":"...","pick":false}]}`;

function textOf(message) {
  return message.content.filter((b) => b.type === "text").map((b) => b.text).join("");
}

function parseTakes(raw) {
  const json = raw.slice(raw.indexOf("{"), raw.lastIndexOf("}") + 1);
  const takes = JSON.parse(json).takes;
  if (!Array.isArray(takes) || !takes.length) throw new Error("No takes returned");
  return takes;
}

async function call(system, content, effort) {
  const message = await client.beta.messages.create({
    model: MODEL,
    max_tokens: 16000,
    betas: ["server-side-fallback-2026-07-01"],
    fallbacks: "default",
    output_config: { effort },
    system,
    messages: [{ role: "user", content }],
  });
  if (message.stop_reason === "refusal") throw new Error("The model declined this request");
  return textOf(message);
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "POST only" });

  const { text, format } = req.body || {};
  if (typeof text !== "string" || !text.trim()) return res.status(400).json({ error: "Missing text" });
  if (text.length > 4000) return res.status(400).json({ error: "Keep demo inputs under 4,000 characters" });
  const kind = FORMATS[format] || "a piece of writing";

  try {
    const drafts = parseTakes(
      await call(DRAFT_SYSTEM, `Rewrite this as ${kind}:\n\n${text}`, "medium"),
    );
    const edited = parseTakes(
      await call(EDIT_SYSTEM, `Brief: ${kind}.\n\nCandidates:\n${JSON.stringify(drafts)}`, "low"),
    );
    edited.sort((a, b) => b.probability - a.probability);
    res.status(200).json({ takes: edited });
  } catch (err) {
    if (err instanceof Anthropic.RateLimitError) return res.status(429).json({ error: "Busy, try again in a minute" });
    if (err instanceof Anthropic.APIError) return res.status(502).json({ error: "Model API error" });
    console.error(err);
    res.status(500).json({ error: err.message || "Something went wrong" });
  }
}
