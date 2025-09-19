# Ticket PLAN4-20 — Label-driven prompt & weight updates

- **Story Points:** 1
- **Depends on:** PLAN4-19

## Goal
Create a lightweight ingestion path that applies approved labels to prompt examples and scoring weights without requiring code changes.

## Context
Phase 4 demands tunability by non-engineers. This ticket automates the final mile from reviewed labels to configuration files.

## Requirements
1. Store prompt examples and scoring weights in JSON config files (`config/personalization/examples.json`, `config/personalization/weights.json`).
2. Build a CLI (`scripts/personalization/apply-labels.ts`) that consumes approved label queue files and updates the configs.
3. Support additive updates (new examples, weight tweaks) and include change summaries in terminal output.
4. Validate configs against schemas before writing to disk; abort on invalid data.
5. Document the workflow in `docs/feedback-loop.md` alongside PLAN4-19 instructions.

## Implementation Steps
1. Define JSON schemas for examples and weights to enforce structure.
2. Implement the CLI to parse label queue entries, map them to config changes, and write updated files atomically.
3. Emit summaries showing before/after values for transparency.
4. Add tests using fixture label files to confirm correct config modifications.
5. Update documentation describing how to run the CLI and review resulting diffs.

## Definition of Done
- Config files exist and are schema-validated.
- CLI updates configs based on label queue approvals.
- Tests cover successful updates and validation failures.
- Documentation reflects the end-to-end feedback loop.
