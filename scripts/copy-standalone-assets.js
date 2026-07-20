/**
 * Копирует static-ассивы и public/ в standalone-выход после `next build`.
 * Кросс-платформенный (Node, без shell-зависимостей).
 */
const fs = require("node:fs");
const path = require("node:path");

const PROJECT_ROOT = path.resolve(__dirname, "..");
const STANDALONE_DIR = path.join(PROJECT_ROOT, ".next", "standalone");
const STATIC_SOURCE = path.join(PROJECT_ROOT, ".next", "static");
const STATIC_DEST = path.join(STANDALONE_DIR, ".next", "static");
const PUBLIC_SOURCE = path.join(PROJECT_ROOT, "public");
const PUBLIC_DEST = path.join(STANDALONE_DIR, "public");

function ok(msg) { console.log(`  ✅ ${msg}`); }
function fail(msg) { console.error(`  ❌ ${msg}`); }
function log(msg) { console.log(`  ℹ️  ${msg}`); }

function copyRecursive(src, dest, label) {
  if (!fs.existsSync(src)) {
    fail(`${label} not found: ${src}`);
    return false;
  }
  fs.cpSync(src, dest, { recursive: true });
  ok(`copied ${label} → ${path.relative(PROJECT_ROOT, dest)}`);
  return true;
}

function main() {
  console.log("📦 Copying standalone assets...");

  if (!fs.existsSync(STANDALONE_DIR)) {
    fail(`Standalone dir not found: ${STANDALONE_DIR}`);
    fail("Did you run `next build` with `output: 'standalone'` in next.config.ts?");
    process.exit(1);
  }

  if (fs.existsSync(STATIC_SOURCE)) {
    fs.mkdirSync(path.dirname(STATIC_DEST), { recursive: true });
    copyRecursive(STATIC_SOURCE, STATIC_DEST, ".next/static");
  } else {
    log(".next/static not found — skipping (likely first build)");
  }

  if (fs.existsSync(PUBLIC_SOURCE)) {
    copyRecursive(PUBLIC_SOURCE, PUBLIC_DEST, "public/");
  } else {
    log("public/ not found — skipping");
  }

  console.log("✓ Standalone assets copied.\n");
}

main();
