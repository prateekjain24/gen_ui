# Ticket PLAN4-10 — Template schema definitions

- **Story Points:** 1
- **Depends on:** PLAN4-01

## Goal
Define the schema for template-driven copy slots covering step titles, CTAs, helper text, callouts, and badges, ensuring every slot has guardrails and default text.

## Context
Phase 4 relies on safe LLM co-authoring. The template schema must codify which portions of copy can be generated dynamically and what constraints apply.

## Requirements
1. Add `src/lib/canvas/templates.ts` exporting types for `Template`, `TemplateSlot`, and `TemplateCatalog`.
2. Enumerate supported templates (e.g., `step_title`, `cta_primary`, `helper_text`, `callout_info`, `badge_caption`) with required/optional slots.
3. For each slot specify allowed character limits, tone expectations, and fallback text.
4. Provide doc comments and JSDoc examples for every template.
5. Write unit tests ensuring the catalog contains all expected templates and validates slot metadata.

## Implementation Steps
1. Design TypeScript interfaces capturing slot metadata (type, constraints, default, description).
2. Populate the template catalog with baseline content matching Phase 3 copy.
3. Export helper functions to look up templates by id and list slots for validation.
4. Author tests verifying template counts and default text presence.

## Definition of Done
- Template schema exists with typed slots and defaults.
- Baseline catalog matches Phase 3 copy.
- Tests validate schema integrity.
- Documentation (comments) explains how to extend the catalog.
