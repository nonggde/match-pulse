import type { Match, MatchEvent, MatchStatus, Outcome } from '../src/lib/types.js'
type RecordLike = Record<string, unknown>
const finite = (value: unknown) => Number.isFinite(Number(value))

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

export function findScore(raw: unknown): { home: number; away: number; status?: string; minute?: number } | undefined {
  const seen = new Set<unknown>()
  const walk = (value: unknown): ReturnType<typeof findScore> => {
    if (!value || typeof value !== 'object' || seen.has(value)) return undefined
    seen.add(value)
    const item = value as RecordLike
    const home = Number(item.homeScore ?? item.HomeScore ?? item.Participant1Score ?? item.ScoreHome)
    const away = Number(item.awayScore ?? item.AwayScore ?? item.Participant2Score ?? item.ScoreAway)
    if (Number.isFinite(home) && Number.isFinite(away)) return {
      home, away, status: String(item.status ?? item.Status ?? item.matchStatus ?? ''), minute: Number(item.minute ?? item.Minute ?? item.clock ?? 0) || undefined,
    }
    for (const child of Object.values(item)) { const found = walk(child); if (found) return found }
    return undefined
  }
  return walk(raw)
}

const statusOf = (startTime: string, score?: ReturnType<typeof findScore>): MatchStatus => {
  if (/final|finished|complete|ended|ft/i.test(score?.status ?? '')) return 'FINAL'
  if (score && (/live|play|half|period/i.test(score.status ?? '') || score.minute)) return 'LIVE'
  return new Date(startTime).getTime() < Date.now() - 3 * 60 * 60_000 ? 'FINAL' : 'UPCOMING'
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
  const id = String(fixture.FixtureId ?? ''), home = String(fixture.Participant1 ?? ''), away = String(fixture.Participant2 ?? ''), startTime = String(fixture.StartTime ?? '')
  if (!id || !home || !away || !startTime) return undefined
  const outcomes = fairOutcomes(odds, home, away)
  if (!outcomes.length) return undefined
  while (outcomes.length < 3) outcomes.push({ label: outcomes.length === 1 ? 'Draw' : away, pct: 0, delta: 0 })
  const score = findScore(scores), status = statusOf(startTime, score), sorted = [...outcomes].sort((a, b) => b.pct - a.pct)
  const spread = (sorted[0]?.pct ?? 0) - (sorted[1]?.pct ?? 0), goals = score ? score.home + score.away : 0
  const pulse = Math.max(34, Math.min(98, Math.round(58 + goals * 7 - spread * .35 + (status === 'LIVE' ? 14 : 0))))
  const leader = sorted[0]
  return {
    id, competition: String(fixture.Competition ?? 'World Cup'), home, away, startTime, venue: 'World Cup venue', status,
    minute: score?.minute ?? (status === 'FINAL' ? 90 : 0), score: score ? { home: score.home, away: score.away } : undefined,
    outcomes, pulse, insight: spread < 8 ? 'The fair line is tight. One moment can flip this match.' : `${leader.label} leads the verified line, but the room is still moving.`,
    events: eventsFor(status, score, outcomes), verified: true,
  }
}
