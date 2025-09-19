# Ticket PLAN4-04 — Hybrid signal merger

- **Story Points:** 1
- **Depends on:** PLAN4-02, PLAN4-03

## Goal
Combine keyword and LLM-derived signals into a single normalized structure stored on the session, preserving provenance and conflict resolution rules.

## Context
Downstream personalization expects a `PromptSignals` record with best-effort values and confidence scores. The merger must deterministically pick winners and record why.

## Requirements
1. Implement `buildPromptSignals(prompt: string, opts?: { signal?: AbortSignal }): Promise<PromptSignals>` in `src/lib/prompt-intel/index.ts`.
2. Ensure keyword extraction runs first; LLM parsing fills missing slots or boosts confidence when both agree.
3. When conflicting values exist, prefer deterministic results unless the LLM confidence exceeds a configurable threshold (default 0.75).
4. Attach provenance metadata per signal (`source`, `confidence`, `notes`) for debug HUD consumption.
5. Extend session store and telemetry events to capture the merged signals with their metadata.

## Implementation Steps
1. Create the orchestrator function that invokes keyword and LLM extractors sequentially.
2. Encode merge logic and threshold comparison; surface conflicts via debug logging.
3. Update `SessionState` types to include `promptSignals` and wire persistence in the canvas plan POST handler.
4. Emit telemetry entry when signals change to feed the Phase 5 feedback loop groundwork.
5. Add unit tests verifying merge behavior, conflict resolution, and metadata output.

## Definition of Done
- `buildPromptSignals` exists and updates session state with merged signals.
- Conflict resolution respects deterministic precedence rules.
- Telemetry and debug logging capture the resulting signals.
- Tests pass and cover high/low confidence scenarios.
