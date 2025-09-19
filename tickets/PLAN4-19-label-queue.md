# Ticket PLAN4-19 — Label queue bootstrap

- **Story Points:** 1
- **Depends on:** PLAN4-18

## Goal
Set up a lightweight label queue allowing PMs/ops to review personalization telemetry and approve new heuristics or template examples.

## Context
Phase 4’s learning loop depends on human oversight. The queue organizes raw telemetry into actionable review tasks.

## Requirements
1. Create a script (`scripts/telemetry/export-plan-edits.ts`) that reads recent telemetry logs and groups edits by signal/knob combination.
2. Output a JSON or CSV file suitable for Airtable/Sheets ingestion, including counts, sample prompts, and recommended actions.
3. Provide a README (`docs/feedback-loop.md`) detailing how to run the export, review entries, and feed approvals back.
4. Ensure the script supports filters (date range, persona, recipe) via CLI args.
5. Cover happy-path execution with a unit test or integration test using fixture telemetry files.

## Implementation Steps
1. Define the data schema for label items (id, signals, knob, occurrence count, sample entries).
2. Implement the export script leveraging existing telemetry storage (JSONL).
3. Add CLI parsing for filters and file paths.
4. Write tests using sample telemetry logs placed under `src/lib/telemetry/__fixtures__`.
5. Draft the README with step-by-step review instructions.

## Definition of Done
- Export script generates label queue files with grouping and filters.
- Tests cover sample telemetry and CLI usage.
- Documentation explains the workflow and next steps after review.
