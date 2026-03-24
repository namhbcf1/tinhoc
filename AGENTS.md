# Agent Protocol — vantrangedu

> **ALL AGENTS MUST FOLLOW THIS PROTOCOL. NO EXCEPTIONS.**

## Source of Truth

`.serena/memories/` is the ONLY source of truth. NOT this file. NOT README. NOT docs/.

## Mandatory Start

**Claude Code agents**: Call Serena MCP tools:
```
activate_project("vantrangedu") → check_onboarding_performed() → list_memories() → read_memory(00, 10, 20, 30)
```

**Codex/other agents**: Read files directly:
```
.serena/memories/00-overview.md
.serena/memories/10-architecture.md
.serena/memories/20-cross-repo-contracts.md
.serena/memories/30-active-work.md
```

## Mandatory Finish

Before ending ANY session:

1. Update `.serena/memories/30-active-work.md` with: task completed, files changed, timestamp
2. If decisions were made: append to `.serena/memories/40-decisions.md`
3. If tests were run: append to `.serena/memories/50-verification.md`
4. **Claude Code**: call `prepare_for_new_conversation()`
5. **Codex**: run `bash scripts/serena/finalize-context.sh`

## Memory Protection Rules

| Memory | Access | Rule |
|--------|--------|------|
| `00-overview` | READ-ONLY | Never modify via agent. Human/deep audit only. |
| `10-architecture` | READ-ONLY | Never modify via agent. Human/deep audit only. |
| `20-cross-repo-contracts` | READ-ONLY | Never modify via agent. Coordinate both repos. |
| `30-active-work` | READ-WRITE | Update every session. Smart-merge, don't overwrite. |
| `40-decisions` | APPEND-ONLY | Never delete existing entries. Add new at bottom. |
| `50-verification` | APPEND-ONLY | Never delete existing entries. Add new at bottom. |

## Code Roots

- `frontend/` — React 19 + TypeScript + Vite
- `backend/` — Hono on Cloudflare Workers

## Cross-Repo Rules (CRITICAL)

| Rule | Detail |
|------|--------|
| SELECT filter | `WHERE source_site IN ('edu', 'system')` on shared tables |
| INSERT/UPDATE | hardcode `source_site = 'edu'` |
| Shared tables | program_organizers, programs, program_levels, field_definitions, field_options, field_values |
| Ownership | Students/classes/payments = here. Exams = vantrangexam |
| JWT | Broker — issues tokens for ecosystem |
| Migrations | Coordinate with vantrangexam before shared table changes |
| Tests | `cd backend && npx vitest run` |

## Cross-Repo Awareness

When modifying SSO, shared tables, or R2 paths:
- Read sister repo context: `/home/namhbcf/Desktop/vantrangexam/.serena/memories/20-cross-repo-contracts.md`
- Check sister active work: `/home/namhbcf/Desktop/vantrangexam/.serena/memories/30-active-work.md`
- **NEVER edit** sister repo files — read-only access for context
