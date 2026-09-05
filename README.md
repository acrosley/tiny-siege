# Tiny Siege

**Small forts. Big grudges.** A fortress duel for two friends, on one computer or online on separate devices.

## Play with friends online

Open [Tiny Siege online](https://tiny-siege-duels.opal-song-1641.chatgpt.site), then:

1. Select **Play online**, enter your name, choose Classic or Quick, and **Create room**.
2. Select **Copy invite link** and send it to your friend using your usual messenger.
3. Your friend opens the link, enters their name, and selects **Join room**. They can also enter the eight-character code.
4. Plan independently on your own screens. Each player locks one order. The server resolves the round when both are locked.
5. Both select **Next round** after reviewing the result. Both select **Settle the score** to rematch.

Online orders are validated and resolved on the server. Your rival receives only your locked/unlocked status until resolution, never your pending action or targets. Reloading is safe: select **Play online → Reconnect to my room** in the original browser. Your seat and locked order are restored. Unsubmitted drafts are not saved. Inactive rooms expire after 24 hours. Leaving through **Leave room** is a forfeit; closing a tab simply lets you reconnect later. Share only the invitation, not browser storage or seat credentials.

## Watch the tutorial

Select **Watch tutorial** on the title screen, or **Tutorial** in the header. The 2-minute-22-second video has narration, player controls, English captions, and a text alternative. It covers command rooms, construction, reinforcement, all four weapons, structural collapse, simultaneous orders, room invitations, supplies, and rematches. The video is also bundled with the portable game for offline viewing.

## Play on Windows

1. Extract **Tiny-Siege-1.1.0-Windows.zip** completely.
2. Open the extracted **Tiny-Siege** folder.
3. Double-click **Play Tiny Siege.cmd**, or open **index.html** in Chrome or Microsoft Edge.
4. Select **How to play**, then **Start a duel**.

No installation, account, network connection, or Node.js is needed to play. Keep the game files together. The game also runs from `index.html` in current desktop browsers on other operating systems. Chrome and Edge on Windows are the verified targets. A mouse or trackpad and a 1024px-wide or larger window are recommended. Tablet and narrow layouts are available; larger screens make targeting easier.

## Your first local siege

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

Local play uses the honor system: the other commander must look away during entry. Local matches are not saved across reload or closure, with a browser warning where supported. Online room state is saved on the server and uses separate secret seat credentials. Online play makes requests only to the game's own room service. There is no telemetry.

## Source and development

Requirements for development only: Node.js 22.13+; Chrome or Edge for browser tests.

```powershell
npm ci --cache .cache
npm start
```

Open http://127.0.0.1:4173. This starts the static files and online room service, with a local SQLite database in ignored `.data/rooms.sqlite`. The server serves only public game assets. Alternatively open `index.html` directly for local play; the browser runtime has zero libraries and works offline. The hosted version bundles the same room service as a Cloudflare Worker and stores room state in D1.

```powershell
npm test              # 23 rule/room tests, including 200 seeded full matches
npm run test:browser  # Local + online full matches, reconnect, video playback
npm run build        # Hosted Worker/assets + portable/source ZIPs/checksums
```

Browser tests use an installed Chrome by default. To use Edge:

```powershell
$env:SIEGE_BROWSER = 'msedge'
npm run test:browser
```

The test suite launches its own local server if one is not running. Browser screenshots and reports go to ignored `artifacts/` and `test-results/` directories. Tests control the same visible buttons and grid cells players use; full-match UI tests do not inject game state.

## Build outputs

`npm run build` uses esbuild for the hosted Worker, and Node built-ins for ZIP packaging. It copies the offline runtime into `release/Tiny-Siege/` and produces:

- `release/Tiny-Siege-1.1.0-Windows.zip` — extract and play, with the tutorial.
- `release/Tiny-Siege-1.1.0-Source.zip` — source, tests, video sources, scripts, and documentation.
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

## Online architecture and tutorial sources

`server/rooms.mjs` validates requests, hashes seat credentials, filters public state, and resolves both orders together. A database revision compare-and-swap prevents concurrent submissions from resolving a round twice. Round numbers and match IDs reject stale requests. The schema is in `db/schema.ts`; generated migrations live in `drizzle/`. Generate future migrations with `npm run db:generate`; do not edit migrations already deployed. Hosted `.openai/hosting.json` declares only the logical D1 binding; no secrets are committed. Room data is private to the two seat holders and removed after expiry when new rooms are created.

The local room adapter uses Node's built-in SQLite. To host on another platform, run `npm start` with `HOST=0.0.0.0` and the platform's `PORT`, a persistent `.data` directory, and HTTPS provided by the host. Merely opening `index.html` cannot host online rooms.

Tutorial narration and chapter text are in `scripts/tutorial-chapters.json`. To regenerate on Windows with System.Speech, FFmpeg, Chrome, and development dependencies installed:

```powershell
powershell -NoProfile -File scripts/narrate-tutorial.ps1
node scripts/render-tutorial.cjs
npm run build
```

Rendering runs in real time for about 142 seconds, then encodes H.264/AAC MP4 with fast-start metadata. Narration is synthesized with the Windows-installed voice. The supplied MP4, caption file, and poster mean ordinary builds do not need speech synthesis or FFmpeg.
