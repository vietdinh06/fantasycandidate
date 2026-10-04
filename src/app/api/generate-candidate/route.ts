import OpenAI from "openai";

function fallback(kind: "background" | "summary", candidateName: string, party: string, homeState: string, background?: string) {
  if (kind === "background") {
    return { value: `${candidateName} grew up in ${homeState}, where an obsession with civic rituals, neighborhood arguments, and strangely specific snacks turned into a belief that government should be both useful and entertaining.` };
  }

  return { value: `${candidateName} is a ${party.toLowerCase()} candidate from ${homeState} whose ${background || "unusual personal story"} has created a campaign nobody can summarize without making it sound fictional.` };
}

export async function POST(request: Request) {
  const body = await request.json() as { kind?: "background" | "summary"; candidateName?: string; party?: string; homeState?: string; background?: string };
  const kind = body.kind || "background";
  const candidateName = body.candidateName?.trim() || "Your candidate";
  const party = body.party || "Independent";
  const homeState = body.homeState || "Michigan";
  const background = body.background?.trim() || "";

  if (!process.env.OPENAI_API_KEY) return Response.json({ ...fallback(kind, candidateName, party, homeState, background), source: "fallback-no-key" });

  try {
    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const completion = await client.chat.completions.create({
      model: process.env.OPENAI_MODEL || "gpt-4o-mini",
      temperature: 1,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content: kind === "background"
            ? "Invent a playful, specific, fictional candidate background for a surreal election game. It can be heartfelt, ridiculous, or both. Avoid real politicians and do not make it generic. Return only JSON in the form {\"value\": string} with 2 to 4 sentences."
            : "Write a fresh candidate summary for a surreal election game. Reflect the supplied background, but make it punchy, specific, and slightly funny. Return only JSON in the form {\"value\": string} with 2 to 3 sentences.",
        },
        {
          role: "user",
          content: JSON.stringify({ candidateName, party, homeState, background }),
        },
      ],
    });
    const parsed = JSON.parse(completion.choices[0]?.message?.content || "{}");
    return Response.json({ value: typeof parsed.value === "string" ? parsed.value.slice(0, 700) : fallback(kind, candidateName, party, homeState, background).value, source: "openai" });
  } catch (error) {
    console.error("Candidate generation failed", error);
    return Response.json({ ...fallback(kind, candidateName, party, homeState, background), source: "fallback-provider-error" });
  }
}
