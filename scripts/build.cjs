/* Deterministic, dependency-free ZIP builder. No platform-specific archiver required. */
const fs = require("node:fs");
const path = require("node:path");
const zlib = require("node:zlib");
const crypto = require("node:crypto");
const root = path.resolve(__dirname, ".."),
  out = path.join(root, "release");
const version = require("../package.json").version;
fs.mkdirSync(out, { recursive: true });
const runtime = [
  "index.html",
  "style.css",
  "engine.js",
  "scene.js",
  "app.js",
  "online.js",
  "icon.svg",
  "assets/tutorial.mp4",
  "assets/tutorial.vtt",
  "assets/tutorial-poster.jpg",
  "Play Tiny Siege.cmd",
  "README.md",
];
const source = [
  ...runtime,
  "package.json",
  "package-lock.json",
  "playwright.config.cjs",
  ".gitignore",
  "PLAN.md",
  "PLAYTEST.md",
  "scripts/build.cjs",
  "scripts/serve.cjs",
  "tests/engine.test.cjs",
  "tests/browser/game.spec.cjs",
  "tests/browser/online.spec.cjs",
  "tests/rooms.test.cjs",
  "server/rooms.mjs",
  "server/worker.mjs",
  "server/local-db.cjs",
  "scripts/build-site.cjs",
  "scripts/render-tutorial.cjs",
  "scripts/render-tutorial.html",
  "scripts/narrate-tutorial.ps1",
  "scripts/tutorial-chapters.json",
  "drizzle.config.cjs",
  "db/schema.ts",
  ".openai/hosting.json",
];
function collect(directory) {
  for (const entry of fs.readdirSync(path.join(root, directory), {
    withFileTypes: true,
  })) {
    const relative = directory + "/" + entry.name;
    if (entry.isDirectory()) collect(relative);
    else source.push(relative);
  }
}
collect("drizzle");
const table = Array.from({ length: 256 }, (_, n) => {
  for (let k = 0; k < 8; k++) n = n & 1 ? 0xedb88320 ^ (n >>> 1) : n >>> 1;
  return n >>> 0;
});
function crc32(bytes) {
  let crc = 0xffffffff;
  for (const b of bytes) crc = table[(crc ^ b) & 255] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}
function zip(files, prefix, destination) {
  const locals = [],
    central = [];
  let offset = 0;
  for (const file of [...files].sort()) {
    const data = fs.readFileSync(path.join(root, file)),
      name = Buffer.from(`${prefix}/${file}`),
      compressed = zlib.deflateRawSync(data, { level: 9 }),
      crc = crc32(data);
    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(20, 4);
    local.writeUInt16LE(0x800, 6);
    local.writeUInt16LE(8, 8);
    local.writeUInt16LE(0x5d24, 12);
    local.writeUInt32LE(crc, 14);
    local.writeUInt32LE(compressed.length, 18);
    local.writeUInt32LE(data.length, 22);
    local.writeUInt16LE(name.length, 26);
    const entry = Buffer.alloc(46);
    entry.writeUInt32LE(0x02014b50, 0);
    entry.writeUInt16LE(20, 4);
    entry.writeUInt16LE(20, 6);
    entry.writeUInt16LE(0x800, 8);
    entry.writeUInt16LE(8, 10);
    entry.writeUInt16LE(0x5d24, 14);
    entry.writeUInt32LE(crc, 16);
    entry.writeUInt32LE(compressed.length, 20);
    entry.writeUInt32LE(data.length, 24);
    entry.writeUInt16LE(name.length, 28);
    entry.writeUInt32LE(offset, 42);
    locals.push(local, name, compressed);
    central.push(entry, name);
    offset += local.length + name.length + compressed.length;
  }
  const directory = Buffer.concat(central),
    end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(files.length, 8);
  end.writeUInt16LE(files.length, 10);
  end.writeUInt32LE(directory.length, 12);
  end.writeUInt32LE(offset, 16);
  fs.writeFileSync(destination, Buffer.concat([...locals, directory, end]));
}
const gameDir = path.join(out, "Tiny-Siege");
fs.mkdirSync(gameDir, { recursive: true });
for (const file of runtime) {
  fs.mkdirSync(path.dirname(path.join(gameDir, file)), { recursive: true });
  fs.copyFileSync(path.join(root, file), path.join(gameDir, file));
}
const packages = [
  `Tiny-Siege-${version}-Windows.zip`,
  `Tiny-Siege-${version}-Source.zip`,
];
zip(runtime, "Tiny-Siege", path.join(out, packages[0]));
zip(source, "Tiny-Siege-Source", path.join(out, packages[1]));
fs.writeFileSync(
  path.join(out, "SHA256SUMS.txt"),
  packages
    .map(
      (p) =>
        `${crypto
          .createHash("sha256")
          .update(fs.readFileSync(path.join(out, p)))
          .digest("hex")}  ${p}`,
    )
    .join("\n") + "\n",
);
for (const p of packages)
  console.log(
    `${p}: ${fs.statSync(path.join(out, p)).size.toLocaleString()} bytes`,
  );
console.log("Portable release is ready in release/.");
