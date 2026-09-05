# Tiny Siege implementation plan

Target: Windows portable release; offline HTML/CSS/JavaScript that also runs in current desktop browsers. No external assets, account, service, or runtime required to play. Node 18+ is only used for tests and packaging.

Milestones:
1. Deterministic rules: eight pieces, four weapons, simultaneous attacks, collapse, economy, validation; automated rule and complete-match tests.
2. Finished interface: illustrated battlefield, title/help/setup/planning/handoff/reveal/result flows, synthesized sound and volume, responsive layout and keyboard controls.
3. Browser playtests and release: fix findings, verify rematches/privacy, package and document.

Design: 7 × 6 fortresses. Orthogonally connected pieces reach ground; braces also connect diagonally. Both players choose build (up to 3 pieces), reinforce (up to 3 cells), or fire (one weapon). Defense resolves first, both attacks are calculated from that shared state, damage/explosions resolve together, then unsupported pieces collapse. Command-room destruction decides the result only after both sides resolve. A late-match damage increase guarantees pressure against defensive stalemates.

All project changes and release artifacts stay in this directory. Commit each milestone to this repository.

## Completion record

- Rules implemented; 17 tests pass, including 200 seeded full matches.
- Full illustrated UI and every game-flow state implemented, with private handoffs, sound, volume, reduced motion, keyboard input, and a built-in manual.
- Seven browser scenarios pass on Windows Chrome and Edge, including wins, draws, pressure-ending stalemates, and rematches.
- Portable and source archives are built with Node built-ins. Launch instructions and verification scope are in README.md and PLAYTEST.md.
