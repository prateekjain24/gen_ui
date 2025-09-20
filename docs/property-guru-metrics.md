# PropertyGuru metrics quickstart

Use these pointers to keep telemetry focused on the success metrics in `pg.md` without introducing new tooling.

## Events
- `property_guru_plan_payload` — emitted on every PropertyGuru plan generation. Includes normalized signals, plan sections, CTAs, and any defaults that were applied.
- `property_guru_flow_event` — client event for the main CTA (`stage: cta_clicked`), the saved-search CTA (`stage: saved_search_created` when the primary CTA contains “save”), and the terminal action (`stage: flow_complete`). All stages carry the latest signals, payload, and defaults so funnels stay consistent.

## Dashboards
- **Completion rate (≥60%)**: filter `property_guru_flow_event` where `stage = 'flow_complete'`; divide by distinct sessions that logged any PropertyGuru event.
- **Saved-search lift (+15%)**: compare the rate of `stage = 'saved_search_created'` with the control preset using your existing experiment cohort segment.
- **Copy override watch (<10%)**: reuse the existing plan-edit logs and overlay with `property_guru_plan_payload.defaultsApplied` to flag frequent fallbacks.

## Operational checklist
1. Toggle `CANVAS_PRESET=property_guru` locally to verify events fire via `/api/events`.
2. Add the above events to your Amplitude or Looker board using the shared `sessionId` key.
3. Share the dashboard link in the launch doc so PM/analytics can monitor the goals in real time.
