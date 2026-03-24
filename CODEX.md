# Codex Instructions — vantrangedu

> **MANDATORY — Execute before any response**

## AUTO-START (read these files silently before first response)

```bash
cat .serena/memories/00-overview.md
cat .serena/memories/10-architecture.md
cat .serena/memories/20-cross-repo-contracts.md
cat .serena/memories/30-active-work.md
```

Internalize all content. Do not summarize to user. Begin working.

## AUTO-FINISH (before saying "done" or ending)

Update active work memory with what you did:
```bash
cat > .serena/memories/30-active-work.md << 'MEMEOF'
# Active Work — vantrangedu

## Current Task
<describe what was just completed>

## Recently Changed Files
<list all files you modified>

## Completed Items
<summary of what was done>

## Updated
<current date/time>
MEMEOF
```

Then run finalize:
```bash
bash scripts/serena/finalize-context.sh
```

## WHILE WORKING

After every 3+ file changes, update `30-active-work.md` with changed file list.

## Cross-Repo Safety

- Shared D1 with vantrangexam — ALWAYS use `WHERE source_site IN ('edu', 'system')` in SELECT
- ALWAYS hardcode `source_site = 'edu'` in INSERT/UPDATE
- NEVER modify exam/attempt/grading tables (owned by vantrangexam)
- Shared tables: program_organizers, programs, program_levels, field_definitions, field_options, field_values

## Code Roots

- `frontend/` — React 19 + TypeScript + Vite
- `backend/` — Hono on Cloudflare Workers

## Commands

- Frontend: `cd frontend && npm run dev`
- Backend: `cd backend && npm run dev`
- Deploy: `cd backend && npm run deploy`
- Tests: `npm test` (in respective dir)
