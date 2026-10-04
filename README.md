# Fantasy Candidate

Fantasy Candidate is a surreal 30-day election simulation. You create a candidate, answer a new political event each day, and watch fictional voter blocs and the electoral map react to what you say.

The game deliberately does not try to model real-world politics. AI can invent strange voter blocs, arbitrary state leans, campaign scenarios, media narratives, and opponent reactions.

## Current Features

- Home screen explaining the game and rules
- Candidate setup with name, party, and home state
- Manual candidate background entry
- AI-generated candidate backgrounds and summary respins
- Fictional voter blocs and state leanings
- Full US electoral map with hover state details and populations
- AI-generated reporter events and campaign news
- Freeform player responses
- AI interpretation of player responses
- Deterministic polling and voter-bloc consequences
- AI-generated opponent responses and reactions
- Historical campaign snapshots
- Supabase PostgreSQL persistence through Prisma

## Game Loop

```text
Create candidate
        |
AI generates fictional electorate
        |
AI generates reporter event
        |
Player types any response
        |
AI interprets intent and policy signals
        |
Simulation updates voter blocs and state polling
        |
Opponent reacts and campaign news appears
        |
Next event is generated
```

The AI interprets language but does not directly decide polling results. The simulation engine applies the consequences.

## Tech Stack

- Next.js App Router
- React and TypeScript
- Tailwind CSS and custom CSS
- `react-simple-maps` for the electoral map
- OpenAI API for campaign generation, events, interpretation, and reactions
- Supabase PostgreSQL
- Prisma ORM
- Vercel deployment target

## Requirements

- Node.js 20 or newer
- npm
- A Supabase project
- An OpenAI API key

## Local Setup

Install dependencies:

```bash
npm install
```

Create `.env` in the project root:

```env
OPENAI_API_KEY="your-openai-key"
OPENAI_MODEL="gpt-4o-mini"

DATABASE_URL="postgresql://postgres.project-ref:password@pooler-host:6543/postgres?pgbouncer=true"
DIRECT_URL="postgresql://postgres.project-ref:password@pooler-host:5432/postgres"

NEXT_PUBLIC_SUPABASE_URL="https://project-ref.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="your-supabase-publishable-key"
```

Use the Supabase database password, not the Supabase account password. URL-encode special characters in the database password.

Never commit `.env`. It is ignored by Git. The safe template is in `.env.example`.

Apply the database schema:

```bash
npx prisma migrate dev --name init
npx prisma generate
```

Start the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Useful Commands

```bash
npm run dev       # Start the development server
npm run lint      # Run ESLint
npm run build     # Create a production build
npx prisma studio # Inspect database records
npx prisma migrate status
```

## AI Routes

The AI work is kept behind server-side route handlers so the OpenAI key is never sent to the browser.

| Route | Purpose |
| --- | --- |
| `/api/generate-campaign` | Generate fictional state leans, voter blocs, and the initial candidate summary |
| `/api/generate-candidate` | Generate candidate backgrounds and summary respins |
| `/api/generate-event` | Generate reporter events and campaign news |
| `/api/interpret-response` | Convert freeform player text into structured intent and policy signals |
| `/api/opponent-react` | Generate the opponent's response, reaction, and news |
| `/api/campaigns` | Create and persist a campaign |
| `/api/campaigns/[campaignId]/responses` | Persist responses and daily state/bloc snapshots |

Every AI route has a local fallback so the game remains playable if the provider is unavailable.

## Database Models

The Prisma schema currently stores:

- Campaigns
- Candidate profiles
- Campaign events
- Player responses
- Candidate summaries
- State polling snapshots
- Voter-bloc snapshots

The current client keeps the active campaign view and historical tab in memory while also persisting the initial campaign and submitted responses to Supabase.

## Project Structure

```text
src/app/page.tsx                         Main campaign experience
src/app/globals.css                      Application styling
src/app/api/generate-campaign/route.ts   Initial fictional world generation
src/app/api/generate-candidate/route.ts  Backgrounds and summary respins
src/app/api/generate-event/route.ts      Reporter events and news
src/app/api/interpret-response/route.ts  Player response interpretation
src/app/api/opponent-react/route.ts      Opponent reactions
src/app/api/campaigns/route.ts           Campaign persistence
src/app/api/campaigns/[campaignId]/...   Response persistence
src/lib/prisma.ts                        Prisma client
src/lib/supabase.ts                      Supabase client
prisma/schema.prisma                     Database schema
```

## Planned Work

- Load persisted campaigns and history after refresh
- Generate all 30 events with durable day progression
- Add a dedicated Know Your Candidate view
- Track promises, contradictions, and evolving candidate identity
- Persist opponent history and campaign news
- Add Election Day results and a complete win/loss summary
- Add authentication and campaign sharing
