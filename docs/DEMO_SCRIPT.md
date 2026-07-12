# 90-second demo script

## Recording checklist

- Use a 1440 x 900 browser window.
- Start on the live room with the feed badge visible.
- If TxLINE is unavailable, say "demo scenario" and keep the badge visible. Do not call it live data.
- Record one continuous product walkthrough, then add a short architecture slide if needed.

## Script

**0:00-0:12**

"This is Match Pulse, a World Cup fan room powered by TxODDS TxLINE. It combines the fixture, score,
fair probabilities, and match events on one screen, without asking a fan to connect a wallet or stake
money."

**0:12-0:30**

Switch between the live Argentina match and an upcoming fixture.

"The match rail comes from the fixtures snapshot. Selecting a match updates the score state, venue,
teams, 1X2 probabilities, and the pulse. Live score data comes from the score snapshot, while the fair
line is normalized from the TxLINE 1X2 market."

**0:30-0:48**

Point to the pulse and event wire.

"The pulse gives fans a fast read on how active and unstable the match is. The event wire keeps the
reason for a probability change beside the number instead of hiding it in another page."

**0:48-1:03**

Choose a friendly result prediction and open My picks.

"A fan can call the result, but this is deliberately non-financial. The pick stays in browser storage.
There is no wallet, stake, prize, or transaction."

**1:03-1:15**

Open Create moment card and copy the share text.

"The same match state becomes a compact moment that is ready to share. The card keeps the feed source
visible, including the demo label when live credentials are unavailable."

**1:15-1:30**

Show the architecture diagram or repository.

"The browser calls our server only. The server owns guest authentication and the API token, then maps
fixtures, odds, and scores into one typed model. The transform is covered by focused tests, and the UI
has a clearly labeled fallback so a feed outage is never presented as verified data."
