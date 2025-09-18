# Validate Plan - Generative UI POC

You are tasked with validating phase implementations from PHASE1.md/PHASE2.md, verifying the Decision Cascade architecture (Rules → LLM → Fallback) meets performance targets (<500ms rules, <5s LLM, >70% completion rate).

## Initial Setup

When invoked:
1. **Determine context** - Which phase(s) to validate?
   - If phase specified (e.g., P1-004): Check that phase
   - If existing conversation: Review implemented phases
   - If fresh: Check PHASE1.md/PHASE2.md for completed items (✅)

2. **Locate implementation**:
   - Check phase tracking in PHASE1.md/PHASE2.md
   - Review lib/types/, lib/policy/, components/ for implementations
   - Verify against IMP.md reference implementation

3. **Gather implementation evidence**:
   ```bash
   # Check recent commits
   git log --oneline -n 20 | grep -E "P[12]-[0-9]{3}"
   git diff HEAD~N..HEAD  # Where N covers implementation commits

   # Run project-specific checks
   bunx tsc --noEmit  # Type checking
   bunx eslint . --ext .ts,.tsx  # Linting
   bun run build  # Build verification
   ```

## Validation Process

### Step 1: Context Discovery

If starting fresh or need more context:

1. **Read the phase requirements** from PHASE1.md/PHASE2.md
2. **Identify what should exist**:
   - Type definitions in lib/types/ (discriminated unions)
   - Decision logic in lib/policy/ (Rules/LLM)
   - UI components in components/ (FormRenderer, Field)
   - API routes in app/api/ (plan, events, sessions)
   - Performance targets (<500ms, <5s, >70%)

3. **Spawn parallel research tasks** for validation:
   ```
   Task 1 - Verify Type System:
   Check lib/types/form.ts for discriminated unions with 'kind' field.
   Verify Field, FormPlan, UXEvent type definitions.
   Confirm Zod schemas if runtime validation required.
   Return: Type safety implementation status

   Task 2 - Verify Decision Cascade:
   Check lib/policy/rules.ts for Rules Engine (<500ms).
   Check lib/policy/llm.ts for LLM Director with timeout.
   Verify fallback logic when LLM fails.
   Return: Three-tier decision model status

   Task 3 - Verify UI Components:
   Check components/form/Field.tsx for polymorphic rendering.
   Verify FormRenderer orchestration logic.
   Confirm shadcn/ui integration patterns.
   Return: Component hierarchy and rendering logic
   ```

### Step 2: Systematic Validation

For each phase in the plan:

1. **Check completion status**:
   - Look for checkmarks in the plan (- [x])
   - Verify the actual code matches claimed completion

2. **Run automated verification**:
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
   - Document pass/fail status
   - Check performance in browser console
   - Verify [Plan Source: rules|llm|fallback] logs

3. **Assess manual criteria**:
   - Test adaptive flow: http://localhost:3000/onboarding?variant=adaptive
   - Test static flow: http://localhost:3000/onboarding?variant=static
   - Verify persona paths (explorer vs team)
   - Check field reduction (~30% fewer fields)
   - Monitor console for decision sources

4. **Think deeply about edge cases**:
   - Were error conditions handled?
   - Are there missing validations?
   - Could the implementation break existing functionality?

### Step 3: Generate Validation Report

Create comprehensive validation summary:

```markdown
## Validation Report: [Phase P1-XXX/P2-XXX]

### Phase Implementation Status
✓ P1-001: Project Setup - Complete
✓ P1-002: Field Types - Complete
✓ P1-003: Form Types - Complete
⚠️ P1-004: Session Types - Partial (see issues)

### Automated Verification Results
✓ Type checking passes: `bunx tsc --noEmit`
✓ Build succeeds: `bun run build`
✗ Linting issues: `bunx eslint .` (3 warnings)

### Performance Metrics
✓ Rules Engine: 45ms average (target <500ms)
⚠️ LLM Director: 3.2s average (target <5s)
✓ Session cleanup: Working at 50 events
✗ Completion rate: 65% (target >70%)

### Code Review Findings

#### Matches Requirements:
- Discriminated unions with `kind` field implemented
- Rules Engine provides deterministic baseline
- FormRenderer uses polymorphic rendering
- Session store implements circular buffer (50 events)

#### Deviations from Phase Plan:
- Using 5s timeout instead of 2s for LLM (more realistic)
- Added extra persona detection logic (improvement)
- Simplified Field types for POC scope

#### Potential Issues:
- LLM response time approaching timeout boundary
- Completion rate below 70% target
- Missing Zod validation on some fields
- No retry logic for LLM failures

### Manual Testing Required:

1. **Explorer Persona Path**:
   - [ ] Select "Just exploring" in basics step
   - [ ] Verify simplified workspace setup
   - [ ] Confirm preferences step skipped
   - [ ] Check <3 fields per step average

2. **Team Persona Path**:
   - [ ] Select "Team collaboration" in basics
   - [ ] Verify full workspace configuration
   - [ ] Check template suggestions by role
   - [ ] Confirm all preferences shown

3. **LLM Behavior (adaptive only)**:
   - [ ] Disconnect network after first step
   - [ ] Verify fallback to rules (check console)
   - [ ] Reconnect and verify LLM resumes
   - [ ] Check field reduction percentage

4. **Performance Testing**:
   - [ ] Open DevTools Network tab
   - [ ] Verify /api/plan <500ms (rules)
   - [ ] Verify /api/plan <5s (LLM)
   - [ ] Check event batching (1s delay)

### Recommendations:
- Optimize LLM prompts to reduce response time
- Add retry logic with exponential backoff
- Implement A/B testing framework for metrics
- Add Zod schemas for runtime validation
- Consider caching Rules Engine decisions
- Document Decision Cascade architecture
```

## Working with Existing Context

If you were part of the implementation:
- Review the conversation history
- Check your todo list for what was completed
- Focus validation on work done in this session
- Be honest about any shortcuts or incomplete items

## Success Metrics Validation

### Core POC Metrics to Track:
```javascript
// Add this to your validation testing
const metrics = {
  completionRate: {
    adaptive: 0, // Target: >70%
    static: 0,   // Baseline: ~50%
  },
  avgTimeToComplete: {
    adaptive: 0, // Target: <2 minutes
    static: 0,   // Baseline for comparison
  },
  fieldReduction: {
    percentage: 0, // Target: ~30%
    avgFieldsPerStep: 0, // Should be lower for adaptive
  },
  performance: {
    rulesEngineAvg: 0, // Target: <500ms
    llmDirectorAvg: 0, // Target: <5s
    fallbackRate: 0,   // Target: <5%
  }
};
```

### How to Measure:
1. **Completion Rate**: Track submit_step events vs abandon events
2. **Time to Complete**: Measure from first page_view to complete event
3. **Field Reduction**: Compare fields shown in adaptive vs static
4. **Performance**: Use console.time() or Performance API

## Important Guidelines

1. **Focus on POC goals** - Prove AI can improve UI orchestration
2. **Measure everything** - Performance and user metrics are critical
3. **Test both variants** - Always compare adaptive vs static
4. **Verify Decision Cascade** - Rules → LLM → Fallback must work
5. **Document deviations** - Note why targets weren't met

## Validation Checklist

Always verify:
- [ ] Phase dependencies satisfied (check PHASE1.md)
- [ ] Type checking passes: `bunx tsc --noEmit`
- [ ] Discriminated unions use `kind` field consistently
- [ ] Decision Cascade works: Rules → LLM → Fallback
- [ ] Performance targets met (<500ms, <5s)
- [ ] Completion rate >70% (check metrics)
- [ ] Field reduction ~30% achieved
- [ ] Console shows [Plan Source: rules|llm|fallback]
- [ ] Both adaptive and static variants work

## Relationship to Other Commands

Recommended workflow:
1. `/create_plan P1-XXX` - Design the implementation
2. `/implement_plan P1-XXX` - Execute the phase
3. `/validate_plan P1-XXX` - Verify correctness
4. `/commit` - Create atomic commits
5. Update PHASE1.md/PHASE2.md with ✅

The validation works best after commits are made, as it can analyze the git history to understand what was implemented.

Remember: This POC must prove AI can orchestrate UI with measurable improvements. Focus validation on:
- Performance metrics (<500ms rules, <5s LLM)
- User metrics (>70% completion, <2min time)
- AI effectiveness (~30% field reduction)
- Decision Cascade reliability (fallback works)
