# Ticket PLAN4-11 — Template slot validator

- **Story Points:** 1
- **Depends on:** PLAN4-10

## Goal
Create validation utilities that ensure template slot content respects type, length, and tone constraints before rendering or storing LLM output.

## Context
Trustworthy co-authoring requires automated checks. The validator will catch errant generations and allow fallbacks to deterministic text.

## Requirements
1. Implement `validateTemplateSlots(templateId: string, slotValues: Record<string, string>, options?): SlotValidationResult` in `src/lib/canvas/template-validator.ts`.
2. Checks must include: character limits, required slots present, forbidden content (empty strings, “lorem ipsum”), and tone hints (simple keyword heuristics for now).
3. Provide structured error messages for logging and UI (slot id, reason, severity).
4. Add tests covering valid, invalid, and partially filled templates with representative data.
5. Integrate the validator into the plan assembly path so invalid content falls back to defaults and logs the issue.

## Implementation Steps
1. Use the catalog from PLAN4-10 to look up constraints inside the validator.
2. Implement basic tone heuristics (e.g., detect negative sentiment when lively tone requested) without optimizing for cost.
3. Return both sanitized values and validation issues to downstream consumers.
4. Update plan assembly to call the validator before rendering copy.
5. Write jest tests verifying pass/fail cases and fallback behavior.

## Definition of Done
- Validator utility exists and enforces slot constraints.
- Invalid entries fall back to defaults with structured errors.
- Tests cover positive and negative cases.
- Assembly path calls the validator by default.
