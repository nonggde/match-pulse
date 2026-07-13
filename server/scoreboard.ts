import type { Match, MatchEvent, MatchStatus } from '../src/lib/types.js'

type RecordLike = Record<string, unknown>

const SCOREBOARD_URL = process.env.SCOREBOARD_URL
  || 'https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world/scoreboard'

const ymd = (date: Date) => date.toISOString().slice(0, 10).replaceAll('-', '')

const dateWindow = () => {
  const start = new Date(Date.now() - 3 * 86_400_000)
  const end = new Date(Date.now() + 7 * 86_400_000)
  return `${ymd(start)}-${ymd(end)}`
}

const number = (value: unknown, fallback = 0) => {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

const statusOf = (value: RecordLike): MatchStatus => {
  const state = String(value.state ?? '')
  const name = String(value.name ?? '')
  if (state === 'post' || /final|full.time/i.test(name)) return 'FINAL'
  if (state === 'in' || /progress|half|extra.time/i.test(name)) return 'LIVE'
  return 'UPCOMING'
}

const eventMinute = (detail: RecordLike) => {
  const display = String((detail.clock as RecordLike | undefined)?.displayValue ?? '')
  const parsed = Number.parseInt(display, 10)
  return Number.isFinite(parsed) ? parsed : Math.floor(number((detail.clock as RecordLike | undefined)?.value) / 60)
}

const eventsOf = (competition: RecordLike, status: MatchStatus): MatchEvent[] => {
  const details = Array.isArray(competition.details) ? competition.details as RecordLike[] : []
  const events = details.flatMap((detail): MatchEvent[] => {
    const type = String((detail.type as RecordLike | undefined)?.text ?? '')
    const athlete = ((detail.athletesInvolved as RecordLike[] | undefined)?.[0]?.displayName as string | undefined)
    if (/goal/i.test(type)) return [{
      minute: eventMinute(detail), title: 'Goal', detail: athlete ? `${athlete} changed the match.` : 'The score changed.', kind: 'goal',
    }]
    if (/card/i.test(type)) return [{
      minute: eventMinute(detail), title: type, detail: athlete ? `${athlete} was booked.` : 'Disciplinary update.', kind: 'card',
    }]
    return []
  }).sort((a, b) => b.minute - a.minute).slice(0, 5)

  if (events.length) return events
  return [{
    minute: status === 'UPCOMING' ? 0 : 1,
    title: status === 'UPCOMING' ? 'Match scheduled' : 'Kickoff',
    detail: 'The public World Cup scoreboard is following this fixture.',
    kind: 'kickoff',
  }]
}

export function scoreboardEventToMatch(event: RecordLike): Match | undefined {
  const competition = (Array.isArray(event.competitions) ? event.competitions[0] : undefined) as RecordLike | undefined
  if (!competition) return undefined
  const competitors = Array.isArray(competition.competitors) ? competition.competitors as RecordLike[] : []
  const home = competitors.find((item) => item.homeAway === 'home')
  const away = competitors.find((item) => item.homeAway === 'away')
  if (!home || !away) return undefined

  const homeTeam = home.team as RecordLike | undefined
  const awayTeam = away.team as RecordLike | undefined
  const homeName = String(homeTeam?.displayName ?? homeTeam?.name ?? '')
  const awayName = String(awayTeam?.displayName ?? awayTeam?.name ?? '')
  const startTime = String(event.date ?? competition.date ?? '')
  if (!homeName || !awayName || !startTime) return undefined

  const rawStatus = (competition.status ?? event.status ?? {}) as RecordLike
  const statusType = (rawStatus.type ?? {}) as RecordLike
  const status = statusOf(statusType)
  const minute = status === 'LIVE' ? Math.max(1, Math.floor(number(rawStatus.clock) / 60)) : status === 'FINAL' ? 90 : 0
  const score = status === 'UPCOMING' ? undefined : { home: number(home.score), away: number(away.score) }
  const events = eventsOf(competition, status)
  const goals = score ? score.home + score.away : 0
  const pulse = Math.max(38, Math.min(96, 48 + goals * 8 + events.length * 3 + (status === 'LIVE' ? 16 : 0)))
  const headline = (competition.headlines as RecordLike[] | undefined)?.[0]
  const insight = String(headline?.description
    ?? (status === 'LIVE'
      ? `${homeName} and ${awayName} are live. The room refreshes every 15 seconds.`
      : status === 'FINAL'
        ? `${awayName} at ${homeName} is complete.`
        : `${homeName} hosts ${awayName} in the next World Cup window.`))

  return {
    id: `scoreboard-${String(event.id ?? competition.id ?? startTime)}`,
    competition: String(competition.altGameNote ?? 'FIFA World Cup'),
    home: homeName,
    away: awayName,
    startTime: new Date(startTime).toISOString(),
    venue: String((competition.venue as RecordLike | undefined)?.fullName ?? (event.venue as RecordLike | undefined)?.displayName ?? 'World Cup venue'),
    status,
    minute,
    score,
    outcomes: [],
    pulse,
    insight,
    events,
    verified: false,
  }
}

export async function scoreboardMatches(): Promise<Match[]> {
  const response = await fetch(`${SCOREBOARD_URL}?dates=${dateWindow()}`, {
    headers: { 'User-Agent': 'MatchPulse/1.0' },
  })
  if (!response.ok) throw new Error(`Live scoreboard failed: ${response.status}`)
  const data = await response.json() as { events?: RecordLike[] }
  return (data.events ?? []).flatMap((event) => {
    const match = scoreboardEventToMatch(event)
    return match ? [match] : []
  }).sort((a, b) => {
    const rank = (match: Match) => match.status === 'LIVE' ? 0 : match.status === 'UPCOMING' ? 1 : 2
    return rank(a) - rank(b) || Math.abs(new Date(a.startTime).getTime() - Date.now()) - Math.abs(new Date(b.startTime).getTime() - Date.now())
  }).slice(0, 10)
}
