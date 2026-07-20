/**
 * generate-assets.js — generates PNG icons + og-image from SVG.
 *
 * Uses sharp (already in deps) to rasterize src/app/icon.svg to:
 *   - public/icon-192.png  (PWA, 192x192)
 *   - public/icon-512.png  (PWA, 512x512)
 *   - public/favicon.ico   (browser tab, 32x32 wrapped in ICO container)
 *   - public/og-image.png   (social share, 1200x630)
 *
 * Run: node scripts/generate-assets.js
 *
 * Stage 5 fix: previously these were referenced in layout.tsx and manifest.ts
 * but didn't exist — would 404 on social shares + PWA install.
 */
const fs = require("node:fs");
const path = require("node:path");
const sharp = require("sharp");

const PROJECT_ROOT = path.resolve(__dirname, "..");
const ICON_SVG = path.join(PROJECT_ROOT, "src", "app", "icon.svg");
const PUBLIC = path.join(PROJECT_ROOT, "public");

async function main() {
  console.log("🎨 Generating BeerID static assets from icon.svg");
  console.log("");

  if (!fs.existsSync(ICON_SVG)) {
    console.error(`❌ Source SVG not found: ${ICON_SVG}`);
    process.exit(1);
  }

  if (!fs.existsSync(PUBLIC)) {
    fs.mkdirSync(PUBLIC, { recursive: true });
  }

  const svgBuffer = fs.readFileSync(ICON_SVG);

  // ─── PWA icons ──────────────────────────────────────────────────────
  console.log("📱 Generating PWA icons...");
  await sharp(svgBuffer, { density: 384 })
    .resize(192, 192, { fit: "contain" })
    .png()
    .toFile(path.join(PUBLIC, "icon-192.png"));
  console.log("  ✓ public/icon-192.png");

  await sharp(svgBuffer, { density: 384 })
    .resize(512, 512, { fit: "contain" })
    .png()
    .toFile(path.join(PUBLIC, "icon-512.png"));
  console.log("  ✓ public/icon-512.png");

  // ─── Apple touch icon (180x180, no transparency for iOS) ───────────
  console.log("🍎 Generating Apple touch icon...");
  await sharp(svgBuffer, { density: 384 })
    .resize(180, 180, { fit: "contain" })
    .flatten({ background: "#f59e0b" }) // solid amber background for iOS
    .png()
    .toFile(path.join(PUBLIC, "apple-icon.png"));
  console.log("  ✓ public/apple-icon.png");

  // ─── favicon.png (32x32) ─────────────────────────────────────────────
  console.log("🔖 Generating favicon PNG...");
  await sharp(svgBuffer, { density: 96 })
    .resize(32, 32, { fit: "contain" })
    .png()
    .toFile(path.join(PUBLIC, "favicon-32.png"));
  console.log("  ✓ public/favicon-32.png");

  await sharp(svgBuffer, { density: 64 })
    .resize(16, 16, { fit: "contain" })
    .png()
    .toFile(path.join(PUBLIC, "favicon-16.png"));
  console.log("  ✓ public/favicon-16.png");

  // ─── favicon.ico (ICO container) ────────────────────────────────────
  // sharp can't write ICO directly, but PNG favicon.ico is accepted by
  // modern browsers. For legacy IE we'd need real ICO format, but
  // IE is dead so PNG is fine.
  console.log("🔖 Generating favicon.ico (PNG fallback for modern browsers)...");
  await sharp(svgBuffer, { density: 96 })
    .resize(32, 32, { fit: "contain" })
    .png()
    .toFile(path.join(PUBLIC, "favicon.ico"));
  console.log("  ✓ public/favicon.ico");

  // ─── OG image (1200x630 for social sharing) ─────────────────────────
  console.log("🖼️  Generating OG image (1200x630) for social sharing...");
  // Use SVG with text — sharp can render SVG with text
  const ogSvg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#f59e0b"/>
      <stop offset="100%" stop-color="#d97706"/>
    </linearGradient>
  </defs>
  <rect width="1200" height="630" fill="url(#bg)"/>
  <text x="50%" y="35%" dominant-baseline="central" text-anchor="middle"
        font-size="180" font-family="system-ui, -apple-system, 'Apple Color Emoji', 'Segoe UI Emoji', sans-serif">🍺</text>
  <text x="50%" y="58%" dominant-baseline="central" text-anchor="middle"
        font-size="72" font-family="system-ui, -apple-system, sans-serif" font-weight="bold" fill="white">BeerID</text>
  <text x="50%" y="75%" dominant-baseline="central" text-anchor="middle"
        font-size="32" font-family="system-ui, -apple-system, sans-serif" fill="white" opacity="0.9">Персональный журнал и гид по пиву</text>
</svg>`;
  await sharp(Buffer.from(ogSvg), { density: 144 })
    .resize(1200, 630, { fit: "contain" })
    .png()
    .toFile(path.join(PUBLIC, "og-image.png"));
  console.log("  ✓ public/og-image.png (1200x630)");

  console.log("");
  console.log("✅ All assets generated successfully");
  console.log("");
  console.log("Generated files:");
  for (const f of [
    "icon-192.png",
    "icon-512.png",
    "apple-icon.png",
    "favicon-32.png",
    "favicon-16.png",
    "favicon.ico",
    "og-image.png",
  ]) {
    const p = path.join(PUBLIC, f);
    if (fs.existsSync(p)) {
      const size = fs.statSync(p).size;
      console.log(`  ${f}  (${(size / 1024).toFixed(1)} KB)`);
    }
  }
}

main().catch((err) => {
  console.error("❌ Asset generation failed:", err);
  process.exit(1);
});
