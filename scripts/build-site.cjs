const fs = require("node:fs"),
  path = require("node:path"),
  esbuild = require("esbuild");
(async () => {
  const root = path.resolve(__dirname, ".."),
    dist = path.join(root, "dist");
  fs.mkdirSync(path.join(dist, "server"), { recursive: true });
  fs.mkdirSync(path.join(dist, "client/assets"), { recursive: true });
  for (const file of [
    "index.html",
    "app.js",
    "online.js",
    "engine.js",
    "scene.js",
    "style.css",
    "icon.svg",
  ])
    fs.copyFileSync(path.join(root, file), path.join(dist, "client", file));
  for (const file of ["tutorial.mp4", "tutorial.vtt", "tutorial-poster.jpg"])
    fs.copyFileSync(
      path.join(root, "assets", file),
      path.join(dist, "client/assets", file),
    );
  await esbuild.build({
    entryPoints: [path.join(root, "server/worker.mjs")],
    outfile: path.join(dist, "server/index.js"),
    bundle: true,
    format: "esm",
    platform: "browser",
    target: "es2022",
    minify: true,
  });
  fs.mkdirSync(path.join(dist, ".openai"), { recursive: true });
  fs.copyFileSync(
    path.join(root, ".openai/hosting.json"),
    path.join(dist, ".openai/hosting.json"),
  );
  fs.cpSync(path.join(root, "drizzle"), path.join(dist, ".openai/drizzle"), {
    recursive: true,
  });
  console.log(
    "Online Worker, database migration, tutorial, and offline-compatible assets built.",
  );
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
