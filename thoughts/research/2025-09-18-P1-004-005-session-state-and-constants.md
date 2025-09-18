---
date: 2025-09-18T11:01:26+0800
researcher: Claude Code
git_commit: d60546a7048f216fd63aafa85da268bc489aba93
branch: master
repository: gen_ui
topic: "P1-004 Session State Types & Events and P1-005 Constants & Configuration Module"
tags: [research, codebase, session-state, events, constants, configuration, types]
status: complete
last_updated: 2025-09-18
last_updated_by: Claude Code
---

# Research: P1-004 Session State Types & Events and P1-005 Constants & Configuration Module

**Date**: 2025-09-18T11:01:26+0800
**Researcher**: Claude Code
**Git Commit**: d60546a7048f216fd63aafa85da268bc489aba93
**Branch**: master
**Repository**: gen_ui

## Research Question
Analyze the requirements for P1-004 (Session State Types & Events) and P1-005 (Constants & Configuration Module) from PHASE1.md, understand the existing codebase structure, and create a comprehensive implementation plan.

## Summary
The project is in its early stages with only basic form types implemented (P1-002 and P1-003 completed). To implement P1-004 and P1-005, we need to:
1. Create session state management types with event tracking capabilities
2. Build a constants/configuration module for field IDs, options, and LLM settings
3. Ensure type safety using TypeScript's discriminated unions and const assertions
4. Follow the established patterns from the existing `form.ts` types

## Detailed Findings

### Current Project State
- **Completed Tasks**: P1-001 (Project Setup), P1-002 (Field Types), P1-003 (Form & Plan Types)
- **Existing Type System**: Well-structured discriminated unions for fields and form plans in `src/lib/types/form.ts`
- **Project Structure**: Next.js 15.5.3 with TypeScript, using App Router
- **Dependencies**: AI SDK 5, Zod, UUID installed for future use

### Existing Type Patterns (src/lib/types/form.ts)
The project uses excellent TypeScript patterns:
- Discriminated unions with `kind` field for type safety
- Type guards implemented for all union types
- Helper functions for value extraction and validation
- Comprehensive JSDoc documentation
- Clear separation between base interfaces and specific implementations

### P1-004 Requirements Analysis

#### SessionState Type Requirements
Based on PHASE1.md and CLAUDE.md architecture:
- Track current step in onboarding flow
- Store collected form values from all steps
- Maintain session metadata (ID, creation time, last activity)
- Support persona detection (explorer vs team user)
- Event queue management for telemetry

#### UXEvent Type Requirements
Event types to track user behavior:
- Field interactions (focus, blur, change)
- Step navigation (submit, back, skip)
- Error occurrences
- Time spent on steps
- Validation attempts
- Form completion

#### Implementation Considerations
- Use discriminated unions similar to existing Field types
- Include timestamp handling for all events
- Implement type guards for runtime safety
- Consider event payload minimization for memory efficiency

### P1-005 Requirements Analysis

#### Field IDs Enum
Need whitelisted field identifiers for security:
- Basic info fields: name, email, company, role
- Workspace fields: workspace_name, team_size
- Use case fields: primary_use, project_type
- Preference fields: notifications, features

#### Option Arrays
Predefined options for dropdowns/radios:
- Roles: Engineer, Product Manager, Designer, etc.
- Team sizes: 1-5, 5-20, 20-100, 100+
- Use cases: Personal, Team, Enterprise
- Templates: Kanban, Scrum, Waterfall, etc.

#### LLM Configuration
Constants for AI integration:
- Model name: 'gpt-4-turbo'
- Temperature: 0.3
- Timeout: 2000ms
- Max tokens: 1000
- System prompts for different decision points

## Architecture Insights

### Type System Design Principles
1. **Discriminated Unions**: Use `kind` or `type` field for all union types
2. **Type Guards**: Provide runtime type checking functions
3. **Helper Functions**: Create utilities for common operations
4. **Const Assertions**: Use `as const` for immutable configuration
5. **JSDoc Comments**: Document all types and functions thoroughly

### Session Management Architecture
Based on CLAUDE.md, the session store will:
- Use in-memory Map for POC (Redis for production)
- Implement singleton pattern
- Auto-cleanup stale sessions (>1 hour)
- Maintain event queue with 50-event limit
- Use UUID for session ID generation

### Event System Architecture
- Asynchronous event processing to avoid UI blocking
- Debouncing for change events (1-second delay)
- Batch processing for API efficiency
- Circular buffer for event limiting
- Pattern analysis for behavioral insights

## Implementation Plan

### File Structure
```
src/lib/
├── types/
│   ├── form.ts (existing)
│   ├── session.ts (new - P1-004)
│   └── events.ts (new - P1-004)
├── constants/
│   ├── index.ts (new - P1-005)
│   ├── fields.ts (new - P1-005)
│   ├── options.ts (new - P1-005)
│   └── llm.ts (new - P1-005)
```

### P1-004: Session State Types & Events

#### 1. Create `src/lib/types/session.ts`
```typescript
export interface SessionState {
  id: string;
  createdAt: Date;
  lastActivityAt: Date;
  currentStep: string;
  completedSteps: string[];
  values: Record<string, any>;
  persona?: 'explorer' | 'team';
  events: UXEvent[];
  metadata?: Record<string, any>;
}
```

#### 2. Create `src/lib/types/events.ts`
```typescript
export type UXEvent =
  | FieldFocusEvent
  | FieldBlurEvent
  | FieldChangeEvent
  | StepSubmitEvent
  | StepBackEvent
  | ValidationErrorEvent;
```

### P1-005: Constants & Configuration Module

#### 1. Create `src/lib/constants/fields.ts`
```typescript
export const FIELD_IDS = {
  // Basic fields
  FULL_NAME: 'full_name',
  EMAIL: 'email',
  COMPANY: 'company',
  ROLE: 'role',
  // ... more fields
} as const;
```

#### 2. Create `src/lib/constants/options.ts`
```typescript
export const ROLE_OPTIONS = [
  { value: 'eng', label: 'Engineer' },
  { value: 'pm', label: 'Product Manager' },
  // ... more options
] as const;
```

#### 3. Create `src/lib/constants/llm.ts`
```typescript
export const LLM_CONFIG = {
  model: 'gpt-4-turbo',
  temperature: 0.3,
  maxTokens: 1000,
  timeout: 2000,
} as const;
```

## Testing Considerations

### Unit Test Coverage
- Type guard functions for all discriminated unions
- Event creation and validation
- Session state mutations
- Constant immutability verification

### Integration Test Scenarios
- Session creation and retrieval
- Event queue management
- Cleanup timer functionality
- Type safety across module boundaries

## Risk Mitigation

### Memory Management
- Implement proper cleanup for session store
- Use WeakMap if reference counting issues arise
- Monitor event queue size limits

### Type Safety
- Extensive use of const assertions
- Runtime validation with Zod where needed
- Type guards at API boundaries

### Performance
- Keep event payloads minimal
- Implement efficient circular buffer
- Use debouncing for high-frequency events

## Next Steps
1. Implement session.ts and events.ts type definitions
2. Create constants module with all required configurations
3. Add type guards and helper functions
4. Write comprehensive unit tests
5. Document API usage examples
6. Prepare for P1-006 (Session Store implementation)