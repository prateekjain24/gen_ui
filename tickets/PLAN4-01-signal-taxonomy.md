# Ticket PLAN4-01 — Prompt signal taxonomy

- **Story Points:** 1
- **Depends on:** None

## Goal
Author the definitive list of prompt-derived signals (team size, decision makers, tools, constraints, tone, industry) needed by the Phase 4 personalization systems, including canonical naming and data shapes.

## Context
The personalization engine cannot be wired until all downstream stakeholders agree on which signals exist and how they are represented. This taxonomy anchors extractor work, telemetry schemas, and UX disclosures.

## Requirements
1. Document every required signal, its type (string, enum, number, boolean), and expected value ranges.
2. Flag which signals must be populated deterministically vs. LLM-derived and call out compliance-sensitive fields.
3. Provide at least two example prompts that illustrate how each signal should be populated.
4. Capture open questions/owners for ambiguous signals in the document.
5. Store the taxonomy in `docs/prompt-intel/signal-taxonomy.md` with a concise table for quick reference.

## Implementation Steps
1. Interview design, ops, and engineering requirements already captured in `Phase4.md` to determine signal coverage.
2. Draft the taxonomy table and narrative guidance in the new `docs/prompt-intel` folder.
3. Review with the personalization and telemetry owners to validate data shape alignment.
4. Update the document based on feedback and land the final version.

## Definition of Done
- `docs/prompt-intel/signal-taxonomy.md` exists with the agreed signal definitions.
- Deterministic vs. LLM-derived expectations are explicit.
- At least two worked examples are included.
- All stakeholders acknowledged the taxonomy (async comment or sign-off noted in the doc).
