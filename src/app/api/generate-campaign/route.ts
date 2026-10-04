import OpenAI from "openai";

const fallbackBlocNames = [
  ["Dog voters", "#d87985"],
  ["Toilet paper traditionalists", "#e7a36f"],
  ["People who hate overhead lighting", "#79b5ad"],
  ["Weekend philosophers", "#a99ad8"],
  ["Snack economy voters", "#d7c06b"],
  ["Mysterious aunt caucus", "#ce8fba"],
  ["Fast-lane loyalists", "#78a9d0"],
] as const;

function randomBetween(min: number, max: number) {
  return Math.round((Math.random() * (max - min) + min) * 10) / 10;
}

function fallbackCampaign(states: Array<{ name: string }>, candidateName: string, party: string, homeState: string) {
  const shuffled = [...fallbackBlocNames].sort(() => Math.random() - 0.5).slice(0, 5);
  const shares = [27, 23, 19, 17, 14];
  const blocs = shuffled.map(([name, color], index) => ({ name, color, share: shares[index], you: randomBetween(32, 68), change: 0 }));

  return {
    source: "random-fallback",
    summary: `${candidateName} is a ${party.toLowerCase()} candidate from ${homeState} with an oddly compelling instinct for saying the quiet part out loud. The electorate has not decided whether this is refreshing or a warning sign.`,
    blocs,
    stateLeans: states.map(({ name }) => ({ name, lean: randomBetween(-25, 25) })),
  };
}

function cleanCampaign(value: unknown, states: Array<{ name: string }>, candidateName: string, party: string, homeState: string) {
  if (!value || typeof value !== "object") throw new Error("Invalid campaign response");
  const result = value as { summary?: unknown; blocs?: unknown; stateLeans?: unknown };
  const rawBlocs = Array.isArray(result.blocs) ? result.blocs : [];
  const blocs = rawBlocs.slice(0, 7).map((bloc, index) => {
    const item = bloc as Record<string, unknown>;
    return {
      name: typeof item.name === "string" && item.name.trim() ? item.name.trim().slice(0, 42) : `Unexpected bloc ${index + 1}`,
      color: fallbackBlocNames[index % fallbackBlocNames.length][1],
      share: typeof item.share === "number" ? Math.max(5, Math.min(40, item.share)) : 20,
      you: typeof item.you === "number" ? Math.max(20, Math.min(80, item.you)) : 50,
      change: 0,
    };
  });
  const totalShare = blocs.reduce((total, bloc) => total + bloc.share, 0) || 1;
  const normalizedBlocs = blocs.length ? blocs.map((bloc) => ({ ...bloc, share: Math.round((bloc.share / totalShare) * 100) })) : fallbackCampaign(states, candidateName, party, homeState).blocs;
  const rawLeans = Array.isArray(result.stateLeans) ? result.stateLeans : [];
  const leanMap = new Map(rawLeans.map((state) => [String((state as Record<string, unknown>).name), Number((state as Record<string, unknown>).lean)]));

  return {
    source: "openai",
    summary: typeof result.summary === "string" ? result.summary.slice(0, 360) : fallbackCampaign(states, candidateName, party, homeState).summary,
    blocs: normalizedBlocs,
    stateLeans: states.map(({ name }) => ({ name, lean: Number.isFinite(leanMap.get(name)) ? Math.max(-25, Math.min(25, leanMap.get(name)!)) : randomBetween(-25, 25) })),
  };
}

export async function POST(request: Request) {
  const body = await request.json() as { candidateName?: string; party?: string; homeState?: string; background?: string; states?: Array<{ name: string }> };
  const candidateName = body.candidateName?.trim() || "Your candidate";
  const party = body.party || "Independent";
  const homeState = body.homeState || "Michigan";
  const states = Array.isArray(body.states) ? body.states : [];

  if (!process.env.OPENAI_API_KEY) {
    return Response.json(fallbackCampaign(states, candidateName, party, homeState));
  }

  try {
    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const completion = await client.chat.completions.create({
      model: process.env.OPENAI_MODEL || "gpt-4o-mini",
      temperature: 1,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content: "You generate playful fictional election game setup data. Ignore real-world polling, party stereotypes, demographic assumptions, and political realism. Invent silly voter blocs such as dog owners, toilet-paper-overhead enthusiasts, people who distrust escalators, or moonlight gardeners. State leans must be arbitrary fictional starting conditions from -25 to 25, not a reflection of real elections. Return only valid JSON with summary, blocs, and stateLeans. Create 5 to 7 blocs whose shares roughly total 100. Keep the tone witty but suitable for a broad audience.",
        },
        {
          role: "user",
          content: JSON.stringify({ candidateName, party, homeState, background: body.background || "", states: states.map(({ name }) => name) }),
        },
      ],
    });
    return Response.json(cleanCampaign(JSON.parse(completion.choices[0]?.message?.content || "{}"), states, candidateName, party, homeState));
  } catch {
    return Response.json(fallbackCampaign(states, candidateName, party, homeState));
  }
}
