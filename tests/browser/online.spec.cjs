const { test, expect } = require("@playwright/test");
test("two separate browsers finish an online match, reconnect, and agree to rematch", async ({
  browser,
}) => {
  const c0 = await browser.newContext({ reducedMotion: "reduce" }),
    c1 = await browser.newContext({ reducedMotion: "reduce" });
  const a = await c0.newPage(),
    b = await c1.newPage(),
    errors = [];
  for (const p of [a, b]) p.on("pageerror", (e) => errors.push(e.message));
  await a.goto("/");
  await a.getByRole("button", { name: "Play online" }).click();
  await a.locator("#online-name").fill("Ada");
  await a.locator("#online-mode").selectOption("quick");
  await a.getByRole("button", { name: "Create room" }).click();
  const link = await a.locator("#invite-link").inputValue();
  await b.goto(link);
  await b.locator("#online-name").fill("Lin");
  await b.getByRole("button", { name: "Join room" }).click();
  await expect(a.locator(".planning-panel")).toBeVisible();
  await expect(b.locator(".planning-panel")).toBeVisible();
  for (let round = 1; round <= 3; round++) {
    await a.locator('[data-kind="fire"]').click();
    await a.locator('[data-tool="mortar"]').click();
    await a.locator('[data-cell="1,4,0"]').click();
    await a.getByRole("button", { name: "Lock order", exact: true }).click();
    await expect(a.locator(".online-wait")).toContainText("sealed");
    await expect(b.locator(".planning-panel")).toBeVisible();
    await expect(b.locator(".order-detail")).not.toContainText("Mortar");
    if (round === 1) {
      await a.reload();
      await a.getByRole("button", { name: "Play online" }).click();
      await a.getByRole("button", { name: "Reconnect to my room" }).click();
      await expect(a.locator(".online-wait")).toContainText("sealed");
    }
    await b.locator('[data-kind="fire"]').click();
    await b.locator('[data-tool="mortar"]').click();
    await b.locator('[data-cell="0,4,0"]').click();
    await b.getByRole("button", { name: "Lock order", exact: true }).click();
    for (const p of [a, b])
      await expect(
        p.getByRole("button", { name: /Next round|See the outcome/ }),
      ).toBeEnabled();
    if (round < 3) {
      await a.getByRole("button", { name: /Next round/ }).click();
      await expect(a.locator(".online-wait")).toContainText("Ready");
      await b.getByRole("button", { name: /Next round/ }).click();
      for (const p of [a, b])
        await expect(p.locator(".planning-panel")).toBeVisible();
    }
  }
  for (const p of [a, b]) {
    await p.getByRole("button", { name: /See the outcome/ }).click();
    await expect(p.locator("h1")).toContainText("Mutually assured rubble.");
  }
  await a.getByRole("button", { name: "Settle the score" }).click();
  await expect(a.locator(".result")).toBeVisible();
  await b.getByRole("button", { name: "Settle the score" }).click();
  for (const p of [a, b]) {
    await expect(p.locator(".planning-panel")).toBeVisible();
    await expect(p.locator(".round-stat strong")).toHaveText("Round 01");
  }
  expect(errors).toEqual([]);
  await c0.close();
  await c1.close();
});
test("tutorial video is playable, captioned, and stops when its dialog closes", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Watch tutorial" }).click();
  const video = page.locator("#tutorial-video");
  await expect(video).toBeVisible();
  await video.evaluate(
    (v) =>
      new Promise((resolve, reject) => {
        if (v.readyState >= 1) resolve();
        else {
          v.onloadedmetadata = resolve;
          v.onerror = () => reject(new Error("Video failed to load"));
        }
      }),
  );
  expect(await video.evaluate((v) => v.duration)).toBeGreaterThan(60);
  await expect(video.locator("track")).toHaveAttribute(
    "src",
    "assets/tutorial.vtt",
  );
  await video.evaluate((v) => {
    v.muted = true;
    return v.play();
  });
  await expect
    .poll(() => video.evaluate((v) => v.currentTime))
    .toBeGreaterThan(0.1);
  await page.keyboard.press("Escape");
  await expect(video).toHaveCount(0);
});
