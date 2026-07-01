# Token + Context Optimization Master Guide (2025–2026)

> Portable reference. Commit to git → works on any machine, transferable to anyone.
> Re-install everything with: `bash scripts/setup-optimization.sh`

---

## 1. Installed Stack (verified working)

### Global tools (affect every project, install once)
| Tool | Install | Type | Function |
|---|---|---|---|
| `token-optimizer-mcp` | `npm i -g token-optimizer-mcp` | MCP server | 70+ tools: cache, compress, dedup, token count |
| `context-mode` | `npm i -g context-mode` | MCP server | Sandbox code exec + FTS5 BM25 search, ~98% reduction on large outputs |
| `caveman-shrink` | `npm i -g caveman-shrink` | MCP proxy | Compresses MCP tool descriptions, wraps other servers |
| `claude-token-optimizer` (`cto`) | `npm i -g claude-token-optimizer` | CLI | Per-file token audit, `.claudeignore` gen, CLAUDE.md compress |
| `code-review-graph` | `uv tool install code-review-graph` | CLI + MCP | Tree-sitter AST graph, blast-radius, 38–528× fewer tokens on reviews |

### Per-project (run inside each repo)
```bash
cto init --framework <nextjs|react|...>   # creates CLAUDE.md + .claudeignore + .claude/
cto hooks install --all                   # 12 token-monitoring hooks
code-review-graph install                 # writes MCP config + platform hooks
code-review-graph build                   # parse codebase into graph
```

### NOT real tools (myth-busted)
`RTK`, `token-savior`, `alexgreensh-token-optimizer`, `claude-token-efficient` — do not exist as packages. They are concepts/prompt patterns only.

---

## 2. Built-in Claude Code Features (zero install)

| Command | Effect | Savings |
|---|---|---|
| `/compact [instructions]` | Summarize conversation history | 40–60% of summarized part |
| `/clear` | Full context reset between unrelated tasks | 100% |
| `/btw <q>` | Side question, never enters history | 100% for quick lookups |
| `/effort low` | Fewer thinking tokens | 60–80% on thinking |
| `/context` | Diagnose what fills context now | — (visibility) |
| `/usage` | Token breakdown by skill/subagent/MCP | — (visibility) |
| Plan mode (Shift+Tab) | Explore before editing | 30–50% prevented rework |
| Subagents | Delegated work in own context window | ~93% — only summary returns |
| MCP Tool Search | Tool schemas deferred, names only (~120t) | thousands/server |
| Prompt caching | Auto-cache repeated content | 50–90% on cached segments |

**Key env vars:**
- `ENABLE_TOOL_SEARCH=auto` (default) — defer MCP schemas
- `MAX_THINKING_TOKENS=8000` — cap thinking on fixed-budget models

---

## 3. CLAUDE.md Rules (biggest lever)

- **Under 200 lines** per file — bloat causes rule-loss
- Markdown headers + bullets > paragraphs (Claude scans structure)
- Test each line: "Would removing this cause a mistake?" If no → cut
- Include: non-guessable bash commands, non-default code style, test instructions, gotchas
- Exclude: anything inferable from code, standard conventions, API docs (link instead), frequently-changing info
- `IMPORTANT` / `YOU MUST` for critical rules
- Custom compaction steering:
  ```markdown
  # Compact instructions
  When compacting, focus on test output and code changes.
  ```
- Move workflow detail → skills (`.claude/skills/*/SKILL.md`), load on demand
- Path-scoped rules → `.claude/rules/*.md` with `paths:` frontmatter, load only on matching files
- HTML comments `<!-- -->` stripped before injection (free human notes)

---

## 4. .claudeignore (always ignore)
```
node_modules/
dist/
build/
.next/
.cache/
coverage/
*.min.js
*.bundle.js
*.map
*.lock
*.log
*.csv
*.parquet
.git/objects/
# project docs not needed during dev (big token sinks)
docs/**/plans/**
docs/**/specs/**
CHANGELOG.md
README.md
```
Run `cto measure` to find per-file costs, then add the heavy ones.

---

## 5. Memory / Persistence (survives machines + transfers)

### Auto memory (default-on, Claude Code v2.1.59+)
- Location: `~/.claude/projects/<project>/memory/`
- `MEMORY.md` = index (first 200 lines / 25KB auto-loaded)
- Topic files (`debugging.md`) lazy-loaded on demand
- **NOT portable** — lives in home dir per machine

### File-based (portable — THIS is what transfers)
- `CLAUDE.md` hierarchy: managed > `~/.claude/CLAUDE.md` > `./CLAUDE.md` > `./CLAUDE.local.md`
- `@path/to/file` imports (4 levels deep) → share across projects
- **Commit `CLAUDE.md`, `.claude/`, `docs/`, this guide, and `scripts/setup-optimization.sh` to git** → portable everywhere
- code-review-graph DB lives in `.code-review-graph/` (rebuild with `code-review-graph build` on new machine — don't commit the DB, commit the build step)

### Subagent memory
- `~/.claude/agent-memory/` — per-subagent, set `memory: user` in frontmatter

---

## 6. Multi-Agent / A2A Patterns

| Pattern | How | When |
|---|---|---|
| **Subagent isolation** | Each gets own context, returns only summary | Research-heavy reads (~93% saving) |
| **Agent Teams** | `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1`, lead + teammates via shared task list + mailbox | Parallel exploration, peer review |
| **State file** | `.claude/multi-agent-swarm.local.md` w/ YAML frontmatter | Lightweight cross-agent coordination |
| **Workflow tool** | Deterministic fan-out: parallel/pipeline stages | Migrations, audits, broad sweeps |

A2A gateway: **LiteLLM** now routes MCP tool calls, caches responses, applies budgets at agent/tool level (`docs.litellm.ai/docs/a2a`).

---

## 7. Network / API Optimization

| Technique | Savings | Effort |
|---|---|---|
| Prompt caching (automatic) | 90% on cached tokens | 1 flag |
| Batch API (`messages.batches`) | 50% all tokens | low (async) |
| LiteLLM response cache (Redis/Qdrant semantic) | 100% on hits | medium (proxy) |
| Model routing (Haiku simple → Opus complex) | 80–90% on routed | low |
| stdio MCP transport | zero network overhead | default |
| Streamable HTTP + `Mcp-Session-Id` reuse | skip re-init | medium |
| Effort control | 30–60% output | low |

**Offline mode:** stdio MCP servers + LiteLLM disk cache = works without network (after auth). Pre-warm cache during online periods.

---

## 8. Current Project State (snapshot)

| Project | cto | hooks | graph nodes | tokens before→after |
|---|---|---|---|---|
| zgo | ✅ | 12 | 1,077 | 26,528 → 2,052 (92%) |
| truongphatcomputer | ✅ | 12 | 6,158 | 119,911 → 8,815 (93%) |
| vantrangexam | ✅ | 12 | 1,765 | 26,154 → 1,460 (94%) |
| vantrangedu | ✅ | 12 | 4,163 | 29,676 → 4,680 (83%) |

caveman-shrink wraps `token-optimizer-mcp` + `context-mode` in `~/.claude/settings.json`.

---

## Sources
- docs.anthropic.com/en/docs/build-with-claude/{prompt-caching,batch-processing}
- code.claude.com/docs/en/{context-window,memory,mcp,costs,sub-agents,agent-teams,skills,hooks-guide}
- modelcontextprotocol.io/specification/2025-03-26
- docs.litellm.ai/docs/{proxy/caching,routing-load-balancing,a2a}
- github.com/nadimtuhin/claude-token-optimizer · github.com/tirth8205/code-review-graph
