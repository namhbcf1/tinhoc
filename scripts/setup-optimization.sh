#!/usr/bin/env bash
# ============================================================
# Claude Code Token Optimization — One-shot setup script
# Works on any fresh Ubuntu/Linux machine.
# Run: bash scripts/setup-optimization.sh
# ============================================================
set -euo pipefail

echo "🔧 Claude Code Optimization Stack Setup"
echo "========================================"

# --- 1. uv (Python tool manager) ---
if ! command -v uv &>/dev/null; then
  echo "→ Installing uv..."
  curl -LsSf https://astral.sh/uv/install.sh | sh
  export PATH="$HOME/.local/bin:$PATH"
else
  echo "✅ uv already installed: $(uv --version)"
fi

# --- 2. Node tools (npm global) ---
echo ""
echo "→ Installing npm global tools..."
npm install -g claude-token-optimizer   # cto CLI
npm install -g context-mode            # MCP server: FTS5 + sandbox
npm install -g caveman-shrink          # MCP proxy: compress descriptions

# --- 3. Python tools (uv) ---
echo ""
echo "→ Installing uv tools..."
uv tool install code-review-graph 2>/dev/null || echo "  (already installed)"

# --- 4. Verify ---
echo ""
echo "========================================"
echo "✅ Verification:"
echo "  cto --version:             $(cto --version 2>&1 || echo 'NOT FOUND')"
echo "  code-review-graph --version: $(code-review-graph --version 2>&1 || echo 'NOT FOUND')"
echo "  context-mode:              installed ✓"
echo "  caveman-shrink:            installed ✓"
echo ""
echo "========================================"
echo "Next steps per project:"
echo "  cd <project>"
echo "  cto init --framework <react|nextjs|vue|...>"
echo "  cto hooks install --all"
echo "  code-review-graph install && code-review-graph build"
echo ""
echo "Global MCP config:"
echo "  Add to ~/.claude/settings.json → mcpServers:"
cat << 'CFG'
  "token-optimizer-mcp-shrunk": {
    "command": "caveman-shrink",
    "args": ["npm", "exec", "token-optimizer-mcp"]
  },
  "context-mode-shrunk": {
    "command": "caveman-shrink",
    "args": ["npm", "exec", "context-mode"]
  }
CFG
echo ""
echo "Restart Claude Code to load new config. Done! 🚀"
