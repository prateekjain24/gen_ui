# Eval Plan

## Goals
- Capture every LLM decision with enough context to replay it later.
- Provide reviewers with a lightweight UI for labeling decisions as pass/fail with notes.
- Maintain versioned, replayable datasets for regression testing when prompts/models change.

## Data to Log Per Decision
- `decision_id`: stable key (e.g., `${sessionId}-${timestamp}`).
- `created_at`: ISO timestamp.
- `prompt_version`: e.g., `2025-09-18-form-orchestrator`.
- `model_name`: e.g., `gpt-5-mini`.
- `session_snapshot`: serialized state (current step, completed steps, persona, values, telemetry signals).
- `tool_output`: metadata + stepConfig used to render the next step.
- `raw_response`: optional reasoning text for debugging.
- `review_status`: default `unreviewed`.

## Storage + Review Workflow
1. **Primary archive**: append JSONL records to `eval-logs/YYYY-MM-DD.jsonl` (or S3). This is the source of truth.
2. **Sync script (`scripts/push-evals-to-airtable.ts`)**:
   - Reads unsynced records.
   - Posts batches (≤10) to Airtable `llm_decisions` table.
   - Stores the Airtable `recordId` back into the JSON to prevent duplicates.
3. **Airtable schema (`llm_decisions`)**:
   - Fields: `decision_id` (primary), `prompt_version`, `model_name`, `persona_detected`, `step_recommended`, `confidence`, `field_count`, `reasoning_snippet`, `status` (`unreviewed|pass|fail|needs_follow_up`), `review_notes`, `payload_url`.
   - Optionally link to `issues` table for follow-up tickets.
4. **Review process**:
   - Reviewers filter by `status = unreviewed`, inspect payload via linked URL, set `status` + `review_notes`.
5. **Pull script (`scripts/pull-evals-from-airtable.ts`)**:
   - Fetches labeled rows (`status != unreviewed`).
   - Merges reviewer labels back into JSONL (`evals/labeled/prompt-<version>.jsonl`).

## Regression Harness
- Command: `bun run eval:replay --prompt-version <version>`.
- Steps:
  1. Load labeled JSONL.
  2. Replay each sample against current prompt/model (without affecting production).
  3. Compare predicted tool output vs. expected outcome (`pass` should stay pass).
  4. Produce metrics per persona, step, and risk signal.
  5. Fail build if key metrics drop below thresholds.

## Operational Notes
- Keep Airtable API key in environment variables (`AIRTABLE_API_KEY`, `AIRTABLE_BASE_ID`).
- Respect Airtable limits (5 req/sec); use exponential backoff on 429.
- Large payloads: store JSON in S3/Git, place signed URL in Airtable `payload_url`.
- Version constants: bump `PROMPT_VERSION` when prompts change and include in every record.

## Next Steps
- Implement logging helper (`src/lib/telemetry/evals.ts`) to append JSONL entries when LLM decisions occur.
- Build push/pull scripts and document how to run them.
- Once labels exist, wire `bun run eval:replay` into CI to guard prompt/regression work.
