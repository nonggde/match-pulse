import { useEffect, useMemo, useState } from 'react'
import {
  Activity, ArrowRight, CalendarDays, Check, ChevronRight, CircleDot, Clock3, Copy,
  Radio, RefreshCw, Share2, ShieldCheck, Sparkles, Trophy, Users, X,
} from 'lucide-react'
import './App.css'
import { demoMatches } from './lib/demo'
import type { MatchFeed } from './lib/types'

type View = 'room' | 'fixtures' | 'picks'

const formatKickoff = (date: string) => new Intl.DateTimeFormat('en', {
  month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
}).format(new Date(date))

const teamCode = (name: string) => name.split(/\s+/).map((part) => part[0]).join('').slice(0, 3).toUpperCase()

function App() {
  const [feed, setFeed] = useState<MatchFeed>({ source: 'demo', matches: demoMatches, updatedAt: new Date().toISOString() })
  const [selectedId, setSelectedId] = useState(demoMatches[0].id)
  const [view, setView] = useState<View>('room')
  const [loading, setLoading] = useState(true)
  const [shareOpen, setShareOpen] = useState(false)
  const [copied, setCopied] = useState(false)
  const [picks, setPicks] = useState<Record<string, string>>(() => {
    try { return JSON.parse(localStorage.getItem('match-pulse-picks') || '{}') as Record<string, string> }
    catch { return {} }
  })

  const loadFeed = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/matches')
      if (!response.ok) throw new Error('feed unavailable')
      const next = (await response.json()) as MatchFeed
      if (next.matches.length) {
        setFeed(next)
        setSelectedId((current) => next.matches.some((match) => match.id === current) ? current : next.matches[0].id)
      }
    } catch {
      setFeed({ source: 'demo', matches: demoMatches, updatedAt: new Date().toISOString() })
    } finally { setLoading(false) }
  }

  useEffect(() => {
    void loadFeed()
    const timer = window.setInterval(() => void loadFeed(), 30_000)
    return () => window.clearInterval(timer)
  }, [])

  const selected = useMemo(
    () => feed.matches.find((match) => match.id === selectedId) ?? feed.matches[0],
    [feed.matches, selectedId],
  )

  const choosePick = (matchId: string, outcome: string) => {
    const next = { ...picks, [matchId]: outcome }
    setPicks(next)
    localStorage.setItem('match-pulse-picks', JSON.stringify(next))
  }

  const copyMoment = async () => {
    const score = selected.score ? `${selected.score.home}-${selected.score.away}` : 'up next'
    const text = `${selected.home} ${score} ${selected.away} | Match Pulse ${selected.pulse}/100 | Powered by verified TxLINE data.`
    await navigator.clipboard.writeText(text)
    setCopied(true)
    window.setTimeout(() => setCopied(false), 1600)
  }

  if (!selected) return null

  return (
    <div className="app-shell">
      <header className="topbar">
        <button className="brand" type="button" onClick={() => setView('room')}>
          <span className="brand-mark"><Activity size={18} /></span>
          <span>Match Pulse</span><small>World Cup live room</small>
        </button>
        <nav aria-label="Primary navigation">
          <button className={view === 'room' ? 'active' : ''} onClick={() => setView('room')}>Live room</button>
          <button className={view === 'fixtures' ? 'active' : ''} onClick={() => setView('fixtures')}>Fixtures</button>
          <button className={view === 'picks' ? 'active' : ''} onClick={() => setView('picks')}>My picks</button>
        </nav>
        <div className="feed-state">
          <span className={`status-dot ${feed.source}`} /><span>{feed.source === 'live' ? 'TxLINE live' : 'Demo feed'}</span>
          <button type="button" title="Refresh feed" onClick={() => void loadFeed()} disabled={loading}>
            <RefreshCw size={16} className={loading ? 'spin' : ''} />
          </button>
        </div>
      </header>

      {view === 'room' && <main className="live-layout">
        <aside className="match-rail" aria-label="Matches">
          <div className="rail-title"><span>Match center</span><strong>{feed.matches.length}</strong></div>
          {feed.matches.map((match) => <button
            key={match.id} type="button" className={`match-row ${match.id === selected.id ? 'selected' : ''}`}
            onClick={() => setSelectedId(match.id)}
          >
            <span className={`match-state ${match.status.toLowerCase()}`}>{match.status === 'LIVE' ? `${match.minute}'` : match.status}</span>
            <span className="match-names"><b>{match.home}</b><b>{match.away}</b></span>
            <span className="mini-score"><b>{match.score?.home ?? '-'}</b><b>{match.score?.away ?? '-'}</b></span>
            <ChevronRight size={16} />
          </button>)}
          <div className="verified-note"><ShieldCheck size={17} /><span>Fixtures, scores and fair probabilities are read from TxODDS TxLINE.</span></div>
        </aside>

        <section className="match-stage">
          <div className="stadium-visual" aria-hidden="true" />
          <div className="stage-meta">
            <span><Trophy size={15} /> {selected.competition}</span>
            <span><CalendarDays size={15} /> {formatKickoff(selected.startTime)}</span>
            <span className="source-chip"><CircleDot size={14} /> {selected.verified ? 'Verified feed' : 'Demo scenario'}</span>
          </div>
          <div className="scoreboard">
            <div className="team home-team"><span className="team-badge">{teamCode(selected.home)}</span><h1>{selected.home}</h1><small>Home</small></div>
            <div className="score-center">
              <div className={`live-label ${selected.status.toLowerCase()}`}>{selected.status === 'LIVE' && <Radio size={14} />}{selected.status === 'LIVE' ? `LIVE ${selected.minute}'` : selected.status}</div>
              <div className="score-value"><span>{selected.score?.home ?? '-'}</span><i>:</i><span>{selected.score?.away ?? '-'}</span></div>
              <p>{selected.venue}</p>
            </div>
            <div className="team away-team"><span className="team-badge">{teamCode(selected.away)}</span><h1>{selected.away}</h1><small>Away</small></div>
          </div>
          <div className="pulse-strip">
            <div className="pulse-heading">
              <div><span className="eyebrow">Match pulse</span><strong>{selected.pulse}</strong><small>/100</small></div>
              <p>{selected.insight}</p>
            </div>
            <div className="pulse-line" style={{ '--pulse': `${selected.pulse}%` } as React.CSSProperties}><span /></div>
            <div className="probability-row">{selected.outcomes.map((outcome) => <div key={outcome.label}>
              <span>{outcome.label}</span><strong>{outcome.pct.toFixed(0)}%</strong><small>{outcome.delta > 0 ? '+' : ''}{outcome.delta.toFixed(1)} today</small>
            </div>)}</div>
          </div>
          <div className="stage-actions">
            <button className="primary-action" type="button" onClick={() => setShareOpen(true)}><Share2 size={17} /> Create moment card</button>
            <span><Clock3 size={15} /> Updated {new Date(feed.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
          </div>
        </section>

        <aside className="fan-panel">
          <section className="pick-section">
            <div className="section-title"><div><Users size={17} /><span>Call the result</span></div><small>Local fan pick</small></div>
            <p>Lock a friendly prediction before kickoff. No wallet, stake or money involved.</p>
            <div className="pick-grid">{selected.outcomes.map((outcome) => <button
              key={outcome.label} className={picks[selected.id] === outcome.label ? 'picked' : ''} type="button"
              onClick={() => choosePick(selected.id, outcome.label)}
            >{picks[selected.id] === outcome.label && <Check size={14} />}<span>{outcome.label}</span><strong>{outcome.pct.toFixed(0)}%</strong></button>)}</div>
          </section>
          <section className="timeline-section">
            <div className="section-title"><div><Radio size={17} /><span>Moment wire</span></div><small>{selected.events.length} updates</small></div>
            <ol className="event-list">{selected.events.map((event) => <li key={`${event.minute}-${event.title}`} className={event.kind}>
              <time>{event.minute}'</time><span className="event-node" /><div><strong>{event.title}</strong><p>{event.detail}</p></div>
            </li>)}</ol>
          </section>
        </aside>
      </main>}

      {view === 'fixtures' && <main className="list-view">
        <div className="page-heading"><span className="eyebrow">World Cup match center</span><h1>Every match, one clean signal.</h1><p>Browse the current TxLINE catalog and jump into a live room.</p></div>
        <div className="fixture-table">
          <div className="table-head"><span>Status</span><span>Match</span><span>Kickoff</span><span>Pulse</span><span /></div>
          {feed.matches.map((match) => <button key={match.id} onClick={() => { setSelectedId(match.id); setView('room') }}>
            <span className={`match-state ${match.status.toLowerCase()}`}>{match.status}</span>
            <span><b>{match.home}</b><i>vs</i><b>{match.away}</b></span><span>{formatKickoff(match.startTime)}</span>
            <span><Activity size={15} /> {match.pulse}</span><ArrowRight size={17} />
          </button>)}
        </div>
      </main>}

      {view === 'picks' && <main className="list-view picks-view">
        <div className="page-heading"><span className="eyebrow">Your friendly calls</span><h1>A prediction should be fun, not financial.</h1><p>Your picks stay in this browser and never touch a wallet.</p></div>
        <div className="picks-board">
          {feed.matches.filter((match) => picks[match.id]).map((match) => <button key={match.id} onClick={() => { setSelectedId(match.id); setView('room') }}>
            <span>{teamCode(match.home)} / {teamCode(match.away)}</span><div><small>Your call</small><strong>{picks[match.id]}</strong></div>
            <div><small>Current pulse</small><strong>{match.pulse}</strong></div><ArrowRight size={18} />
          </button>)}
          {!Object.keys(picks).length && <div className="empty-state"><Sparkles size={22} /><h2>No picks yet</h2><p>Open a live room and call a result.</p></div>}
        </div>
      </main>}

      {shareOpen && <div className="dialog-backdrop" role="presentation" onMouseDown={() => setShareOpen(false)}>
        <section className="moment-dialog" role="dialog" aria-modal="true" aria-label="Match moment card" onMouseDown={(event) => event.stopPropagation()}>
          <button className="close-button" type="button" title="Close" onClick={() => setShareOpen(false)}><X size={18} /></button>
          <span className="eyebrow">Match Pulse moment</span>
          <div className="moment-score"><b>{teamCode(selected.home)}</b><span>{selected.score?.home ?? '-'} : {selected.score?.away ?? '-'}</span><b>{teamCode(selected.away)}</b></div>
          <h2>{selected.insight}</h2>
          <div className="moment-pulse"><Activity size={18} /><span>Pulse {selected.pulse}/100</span><small>{feed.source === 'live' ? 'TxLINE verified' : 'Demo scenario'}</small></div>
          <button className="copy-button" type="button" onClick={() => void copyMoment()}>{copied ? <Check size={17} /> : <Copy size={17} />}{copied ? 'Copied' : 'Copy share text'}</button>
        </section>
      </div>}
    </div>
  )
}

export default App
