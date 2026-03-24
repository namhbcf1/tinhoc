#!/usr/bin/env bash
# watch-context.sh — Smart merge git changes into 30-active-work.md
# NEVER overwrites agent-curated sections (Open Issues, Completed Items, Session Updates)
# Usage: ./scripts/serena/watch-context.sh [--once]
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
REPO_NAME="$(basename "$REPO_ROOT")"
MEMORY_FILE="$REPO_ROOT/.serena/memories/30-active-work.md"
DEBOUNCE_SEC=10
MODE="${1:---daemon}"

# Patterns to EXCLUDE from changed files (noise)
EXCLUDE_PATTERNS=(
  "^dist/"
  "^frontend/dist/"
  "^coverage/"
  "^test-results/"
  "^.wrangler/"
  "^node_modules/"
  "^.serena/"
  "\.map$"
)

filter_noise() {
  local input="$1"
  local result="$input"
  for pattern in "${EXCLUDE_PATTERNS[@]}"; do
    result=$(echo "$result" | grep -vE "$pattern" || true)
  done
  echo "$result"
}

update_changed_files_section() {
  local changed_files
  changed_files=$(cd "$REPO_ROOT" && git diff --name-only HEAD 2>/dev/null || true)
  local staged_files
  staged_files=$(cd "$REPO_ROOT" && git diff --cached --name-only 2>/dev/null || true)

  local all_files
  all_files=$(echo -e "${changed_files}\n${staged_files}" | sort -u | grep -v '^$' || true)

  # Filter out noise
  all_files=$(filter_noise "$all_files")

  if [[ -z "$all_files" ]]; then
    echo "[watch-context] No meaningful changes detected."
    return
  fi

  local timestamp
  timestamp=$(date '+%Y-%m-%d %H:%M')
  local file_count
  file_count=$(echo "$all_files" | wc -l | tr -d ' ')

  # If memory file doesn't exist, create minimal structure
  if [[ ! -f "$MEMORY_FILE" ]]; then
    cat > "$MEMORY_FILE" <<EOF
# Active Work — ${REPO_NAME}

## Current Task
_No active task._

## Recently Changed Files
$(echo "$all_files" | sed 's/^/- /')

## Blockers
_None._

## Open Issues
_None tracked._

## Completed Items
_None recorded._
EOF
    echo "[watch-context] Created 30-active-work.md with ${file_count} files."
    return
  fi

  # SMART MERGE: Only update "Recently Changed Files" section, preserve everything else
  local temp_file
  temp_file=$(mktemp)

  local in_changed_section=false
  local changed_written=false

  while IFS= read -r line; do
    if [[ "$line" == "## Recently Changed Files" ]]; then
      in_changed_section=true
      echo "$line" >> "$temp_file"
      echo "_Auto-updated at ${timestamp} (${file_count} files)_" >> "$temp_file"
      echo "" >> "$temp_file"
      echo "$all_files" | sed 's/^/- /' >> "$temp_file"
      echo "" >> "$temp_file"
      changed_written=true
      continue
    fi

    # Stop replacing when next section starts
    if $in_changed_section && [[ "$line" =~ ^## ]]; then
      in_changed_section=false
    fi

    # Skip old content in changed section
    if $in_changed_section; then
      continue
    fi

    echo "$line" >> "$temp_file"
  done < "$MEMORY_FILE"

  # If no "Recently Changed Files" section existed, append one
  if ! $changed_written; then
    echo "" >> "$temp_file"
    echo "## Recently Changed Files" >> "$temp_file"
    echo "_Auto-updated at ${timestamp} (${file_count} files)_" >> "$temp_file"
    echo "" >> "$temp_file"
    echo "$all_files" | sed 's/^/- /' >> "$temp_file"
  fi

  mv "$temp_file" "$MEMORY_FILE"
  echo "[watch-context] Smart-merged ${file_count} changed files into 30-active-work.md"
}

if [[ "$MODE" == "--once" ]]; then
  update_changed_files_section
  exit 0
fi

echo "[watch-context] Starting daemon mode (debounce: ${DEBOUNCE_SEC}s)..."
echo "[watch-context] Watching: $REPO_ROOT"
echo "[watch-context] Press Ctrl+C to stop."

while true; do
  update_changed_files_section
  sleep "$DEBOUNCE_SEC"
done
