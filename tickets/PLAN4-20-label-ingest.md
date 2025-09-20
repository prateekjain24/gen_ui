# Ticket PLAN4-20 — Label-driven prompt & weight updates

- **Story Points:** 1
- **Depends on:** PLAN4-19

## Goal
Close the loop on the MVP label queue by letting reviewers mark candidates as “accepted” and stash that decision in simple JSON—no automated weight tuning.

## Context
Because Railway deployments are ephemeral, the safest approach is to persist accepted labels to a checked-in JSON config under version control. Engineers can then review diffs before promoting to prod.

## Requirements
1. Introduce `config/labeling/accepted.json` holding an array of accepted plan-edit descriptors (`recipeId`, `controlId`, `nextValue`, `notes`).
2. Create a CLI `scripts/labeling/accept.ts` that fetches current queue items (via the GET endpoint) and writes selected IDs into the JSON file.
3. The CLI should prompt interactively (e.g. `inquirer`-style via `bun` prompt) or accept `--ids=a,b` for CI-less usage; default to interactive.
4. On write, pretty-print the JSON and emit a console summary that reviewers can paste into release notes.
5. Update the labeling docs to explain that the JSON lives in git—after running the CLI, open a PR with the diff instead of auto-applying weights.

## Implementation Steps
1. Define a small TypeScript interface in `src/lib/labeling/types.ts` that both the queue and CLI can share.
2. Implement the CLI using `fetch` (or `undici`) to call the local API, filter the selected IDs, and append/merge them into the JSON file (dedupe on `recipeId+controlId+nextValue`).
3. Guard the CLI so it refuses to run if `ENABLE_LABELING_REVIEW` is off (warn and exit).
4. Add a smoke test that seeds fake queue data and verifies the JSON file append logic.
5. Extend the docs with step-by-step instructions and Railway-specific notes (e.g. “download the JSON from logs after acceptance if the filesystem is ephemeral”).

## Definition of Done
- Accepted label decisions persist to `config/labeling/accepted.json` with a stable schema.
- The `accept` CLI reads from the in-memory queue endpoint and writes the JSON without external tooling.
- Documentation clearly states the manual promotion flow and expectation to commit the JSON changes.
- No automated weight adjustments or external integrations are introduced at this stage.
