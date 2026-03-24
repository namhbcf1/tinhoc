#!/usr/bin/env bash
# launch-codex.sh — Start Codex with Serena context
# Auto-starts watch-context daemon + prints Serena startup guide
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
REPO_NAME="$(basename "$REPO_ROOT")"
WATCHER_SCRIPT="$REPO_ROOT/scripts/serena/watch-context.sh"

# Windows-safe temp log path
TMPDIR_SAFE="${TMPDIR:-${TEMP:-${TMP:-/tmp}}}"
WATCHER_LOG="${TMPDIR_SAFE}/${REPO_NAME}-watcher.log"

echo "=== Launching Codex — ${REPO_NAME} ==="
echo ""

# Ensure watcher is running
if pgrep -f "watch-context.sh.*${REPO_NAME}" > /dev/null 2>&1; then
  echo "[launcher] Watcher already running."
else
  echo "[launcher] Starting watcher in background..."
  nohup bash "$WATCHER_SCRIPT" > "$WATCHER_LOG" 2>&1 &
  echo "[launcher] Watcher PID: $! — Log: $WATCHER_LOG"
fi

echo ""
echo "╔══════════════════════════════════════════════╗"
echo "║         Serena-First Startup Guide           ║"
echo "╠══════════════════════════════════════════════╣"
echo "║ 1. cat .serena/memories/00-overview.md       ║"
echo "║ 2. cat .serena/memories/10-architecture.md   ║"
echo "║ 3. cat .serena/memories/20-cross-repo-*.md   ║"
echo "║ 4. cat .serena/memories/30-active-work.md    ║"
echo "║ 5. Work → update 30-active-work when done    ║"
echo "║ 6. bash scripts/serena/finalize-context.sh   ║"
echo "╚══════════════════════════════════════════════╝"
echo ""

cd "$REPO_ROOT"
echo "[launcher] Ready. Start Codex in: $REPO_ROOT"
echo "[launcher] Ensure ~/.codex/config.toml trusts this project."
