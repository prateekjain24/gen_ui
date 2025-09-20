# PropertyGuru telemetry & metrics instrumentation

## Context
pg.md highlights “observable intelligence” and success metrics (flow completion, saved searches, copy overrides). We currently log generic Canvas events that won’t capture PropertyGuru-specific signals or completion rates.

## Task
Extend telemetry so PropertyGuru runs emit the right structured events and surface dashboards/queries for the success metrics.

## Acceptance Criteria
- Add fields to existing telemetry events (or create new ones) that record extracted `PropertyGuruSignals`, plan sections returned, drawer adjustments, and fallback/default flags.
- Instrument flow completion events (e.g. when seeker reaches CTA click/save) and saved search creation hooks with PropertyGuru experiment metadata.
- Update analytics doc or Looker/Amplitude dashboard definition so PMs can track the ≥60% completion and +15% saved-search lift goals.
- Ensure instrumentation is gated by the same PropertyGuru feature flag to avoid polluting Canvas baseline data.

## Out of Scope
- Running the growth experiment itself; this is delivery of telemetry plumbing and documentation.
