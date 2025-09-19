# Ticket PLAN4-16 — Undo & reset controls

- **Story Points:** 1
- **Depends on:** PLAN4-14

## Goal
Provide undo and reset-to-baseline controls so users can revert personalization tweaks back to Phase 3 defaults quickly.

## Context
Transparency includes the ability to opt out of AI adjustments. Reset mechanisms reduce friction and support demos where comparisons are needed.

## Requirements
1. Add `Undo` and `Reset to baseline` actions within the customize drawer, reflecting the latest knob history.
2. Maintain a small history stack (up to 5 steps) of knob states to support step-by-step undo.
3. Reset should reapply Phase 3 default knobs and copy, triggering template re-renders as needed.
4. Surface confirmation toasts/snackbars showing what changed after undo/reset.
5. Cover state management with unit tests (e.g., reducer or store tests).

## Implementation Steps
1. Decide on state storage (context/store) for knob history and implement push/pop operations.
2. Wire Undo button to revert to the previous state and refresh plan preview.
3. Implement Reset to baseline by clearing overrides and re-running template fill with default knobs.
4. Add UI feedback using existing toast utility.
5. Write tests verifying history behavior and baseline resets.

## Definition of Done
- Undo/Reset controls work and update the preview instantly.
- History stack handles multiple adjustments without errors.
- Tests cover undo, redo attempt (if unsupported), and reset flows.
