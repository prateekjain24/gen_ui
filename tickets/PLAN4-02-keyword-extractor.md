# Ticket PLAN4-02 — Deterministic keyword extractor

- **Story Points:** 1
- **Depends on:** PLAN4-01

## Goal
Implement the deterministic keyword extraction layer that maps prompt text to the approved signal taxonomy before any LLM calls run.

## Context
Phase 4 needs a hybrid extractor that always produces baseline signals even when LLMs fail. This ticket covers rule-based detection for tools, headcount, compliance phrases, and tone anchors.

## Requirements
1. Create `src/lib/prompt-intel/keyword-extractor.ts` exporting `extractSignalsFromKeywords(prompt: string): PromptSignalsPartial`.
2. Support detection for: common SaaS tools (Slack, Jira, Notion, Salesforce), compliance keywords (SOC2, HIPAA, audit), team headcount ranges (solo, <10, 10-25, 25+), and tone cues (fast, meticulous, onboarding, migration).
3. Ensure results include confidence metadata (e.g., source: 'keyword', weight: 1.0) for downstream scoring.
4. Add unit tests in `src/lib/prompt-intel/__tests__/keyword-extractor.test.ts` covering mixed-case input, punctuation, and overlapping keywords.
5. Wire logging via existing debug utilities when no signals are detected.

## Implementation Steps
1. Define helper dictionaries and regexes based on the taxonomy finalized in PLAN4-01.
2. Implement the extraction function with normalization (lowercasing, punctuation stripping) and conflict resolution (prioritize explicit counts over ranges).
3. Emit partial signal objects with source metadata.
4. Write tests verifying each signal type and conflict handling.
5. Run `bun run typecheck` and the new jest file to confirm coverage.

## Definition of Done
- Keyword extractor module exists with typed exports and metadata.
- Tests pass and demonstrate correct handling of overlapping cues.
- Logging fires when zero signals resolve.
- Downstream consumers can merge the partial output without casting.
