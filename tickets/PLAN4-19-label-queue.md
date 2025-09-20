# Ticket PLAN4-19 — Label queue bootstrap

- **Story Points:** 1
- **Depends on:** PLAN4-18

## Goal
Expose an on-box, in-memory review list that product can read while the app runs on Railway—no external queues or data exports.

## Context
With the MVP telemetry writing JSONL files, we just need a quick way to mark “interesting” edits during a reviewing session. A lightweight in-memory queue behind a feature flag keeps the footprint tiny and resets automatically on redeploy.

## Requirements
1. Add `src/lib/labeling/memory-queue.ts` exporting `pushLabelCandidate`, `listLabelCandidates`, and `clearLabelCandidates` functions backed by an array.
2. Gate usage behind a single environment toggle (`ENABLE_LABELING_REVIEW`); when false the helpers become no-ops.
3. Register a Next.js route handler (e.g. `app/api/labeling/route.ts`) that supports `POST` to enqueue candidates and `GET` to read the current list as JSON.
4. For MVP grouping, pipe events straight through—store the payload from `recordPlanEdit` plus a `notes` field supplied by the caller.
5. Document the manual review workflow: start the dev server, hit the GET endpoint, and copy the JSON into a Railway log note or spreadsheet if needed.

## Implementation Steps
1. Implement the queue module with simple Array storage and a max length (default 50) to prevent runaway memory usage.
2. Wire the API route to reject requests if `ENABLE_LABELING_REVIEW` is disabled; otherwise convert the body to the queue shape and append.
3. Add a minimal `scripts/labeling/print-current.ts` helper that fetches the GET endpoint and pretty-prints the items.
4. Update `docs/telemetry-notes.md` (or the existing demo script) to include instructions and sample `curl` commands.
5. Include a unit test that ensures the queue respects the max length and clears correctly.

## Definition of Done
- The in-memory queue exists, is protected by the env toggle, and exposes GET/POST handlers.
- Queue items survive for the life of the process and reset naturally on Railway restarts.
- A helper script and docs show reviewers how to capture the current queue snapshot.
- No external storage, workers, or export pipelines are introduced.
