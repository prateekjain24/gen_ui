# Ticket PLAN4-18 — Post-plan edit telemetry

- **Story Points:** 1
- **Depends on:** PLAN4-07, PLAN4-14

## Goal
Capture MVP-grade audit logs for plan edits that can run fully on a Railway deployment without extra services.

## Context
We only need enough telemetry to diagnose personalization tweaks during pilot reviews. A single JSONL log (and console output) is sufficient—as long as it captures who changed what and when.

## Requirements
1. Add a `recordPlanEdit` helper that appends JSON lines to `./data/plan-edits.jsonl` (create the folder if missing) and also emits `console.info` for immediate visibility on Railway.
2. Include minimal fields: `timestamp`, `recipeId`, `controlId`, `previousValue`, `nextValue`, and `signalsSummary` (stringified list of high-confidence signals).
3. Wire the customize drawer undo/reset/knob handlers to call the helper; avoid debouncing to keep the implementation straightforward.
4. Harden the helper with try/catch so logging failures never crash the request—write a single warning if the file cannot be opened.
5. Document how to tail the log locally (`bun scripts/tail-plan-edits.ts` or `tail -f`) and for Railway (`railway logs`).

## Implementation Steps
1. Create `src/lib/telemetry/plan-edits.ts` exporting the helper and TypeScript type for the payload.
2. Use Node's `fs/promises.appendFile` to write one line per event; fall back to console-only mode if the directory is read-only.
3. Inject the helper into `CustomizeDrawer` edit paths and any other surfaces that change recipe knobs during the MVP.
4. Ship a tiny CLI script `scripts/tail-plan-edits.ts` that streams the JSONL file with pretty-print formatting.
5. Update `docs/demo-script.md` or a new `docs/telemetry-notes.md` section explaining the logging flow and Railway considerations.

## Definition of Done
- Editing knobs, undo, and reset all emit JSONL log entries plus console info.
- The helper tolerates missing folders or read-only FS without breaking the user experience.
- Reviewers can follow the documented steps to inspect logs locally or via Railway.
- Type definitions live alongside the helper for future reuse, but no external queues or retries exist.
