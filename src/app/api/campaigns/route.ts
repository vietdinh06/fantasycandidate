import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  try {
    const body = await request.json() as {
      candidateName: string;
      party: string;
      homeState: string;
      background?: string;
      summary: string;
      states: Array<{
        name: string;
        abbreviation: string;
        electoralVotes: number;
        population?: number;
        lean: number;
        you: number;
        opponent: number;
      }>;
      blocs: Array<{
        name: string;
        color: string;
        share: number;
        population?: number;
        you: number;
        change: number;
      }>;
      event: {
        category: string;
        prompt: string;
        scenario?: string;
      };
    };

    if (!body.candidateName?.trim() || !body.summary || !Array.isArray(body.states) || !Array.isArray(body.blocs)) {
      return Response.json({ error: "Incomplete campaign payload." }, { status: 400 });
    }

    const campaign = await prisma.campaign.create({
      data: {
        status: "active",
        day: 1,
        candidate: {
          create: {
            name: body.candidateName.trim(),
            party: body.party,
            homeState: body.homeState,
            background: body.background || null,
            summary: body.summary,
          },
        },
        events: {
          create: {
            day: 1,
            category: body.event.category,
            prompt: body.event.prompt,
            scenario: body.event.scenario || null,
          },
        },
        summaries: {
          create: {
            day: 1,
            summary: body.summary,
            source: "campaign-generator",
          },
        },
        states: {
          create: body.states.map((state) => ({
            day: 1,
            name: state.name,
            abbreviation: state.abbreviation,
            electoralVotes: state.electoralVotes,
            population: state.population ?? 1_000_000,
            lean: state.lean,
            playerPercent: state.you,
            opponentPercent: state.opponent,
          })),
        },
        blocs: {
          create: body.blocs.map((bloc) => ({
            day: 1,
            name: bloc.name,
            color: bloc.color,
            share: bloc.share,
            population: bloc.population ?? Math.round(350_000_000 * bloc.share / 100),
            supportPlayer: bloc.you,
            supportOpponent: 100 - bloc.you,
            changeFromPrior: bloc.change,
          })),
        },
      },
      select: { id: true },
    });

    return Response.json({ campaignId: campaign.id });
  } catch (error) {
    console.error("Campaign creation failed", error);
    return Response.json({ error: "Could not save campaign." }, { status: 500 });
  }
}
