import { describe, expect, it } from 'vitest'
import { scoreboardEventToMatch } from './scoreboard.js'

describe('World Cup scoreboard transform', () => {
  it('maps a current event without inventing market probabilities', () => {
    const match = scoreboardEventToMatch({
      id: '760514',
      date: '2026-07-14T19:00:00Z',
      competitions: [{
        altGameNote: 'FIFA World Cup, Semifinal',
        venue: { fullName: 'MetLife Stadium' },
        status: { clock: 4020, type: { state: 'in', name: 'STATUS_IN_PROGRESS' } },
        competitors: [
          { homeAway: 'home', score: '2', team: { displayName: 'France' } },
          { homeAway: 'away', score: '1', team: { displayName: 'Spain' } },
        ],
        details: [{ type: { text: 'Goal' }, clock: { displayValue: "67'" }, athletesInvolved: [{ displayName: 'Example Player' }] }],
      }],
    })
    expect(match).toMatchObject({ home: 'France', away: 'Spain', status: 'LIVE', minute: 67, score: { home: 2, away: 1 }, verified: false })
    expect(match?.outcomes).toEqual([])
    expect(match?.events[0].title).toBe('Goal')
  })
})
