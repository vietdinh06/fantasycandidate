import OpenAI from "openai";

type EventPayload = { label: string; question: string; context: string; scenario: string };

function fallbackEvent(day: number, previousResponse?: string): EventPayload & { news: string } {
  const events = [
    { label: "The National Desk", question: "A mysterious coalition wants you to make one promise before sunset. What do you promise?", context: "Promises / Coalition politics", scenario: "A group nobody remembers forming has become your loudest new constituency." },
    { label: "The Civic Weirdness Report", question: "Would you redirect federal funding toward the things your voters find delightful?", context: "Public money / Joy", scenario: "A viral census reveals that voters care deeply about oddly specific comforts." },
    { label: "The Evening Ledger", question: "What is one thing your opponent completely misunderstands about ordinary life?", context: "Leadership / Contrast", scenario: "A leaked memo suggests the opposition has never used a self-checkout machine." },
  ];
  const event = events[(day - 1) % events.length];
  return { ...event, news: previousResponse ? "The last answer is still ricocheting through the electorate." : "The campaign opens with a question nobody expected to matter." };
}

export async function POST(request: Request) {
  const body = await request.json() as { day?: number; candidateName?: string; candidateSummary?: string; background?: string; previousResponse?: string; voterBlocs?: string[] };
  const day = body.day || 1;
  const fallback = fallbackEvent(day, body.previousResponse);
  if (!process.env.OPENAI_API_KEY) return Response.json({ source: "fallback-no-key", event: fallback, news: fallback.news });

  try {
    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const completion = await client.chat.completions.create({
      model: process.env.OPENAI_MODEL || "gpt-4o-mini",
      temperature: 1,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: "Generate the next event in a surreal 30-day election game. Invent a specific scenario and reporter question that responds to the candidate's evolving identity. It can be funny, strange, earnest, or absurd. Do not calculate polling. Return JSON with event {label, question, context, scenario} and a one-sentence news string." },
        { role: "user", content: JSON.stringify({ day, candidateName: body.candidateName, candidateSummary: body.candidateSummary, background: body.background, previousResponse: body.previousResponse, voterBlocs: body.voterBlocs }) },
      ],
    });
    const result = JSON.parse(completion.choices[0]?.message?.content || "{}");
    const event = result.event as Partial<EventPayload> | undefined;
    if (!event?.question) return Response.json({ source: "fallback-invalid", event: fallback, news: fallback.news });
    return Response.json({ source: "openai", event: { label: event.label || "The National Desk", question: event.question, context: event.context || "Campaign moment", scenario: event.scenario || "The country is paying attention." }, news: typeof result.news === "string" ? result.news : fallback.news });
  } catch (error) {
    console.error("Event generation failed", error);
    return Response.json({ source: "fallback-provider-error", event: fallback, news: fallback.news });
  }
}
