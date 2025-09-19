# Ticket PLAN4-21 — Environment toggles for personalization

- **Story Points:** 1
- **Depends on:** PLAN4-04, PLAN4-07, PLAN4-12

## Goal
Add environment toggles controlling prompt intelligence, personalization scoring, and template overrides so ops can stage features safely.

## Context
As Phase 4 rolls out, we need granular control to enable/disable subsystems without redeploying. Feature flags also support fallback strategies.

## Requirements
1. Introduce env vars: `ENABLE_PROMPT_INTEL`, `ENABLE_PERSONALIZATION_SCORING`, `ENABLE_TEMPLATE_OVERRIDES` with defaults enabling all in development.
2. Update `.env.local.example` and documentation explaining each toggle.
3. Wrap runtime entry points (extractors, scoring, template fill) in feature checks that degrade gracefully when disabled.
4. Ensure toggles can be changed at runtime (Next.js server restart) without code edits.
5. Add tests or integration checks verifying fallback behavior when toggles are off.

## Implementation Steps
1. Extend config utilities to read the new env vars with sensible defaults.
2. Guard orchestrator functions to short-circuit when toggles are disabled, returning Phase 3 outputs.
3. Update documentation (README, Phase 4 notes) with instructions for enabling/disabling features.
4. Write tests simulating toggles off to confirm baseline behavior.

## Definition of Done
- New env vars are documented and respected in code.
- Disabling toggles reverts to Phase 3 flows without errors.
- Tests confirm fallback behavior.
- `.env.local.example` includes the toggles.
