import { useEffect, useMemo, useState } from 'react'
import {
  Activity, AlertTriangle, ArrowRight, CalendarDays, Check, ChevronRight, CircleDot,
  Clock3, Copy, Database, Radio, RefreshCw, Share2, ShieldCheck, Sparkles, Timer,
  Trophy, Users, X,
} from 'lucide-react'
import './App.css'
import type { MatchFeed } from './lib/types'

type View = 'room' | 'fixtures' | 'picks'

const formatKickoff = (date: string) => new Intl.DateTimeFormat('en', {
  month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
}).format(new Date(date))

const teamCode = (name: string) => name.split(/\s+/).map((part) => part[0]).join('').slice(0, 3).toUpperCase()

function App() {
  const [feed, setFeed] = useState<MatchFeed | null>(null)
  const [selectedId, setSelectedId] = useState('')
  const [view, setView] = useState<View>('room')
  const [loading, setLoading] = useState(true)
  const [feedError, setFeedError] = useState<string | null>(null)
  const [shareOpen, setShareOpen] = useState(false)
  const [copied, setCopied] = useState(false)
  const [picks, setPicks] = useState<Record<string, string>>(() => {
    try { return JSON.parse(localStorage.getItem('match-pulse-picks') || '{}') as Record<string, string> }
    catch { return {} }
  })

  const loadFeed = async (showSpinner = true) => {
    if (showSpinner) setLoading(true)
    try {
      const response = await fetch('/api/matches')
      if (!response.ok) throw new Error('feed unavailable')
      const next = (await response.json()) as MatchFeed
      if (!next.matches.length) throw new Error('feed returned no current fixtures')
      setFeed(next)
      setFeedError(null)
      setSelectedId((current) => next.matches.some((match) => match.id === current) ? current : next.matches[0].id)
    } catch {
      const message = 'The current feed could not be refreshed. Showing the last good snapshot while the connection recovers.'
      setFeedError(message)
      setFeed((current) => current ? { ...current, stale: true, note: message } : current)
    } finally { if (showSpinner) setLoading(false) }
  }

  useEffect(() => {
    void loadFeed()
    const timer = window.setInterval(() => void loadFeed(false), 15_000)
    return () => window.clearInterval(timer)
  }, [])

  const selected = useMemo(
    () => feed?.matches.find((match) => match.id === selectedId) ?? feed?.matches[0],
    [feed, selectedId],
  )
  const providerLabel = !feed ? 'Connecting feed' : feed.stale ? 'Feed delayed' : feed.provider === 'txline' ? 'TxLINE connected' : feed.provider === 'scoreboard' ? 'Live scoreboard' : 'Demo feed'
  const pickOptions: Array<{ label: string; pct?: number }> = selected?.outcomes.length
    ? selected.outcomes.map((outcome) => ({ label: outcome.label, pct: outcome.pct }))
    : selected ? [{ label: selected.home }, { label: 'Draw' }, { label: selected.away }] : []

  const choosePick = (matchId: string, outcome: string) => {
    const next = { ...picks, [matchId]: outcome }
    setPicks(next)
    localStorage.setItem('match-pulse-picks', JSON.stringify(next))
  }

  const copyMoment = async () => {
    if (!selected || !feed) return
    const score = selected.score ? `${selected.score.home}-${selected.score.away}` : 'up next'
    const source = feed.stale ? 'Last good snapshot' : feed.provider === 'txline' ? 'Verified by TxLINE' : feed.provider === 'scoreboard' ? 'Current World Cup scoreboard' : 'Demo scenario'
    const text = `${selected.home} ${score} ${selected.away} | Match Pulse ${selected.pulse}/100 | ${source}.`
    await navigator.clipboard.writeText(text)
    setCopied(true)
    window.setTimeout(() => setCopied(false), 1600)
  }

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
          <span className={`status-dot ${feed?.stale ? 'stale' : feed?.source ?? 'loading'}`} /><span title={feed?.note ?? feedError ?? undefined}>{providerLabel}</span>
          <button type="button" title="Refresh feed" onClick={() => void loadFeed()} disabled={loading}>
            <RefreshCw size={16} className={loading ? 'spin' : ''} />
          </button>
        </div>
      </header>

      {feed && <div className={`trust-ribbon provider-${feed.provider}`}>
        <div><Database size={14} /><span>Source</span><strong>{feed.provider === 'txline' ? 'TxODDS TxLINE' : feed.provider === 'scoreboard' ? 'World Cup scoreboard' : 'Static demo'}</strong></div>
        <div><ShieldCheck size={14} /><span>Verification</span><strong>{feed.stale ? 'Last good snapshot' : feed.provider === 'txline' ? 'Devnet / Level 1' : feed.provider === 'scoreboard' ? 'Scores only' : 'Clearly labelled'}</strong></div>
        <div><Timer size={14} /><span>Refresh</span><strong>Every 15 seconds</strong></div>
        <div><Clock3 size={14} /><span>Snapshot</span><strong>{feed.stale ? 'Delayed / ' : ''}{new Date(feed.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</strong></div>
      </div>}

      {!feed || !selected ? <main className="feed-gate" aria-live="polite">
        <div className="gate-grid" aria-hidden="true"><span /><span /><span /><span /><span /><span /></div>
        <div className="gate-copy">
          {feedError ? <AlertTriangle size={24} /> : <Activity size={24} className="gate-pulse" />}
          <span className="eyebrow">Match Pulse / live system</span>
          <h1>{feedError ? 'Feed temporarily unavailable' : 'Establishing verified feed'}</h1>
          <p>{feedError ?? 'Loading the latest fixtures, scores and fair probabilities from the server.'}</p>
          {feedError && <button type="button" onClick={() => void loadFeed()} disabled={loading}><RefreshCw size={16} className={loading ? 'spin' : ''} /> Retry feed</button>}
        </div>
      </main> : <>

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
          <div className="verified-note"><ShieldCheck size={17} /><span>{feed.stale
            ? 'Showing the last good snapshot while the live feed reconnects.'
            : feed.provider === 'txline'
              ? 'Fixtures, scores and fair probabilities are verified by TxODDS TxLINE.'
            : feed.provider === 'scoreboard'
              ? 'Current fixtures and scores come from the live World Cup scoreboard. TxLINE verification is pending.'
              : 'This is a static demo scenario, not a current match feed.'}</span></div>
        </aside>

        <section className="match-stage">
          <div className="stadium-visual" aria-hidden="true" />
          <div className="stage-meta">
            <span><Trophy size={15} /> {selected.competition}</span>
            <span><CalendarDays size={15} /> {formatKickoff(selected.startTime)}</span>
            <span className={`source-chip ${feed.provider}`}><CircleDot size={14} /> {feed.stale ? 'Last good snapshot' : selected.verified ? 'TxLINE verified' : feed.provider === 'scoreboard' ? 'Current scoreboard' : 'Demo scenario'}</span>
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
            {selected.outcomes.length ? <div className="probability-row">{selected.outcomes.map((outcome) => <div key={outcome.label}>
              <span>{outcome.label}</span><strong>{outcome.pct.toFixed(0)}%</strong><small>{Math.abs(outcome.delta) >= .05
                ? `${outcome.delta > 0 ? '+' : ''}${outcome.delta.toFixed(1)} line move`
                : 'Current fair probability'}</small>
            </div>)}</div> : <div className="market-empty"><Radio size={16} /><div><strong>TxLINE fair line pending</strong><span>The current fixture is real; no market percentage is being fabricated.</span></div></div>}
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
            <div className="pick-grid">{pickOptions.map((outcome) => <button
              key={outcome.label} className={picks[selected.id] === outcome.label ? 'picked' : ''} type="button"
              onClick={() => choosePick(selected.id, outcome.label)}
            >{picks[selected.id] === outcome.label && <Check size={14} />}<span>{outcome.label}</span><strong>{outcome.pct == null ? 'Pick' : `${outcome.pct.toFixed(0)}%`}</strong></button>)}</div>
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
          <div className="moment-pulse"><Activity size={18} /><span>Pulse {selected.pulse}/100</span><small>{feed.stale ? 'Last good snapshot' : selected.verified ? 'TxLINE verified' : feed.provider === 'scoreboard' ? 'Current scoreboard' : 'Demo scenario'}</small></div>
          <button className="copy-button" type="button" onClick={() => void copyMoment()}>{copied ? <Check size={17} /> : <Copy size={17} />}{copied ? 'Copied' : 'Copy share text'}</button>
        </section>
      </div>}
      </>}
    </div>
  )
}

export default App
