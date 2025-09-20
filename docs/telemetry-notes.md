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
