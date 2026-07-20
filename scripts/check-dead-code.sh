#!/usr/bin/env bash
# ──────────────────────────────────────────────────────────────────────
# BeerID — Dead code detector
#
# Find .ts/.tsx files in src/lib/ and src/components/ that are never
# imported anywhere. Helps catch "Stage 5 trap" — helper modules created
# but never consumed (clickable-card, plural, logger, validation were
# all dead code until we caught it in the final audit).
#
# Run: bash scripts/check-dead-code.sh
# Exit 1 if dead code found.
# ──────────────────────────────────────────────────────────────────────

set -e
cd "$(dirname "$0")/.."

echo ""
echo "🔍 BeerID — Dead code detector"
echo "═══════════════════════════════════════════════════════════"
echo ""

DEAD_COUNT=0
LIVE_COUNT=0
WARNINGS=0

check_file_imported() {
  local file="$1"
  local name
  name=$(basename "$file")
  name="${name%.ts}"
  name="${name%.tsx}"
  # Special case: index files are imported by directory
  if [ "$name" = "index" ]; then
    return 0
  fi
  # Count imports of this file across the codebase
  # Match:
  #   - static import: from "@/lib/X" or from "./X" or from "../X"
  #   - dynamic import: import("@/components/beer/X") — used by next/dynamic
  local count
  count=$(grep -rE "(from ['\"][^'\"]*${name}['\"]|import\(['\"][^'\"]*${name}['\"]\))" src/ 2>/dev/null | grep -v "^${file}:" | wc -l)
  echo "$count"
}

# Files to check
echo "─── src/lib/*.ts ───"
for f in src/lib/*.ts; do
  [ -f "$f" ] || continue
  name=$(basename "$f" .ts)
  count=$(check_file_imported "$f")
  if [ "$count" -eq 0 ]; then
    # Allow certain entry points (db, env, auth, api are imported by routes indirectly)
    if echo "$name" | grep -qE "^(db|env|auth|api|api-client)$"; then
      echo "  ⚠ $f (entry point — likely used by routes, not imported directly)"
      WARNINGS=$((WARNINGS + 1))
    else
      echo "  ✗ DEAD CODE: $f (0 imports)"
      DEAD_COUNT=$((DEAD_COUNT + 1))
    fi
  else
    echo "  ✓ $name.ts ($count imports)"
    LIVE_COUNT=$((LIVE_COUNT + 1))
  fi
done

echo ""
echo "─── src/components/beer/*.tsx ───"
for f in src/components/beer/*.tsx; do
  [ -f "$f" ] || continue
  name=$(basename "$f" .tsx)
  count=$(check_file_imported "$f")
  if [ "$count" -eq 0 ]; then
    # Allow page entry components
    if echo "$name" | grep -qE "^(page|layout|error|loading|not-found|global-error|manifest|icon|apple-icon)$"; then
      echo "  ⚠ $f (Next.js convention file — OK)"
      WARNINGS=$((WARNINGS + 1))
    else
      echo "  ✗ DEAD CODE: $f (0 imports)"
      DEAD_COUNT=$((DEAD_COUNT + 1))
    fi
  else
    echo "  ✓ $name.tsx ($count imports)"
    LIVE_COUNT=$((LIVE_COUNT + 1))
  fi
done

echo ""
echo "─── src/hooks/*.ts ───"
for f in src/hooks/*.ts; do
  [ -f "$f" ] || continue
  name=$(basename "$f" .ts)
  count=$(check_file_imported "$f")
  if [ "$count" -eq 0 ]; then
    echo "  ✗ DEAD CODE: $f (0 imports)"
    DEAD_COUNT=$((DEAD_COUNT + 1))
  else
    echo "  ✓ $name.ts ($count imports)"
    LIVE_COUNT=$((LIVE_COUNT + 1))
  fi
done

echo ""
echo "═══════════════════════════════════════════════════════════"
echo "Dead code detector results:"
echo "  ✓ Live: $LIVE_COUNT"
echo "  ⚠ Warnings: $WARNINGS (entry points — likely OK)"
echo "  ✗ Dead: $DEAD_COUNT"
echo "═══════════════════════════════════════════════════════════"
echo ""

if [ "$DEAD_COUNT" -gt 0 ]; then
  echo "❌ Dead code detected — $DEAD_COUNT module(s) never imported"
  echo ""
  echo "Either:"
  echo "  1. Wire them up (import from a consumer)"
  echo "  2. Delete them if unused"
  exit 1
else
  echo "✅ No dead code detected"
  exit 0
fi
