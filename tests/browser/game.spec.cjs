const { test, expect } = require("@playwright/test");
const path = require("node:path");
const { pathToFileURL } = require("node:url");
async function begin(page, quick = true) {
  await page.goto("/");
  await page.getByRole("button", { name: "Start a duel" }).click();
  if (quick) await page.getByRole("button", { name: "A quick grudge" }).click();
  await page.getByRole("button", { name: "To the battlefield" }).click();
}
async function ready(page) {
  await page.getByRole("button", { name: "I’m ready to plan" }).click();
  return (await page.locator(".turn-pill").innerText()).includes("1") ? 0 : 1;
}
async function hold(page) {
  await page.getByRole("button", { name: "Hold & save", exact: true }).click();
  await page.getByRole("button", { name: "Lock hold order" }).click();
}
async function shot(page, side, weapon = "mortar", x = 4, y = 0) {
  await page.locator('[data-kind="fire"]').click();
  await page.locator(`[data-tool="${weapon}"]`).click();
  await page.locator(`[data-cell="${1 - side},${x},${y}"]`).click();
  await page.getByRole("button", { name: "Lock order", exact: true }).click();
}
async function resolve(page) {
  await page.getByRole("button", { name: "Reveal & resolve" }).click();
  await expect(
    page.getByRole("button", { name: /Next round|See the outcome/ }),
  ).toBeEnabled();
}
test("manual, setup, private builds, undo, cover, reinforcement, aiming, round journal", async ({
  page,
}) => {
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/");
  await page.screenshot({ path: "artifacts/title-final.png", fullPage: true });
  await page.getByRole("button", { name: "How to play" }).click();
  await expect(page.getByRole("dialog")).toContainText(
    "Why did my tower fall?",
  );
  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: "Start a duel" }).click();
  await page.locator("#name0").fill("Ada");
  await page.locator("#name1").fill("Lin");
  await page.getByRole("button", { name: "To the battlefield" }).click();
  await expect(page.locator("main")).not.toContainText("Stone");
  await expect(page.locator(".planning-panel")).toHaveCount(0);
  await ready(page);
  await expect(
    page.getByRole("button", { name: "Lock order", exact: true }),
  ).toBeDisabled();
  await page.locator('[data-cell="0,0,4"]').click();
  await expect(page.locator(".order-detail")).toContainText("connected path");
  await expect(
    page.getByRole("button", { name: "Lock order", exact: true }),
  ).toBeDisabled();
  await page.locator('[data-cell="0,0,4"]').click();
  await page.locator('[data-tool="mint"]').click();
  await page.locator('[data-cell="0,2,0"]').click();
  await expect(page.locator(".order-detail")).toContainText("Mint");
  await page.keyboard.press("p");
  await expect(page.locator(".planning-panel")).toHaveCount(0);
  await expect(page.locator("main")).not.toContainText("Mint");
  await page.getByRole("button", { name: "Resume my order" }).click();
  await expect(page.locator(".order-detail")).toContainText("Mint");
  await page.getByRole("button", { name: "Lock order", exact: true }).click();
  await expect(page.locator("main")).toContainText("Lin");
  await expect(page.locator("main")).not.toContainText("Mint");
  await ready(page);
  await expect(page.locator(".order-detail")).not.toContainText("Mint");
  await page.keyboard.press("2");
  await page.locator('[data-cell="1,4,0"]').click();
  await page.getByRole("button", { name: "Lock order", exact: true }).click();
  await expect(page.locator(".battle-wrap")).toHaveCount(0);
  await resolve(page);
  await expect(page.locator(".reveal-panel")).toContainText("Build 1 piece");
  await expect(page.locator(".reveal-panel")).toContainText(
    "Reinforce 1 block",
  );
  await page.getByRole("button", { name: /Next round/ }).click();
  const side = await ready(page);
  await page.keyboard.press("3");
  await page.locator('[data-tool="drill"]').click();
  await page.locator(`[data-cell="${1 - side},4,0"]`).click();
  await page.screenshot({ path: "artifacts/aim-final.png", fullPage: true });
  await page.getByRole("button", { name: "Lock order", exact: true }).click();
  await ready(page);
  await hold(page);
  await resolve(page);
  await page.getByRole("button", { name: /Round journal/ }).click();
  await expect(page.getByRole("dialog")).toContainText("Round 2");
  await expect(page.getByRole("dialog")).toContainText("Drill shot");
  await page.keyboard.press("Escape");
  expect(errors).toEqual([]);
});
test("complete five-round build/repair/attack match, victory and rematch reset", async ({
  page,
}) => {
  await begin(page);
  for (let round = 1; round <= 5; round++) {
    for (let n = 0; n < 2; n++) {
      const side = await ready(page);
      if (round === 1) {
        await page.locator(`[data-cell="${side},0,0"]`).click();
        await page
          .getByRole("button", { name: "Lock order", exact: true })
          .click();
      } else if (round === 2) {
        await page.locator('[data-kind="reinforce"]').click();
        await page.locator(`[data-cell="${side},4,0"]`).click();
        await page
          .getByRole("button", { name: "Lock order", exact: true })
          .click();
      } else if (side === 0) await shot(page, side);
      else await hold(page);
    }
    await resolve(page);
    if (round < 5)
      await page.getByRole("button", { name: /Next round/ }).click();
  }
  await page.getByRole("button", { name: /See the outcome/ }).click();
  await expect(page.locator("h1")).toHaveText("Ember takes the quarry.");
  await expect(page.locator(".result-stats")).toContainText("5");
  await page.screenshot({
    path: "artifacts/victory-final.png",
    fullPage: true,
  });
  await page.getByRole("button", { name: "Settle the score" }).click();
  await ready(page);
  await expect(page.locator(".round-stat strong")).toHaveText("Round 01");
  await expect(page.locator(".stat-line").first()).toContainText("18/18");
  await expect(page.locator(".stat-line").first()).toContainText("10 supplies");
  await expect(page.locator(".order-cost")).toContainText("0 / 10");
});
test("complete simultaneous mutual knockout and return to title", async ({
  page,
}) => {
  await begin(page);
  for (let round = 1; round <= 3; round++) {
    for (let n = 0; n < 2; n++) {
      const side = await ready(page);
      await shot(page, side);
    }
    await resolve(page);
    if (round < 3)
      await page.getByRole("button", { name: /Next round/ }).click();
  }
  await page.getByRole("button", { name: /See the outcome/ }).click();
  await expect(page.locator("h1")).toHaveText("Mutually assured rubble.");
  await page.getByRole("button", { name: "Title screen", exact: true }).click();
  await expect(page.locator("h1")).toContainText("Small forts.");
});
test("complete defensive stalemate ends under rising pressure", async ({
  page,
}) => {
  await begin(page);
  let rounds = 0;
  while (rounds++ < 30) {
    for (let n = 0; n < 2; n++) {
      await ready(page);
      await hold(page);
    }
    await resolve(page);
    if (await page.getByRole("button", { name: /See the outcome/ }).count())
      break;
    await page.getByRole("button", { name: /Next round/ }).click();
  }
  expect(rounds).toBeLessThan(30);
  await page.getByRole("button", { name: /See the outcome/ }).click();
  await expect(page.locator("h1")).toHaveText("Mutually assured rubble.");
});
test("settings persist, dialogs trap focus, offline file launch works", async ({
  page,
}) => {
  await page.goto(pathToFileURL(path.resolve("index.html")).href);
  await expect(page.locator("h1")).toContainText("Small forts.");
  await page
    .getByRole("button", { name: "Sound and display settings" })
    .click();
  await page.locator("#volume").fill("0");
  await page.locator("#reduced").check();
  await page.getByRole("button", { name: "All set" }).focus();
  await page.keyboard.press("Tab");
  await expect(
    page.getByRole("button", { name: "Close dialog" }),
  ).toBeFocused();
  await page.keyboard.press("Escape");
  await page.reload();
  await page
    .getByRole("button", { name: "Sound and display settings" })
    .click();
  await expect(page.locator("#volume")).toHaveValue("0");
  await expect(page.locator("#reduced")).toBeChecked();
  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: "Start a duel" }).click();
  await page.getByRole("button", { name: "To the battlefield" }).click();
  await ready(page);
  await hold(page);
  await ready(page);
  await hold(page);
  await resolve(page);
});
test("normal-motion shots animate, settings remain usable, and leaving cancels the match", async ({
  page,
}) => {
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await begin(page);
  await page
    .getByRole("button", { name: "Sound and display settings" })
    .click();
  await page.locator("#reduced").uncheck();
  await page.locator("#volume").fill("35");
  await page.getByRole("button", { name: "Test sound" }).click();
  await page.keyboard.press("Escape");
  for (let i = 0; i < 2; i++) {
    const side = await ready(page);
    await shot(page, side, "cannon");
  }
  await page.getByRole("button", { name: "Reveal & resolve" }).click();
  await expect(
    page.getByRole("button", { name: "Orders in motion…" }),
  ).toBeDisabled();
  await page.screenshot({
    path: "artifacts/resolution-final.png",
    fullPage: true,
  });
  await expect(page.getByRole("button", { name: /Next round/ })).toBeEnabled();
  await page.getByRole("button", { name: /Next round/ }).click();
  await ready(page);
  await page.getByRole("button", { name: "Tiny Siege home" }).click();
  await page.getByRole("button", { name: "Stay here" }).click();
  await expect(page.locator(".planning-panel")).toBeVisible();
  await page.getByRole("button", { name: "Tiny Siege home" }).click();
  await page.getByRole("button", { name: "Leave match" }).click();
  await expect(page.locator("h1")).toContainText("Small forts.");
  expect(errors).toEqual([]);
});
test("tablet and small desktop layouts fit horizontally and can enter orders", async ({
  page,
}) => {
  for (const [width, height] of [
    [1024, 768],
    [768, 1024],
    [390, 844],
  ]) {
    await page.setViewportSize({ width, height });
    await page.goto("/");
    await expect(page.locator("h1")).toBeVisible();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBeTruthy();
    await page.getByRole("button", { name: "Start a duel" }).click();
    await page.getByRole("button", { name: "To the battlefield" }).click();
    await ready(page);
    await page.locator('[data-cell="0,0,0"]').click();
    await expect(
      page.getByRole("button", { name: "Lock order", exact: true }),
    ).toBeEnabled();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBeTruthy();
    await page.screenshot({
      path: `artifacts/layout-${width}.png`,
      fullPage: true,
    });
    page.once("dialog", (d) => d.accept());
  }
});
