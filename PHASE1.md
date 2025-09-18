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

### [P1-013] Basic API Route - Events Endpoint
**Story Points:** 1
**Dependencies:** [P1-007]
**Acceptance Criteria:**
- [ ] POST /api/events endpoint created
- [ ] Batch event processing implemented
- [ ] Basic pattern analysis working
- [ ] Response includes insights
**Technical Notes:**
- Process events asynchronously
- Keep analysis lightweight
**Risks:**
- Event ordering may be important

### [P1-014] UI Component - Field Renderer
**Story Points:** 1
**Dependencies:** [P1-002]
**Acceptance Criteria:**
- [ ] Text input rendering with validation
- [ ] Radio group with helper text
- [ ] Checkbox group with multi-select
- [ ] Select dropdown with options
**Technical Notes:**
- Use shadcn/ui components as base
- Maintain consistent error display
**Risks:**
- Browser compatibility for form controls

### [P1-015] UI Component - Form Container
**Story Points:** 1
**Dependencies:** [P1-014]
**Acceptance Criteria:**
- [ ] Card layout with header/content/footer
- [ ] Form submission handling
- [ ] Loading states with spinner
- [ ] Error boundary implemented
**Technical Notes:**
- Use React Hook Form for validation
- Implement optimistic updates
**Risks:**
- Form state management complexity

### [P1-016] UI Component - Progress Stepper
**Story Points:** 1
**Dependencies:** [P1-003]
**Acceptance Criteria:**
- [ ] Visual progress bar component
- [ ] Step indicators with active/completed states
- [ ] Responsive design for mobile
- [ ] Smooth transitions between steps
**Technical Notes:**
- Use CSS transitions for animations
- Consider accessibility (ARIA labels)
**Risks:**
- Complex styling across browsers

### [P1-017] Onboarding Flow Orchestrator
**Story Points:** 1
**Dependencies:** [P1-015, P1-012]
**Acceptance Criteria:**
- [ ] Main flow component with state management
- [ ] API integration for plan fetching
- [ ] Form value collection and persistence
- [ ] Navigation between steps working
**Technical Notes:**
- Use React state for local values
- Implement proper error boundaries
**Risks:**
- State synchronization issues

### [P1-018] Event Tracking Integration
**Story Points:** 1
**Dependencies:** [P1-017, P1-013]
**Acceptance Criteria:**
- [ ] Field focus/blur tracking
- [ ] Value change tracking
- [ ] Step submission tracking
- [ ] Event batching with 1-second delay
**Technical Notes:**
- Use debouncing for change events
- Queue events to reduce API calls
**Risks:**
- Event loss on page unload

### [P1-019] Basic Testing Suite
**Story Points:** 1
**Dependencies:** [P1-009, P1-010, P1-011]
**Acceptance Criteria:**
- [ ] Unit tests for Rules Engine
- [ ] Session Store tests
- [ ] Type validation tests
- [ ] 80% code coverage achieved
**Technical Notes:**
- Use Jest and React Testing Library
- Mock API calls appropriately
**Risks:**
- Test maintenance overhead

### [P1-020] Development Environment & Documentation
**Story Points:** 1
**Dependencies:** [P1-019]
**Acceptance Criteria:**
- [ ] Development server running smoothly
- [ ] Debug panel in development mode
- [ ] Basic README with setup instructions
- [ ] Code comments for complex logic
**Technical Notes:**
- Add npm scripts for common tasks
- Include troubleshooting section
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
