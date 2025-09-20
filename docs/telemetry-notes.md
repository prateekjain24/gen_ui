# Plan edit telemetry

This deployment captures post-plan edits for MVP reviews. The `recordPlanEdit` helper appends JSONL entries to `data/plan-edits.jsonl` and mirrors each event to `console.info` so Railway logs stay in sync.

## What gets logged
- Knob tweaks inside the customize drawer (`approvalChainLength`, `integrationMode`, `copyTone`, `inviteStrategy`).
- Undo and reset actions, including the previous knob snapshot.
- The active recipe id plus a summary of high-confidence prompt signals to contextualize each change.

All writes are wrapped in a best-effort guard. If the filesystem is read-only, logging falls back to console-only mode after emitting a single warning.

## Inspecting logs locally
1. Create and tail the stream with `bun scripts/tail-plan-edits.ts`.
2. Alternatively, rely on `tail -f data/plan-edits.jsonl` to view the raw JSONL feed.

## Inspecting logs on Railway
- Use `railway logs` (optionally scoped to the web service) to see the same `console.info` entries in real time.
- Because Railway mounts the project with a writable volume, the JSONL file persists under `/app/data/plan-edits.jsonl` if direct access is needed.

## Maintenance notes
- The telemetry helper trims duplicate warnings once file writes fail.
- The customize drawer logs immediately without debouncing to keep the audit trail complete.
- The script `scripts/tail-plan-edits.ts` formats JSON entries for readability and follows append-only semantics.

## Label review queue

When `ENABLE_LABELING_REVIEW=true`, the app keeps an in-memory queue of interesting plan edits that product can review during pilot sessions. The queue lives for the lifetime of the Node process, so it resets on every Railway redeploy.

### Adding and reading candidates
- Start the dev server with `ENABLE_LABELING_REVIEW=true bun run dev` so the API endpoint is active.
- Enqueue a candidate with `curl -X POST http://localhost:3000/api/labeling -H "Content-Type: application/json" -d '{"recipeId":"R1","controlId":"copyTone","previousValue":"collaborative","nextValue":"trusted-advisor","signalsSummary":"[]","notes":"Flag for copy review"}'`.
- Review the current queue with one of:
  - `bun scripts/labeling/print-current.ts`
  - `curl http://localhost:3000/api/labeling`

On Railway, swap the base URL for the deployed hostname or use `railway run curl ...` from the project root. Copy the JSON output into a log note or spreadsheet as needed.

### Operational details
- The queue keeps the 50 most recent entries and silently drops older ones to avoid unbounded memory use.
- When the feature flag is false, the API responds with `403` and the helpers become no-ops.
- `POST /api/labeling` stores the payload emitted by `recordPlanEdit` plus free-form reviewer notes for quick triage.

### Accepting label candidates
- Pull the latest queue snapshot with `bun scripts/labeling/accept.ts` (or pass `--endpoint` if targeting Railway).
- The script lists each candidate’s `id`, recipe knob edits, and notes—select entries interactively or pass `--ids=id1,id2` for automation.
- Accepted entries merge into `config/labeling/accepted.json`; the script emits a bullet summary suitable for release notes.
- Commit the JSON changes in git so reviewers can diff accepted labels before promoting weight updates.
