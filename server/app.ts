import cors from 'cors'
import 'dotenv/config'
import express from 'express'
import { demoMatches } from '../src/lib/demo.js'
import type { Match, MatchFeed } from '../src/lib/types.js'
import { toMatch } from './transform.js'
import { txGet } from './txline.js'

const app = express()
let cache: { at: number; feed: MatchFeed } | undefined

app.use(cors())
app.use(express.json())

async function liveMatches(): Promise<Match[]> {
  const raw = await txGet('/api/fixtures/snapshot')
  const fixtures = (Array.isArray(raw) ? raw : []) as Record<string, unknown>[]
  const preferred = fixtures.filter((item) => /world cup/i.test(String(item.Competition ?? '')))
  const candidates = (preferred.length ? preferred : fixtures).slice(0, 28), output: Match[] = []
  let cursor = 0

  async function worker() {
    while (cursor < candidates.length && output.length < 10) {
      const fixture = candidates[cursor++], id = String(fixture.FixtureId ?? '')
      if (!id) continue
      try {
        const [odds, scores] = await Promise.all([
          txGet(`/api/odds/snapshot/${id}`),
          txGet(`/api/scores/snapshot/${id}`).catch(() => []),
        ])
        const match = toMatch(fixture, odds, scores)
        if (match) output.push(match)
      } catch { /* A fixture can temporarily have no priced market. */ }
    }
  }

  await Promise.all(Array.from({ length: 5 }, () => worker()))
  return output.sort((a, b) => a.status === 'LIVE' && b.status !== 'LIVE'
    ? -1
    : b.status === 'LIVE' && a.status !== 'LIVE'
      ? 1
      : new Date(a.startTime).getTime() - new Date(b.startTime).getTime())
}

app.get('/api/health', (_request, response) => response.json({
  ok: true,
  txlineConfigured: Boolean(process.env.TXLINE_API_KEY),
}))

app.get('/api/matches', async (_request, response) => {
  if (cache && Date.now() - cache.at < 20_000) return response.json(cache.feed)
  try {
    const matches = await liveMatches()
    if (!matches.length) throw new Error('No currently priced TxLINE fixtures')
    const feed: MatchFeed = { source: 'live', matches, updatedAt: new Date().toISOString() }
    cache = { at: Date.now(), feed }
    response.json(feed)
  } catch (error) {
    const feed: MatchFeed = { source: 'demo', matches: demoMatches, updatedAt: new Date().toISOString() }
    response.json({ ...feed, note: error instanceof Error ? error.message : 'Live feed unavailable' })
  }
})

export default app
