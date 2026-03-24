#!/usr/bin/env bash
# finalize-context.sh — Smart session finalize for Serena memories
# Appends ONLY meaningful data. Skips duplicate commit dumps.
# Triggered automatically by: Claude Code Stop hook, git post-commit, or manually.
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
REPO_NAME="$(basename "$REPO_ROOT")"
DECISIONS_FILE="$REPO_ROOT/.serena/memories/40-decisions.md"
VERIFICATION_FILE="$REPO_ROOT/.serena/memories/50-verification.md"
TIMESTAMP=$(date '+%Y-%m-%d %H:%M')

echo "=== Finalize Context — ${REPO_NAME} ==="
echo "Timestamp: $TIMESTAMP"
echo ""

cd "$REPO_ROOT"

# 1. Git summary (display only — NOT appended to memories)
echo "--- Git Status ---"
git status --short 2>/dev/null || echo "(not a git repo)"
echo ""

LATEST_COMMIT=$(git log --oneline -1 --format="%h %s" 2>/dev/null || echo "(none)")
echo "--- Latest Commit ---"
echo "$LATEST_COMMIT"
echo ""

# 2. Smart append to 40-decisions.md — only if there are NEW commits since last finalize
LAST_FINALIZE_HASH=""
if grep -qE "^- .* \([a-f0-9]{7,}\)" "$DECISIONS_FILE" 2>/dev/null; then
  # Portable: no grep -P, use grep -oE instead
  LAST_FINALIZE_HASH=$(grep -oE '\([a-f0-9]{7,}\)' "$DECISIONS_FILE" | tail -1 | tr -d '()')
fi

NEW_COMMITS=""
if [[ -n "$LAST_FINALIZE_HASH" ]]; then
  NEW_COMMITS=$(git log --oneline --format="- %s (%h)" "${LAST_FINALIZE_HASH}..HEAD" 2>/dev/null || true)
else
  NEW_COMMITS=$(git log --oneline -3 --format="- %s (%h)" 2>/dev/null || true)
fi

if [[ -n "$NEW_COMMITS" && "$NEW_COMMITS" != "- (no commits)" ]]; then
  cat >> "$DECISIONS_FILE" <<EOF

### $TIMESTAMP — Session Summary
- **Recent commits** (since last finalize):
$NEW_COMMITS
EOF
  echo "[finalize] Appended new commits to 40-decisions.md"
else
  echo "[finalize] No new commits — skipping 40-decisions.md update"
fi

# 3. Run tests with CORRECT commands per repo (no grep -P, use grep -E)
echo ""
echo "--- Running Tests ---"
TEST_OUTPUT=""
TEST_STATUS="unknown"
TEST_CMD=""
TEST_SUMMARY=""

if [[ "$REPO_NAME" == "vantrangexam" ]]; then
  # vantrangexam: vitest shim broken, use direct node invocation
  if [[ -f "$REPO_ROOT/node_modules/vitest/vitest.mjs" ]]; then
    TEST_CMD="node node_modules/vitest/vitest.mjs run"
    TEST_OUTPUT=$(cd "$REPO_ROOT" && node node_modules/vitest/vitest.mjs run 2>&1 || true)
  fi
elif [[ "$REPO_NAME" == "vantrangedu" ]]; then
  # vantrangedu: backend vitest
  if [[ -f "$REPO_ROOT/backend/package.json" ]]; then
    TEST_CMD="cd backend && npx vitest run"
    TEST_OUTPUT=$(cd "$REPO_ROOT/backend" && npx vitest run 2>&1 || true)
  fi
fi

if [[ -z "$TEST_CMD" ]]; then
  TEST_STATUS="no test runner found"
elif echo "$TEST_OUTPUT" | grep -qE '[0-9]+ tests? passed'; then
  TEST_STATUS="passing"
  TEST_SUMMARY=$(echo "$TEST_OUTPUT" | grep -oE '[0-9]+ files?.*[0-9]+ tests? passed' | tail -1)
elif echo "$TEST_OUTPUT" | grep -qiE "fail"; then
  TEST_STATUS="failing"
  TEST_SUMMARY=$(echo "$TEST_OUTPUT" | grep -iE "fail|error" | head -3 | tr '\n' ' ')
else
  TEST_STATUS="inconclusive"
  TEST_SUMMARY=$(echo "$TEST_OUTPUT" | tail -3 | tr '\n' ' ')
fi

# Only append if tests actually ran
if [[ "$TEST_STATUS" != "no test runner found" ]]; then
  cat >> "$VERIFICATION_FILE" <<EOF

## Test Run — $TIMESTAMP
- **Command**: \`$TEST_CMD\`
- **Status**: $TEST_STATUS
- **Summary**: ${TEST_SUMMARY:-$(echo "$TEST_OUTPUT" | tail -2 | tr '\n' ' ')}
EOF
  echo "[finalize] Updated 50-verification.md (tests: $TEST_STATUS)"
else
  echo "[finalize] No test runner found — skipping 50-verification.md"
fi

# 4. Summary
echo ""
echo "╔═══════════════════════════════════════════════════╗"
echo "║  Session finalized. Memories updated.             ║"
echo "║  If using Serena MCP: prepare_for_new_conversation║"
echo "╚═══════════════════════════════════════════════════╝"
