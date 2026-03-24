#!/usr/bin/env bash
# launch-claude.sh — Start Claude Code with Serena context
# Auto-starts watch-context daemon + prints Serena startup guide
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
REPO_NAME="$(basename "$REPO_ROOT")"
WATCHER_SCRIPT="$REPO_ROOT/scripts/serena/watch-context.sh"

# Windows-safe temp log path
TMPDIR_SAFE="${TMPDIR:-${TEMP:-${TMP:-/tmp}}}"
WATCHER_LOG="${TMPDIR_SAFE}/${REPO_NAME}-watcher.log"

echo "=== Launching Claude Code — ${REPO_NAME} ==="
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
echo "║ 1. activate_project('${REPO_NAME}')          ║"
echo "║ 2. check_onboarding_performed()              ║"
echo "║ 3. list_memories()                           ║"
echo "║ 4. read_memory: 00, 10, 20, 30               ║"
echo "║ 5. Update 30-active-work while working       ║"
echo "║ 6. prepare_for_new_conversation at end       ║"
echo "╚══════════════════════════════════════════════╝"
echo ""

cd "$REPO_ROOT"
echo "[launcher] Ready. Start Claude Code in: $REPO_ROOT"
