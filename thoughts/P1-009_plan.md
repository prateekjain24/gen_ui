# [P1-009] Rules Engine - Basic Step Flow Implementation Plan

## Overview

P1-009 establishes the core deterministic rules engine that drives the onboarding flow. This implements the foundational decision logic using a strategy pattern for step decisions, maintaining <100ms response time without any AI dependencies. The rules engine will serve as both the primary decision maker in Phase 1 and the fallback mechanism when LLM integration is added in Phase 2.

## Phase Context

- **Phase Reference**: P1-009 from PHASE1.md
- **Story Points**: 1
- **Dependencies**:
  - [P1-003] Core Type Definitions - Forms & Plans (✅ COMPLETE)
  - [P1-005] Constants & Configuration Module (✅ COMPLETE)
- **Decision Model**: Rules Engine (deterministic, synchronous)
- **Performance Target**: <100ms response time

## Current State Analysis

### Completed Components:

#### Type System (`lib/types/`)
- **form.ts**: Discriminated unions for Field types with `kind` field
  - TextField, SelectField, RadioField, CheckboxField
  - FormPlan union (render_step | review | success | error)
  - FormStep interface with fields array
- **session.ts**: SessionState interface with:
  - currentStep, completedSteps tracking
  - values: Record<string, unknown>
  - persona: 'explorer' | 'team'
  - events array for telemetry
- **events.ts**: UXEvent discriminated union for tracking

#### Constants (`lib/constants/`)
- **fields.ts**: FIELD_IDS enum with 20 whitelisted fields
- **options.ts**: Pre-defined option arrays for all dropdowns/radios
- **steps.ts**: DEFAULT_STEP_ORDER and STEP_IDS
- **config.ts**: Session limits, LLM config (for Phase 2)

#### Session Store (`lib/store/session.ts`)
- In-memory Map-based storage
- CRUD operations: create, get, update, delete
- Event management with 50-event limit
- Automatic cleanup of stale sessions (>1 hour)

#### Rules Engine Skeleton (`lib/policy/rules.ts`)
- `getNextStepPlan(session)` - Main entry point (empty)
- `detectPersona(values)` - Helper to detect explorer vs team
- Imported types and constants ready

### Missing/Required:
- Main `getNextStep` decision function implementation
- Step progression logic based on session state
- Individual step builder functions for each step
- Initial state handling (show basics step)
- Null return for unknown/invalid states
- Field preservation from session values

### Performance Baseline:
- Rules Engine: Not yet implemented (target <100ms)
- Session Store: <1ms for lookups (in-memory Map)
- Type Guards: <1ms (simple checks)

## Desired End State

After P1-009 implementation, the system will:

1. **Handle Initial State**: When no steps completed, return basics step
2. **Progress Through Steps**: Follow DEFAULT_STEP_ORDER deterministically
3. **Apply Persona Logic**:
   - Explorer: Skip workspace details, minimal preferences
   - Team: Full workspace setup, all preference options
4. **Preserve Values**: Populate fields with existing session values
5. **Support Navigation**: Handle back button and step skipping
6. **Return Null Safely**: Unknown states don't crash, return null

### Success Metrics:
- **Technical**:
  - Response time <100ms for all decisions
  - Zero runtime errors on unknown states
  - 100% deterministic (same input = same output)
- **User**:
  - Smooth step transitions
  - Values preserved across navigation
  - Appropriate fields shown based on persona
- **Business**:
  - Foundation ready for LLM enhancement
  - Clear fallback path for Phase 2

### Key Architectural Patterns:
- **Strategy Pattern**: Different strategies for each step type
- **Builder Pattern**: Step builder functions construct FormStep
- **Null Object Pattern**: Return null for unknown states
- **Pure Functions**: No side effects, testable

## What We're NOT Doing

- No AI/LLM integration (that's Phase 2)
- No complex conditional branching between steps
- No field-level validation (handled by UI components)
- No async operations (everything synchronous)
- No external API calls
- No database persistence
- No A/B testing or experimentation
- No metrics collection (just decision making)

## Implementation Approach

### Phase 1: Core Decision Function

#### 1. Main Decision Function (`getNextStep`)
**File**: `lib/policy/rules.ts`
**Pattern**: Strategy pattern with step handlers
**Implementation**:

```typescript
export function getNextStep(session: SessionState): FormPlan | null {
  // Handle initial state
  if (!session.completedSteps || session.completedSteps.length === 0) {
    return createBasicsStep(session);
  }

  // Determine next step based on completed steps
  const lastCompleted = session.completedSteps[session.completedSteps.length - 1];
  const currentIndex = DEFAULT_STEP_ORDER.indexOf(lastCompleted);

  if (currentIndex === -1) {
    return null; // Unknown step
  }

  // Check if flow is complete
  if (currentIndex >= DEFAULT_STEP_ORDER.length - 1) {
    return createSuccessStep(session);
  }

  // Get next step in sequence
  const nextStepId = DEFAULT_STEP_ORDER[currentIndex + 1];

  // Apply persona-based logic
  const persona = detectPersona(session.values);

  // Skip steps based on persona
  if (shouldSkipStep(nextStepId, persona)) {
    // Recursively find next unskipped step
    const updatedSession = {
      ...session,
      completedSteps: [...session.completedSteps, nextStepId]
    };
    return getNextStep(updatedSession);
  }

  // Build appropriate step
  switch (nextStepId) {
    case STEP_IDS.BASICS:
      return createBasicsStep(session);
    case STEP_IDS.WORKSPACE:
      return createWorkspaceStep(session, persona);
    case STEP_IDS.PREFERENCES:
      return createPreferencesStep(session, persona);
    case STEP_IDS.REVIEW:
      return createReviewStep(session);
    default:
      return null;
  }
}
```

#### 2. Step Skip Logic
```typescript
function shouldSkipStep(stepId: string, persona: UserPersona): boolean {
  if (persona === 'explorer') {
    // Explorers skip detailed setup
    if (stepId === STEP_IDS.WORKSPACE) {
      return false; // Still show, but with minimal fields
    }
    if (stepId === STEP_IDS.PREFERENCES) {
      return true; // Skip preferences entirely
    }
  }
  return false;
}
```

### Phase 2: Step Builder Functions

#### 1. Basics Step Builder
```typescript
function createBasicsStep(session: SessionState): FormPlan {
  const fields: Field[] = [
    {
      kind: 'text',
      id: FIELD_IDS.FULL_NAME,
      label: 'Full Name',
      required: true,
      placeholder: 'John Doe',
      value: session.values[FIELD_IDS.FULL_NAME] as string,
    },
    {
      kind: 'text',
      id: FIELD_IDS.EMAIL,
      label: 'Email',
      required: true,
      type: 'email',
      placeholder: 'john@company.com',
      value: session.values[FIELD_IDS.EMAIL] as string,
    },
    {
      kind: 'select',
      id: FIELD_IDS.ROLE,
      label: 'Role',
      required: true,
      options: ROLE_OPTIONS,
      placeholder: 'Select your role',
      value: session.values[FIELD_IDS.ROLE] as string,
    },
    {
      kind: 'radio',
      id: FIELD_IDS.USE_CASE,
      label: 'Primary Use Case',
      required: true,
      options: USE_CASE_OPTIONS,
      value: session.values[FIELD_IDS.USE_CASE] as string,
      orientation: 'vertical',
    },
  ];

  return {
    kind: 'render_step',
    step: {
      stepId: STEP_IDS.BASICS,
      title: 'Welcome! Let\'s get started',
      description: 'Tell us a bit about yourself',
      fields,
      primaryCta: {
        label: 'Continue',
        action: 'submit_step',
      },
    },
    stepper: buildStepperItems(session),
  };
}
```

#### 2. Workspace Step Builder (Persona-Aware)
```typescript
function createWorkspaceStep(session: SessionState, persona: UserPersona): FormPlan {
  const fields: Field[] = [];

  // Always include workspace name
  fields.push({
    kind: 'text',
    id: FIELD_IDS.WORKSPACE_NAME,
    label: 'Workspace Name',
    required: true,
    placeholder: 'My Workspace',
    value: session.values[FIELD_IDS.WORKSPACE_NAME] as string,
  });

  // Team persona gets additional fields
  if (persona === 'team') {
    fields.push(
      {
        kind: 'text',
        id: FIELD_IDS.COMPANY,
        label: 'Company',
        required: false,
        placeholder: 'Acme Inc.',
        value: session.values[FIELD_IDS.COMPANY] as string,
      },
      {
        kind: 'select',
        id: FIELD_IDS.TEAM_SIZE,
        label: 'Team Size',
        required: true,
        options: TEAM_SIZE_OPTIONS,
        placeholder: 'Select team size',
        value: session.values[FIELD_IDS.TEAM_SIZE] as string,
      },
      {
        kind: 'checkbox',
        id: FIELD_IDS.INVITE_TEAM,
        label: 'Invite Team Members',
        options: [
          { value: 'invite', label: 'Send invitations after setup' }
        ],
        values: session.values[FIELD_IDS.INVITE_TEAM] as string[],
      }
    );
  }

  return {
    kind: 'render_step',
    step: {
      stepId: STEP_IDS.WORKSPACE,
      title: persona === 'team' ? 'Set up your team workspace' : 'Name your workspace',
      description: persona === 'team'
        ? 'Configure your collaborative environment'
        : 'Choose a name for your personal workspace',
      fields,
      primaryCta: {
        label: 'Continue',
        action: 'submit_step',
      },
      secondaryCta: {
        label: 'Back',
        action: 'back',
      },
    },
    stepper: buildStepperItems(session),
  };
}
```

#### 3. Preferences Step Builder
```typescript
function createPreferencesStep(session: SessionState, persona: UserPersona): FormPlan {
  // Only shown for team persona
  const fields: Field[] = [
    {
      kind: 'checkbox',
      id: FIELD_IDS.FEATURES,
      label: 'Enable Features',
      options: FEATURE_OPTIONS,
      values: session.values[FIELD_IDS.FEATURES] as string[],
      orientation: 'vertical',
    },
    {
      kind: 'radio',
      id: FIELD_IDS.THEME,
      label: 'Interface Theme',
      options: THEME_OPTIONS,
      value: session.values[FIELD_IDS.THEME] as string,
      orientation: 'horizontal',
    },
    {
      kind: 'checkbox',
      id: FIELD_IDS.NOTIFICATIONS,
      label: 'Notification Preferences',
      options: NOTIFICATION_OPTIONS,
      values: session.values[FIELD_IDS.NOTIFICATIONS] as string[],
      orientation: 'vertical',
    },
  ];

  return {
    kind: 'render_step',
    step: {
      stepId: STEP_IDS.PREFERENCES,
      title: 'Customize your experience',
      description: 'Choose your preferred settings',
      fields,
      primaryCta: {
        label: 'Continue',
        action: 'submit_step',
      },
      secondaryCta: {
        label: 'Back',
        action: 'back',
      },
    },
    stepper: buildStepperItems(session),
  };
}
```

#### 4. Review Step Builder
```typescript
function createReviewStep(session: SessionState): FormPlan {
  const summary: Array<{ label: string; value: string }> = [];

  // Add all collected values to summary
  if (session.values[FIELD_IDS.FULL_NAME]) {
    summary.push({
      label: 'Name',
      value: session.values[FIELD_IDS.FULL_NAME] as string,
    });
  }

  if (session.values[FIELD_IDS.EMAIL]) {
    summary.push({
      label: 'Email',
      value: session.values[FIELD_IDS.EMAIL] as string,
    });
  }

  if (session.values[FIELD_IDS.ROLE]) {
    const role = ROLE_OPTIONS.find(
      opt => opt.value === session.values[FIELD_IDS.ROLE]
    );
    summary.push({
      label: 'Role',
      value: role?.label || session.values[FIELD_IDS.ROLE] as string,
    });
  }

  // Add workspace info
  if (session.values[FIELD_IDS.WORKSPACE_NAME]) {
    summary.push({
      label: 'Workspace',
      value: session.values[FIELD_IDS.WORKSPACE_NAME] as string,
    });
  }

  // Add team info if present
  if (session.values[FIELD_IDS.TEAM_SIZE]) {
    const teamSize = TEAM_SIZE_OPTIONS.find(
      opt => opt.value === session.values[FIELD_IDS.TEAM_SIZE]
    );
    summary.push({
      label: 'Team Size',
      value: teamSize?.label || session.values[FIELD_IDS.TEAM_SIZE] as string,
    });
  }

  return {
    kind: 'review',
    summary,
    stepper: buildStepperItems(session),
  };
}
```

#### 5. Success Step Builder
```typescript
function createSuccessStep(session: SessionState): FormPlan {
  const persona = detectPersona(session.values);
  const name = session.values[FIELD_IDS.FULL_NAME] as string || 'there';

  const message = persona === 'team'
    ? `Welcome aboard, ${name}! Your team workspace is ready.`
    : `You're all set, ${name}! Start exploring your workspace.`;

  return {
    kind: 'success',
    message,
  };
}
```

### Phase 3: Helper Functions

#### 1. Stepper Builder
```typescript
function buildStepperItems(session: SessionState): StepperItem[] {
  const currentStepIndex = DEFAULT_STEP_ORDER.indexOf(session.currentStep);

  return DEFAULT_STEP_ORDER.map((stepId, index) => ({
    id: stepId,
    label: getStepLabel(stepId),
    active: index === currentStepIndex,
    completed: session.completedSteps.includes(stepId),
  }));
}

function getStepLabel(stepId: string): string {
  const labels: Record<string, string> = {
    [STEP_IDS.BASICS]: 'Basics',
    [STEP_IDS.WORKSPACE]: 'Workspace',
    [STEP_IDS.PREFERENCES]: 'Preferences',
    [STEP_IDS.REVIEW]: 'Review',
  };
  return labels[stepId] || stepId;
}
```

## Testing Strategy

### Unit Tests

```typescript
// lib/policy/rules.test.ts

describe('Rules Engine - Basic Step Flow', () => {
  describe('getNextStep', () => {
    it('returns basics step for initial state', () => {
      const session = createMockSession({ completedSteps: [] });
      const result = getNextStep(session);

      expect(result?.kind).toBe('render_step');
      expect(result?.step?.stepId).toBe(STEP_IDS.BASICS);
    });

    it('progresses through DEFAULT_STEP_ORDER', () => {
      const session = createMockSession({
        completedSteps: [STEP_IDS.BASICS],
        values: { [FIELD_IDS.USE_CASE]: 'team_collaboration' }
      });

      const result = getNextStep(session);
      expect(result?.step?.stepId).toBe(STEP_IDS.WORKSPACE);
    });

    it('skips preferences for explorer persona', () => {
      const session = createMockSession({
        completedSteps: [STEP_IDS.BASICS, STEP_IDS.WORKSPACE],
        values: { [FIELD_IDS.USE_CASE]: 'just_exploring' }
      });

      const result = getNextStep(session);
      expect(result?.kind).toBe('review');
    });

    it('returns null for unknown step', () => {
      const session = createMockSession({
        completedSteps: ['unknown_step']
      });

      const result = getNextStep(session);
      expect(result).toBeNull();
    });

    it('preserves field values from session', () => {
      const session = createMockSession({
        values: {
          [FIELD_IDS.FULL_NAME]: 'John Doe',
          [FIELD_IDS.EMAIL]: 'john@example.com'
        }
      });

      const result = getNextStep(session);
      const nameField = result?.step?.fields.find(
        f => f.id === FIELD_IDS.FULL_NAME
      );

      expect(nameField?.value).toBe('John Doe');
    });

    it('responds in less than 100ms', () => {
      const session = createMockSession();
      const start = performance.now();
      getNextStep(session);
      const end = performance.now();

      expect(end - start).toBeLessThan(100);
    });
  });

  describe('Step Builders', () => {
    it('createWorkspaceStep shows minimal fields for explorer', () => {
      const session = createMockSession();
      const result = createWorkspaceStep(session, 'explorer');

      expect(result.step.fields).toHaveLength(1); // Only workspace name
      expect(result.step.fields[0].id).toBe(FIELD_IDS.WORKSPACE_NAME);
    });

    it('createWorkspaceStep shows all fields for team', () => {
      const session = createMockSession();
      const result = createWorkspaceStep(session, 'team');

      expect(result.step.fields.length).toBeGreaterThan(1);
      expect(result.step.fields.some(f => f.id === FIELD_IDS.TEAM_SIZE)).toBe(true);
    });

    it('createReviewStep generates accurate summary', () => {
      const session = createMockSession({
        values: {
          [FIELD_IDS.FULL_NAME]: 'Jane Smith',
          [FIELD_IDS.ROLE]: 'developer',
          [FIELD_IDS.WORKSPACE_NAME]: 'Tech Team'
        }
      });

      const result = createReviewStep(session);
      expect(result.kind).toBe('review');
      expect(result.summary).toContainEqual({
        label: 'Name',
        value: 'Jane Smith'
      });
    });
  });
});
```

### Integration Tests

```typescript
// __tests__/rules-integration.test.ts

describe('Rules Engine Integration', () => {
  it('completes full explorer flow', () => {
    let session = createMockSession();

    // Step 1: Basics
    let plan = getNextStep(session);
    expect(plan?.step?.stepId).toBe(STEP_IDS.BASICS);

    // Submit basics
    session = updateSession(session, {
      completedSteps: [STEP_IDS.BASICS],
      values: {
        [FIELD_IDS.USE_CASE]: 'just_exploring',
        [FIELD_IDS.FULL_NAME]: 'Explorer User'
      }
    });

    // Step 2: Workspace (minimal)
    plan = getNextStep(session);
    expect(plan?.step?.stepId).toBe(STEP_IDS.WORKSPACE);
    expect(plan?.step?.fields).toHaveLength(1);

    // Submit workspace
    session = updateSession(session, {
      completedSteps: [STEP_IDS.BASICS, STEP_IDS.WORKSPACE],
      values: {
        ...session.values,
        [FIELD_IDS.WORKSPACE_NAME]: 'My Space'
      }
    });

    // Step 3: Should skip preferences, go to review
    plan = getNextStep(session);
    expect(plan?.kind).toBe('review');

    // Complete
    session = updateSession(session, {
      completedSteps: [...DEFAULT_STEP_ORDER]
    });

    plan = getNextStep(session);
    expect(plan?.kind).toBe('success');
  });

  it('completes full team flow', () => {
    let session = createMockSession();

    // Similar test but with team persona
    // Verify all steps including preferences are shown
  });
});
```

### Manual Testing Scenarios

1. **Explorer Path Testing**:
   ```bash
   # Start dev server
   bun dev

   # Open browser to http://localhost:3000/onboarding?variant=static

   # Test flow:
   1. Enter name and email
   2. Select "Just exploring" for use case
   3. Verify workspace step shows only workspace name field
   4. Verify preferences step is skipped
   5. Verify review shows correct summary
   6. Check console for "[Plan Source: rules]"
   ```

2. **Team Path Testing**:
   ```bash
   # Same URL: http://localhost:3000/onboarding?variant=static

   # Test flow:
   1. Enter name and email
   2. Select "Team collaboration" for use case
   3. Verify workspace step shows all fields (company, team size, invite)
   4. Verify preferences step appears with all options
   5. Verify review includes all entered data
   ```

3. **Performance Testing**:
   ```bash
   # Open DevTools Network tab
   # Complete any flow
   # Check /api/plan response times
   # All should be <100ms
   ```

4. **Back Navigation Testing**:
   ```bash
   # At each step, click Back
   # Verify:
   - Previous step loads correctly
   - All values are preserved
   - Can re-submit and continue
   ```

## Success Criteria

### Automated Verification:
- [ ] Type checking passes: `bunx tsc --noEmit`
- [ ] Linting passes: `bunx eslint . --ext .ts,.tsx`
- [ ] Build succeeds: `bun run build`
- [ ] Unit tests pass with 80% coverage
- [ ] All integration tests pass

### Manual Verification:
- [ ] Initial state shows basics step
- [ ] Step progression follows DEFAULT_STEP_ORDER
- [ ] Explorer persona gets minimal fields (1 field in workspace)
- [ ] Team persona gets full field set (4+ fields in workspace)
- [ ] Preferences skipped for explorer
- [ ] Preferences shown for team
- [ ] Review step shows accurate summary
- [ ] Success message personalized by persona
- [ ] Unknown states return null (no crash)
- [ ] Console shows `[Plan Source: rules]`
- [ ] Response time <100ms (check Network tab)
- [ ] Back navigation preserves all values
- [ ] Field values preserved across steps

## Performance Considerations

### Response Time Targets:
- **Rules Engine**: <100ms (must be synchronous)
- **Session Lookup**: <1ms (in-memory Map)
- **Step Building**: <10ms per step
- **Total Decision Time**: <100ms end-to-end

### Optimization Strategies:
- All operations synchronous (no async/await)
- Direct Map lookups for session
- Pre-computed option arrays (constants)
- No external dependencies
- Minimal object creation

### Performance Monitoring:
```typescript
// Add timing wrapper for production
export function getNextStepWithTiming(session: SessionState): FormPlan | null {
  const start = performance.now();
  const result = getNextStep(session);
  const duration = performance.now() - start;

  if (duration > 100) {
    console.warn(`Rules engine slow: ${duration}ms`);
  }

  console.log(`[Plan Source: rules] (${duration.toFixed(2)}ms)`);
  return result;
}
```

## Migration Notes

### From P1-009 to Phase 2 (LLM Integration):
- Rules engine becomes fallback mechanism
- `getNextStep` wrapped with LLM director
- Same FormPlan return type maintained
- Session format unchanged
- API endpoints enhanced, not replaced

### Future Enhancements:
- Add more sophisticated persona detection
- Implement field dependency graphs
- Add conditional field visibility
- Support multi-path flows
- Add progress saving/resuming

## References

### Implementation Files:
- Main Rules Engine: `lib/policy/rules.ts`
- Type Definitions: `lib/types/form.ts`, `lib/types/session.ts`
- Constants: `lib/constants/fields.ts`, `lib/constants/options.ts`
- Session Store: `lib/store/session.ts`

### Phase Documentation:
- Current Phase: `PHASE1.md#P1-009`
- Dependencies: P1-003, P1-005
- Next Phase: P1-010 (Step Builders)

### Related Documentation:
- Architecture: `CLAUDE.md#architecture--key-patterns`
- Decision Cascade: `IMP.md#decision-cascade`
- Testing Guide: `CLAUDE.md#testing-strategy`