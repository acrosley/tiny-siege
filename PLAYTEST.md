# Tiny Siege 1.0.0 — verification record

## Version 1.1.0 addition: online friends and tutorial

- 23 automated rule and service tests pass: the original 17 plus six room-service tests using SQLite. Coverage includes two-seat admission, hashed credentials, private pending orders, authenticated reads, concurrent resolution exactly once, stale rounds and match IDs, reconnect, mutual knockout, two-player rematch, forfeit, malformed input, cross-origin rejection, and overspending.
- Nine browser scenarios pass in Chrome: all seven original local scenarios plus an online match between two isolated browser contexts (including reload/reconnect, private entry, both-player advance, draw, and rematch) and tutorial metadata/playback/captions/dialog closure.
- The tutorial is a real 141.8-second H.264/AAC MP4 with synthesized narration, English WebVTT captions, a poster, standard playback controls, and a readable transcript.
- Online state lives in a persistent database, with only a private seat credential stored in each player's browser. There is no AI opponent or chat. No external human playtest is claimed.

Tested on Windows, September 4, 2026.

## Verified environments

- Google Chrome 152.0.7977.75.
- Microsoft Edge 152.0.4191.62.
- Direct offline `file://` launch and local HTTP preview.
- Desktop 1440 × 1000 and 1024 × 768; tablet 768 × 1024; narrow layout 390 × 844.
- Both normal and reduced-motion resolution.

## Core rules: 17 passing tests

Coverage includes initial grounded boards; all eight piece/four weapon definitions; invalid, floating, duplicate, and unaffordable orders; multi-piece support; diagonal Braces; weapon screening and targeting; same-round defensive construction; repair and expiring shields; simultaneous draws; destroyed Arsenal contributions; collapse; non-explosive falling Powder; Powder chain reactions; Sandbag mitigation; capped income; misses; pressure damage; and pressure-triggered collapse.

The final test plays **200 deterministic seeded full matches**, alternating Classic and Quick. It mixes legal construction, weapons, repairs, and holds, and checks positive surviving health, bounded supplies, grounded surviving fortresses, and an eventual result within 30 rounds.

## Browser scenarios: 7 passing in each target browser

1. **Learn and plan:** open/close the manual, customize both names, reject a floating piece, undo it, place a Mint, cover and restore a draft, lock it, verify that the handoff and other player's planner reveal no pending Mint order, reinforce a command room, resolve, aim a Drill shot, and read completed rounds in the journal.
2. **Full victory:** five rounds of building, reinforcing, and asymmetric mortar fire produce a winner. Rematch returns to round 1 with full health, 10 supplies, no draft, and the same commanders.
3. **Full mutual knockout:** both commanders fire mortars for three rounds. Both command rooms fall together; the draw screen returns to the title.
4. **Full defensive stalemate:** both commanders hold throughout. Rising pressure ends the match in a draw before the hard limit.
5. **Offline and settings:** launch through `file://`, save mute and reduced motion, reload, confirm persistence, exercise the modal focus trap, and complete a round offline.
6. **Normal resolution and exit:** enable animation and sound, preview sound, fire both cannons, confirm input is locked while projectiles resolve, continue, cancel an exit, then leave the match.
7. **Layouts:** place and validate a piece at desktop, tablet, and narrow sizes, with no horizontal page overflow.

Full-match browser tests interact with real UI controls; they do not inject or replace match state. These are automated two-side playthroughs, not sessions with two independent human participants. No external human usability or balance study has been conducted.

## Visual review and fixes

Captured and inspected the title, planning, aimed shot, victory, and responsive layout screenshots. Removed overlapping illustration captions, increased desktop tool-label readability, and preserved the battlefield's proportions on the outcome screen. Fixed an accessible button name discovered during browser checks. Fixed the rule edge case where command-room destruction from pressure could leave an unsupported upper block. Pressure readouts now correspond to the round being reported. Construction-only rounds no longer play cannon-launch audio.

Runtime errors are monitored during interactive scenarios. Sound synthesis and volume controls are exercised; perceived audio quality has not been assessed by an external listener.

## Release verification

The build produces a portable runtime ZIP, a source ZIP, and SHA-256 checksums. ZIP entries are checked for integrity, both builds are compared for reproducibility, and the extracted portable release is exercised through a full offline match. The runtime loads only local files.

## Known limitations

- Private entry uses physical handoff and the other player's cooperation. It is not designed to resist developer tools or screen recording.
- Active matches are not saved across reload or browser closure. Sound/display settings are saved when browser storage is available.
- Touch layouts work, but fine targeting is easier on a desktop; Windows desktop is the primary platform.
- As of version 1.1, two-player online rooms are included. AI opponents, gamepads, and native executable installers remain outside scope.

No known issues in the tested scenarios prevent learning the rules, entering orders, completing a match, or starting a rematch.
