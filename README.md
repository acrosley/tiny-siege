# Tiny Siege

**Small forts. Big grudges.** A finished, offline fortress duel for two people sharing a computer.

## Play on Windows

1. Extract **Tiny-Siege-1.0.0-Windows.zip** completely.
2. Open the extracted **Tiny-Siege** folder.
3. Double-click **Play Tiny Siege.cmd**, or open **index.html** in Chrome or Microsoft Edge.
4. Select **How to play**, then **Start a duel**.

No installation, account, network connection, or Node.js is needed to play. Keep the game files together. The game also runs from `index.html` in current desktop browsers on other operating systems. Chrome and Edge on Windows are the verified targets. A mouse or trackpad and a 1024px-wide or larger window are recommended. Tablet and narrow layouts are available; larger screens make targeting easier.

## Your first siege

- Give both commanders a name and choose Classic (24 command health) or Quick (18).
- Pass the controls when the privacy screen names the next player. The other player looks away.
- Choose **one** action: build up to three pieces, reinforce up to three existing blocks, or fire one weapon. **Hold & save** spends nothing.
- Click your fortress to build or reinforce. Click the enemy fortress to aim. Lock your order.
- After both orders are sealed, both players look at the screen and select **Reveal & resolve**.
- Defenses resolve first. Both weapons fire together. Explosions and structural collapse follow. Destroy the opponent’s crown-marked command room to win. Simultaneous destruction is a draw.
- The result screen offers **Settle the score** for a fresh rematch with the same names and mode.

Both sides start with a small fortress and 10 supplies. You earn 4 supplies after each non-final round, plus surviving Mint income, up to a storage limit of 20.

## Pieces

| Piece | Cost | Health | Strategic use |
|---|---:|---:|---|
| Timber | 2 | 6 | Affordable cover |
| Stone | 3 | 10 | Reliable protection |
| Iron | 5 | 14 | Reduces every weapon hit by 1 |
| Brace | 3 | 7 | Adds diagonal support connections |
| Sandbag | 3 | 8 | Reduces blast damage by 3 |
| Mint | 4 | 5 | +1 supply per round; maximum +2 |
| Arsenal | 4 | 6 | +1 damage per weapon hit; maximum +2 |
| Powder | 1 | 9 | Cheap protection; explodes for 6 blast damage to four neighboring cells when destroyed |

All pieces must have a path to the ground through orthogonal neighbors. A diagonal connection works if either endpoint is a Brace. You can place a connected group in any order. Floating orders cannot be locked. After damage, unsupported pieces become rubble; falling rubble causes no extra damage and does not detonate Powder.

## Weapons

| Weapon | Cost | Effect |
|---|---:|---|
| Cannon | 2 | 8 damage to the first block in a selected row |
| Mortar | 6 | 7 blast damage directly to the selected cell, bypassing screens |
| Drill shot | 4 | 5 damage to each of the first two blocks in a selected row |
| Scatter | 4 | 5 blast damage to the first block in a row, 3 to each orthogonal neighbor |

The grid is 7 columns by 6 rows. Row 1 is ground. Column 1 faces the enemy. The command room is at column 5, row 1. Except for Mortar, a shot's row determines the trajectory; its selected column does not let it skip cover. Empty-row shots miss. Previews reflect the current board; newly built enemy defenses can change the actual hits.

Reinforcement costs 2 per block, repairs 6 health up to the original maximum, and adds a 4-damage shield for this resolution. Armor reduces damage first. Shields are consumed across hits, and unused shields expire. Both attacks use the same state after defense, so an Arsenal destroyed this round still boosts its owner's shot.

From round 13 in Classic, or round 9 in Quick, **Rising pressure** deals 2 unavoidable damage to each command room, increasing by 2 every two rounds. This bypasses shields and armor. A hard limit of 30 rounds is a draw. Stalemates always end.

## Controls, sound, and privacy

- Click/tap tools and grid cells. Click planned cells again to undo them.
- **1 / 2 / 3:** Build / Reinforce / Fire. Switching action clears the previous draft.
- **Tab / Shift+Tab**, **Enter / Space:** navigate and activate controls.
- **Arrow keys:** move between grid cells when a grid cell is focused.
- **P:** cover your planning screen. Changing browser tabs also covers it.
- The sound button in the header opens a volume slider, sound preview, and reduced-motion setting. Settings are remembered when browser storage permits it. Sound begins after interaction.
- The **Field manual** is available throughout the game. The **Round journal** contains only completed public rounds.

This is a local honor-system game: the other commander must look away during entry. Pending orders are removed from the visible interface during handoffs; there is no back button that reveals them. No software can stop someone from watching while you enter a choice. Matches are intentionally not saved: reloading or closing loses the current duel, with a browser warning where supported. No telemetry or external asset requests are made.

## Source and development

Requirements for development only: Node.js 18+; Chrome or Edge for browser tests.

```powershell
npm ci --cache .cache
npm start
```

Open http://127.0.0.1:4173. Alternatively open `index.html` directly. The runtime has **zero dependencies** and uses classic scripts so `file://` works offline.

```powershell
npm test              # Deterministic rule tests and 200 seeded full matches
npm run test:browser  # Full UI matches, privacy, rematch, layouts, offline launch
npm run build        # Portable game ZIP, source ZIP, checksums
```

Browser tests use an installed Chrome by default. To use Edge:

```powershell
$env:SIEGE_BROWSER = 'msedge'
npm run test:browser
```

The test suite launches its own local server if one is not running. Browser screenshots and reports go to ignored `artifacts/` and `test-results/` directories. Tests control the same visible buttons and grid cells players use; full-match UI tests do not inject game state.

## Build outputs

`npm run build` uses only Node built-ins. It copies the offline runtime into `release/Tiny-Siege/` and produces:

- `release/Tiny-Siege-1.0.0-Windows.zip` — extract and play.
- `release/Tiny-Siege-1.0.0-Source.zip` — source, tests, scripts, and documentation.
- `release/SHA256SUMS.txt` — integrity hashes of both ZIP files.

The builder uses a fixed ZIP timestamp and stable file ordering for reproducible archives. It never downloads anything or embeds development dependencies.

## Project map

| File | Responsibility |
|---|---|
| `engine.js` | Pure deterministic rules and validation, shared with Node tests |
| `scene.js` | Original canvas illustration, blocks, targeting, projectiles, debris |
| `app.js` | Game flow, private entry, controls, audio, dialogs, accessibility |
| `style.css` | Responsive visual design |
| `tests/` | Rule tests and complete browser playthroughs |
| `scripts/` | Local preview server and reproducible ZIP packaging |
| `PLAYTEST.md` | Verification scope, outcomes, and limitations |

All artwork and sound synthesis are authored in the project. There are no third-party fonts, art, music, or game libraries. Playwright is a development-only dependency, with its upstream license in `node_modules` after installation.
