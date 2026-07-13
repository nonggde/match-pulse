import type { Match, MatchEvent, MatchStatus, Outcome } from '../src/lib/types.js'
type RecordLike = Record<string, unknown>
const finite = (value: unknown) => Number.isFinite(Number(value))

export const timestampIso = (value: unknown): string | undefined => {
  const numeric = Number(value)
  const date = Number.isFinite(numeric)
    ? new Date(numeric < 10_000_000_000 ? numeric * 1000 : numeric)
    : new Date(String(value ?? ''))
  return Number.isFinite(date.getTime()) ? date.toISOString() : undefined
}

const labelFor = (name: string, home: string, away: string) => {
  if (name === 'part1') return home
  if (name === 'part2') return away
  if (name === 'draw') return 'Draw'
  return name.replace(/(^|[_-])\w/g, (value) => value.replace(/[_-]/, ' ').toUpperCase())
}

export function fairOutcomes(raw: unknown, home: string, away: string): Outcome[] {
  const markets = Array.isArray(raw) ? raw as RecordLike[] : []
  const priced = (market: RecordLike) => Array.isArray(market.PriceNames)
    && (market.PriceNames as unknown[]).some((_, index) => finite((market.Pct as unknown[])?.[index]))
  const market = markets.find((item) => String(item.SuperOddsType ?? '').includes('1X2') && priced(item)) ?? markets.find(priced)
  if (!market) return []
  const names = market.PriceNames as string[]
  const values = market.Pct as unknown[]
  return names.flatMap((name, index) => {
    const pct = Number(values[index])
    return Number.isFinite(pct) && pct >= 0 ? [{ label: labelFor(name, home, away), pct, delta: 0 }] : []
  }).slice(0, 3)
}

export function findScore(raw: unknown): { home: number; away: number; status?: string; minute?: number; timestamp?: number } | undefined {
  const seen = new Set<unknown>()
  const candidates: NonNullable<ReturnType<typeof findScore>>[] = []
  const walk = (value: unknown): void => {
    if (!value || typeof value !== 'object' || seen.has(value)) return
    seen.add(value)
    const item = value as RecordLike
    const soccer = (item.scoreSoccer ?? item.ScoreSoccer) as RecordLike | undefined
    const participant1 = soccer?.Participant1 as RecordLike | undefined
    const participant2 = soccer?.Participant2 as RecordLike | undefined
    const soccerHome = Number((participant1?.Total as RecordLike | undefined)?.Goals)
    const soccerAway = Number((participant2?.Total as RecordLike | undefined)?.Goals)
    const dataSoccer = (item.dataSoccer ?? item.DataSoccer) as RecordLike | undefined
    const clock = item.clock as RecordLike | undefined
    const status = String(item.gameState ?? item.statusSoccerId ?? item.status ?? item.Status ?? item.matchStatus ?? item.action ?? '')
    const minute = Number(dataSoccer?.Minutes ?? item.minute ?? item.Minute ?? (finite(clock?.seconds) ? Math.floor(Number(clock?.seconds) / 60) : 0)) || undefined
    const timestamp = Number(item.ts ?? item.Ts ?? 0) || undefined
    if (Number.isFinite(soccerHome) && Number.isFinite(soccerAway)) {
      candidates.push({ home: soccerHome, away: soccerAway, status, minute, timestamp })
    }
    const home = Number(item.homeScore ?? item.HomeScore ?? item.Participant1Score ?? item.ScoreHome)
    const away = Number(item.awayScore ?? item.AwayScore ?? item.Participant2Score ?? item.ScoreAway)
    if (Number.isFinite(home) && Number.isFinite(away)) {
      candidates.push({ home, away, status, minute, timestamp })
    }
    for (const child of Object.values(item)) walk(child)
  }
  walk(raw)
  return candidates.sort((a, b) => (b.timestamp ?? 0) - (a.timestamp ?? 0) || (b.minute ?? 0) - (a.minute ?? 0))[0]
}

const statusOf = (startTime: string, score?: ReturnType<typeof findScore>): MatchStatus => {
  if (/final|finished|complete|ended|ft|f2|fpe|fet|end/i.test(score?.status ?? '')) return 'FINAL'
  if (score && (/live|play|half|period|i2|h11|h21|et/i.test(score.status ?? '') || score.minute)) return 'LIVE'
  const delta = Date.now() - new Date(startTime).getTime()
  if (delta >= 0 && delta < 4 * 60 * 60_000) return 'LIVE'
  return delta >= 4 * 60 * 60_000 ? 'FINAL' : 'UPCOMING'
}

const eventsFor = (status: MatchStatus, score: ReturnType<typeof findScore>, outcomes: Outcome[]): MatchEvent[] => {
  const leader = outcomes.reduce<Outcome | undefined>((best, item) => !best || item.pct > best.pct ? item : best, undefined)
  const events: MatchEvent[] = []
  if (score && score.home + score.away > 0) events.push({ minute: score.minute ?? 90, title: 'Score update', detail: `The live score is ${score.home}-${score.away}.`, kind: 'goal' })
  if (leader) events.push({ minute: score?.minute ?? 0, title: 'Fair-line leader', detail: `${leader.label} leads the verified line at ${leader.pct.toFixed(0)}%.`, kind: 'shift' })
  events.push({ minute: status === 'UPCOMING' ? 0 : 1, title: status === 'UPCOMING' ? 'Room open' : 'Kickoff', detail: 'Match Pulse is following the TxLINE feed.', kind: 'kickoff' })
  return events
}

export function toMatch(fixture: RecordLike, odds: unknown, scores: unknown): Match | undefined {
  const id = String(fixture.FixtureId ?? ''), home = String(fixture.Participant1 ?? ''), away = String(fixture.Participant2 ?? ''), startTime = timestampIso(fixture.StartTime)
  if (!id || !home || !away || !startTime) return undefined
  const outcomes = fairOutcomes(odds, home, away)
  const score = findScore(scores), status = statusOf(startTime, score), sorted = [...outcomes].sort((a, b) => b.pct - a.pct)
  const spread = (sorted[0]?.pct ?? 0) - (sorted[1]?.pct ?? 0), goals = score ? score.home + score.away : 0
  const pulse = Math.max(34, Math.min(98, Math.round(58 + goals * 7 - spread * .35 + (status === 'LIVE' ? 14 : 0))))
  const leader = sorted[0]
  return {
    id, competition: String(fixture.Competition ?? 'World Cup'), home, away, startTime, venue: 'World Cup venue', status,
    minute: score?.minute ?? (status === 'FINAL' ? 90 : 0), score: score ? { home: score.home, away: score.away } : undefined,
    outcomes, pulse, insight: !leader
      ? status === 'UPCOMING' ? 'Fixture confirmed. The TxLINE fair line is waiting for its first priced snapshot.' : 'The score feed is active. Market pricing is temporarily unavailable.'
      : spread < 8 ? 'The fair line is tight. One moment can flip this match.' : `${leader.label} leads the verified line, but the room is still moving.`,
    events: eventsFor(status, score, outcomes), verified: true,
  }
}
