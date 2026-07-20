#!/usr/bin/env bash
# ──────────────────────────────────────────────────────────────────────
# BeerID — Smoke test
#
# Запускается после `bun run build` для проверки что critical user flows
# работают. Используется в CI + локально перед коммитом.
#
# Запуск:
#   bash scripts/smoke-test.sh
# ──────────────────────────────────────────────────────────────────────

set -e
cd "$(dirname "$0")/.."

PORT="${PORT:-3000}"
SERVER_PID=""
PASS=0
FAIL=0

cleanup() {
  if [ -n "$SERVER_PID" ] && kill -0 "$SERVER_PID" 2>/dev/null; then
    kill "$SERVER_PID" 2>/dev/null || true
    wait "$SERVER_PID" 2>/dev/null || true
  fi
}
trap cleanup EXIT INT TERM

check() {
  local name="$1"
  local expected="$2"
  local actual="$3"

  if [ "$actual" = "$expected" ]; then
    echo "  ✓ $name"
    PASS=$((PASS + 1))
  else
    echo "  ✗ $name"
    echo "    expected: $expected"
    echo "    actual:   $actual"
    FAIL=$((FAIL + 1))
  fi
}

echo ""
echo "🍺 BeerID — Smoke Test"
echo "═══════════════════════════════════════════════════════════"
echo ""

# 1. Build already done — check standalone exists
if [ ! -d ".next/standalone" ]; then
  echo "❌ No .next/standalone — run 'bun run build' first"
  exit 1
fi
echo "✓ Build artifacts exist"
echo ""

# 2. Start standalone server
echo "🚀 Starting server on port $PORT..."
PORT=$PORT bun .next/standalone/server.js > /tmp/beerid-smoke.log 2>&1 &
SERVER_PID=$!
sleep 5

# 3. Wait for server to be ready (up to 15 seconds)
# Note: /api/health may return 503 if DB is down — we just check that
# the server responds at all, not that DB is up.
READY=0
for i in {1..15}; do
  # -s = silent, -o /dev/null = discard body, only check HTTP response
  # accept 200, 401, 503 (all mean server is up)
  STATUS=$(curl -s -o /dev/null -w "%{http_code}" "http://localhost:$PORT/api/health" 2>/dev/null || echo "000")
  if [ "$STATUS" != "000" ]; then
    READY=1
    break
  fi
  sleep 1
done

if [ "$READY" -eq 0 ]; then
  echo "❌ Server didn't respond in 20 seconds — check logs:"
  cat /tmp/beerid-smoke.log | tail -20
  exit 1
fi

echo "✓ Server is up"
echo ""

echo "─── Public endpoints ───"
echo ""

# Test /api/health — returns 200 if DB up, 503 if DB down (placeholder URL in CI).
# Either is fine — we just want the endpoint to respond with valid JSON.
HEALTH_RESPONSE=$(curl -s "http://localhost:$PORT/api/health")
HEALTH_HAS_STATUS=$(echo "$HEALTH_RESPONSE" | python3 -c "import json,sys;print('yes' if 'status' in json.load(sys.stdin) else 'no')" 2>/dev/null || echo "no")
check "GET /api/health returns JSON with 'status' field" "yes" "$HEALTH_HAS_STATUS"

# Test home page renders
HOME_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "http://localhost:$PORT/")
check "GET / returns 200" "200" "$HOME_STATUS"

# Test home page has BeerID content
HOME_HAS_BEERID=$(curl -s "http://localhost:$PORT/" | grep -c "BeerID" || true)
if [ "$HOME_HAS_BEERID" -gt 0 ]; then
  echo "  ✓ Home page contains 'BeerID' text"
  PASS=$((PASS + 1))
else
  echo "  ✗ Home page missing 'BeerID' text"
  FAIL=$((FAIL + 1))
fi

# Test /auth/signin page exists (Stage 5 fix!)
SIGNIN_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "http://localhost:$PORT/auth/signin")
check "GET /auth/signin returns 200 (login page exists)" "200" "$SIGNIN_STATUS"

# Test home page has UserButton component (rendered client-side via SessionProvider)
# Note: UserButton is a client component using useSession() — on SSR it shows
# a loading skeleton, "Войти" button appears after hydration.
# We check for the UserButton module reference in the page chunks instead.
HOME_HAS_USERBUTTON=$(curl -s "http://localhost:$PORT/" | grep -c "UserButton" || true)
if [ "$HOME_HAS_USERBUTTON" -gt 0 ]; then
  echo "  ✓ Home page includes UserButton component (client-rendered)"
  PASS=$((PASS + 1))
else
  echo "  ✗ Home page missing UserButton component"
  FAIL=$((FAIL + 1))
fi

echo ""
echo "─── Protected endpoints (should return 401) ───"
echo ""

# Test /api/favorites without auth
FAV_STATUS=$(curl -s "http://localhost:$PORT/api/favorites" | python3 -c "import json,sys;d=json.load(sys.stdin);print(d.get('error',{}).get('code','') if not d.get('ok',True) else 'OK')" 2>/dev/null || echo "")
check "GET /api/favorites returns UNAUTHORIZED" "UNAUTHORIZED" "$FAV_STATUS"

# Test /api/journal without auth
JOURNAL_STATUS=$(curl -s "http://localhost:$PORT/api/journal" | python3 -c "import json,sys;d=json.load(sys.stdin);print(d.get('error',{}).get('code','') if not d.get('ok',True) else 'OK')" 2>/dev/null || echo "")
check "GET /api/journal returns UNAUTHORIZED" "UNAUTHORIZED" "$JOURNAL_STATUS"

# Test /api/achievements without auth
ACH_STATUS=$(curl -s "http://localhost:$PORT/api/achievements" | python3 -c "import json,sys;d=json.load(sys.stdin);print(d.get('error',{}).get('code','') if not d.get('ok',True) else 'OK')" 2>/dev/null || echo "")
check "GET /api/achievements returns UNAUTHORIZED" "UNAUTHORIZED" "$ACH_STATUS"

echo ""
echo "─── Auth endpoints ───"
echo ""

# Test NextAuth providers endpoint
PROVIDERS_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "http://localhost:$PORT/api/auth/providers")
check "GET /api/auth/providers returns 200" "200" "$PROVIDERS_STATUS"

echo ""
echo "─── Static assets ───"
echo ""

# Test favicon
ICON_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "http://localhost:$PORT/icon.svg")
check "GET /icon.svg returns 200" "200" "$ICON_STATUS"

ICON_TYPE=$(curl -s -o /dev/null -w "%{content_type}" "http://localhost:$PORT/icon.svg")
check "icon.svg content-type is image/svg+xml" "image/svg+xml" "$ICON_TYPE"

# Test PWA manifest
MANIFEST_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "http://localhost:$PORT/manifest.webmanifest")
check "GET /manifest.webmanifest returns 200" "200" "$MANIFEST_STATUS"

# Test robots.txt
ROBOTS_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "http://localhost:$PORT/robots.txt")
check "GET /robots.txt returns 200" "200" "$ROBOTS_STATUS"

ROBOTS_HAS_DISALLOW=$(curl -s "http://localhost:$PORT/robots.txt" | grep -c "Disallow: /api/" || true)
if [ "$ROBOTS_HAS_DISALLOW" -gt 0 ]; then
  echo "  ✓ robots.txt has 'Disallow: /api/'"
  PASS=$((PASS + 1))
else
  echo "  ✗ robots.txt missing 'Disallow: /api/'"
  FAIL=$((FAIL + 1))
fi

# Test og-image.png (KNOWN MISSING — see AUDIT.md)
OG_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "http://localhost:$PORT/og-image.png")
if [ "$OG_STATUS" = "200" ]; then
  echo "  ✓ GET /og-image.png returns 200"
  PASS=$((PASS + 1))
else
  echo "  ⚠ GET /og-image.png returns $OG_STATUS (known missing — run scripts/generate-assets.sh)"
  # Not a fail — known limitation
fi

echo ""
echo "─── Security headers ───"
echo ""

HEADERS=$(curl -s -I "http://localhost:$PORT/" 2>&1)

check_header() {
  local header="$1"
  if echo "$HEADERS" | grep -qi "^$header:"; then
    echo "  ✓ $header present"
    PASS=$((PASS + 1))
  else
    echo "  ✗ $header MISSING"
    FAIL=$((FAIL + 1))
  fi
}

check_header "Strict-Transport-Security"
check_header "X-Content-Type-Options"
check_header "X-Frame-Options"
check_header "Referrer-Policy"
check_header "Permissions-Policy"
check_header "Content-Security-Policy-Report-Only"

# Check X-Powered-By is NOT present (poweredByHeader: false)
if echo "$HEADERS" | grep -qi "^X-Powered-By:"; then
  echo "  ✗ X-Powered-By header present (should be removed)"
  FAIL=$((FAIL + 1))
else
  echo "  ✓ X-Powered-By header removed"
  PASS=$((PASS + 1))
fi

echo ""
echo "═══════════════════════════════════════════════════════════"
echo "Smoke test results:"
echo "  ✓ Passed: $PASS"
echo "  ✗ Failed: $FAIL"
echo "═══════════════════════════════════════════════════════════"
echo ""

if [ "$FAIL" -gt 0 ]; then
  echo "❌ Smoke test FAILED — $FAIL issue(s) detected"
  exit 1
else
  echo "✅ Smoke test PASSED — all $PASS checks green"
  exit 0
fi
