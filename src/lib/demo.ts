import type { Match } from './types.js'
const base = Date.now()
export const demoMatches: Match[] = [
  {
    id: 'demo-arg-ned', competition: 'World Cup', home: 'Argentina', away: 'Netherlands',
    startTime: new Date(base - 48 * 60_000).toISOString(), venue: 'MetLife Stadium', status: 'LIVE', minute: 72,
    score: { home: 2, away: 1 }, pulse: 88, verified: false,
    insight: 'Argentina controls the ball, but the match just became unstable.',
    outcomes: [{ label: 'Argentina', pct: 68, delta: 8.4 }, { label: 'Draw', pct: 21, delta: -2.1 }, { label: 'Netherlands', pct: 11, delta: -6.3 }],
    events: [
      { minute: 69, title: 'Probability swing', detail: 'Argentina moved eight points after sustained pressure.', kind: 'shift' },
      { minute: 61, title: 'Goal - Netherlands', detail: 'The deficit is cut and the pulse spikes.', kind: 'goal' },
      { minute: 48, title: 'Yellow card', detail: 'Midfield pressure is starting to carry risk.', kind: 'card' },
      { minute: 1, title: 'Kickoff', detail: 'The live room opened with a balanced line.', kind: 'kickoff' },
    ],
  },
  {
    id: 'demo-jpn-bra', competition: 'World Cup', home: 'Japan', away: 'Brazil',
    startTime: new Date(base + 95 * 60_000).toISOString(), venue: 'Hard Rock Stadium', status: 'UPCOMING', minute: 0,
    pulse: 54, verified: false, insight: 'Brazil leads the fair line; Japan is the crowd upset pick.',
    outcomes: [{ label: 'Japan', pct: 22, delta: 1.8 }, { label: 'Draw', pct: 26, delta: 0.4 }, { label: 'Brazil', pct: 52, delta: -2.2 }],
    events: [{ minute: 0, title: 'Line watch', detail: 'Japan has gained support through the morning.', kind: 'shift' }, { minute: 0, title: 'Room open', detail: 'Friendly fan predictions are now open.', kind: 'kickoff' }],
  },
  {
    id: 'demo-usa-mar', competition: 'World Cup', home: 'United States', away: 'Morocco',
    startTime: new Date(base + 220 * 60_000).toISOString(), venue: 'SoFi Stadium', status: 'UPCOMING', minute: 0,
    pulse: 63, verified: false, insight: 'The narrowest line on the board. One moment can flip it.',
    outcomes: [{ label: 'United States', pct: 38, delta: -1.1 }, { label: 'Draw', pct: 30, delta: 0.8 }, { label: 'Morocco', pct: 32, delta: 0.3 }],
    events: [{ minute: 0, title: 'Tight fair line', detail: 'Only six points separate the two teams.', kind: 'shift' }],
  },
  {
    id: 'demo-fra-mex', competition: 'World Cup', home: 'France', away: 'Mexico',
    startTime: new Date(base - 190 * 60_000).toISOString(), venue: 'Mercedes-Benz Stadium', status: 'FINAL', minute: 90,
    score: { home: 3, away: 2 }, pulse: 94, verified: false, insight: 'Five goals and a late winner made this the match of the day.',
    outcomes: [{ label: 'France', pct: 100, delta: 41 }, { label: 'Draw', pct: 0, delta: -20 }, { label: 'Mexico', pct: 0, delta: -21 }],
    events: [{ minute: 87, title: 'Goal - France', detail: 'A late winner closes a five-goal match.', kind: 'goal' }, { minute: 74, title: 'Goal - Mexico', detail: 'The game levels and the pulse reaches 96.', kind: 'goal' }, { minute: 1, title: 'Kickoff', detail: 'France opened as the verified favourite.', kind: 'kickoff' }],
  },
]
