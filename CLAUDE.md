# vantrangedu — Education Platform (SSO Broker)

> **MANDATORY — YOUR FIRST ACTION MUST BE READING THE 4 FILES BELOW**

## ⛔ FORBIDDEN — DO NOT READ THESE FOR CONTEXT

- ❌ `README.md` — stale, wastes tokens
- ❌ `docs/` — stale, wastes tokens
- ❌ `package.json` — not needed for context
- ❌ Any source files for "understanding the project"
- ❌ `ls`, `find`, `Search`, `Glob` to explore project structure

## ✅ AUTO-START — Read these 4 files FIRST (before any response)

Your VERY FIRST action must be reading these 4 files using your Read tool. No other action before this:

1. Read `.serena/memories/00-overview.md`
2. Read `.serena/memories/10-architecture.md`
3. Read `.serena/memories/20-cross-repo-contracts.md`
4. Read `.serena/memories/30-active-work.md`

These contain EVERYTHING about the project: scope, architecture, cross-repo rules, current work.
After reading all 4, you have full context. Respond to the user.

## ✅ AUTO-FINISH — Before saying "done"/"completed"/"finished"

Write updated content to these files:
1. Write `.serena/memories/30-active-work.md` — task summary + changed files + timestamp
2. If you made technical decisions: append to `.serena/memories/40-decisions.md`
3. If you ran tests: append to `.serena/memories/50-verification.md`

If Serena MCP tools are available (mcp__serena__write_memory etc.), prefer them.
Otherwise, write files directly with your Write tool.

## ✅ WHILE WORKING — Keep memories updated

- After modifying 3+ files: update `30-active-work.md` with changed file list
- After technical decisions: append to `40-decisions.md`
- After running tests: append to `50-verification.md`

## Cross-Repo Safety (CRITICAL)

- Shared D1 database with vantrangexam — NEVER mix data
- ALL SELECT on shared tables: `WHERE source_site IN ('edu', 'system')`
- ALL INSERT/UPDATE on shared tables: hardcode `source_site = 'edu'`
- Shared tables: `program_organizers`, `programs`, `program_levels`, `field_definitions`, `field_options`, `field_values`
- NEVER modify tables owned by vantrangexam (vstep_exams, attempts, grading)

## 🔗 Cross-Repo Awareness

When working on features that touch shared infrastructure (SSO, shared tables, R2):
- **Sister repo memories**: `/home/namhbcf/Desktop/vantrangexam/.serena/memories/`
- Read vantrangexam's `20-cross-repo-contracts.md` if you need the consumer-side perspective
- Read vantrangexam's `30-active-work.md` to check for concurrent work that might conflict
- **NEVER edit** vantrangexam files from this repo — only read for context

## Memory Protection

| Memory | Access | Note |
|--------|--------|------|
| `00-overview.md` | READ-ONLY | Manual updates only (human/deep audit) |
| `10-architecture.md` | READ-ONLY | Manual updates only (human/deep audit) |
| `20-cross-repo-contracts.md` | READ-ONLY | Manual updates only (coordinate both repos) |
| `30-active-work.md` | READ-WRITE | Update every session |
| `40-decisions.md` | APPEND-ONLY | Never delete existing entries |
| `50-verification.md` | APPEND-ONLY | Never delete existing entries |

## Code Roots

- `frontend/` — React 19 + TypeScript + Vite
- `backend/` — Hono on Cloudflare Workers

## Quick Reference

| Item | Value |
|------|-------|
| Stack | React 19 + TS, Hono, CF Workers + D1 + R2 |
| SSO role | Broker (issues JWT consumed by vantrangexam) |
| Frontend dev | `cd frontend && npm run dev` |
| Backend dev | `cd backend && npm run dev` |
| Deploy backend | `cd backend && npm run deploy` |
| Tests | `cd backend && npx vitest run` |
| Sister repo | `/home/namhbcf/Desktop/vantrangexam/` |
