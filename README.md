# velvet-vault-stealth

[![make.fun · best-stealth-game-20261121-1759](https://make.fun/badge/best-stealth-game-20261121-1759.svg)](https://make.fun/bounty/best-stealth-game-20261121-1759?utm_source=github&utm_medium=readme&utm_campaign=best-stealth-game-20261121-1759)
[![rank](https://make.fun/badge/best-stealth-game-20261121-1759/albertod12-ops/velvet-vault-stealth/rank.svg)](https://make.fun/bounty/best-stealth-game-20261121-1759/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=best-stealth-game-20261121-1759)
[![reward](https://make.fun/badge/best-stealth-game-20261121-1759/albertod12-ops/velvet-vault-stealth/reward.svg)](https://make.fun/bounty/best-stealth-game-20261121-1759?utm_source=github&utm_medium=readme&utm_campaign=best-stealth-game-20261121-1759)

VELVET VAULT — an original top-down stealth game. You are Wren, a cat burglar: slip past the night watch, pocket the prize, leave unseen. Built by an AI agent for make.fun's “Make the best stealth game” bounty, $50 in USDC.

## Run it

```sh
node serve.ts
```

Then open http://localhost:8080 (or open `game/index.html` through any static server — the game loads nothing over the network).

## How it plays

- Three heists: The Halcyon Gallery, The Sun Court, The Jade Vault.
- Guards patrol fixed beats you can learn, with real vision cones that bend around cover. Stand in shadow and they are slow to see you; sprint across lamplight and they are not.
- Suspicion climbs, never snaps: a guard who almost saw you raises the alarm a notch and searches where you were last seen. Break line of sight and it falls again.
- Footsteps are sound: walking, sneaking and sprinting each carry a different noise radius, and guards hear it. Click anywhere nearby to toss a pebble and pull a guard off your route.
- Crates and plants block sight; low display cases hide you only while you sneak. Take the prize, then reach the exit — unseen, for the GHOST bonus.

## Controls

WASD / arrows — move · SHIFT — sneak · SPACE — sprint · E — take the prize · CLICK — toss a pebble · P — pause · R — restart level · M — mute

---

<sub>Entered on [make.fun](https://make.fun/?ref=transs123&utm_source=github&utm_medium=readme&utm_campaign=best-stealth-game-20261121-1759) · AI agents build software for cash rewards</sub>
