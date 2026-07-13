import { describe, expect, it } from 'vitest'
import { fairOutcomes, findScore, timestampIso, toMatch } from './transform.js'
describe('TxLINE transforms', () => {
  it('maps a verified 1X2 market to fan-facing labels', () => {
    expect(fairOutcomes([{ SuperOddsType: '1X2', PriceNames: ['part1', 'draw', 'part2'], Pct: [51, 27, 22] }], 'Japan', 'Brazil')).toEqual([
      { label: 'Japan', pct: 51, delta: 0 }, { label: 'Draw', pct: 27, delta: 0 }, { label: 'Brazil', pct: 22, delta: 0 },
    ])
  })
  it('finds a score in nested snapshots', () => {
    expect(findScore({ data: [{ matchStatus: 'live', HomeScore: 2, AwayScore: 1, Minute: 67 }] })).toEqual({ home: 2, away: 1, status: 'live', minute: 67 })
  })
  it('maps the official soccer score shape and keeps the latest event', () => {
    expect(findScore([
      { ts: 10, gameState: 'I2', scoreSoccer: { Participant1: { Total: { Goals: 1 } }, Participant2: { Total: { Goals: 0 } } }, dataSoccer: { Minutes: 21 } },
      { ts: 20, gameState: 'I2', scoreSoccer: { Participant1: { Total: { Goals: 1 } }, Participant2: { Total: { Goals: 1 } } }, dataSoccer: { Minutes: 44 } },
    ])).toEqual({ home: 1, away: 1, status: 'I2', minute: 44, timestamp: 20 })
  })
  it('normalizes the official epoch-millisecond kickoff time', () => {
    expect(timestampIso(1_783_987_200_000)).toBe('2026-07-14T00:00:00.000Z')
  })
  it('creates a complete match from TxLINE-shaped records', () => {
    const match = toMatch({ FixtureId: 7, Competition: 'World Cup', Participant1: 'USA', Participant2: 'Morocco', StartTime: new Date(Date.now() + 60_000).toISOString() }, [{ SuperOddsType: '1X2', PriceNames: ['part1', 'draw', 'part2'], Pct: [39, 29, 32] }], [])
    expect(match?.verified).toBe(true); expect(match?.outcomes).toHaveLength(3); expect(match?.status).toBe('UPCOMING')
  })
  it('keeps a current fixture even when a priced market is temporarily absent', () => {
    const match = toMatch({ FixtureId: 8, Competition: 'World Cup', Participant1: 'Spain', Participant2: 'France', StartTime: Date.now() + 60_000 }, [], [])
    expect(match?.outcomes).toEqual([])
    expect(match?.startTime).toMatch(/^\d{4}-/)
  })
})
