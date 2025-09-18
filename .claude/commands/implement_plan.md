# Implement Plan - Generative UI POC

You are tasked with implementing phases from PHASE1.md/PHASE2.md or approved technical plans. This project follows a Decision Cascade architecture (Rules → LLM → Fallback) with specific performance targets (<500ms rules, <5s LLM, >70% completion rate).

## Getting Started

When given a phase reference (e.g., P1-004) or plan path:
- Check PHASE1.md/PHASE2.md for the phase details and dependencies
- Verify all prerequisite phases are complete (e.g., P1-002 before P1-004)
- Read all related files in lib/types/, lib/policy/, components/
- **Read files fully** - never use limit/offset parameters, you need complete context
- Understand the Decision Cascade flow: Rules Engine → LLM Director → Fallback
- Create a todo list tracking each phase component
- Start implementing if dependencies are satisfied

If no phase/plan specified, ask: "Which phase from PHASE1.md/PHASE2.md should I implement?"

## Implementation Philosophy

### Decision Cascade Priority
Always implement in this order:
1. **Rules Engine** (deterministic, <500ms) - The baseline that always works
2. **LLM Director** (adaptive, <5s timeout) - Enhancement layer when available
3. **Fallback Logic** - Graceful degradation when LLM fails/times out

### Phase Implementation
- Check phase dependencies in PHASE1.md/PHASE2.md
- Each phase has story points (1 point ≈ 2-4 hours)
- Implement discriminated unions with `kind` field for type safety
- Use shadcn/ui components following existing patterns
- Update phase status in PHASE1.md as you complete (✅)

### Type-First Development
1. Define types in lib/types/ with discriminated unions
2. Add Zod schemas if runtime validation needed
3. Implement business logic (Rules/LLM)
4. Build UI components with polymorphic rendering
5. Connect via API routes with proper validation

If you encounter a mismatch:
- STOP and check phase dependencies
- Present the issue clearly:
  ```
  Issue in Phase [P1-XXX/P2-XXX]:
  Expected: [what PHASE1.md/plan says]
  Found: [actual implementation status]
  Dependencies: [Which P1-XXX items this blocks]
  Performance impact: [Effect on <500ms/<5s targets]

  Options:
  1. Implement missing dependency first
  2. Modify approach to work with current state
  3. Update phase requirements

  Recommended: [your assessment]
  ```

## Verification Approach

### After implementing each phase component:

#### Type & Build Verification:
```bash
# Type checking
bunx tsc --noEmit

# Linting
bunx eslint . --ext .ts,.tsx

# Build verification
bun run build

# Development server
bun dev
```

#### Performance Verification:
1. **Rules Engine**: Open console, verify response <500ms
2. **LLM Director**: Test with network throttling, verify 5s timeout
3. **Session Store**: Check memory cleanup after 50 events
4. **API Response**: Monitor Network tab for /api/plan timing

#### UI Testing:
```bash
# Test adaptive flow (AI-powered)
open http://localhost:3000/onboarding?variant=adaptive

# Test static flow (rules only)
open http://localhost:3000/onboarding?variant=static

# Check console for decision source
# Should see: [Plan Source: rules|llm|fallback]
```

#### Update Progress:
- Mark phase complete in PHASE1.md/PHASE2.md (change [ ] to [x])
- Update todos with completed items
- Note actual vs estimated story points

## If You Get Stuck

### Common Issues & Solutions:

#### Type Errors with Discriminated Unions:
- Check all `kind` fields match exactly
- Verify type guards narrow correctly
- Use `satisfies` for const assertions

#### Performance Issues:
- Rules Engine >500ms: Check for blocking I/O, optimize loops
- LLM timeout not working: Verify Promise.race implementation
- Session memory leak: Check cleanup interval (10 min)

#### UI Component Issues:
- Field not rendering: Check Field.tsx polymorphic switch
- shadcn/ui styling: Verify component imports from components/ui/
- State not persisting: Check session store update calls

### Research Patterns:
Use specialized agents for investigation:
- **frontend-architect**: shadcn/ui patterns, React optimization
- **engineering-manager-ai**: Next.js 15.4, AI SDK 5 issues
- **prompt-engineer-structured**: LLM tool definitions

## Resuming Work

### Check Implementation Status:

1.  **Verify existing implementations**:
   ```bash
   # Check what's already built
   ls -la lib/types/
   ls -la lib/policy/
   ls -la components/form/

   # Run quick validation
   bunx tsc --noEmit
   ```

2. **Test current functionality**:
   ```bash
   bun dev
   # Open http://localhost:3000/onboarding
   # Verify completed phases work
   ```

### Implementation Order:
1. Core types (P1-002 to P1-004)
2. Session management (P1-006 to P1-008)
3. Rules Engine (P1-009 to P1-011)
4. API endpoints (P1-012 to P1-013)
5. UI components (P1-014 to P1-016)
6. Integration (P1-017 to P1-018)
7. LLM enhancement (P2-001 onwards)

Remember: The goal is a working POC that proves AI can orchestrate UI with measurable improvements (>70% completion, <2min time, ~30% field reduction).

## Phase-Specific Implementation Patterns

### For Type Definition Phases (P1-002 to P1-004):
```typescript
// Always use discriminated unions
export type FormPlan =
  | { kind: "render_step"; step: FormStep; stepper: StepperItem[] }
  | { kind: "review"; summary: Summary[]; stepper: StepperItem[] }
  | { kind: "success"; message: string };

// Add type guards
export const isRenderStep = (plan: FormPlan): plan is RenderStepPlan =>
  plan.kind === "render_step";
```

### For Rules Engine Phases (P1-009 to P1-011):
```typescript
// Performance-critical path
export class RulesEngine {
  static getNextStep(state: SessionState): FormPlan | null {
    const start = performance.now();
    // ... logic ...
    const duration = performance.now() - start;
    console.log(`[Rules Engine: ${duration.toFixed(2)}ms]`);
    return plan;
  }
}
```

### For LLM Integration Phases (P2-001 to P2-003):
```typescript
// Always implement with timeout
const timeout = new Promise<null>(resolve =>
  setTimeout(() => resolve(null), 5000)
);

const plan = await Promise.race([
  LLMDirector.proposeNextStep(session),
  timeout
]);

if (!plan) {
  console.log('[LLM timeout - falling back to rules]');
  return RulesEngine.getNextStep(session);
}
```

### For UI Component Phases (P1-014 to P1-016):
```tsx
// Polymorphic rendering pattern
function Field({ field, onChange }: FieldProps) {
  switch (field.kind) {
    case 'text':
      return <TextField {...field} onChange={onChange} />;
    case 'radio':
      return <RadioField {...field} onChange={onChange} />;
    // ... other cases
    default:
      assertNever(field); // Exhaustiveness check
  }
}
```

## Success Metrics Tracking

Always measure against targets:
- **Completion Rate**: >70% (adaptive) vs ~50% (static)
- **Time to Complete**: <2 minutes
- **Field Reduction**: ~30% with AI
- **Response Times**: <500ms (rules), <5s (LLM)
- **Fallback Rate**: <5% of requests
