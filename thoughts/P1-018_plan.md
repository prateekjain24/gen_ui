# P1-018 – Event Tracking Integration

## Objective
Capture front-end UX telemetry (focus, blur, value change, and step navigations) and deliver batched payloads to `/api/events` with a 1-second dispatch delay. Events must be resilient to rapid interactions and page unloads while matching the existing `UXEvent` type system.

## Acceptance Criteria Breakdown
- Field focus/blur, value change, and step submission/back events are published.
- Event batching with 1-second delay built around the client-side queue.
- Integration uses the Phase 1 `/api/events` endpoint and reuses session context managed by the orchestrator.

## Approach
1. **Telemetry Queue Abstraction**
   - Implement a small batching queue in `src/lib/telemetry/events.ts` that accepts events, stamps timestamps/session IDs, schedules a flush (`setTimeout`), and falls back to `navigator.sendBeacon` on unload.
   - Rework `recordEvents` to POST to `/api/events` with structured error handling.
2. **Component Instrumentation**
   - Extend `Field` to bubble step context so focus/blur handlers know the active step.
   - Enhance `FormRenderer`/`OnboardingFlow` to forward focus, blur, and change callbacks, tracking focus timestamps and change counts in refs/state.
   - Emit `field_focus`, `field_blur`, `field_change`, `step_submit`, `step_back`, `step_skip`, and `step_submit` events with the proper payload payloads.
   - Capture step dwell time by stamping when a plan is rendered.
3. **Queue Lifecycle Management**
   - Instantiate the queue once the session ID is known; dispose and flush on component unmount.
   - Ensure action handlers invoke queueing before network persistence to avoid losing signals.
4. **Testing**
   - Mock the telemetry queue/`fetch` in `OnboardingFlow` tests, advance timers, and assert enqueued events + flush behaviour where practical.

## Tasks
1. Flesh out `recordEvents` and expose `createTelemetryQueue` utilities.
2. Pass step metadata through `FormRenderer`→`Field` to trigger focus/blur callbacks.
3. Add telemetry handlers to `OnboardingFlow` (including time tracking, change counts, and action events).
4. Update orchestrator tests to verify event calls using Jest fake timers.
5. Validate end-to-end with `bun run typecheck`, `bun run lint`, and `bunx jest`.

## Risks
- Race conditions between queue flush and session updates; mitigate by serializing flushes.
- Potential double-counting if values change before flush; track change counts per field.
- Page unload may still drop events if beacon fails; log errors for observability.

## Definition of Done
- [x] Telemetry queue flushes to `/api/events` and logs focus/change/back/submit events.
- [x] Automated tests cover queuing and handler wiring.
- [x] Existing orchestrator/tests remain green.
