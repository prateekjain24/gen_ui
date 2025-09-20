# PropertyGuru customize drawer knobs

## Context
The current drawer exposes workspace-specific controls (approval depth, team tone) that don’t map to seeker needs. pg.md requires PropertyGuru knobs: location radius, budget stretch, move-in urgency, tone presets, while keeping Undo/Reset fidelity.

## Task
Reconfigure the customize drawer/state store to surface PropertyGuru controls and ensure plan regeneration respects the new fields.

## Acceptance Criteria
- Replace existing drawer config with controls for location radius (slider 1–10km), budget stretch toggle (+10%), move-in urgency slider (0–5), tone selector (reassuring/data-driven/concierge) when the PropertyGuru preset flag is active.
- State updates use the shared store/actions so regenerated plans receive the new parameters without breaking Canvas defaults when the flag is off.
- UX copy/tooltips reflect PropertyGuru language (“How far are you willing to commute?” etc.).
- Automated coverage (store unit test or Storybook interaction test) validates that changes propagate and Undo/Reset continue to function with the new fields.

## Out of Scope
- Visual redesign beyond swapping control labels/types; keep existing components.
