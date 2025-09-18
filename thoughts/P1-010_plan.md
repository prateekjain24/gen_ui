# [P1-010] Rules Engine - Step Builders Implementation Plan

## Overview

Verification and completion plan for the Rules Engine Step Builder functions that generate dynamic form steps based on session state and user persona. These builders are the core of the deterministic flow engine, providing <100ms response times for Phase 1 MVP.

## Phase Context

- **Phase Reference**: P1-010 from PHASE1.md
- **Story Points**: 1
- **Dependencies**: [P1-009] Rules Engine - Basic Step Flow (COMPLETE)
- **Decision Model**: Rules Engine (deterministic, <100ms target)
- **Status**: Implementation exists but needs verification and testing

## Current State Analysis

### Already Implemented:
- `lib/policy/rules.ts:143-197` - `createBasicsStep` function with full field configuration
- `lib/policy/rules.ts:202-267` - `createWorkspaceStep` with persona-aware conditional fields
- `lib/policy/rules.ts:272-318` - `createPreferencesStep` with checkbox groups
- `lib/policy/rules.ts:323-425` - `createReviewStep` with value formatting
- `lib/policy/rules.ts:430-443` - `createSuccessStep` with persona-aware messages
- `lib/policy/rules.ts:448-467` - `buildStepperItems` helper function
- Session state value preservation already implemented in all builders
- Persona detection logic integrated (explorer vs team)

### Missing/Required:
- Unit tests for all step builder functions
- Validation of field configurations against constants
- Edge case handling for missing/invalid values
- Performance benchmarking to verify <100ms target
- Documentation of persona-based logic rules

### Performance Baseline:
- Rules Engine: Currently logging performance, needs formal measurement
- Target: <100ms for all step builders
- Current implementation uses synchronous operations (good for performance)

## Acceptance Criteria Verification

Based on PHASE1.md requirements:

### ✅ Already Completed:
1. **createBasicsStep with proper field configuration**
   - Implemented at `lib/policy/rules.ts:143-197`
   - Uses FIELD_IDS constants properly
   - Includes all required fields (full_name, email, role, primary_use)
   - Values preserved from session state

2. **createWorkspaceStep with conditional fields**
   - Implemented at `lib/policy/rules.ts:202-267`
   - Conditional logic based on persona (team vs explorer)
   - Team persona gets additional fields (company, team_size, project_type)
   - Explorer persona gets minimal fields (workspace_name only)

3. **createPreferencesStep with checkbox groups**
   - Implemented at `lib/policy/rules.ts:272-318`
   - Includes multi-select fields (features, notifications)
   - Radio groups for theme selection
   - Properly handles array values for checkboxes

4. **Field values preserved from session state**
   - All builders use `session.values[FIELD_ID]` pattern
   - Type casting handled appropriately (string vs string[])
   - Default values applied where needed

### ❌ Still Required:
1. **Unit tests for step builders**
2. **Edge case handling verification**
3. **Performance benchmarking**
4. **Integration testing with session store**

## Implementation Tasks

### Task 1: Create Unit Tests for Step Builders

**File**: `src/lib/policy/__tests__/rules.test.ts` (NEW)

**Test Coverage Required**:
```typescript
describe('Rules Engine - Step Builders', () => {
  describe('createBasicsStep', () => {
    // Test with empty session
    // Test with pre-filled values
    // Test field configuration matches constants
    // Test required fields are marked correctly
  });

  describe('createWorkspaceStep', () => {
    // Test explorer persona (minimal fields)
    // Test team persona (all fields)
    // Test conditional field inclusion
    // Test value preservation
  });

  describe('createPreferencesStep', () => {
    // Test checkbox field handling
    // Test array value preservation
    // Test default values
    // Test orientation settings
  });

  describe('createReviewStep', () => {
    // Test summary generation
    // Test value formatting (labels vs values)
    // Test handling missing fields
    // Test all field types represented
  });

  describe('createSuccessStep', () => {
    // Test persona-based messages
    // Test name parsing (first name extraction)
    // Test fallback for missing name
  });

  describe('buildStepperItems', () => {
    // Test step filtering for explorer
    // Test step filtering for team
    // Test active/completed states
    // Test label mapping
  });
});
```

### Task 2: Add Performance Benchmarking

**File**: `src/lib/policy/rules.ts` (UPDATE)

**Changes**:
1. Add performance metrics collection
2. Create benchmark helper for development mode
3. Add performance assertions in tests

```typescript
// Add benchmark wrapper
function benchmark<T>(name: string, fn: () => T): T {
  if (process.env.NODE_ENV === 'development') {
    const start = performance.now();
    const result = fn();
    const duration = performance.now() - start;

    if (duration > 100) {
      console.warn(`[Rules Engine] ${name} exceeded 100ms: ${duration.toFixed(2)}ms`);
    }

    return result;
  }
  return fn();
}
```

### Task 3: Add Edge Case Handling

**File**: `src/lib/policy/rules.ts` (UPDATE)

**Required Validations**:
1. Null/undefined value handling
2. Invalid field ID detection
3. Missing option label fallbacks
4. Array type validation for checkbox fields
5. Session state integrity checks

### Task 4: Create Integration Tests

**File**: `src/lib/policy/__tests__/rules.integration.test.ts` (NEW)

**Test Scenarios**:
```typescript
describe('Rules Engine Integration', () => {
  // Complete flow from basics to success
  // Persona detection and step skipping
  // Back navigation state preservation
  // Session value accumulation
  // Performance under load (multiple sessions)
});
```

## Success Criteria

### Automated Verification:
- [ ] All unit tests pass: `bun test src/lib/policy/__tests__/rules.test.ts`
- [ ] Integration tests pass: `bun test src/lib/policy/__tests__/rules.integration.test.ts`
- [ ] Type checking passes: `bunx tsc --noEmit`
- [ ] No linting errors: `bunx eslint src/lib/policy/rules.ts`
- [ ] Performance tests pass (<100ms for all builders)

### Manual Verification:
- [ ] Complete onboarding flow as explorer (verify minimal fields)
- [ ] Complete onboarding flow as team (verify all fields shown)
- [ ] Test back navigation (values preserved)
- [ ] Test field validation (required fields enforced)
- [ ] Check console for performance warnings
- [ ] Verify stepper shows correct steps for each persona

## Testing Strategy

### Unit Test Checklist:
1. **createBasicsStep**:
   - [ ] Returns correct FormPlan structure
   - [ ] All 4 fields present (name, email, role, primary_use)
   - [ ] Values preserved from session
   - [ ] Required flags set correctly

2. **createWorkspaceStep**:
   - [ ] Explorer gets 1 field (workspace_name)
   - [ ] Team gets 4 fields (workspace_name, company, team_size, project_type)
   - [ ] Title/description changes based on persona
   - [ ] Back button present

3. **createPreferencesStep**:
   - [ ] Checkbox fields handle arrays
   - [ ] Radio fields handle single values
   - [ ] Default values applied when missing
   - [ ] All option arrays loaded from constants

4. **createReviewStep**:
   - [ ] Summary includes all collected values
   - [ ] Labels mapped correctly (not raw values)
   - [ ] Handles missing optional fields gracefully
   - [ ] Format matches UI requirements

5. **Performance**:
   - [ ] Each builder executes in <100ms
   - [ ] No memory leaks with repeated calls
   - [ ] Efficient with large session values

## Risk Mitigation

### Identified Risks:
1. **Field dependencies creating complexity**
   - Mitigation: Clear documentation of conditional logic
   - Use typed field dependency maps

2. **Performance degradation with large sessions**
   - Mitigation: Benchmark with realistic data volumes
   - Optimize object spreads and array operations

3. **Type safety with dynamic field values**
   - Mitigation: Strict type casting at boundaries
   - Runtime validation for critical paths

## Implementation Order

1. **Phase 1**: Testing Infrastructure (1 hour)
   - Set up test files
   - Create test utilities and fixtures
   - Mock session data generators

2. **Phase 2**: Unit Tests (2 hours)
   - Write tests for each step builder
   - Cover happy path and edge cases
   - Add performance assertions

3. **Phase 3**: Edge Case Handling (1 hour)
   - Add validation logic
   - Improve error handling
   - Add debug logging

4. **Phase 4**: Integration & Verification (1 hour)
   - Run full test suite
   - Manual testing of all flows
   - Performance profiling
   - Update PHASE1.md status

## Notes

- The core implementation already exists and appears functional
- Main focus should be on testing and verification
- Performance monitoring is already in place but needs formal testing
- Consider extracting field configurations to separate functions for reusability
- The persona-based logic is working but could benefit from clearer documentation

## References

### Implementation Files:
- Rules Engine: `src/lib/policy/rules.ts`
- Field Constants: `src/lib/constants/fields.ts`
- Option Constants: `src/lib/constants/options.ts`
- Form Types: `src/lib/types/form.ts`
- Session Types: `src/lib/types/session.ts`

### Documentation:
- Phase 1 Requirements: `PHASE1.md` (P1-010)
- Project Instructions: `CLAUDE.md`
- Implementation Guide: `IMP.md`