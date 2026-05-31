// GET /api/commune/:code
// Returns one commune's identity plus a Gemini-generated inspector risk
// narrative built from its precomputed building-stock signals. If the model
// is unreachable or no API key is configured, narrative comes back null and
// the UI shows a graceful fallback — the endpoint never 500s on AI failure.
const { loadData } = require("../../lib/communeData");

const GEMINI_MODEL = "gemini-2.5-flash";
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;
const MAX_OUTPUT_TOKENS = 300;
const TEMPERATURE = 0.3;
// gemini-2.5-flash spends output tokens on internal reasoning by default, which
// starves a short factual summary; disable it for fast, complete narratives.
const THINKING_BUDGET = 0;

const SYSTEM_PROMPT =
  "You are a construction risk analyst assistant for SECO Luxembourg, an " +
  "independent technical inspection company. Given aggregate building-stock " +
  "indicators for a Luxembourg commune, write a concise 3-sentence risk " +
  "narrative for an inspector. Reason from the signals provided: a high " +
  "single/two-dwelling share points to dispersed, often older detached housing; " +
  "elevated vacancy can flag aging or under-maintained stock; a declining " +
  "building-permit trend suggests little new construction or renovation. Focus " +
  "on likely material and structural risks and concrete inspection priorities. " +
  "Be specific, not generic. Output plain text only, no preamble.";

// Narratives are deterministic-ish at low temperature; cache per warm instance
// so repeat clicks on the same commune don't re-bill the model.
const narrativeCache = new Map();

function permitTrendDescription(trend, ratio) {
  if (!trend) return "unknown";
  const pct = ratio ? ` (${Math.round((ratio - 1) * 100)}% vs prior 5 years)` : "";
  return `${trend}${pct}`;
}

function buildUserPrompt(p) {
  const pct = (v) => `${(v * 100).toFixed(0)}%`;
  return [
    `Commune: ${p.name} (Canton: ${p.canton})`,
    `Total dwellings: ${p.total_units}`,
    `Vacancy rate: ${pct(p.vacancy_rate)}`,
    `Single/two-dwelling share: ${pct(p.small_building_share)}`,
    `Multi-dwelling units: ${p.dw_multi}`,
    `Recent building-permit trend (canton, 5yr): ${permitTrendDescription(p.permit_trend, p.permit_trend_ratio)}`,
    `Composite risk score: ${p.risk_score}/100 (${p.risk_level})`,
    "",
    "Write the inspector risk narrative:",
  ].join("\n");
}

async function generateNarrative(props) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;

  const response = await fetch(`${GEMINI_URL}?key=${apiKey}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
      contents: [{ role: "user", parts: [{ text: buildUserPrompt(props) }] }],
      generationConfig: {
        maxOutputTokens: MAX_OUTPUT_TOKENS,
        temperature: TEMPERATURE,
        thinkingConfig: { thinkingBudget: THINKING_BUDGET },
      },
    }),
  });

  if (!response.ok) throw new Error(`gemini ${response.status}`);
  const data = await response.json();
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
  return text || null;
}

module.exports = async (req, res) => {
  const code = req.query?.code || req.url.split("/").pop().split("?")[0];
  const { byCode } = loadData();
  const props = byCode.get(code);

  res.setHeader("Content-Type", "application/json");

  if (!props) {
    res.status(404).json({ error: "commune_not_found", code });
    return;
  }

  const base = { code: props.code, name: props.name, generated_at: new Date().toISOString() };

  if (narrativeCache.has(code)) {
    res.setHeader("Cache-Control", "public, s-maxage=86400");
    res.status(200).json({ ...base, narrative: narrativeCache.get(code) });
    return;
  }

  try {
    const narrative = await generateNarrative(props);
    if (narrative) narrativeCache.set(code, narrative);
    res.status(200).json({ ...base, narrative, error: narrative ? undefined : "narrative_unavailable" });
  } catch (err) {
    res.status(200).json({ ...base, narrative: null, error: "narrative_unavailable" });
  }
};
