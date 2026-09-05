const { test } = require("node:test"),
  assert = require("node:assert/strict");
const { openDb } = require("../server/local-db.cjs");
async function fixture() {
  const { api } = await import("../server/rooms.mjs"),
    DB = openDb(":memory:");
  async function call(path, body, token, headers = {}) {
    const res = await api(
      new Request("https://game.test/api" + path, {
        method: body === undefined ? "GET" : "POST",
        headers: {
          ...(body === undefined ? {} : { "Content-Type": "application/json" }),
          ...(token ? { Authorization: "Bearer " + token } : {}),
          ...headers,
        },
        ...(body === undefined ? {} : { body: JSON.stringify(body) }),
      }),
      { DB },
    );
    return { status: res.status, data: await res.json() };
  }
  const a = (await call("/rooms", { name: "Ada", mode: "quick" })).data,
    bToken = "b".repeat(64);
  const b = (
    await call(`/rooms/${a.code}/join`, { name: "Lin", token: bToken })
  ).data;
  return {
    call,
    a,
    b,
    bToken,
    DB,
    path: `/rooms/${a.code}`,
    close: () => DB.close(),
  };
}
test("rooms join exactly two seats; stored secrets are hashed and never sent to the rival", async () => {
  const f = await fixture();
  try {
    assert.equal(f.b.side, 1);
    const third = await f.call(f.path + "/join", {
      name: "Eve",
      token: "c".repeat(64),
    });
    assert.equal(third.status, 409);
    const state = await f.call(f.path, undefined, f.bToken);
    assert.equal(state.data.token, undefined);
    assert.equal(state.data.tokens, undefined);
    const raw = await f.DB.prepare("SELECT data FROM rooms WHERE code = ?")
      .bind(f.a.code)
      .first();
    assert.ok(!raw.data.includes(f.a.token));
    assert.ok(!raw.data.includes(f.bToken));
  } finally {
    f.close();
  }
});
test("pending order remains private; retries cannot replace a locked order", async () => {
  const f = await fixture();
  try {
    const payload = {
      match: f.b.match,
      round: 1,
      plan: { kind: "fire", weapon: "mortar", target: { x: 4, y: 0 } },
    };
    assert.equal(
      (await f.call(f.path + "/order", payload, f.a.token)).status,
      200,
    );
    const view = (await f.call(f.path, undefined, f.bToken)).data;
    assert.deepEqual(view.locked, [true, false]);
    assert.equal(view.resolution, null);
    assert.equal(view.game.history.length, 0);
    assert.equal(JSON.stringify(view).includes("mortar"), false);
    assert.equal(
      (await f.call(f.path + "/order", payload, f.a.token)).status,
      200,
    );
    assert.equal(
      (
        await f.call(
          f.path + "/order",
          { ...payload, plan: { kind: "pass" } },
          f.a.token,
        )
      ).status,
      409,
    );
  } finally {
    f.close();
  }
});
test("concurrent orders resolve only once; next-round acknowledgements are required from both", async () => {
  const f = await fixture();
  try {
    const p = {
      match: f.b.match,
      round: 1,
      plan: { kind: "fire", weapon: "mortar", target: { x: 4, y: 0 } },
    };
    const results = await Promise.all([
      f.call(f.path + "/order", p, f.a.token),
      f.call(f.path + "/order", p, f.bToken),
    ]);
    assert.ok(results.every((r) => r.status === 200));
    let v = (await f.call(f.path, undefined, f.a.token)).data;
    assert.equal(v.phase, "report");
    assert.equal(v.game.history.length, 1);
    assert.equal(v.game.players[0].board["4,0"].hp, 11);
    v = (
      await f.call(f.path + "/next", { match: v.match, round: 1 }, f.a.token)
    ).data;
    assert.equal(v.phase, "report");
    v = (await f.call(f.path + "/next", { match: v.match, round: 1 }, f.bToken))
      .data;
    assert.equal(v.phase, "planning");
    assert.equal(v.game.round, 2);
    assert.equal((await f.call(f.path + "/order", p, f.a.token)).status, 409);
  } finally {
    f.close();
  }
});
test("complete online draw and two-sided rematch; stale previous-match orders rejected", async () => {
  const f = await fixture();
  try {
    let v = f.b;
    for (let round = 1; round <= 3; round++) {
      const p = {
        match: v.match,
        round,
        plan: { kind: "fire", weapon: "mortar", target: { x: 4, y: 0 } },
      };
      await f.call(f.path + "/order", p, f.a.token);
      v = (await f.call(f.path + "/order", p, f.bToken)).data;
      if (round < 3) {
        await f.call(f.path + "/next", { match: v.match, round }, f.a.token);
        v = (
          await f.call(f.path + "/next", { match: v.match, round }, f.bToken)
        ).data;
      }
    }
    assert.equal(v.game.result.winner, null);
    const old = v.match;
    await f.call(f.path + "/rematch", { match: old }, f.a.token);
    v = (await f.call(f.path + "/rematch", { match: old }, f.bToken)).data;
    assert.notEqual(v.match, old);
    assert.equal(v.game.round, 1);
    assert.equal(v.game.players[0].board["4,0"].hp, 18);
    assert.equal(
      (
        await f.call(
          f.path + "/order",
          { match: old, round: 1, plan: { kind: "pass" } },
          f.a.token,
        )
      ).status,
      409,
    );
  } finally {
    f.close();
  }
});
test("unauthorized reads, cross-origin writes, malformed orders and overspending are rejected", async () => {
  const f = await fixture();
  try {
    assert.equal((await f.call(f.path)).status, 401);
    assert.equal((await f.call(f.path, undefined, "d".repeat(64))).status, 403);
    assert.equal(
      (
        await f.call(f.path + "/order", {}, f.a.token, {
          Origin: "https://other.test",
        })
      ).status,
      403,
    );
    for (const plan of [
      { kind: "build", placements: "bad" },
      { kind: "fire", weapon: "toString", target: { x: 0, y: 0 } },
      {
        kind: "build",
        placements: [0, 2, 6].map((x) => ({ x, y: 0, type: "iron" })),
      },
      { kind: "build", placements: [{ x: 0, y: 5, type: "stone" }] },
    ])
      assert.equal(
        (
          await f.call(
            f.path + "/order",
            { match: f.b.match, round: 1, plan },
            f.a.token,
          )
        ).status,
        400,
      );
  } finally {
    f.close();
  }
});
test("reconnect restores seat and forfeit finishes the opponent’s match", async () => {
  const f = await fixture();
  try {
    const restored = await f.call(f.path, undefined, f.a.token);
    assert.equal(restored.data.side, 0);
    assert.equal(
      (await f.call(f.path + "/join", { name: "Lin", token: f.bToken })).status,
      200,
    );
    await f.call(f.path + "/leave", {}, f.a.token);
    const v = (await f.call(f.path, undefined, f.bToken)).data;
    assert.deepEqual(v.game.result, { winner: 1, reason: "forfeit" });
    assert.equal(v.phase, "result");
    assert.equal(v.closed, true);
  } finally {
    f.close();
  }
});
