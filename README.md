# Match Pulse

Match Pulse is a real-time World Cup fan room powered by TxODDS TxLINE. It turns verified fixtures,
scores, and de-margined fair probabilities into an accessible match pulse, a friendly pick game, and
shareable match moments. It never asks fans to stake funds or connect a wallet.

## TxLINE integration

The server uses only the TxLINE World Cup free tier:

- `GET /api/fixtures/snapshot`
- `GET /api/odds/snapshot/{fixtureId}`
- `GET /api/scores/snapshot/{fixtureId}`

Every upstream request sends both the public guest JWT and the activated `X-Api-Token`. The API token
stays server-side. If the free feed has no priced fixtures or the token is absent, the app switches to
a clearly labelled demo scenario. Demo content is never presented as live or verified data.

## Architecture

```text
React client -> Match Pulse API -> TxLINE guest auth
                                -> fixtures snapshot
                                -> odds snapshot
                                -> scores snapshot
```

The browser calls only `/api/matches`. `server/txline.ts` owns guest authentication and keeps the
TxLINE token off the client. `server/transform.ts` converts fixture, score, and 1X2 market records into
the small match model used by the interface. The transform has focused unit tests for fair-probability
normalization, live score mapping, and malformed upstream records.

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
- Live TxLINE input with a labelled demo fallback
- Solo-friendly and mobile responsive
- No betting, wagering, deposits, or mainnet transactions

Live sports data is provided by TxODDS TxLINE for the 2026 World Cup hackathon. Stadium photography
is from Unsplash and is used as an atmospheric background only.

Submission copy and the demo recording plan are in [`docs/SUBMISSION.md`](docs/SUBMISSION.md) and
[`docs/DEMO_SCRIPT.md`](docs/DEMO_SCRIPT.md).
