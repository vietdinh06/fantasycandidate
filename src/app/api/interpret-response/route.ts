import OpenAI from "openai";

type Interpretation = {
  intent: string;
  policySignals: Record<string, number>;
  affectedBlocs: string[];
  promises: string[];
  contradictions: string[];
  mediaNarrative: string;
};

function fallback(text: string, blocNames: string[]): Interpretation {
  const lower = text.toLowerCase();
  const jobs = /job|wage|factory|worker|manufactur|union/.test(lower);
  const cost = /cost|price|tax|rent|health|grocery|inflation/.test(lower);
  const firstBlocs = blocNames.slice(0, jobs || cost ? 2 : 1);

  return {
    intent: jobs ? "economic populism" : cost ? "cost-of-living pragmatism" : "broad personal leadership",
    policySignals: { economicPopulism: jobs ? 0.8 : 0.2, affordability: cost ? 0.8 : 0.2, authenticity: 0.4 },
    affectedBlocs: firstBlocs,
    promises: text.length > 45 ? [text.slice(0, 120)] : [],
    contradictions: [],
    mediaNarrative: jobs ? "A jobs-first answer with a little bite." : cost ? "A practical answer to an uncomfortable household problem." : "A personal answer that leaves room for interpretation.",
  };
}

function clean(value: unknown, text: string, blocNames: string[]) {
  const result = value as Partial<Interpretation>;
  const policySignals = result.policySignals && typeof result.policySignals === "object" ? Object.fromEntries(Object.entries(result.policySignals).slice(0, 8).map(([key, signal]) => [key, Math.max(-1, Math.min(1, Number(signal) || 0))])) : {};
  return {
    intent: typeof result.intent === "string" ? result.intent.slice(0, 100) : fallback(text, blocNames).intent,
    policySignals,
    affectedBlocs: Array.isArray(result.affectedBlocs) ? result.affectedBlocs.filter((name): name is string => typeof name === "string" && blocNames.includes(name)).slice(0, 5) : [],
    promises: Array.isArray(result.promises) ? result.promises.filter((promise): promise is string => typeof promise === "string").slice(0, 5) : [],
    contradictions: Array.isArray(result.contradictions) ? result.contradictions.filter((item): item is string => typeof item === "string").slice(0, 5) : [],
    mediaNarrative: typeof result.mediaNarrative === "string" ? result.mediaNarrative.slice(0, 240) : fallback(text, blocNames).mediaNarrative,
  } satisfies Interpretation;
}

export async function POST(request: Request) {
  const body = await request.json() as { text?: string; blocNames?: string[]; candidateSummary?: string };
  const text = body.text?.trim() || "";
  const blocNames = Array.isArray(body.blocNames) ? body.blocNames : [];
  if (!text) return Response.json({ error: "Response text is required." }, { status: 400 });
  if (!process.env.OPENAI_API_KEY) return Response.json({ source: "fallback-no-key", interpretation: fallback(text, blocNames) });

  try {
    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const completion = await client.chat.completions.create({
      model: process.env.OPENAI_MODEL || "gpt-4o-mini",
      temperature: 1,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content: "Interpret a player's response for a surreal election simulation. Do not calculate polling or invent numeric consequences. Extract intent, policy signals from -1 to 1, promises, contradictions, affected voter blocs only from the supplied list, and a short media narrative. Keep the world playful and fictional. Return JSON with intent, policySignals, affectedBlocs, promises, contradictions, and mediaNarrative.",
        },
        { role: "user", content: JSON.stringify({ response: text, voterBlocs: blocNames, candidateSummary: body.candidateSummary || "" }) },
      ],
    });
    const parsed = JSON.parse(completion.choices[0]?.message?.content || "{}");
    return Response.json({ source: "openai", interpretation: clean(parsed, text, blocNames) });
  } catch (error) {
    console.error("Response interpretation failed", error);
    return Response.json({ source: "fallback-provider-error", interpretation: fallback(text, blocNames) });
  }
}
