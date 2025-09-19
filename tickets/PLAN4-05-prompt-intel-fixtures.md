# Ticket PLAN4-05 — Prompt intelligence fixtures & HUD wiring

- **Story Points:** 1
- **Depends on:** PLAN4-04

## Goal
Expose prompt signals through the debug HUD and create durable fixtures that validate extractor behavior for tricky prompts.

## Context
Phase 4 demands transparency. Reviewers must see what the system inferred, and regression tests need canonical inputs to guard against future drift.

## Requirements
1. Add serialized prompt fixtures under `src/lib/prompt-intel/__fixtures__` covering jargon-heavy, multilingual, and partial-sentence briefs.
2. Extend unit tests to replay these fixtures and snapshot the merged `PromptSignals` output.
3. Update the canvas debug HUD to display detected signals, confidence, and source tags.
4. Provide a toggle in the HUD to copy raw signal JSON for QA and telemetry comparisons.
5. Document how to add new fixtures in a short README inside the fixtures folder.

## Implementation Steps
1. Curate at least five representative prompts and store them as JSON fixtures.
2. Expand jest coverage to load fixtures and assert outputs (using inline snapshots or golden files).
3. Modify the HUD component to consume `promptSignals` from session state and render a table/list.
4. Add copy-to-clipboard functionality using existing UI primitives.
5. Write the fixture README with contribution guidelines.

## Definition of Done
- Fixtures exist and are exercised by tests.
- Debug HUD surfaces signal details with source/confidence.
- Copy toggle works without console warnings.
- Fixture README explains maintenance steps.
