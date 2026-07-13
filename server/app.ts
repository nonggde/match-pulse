import cors from 'cors'
import 'dotenv/config'
import express from 'express'
import { demoMatches } from '../src/lib/demo.js'
import type { Match, MatchFeed } from '../src/lib/types.js'
import { scoreboardMatches } from './scoreboard.js'
import { toMatch } from './transform.js'
import { txGet } from './txline.js'

const app = express()
let cache: { at: number; feed: MatchFeed } | undefined

app.use(cors())
app.use(express.json())

async function liveMatches(): Promise<Match[]> {
  const epochDay = Math.floor(Date.now() / 86_400_000) - 1
  const raw = await txGet(`/api/fixtures/snapshot?startEpochDay=${epochDay}`)
  const fixtures = (Array.isArray(raw) ? raw : []) as Record<string, unknown>[]
  const preferred = fixtures.filter((item) => /world cup|international friend/i.test(String(item.Competition ?? '')))
  const relevant = (preferred.length ? preferred : fixtures).filter((fixture) => {
    const rawStart = Number(fixture.StartTime)
    const start = Number.isFinite(rawStart) ? (rawStart < 10_000_000_000 ? rawStart * 1000 : rawStart) : new Date(String(fixture.StartTime ?? '')).getTime()
    return Number.isFinite(start) && start > Date.now() - 4 * 86_400_000 && start < Date.now() + 14 * 86_400_000
  })
  const candidates = relevant.sort((a, b) => {
    const time = (item: Record<string, unknown>) => {
      const value = Number(item.StartTime)
      return Number.isFinite(value) ? (value < 10_000_000_000 ? value * 1000 : value) : new Date(String(item.StartTime ?? '')).getTime()
    }
    return Math.abs(time(a) - Date.now()) - Math.abs(time(b) - Date.now())
  }).slice(0, 16), output: Match[] = []
  let cursor = 0

  async function worker() {
    while (cursor < candidates.length && output.length < 10) {
      const fixture = candidates[cursor++], id = String(fixture.FixtureId ?? '')
      if (!id) continue
      const [odds, scores] = await Promise.all([
        txGet(`/api/odds/snapshot/${id}`).catch(() => []),
        txGet(`/api/scores/snapshot/${id}`).catch(() => []),
      ])
      const match = toMatch(fixture, odds, scores)
      if (match) output.push(match)
    }
  }

  await Promise.all(Array.from({ length: 5 }, () => worker()))
  const rank = (match: Match) => match.status === 'LIVE' ? 0 : match.status === 'UPCOMING' ? 1 : 2
  return output.sort((a, b) => rank(a) - rank(b)
    || Math.abs(new Date(a.startTime).getTime() - Date.now()) - Math.abs(new Date(b.startTime).getTime() - Date.now())).slice(0, 10)
}

app.get('/api/health', (_request, response) => response.json({
  ok: true,
  txlineConfigured: Boolean(process.env.TXLINE_API_KEY),
  liveFallback: 'World Cup public scoreboard',
}))

app.get('/api/matches', async (_request, response) => {
  response.setHeader('Cache-Control', 'no-store, max-age=0')
  if (cache && Date.now() - cache.at < 10_000) return response.json(cache.feed)
  let txlineError = ''
  try {
    if (!process.env.TXLINE_API_KEY) throw new Error('TXLINE_API_KEY is not configured')
    const matches = await liveMatches()
    if (!matches.length) throw new Error('No currently priced TxLINE fixtures')
    const feed: MatchFeed = { source: 'live', provider: 'txline', matches, updatedAt: new Date().toISOString() }
    cache = { at: Date.now(), feed }
    return response.json(feed)
  } catch (error) {
    txlineError = error instanceof Error ? error.message : 'TxLINE unavailable'
  }

  try {
    const matches = await scoreboardMatches()
    if (!matches.length) throw new Error('No current World Cup fixtures')
    const feed: MatchFeed = {
      source: 'live', provider: 'scoreboard', matches, updatedAt: new Date().toISOString(),
      note: `Current World Cup scoreboard. TxLINE status: ${txlineError}`,
    }
    cache = { at: Date.now(), feed }
    return response.json(feed)
  } catch (scoreboardError) {
    const feed: MatchFeed = {
      source: 'demo', provider: 'demo', matches: demoMatches, updatedAt: new Date().toISOString(),
      note: `${txlineError}; ${scoreboardError instanceof Error ? scoreboardError.message : 'scoreboard unavailable'}`,
    }
    return response.json(feed)
  }
})

export default app
