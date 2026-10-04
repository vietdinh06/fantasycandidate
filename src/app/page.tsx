"use client";

import { FormEvent, useMemo, useState } from "react";
import { ComposableMap, Geographies, Geography } from "react-simple-maps";
import { ArrowUpRight, ChevronRight, CircleHelp, Clock3, MapPin, Radio, Send, Vote } from "lucide-react";

type Candidate = "you" | "opponent";

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

const geoUrl = "https://cdn.jsdelivr.net/npm/us-atlas@3/states-10m.json";

const initialStates: StatePoll[] = [
  { name: "Arizona", abbreviation: "AZ", electoralVotes: 11, you: 48.2, opponent: 46.1, category: "tossup" },
  { name: "Florida", abbreviation: "FL", electoralVotes: 30, you: 44.8, opponent: 50.2, category: "lean" },
  { name: "Georgia", abbreviation: "GA", electoralVotes: 16, you: 47.1, opponent: 48.8, category: "tossup" },
  { name: "Michigan", abbreviation: "MI", electoralVotes: 15, you: 49.5, opponent: 44.8, category: "lean" },
  { name: "Nevada", abbreviation: "NV", electoralVotes: 6, you: 48.8, opponent: 46.7, category: "tossup" },
  { name: "North Carolina", abbreviation: "NC", electoralVotes: 16, you: 45.9, opponent: 49.4, category: "lean" },
  { name: "Pennsylvania", abbreviation: "PA", electoralVotes: 19, you: 48.7, opponent: 47.6, category: "tossup" },
  { name: "Wisconsin", abbreviation: "WI", electoralVotes: 10, you: 49.2, opponent: 46.5, category: "lean" },
];

const initialBlocs: Bloc[] = [
  { name: "Working-class voters", share: 26, you: 51, change: 1.8, color: "#e7a36f" },
  { name: "College suburbs", share: 22, you: 47, change: -0.4, color: "#79b5ad" },
  { name: "Young voters", share: 18, you: 54, change: 2.7, color: "#d87985" },
  { name: "Older voters", share: 21, you: 42, change: -1.1, color: "#a99ad8" },
  { name: "Rural voters", share: 13, you: 36, change: -0.8, color: "#d7c06b" },
];

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
  const [states, setStates] = useState(initialStates);
  const [blocs, setBlocs] = useState(initialBlocs);
  const [response, setResponse] = useState("");
  const [eventIndex, setEventIndex] = useState(0);
  const [activeState, setActiveState] = useState<StatePoll | null>(initialStates[6]);
  const [lastAction, setLastAction] = useState("Campaign launch: your first response is waiting.");

  const question = eventQuestions[eventIndex % eventQuestions.length];
  const national = useMemo(() => {
    const you = states.reduce((total, state) => total + state.you, 0) / states.length;
    const opponent = states.reduce((total, state) => total + state.opponent, 0) / states.length;
    return { you, opponent };
  }, [states]);

  const electoralCount = (candidate: Candidate) =>
    states.reduce((total, state) => total + (state[candidate] > state[candidate === "you" ? "opponent" : "you"] ? state.electoralVotes : 0), 0);

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
        <div className="topbar-status"><span className="live-dot" /> LIVE SIMULATION <span className="status-divider" /> DAY 18 OF 120</div>
        <button className="help-button" aria-label="Open help"><CircleHelp size={19} /></button>
      </header>

      <div className="campaign-grid">
        <section className="main-column">
          <div className="race-heading"><div><p className="eyebrow accent">GENERAL ELECTION</p><h1>Win the map.<br /><span>Write the story.</span></h1></div><div className="opponent-card"><span className="opponent-label">YOUR OPPONENT</span><strong>Morgan Hale</strong><span className="party-tag">REPUBLICAN</span></div></div>
          <div className="poll-strip"><div className="poll-side player"><span>YOU</span><strong>{national.you.toFixed(1)}%</strong><small><ArrowUpRight size={13} /> +1.4 this week</small></div><div className="poll-bar"><div className="poll-fill player-fill" style={{ width: `${national.you}%` }} /><div className="poll-fill opponent-fill" style={{ width: `${national.opponent}%` }} /></div><div className="poll-side opponent"><span>HALE</span><strong>{national.opponent.toFixed(1)}%</strong><small>−0.9 this week</small></div></div>

          <section className="map-panel"><div className="panel-heading"><div><p className="eyebrow">ELECTORAL COLLEGE</p><h2>The road to 270</h2></div><div className="map-legend"><span><i className="legend-swatch you-swatch" /> You</span><span><i className="legend-swatch opponent-swatch" /> Hale</span><span><i className="legend-swatch tossup-swatch" /> Toss-up</span></div></div><div className="map-wrap"><ComposableMap projection="geoAlbersUsa" projectionConfig={{ scale: 920 }} width={900} height={520} className="us-map"><Geographies geography={geoUrl}>{({ geographies }) => geographies.map((geo) => { const state = states.find((item) => item.name === geo.properties?.name); return <Geography key={geo.rsmKey} geography={geo} fill={stateFill(state)} stroke="#15202c" strokeWidth={0.7} className="state-shape" onMouseEnter={() => state && setActiveState(state)} onMouseLeave={() => setActiveState(null)} />; })}</Geographies></ComposableMap>{activeState && <div className="state-tooltip"><div><span>{activeState.name}</span><strong>{activeState.electoralVotes} EV</strong></div><p><b>{activeState.you.toFixed(1)}%</b> you <span>vs.</span> <b>{activeState.opponent.toFixed(1)}%</b> Hale</p><small>{activeState.you > activeState.opponent ? "You lead" : "Hale leads"} by {Math.abs(activeState.you - activeState.opponent).toFixed(1)} pts</small></div>}</div><div className="map-foot"><span><MapPin size={14} /> Hover a state to inspect the race</span><span><b>{electoralCount("you")}</b> of 270 electoral votes projected</span></div></section>

          <section className="response-panel"><div className="event-meta"><span className="on-air"><Radio size={13} /> ON AIR</span><span>{question.label}</span><span><Clock3 size={14} /> 2 days until next event</span></div><p className="eyebrow accent">QUESTION {eventIndex + 1}</p><h2>{question.question}</h2><p className="event-context">{question.context} <span>·</span> Your response will be heard by every bloc.</p><form onSubmit={submitResponse}><textarea value={response} onChange={(event) => setResponse(event.target.value)} placeholder="Say what you believe..." maxLength={500} aria-label="Your campaign response" /><div className="composer-footer"><span>{response.length}/500</span><button type="submit" disabled={!response.trim()}>Submit response <Send size={15} /></button></div></form><p className="action-log">{lastAction}</p></section>
        </section>

        <aside className="side-column"><section className="score-card"><div className="score-card-heading"><span className="eyebrow">PROJECTED ELECTORAL VOTE</span><span className="score-trend"><ArrowUpRight size={14} /> +18</span></div><div className="score-number">{electoralCount("you")} <span>/ 538</span></div><div className="score-meter"><span style={{ width: `${(electoralCount("you") / 538) * 100}%` }} /></div><div className="score-foot"><span>270 to win</span><strong>{electoralCount("you") >= 270 ? "Winning" : "Behind by " + Math.max(0, 270 - electoralCount("you"))}</strong></div></section><section className="blocs-panel"><div className="panel-heading compact"><div><p className="eyebrow">THE ELECTORATE</p><h2>Voter blocs</h2></div><button className="text-button">View all <ChevronRight size={15} /></button></div><div className="blocs-list">{blocs.map((bloc) => <div className="bloc-row" key={bloc.name}><div className="bloc-name"><i style={{ backgroundColor: bloc.color }} /><span>{bloc.name}</span><small>{bloc.share}%</small></div><div className="bloc-meter"><span style={{ width: `${bloc.you}%`, backgroundColor: bloc.color }} /></div><div className={`bloc-change ${bloc.change > 0 ? "positive" : "negative"}`}>{bloc.change > 0 ? "+" : ""}{bloc.change.toFixed(1)}</div></div>)}</div></section><section className="states-panel"><div className="panel-heading compact"><div><p className="eyebrow">BATTLEGROUND WATCH</p><h2>Closest states</h2></div><span className="tossup-count">4 toss-ups</span></div><div className="state-list">{states.slice().sort((a, b) => Math.abs(a.you - a.opponent) - Math.abs(b.you - b.opponent)).slice(0, 5).map((state) => <button key={state.name} className="state-row" onMouseEnter={() => setActiveState(state)}><span className="state-abbr">{state.abbreviation}</span><span className="state-name">{state.name}</span><span className="state-margin" data-positive={state.you > state.opponent}>{state.you > state.opponent ? "+" : ""}{(state.you - state.opponent).toFixed(1)}</span><ChevronRight size={14} /></button>)}</div></section><div className="footer-note">Your campaign is a living model. Every response changes what voters think you stand for.</div></aside>
      </div>
    </main>
  );
}
