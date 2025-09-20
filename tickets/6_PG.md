# PropertyGuru telemetry & success metrics plumbing

## Context
pg.md mandates "observable intelligence" so the PM crew can watch completion rate, saved-search lift, and copy overrides. Our current Canvas telemetry only emits generic chat + plan events, so PropertyGuru runs look indistinguishable from baseline traffic and we cannot calculate the success metrics.

## Task Breakdown
1. Extend the typed UX event contracts (`src/lib/types/events.ts`, `src/lib/telemetry/events.ts`) with PropertyGuru-specific payloads: extracted `PropertyGuruSignals`, plan section inventory, default flags, and CTA invocations.
2. Thread those fields through the backend plan route (`src/app/api/canvas/plan/route.ts`) and the front-end queue (`src/components/canvas/CanvasChat.tsx`) so every PropertyGuru plan regeneration and CTA click records the enriched event when the preset flag is on.
3. Emit explicit flow-complete and saved-search-created events from the relevant UI handlers, tagging them with seeker persona where available.
4. Publish a lightweight analytics how-to (`docs/property-guru-metrics.md`) describing the new Looker/Amplitude queries or DataDog monitors that surface the ≥60% completion and +15% saved-search goals.

## Acceptance Criteria
- PropertyGuru telemetry is feature-flagged (`CANVAS_PRESET=property_guru`) and does not fire for other presets.
- Events include the normalized signals, plan structure, manual overrides, and CTA usage so downstream analysis can compute completion, saved-search rate, and copy override frequency.
- Dashboards or saved queries are linked in the doc, and their underlying metrics align with the definitions in pg.md.
- `bun run typecheck` and targeted Jest suites covering the new event payloads pass.

## Out of Scope
- Running the actual experiment or building net-new analytics infra; this ticket wires events + documentation needed for the PM/analytics team to take over.
