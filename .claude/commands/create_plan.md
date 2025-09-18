# Implementation Plan - Generative UI POC

You are tasked with creating detailed implementation plans for the AI-orchestrated adaptive onboarding flow system. Plans should align with the Decision Cascade architecture (Rules → LLM → Fallback), follow the phase tracking system (PHASE1.md/PHASE2.md), and include specific performance targets (<100ms rules, <2s LLM, >70% completion rate).

## Initial Response

When this command is invoked:

1. **Check if parameters were provided**:
   - If a file path or ticket reference was provided as a parameter, skip the default message
   - Immediately read any provided files FULLY
   - Begin the research process

2. **If no parameters provided**, respond with:
```
I'll help you create a detailed implementation plan for the Generative UI POC. Let me start by understanding what we're building.

Please provide:
1. The task/phase reference (e.g., P1-004, P2-001) or feature description
2. Any specific requirements for:
   - Decision architecture (Rules/LLM/Fallback)
   - UI components (FormRenderer, Field types)
   - Performance targets (response times, completion rates)
3. Links to related phases in PHASE1.md/PHASE2.md or IMP.md

I'll analyze this against our Decision Cascade architecture and create a comprehensive plan.

Tip: Reference specific phase items: `/create_plan P1-004 Session State Types`
For AI features: `/create_plan P2-002 LLM Integration with streaming`
```

Then wait for the user's input.

## Process Steps

### Step 1: Context Gathering & Initial Analysis

1. **Read all mentioned files immediately and FULLY**:
   - Ticket files (e.g., `PHASE1.md` and `PHASE2.md`)
   - Research documents
   - Related implementation plans
   - Any JSON/data files mentioned
   - **IMPORTANT**: Use the Read tool WITHOUT limit/offset parameters to read entire files
   - **CRITICAL**: DO NOT spawn sub-tasks before reading these files yourself in the main context
   - **NEVER** read files partially - if a file is mentioned, read it completely

2. **Spawn initial research tasks to gather context**:
   Before asking the user any questions, use specialized agents to research in parallel:

   - Use the **general-purpose** agent to find all files related to the phase/task
   - Use the **frontend-architect** agent for UI component patterns with shadcn/ui
   - Use the **engineering-manager-ai** agent for Next.js 15.4 and AI SDK 5 architecture
   - Use the **prompt-engineer-structured** agent for LLM prompt design if needed

   These agents will:
   - Find relevant source files, configs, and tests
   - Trace data flow and key functions
   - Return detailed explanations with file:line references

3. **Read all files identified by research tasks**:
   - After research tasks complete, read ALL files they identified as relevant
   - Read them FULLY into the main context
   - This ensures you have complete understanding before proceeding

4. **Analyze and verify understanding**:
   - Cross-reference the ticket requirements with actual code
   - Identify any discrepancies or misunderstandings
   - Note assumptions that need verification
   - Determine true scope based on codebase reality

5. **Present informed understanding and focused questions**:
   ```
   Based on the phase requirements and my research, I understand we need to [accurate summary].

   I've found in the codebase:
   - Current implementation: [e.g., lib/types/form.ts:45 - discriminated unions for Field types]
   - Decision pattern: [e.g., lib/policy/rules.ts:12 - Rules Engine with <100ms target]
   - UI components: [e.g., components/form/Field.tsx - polymorphic rendering]
   - Phase status: [e.g., P1-001 through P1-003 completed]

   Architecture considerations:
   - Decision Model: [Rules/LLM/Fallback implementation status]
   - Performance: [Current vs target metrics]
   - Type Safety: [Zod schemas, discriminated unions]

   Questions requiring clarification:
   - [Persona detection strategy for explorer vs team]
   - [Field reduction target percentage]
   - [LLM timeout fallback behavior]
   ```

   Only ask questions that you genuinely cannot answer through code investigation.

### Step 2: Research & Discovery

After getting initial clarifications:

1. **If the user corrects any misunderstanding**:
   - DO NOT just accept the correction
   - Spawn new research tasks to verify the correct information
   - Read the specific files/directories they mention
   - Only proceed once you've verified the facts yourself

2. **Create a research todo list** using TodoWrite to track exploration tasks

3. **Spawn parallel sub-tasks for comprehensive research**:
   - Create multiple Task agents to research different aspects concurrently
   - Use the right agent for each type of research:

   **For UI component investigation:**
   - **frontend-architect** - To research FormRenderer, Field components, shadcn/ui patterns
   - **general-purpose** - To find all form-related components and their usage

   **For architecture and AI:**
   - **engineering-manager-ai** - For Next.js 15.4 patterns, AI SDK 5 streaming, Decision Cascade
   - **prompt-engineer-structured** - For LLM tool definitions and structured outputs

   **For type system and validation:**
   - **general-purpose** - To analyze discriminated unions, Zod schemas, type flow

   **For performance and optimization:**
   - **engineering-manager-ai** - For timeout strategies, caching, session management

   Each agent knows how to:
   - Find the right files and code patterns
   - Identify conventions and patterns to follow
   - Look for integration points and dependencies
   - Return specific file:line references
   - Find tests and examples

3. **Wait for ALL sub-tasks to complete** before proceeding

4. **Present findings and design options**:
   ```
   Based on my research, here's what I found:

   **Current Implementation Status:**
   - Completed phases: [e.g., P1-001 to P1-003 - types and setup]
   - Decision architecture: [Current Rules Engine status, LLM readiness]
   - UI components: [FormRenderer, Field polymorphism status]
   - Performance baseline: [Current metrics vs targets]

   **Design Options for Decision Cascade:**
   1. **Rules-First Approach**
      - Pros: <100ms response, deterministic, no API costs
      - Cons: Less adaptive, requires manual rules updates
      - Use when: High confidence, known patterns

   2. **LLM-Enhanced Approach**
      - Pros: Adaptive UI, persona detection, field reduction
      - Cons: 2s timeout risk, API costs, non-deterministic
      - Use when: Complex decisions, unknown user patterns

   **Architecture Decisions:**
   - Session management: [In-memory vs Redis for POC]
   - Type safety: [Zod runtime validation vs TypeScript only]
   - Streaming: [AI SDK 5 streaming vs batch responses]

   Which approach best fits the current phase requirements?
   ```

### Step 3: Plan Structure Development

Once aligned on approach:

1. **Create initial plan outline**:
   ```
   Here's my proposed plan structure:

   ## Overview
   [1-2 sentence summary aligned with Decision Cascade architecture]

   ## Implementation Phases:
   1. **[Phase ID: e.g., P1-004]** - [Title] (Story Points: X)
      - Dependencies: [P1-002, P1-003]
      - Decision Model: [Rules/LLM/Fallback]
      - Performance Target: [<100ms/<2s]

   2. **[Phase ID]** - [Title] (Story Points: X)
      - Dependencies: [Previous phases]
      - Key Components: [FormRenderer, Field, etc.]
      - Success Metric: [e.g., 70% completion]

   3. **[Phase ID]** - [Title] (Story Points: X)
      - Dependencies: [Previous phases]
      - Integration: [AI SDK 5, streaming]
      - Field Reduction Target: [30%]

   Does this align with our PHASE1.md/PHASE2.md tracking? Should I adjust for Decision Cascade priorities?
   ```

2. **Get feedback on structure** before writing details

### Step 4: Detailed Plan Writing

After structure approval:

1. **Write the plan** to `thoughts/shared/plans/YYYY-MM-DD-ENG-XXXX-description.md`
   - Format: `YYYY-MM-DD-ENG-XXXX-description.md` where:
     - YYYY-MM-DD is today's date
     - ENG-XXXX is the ticket number (omit if no ticket)
     - description is a brief kebab-case description
   - Examples:
     - With ticket: `2025-01-08-ENG-1478-parent-child-tracking.md`
     - Without ticket: `2025-01-08-improve-error-handling.md`
2. **Use this template structure**:

````markdown
# [Phase ID: P1-XXX/P2-XXX] [Feature Name] Implementation Plan

## Overview

[Brief description aligned with Generative UI POC goals - adaptive onboarding, Decision Cascade, AI orchestration]

## Phase Context

- **Phase Reference**: [P1-XXX from PHASE1.md or P2-XXX from PHASE2.md]
- **Story Points**: [Estimated effort]
- **Dependencies**: [Previous phase items that must be complete]
- **Decision Model**: [Rules Engine / LLM Director / Fallback]

## Current State Analysis

### Completed Components:
- [e.g., lib/types/form.ts - Discriminated unions for Field types]
- [e.g., lib/policy/rules.ts - Deterministic rules engine]
- [e.g., Session Store with in-memory persistence]

### Missing/Required:
- [What needs to be built]
- [Integration points needed]

### Performance Baseline:
- Rules Engine: [Current response time vs <100ms target]
- LLM Decisions: [Current vs <2s timeout target]
- Completion Rate: [Current vs >70% target]

## Desired End State

[Specification of the adaptive UI behavior after implementation]

### Success Metrics:
- **Technical**: Response times, error rates, timeout handling
- **User**: Completion rate, field reduction %, time-to-value
- **Business**: POC viability for production rollout

### Key Architectural Patterns:
- **Decision Cascade**: How Rules → LLM → Fallback will work
- **Type Safety**: Discriminated unions, Zod validation
- **UI Adaptation**: Persona detection, dynamic field rendering
- **Performance**: Caching, timeout strategies, batching

## What We're NOT Doing

[Explicitly list out-of-scope items to prevent scope creep]

## Implementation Approach

[High-level strategy and reasoning]

## Phase 1: [P1-XXX] [Descriptive Name]

### Overview
[What this phase accomplishes in context of Decision Cascade]

### Architecture Impact:
- **Decision Model**: [Rules/LLM/Fallback changes]
- **Performance**: [Impact on <100ms/<2s targets]
- **Type Safety**: [New types, Zod schemas]

### Changes Required:

#### 1. Type Definitions
**File**: `lib/types/[domain].ts`
**Pattern**: Discriminated unions with `kind` field
**Changes**: [Summary of type changes]

```typescript
// Example discriminated union pattern
export type FormPlan =
  | { kind: "render_step"; step: FormStep }
  | { kind: "review"; summary: Summary }
  | { kind: "success"; message: string };
```

#### 2. UI Components (shadcn/ui)
**File**: `components/form/[Component].tsx`
**Pattern**: Polymorphic rendering based on field.kind
**Changes**: [Component changes]

```tsx
// Example Field component with shadcn/ui
```

#### 3. Decision Logic
**File**: `lib/policy/[rules|llm].ts`
**Performance Target**: [<100ms for rules, <2s for LLM]
**Changes**: [Logic implementation]

### Success Criteria:

#### Automated Verification:
- [ ] Type checking passes: `bunx tsc --noEmit`
- [ ] Linting passes: `bunx eslint . --ext .ts,.tsx`
- [ ] Unit tests pass: `bun test`
- [ ] Build succeeds: `bun run build`
- [ ] Development server runs: `bun dev`

#### Performance Verification:
- [ ] Rules Engine response: <100ms (measure in console)
- [ ] LLM timeout behavior: Falls back at 2s
- [ ] Session cleanup: Memory bounded at 50 events
- [ ] API response times: Check network tab

#### Manual Verification:
- [ ] Adaptive flow (?variant=adaptive): AI decisions visible
- [ ] Static flow (?variant=static): Deterministic rules only
- [ ] Persona detection: Explorer vs Team paths work
- [ ] Field reduction: ~30% fewer fields shown
- [ ] Back navigation: State preserved correctly
- [ ] Console shows: `[Plan Source: rules|llm|fallback]`

---

## Phase 2: [Descriptive Name]

[Similar structure with both automated and manual success criteria...]

---

## Testing Strategy

### Unit Tests:
- Rules Engine: All decision paths
- Session Store: CRUD operations, cleanup
- Type Guards: Discriminated union narrowing
- Field Components: Each field type renders

### Integration Tests:
- Complete onboarding flow (explorer persona)
- Complete onboarding flow (team persona)
- LLM timeout → fallback behavior
- Session persistence across API calls

### Manual Testing Scenarios:
1. **Explorer Path**:
   - Select "Just exploring" → Verify minimal fields
   - Check workspace step simplification
   - Confirm preferences skipped

2. **Team Path**:
   - Select "Team collaboration" → Full setup
   - Verify template suggestions based on role
   - Check all preference options appear

3. **LLM Behavior** (adaptive only):
   - Disconnect network after first step
   - Verify fallback to rules (check console)
   - Reconnect and verify LLM resumes

4. **Performance Testing**:
   - Open DevTools Network tab
   - Verify /api/plan response <100ms (rules)
   - Verify /api/plan response <2s (LLM)
   - Check event batching (1s delay)

## Performance Considerations

### Response Time Targets:
- **Rules Engine**: <100ms (synchronous, in-memory)
- **LLM Director**: <2s with timeout fallback
- **Event Processing**: Batch with 1s debounce
- **Session Cleanup**: Every 10 minutes for >1hr inactive

### Optimization Strategies:
- In-memory session store (Redis for production)
- Circular buffer for events (max 50)
- Parallel API calls where possible
- Streaming responses with AI SDK 5
- Client-side value caching

### Metrics to Track:
- Completion rate (target >70%)
- Average time to complete (<2 min)
- Field reduction percentage (~30%)
- LLM vs Rules vs Fallback distribution
- Drop-off points by step

## Migration Notes

### From Phase 1 to Phase 2:
- Rules Engine remains as fallback
- LLM Director layers on top
- Session format unchanged
- Backward compatible API

### Production Considerations:
- Replace in-memory with Redis
- Add proper error tracking
- Implement A/B test framework
- Add comprehensive metrics

## References

### Phase Documentation:
- Phase 1 Tasks: `PHASE1.md` (P1-001 through P1-020)
- Phase 2 Tasks: `PHASE2.md` (P2-001 through P2-015)
- Implementation Guide: `IMP.md`
- Project Instructions: `CLAUDE.md`

### Architecture References:
- Type Definitions: `lib/types/form.ts`
- Rules Engine: `lib/policy/rules.ts`
- LLM Director: `lib/policy/llm.ts`
- Session Store: `lib/store/session.ts`

### UI Components:
- Form Renderer: `components/form/FormRenderer.tsx`
- Field Component: `components/form/Field.tsx`
- Onboarding Flow: `components/onboarding/OnboardingFlow.tsx`

### External Documentation:
- [AI SDK 5 Docs](https://sdk.vercel.ai)
- [shadcn/ui Components](https://ui.shadcn.com)
- [Next.js 15.4 App Router](https://nextjs.org/docs/app)
````

### Step 5: Sync and Review

1. **Sync the thoughts directory**:
   - This ensures the plan is properly indexed and available

2. **Present the draft plan location**:
   ```
   I've created the initial implementation plan at:
   `thoughts/shared/plans/YYYY-MM-DD-ENG-XXXX-description.md`

   Please review it and let me know:
   - Are the phases properly scoped?
   - Are the success criteria specific enough?
   - Any technical details that need adjustment?
   - Missing edge cases or considerations?
   ```

3. **Iterate based on feedback** - be ready to:
   - Add missing phases
   - Adjust technical approach
   - Clarify success criteria (both automated and manual)
   - Add/remove scope items

4. **Continue refining** until the user is satisfied

## Important Guidelines

1. **Be Skeptical**:
   - Question vague requirements
   - Identify potential issues early
   - Ask "why" and "what about"
   - Don't assume - verify with code

2. **Be Interactive**:
   - Don't write the full plan in one shot
   - Get buy-in at each major step
   - Allow course corrections
   - Work collaboratively

3. **Be Thorough**:
   - Read all context files COMPLETELY before planning
   - Research actual code patterns using parallel sub-tasks
   - Include specific file paths and line numbers
   - Write measurable success criteria with clear automated vs manual distinction

4. **Be Practical**:
   - Focus on incremental, testable changes
   - Consider migration and rollback
   - Think about edge cases
   - Include "what we're NOT doing"

5. **Track Progress**:
   - Use TodoWrite to track planning tasks
   - Update todos as you complete research
   - Mark planning tasks complete when done

6. **No Open Questions in Final Plan**:
   - If you encounter open questions during planning, STOP
   - Research or ask for clarification immediately
   - Do NOT write the plan with unresolved questions
   - The implementation plan must be complete and actionable
   - Every decision must be made before finalizing the plan

## Success Criteria Guidelines

**Always separate success criteria into two categories:**

1. **Automated Verification** (can be run by execution agents):
   - Commands that can be run: `make test`, `npm run lint`, etc.
   - Specific files that should exist
   - Code compilation/type checking
   - Automated test suites

2. **Manual Verification** (requires human testing):
   - UI/UX functionality
   - Performance under real conditions
   - Edge cases that are hard to automate
   - User acceptance criteria

**Format example:**
```markdown
### Success Criteria:

#### Automated Verification:
- [ ] Database migration runs successfully: `make migrate`
- [ ] All unit tests pass: `go test ./...`
- [ ] No linting errors: `golangci-lint run`
- [ ] API endpoint returns 200: `curl localhost:8080/api/new-endpoint`

#### Manual Verification:
- [ ] New feature appears correctly in the UI
- [ ] Performance is acceptable with 1000+ items
- [ ] Error messages are user-friendly
- [ ] Feature works correctly on mobile devices
```

## Common Implementation Patterns

### For Decision Cascade Features:
1. Implement Rules Engine logic first (deterministic)
2. Add LLM Director as enhancement layer
3. Ensure fallback to rules on timeout/error
4. Test all three paths independently

### For UI Components (shadcn/ui):
1. Check existing Field component patterns
2. Use polymorphic rendering with `kind` field
3. Integrate with shadcn/ui primitives
4. Maintain consistent error/helper text display
5. Follow FormRenderer → Field hierarchy

### For Type System Updates:
1. Define discriminated unions with `kind`
2. Add Zod schemas for runtime validation
3. Export from central `lib/types/`
4. Update type guards as needed
5. Ensure API → UI type flow

### For Performance Optimization:
1. Measure baseline metrics first
2. Implement caching/batching strategies
3. Add timeout boundaries
4. Monitor with console timing
5. Track against targets (<100ms/<2s)

## Sub-task Spawning Best Practices

When spawning research sub-tasks:

1. **Spawn multiple tasks in parallel** for efficiency
2. **Each task should be focused** on a specific area
3. **Provide detailed instructions** including:
   - Exactly what to search for
   - Which directories to focus on
   - What information to extract
   - Expected output format
4. **Be EXTREMELY specific about directories**:
   - Include the full path context in your prompts
5. **Specify read-only tools** to use
6. **Request specific file:line references** in responses
7. **Wait for all tasks to complete** before synthesizing
8. **Verify sub-task results**:
   - If a sub-task returns unexpected results, spawn follow-up tasks
   - Cross-check findings against the actual codebase
   - Don't accept results that seem incorrect

Example of spawning multiple tasks:
```python
# Spawn these tasks concurrently:
tasks = [
    Task("Research database schema", db_research_prompt),
    Task("Find API patterns", api_research_prompt),
    Task("Investigate UI components", ui_research_prompt),
    Task("Check test patterns", test_research_prompt)
]
```

## Example Interaction Flow

```
User: /create_plan
Assistant: I'll help you create a detailed implementation plan for the Generative UI POC...

User: I need to implement P1-004 Session State Types & Events
Assistant: Let me read the phase requirements and analyze the current codebase...

[Reads PHASE1.md for P1-004 details]
[Analyzes existing types in lib/types/]

Based on P1-004 requirements, I understand we need to:
- Define SessionState type with all properties
- Create UXEvent discriminated union for telemetry
- Implement type guards for event handling
- Ensure <100ms performance for event processing

Current implementation status:
- P1-002: Field types completed ✓
- P1-003: FormPlan types completed ✓
- Dependencies satisfied for P1-004

Questions before planning:
1. Should we use Zod for runtime validation of events?
2. What's the event retention policy (currently 50 in memory)?
3. Any specific telemetry events beyond the standard set?

[Interactive planning continues with Decision Cascade focus...]
```
