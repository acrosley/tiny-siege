const { test } = require("node:test");
const assert = require("node:assert/strict");
const S = require("../engine.js");
const pass = () => ({ kind: "pass" });
const fire = (weapon, x = 4, y = 0) => ({
  kind: "fire",
  weapon,
  target: { x, y },
});
const build = (...placements) => ({ kind: "build", placements });
const reinforce = (...targets) => ({ kind: "reinforce", targets });
test("new match has two grounded fortresses and all twelve distinct tools", () => {
  const g = S.newGame();
  assert.equal(Object.keys(S.PIECES).length, 8);
  assert.equal(Object.keys(S.WEAPONS).length, 4);
  for (const p of g.players)
    assert.equal(S.supported(p.board).size, Object.keys(p.board).length);
});
test("validation rejects overspending, floating, duplicate, invalid and over-limit orders", () => {
  const g = S.newGame();
  for (const p of [
    build({ x: 0, y: 3, type: "timber" }),
    build({ x: 4, y: 0, type: "stone" }),
    build({ x: 7, y: 0, type: "stone" }),
    build({ x: 0, y: 0, type: "unknown" }),
    build(...[0, 1, 2, 3].map((x) => ({ x, y: 0, type: "iron" }))),
    reinforce({ x: 4, y: 0 }, { x: 4, y: 0 }),
    fire("nope"),
    fire("mortar", -1),
  ])
    assert.ok(S.validate(g, 0, p));
  g.players[0].supply = 1;
  assert.ok(S.validate(g, 0, fire("cannon")));
});
test("build connections may be planned in any order", () => {
  const g = S.newGame();
  const plan = build(
    { x: 0, y: 1, type: "stone" },
    { x: 0, y: 0, type: "timber" },
  );
  assert.equal(S.validate(g, 0, plan), null);
});
test("brace supports diagonal overhang; normal blocks do not", () => {
  const b = {
    "0,0": S.cell("brace"),
    "1,1": S.cell("stone"),
    "2,1": S.cell("stone"),
  };
  assert.equal(S.supported(b).size, 3);
  b["0,0"] = S.cell("stone");
  assert.equal(S.supported(b).size, 1);
});
test("cannon screens, mortar bypasses, drill hits two, scatter hits a cross", () => {
  const g = S.newGame(),
    [a, b] = g.players;
  assert.equal(S.hitsFor(a, b, fire("cannon"))[0].x, 1);
  assert.equal(S.hitsFor(a, b, fire("mortar"))[0].x, 4);
  assert.deepEqual(
    S.hitsFor(a, b, fire("drill")).map((h) => h.x),
    [1, 3],
  );
  assert.equal(S.hitsFor(a, b, fire("scatter")).length, 4);
});
test("defense resolves before incoming fire and wards expire after the round", () => {
  const g = S.newGame();
  g.players[1].board["4,0"].hp = 12;
  const { game: n } = S.resolve(g, [fire("mortar"), reinforce({ x: 4, y: 0 })]);
  assert.equal(n.players[1].board["4,0"].hp, 15);
  assert.equal(n.players[1].board["4,0"].ward, 0);
  assert.equal(g.players[1].board["4,0"].hp, 12);
});
test("new cover blocks the same round’s cannon shot", () => {
  const { game } = S.resolve(S.newGame(), [
    fire("cannon"),
    build({ x: 0, y: 0, type: "iron" }),
  ]);
  assert.equal(game.players[1].board["0,0"].hp, 7);
  assert.equal(game.players[1].board["1,0"].hp, 10);
});
test("simultaneous lethal shots draw, independent of attacker index", () => {
  const g = S.newGame();
  g.players.forEach((p) => (p.board["4,0"].hp = 7));
  const n = S.resolve(g, [fire("mortar"), fire("mortar")]).game;
  assert.deepEqual(n.result, { winner: null, reason: "mutual" });
});
test("destroyed arsenals still contribute to simultaneous outgoing shots", () => {
  const g = S.newGame();
  g.players[0].board = {
    "4,0": S.cell("command", 24),
    "0,0": S.cell("arsenal"),
  };
  const n = S.resolve(g, [fire("mortar"), fire("cannon")]).game;
  assert.equal(n.players[1].board["4,0"].hp, 16);
  assert.equal(n.players[0].board["0,0"], undefined);
});
test("unsupported towers collapse; collapse does not detonate powder", () => {
  const g = S.newGame();
  g.players[1].board = {
    "4,0": S.cell("command", 24),
    "0,0": S.cell("timber"),
    "0,1": S.cell("powder"),
  };
  const n = S.resolve(g, [fire("cannon"), pass()]);
  assert.ok(n.events.some((e) => e.kind === "collapse"));
  assert.ok(!n.events.some((e) => e.kind === "explosion"));
});
test("powder chain reaction detonates once each", () => {
  const g = S.newGame();
  g.players[1].board = {
    "4,0": S.cell("command", 24),
    "0,0": S.cell("powder"),
    "1,0": S.cell("powder"),
  };
  g.players[1].board["0,0"].hp = 5;
  g.players[1].board["1,0"].hp = 5;
  const n = S.resolve(g, [fire("cannon"), pass()]);
  assert.equal(n.events.filter((e) => e.kind === "explosion").length, 2);
});
test("sandbags mitigate blasts but not direct cannon hits", () => {
  const g = S.newGame();
  g.players[1].board["0,0"] = S.cell("sandbag");
  assert.equal(
    S.resolve(g, [fire("mortar", 0), pass()]).game.players[1].board["0,0"].hp,
    4,
  );
  assert.equal(
    S.resolve(g, [fire("cannon"), pass()]).game.players[1].board["0,0"],
    undefined,
  );
});
test("economy caps supplies and mint / arsenal bonuses at two", () => {
  const g = S.newGame();
  g.players[0].supply = 20;
  for (const x of [0, 2, 6]) g.players[0].board[S.key(x, 0)] = S.cell("mint");
  assert.equal(S.bonus(g.players[0], "mint"), 2);
  assert.equal(S.resolve(g, [pass(), pass()]).game.players[0].supply, 20);
});
test("empty row shots miss safely", () => {
  assert.ok(
    S.resolve(S.newGame(), [fire("cannon", 2, 5), pass()]).events.some(
      (e) => e.kind === "miss",
    ),
  );
});
test("pressure destruction also collapses a tower supported only by the command room", () => {
  const g = S.newGame();
  g.round = 13;
  g.players[0].board = { "4,0": S.cell("command", 1), "4,1": S.cell("stone") };
  const n = S.resolve(g, [pass(), pass()]);
  assert.equal(Object.keys(n.game.players[0].board).length, 0);
  assert.ok(n.events.some((e) => e.kind === "collapse"));
});
test("pressure bypasses reinforcement and ends even a passive match", () => {
  let g = S.newGame();
  while (!g.result) g = S.resolve(g, [pass(), pass()]).game;
  assert.equal(g.result.winner, null);
  assert.ok(g.round < 30);
  assert.throws(() => S.resolve(g, [pass(), pass()]));
});
test("200 seeded complete matches: valid states, bounded economy, grounded survivors and eventual result", () => {
  let seed = 721;
  const rand = (n) => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed % n;
  };
  for (let match = 0; match < 200; match++) {
    let g = S.newGame(["A", "B"], match % 2 ? "quick" : "standard");
    while (!g.result) {
      const plans = g.players.map((p, i) => {
        const choices = [
          pass(),
          ...Object.keys(S.WEAPONS).map((w) => fire(w, rand(7), rand(3))),
          reinforce({ x: 4, y: 0 }),
        ];
        for (let k = 0; k < 10; k++)
          choices.push(
            build({
              x: rand(7),
              y: rand(6),
              type: Object.keys(S.PIECES)[rand(8)],
            }),
          );
        const valid = choices.filter((plan) => !S.validate(g, i, plan));
        return valid[rand(valid.length)];
      });
      g = S.resolve(g, plans).game;
      for (const p of g.players) {
        assert.ok(p.supply >= 0 && p.supply <= S.CAP);
        for (const c of Object.values(p.board))
          assert.ok(c.hp > 0 && c.hp <= c.max);
        // Pressure can remove the ground command after collapse; all other ground anchors persist.
        if (!g.result)
          assert.equal(S.supported(p.board).size, Object.keys(p.board).length);
      }
      assert.ok(g.round <= 30);
    }
  }
});
