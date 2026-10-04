import { prisma } from "@/lib/prisma";

export async function POST(request: Request, { params }: { params: Promise<{ campaignId: string }> }) {
  const { campaignId } = await params;
  const body = await request.json() as {
    day: number;
    text: string;
    interpretation: unknown;
    consequences: unknown;
    event: { category: string; prompt: string; scenario?: string };
    states: Array<{ name: string; abbreviation: string; electoralVotes: number; population: number; lean: number; you: number; opponent: number }>;
    blocs: Array<{ name: string; color: string; share: number; population?: number; you: number; change: number }>;
  };

  if (!campaignId || !body.text?.trim() || !Number.isInteger(body.day) || !Array.isArray(body.states) || !Array.isArray(body.blocs)) {
    return Response.json({ error: "Incomplete response payload." }, { status: 400 });
  }

  try {
    const result = await prisma.$transaction(async (transaction) => {
      const event = await transaction.campaignEvent.upsert({
        where: { campaignId_day: { campaignId, day: body.day } },
        update: { category: body.event.category, prompt: body.event.prompt, scenario: body.event.scenario || null },
        create: { campaignId, day: body.day, category: body.event.category, prompt: body.event.prompt, scenario: body.event.scenario || null },
      });

      const response = await transaction.response.upsert({
        where: { eventId: event.id },
        update: { text: body.text.trim(), day: body.day, interpretation: body.interpretation as object, consequences: body.consequences as object },
        create: { campaignId, eventId: event.id, day: body.day, text: body.text.trim(), interpretation: body.interpretation as object, consequences: body.consequences as object },
        select: { id: true },
      });

      await transaction.stateSnapshot.deleteMany({ where: { campaignId, day: body.day } });
      await transaction.voterBlocSnapshot.deleteMany({ where: { campaignId, day: body.day } });
      await transaction.stateSnapshot.createMany({ data: body.states.map((state) => ({ campaignId, day: body.day, name: state.name, abbreviation: state.abbreviation, electoralVotes: state.electoralVotes, population: state.population, lean: state.lean, playerPercent: state.you, opponentPercent: state.opponent })) });
      await transaction.voterBlocSnapshot.createMany({ data: body.blocs.map((bloc) => ({ campaignId, day: body.day, name: bloc.name, color: bloc.color, share: bloc.share, population: bloc.population ?? Math.round(350_000_000 * bloc.share / 100), supportPlayer: bloc.you, supportOpponent: 100 - bloc.you, changeFromPrior: bloc.change })) });
      await transaction.campaign.update({ where: { id: campaignId }, data: { day: body.day } });

      return response;
    });

    return Response.json({ responseId: result.id });
  } catch (error) {
    console.error("Response persistence failed", error);
    return Response.json({ error: "Could not save response." }, { status: 500 });
  }
}
