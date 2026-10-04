import OpenAI from "openai";

function fallback(candidateName: string) {
  return {
    response: `${candidateName} is offering a slogan where a plan should be. Voters deserve to know what this actually costs.`,
    reaction: "The opposition frames your answer as entertaining but untested.",
    news: `${candidateName}'s opponent moves quickly to define the answer before the campaign can define itself.`,
  };
}

export async function POST(request: Request) {
  const body = await request.json() as { candidateName?: string; opponentName?: string; candidateSummary?: string; event?: string; playerResponse?: string; interpretation?: unknown };
  const candidateName = body.candidateName || "Your candidate";
  const opponentName = body.opponentName || "Morgan Hale";
  const fallbackResult = fallback(candidateName);
  if (!process.env.OPENAI_API_KEY) return Response.json({ source: "fallback-no-key", ...fallbackResult });

  try {
    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const completion = await client.chat.completions.create({
      model: process.env.OPENAI_MODEL || "gpt-4o-mini",
      temperature: 1,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: "Write the opponent's reaction in a surreal election game. Be specific to the player's answer, strategically plausible, and occasionally funny. Do not calculate polling. Return JSON with response, reaction, and news." },
        { role: "user", content: JSON.stringify({ candidateName, opponentName, candidateSummary: body.candidateSummary, event: body.event, playerResponse: body.playerResponse, interpretation: body.interpretation }) },
      ],
    });
    const result = JSON.parse(completion.choices[0]?.message?.content || "{}");
    if (typeof result.response !== "string") return Response.json({ source: "fallback-invalid", ...fallbackResult });
    return Response.json({ source: "openai", response: result.response.slice(0, 500), reaction: typeof result.reaction === "string" ? result.reaction.slice(0, 280) : fallbackResult.reaction, news: typeof result.news === "string" ? result.news.slice(0, 280) : fallbackResult.news });
  } catch (error) {
    console.error("Opponent reaction failed", error);
    return Response.json({ source: "fallback-provider-error", ...fallbackResult });
  }
}
