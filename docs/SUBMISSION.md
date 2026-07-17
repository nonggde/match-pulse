# Match Pulse submission

## Links to complete before submission

- Live application: https://match-pulse-five.vercel.app
- Public repository: https://github.com/nonggde/match-pulse
- Demo video: https://match-pulse-five.vercel.app/match-pulse-demo.mp4

## One-line summary

Match Pulse turns TxODDS TxLINE fixtures, live scores, and fair 1X2 probabilities into a focused World
Cup fan room with a match pulse, event wire, local friendly picks, and shareable match moments.

## Project description

Most live score pages make fans scan tables and raw market numbers while a match is moving. Match
Pulse gives each fixture one readable screen. It combines the score, match status, fair probabilities,
recent events, and a 0-100 pulse into a broadcast-style view that works on desktop and mobile.

Fans can make a friendly result call that stays in browser storage and create a short match-moment
summary to share. The product has no wallet connection, deposits, stakes, prizes, or transaction flow.
That keeps the experience useful for a broad fan audience, including users in jurisdictions where
betting products create avoidable legal and product risk.

## How TxLINE is used

The server starts a TxLINE guest session and authenticates every data request with the activated free
World Cup API token. It reads:

- `/api/fixtures/snapshot` for the match catalog, teams, competition, kickoff time, status, and venue
- `/api/odds/snapshot/{fixtureId}` for 1X2 prices, converted to normalized fair probabilities
- `/api/scores/snapshot/{fixtureId}` for live score and match-state updates

The API token never enters the browser. The client receives a compact normalized model from
`/api/matches`. If credentials are missing, Match Pulse falls back to a current public World Cup
scoreboard and labels it `Live scoreboard`, never `TxLINE verified`. Static demo records are used only
if both live sources fail and are never labeled live or verified.

## What is working

- Responsive live room with fixture switching
- Live, upcoming, and final match states
- De-margined 1X2 fair probabilities without invented movement history
- Match pulse and event timeline
- Friendly local predictions persisted in browser storage
- Shareable match-moment text
- Explicit TxLINE/live-scoreboard/demo provider status
- Always-visible source, verification, refresh, and snapshot provenance strip
- Neutral first-load and refresh-error states with no fictional match flash
- Server-side token handling and automatic current-score fallback
- 15-second background refresh with cache bypass
- Last-good-snapshot mode that marks delayed data instead of presenting it as live
- Seven focused tests for TxLINE and scoreboard transformation

## Commercial path

The first customer is a supporter club, broadcaster, creator community, or tournament organizer that
wants a branded second-screen room without operating a betting product. Match Pulse can be embedded
or white-labelled, with sponsored match rooms and community subscriptions as the initial revenue
model. The friendly pre-match call creates a return loop, the live pulse sustains attention, and the
source-attached moment card turns each fixture into distribution. None of these mechanics require a
wallet, stake, deposit, or prize pool.

## Technical notes

The frontend is React, TypeScript, and Vite. The API is an Express service written in TypeScript.
`server/transform.ts` isolates upstream mapping from transport logic, so changes in the TxLINE record
shape do not leak into components. The current build passes lint, seven transformation tests, and the
production TypeScript/Vite build.

## TxLINE API feedback

The snapshot endpoints are small and straightforward to compose into a fan-facing product. Keeping
fixtures, odds, and scores separate also lets the application refresh volatile data without rebuilding
the full catalog.

Three changes would make integration easier:

1. Publish a stable machine-readable schema for each snapshot response, including nullable fields and
   status enums. This would remove defensive field aliases in client transforms.
2. Return a documented expiry timestamp with activated API tokens. The application could refresh a
   short-lived free-tier token before the first failed request.
3. Add an endpoint that returns fixtures with a selected market and current score in one request, or
   support batch fixture IDs. A match-center page currently needs one odds and one score request per
   fixture.

The live-scoreboard fallback was also useful during development because the Devnet API host can reject
some network exits at the CloudFront layer. A documented status page or allow-list guidance would make
that failure easier to distinguish from invalid credentials.

## Safety and scope

Match Pulse does not execute trades, bets, deposits, transfers, or wallet signatures. Probabilities
are presented as match information, and predictions are explicitly described as friendly local picks.
The submission is a consumer fan experience, not a wagering product.
