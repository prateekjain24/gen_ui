# Eval Plan

## Goals
- Capture every LLM decision with enough context to replay it later.
- Provide reviewers with a lightweight UI for labeling decisions as pass/fail with notes.
- Maintain versioned, replayable datasets for regression testing when prompts/models change.

## Data to Log Per Decision
- `decision_id`: generated id `${sessionId}-${epoch}-${suffix}`.
- `created_at`: ISO timestamp.
- `prompt_version`: reads from `LLM_PROMPT_VERSION` env (defaults to `2025-09-19-form-orchestrator`).
- `model_name`: e.g., `gpt-5-mini`.
- `sessionContext`: sanitized snapshot (persona, values, telemetry signals).
- `plan`: enhanced `FormPlan` that we render for the user.
- `metadata`: reasoning, confidence, persona, decision from the tool output.
- `raw_response`: raw JSON string returned by the model before parsing.
- `summary`: `{ stepId, fieldCount }` for quick filtering.

> Logs are appended under `eval/logs/<YYYY-MM-DD>.jsonl`. The helper also maintains `eval/logs/.airtable-sync.json` to remember which decisions were uploaded to Airtable.

## Storage + Review Workflow
1. **Primary archive**: JSONL records live in `eval/logs/<date>.jsonl`. Configure `EVAL_LOG_DIR` to use a persistent volume (e.g., `/data/eval/logs` on Railway).
2. **Sync script (`scripts/push-evals-to-airtable.ts`)**:
   - Reads unsynced records.
   - Posts records (one at a time) to the Airtable `llm_decisions` table.
   - Updates `eval/logs/.airtable-sync.json` with the Airtable `recordId` to prevent duplicates.
3. **Airtable schema (`llm_decisions`)**:
   - Fields: `decision_id` (primary), `prompt_version`, `model_name`, `persona_detected`, `step_recommended`, `confidence`, `field_count`, `reasoning_snippet`, `status` (`unreviewed|pass|fail|needs_follow_up`), `review_notes`, `payload_url`.
   - Optionally link to `issues` table for follow-up tickets.
4. **Review process**:
   - Reviewers filter by `status = unreviewed`, inspect payload via linked URL, set `status` + `review_notes`.
5. **Pull script (`scripts/pull-evals-from-airtable.ts`)** *(future)*:
   - Fetch labeled rows (`status != unreviewed`).
   - Merge reviewer labels back into JSONL (`evals/labeled/prompt-<version>.jsonl`).

## How to Push Logs to Airtable

```
# Dry-run (prints intent without calling Airtable)
bun run push:evals:dry

# Upload new decisions
bun run push:evals
```

- Requires `AIRTABLE_API_KEY`, `AIRTABLE_BASE_ID`, and optionally `AIRTABLE_TABLE_NAME`.
- Retries automatically on HTTP 429 and records synced ids in `.airtable-sync.json`.
- Remove an entry from `.airtable-sync.json` to re-sync that decision.


## Regression Harness
- Command: `bun run eval:replay --prompt-version <version>`.
- Steps:
  1. Load labeled JSONL.
  2. Replay each sample against current prompt/model (without affecting production).
  3. Compare predicted tool output vs. expected outcome (`pass` should stay pass).
  4. Produce metrics per persona, step, and risk signal.
  5. Fail build if key metrics drop below thresholds.

## Operational Notes
- Keep Airtable secrets in environment variables (`AIRTABLE_API_KEY`, `AIRTABLE_BASE_ID`, `AIRTABLE_TABLE_NAME`).
- Respect Airtable limits (5 req/sec); the sync script automatically retries on 429.
- Large payloads: store JSON in S3/Git and place a signed URL in Airtable `payload_url` when we scale beyond local logs.
- Version constants: bump `LLM_PROMPT_VERSION` whenever prompts change so eval records remain comparable.
- Hosted environments should point `EVAL_LOG_DIR` to a persistent volume and add a cron to prune old logs (e.g., retain 30 days).

## Next Steps
- Build the replay harness (`bun run eval:replay`) that diff-checks current prompts/models against labeled decisions.
- Add a lightweight viewer (could be a Next route) to browse JSONL records without Airtable.
- Define reviewer rubric in Airtable (`status`, `notes`, persona-specific checklists) and socialise with the product team.
