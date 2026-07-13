# Match Pulse

Match Pulse is a real-time World Cup fan room powered by TxODDS TxLINE. It turns verified fixtures,
scores, and de-margined fair probabilities into an accessible match pulse, a friendly pick game, and
shareable match moments. It never asks fans to stake funds or connect a wallet.

- Live app: https://match-pulse-five.vercel.app
- Public repository: https://github.com/nonggde/match-pulse

## TxLINE integration

The server uses only the TxLINE World Cup free tier:

- `GET /api/fixtures/snapshot`
- `GET /api/odds/snapshot/{fixtureId}`
- `GET /api/scores/snapshot/{fixtureId}`

Every upstream request sends both the public guest JWT and the activated `X-Api-Token`. The API token
stays server-side. If TxLINE credentials are unavailable, the app switches to a current public World
Cup scoreboard and labels it separately. Static demo content is used only if both live sources fail
and is never presented as live or verified data.

## Architecture

```text
React client -> Match Pulse API -> TxLINE guest auth
                                -> fixtures snapshot
                                -> odds snapshot
                                -> scores snapshot
```

The browser calls only `/api/matches`. `server/txline.ts` owns guest authentication and keeps the
TxLINE token off the client. `server/transform.ts` converts fixture, score, and 1X2 market records into
the small match model used by the interface using TxLINE's documented epoch-millisecond fixture times
and nested soccer score shape. `server/scoreboard.ts` supplies current fixtures and scores without
inventing market percentages when TxLINE credentials are unavailable. The client refreshes every 15
seconds and always names the active provider. The first render is a neutral connection state, so
static demo records never flash before a verified or fallback response arrives. A compact provenance
strip keeps the source, verification level, refresh interval, and snapshot time visible.

## Run locally

```bash
npm install
cp .env.example .env
# add the free TxLINE token to .env
npm run dev
```

Open `http://localhost:5173`. The API runs on `http://localhost:8788`.

## Quality checks

```bash
npm run lint
npm test
npm run build
```

## Hackathon fit

- Consumer and Fan Experiences track
- Functional web product, not a mockup
- Live TxLINE input with a clearly labelled current-score fallback
- Solo-friendly and mobile responsive
- No betting, wagering, deposits, or mainnet transactions

Live sports data is provided by TxODDS TxLINE for the 2026 World Cup hackathon. Stadium photography
is from Unsplash and is used as an atmospheric background only.

Submission copy and the demo recording plan are in [`docs/SUBMISSION.md`](docs/SUBMISSION.md) and
[`docs/DEMO_SCRIPT.md`](docs/DEMO_SCRIPT.md).
