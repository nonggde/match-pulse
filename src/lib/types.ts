export type MatchStatus = 'LIVE' | 'UPCOMING' | 'FINAL'
export interface Outcome { label: string; pct: number; delta: number }
export interface MatchEvent { minute: number; title: string; detail: string; kind: 'goal' | 'card' | 'shift' | 'kickoff' }
export interface Match {
  id: string; competition: string; home: string; away: string; startTime: string; venue: string
  status: MatchStatus; minute: number; score?: { home: number; away: number }; outcomes: Outcome[]
  pulse: number; insight: string; events: MatchEvent[]; verified: boolean
}
export type FeedProvider = 'txline' | 'scoreboard' | 'demo'
export interface MatchFeed {
  source: 'live' | 'demo'
  provider: FeedProvider
  matches: Match[]
  updatedAt: string
  note?: string
  stale?: boolean
}
