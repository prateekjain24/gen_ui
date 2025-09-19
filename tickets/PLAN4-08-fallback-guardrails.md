# Ticket PLAN4-08 — Personalization fallback guardrails

- **Story Points:** 1
- **Depends on:** PLAN4-07

## Goal
Ensure the personalization engine gracefully falls back to Phase 3 defaults when signals are weak or conflicting, documenting the rationale for every fallback.

## Context
Phase 4 cannot risk surprising users with unstable plans. Guardrails keep personalization trustworthy while providing transparency in debug tools and telemetry.

## Requirements
1. Implement fallback logic inside `scoreRecipeKnobs` (or a helper) that triggers when aggregate confidence drops below 0.5 or when conflicting signals remain unresolved.
2. Record fallback reasons (e.g., `"insufficient_confidence"`, `"conflict_governance_vs_fast"`) and surface them via debug HUD and eval logs.
3. Update the review screen to show when defaults were enforced and allow manual overrides.
4. Add tests verifying fallback triggers and metadata emission.
5. Document fallback conditions in `docs/prompt-intel/signal-taxonomy.md` or adjacent README.

## Implementation Steps
1. Define thresholds and conflict detection heuristics based on the signal taxonomy.
2. Extend the scoring engine to return both overrides and fallback metadata.
3. Thread fallback info through the canvas plan API response, HUD, and telemetry logger.
4. Add UI messaging in the review step to explain when personalization was skipped.
5. Write tests covering low confidence, conflicting signals, and normal operation.

## Definition of Done
- Fallbacks activate deterministically with clear reasons.
- Debug HUD and review UI surface fallback messaging.
- Tests cover the primary fallback scenarios.
- Documentation captures the thresholds for future tuning.
