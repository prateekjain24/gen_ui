# PHASE1.md - Core Foundation & MVP

## Overview
Phase 1 establishes the core foundation with deterministic rules-based flow, delivering a working MVP without AI dependencies. Total estimated effort: 20 story points (~40-80 hours).

### [P1-001] Project Initialization & Setup ✅
**Story Points:** 1
**Dependencies:** None
**Status:** COMPLETE
**Acceptance Criteria:**
- [x] Next.js 15.4 project created with TypeScript and Tailwind
- [x] All required dependencies installed (AI SDK 5, shadcn/ui, Radix UI)
- [x] Project structure established per architecture diagram
- [x] Environment variables configured (.env.local)
**Technical Notes:**
- Use `bun` for package management
- Initialize with App Router, not Pages Router
- Choose New York style for shadcn/ui
**Risks:**
- Version compatibility issues between dependencies

### [P1-002] Core Type Definitions - Fields ✅
**Story Points:** 1
**Dependencies:** [P1-001]
**Status:** COMPLETE
**Acceptance Criteria:**
- [x] TextField, RadioField, CheckboxField, SelectField types defined
- [x] Field union type created
- [x] Type exports properly configured
- [x] JSDoc comments added for clarity
**Technical Notes:**
- Use discriminated unions with `kind` field
- Include all validation properties (required, pattern, etc.)
**Risks:**
- Type complexity may require refinement

### [P1-003] Core Type Definitions - Forms & Plans ✅
**Story Points:** 1
**Dependencies:** [P1-002]
**Status:** COMPLETE
**Acceptance Criteria:**
- [x] FormStep type with fields array defined
- [x] FormPlan union type for different states (render_step, review, success, error)
- [x] StepperItem type for progress tracking
- [x] All types exported from central location
**Technical Notes:**
- Consider using Zod for runtime validation later
**Risks:**
- Plan structure may need adjustment based on UI needs

### [P1-004] Session State Types & Events ✅
**Story Points:** 1
**Dependencies:** [P1-002]
**Status:** COMPLETE
**Acceptance Criteria:**
- [x] SessionState type with all properties defined
- [x] UXEvent discriminated union for all event types
- [x] Event timestamp handling standardized
- [x] Type guards implemented where needed
**Technical Notes:**
- Keep event payloads minimal for memory efficiency
**Risks:**
- Event schema may evolve during implementation

### [P1-005] Constants & Configuration Module ✅
**Story Points:** 1
**Dependencies:** [P1-001]
**Status:** COMPLETE
**Acceptance Criteria:**
- [x] Field IDs enum created and whitelisted
- [x] Option arrays for roles, use cases, templates defined
- [x] LLM configuration constants set (for future use)
- [x] All constants frozen with `as const`
**Technical Notes:**
- Use TypeScript const assertions for type safety
- Group related constants together
**Risks:**
- Constants may need updates as requirements clarify

### [P1-006] Session Store - Core Operations ✅
**Story Points:** 1
**Dependencies:** [P1-004]
**Status:** COMPLETE
**Acceptance Criteria:**
- [x] Create, get, update session methods implemented
- [x] In-memory Map storage working
- [x] Session ID generation with UUID
- [x] Type safety maintained throughout
**Technical Notes:**
- Use singleton pattern for store
- Consider WeakMap for better memory management
**Risks:**
- Memory leaks if cleanup not implemented properly

### [P1-007] Session Store - Event Management ✅
**Story Points:** 1
**Dependencies:** [P1-006]
**Status:** COMPLETE
**Acceptance Criteria:**
- [x] addEvent method with queue management
- [x] Event limit of 50 per session enforced
- [x] Timestamp tracking for all events
- [x] Event retrieval methods implemented
**Technical Notes:**
- Use circular buffer pattern for event limiting
**Risks:**
- Event loss if buffer size too small

### [P1-008] Session Store - Cleanup & Persistence ✅
**Story Points:** 1
**Dependencies:** [P1-006]
**Status:** COMPLETE
**Acceptance Criteria:**
- [x] Automatic cleanup of stale sessions (>1 hour)
- [x] Cleanup interval timer implemented
- [x] lastActivityAt tracking working
- [x] Memory usage stays bounded
**Technical Notes:**
- Use setInterval only on server side
- Clear intervals on process exit
**Risks:**
- Timer may impact performance if too frequent

### [P1-009] Rules Engine - Basic Step Flow ✅
**Story Points:** 1
**Dependencies:** [P1-003, P1-005]
**Status:** COMPLETE
**Acceptance Criteria:**
- [x] getNextStep main decision function implemented
- [x] Initial state handling (show basics step)
- [x] Step progression logic working
- [x] Null return for unknown states
**Technical Notes:**
- Use strategy pattern for step decisions
- Keep logic deterministic and testable
**Risks:**
- Complex branching may become hard to maintain

### [P1-010] Rules Engine - Step Builders ✅
**Story Points:** 1
**Dependencies:** [P1-009]
**Status:** COMPLETE
**Acceptance Criteria:**
- [x] createBasicsStep with proper field configuration
- [x] createWorkspaceStep with conditional fields
- [x] createPreferencesStep with checkbox groups
- [x] Field values preserved from session state
**Technical Notes:**
- Reuse field configurations from constants
- Apply persona-based logic (explorer vs team)
**Risks:**
- Field dependencies may create complexity

### [P1-011] Rules Engine - Review & Success ✅
**Story Points:** 1
**Dependencies:** [P1-010]
**Status:** COMPLETE
**Acceptance Criteria:**
- [x] createReviewStep generates accurate summary
- [x] createSuccessStep with personalized message
- [x] Stepper state properly updated
- [x] Value formatting for display
**Technical Notes:**
- Map internal values to display labels
- Handle missing/optional fields gracefully
**Risks:**
- Summary generation may miss edge cases

### [P1-012] Basic API Route - Plan Endpoint ✅
**Story Points:** 1
**Dependencies:** [P1-009, P1-006]
**Status:** COMPLETE
**Acceptance Criteria:**
- [x] POST /api/plan endpoint created
- [x] Request validation implemented
- [x] Session creation/retrieval working
- [x] Rules engine integration complete
**Technical Notes:**
- Use Next.js 15.4 route handlers
- Return decision source for debugging
**Risks:**
- Session race conditions possible

### [P1-013] Basic API Route - Events Endpoint ✅
**Story Points:** 1
**Dependencies:** [P1-007]
**Status:** COMPLETE
**Acceptance Criteria:**
- [x] POST /api/events endpoint created
- [x] Batch event processing implemented
- [x] Basic pattern analysis working
- [x] Response includes insights
**Technical Notes:**
- Normalized payloads with Zod, capped batches to session max, and reused analyzer helper for insights
- Logging via `createDebugger('EventsAPI')` to trace ingestion outcomes
**Risks:**
- Event ordering may be important for richer analytics; current heuristics assume approximate chronology

### [P1-014] UI Component - Field Renderer ✅
**Story Points:** 1
**Dependencies:** [P1-002]
**Status:** COMPLETE
**Acceptance Criteria:**
- [x] Text input rendering with validation
- [x] Radio group with helper text
- [x] Checkbox group with multi-select
- [x] Select dropdown with options
**Technical Notes:**
- Implemented `Field` with shadcn-style primitives (input, select, radio, checkbox) and consistent helper/error messaging
- Normalizes option metadata (helper text, disabled states) and maintains accessibility attributes (`aria-describedby`, required markers)
**Risks:**
- Browser compatibility for form controls (monitor for Radix quirks on legacy browsers)

### [P1-015] UI Component - Form Container ✅
**Story Points:** 1
**Dependencies:** [P1-014]
**Status:** COMPLETE
**Acceptance Criteria:**
- [x] Card layout with header/content/footer
- [x] Form submission handling
- [x] Loading states with spinner
- [x] Error boundary implemented
**Technical Notes:**
- `FormContainer` wraps shadcn `Card`, drives CTA buttons, exposes submission callbacks, and surfaces request errors inline
- Added lightweight error boundary with `debugError` logging to shield runtime issues without crashing the flow
**Risks:**
- Form state management complexity (prepare to integrate actual orchestrator handlers in P1-017)

### [P1-016] UI Component - Progress Stepper ✅
**Story Points:** 1
**Dependencies:** [P1-003]
**Status:** COMPLETE
**Acceptance Criteria:**
- [x] Visual progress bar component
- [x] Step indicators with active/completed states
- [x] Responsive design for mobile
- [x] Smooth transitions between steps
**Technical Notes:**
- Stepper computes progress with completed/active weighting, adds animated bar, and labels step states for screen readers
- Responsive flex layout keeps labels legible on narrow viewports
**Risks:**
- Complex styling across browsers (continue visual QA as branding evolves)

### [P1-017] Onboarding Flow Orchestrator ✅
**Story Points:** 1
**Dependencies:** [P1-015, P1-012]
**Status:** COMPLETE
**Acceptance Criteria:**
- [x] Main flow component with state management
- [x] API integration for plan fetching
- [x] Form value collection and persistence
- [x] Navigation between steps working
**Technical Notes:**
- `OnboardingFlow` now persists sessions, requests `/api/plan`, and routes actions through session updates with loading/error UX
- Added client API helpers and session update enhancements (completed-step replacement) to support back/skip flows
**Risks:**
- State synchronization issues (watch for concurrent fetches when Phase 2 AI branching arrives)

### [P1-018] Event Tracking Integration ✅
**Story Points:** 1
**Dependencies:** [P1-017, P1-013]
**Status:** COMPLETE
**Acceptance Criteria:**
- [x] Field focus/blur tracking
- [x] Value change tracking
- [x] Step submission tracking
- [x] Event batching with 1-second delay
**Technical Notes:**
- Added client-side telemetry queue with beacon fallback and integrated focus/change/step events into `OnboardingFlow`
- Telemetry flushes on unmount and navigation, preserving change counts and dwell times per step
**Risks:**
- Event loss on page unload (beacon mitigates but still monitor)

### [P1-019] Basic Testing Suite ✅
**Story Points:** 1
**Dependencies:** [P1-009, P1-010, P1-011]
**Status:** COMPLETE
**Acceptance Criteria:**
- [x] Unit tests for Rules Engine
- [x] Session Store tests
- [x] Type validation tests
- [x] 80% code coverage achieved
**Technical Notes:**
- Extended session store/telemetry/orchestrator coverage and added helper API tests with Jest coverage instrumentation (≥88%)
- Coverage command documented via `bunx jest --coverage`
**Risks:**
- Test maintenance overhead (keep mocks in sync with evolving APIs)

### [P1-020] Development Environment & Documentation ✅
**Story Points:** 1
**Dependencies:** [P1-019]
**Status:** COMPLETE
**Acceptance Criteria:**
- [x] Development server running smoothly
- [x] Debug panel in development mode
- [x] Basic README with setup instructions
- [x] Code comments for complex logic
**Technical Notes:**
- Added dev-only `DebugPanel` gated by `NODE_ENV`/`NEXT_PUBLIC_DEBUG`, plus a helper script for `bun run dev:debug`.
- Expanded project scripts (`test`, `check`, `format`) and rewrote README with setup, scripts, and troubleshooting guidance.
**Risks:**
- Documentation drift from code

## Summary

**Total Story Points:** 20 (approximately 40-80 hours of development)

**Critical Path:** P1-001 → P1-002 → P1-003 → P1-009 → P1-012 → P1-017

**Parallel Work Opportunities:**
- P1-004, P1-005 can be done in parallel after P1-002
- P1-014, P1-015, P1-016 can be done in parallel after types are defined
- P1-006, P1-007, P1-008 can be developed as a unit

**Definition of Done for Phase 1:**
- Deterministic onboarding flow working end-to-end
- All form fields rendering and validating correctly
- Session state persisted and retrieved
- Basic telemetry events captured
- Tests passing with 80% coverage
- Development environment stable

This phase delivers a fully functional MVP that can be tested with real users, providing valuable feedback before adding AI capabilities in Phase 2.
