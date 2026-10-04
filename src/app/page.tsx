"use client";

import { FormEvent, useMemo, useState } from "react";
import { ComposableMap, Geographies, Geography } from "react-simple-maps";
import { ArrowRight, ArrowUpRight, ChevronRight, CircleHelp, Clock3, MapPin, Radio, Send, Sparkles, Vote } from "lucide-react";

type Candidate = "you" | "opponent";
type Party = "Democrat" | "Republican" | "Independent";
type Screen = "home" | "setup" | "campaign";

type StatePoll = {
  name: string;
  abbreviation: string;
  electoralVotes: number;
  you: number;
  opponent: number;
  category: "safe" | "lean" | "tossup";
};

type Bloc = {
  name: string;
  share: number;
  you: number;
  change: number;
  color: string;
};

type GeneratedCampaign = {
  source: "openai" | "random-fallback";
  summary: string;
  blocs: Bloc[];
  stateLeans: Array<{ name: string; lean: number }>;
};

const geoUrl = "https://cdn.jsdelivr.net/npm/us-atlas@3/states-10m.json";

const stateCatalog = [
  ["Alabama", "AL", 9, -22], ["Alaska", "AK", 3, -14], ["Arizona", "AZ", 11, -2], ["Arkansas", "AR", 6, -24], ["California", "CA", 54, 28], ["Colorado", "CO", 10, 13], ["Connecticut", "CT", 7, 18], ["Delaware", "DE", 3, 15], ["Florida", "FL", 30, -13], ["Georgia", "GA", 16, -4], ["Hawaii", "HI", 4, 28], ["Idaho", "ID", 4, -28], ["Illinois", "IL", 19, 16], ["Indiana", "IN", 11, -14], ["Iowa", "IA", 6, -7], ["Kansas", "KS", 6, -18], ["Kentucky", "KY", 8, -23], ["Louisiana", "LA", 8, -22], ["Maine", "ME", 4, 8], ["Maryland", "MD", 10, 24], ["Massachusetts", "MA", 11, 28], ["Michigan", "MI", 15, 4], ["Minnesota", "MN", 10, 12], ["Mississippi", "MS", 6, -25], ["Missouri", "MO", 10, -18], ["Montana", "MT", 4, -24], ["Nebraska", "NE", 5, -21], ["Nevada", "NV", 6, 1], ["New Hampshire", "NH", 4, 3], ["New Jersey", "NJ", 14, 19], ["New Mexico", "NM", 5, 16], ["New York", "NY", 28, 25], ["North Carolina", "NC", 16, -6], ["North Dakota", "ND", 3, -28], ["Ohio", "OH", 17, -9], ["Oklahoma", "OK", 7, -28], ["Oregon", "OR", 8, 21], ["Pennsylvania", "PA", 19, 2], ["Rhode Island", "RI", 4, 24], ["South Carolina", "SC", 9, -20], ["South Dakota", "SD", 3, -26], ["Tennessee", "TN", 11, -24], ["Texas", "TX", 40, -12], ["Utah", "UT", 6, -25], ["Vermont", "VT", 3, 30], ["Virginia", "VA", 13, 9], ["Washington", "WA", 12, 25], ["West Virginia", "WV", 4, -30], ["Wisconsin", "WI", 10, 2], ["Wyoming", "WY", 3, -30],
] as const;

function buildStates(stateLeans: Array<{ name: string; lean: number }>): StatePoll[] {
  const leanMap = new Map(stateLeans.map((state) => [state.name, state.lean]));
  return stateCatalog.map(([name, abbreviation, electoralVotes]) => {
    const fictionalLean = leanMap.get(name) ?? 0;
    const you = clamp(50 + fictionalLean / 2, 35, 65);
    const margin = you - (100 - you);
    return { name, abbreviation, electoralVotes, lean: fictionalLean, you, opponent: 100 - you, category: Math.abs(margin) < 4 ? "tossup" : Math.abs(margin) < 10 ? "lean" : "safe" };
  });
}

function buildBlocs(generatedBlocs?: Bloc[]): Bloc[] {
  if (generatedBlocs?.length) return generatedBlocs;
  return [
    { name: "Dog voters", share: 26, you: 46, change: 0, color: "#e7a36f" },
    { name: "Toilet paper traditionalists", share: 22, you: 46, change: 0, color: "#79b5ad" },
    { name: "People who hate overhead lighting", share: 18, you: 48, change: 0, color: "#d87985" },
    { name: "Weekend philosophers", share: 21, you: 45, change: 0, color: "#a99ad8" },
    { name: "Snack economy voters", share: 13, you: 43, change: 0, color: "#d7c06b" },
  ];
}

const eventQuestions = [
  { label: "The National Desk", question: "What would your administration do to bring down the cost of living?", context: "Economy / Cost of living" },
  { label: "The National Desk", question: "How would you rebuild trust with voters who feel ignored by Washington?", context: "Leadership / Trust" },
  { label: "The National Desk", question: "What is your plan for creating good-paying jobs in smaller cities?", context: "Jobs / Industry" },
];

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

function stateFill(state: StatePoll | undefined) {
  if (!state) return "#26313f";
  const margin = state.you - state.opponent;
  if (margin > 4) return "#277d78";
  if (margin > 0) return "#579d96";
  if (margin > -4) return "#a85c68";
  return "#873f50";
}

export default function Home() {
  const [screen, setScreen] = useState<Screen>("home");
  const [candidateName, setCandidateName] = useState("");
  const [party, setParty] = useState<Party>("Independent");
  const [homeState, setHomeState] = useState("Michigan");
  const [candidateSummary, setCandidateSummary] = useState("");
  const [campaignSource, setCampaignSource] = useState<GeneratedCampaign["source"]>("random-fallback");
  const [isGenerating, setIsGenerating] = useState(false);
  const [states, setStates] = useState<StatePoll[]>([]);
  const [blocs, setBlocs] = useState<Bloc[]>([]);
  const [response, setResponse] = useState("");
  const [eventIndex, setEventIndex] = useState(0);
  const [activeState, setActiveState] = useState<StatePoll | null>(null);
  const [lastAction, setLastAction] = useState("Your first response is waiting.");

  const question = eventQuestions[eventIndex % eventQuestions.length];
  const national = useMemo(() => {
    const you = states.reduce((total, state) => total + state.you, 0) / states.length;
    const opponent = states.reduce((total, state) => total + state.opponent, 0) / states.length;
    return { you, opponent };
  }, [states]);

  const electoralCount = (candidate: Candidate) =>
    states.reduce((total, state) => total + (state[candidate] > state[candidate === "you" ? "opponent" : "you"] ? state.electoralVotes : 0), 0);

  async function startCampaign(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const name = candidateName.trim();
    if (!name) return;
    setIsGenerating(true);
    try {
      const response = await fetch("/api/generate-campaign", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ candidateName: name, party, homeState, states: stateCatalog.map(([stateName]) => ({ name: stateName })) }) });
      const generated = await response.json() as GeneratedCampaign;
      setCandidateSummary(generated.summary);
      setCampaignSource(generated.source);
      setStates(buildStates(generated.stateLeans));
      setBlocs(buildBlocs(generated.blocs));
    } catch {
      const fallbackLeans = stateCatalog.map(([stateName]) => ({ name: stateName, lean: Math.round((Math.random() * 50 - 25) * 10) / 10 }));
      setCandidateSummary(`${name} is a ${party.toLowerCase()} candidate from ${homeState} with an unpredictable coalition and no obligation to resemble ordinary politics.`);
      setCampaignSource("random-fallback");
      setStates(buildStates(fallbackLeans));
      setBlocs(buildBlocs());
    } finally {
      setIsGenerating(false);
    }
    setScreen("campaign");
  }

  if (screen === "home") return (
    <main className="campaign-shell">
      <header className="topbar"><button className="brand-lockup brand-button" onClick={() => setScreen("home")}><div className="brand-mark"><Vote size={18} strokeWidth={2.4} /></div><div><p className="eyebrow">FANTASY CANDIDATE</p><p className="brand-title">The 2032 race</p></div></button><div className="topbar-status">A POLITICAL CAREER IN 30 DAYS</div><button className="help-button" aria-label="Open help"><CircleHelp size={19} /></button></header>
      <section className="home-hero"><div className="home-copy"><p className="eyebrow accent">A 30-DAY POLITICAL SIMULATION</p><h1>Say anything.<br /><span>Win the map.</span></h1><p className="home-lede">Build a candidate from nothing, face a new political test every day, and watch America decide what you stand for.</p><button className="primary-action" onClick={() => setScreen("setup")}>Design your candidate <ArrowRight size={17} /></button></div><div className="home-signal"><div className="signal-line"><span className="live-dot" /> THE CAMPAIGN IS LIVE</div><div className="signal-number">30</div><div className="signal-label">DAYS TO MAKE<br />YOUR CASE</div><div className="signal-rule" /><p>Every answer becomes part of your record. Every state is listening.</p></div></section>
      <section className="how-section"><div><p className="eyebrow">THE PREMISE</p><h2>Politics, played<br />in your own words.</h2></div><div className="rule-grid"><div className="rule-card"><span>01</span><Sparkles size={18} /><h3>Shape the candidate</h3><p>Choose your identity, party, and starting point. An AI campaign brief gives you a foundation to defend or reinvent.</p></div><div className="rule-card"><span>02</span><Radio size={18} /><h3>Face the moment</h3><p>One event arrives each day. Answer reporters, make promises, change positions, or take the conversation somewhere unexpected.</p></div><div className="rule-card"><span>03</span><Vote size={18} /><h3>Move the map</h3><p>Your words change voter blocs, state polling, your public identity, and the electoral path to 270.</p></div></div></section>
      <section className="rules-band"><div><p className="eyebrow accent">THE RULES</p><h2>Thirty prompts.<br />One election.</h2></div><div className="rules-list"><p><b>01</b> You have 30 days and one major event per day.</p><p><b>02</b> Type any response. There are no dialogue wheels.</p><p><b>03</b> The AI interprets your intent; the simulation decides the consequences.</p><p><b>04</b> Win at least 270 electoral votes on Election Day.</p></div></section>
    </main>
  );

  if (screen === "setup") return (
    <main className="campaign-shell">
      <header className="topbar"><button className="brand-lockup brand-button" onClick={() => setScreen("home")}><div className="brand-mark"><Vote size={18} strokeWidth={2.4} /></div><div><p className="eyebrow">FANTASY CANDIDATE</p><p className="brand-title">The 2032 race</p></div></button><div className="topbar-status">BEFORE DAY 1</div><button className="help-button" aria-label="Open help"><CircleHelp size={19} /></button></header>
      <section className="setup-shell"><div className="setup-intro"><p className="eyebrow accent">BEFORE DAY 1</p><h1>Who is asking<br /><span>for the vote?</span></h1><p>Start with a few facts. Then let the campaign generator invent the electorate, the map, and the strange coalition you have to win.</p></div><form className="setup-form" onSubmit={startCampaign}><label>Candidate name<input value={candidateName} onChange={(event) => setCandidateName(event.target.value)} placeholder="Your name" autoFocus /></label><label>Political identity<select value={party} onChange={(event) => setParty(event.target.value as Party)}><option>Independent</option><option>Democrat</option><option>Republican</option></select></label><label>Home state<select value={homeState} onChange={(event) => setHomeState(event.target.value)}>{stateCatalog.map(([stateName]) => <option key={stateName}>{stateName}</option>)}</select></label><div className="setup-preview"><div className="preview-heading"><span className="eyebrow">CAMPAIGN GENERATOR</span><Sparkles size={16} /></div><p>{candidateName.trim() ? `${candidateName.trim()} · ${party} · ${homeState}` : "Your candidate · Party · Home state"}</p><small>AI will invent your starting blocs and state leans. Reality is not a requirement.</small></div><button className="primary-action" type="submit" disabled={!candidateName.trim() || isGenerating}>{isGenerating ? "Inventing the electorate..." : "Begin Day 1"} <ArrowRight size={17} /></button></form></section>
    </main>
  );

  function submitResponse(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!response.trim()) return;

    const words = response.toLowerCase();
    const isJobsFocused = /job|wage|factory|worker|manufactur|union/.test(words);
    const isCostFocused = /cost|price|tax|rent|health|grocery|inflation/.test(words);
    const lift = isJobsFocused || isCostFocused ? 1.1 : 0.45;
    const focus = isJobsFocused ? "working-class voters" : isCostFocused ? "college suburbs" : "undecided voters";

    setStates((current) => current.map((state, index) => {
      const isTarget = ["Michigan", "Pennsylvania", "Wisconsin", "Arizona"].includes(state.name);
      const adjustment = isTarget ? lift + (index % 2 === 0 ? 0.15 : 0) : lift * 0.18;
      return { ...state, you: clamp(state.you + adjustment, 35, 60), opponent: clamp(state.opponent - adjustment * 0.68, 35, 60) };
    }));
    setBlocs((current) => current.map((bloc) => {
      const matches = (isJobsFocused && /working|rural/.test(bloc.name.toLowerCase())) || (isCostFocused && /suburb|young/.test(bloc.name.toLowerCase()));
      return matches ? { ...bloc, you: clamp(bloc.you + 2.2, 0, 100), change: bloc.change + 0.9 } : bloc;
    }));
    setLastAction(`Response filed. The model read it as ${isJobsFocused ? "an economic populist message" : isCostFocused ? "a cost-of-living message" : "a broad leadership message"}, lifting ${focus}.`);
    setResponse("");
    setEventIndex((current) => current + 1);
  }

  return (
    <main className="campaign-shell">
      <header className="topbar">
        <div className="brand-lockup"><div className="brand-mark"><Vote size={18} strokeWidth={2.4} /></div><div><p className="eyebrow">FANTASY CANDIDATE</p><p className="brand-title">The 2032 race</p></div></div>
        <div className="topbar-status"><span className="live-dot" /> LIVE SIMULATION <span className="status-divider" /> DAY 1 OF 30</div>
        <button className="help-button" aria-label="Open help"><CircleHelp size={19} /></button>
      </header>

      <div className="campaign-grid">
        <section className="main-column">
          <div className="race-heading"><div><p className="eyebrow accent">GENERAL ELECTION</p><h1>{candidateName}.<br /><span>Make it count.</span></h1><p className="candidate-subline">{party} · {homeState}</p></div><div className="opponent-card"><span className="opponent-label">YOUR OPPONENT</span><strong>Morgan Hale</strong><span className="party-tag">REPUBLICAN</span></div></div>
          <div className="candidate-brief"><Sparkles size={15} /><span>{candidateSummary}</span><small>{campaignSource === "openai" ? "AI WORLD" : "RANDOM WORLD"}</small></div><div className="poll-strip"><div className="poll-side player"><span>YOU</span><strong>{national.you.toFixed(1)}%</strong><small><ArrowUpRight size={13} /> Fictional starting point</small></div><div className="poll-bar"><div className="poll-fill player-fill" style={{ width: `${national.you}%` }} /><div className="poll-fill opponent-fill" style={{ width: `${national.opponent}%` }} /></div><div className="poll-side opponent"><span>HALE</span><strong>{national.opponent.toFixed(1)}%</strong><small>Fictional starting point</small></div></div>

          <section className="map-panel"><div className="panel-heading"><div><p className="eyebrow">ELECTORAL COLLEGE</p><h2>The road to 270</h2></div><div className="map-legend"><span><i className="legend-swatch you-swatch" /> You</span><span><i className="legend-swatch opponent-swatch" /> Hale</span><span><i className="legend-swatch tossup-swatch" /> Toss-up</span></div></div><div className="map-wrap"><ComposableMap projection="geoAlbersUsa" projectionConfig={{ scale: 920 }} width={900} height={520} className="us-map"><Geographies geography={geoUrl}>{({ geographies }) => geographies.map((geo) => { const state = states.find((item) => item.name === geo.properties?.name); return <Geography key={geo.rsmKey} geography={geo} fill={stateFill(state)} stroke="#15202c" strokeWidth={0.7} className="state-shape" onMouseEnter={() => state && setActiveState(state)} onMouseLeave={() => setActiveState(null)} />; })}</Geographies></ComposableMap>{activeState && <div className="state-tooltip"><div><span>{activeState.name}</span><strong>{activeState.electoralVotes} EV</strong></div><p><b>{activeState.you.toFixed(1)}%</b> you <span>vs.</span> <b>{activeState.opponent.toFixed(1)}%</b> Hale</p><small>{activeState.you > activeState.opponent ? "You lead" : "Hale leads"} by {Math.abs(activeState.you - activeState.opponent).toFixed(1)} pts</small></div>}</div><div className="map-foot"><span><MapPin size={14} /> Hover a state to inspect the race</span><span><b>{electoralCount("you")}</b> of 270 electoral votes projected</span></div></section>

          <section className="response-panel"><div className="event-meta"><span className="on-air"><Radio size={13} /> ON AIR</span><span>{question.label}</span><span><Clock3 size={14} /> DAY {eventIndex + 1} OF 30</span></div><p className="eyebrow accent">QUESTION {eventIndex + 1}</p><h2>{question.question}</h2><p className="event-context">{question.context} <span>·</span> Your response becomes part of your record.</p><form onSubmit={submitResponse}><textarea value={response} onChange={(event) => setResponse(event.target.value)} placeholder="Say what you believe..." maxLength={500} aria-label="Your campaign response" /><div className="composer-footer"><span>{response.length}/500</span><button type="submit" disabled={!response.trim()}>Submit response <Send size={15} /></button></div></form><p className="action-log">{lastAction}</p></section>
        </section>

        <aside className="side-column"><section className="score-card"><div className="score-card-heading"><span className="eyebrow">PROJECTED ELECTORAL VOTE</span><span className="score-trend"><ArrowUpRight size={14} /> +18</span></div><div className="score-number">{electoralCount("you")} <span>/ 538</span></div><div className="score-meter"><span style={{ width: `${(electoralCount("you") / 538) * 100}%` }} /></div><div className="score-foot"><span>270 to win</span><strong>{electoralCount("you") >= 270 ? "Winning" : "Behind by " + Math.max(0, 270 - electoralCount("you"))}</strong></div></section><section className="blocs-panel"><div className="panel-heading compact"><div><p className="eyebrow">THE ELECTORATE</p><h2>Voter blocs</h2></div><button className="text-button">View all <ChevronRight size={15} /></button></div><div className="blocs-list">{blocs.map((bloc) => <div className="bloc-row" key={bloc.name}><div className="bloc-name"><i style={{ backgroundColor: bloc.color }} /><span>{bloc.name}</span><small>{bloc.share}%</small></div><div className="bloc-meter"><span style={{ width: `${bloc.you}%`, backgroundColor: bloc.color }} /></div><div className={`bloc-change ${bloc.change > 0 ? "positive" : "negative"}`}>{bloc.change > 0 ? "+" : ""}{bloc.change.toFixed(1)}</div></div>)}</div></section><section className="states-panel"><div className="panel-heading compact"><div><p className="eyebrow">BATTLEGROUND WATCH</p><h2>Closest states</h2></div><span className="tossup-count">4 toss-ups</span></div><div className="state-list">{states.slice().sort((a, b) => Math.abs(a.you - a.opponent) - Math.abs(b.you - b.opponent)).slice(0, 5).map((state) => <button key={state.name} className="state-row" onMouseEnter={() => setActiveState(state)}><span className="state-abbr">{state.abbreviation}</span><span className="state-name">{state.name}</span><span className="state-margin" data-positive={state.you > state.opponent}>{state.you > state.opponent ? "+" : ""}{(state.you - state.opponent).toFixed(1)}</span><ChevronRight size={14} /></button>)}</div></section><div className="footer-note">Your campaign is a living model. Every response changes what voters think you stand for.</div></aside>
      </div>
    </main>
  );
}
