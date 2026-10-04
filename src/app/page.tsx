"use client";

import { FormEvent, useMemo, useState } from "react";
import { ComposableMap, Geographies, Geography } from "react-simple-maps";
import { ArrowRight, ArrowUpRight, ChevronRight, CircleHelp, Clock3, MapPin, Radio, Send, Sparkles, Vote } from "lucide-react";

type Candidate = "you" | "opponent";
type Party = "Democrat" | "Republican" | "Independent";
type Screen = "home" | "setup" | "campaign";
type CampaignTab = "live" | "history";
type CampaignEvent = { label: string; question: string; context: string; scenario: string };

type StatePoll = {
  name: string;
  abbreviation: string;
  electoralVotes: number;
  population: number;
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
  population?: number;
};

type GeneratedCampaign = {
  source: "openai" | "random-fallback";
  summary: string;
  blocs: Bloc[];
  stateLeans: Array<{ name: string; lean: number }>;
};

type HistorySnapshot = {
  day: number;
  states: StatePoll[];
  blocs: Bloc[];
};

type OpponentReaction = { response: string; reaction: string; news: string; source: string };

type ResponseInterpretation = {
  intent: string;
  policySignals: Record<string, number>;
  affectedBlocs: string[];
  promises: string[];
  contradictions: string[];
  mediaNarrative: string;
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
    return { name, abbreviation, electoralVotes, population: Math.round(300_000 + Math.random() * 39_700_000), lean: fictionalLean, you, opponent: 100 - you, category: Math.abs(margin) < 4 ? "tossup" : Math.abs(margin) < 10 ? "lean" : "safe" };
  });
}

function buildBlocs(generatedBlocs?: Bloc[]): Bloc[] {
  if (generatedBlocs?.length) return generatedBlocs.map((bloc) => ({ ...bloc, population: bloc.population ?? Math.round(350_000_000 * bloc.share / 100) }));
  return [
    { name: "Dog voters", share: 26, you: 46, change: 0, color: "#e7a36f", population: 91_000_000 },
    { name: "Toilet paper traditionalists", share: 22, you: 46, change: 0, color: "#79b5ad", population: 77_000_000 },
    { name: "People who hate overhead lighting", share: 18, you: 48, change: 0, color: "#d87985", population: 63_000_000 },
    { name: "Weekend philosophers", share: 21, you: 45, change: 0, color: "#a99ad8", population: 73_500_000 },
    { name: "Snack economy voters", share: 13, you: 43, change: 0, color: "#d7c06b", population: 45_500_000 },
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
  const [background, setBackground] = useState("");
  const [candidateSummary, setCandidateSummary] = useState("");
  const [campaignSource, setCampaignSource] = useState<GeneratedCampaign["source"]>("random-fallback");
  const [isGenerating, setIsGenerating] = useState(false);
  const [isGeneratingBackground, setIsGeneratingBackground] = useState(false);
  const [isRespiningSummary, setIsRespiningSummary] = useState(false);
  const [campaignId, setCampaignId] = useState<string | null>(null);
  const [campaignTab, setCampaignTab] = useState<CampaignTab>("live");
  const [history, setHistory] = useState<HistorySnapshot[]>([]);
  const [states, setStates] = useState<StatePoll[]>([]);
  const [blocs, setBlocs] = useState<Bloc[]>([]);
  const [response, setResponse] = useState("");
  const [lastResponse, setLastResponse] = useState("Your next answer will become part of the record.");
  const [isSubmittingResponse, setIsSubmittingResponse] = useState(false);
  const [eventIndex, setEventIndex] = useState(0);
  const [activeState, setActiveState] = useState<StatePoll | null>(null);
  const [cursor, setCursor] = useState({ x: 0, y: 0 });
  const [lastAction, setLastAction] = useState("Your first response is waiting.");
  const [currentEvent, setCurrentEvent] = useState<CampaignEvent>({ ...eventQuestions[0], scenario: "The campaign opens with a question nobody expected to matter." });
  const [eventNews, setEventNews] = useState("The campaign opens with a question nobody expected to matter.");
  const [opponentReaction, setOpponentReaction] = useState<OpponentReaction>({ response: "Morgan Hale is waiting to see which version of you walks onto the stage.", reaction: "The opposition is watching for a contradiction.", news: "The race begins without a settled story.", source: "pending" });

  const question = currentEvent;
  const national = useMemo(() => {
    const you = states.reduce((total, state) => total + state.you, 0) / states.length;
    const opponent = states.reduce((total, state) => total + state.opponent, 0) / states.length;
    return { you, opponent };
  }, [states]);

  const electoralCount = (candidate: Candidate) =>
    states.reduce((total, state) => total + (state[candidate] > state[candidate === "you" ? "opponent" : "you"] ? state.electoralVotes : 0), 0);

  async function generateBackground() {
    if (!candidateName.trim()) return;
    setIsGeneratingBackground(true);
    try {
      const response = await fetch("/api/generate-candidate", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ kind: "background", candidateName, party, homeState }) });
      const generated = await response.json() as { value?: string };
      if (generated.value) setBackground(generated.value);
    } finally {
      setIsGeneratingBackground(false);
    }
  }

  async function respinSummary() {
    if (!candidateName.trim() || !background.trim()) return;
    setIsRespiningSummary(true);
    try {
      const response = await fetch("/api/generate-candidate", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ kind: "summary", candidateName, party, homeState, background }) });
      const generated = await response.json() as { value?: string };
      if (generated.value) setCandidateSummary(generated.value);
    } finally {
      setIsRespiningSummary(false);
    }
  }

  async function startCampaign(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const name = candidateName.trim();
    if (!name) return;
    setIsGenerating(true);
    try {
      const response = await fetch("/api/generate-campaign", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ candidateName: name, party, homeState, background, states: stateCatalog.map(([stateName]) => ({ name: stateName })) }) });
      const generated = await response.json() as GeneratedCampaign;
      setCandidateSummary(generated.summary);
      setCampaignSource(generated.source);
      const initialStates = buildStates(generated.stateLeans);
      const initialBlocs = buildBlocs(generated.blocs);
      setStates(initialStates);
      setBlocs(initialBlocs);
      setHistory([{ day: 1, states: initialStates, blocs: initialBlocs }]);
      const openingResponse = await fetch("/api/generate-event", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ day: 1, candidateName: name, candidateSummary: generated.summary, background, voterBlocs: initialBlocs.map((bloc) => bloc.name) }) });
      const opening = await openingResponse.json() as { event?: CampaignEvent; news?: string };
      const openingEvent = opening.event || { ...eventQuestions[0], scenario: "The campaign opens with a question nobody expected to matter." };
      setCurrentEvent(openingEvent);
      setEventNews(opening.news || openingEvent.scenario);
      const saved = await fetch("/api/campaigns", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ candidateName: name, party, homeState, background, summary: generated.summary, states: initialStates, blocs: initialBlocs, event: { category: openingEvent.context, prompt: openingEvent.question, scenario: openingEvent.scenario } }) });
      if (saved.ok) setCampaignId((await saved.json() as { campaignId?: string }).campaignId || null);
    } catch {
      const fallbackLeans = stateCatalog.map(([stateName]) => ({ name: stateName, lean: Math.round((Math.random() * 50 - 25) * 10) / 10 }));
      setCandidateSummary(`${name} is a ${party.toLowerCase()} candidate from ${homeState} with an unpredictable coalition and no obligation to resemble ordinary politics.`);
      setCampaignSource("random-fallback");
      const initialStates = buildStates(fallbackLeans);
      const initialBlocs = buildBlocs();
      setStates(initialStates);
      setBlocs(initialBlocs);
      setHistory([{ day: 1, states: initialStates, blocs: initialBlocs }]);
      const fallbackEvent = { ...eventQuestions[0], scenario: "The campaign opens with a question nobody expected to matter." };
      setCurrentEvent(fallbackEvent);
      setEventNews(fallbackEvent.scenario);
      const saved = await fetch("/api/campaigns", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ candidateName: name, party, homeState, background, summary: `${name} is a ${party.toLowerCase()} candidate from ${homeState} with an unpredictable coalition and no obligation to resemble ordinary politics.`, states: initialStates, blocs: initialBlocs, event: { category: fallbackEvent.context, prompt: fallbackEvent.question, scenario: fallbackEvent.scenario } }) });
      if (saved.ok) setCampaignId((await saved.json() as { campaignId?: string }).campaignId || null);
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
      <section className="setup-shell"><div className="setup-intro"><p className="eyebrow accent">BEFORE DAY 1</p><h1>Who is asking<br /><span>for the vote?</span></h1><p>Start with a few facts. Then let the campaign generator invent the electorate, the map, and the strange coalition you have to win.</p></div><form className="setup-form" onSubmit={startCampaign}><label>Candidate name<input value={candidateName} onChange={(event) => setCandidateName(event.target.value)} placeholder="Your name" autoFocus /></label><label>Political identity<select value={party} onChange={(event) => setParty(event.target.value as Party)}><option>Independent</option><option>Democrat</option><option>Republican</option></select></label><label>Home state<select value={homeState} onChange={(event) => setHomeState(event.target.value)}>{stateCatalog.map(([stateName]) => <option key={stateName}>{stateName}</option>)}</select></label><label>Candidate background<textarea className="background-input" value={background} onChange={(event) => setBackground(event.target.value)} placeholder="Write the strange, sincere, or completely implausible story behind your candidate..." /><button className="secondary-action" type="button" onClick={generateBackground} disabled={!candidateName.trim() || isGeneratingBackground}><Sparkles size={14} /> {isGeneratingBackground ? "Writing a background..." : "Have AI create one"}</button></label><div className="setup-preview"><div className="preview-heading"><span className="eyebrow">CAMPAIGN GENERATOR</span><Sparkles size={16} /></div><p>{candidateName.trim() ? `${candidateName.trim()} · ${party} · ${homeState}` : "Your candidate · Party · Home state"}</p><small>AI will invent your starting blocs and state leans. Reality is not a requirement.</small></div><button className="primary-action" type="submit" disabled={!candidateName.trim() || isGenerating}>{isGenerating ? "Inventing the electorate..." : "Begin Day 1"} <ArrowRight size={17} /></button></form></section>
    </main>
  );

  async function submitResponse(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const submittedText = response.trim();
    if (!submittedText || isSubmittingResponse) return;
    setIsSubmittingResponse(true);

    let interpretation: ResponseInterpretation;
    let interpretationSource = "fallback";
    try {
      const interpreted = await fetch("/api/interpret-response", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ text: submittedText, blocNames: blocs.map((bloc) => bloc.name), candidateSummary }) });
      const result = await interpreted.json() as { source?: string; interpretation?: ResponseInterpretation };
      interpretation = result.interpretation || { intent: "unclassified instinct", policySignals: {}, affectedBlocs: [], promises: [], contradictions: [], mediaNarrative: "The electorate is still trying to decide what that meant." };
      interpretationSource = result.source || interpretationSource;
    } catch {
      interpretation = { intent: "unclassified instinct", policySignals: {}, affectedBlocs: [], promises: [], contradictions: [], mediaNarrative: "The electorate is still trying to decide what that meant." };
    }

    const signalValues = Object.values(interpretation.policySignals);
    const signalStrength = signalValues.length ? signalValues.reduce((total, signal) => total + signal, 0) / signalValues.length : 0.25;
    const lift = clamp(0.45 + Math.abs(signalStrength) * 0.85, 0.35, 1.35);
    const affectedBlocs = new Set(interpretation.affectedBlocs);

    const nextStates = states.map((state, index) => {
      const isTarget = index % 4 === 0 || Math.abs(state.you - state.opponent) < 4;
      const adjustment = isTarget ? lift + (index % 2 === 0 ? 0.15 : 0) : lift * 0.18;
      return { ...state, you: clamp(state.you + adjustment, 35, 60), opponent: clamp(state.opponent - adjustment * 0.68, 35, 60) };
    });
    const nextBlocs = blocs.map((bloc, index) => {
      const matches = affectedBlocs.size ? affectedBlocs.has(bloc.name) : index < 2;
      return matches ? { ...bloc, you: clamp(bloc.you + 2.2, 0, 100), change: bloc.change + 0.9 } : bloc;
    });
    setStates(nextStates);
    setBlocs(nextBlocs);
    setHistory((current) => [...current, { day: current.length + 1, states: nextStates, blocs: nextBlocs }]);
    setLastAction(`Response filed as ${interpretation.intent}. ${interpretation.mediaNarrative} (${interpretationSource}).`);
    try {
      const [opponentResult, eventResult] = await Promise.all([
        fetch("/api/opponent-react", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ candidateName, opponentName: "Morgan Hale", candidateSummary, event: question.question, playerResponse: submittedText, interpretation }) }),
        fetch("/api/generate-event", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ day: eventIndex + 2, candidateName, candidateSummary, background, previousResponse: submittedText, voterBlocs: nextBlocs.map((bloc) => bloc.name) }) }),
      ]);
      const opponent = await opponentResult.json() as { source?: string; response?: string; reaction?: string; news?: string };
      const nextEvent = await eventResult.json() as { event?: CampaignEvent; news?: string };
      if (opponent.response) setOpponentReaction({ response: opponent.response, reaction: opponent.reaction || "The opposition is recalculating.", news: opponent.news || "The response is moving through the campaign.", source: opponent.source || "fallback" });
      if (nextEvent.event) setCurrentEvent(nextEvent.event);
      setEventNews(`${opponent.news || "The response is moving through the campaign."} ${nextEvent.news || "A new question is waiting."}`);
    } catch {
      setEventNews("The response is moving through the campaign. A new question is waiting.");
    }
    try {
      if (campaignId) {
        const saved = await fetch(`/api/campaigns/${campaignId}/responses`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ day: eventIndex + 1, text: submittedText, interpretation, consequences: { lift, affectedBlocs: interpretation.affectedBlocs, mediaNarrative: interpretation.mediaNarrative }, event: { category: question.context, prompt: question.question }, states: nextStates, blocs: nextBlocs }) });
        if (!saved.ok) setLastAction((current) => `${current} The local result is ready, but the archive could not be updated.`);
      }
    } catch {
      setLastAction((current) => `${current} The local result is ready, but the archive could not be updated.`);
    } finally {
      setLastResponse(submittedText);
      setResponse("");
      setEventIndex((current) => current + 1);
      setIsSubmittingResponse(false);
    }
  }

  if (campaignTab === "history") return <HistoryView candidateName={candidateName} snapshots={history} currentStates={states} currentBlocs={blocs} onBack={() => setCampaignTab("live")} />;

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
          <div className="candidate-brief"><Sparkles size={15} /><span>{candidateSummary}</span><small>{campaignSource === "openai" ? "AI WORLD" : "RANDOM WORLD"}</small><button className="brief-action" type="button" onClick={respinSummary} disabled={isRespiningSummary || !background.trim()}>{isRespiningSummary ? "Respinning..." : "Respin summary"}</button></div><div className="campaign-tabs"><button className="active" onClick={() => setCampaignTab("live")}>Live campaign</button><button onClick={() => setCampaignTab("history")}>History <span>{history.length}</span></button><span className="campaign-id">{campaignId ? `Campaign ${campaignId.slice(0, 7)}` : "Saving campaign..."}</span></div><div className="poll-strip"><div className="poll-side player"><span>YOU</span><strong>{national.you.toFixed(1)}%</strong><small><ArrowUpRight size={13} /> Fictional starting point</small></div><div className="poll-bar"><div className="poll-fill player-fill" style={{ width: `${national.you}%` }} /><div className="poll-fill opponent-fill" style={{ width: `${national.opponent}%` }} /></div><div className="poll-side opponent"><span>HALE</span><strong>{national.opponent.toFixed(1)}%</strong><small>Fictional starting point</small></div></div>

          <section className="map-panel"><div className="panel-heading"><div><p className="eyebrow">ELECTORAL COLLEGE</p><h2>The road to 270</h2></div><div className="map-legend"><span><i className="legend-swatch you-swatch" /> You</span><span><i className="legend-swatch opponent-swatch" /> Hale</span><span><i className="legend-swatch tossup-swatch" /> Toss-up</span></div></div><div className="map-wrap" onMouseMove={(event) => { const bounds = event.currentTarget.getBoundingClientRect(); setCursor({ x: event.clientX - bounds.left, y: event.clientY - bounds.top }); }}><ComposableMap projection="geoAlbersUsa" projectionConfig={{ scale: 920 }} width={900} height={520} className="us-map"><Geographies geography={geoUrl}>{({ geographies }) => geographies.map((geo) => { const state = states.find((item) => item.name === geo.properties?.name); return <Geography key={geo.rsmKey} geography={geo} fill={stateFill(state)} stroke="#15202c" strokeWidth={0.7} className="state-shape" onMouseEnter={() => state && setActiveState(state)} onMouseLeave={() => setActiveState(null)} />; })}</Geographies></ComposableMap>{activeState && <div className="state-tooltip state-tooltip-follow" style={{ left: `${cursor.x + 16}px`, top: `${cursor.y + 16}px` }}><div><span>{activeState.name}</span><strong>{activeState.electoralVotes} EV</strong></div><p><b>{activeState.you.toFixed(1)}%</b> you <span>vs.</span> <b>{activeState.opponent.toFixed(1)}%</b> Hale</p><small>{activeState.population.toLocaleString()} residents · {activeState.you > activeState.opponent ? "You lead" : "Hale leads"} by {Math.abs(activeState.you - activeState.opponent).toFixed(1)} pts</small></div>}</div><div className="map-foot"><span><MapPin size={14} /> Hover a state to inspect the race</span><span><b>{electoralCount("you")}</b> of 270 electoral votes projected</span></div></section>

        </section>

        <section className="response-panel"><div className="event-meta"><span className="on-air"><Radio size={13} /> ON AIR</span><span>{question.label}</span><span><Clock3 size={14} /> DAY {eventIndex + 1} OF 30</span></div><p className="eyebrow accent">QUESTION {eventIndex + 1}</p><h2>{question.question}</h2><p className="event-context">{question.context} <span>·</span> {question.scenario}</p><form onSubmit={submitResponse}><textarea value={response} onChange={(event) => setResponse(event.target.value)} placeholder="Say what you believe..." maxLength={500} aria-label="Your campaign response" /><div className="composer-footer"><span>{response.length}/500</span><button type="submit" disabled={!response.trim() || isSubmittingResponse}>{isSubmittingResponse ? "Interpreting..." : "Submit response"} <Send size={15} /></button></div></form><p className="action-log">{lastAction}</p></section>

        <section className="reaction-grid"><article className="reaction-card candidate-reaction"><div className="reaction-label"><Sparkles size={15} /> YOUR ANSWER</div><p className="reaction-quote">{lastResponse}</p><p className="reaction-text">{eventNews}</p><span className="reaction-source">NATIONAL REACTION</span></article><article className="reaction-card opponent-reaction"><div className="reaction-label"><Radio size={15} /> MORGAN HALE</div><p className="reaction-quote">{opponentReaction.response}</p><p className="reaction-text">{opponentReaction.reaction}</p><span className="reaction-source">{opponentReaction.source.toUpperCase()} OPPOSITION RESPONSE</span></article></section>

        <aside className="side-column"><section className="score-card"><div className="score-card-heading"><span className="eyebrow">PROJECTED ELECTORAL VOTE</span><span className="score-trend"><ArrowUpRight size={14} /> +18</span></div><div className="score-number">{electoralCount("you")} <span>/ 538</span></div><div className="score-meter"><span style={{ width: `${(electoralCount("you") / 538) * 100}%` }} /></div><div className="score-foot"><span>270 to win</span><strong>{electoralCount("you") >= 270 ? "Winning" : "Behind by " + Math.max(0, 270 - electoralCount("you"))}</strong></div></section><section className="blocs-panel"><div className="panel-heading compact"><div><p className="eyebrow">THE ELECTORATE</p><h2>Voter blocs</h2></div><button className="text-button">View all <ChevronRight size={15} /></button></div><div className="blocs-list">{blocs.map((bloc) => <div className="bloc-row" key={bloc.name}><div className="bloc-name"><i style={{ backgroundColor: bloc.color }} /><span>{bloc.name}</span><small>{bloc.share}% · {(bloc.population || 0).toLocaleString()}</small></div><div className="bloc-meter"><span style={{ width: `${bloc.you}%`, backgroundColor: bloc.color }} /></div><div className={`bloc-change ${bloc.change > 0 ? "positive" : bloc.change < 0 ? "negative" : "flat"}`}>{bloc.change > 0 ? "+" : ""}{bloc.change.toFixed(1)}</div></div>)}</div></section><section className="states-panel"><div className="panel-heading compact"><div><p className="eyebrow">BATTLEGROUND WATCH</p><h2>Closest states</h2></div><span className="tossup-count">{states.filter((state) => state.category === "tossup").length} toss-ups</span></div><div className="state-list">{states.slice().sort((a, b) => Math.abs(a.you - a.opponent) - Math.abs(b.you - b.opponent)).slice(0, 5).map((state) => <button key={state.name} className="state-row" onMouseEnter={() => setActiveState(state)}><span className="state-abbr">{state.abbreviation}</span><span className="state-name">{state.name}</span><span className="state-margin" data-positive={state.you > state.opponent}>{state.you > state.opponent ? "+" : ""}{(state.you - state.opponent).toFixed(1)}</span><ChevronRight size={14} /></button>)}</div></section><div className="footer-note">Your campaign is a living model. Every response changes what voters think your stand for.</div></aside>
      </div>
    </main>
  );
}

function HistoryView({ candidateName, snapshots, currentStates, currentBlocs, onBack }: { candidateName: string; snapshots: HistorySnapshot[]; currentStates: StatePoll[]; currentBlocs: Bloc[]; onBack: () => void }) {
  const [selectedDay, setSelectedDay] = useState(snapshots[snapshots.length - 1]?.day || 1);
  const snapshot = snapshots.find((item) => item.day === selectedDay) || snapshots[0];
  const selectedStates = snapshot?.states || [];
  const selectedBlocs = snapshot?.blocs || [];
  const leadingStates = selectedStates.slice().sort((a, b) => Math.abs(a.you - a.opponent) - Math.abs(b.you - b.opponent)).slice(0, 5);

  return <main className="campaign-shell"><header className="topbar"><button className="brand-lockup brand-button" onClick={onBack}><div className="brand-mark"><Vote size={18} strokeWidth={2.4} /></div><div><p className="eyebrow">FANTASY CANDIDATE</p><p className="brand-title">{candidateName}&apos;s record</p></div></button><div className="topbar-status">CAMPAIGN HISTORY</div><button className="help-button" aria-label="Return to live campaign" onClick={onBack}><ArrowRight size={19} /></button></header><div className="history-shell"><div className="history-heading"><div><p className="eyebrow accent">THE RECORD</p><h1>Every day<br /><span>leaves a mark.</span></h1></div><button className="secondary-action history-back" onClick={onBack}>Back to live campaign <ArrowRight size={14} /></button></div><div className="history-days">{snapshots.map((item) => <button key={item.day} className={item.day === selectedDay ? "active" : ""} onClick={() => setSelectedDay(item.day)}><small>DAY</small><strong>{item.day}</strong></button>)}</div>{snapshot && <div className="history-grid"><section className="history-map-panel"><div className="panel-heading"><div><p className="eyebrow">DAY {snapshot.day} SNAPSHOT</p><h2>Where the map stood</h2></div><span className="history-current-label">{snapshot.day === snapshots[snapshots.length - 1]?.day ? "CURRENT" : "ARCHIVED"}</span></div><div className="history-map"><ComposableMap projection="geoAlbersUsa" projectionConfig={{ scale: 920 }} width={900} height={520} className="us-map"><Geographies geography={geoUrl}>{({ geographies }) => geographies.map((geo) => { const state = selectedStates.find((item) => item.name === geo.properties?.name); return <Geography key={geo.rsmKey} geography={geo} fill={stateFill(state)} stroke="#15202c" strokeWidth={0.7} className="state-shape" />; })}</Geographies></ComposableMap></div><div className="history-compare">{leadingStates.map((state) => { const current = currentStates.find((item) => item.name === state.name); const delta = current ? (current.you - current.opponent) - (state.you - state.opponent) : 0; return <div key={state.name}><span>{state.abbreviation}</span><strong>{state.you.toFixed(1)} / {state.opponent.toFixed(1)}</strong><small className={delta >= 0 ? "positive" : "negative"}>{delta >= 0 ? "+" : ""}{delta.toFixed(1)} since then</small></div>; })}</div></section><section className="history-side"><div className="history-card"><p className="eyebrow">VOTER BLOC CENSUS</p><h2>Who was listening?</h2><div className="history-blocs">{selectedBlocs.map((bloc) => { const current = currentBlocs.find((item) => item.name === bloc.name); const delta = current ? current.you - bloc.you : 0; return <div key={bloc.name}><div><span>{bloc.name}</span><small>{(bloc.population || 0).toLocaleString()}</small></div><div className="history-bloc-meter"><span style={{ width: `${bloc.you}%`, backgroundColor: bloc.color }} /></div><em className={delta >= 0 ? "positive" : "negative"}>{delta >= 0 ? "+" : ""}{delta.toFixed(1)} pts</em></div>; })}</div></div><div className="history-card"><p className="eyebrow">CLOSEST STATES</p><h2>Pressure points</h2><div className="history-state-list">{leadingStates.map((state) => <div key={state.name}><span>{state.name}</span><strong>{state.you > state.opponent ? "You" : "Hale"} +{Math.abs(state.you - state.opponent).toFixed(1)}</strong></div>)}</div></div></section></div>}</div></main>;
}
