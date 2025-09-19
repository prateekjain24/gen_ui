# Ticket PLAN4-18 — Post-plan edit telemetry

- **Story Points:** 1
- **Depends on:** PLAN4-07, PLAN4-14

## Goal
Record user edits to personalized plans (knob tweaks, text overrides, reset actions) and associate them with prompt signals for future feedback loops.

## Context
Capturing edit behavior is essential to learn which adjustments users trust. This telemetry feeds Phase 4 success metrics and the label queue.

## Requirements
1. Extend telemetry event schema to include `plan_edit` events with fields for knob id, old value, new value, signal provenance, and timestamp.
2. Update the customize drawer and other edit surfaces to dispatch telemetry events on every change (debounce as needed).
3. Ensure events include the current prompt signals and recipe id for context.
4. Handle failures gracefully by logging and retrying via existing queue mechanisms.
5. Add tests verifying schema typings and event publication using mocked telemetry adapters.

## Implementation Steps
1. Modify `src/lib/telemetry/events.ts` (or equivalent) to introduce the new event type.
2. Instrument knob controls, undo/reset actions, and manual text edits to emit telemetry.
3. Validate payloads in tests to ensure required fields are present.
4. Update documentation in `docs/telemetry/README.md` (or new file) describing the `plan_edit` event.

## Definition of Done
- Telemetry fires when users tweak knobs or reset personalization.
- Event payloads include signal/context details.
- Tests cover emission paths and schema enforcement.
- Docs describe the new telemetry event for data consumers.
