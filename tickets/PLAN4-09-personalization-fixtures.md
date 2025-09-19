# Ticket PLAN4-09 — Personalization fixtures & regression tests

- **Story Points:** 1
- **Depends on:** PLAN4-08

## Goal
Lock in representative scenarios for the personalization engine using fixtures and snapshot tests so future tuning doesn’t break expected behavior.

## Context
Phase 4 introduces many knobs that can regress silently. Fixture-driven tests provide guardrails and enable rapid experimentation.

## Requirements
1. Create fixture inputs under `src/lib/personalization/__fixtures__` for at least four personas (explorer, team, power, compliance-heavy).
2. Add a test suite that runs signals through `scoreRecipeKnobs` and snapshots overrides, rationales, and fallback metadata.
3. Include a high-governance case verifying multi-knob adjustments (approval chain, integration mode, copy tone).
4. Provide inline documentation on how to update fixtures when heuristics change.
5. Ensure tests integrate with CI without additional setup.

## Implementation Steps
1. Capture signal payloads produced by PLAN4-05 fixtures or craft JSON by hand.
2. Store fixture JSON files alongside a README describing maintenance steps.
3. Implement jest tests that read fixtures, call the scoring engine, and assert outputs via snapshots.
4. Add comments to remind engineers to review snapshots when heuristics shift.

## Definition of Done
- Fixtures cover diverse personas and constraints.
- Snapshot tests exist and pass.
- Documentation explains fixture upkeep.
- CI picks up the new tests automatically.
