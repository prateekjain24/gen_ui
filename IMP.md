# Generative UI POC - Implementation Plan

**Author:** Engineering Manager  
**Target:** Junior Engineer Implementation  
**Timeline:** 5-7 Days  
**Stack:** Next.js 15.4, TypeScript 4, OpenAI API using AI SDK 5, shadcn/ui  

---

## 🎯 Vision & Strategic Context

### Why We're Building This

Traditional UI follows a one-size-fits-all approach. Every user sees the same onboarding, the same forms, the same journey. This worked when software was simpler, but modern products serve diverse user personas with vastly different needs.

**The Paradigm Shift:** From static UIs designed by humans to adaptive UIs orchestrated by AI that respond to user context in real-time.

Imagine:
- A developer sees terminal commands while a designer sees visual workflows
- An enterprise user gets compliance fields while a hobbyist gets simplified options  
- Forms that learn from abandonment patterns and self-optimize

This POC proves that LLMs can act as "UI Directors" - making intelligent decisions about what to show, when, and how. If successful, this becomes the foundation for our next-generation product experience.

### Success Metrics
- **Technical:** <100ms rules, <2s LLM decisions, zero runtime errors
- **User:** 20% higher completion vs static, 30% faster time-to-value
- **Business:** Proves viability for Q2 2025 production rollout

---

## 📋 Pre-Implementation Checklist

### Environment Setup (Day 0 - 2 hours)

```bash
# Required installations
node --version  # Must be 18.17+
npm --version   # Must be 9+

# Create project
npx create-next-app@latest genui-poc --typescript --tailwind --app
cd genui-poc

# Install dependencies
npm install @vercel/ai openai zod uuid
npm install @radix-ui/react-label @radix-ui/react-select 
npm install @radix-ui/react-checkbox @radix-ui/react-radio-group
npm install lucide-react class-variance-authority clsx tailwind-merge

# Install shadcn/ui CLI
npx shadcn-ui@latest init
# Choose: New York style, Neutral base color, CSS variables

# Dev dependencies
npm install -D @types/uuid prettier eslint-config-prettier
```

### API Keys & Config

Create `.env.local`:
```env
OPENAI_API_KEY=sk-... # Get from platform.openai.com
NEXT_PUBLIC_API_URL=http://localhost:3000
NODE_ENV=development
```

### Project Structure
```
genui-poc/
├── app/
│   ├── api/
│   │   ├── plan/
│   │   │   └── route.ts         # LLM decision endpoint
│   │   ├── events/
│   │   │   └── route.ts         # Telemetry endpoint
│   │   └── sessions/
│   │       └── route.ts         # Session management
│   ├── onboarding/
│   │   └── page.tsx              # Main onboarding page
│   └── layout.tsx
├── components/
│   ├── ui/                      # shadcn components
│   ├── form/
│   │   ├── FormRenderer.tsx     # Main form renderer
│   │   ├── Field.tsx            # Field component
│   │   └── Stepper.tsx          # Progress indicator
│   └── onboarding/
│       └── OnboardingFlow.tsx   # Flow orchestrator
├── lib/
│   ├── types/
│   │   ├── form.ts              # Form type definitions
│   │   └── session.ts           # Session types
│   ├── policy/
│   │   ├── rules.ts             # Business rules
│   │   ├── llm.ts               # LLM integration
│   │   └── tools.ts             # Tool definitions
│   ├── store/
│   │   └── session.ts           # Session storage
│   └── telemetry/
│       └── events.ts            # Event tracking
└── config/
    └── constants.ts             # App constants
```

---

## 🔨 Day-by-Day Implementation Plan

### Day 1: Foundation & Types
**Goal:** Type system and basic structure

#### Task 1.1: Core Types (2 hours)

Create `lib/types/form.ts`:
```typescript
// Field types - these are your building blocks
export type TextField = {
  kind: "text";
  id: string;
  label: string;
  placeholder?: string;
  value?: string;
  required?: boolean;
  pattern?: string;
  helperText?: string;
  error?: string;
};

export type RadioField = {
  kind: "radio";
  id: string;
  label: string;
  options: Array<{
    value: string;
    label: string;
    helperText?: string;
  }>;
  value?: string;
  required?: boolean;
  error?: string;
};

export type CheckboxField = {
  kind: "checkbox";
  id: string;
  label: string;
  options: Array<{
    value: string;
    label: string;
  }>;
  values?: string[];
  error?: string;
};

export type SelectField = {
  kind: "select";
  id: string;
  label: string;
  options: Array<{
    value: string;
    label: string;
  }>;
  value?: string;
  required?: boolean;
  error?: string;
};

export type Field = TextField | RadioField | CheckboxField | SelectField;

export type FormStep = {
  stepId: string;
  title: string;
  description?: string;
  fields: Field[];
  primaryCta: {
    label: string;
    action: "submit_step";
  };
  secondaryCta?: {
    label: string;
    action: "back" | "skip";
  };
};

export type StepperItem = {
  id: string;
  label: string;
  active: boolean;
  completed: boolean;
};

export type FormPlan = 
  | { kind: "render_step"; step: FormStep; stepper: StepperItem[] }
  | { kind: "review"; summary: Array<{label: string; value: string}>; stepper: StepperItem[] }
  | { kind: "success"; message: string }
  | { kind: "error"; message: string };
```

Create `lib/types/session.ts`:
```typescript
export type UXEvent = 
  | { type: "page_view"; page: string; timestamp: number }
  | { type: "field_change"; stepId: string; fieldId: string; value: any; timestamp: number }
  | { type: "field_focus"; stepId: string; fieldId: string; timestamp: number }
  | { type: "field_blur"; stepId: string; fieldId: string; timestamp: number }
  | { type: "submit_step"; stepId: string; values: Record<string, any>; timestamp: number }
  | { type: "navigate"; to: "back" | "skip" | "next"; fromStepId: string; timestamp: number }
  | { type: "complete"; timestamp: number }
  | { type: "abandon"; stepId: string; timestamp: number };

export type SessionState = {
  sid: string;
  variant: "adaptive" | "static";
  currentStepId: string;
  completedSteps: string[];
  values: Record<string, any>;
  events: UXEvent[];
  startedAt: number;
  lastActivityAt: number;
};
```

#### Task 1.2: Session Store (1 hour)

Create `lib/store/session.ts`:
```typescript
import { SessionState, UXEvent } from '@/lib/types/session';
import { v4 as uuidv4 } from 'uuid';

// In-memory store for POC (production would use Redis/DB)
const sessions = new Map<string, SessionState>();

export class SessionStore {
  static create(variant: "adaptive" | "static"): SessionState {
    const session: SessionState = {
      sid: uuidv4(),
      variant,
      currentStepId: '',
      completedSteps: [],
      values: {},
      events: [],
      startedAt: Date.now(),
      lastActivityAt: Date.now(),
    };
    sessions.set(session.sid, session);
    return session;
  }

  static get(sid: string): SessionState | null {
    return sessions.get(sid) || null;
  }

  static update(sid: string, updates: Partial<SessionState>): SessionState | null {
    const session = sessions.get(sid);
    if (!session) return null;
    
    const updated = {
      ...session,
      ...updates,
      lastActivityAt: Date.now(),
    };
    sessions.set(sid, updated);
    return updated;
  }

  static addEvent(sid: string, event: UXEvent): void {
    const session = sessions.get(sid);
    if (!session) return;
    
    session.events.push(event);
    session.lastActivityAt = Date.now();
    
    // Keep only last 50 events for memory
    if (session.events.length > 50) {
      session.events = session.events.slice(-50);
    }
  }

  static cleanup(): void {
    const now = Date.now();
    const ONE_HOUR = 60 * 60 * 1000;
    
    for (const [sid, session] of sessions.entries()) {
      if (now - session.lastActivityAt > ONE_HOUR) {
        sessions.delete(sid);
      }
    }
  }
}

// Cleanup old sessions every 10 minutes
if (typeof window === 'undefined') {
  setInterval(() => SessionStore.cleanup(), 10 * 60 * 1000);
}
```

#### Task 1.3: Constants & Config (30 mins)

Create `config/constants.ts`:
```typescript
// Whitelisted values for security
export const FIELD_IDS = {
  FULL_NAME: 'full_name',
  ROLE: 'role',
  PRIMARY_USE: 'primary_use',
  WORKSPACE_NAME: 'workspace_name',
  TEMPLATE: 'template',
  NOTIFICATIONS: 'notifications',
  SAMPLE_DATA: 'sample_data',
  SHARE_METRICS: 'share_anonymous_metrics',
} as const;

export const ROLE_OPTIONS = [
  { value: 'pm', label: 'Product Manager' },
  { value: 'eng', label: 'Engineer' },
  { value: 'design', label: 'Designer' },
  { value: 'other', label: 'Other' },
] as const;

export const USE_CASE_OPTIONS = [
  { value: 'explore', label: 'Just exploring', helperText: 'Try features with sample data' },
  { value: 'prototype', label: 'Building a prototype', helperText: 'Start with templates' },
  { value: 'team', label: 'Team collaboration', helperText: 'Full workspace setup' },
] as const;

export const TEMPLATE_OPTIONS = [
  { value: 'blank', label: 'Blank Canvas' },
  { value: 'kanban', label: 'Kanban Board' },
  { value: 'analytics', label: 'Analytics Dashboard' },
  { value: 'crm', label: 'CRM Starter' },
] as const;

// LLM Config
export const LLM_CONFIG = {
  MODEL: 'gpt-4-turbo-preview',
  TEMPERATURE: 0.3,  // Low for consistency
  MAX_TOKENS: 1000,
  TIMEOUT_MS: 3000,
} as const;
```

---

### Day 2: Business Rules Engine
**Goal:** Implement deterministic rules before adding LLM

#### Task 2.1: Rules Implementation (3 hours)

Create `lib/policy/rules.ts`:
```typescript
import { SessionState } from '@/lib/types/session';
import { FormPlan, FormStep, StepperItem } from '@/lib/types/form';
import { FIELD_IDS, ROLE_OPTIONS, USE_CASE_OPTIONS, TEMPLATE_OPTIONS } from '@/config/constants';

export class RulesEngine {
  // Main decision function
  static getNextStep(state: SessionState): FormPlan | null {
    const { currentStepId, values, completedSteps } = state;

    // Initial state - start with basics
    if (!currentStepId) {
      return this.createBasicsStep(state);
    }

    // After basics - go to workspace
    if (currentStepId === 'basics' && this.hasRequiredBasics(values)) {
      return this.createWorkspaceStep(state);
    }

    // After workspace - preferences or review
    if (currentStepId === 'workspace' && values.workspace_name) {
      // Skip preferences for explorers
      if (values.primary_use === 'explore') {
        return this.createReviewStep(state);
      }
      return this.createPreferencesStep(state);
    }

    // After preferences - review
    if (currentStepId === 'preferences') {
      return this.createReviewStep(state);
    }

    // After review - success
    if (currentStepId === 'review') {
      return this.createSuccessStep(state);
    }

    return null;
  }

  private static hasRequiredBasics(values: Record<string, any>): boolean {
    return !!(values.full_name && values.role && values.primary_use);
  }

  private static createBasicsStep(state: SessionState): FormPlan {
    const stepper = this.buildStepper('basics', state.completedSteps);
    
    return {
      kind: 'render_step',
      stepper,
      step: {
        stepId: 'basics',
        title: 'Welcome! Let\'s get started',
        description: 'Tell us a bit about yourself to personalize your experience',
        fields: [
          {
            kind: 'text',
            id: FIELD_IDS.FULL_NAME,
            label: 'Full name',
            placeholder: 'Jane Smith',
            required: true,
            value: state.values.full_name,
          },
          {
            kind: 'select',
            id: FIELD_IDS.ROLE,
            label: 'What\'s your role?',
            options: ROLE_OPTIONS,
            required: true,
            value: state.values.role,
          },
          {
            kind: 'radio',
            id: FIELD_IDS.PRIMARY_USE,
            label: 'How do you plan to use this?',
            options: USE_CASE_OPTIONS,
            required: true,
            value: state.values.primary_use,
          },
        ],
        primaryCta: { label: 'Continue', action: 'submit_step' },
      },
    };
  }

  private static createWorkspaceStep(state: SessionState): FormPlan {
    const stepper = this.buildStepper('workspace', state.completedSteps);
    const isExplorer = state.values.primary_use === 'explore';
    
    const fields = [
      {
        kind: 'text' as const,
        id: FIELD_IDS.WORKSPACE_NAME,
        label: 'Workspace name',
        placeholder: isExplorer ? 'My Playground' : 'Acme Corp',
        required: true,
        value: state.values.workspace_name,
        helperText: isExplorer ? 'You can change this anytime' : 'This will be your team\'s workspace',
      },
    ];

    // Add template selection for non-explorers
    if (!isExplorer) {
      fields.push({
        kind: 'select' as const,
        id: FIELD_IDS.TEMPLATE,
        label: 'Start with a template',
        options: TEMPLATE_OPTIONS.filter(t => 
          state.values.role === 'pm' ? t.value !== 'analytics' :
          state.values.role === 'eng' ? t.value !== 'crm' :
          true
        ),
        required: false,
        value: state.values.template,
      });
    }

    return {
      kind: 'render_step',
      stepper,
      step: {
        stepId: 'workspace',
        title: isExplorer ? 'Quick Setup' : 'Create Your Workspace',
        fields,
        primaryCta: { label: 'Continue', action: 'submit_step' },
        secondaryCta: { label: 'Back', action: 'back' },
      },
    };
  }

  private static createPreferencesStep(state: SessionState): FormPlan {
    const stepper = this.buildStepper('preferences', state.completedSteps);
    
    return {
      kind: 'render_step',
      stepper,
      step: {
        stepId: 'preferences',
        title: 'Set Your Preferences',
        fields: [
          {
            kind: 'checkbox',
            id: FIELD_IDS.NOTIFICATIONS,
            label: 'How should we keep you updated?',
            options: [
              { value: 'email', label: 'Email notifications' },
              { value: 'inapp', label: 'In-app notifications' },
              { value: 'mobile', label: 'Mobile push (coming soon)' },
            ],
            values: state.values.notifications || ['inapp'],
          },
          {
            kind: 'checkbox',
            id: FIELD_IDS.SAMPLE_DATA,
            label: 'Sample data',
            options: [{ value: 'yes', label: 'Load sample projects to explore' }],
            values: state.values.sample_data || [],
          },
          {
            kind: 'checkbox',
            id: FIELD_IDS.SHARE_METRICS,
            label: 'Help us improve',
            options: [{ value: 'yes', label: 'Share anonymous usage analytics' }],
            values: state.values.share_anonymous_metrics || [],
          },
        ],
        primaryCta: { label: 'Review Setup', action: 'submit_step' },
        secondaryCta: { label: 'Back', action: 'back' },
      },
    };
  }

  private static createReviewStep(state: SessionState): FormPlan {
    const stepper = this.buildStepper('review', state.completedSteps);
    const { values } = state;
    
    const summary = [
      { label: 'Name', value: values.full_name || '-' },
      { label: 'Role', value: ROLE_OPTIONS.find(r => r.value === values.role)?.label || '-' },
      { label: 'Use Case', value: USE_CASE_OPTIONS.find(u => u.value === values.primary_use)?.label || '-' },
      { label: 'Workspace', value: values.workspace_name || '-' },
    ];

    if (values.template) {
      summary.push({
        label: 'Template',
        value: TEMPLATE_OPTIONS.find(t => t.value === values.template)?.label || 'None',
      });
    }

    return {
      kind: 'review',
      stepper,
      summary,
    };
  }

  private static createSuccessStep(state: SessionState): FormPlan {
    return {
      kind: 'success',
      message: `Welcome aboard, ${state.values.full_name}! Your workspace "${state.values.workspace_name}" is ready.`,
    };
  }

  private static buildStepper(currentStep: string, completedSteps: string[]): StepperItem[] {
    const steps = [
      { id: 'basics', label: 'Basics' },
      { id: 'workspace', label: 'Workspace' },
      { id: 'preferences', label: 'Preferences' },
      { id: 'review', label: 'Review' },
    ];

    return steps.map(step => ({
      ...step,
      active: step.id === currentStep,
      completed: completedSteps.includes(step.id),
    }));
  }
}
```

#### Task 2.2: Testing Rules (1 hour)

Create `lib/policy/__tests__/rules.test.ts`:
```typescript
import { RulesEngine } from '../rules';
import { SessionState } from '@/lib/types/session';

describe('RulesEngine', () => {
  const baseState: SessionState = {
    sid: 'test-123',
    variant: 'adaptive',
    currentStepId: '',
    completedSteps: [],
    values: {},
    events: [],
    startedAt: Date.now(),
    lastActivityAt: Date.now(),
  };

  test('starts with basics step', () => {
    const plan = RulesEngine.getNextStep(baseState);
    expect(plan?.kind).toBe('render_step');
    if (plan?.kind === 'render_step') {
      expect(plan.step.stepId).toBe('basics');
    }
  });

  test('skips preferences for explorers', () => {
    const state: SessionState = {
      ...baseState,
      currentStepId: 'workspace',
      completedSteps: ['basics'],
      values: {
        full_name: 'Test User',
        role: 'eng',
        primary_use: 'explore',
        workspace_name: 'Test Workspace',
      },
    };
    
    const plan = RulesEngine.getNextStep(state);
    expect(plan?.kind).toBe('review');
  });
});
```

---

### Day 3: LLM Integration
**Goal:** Add AI decision-making layer

#### Task 3.1: Tool Definitions (2 hours)

Create `lib/policy/tools.ts`:
```typescript
export const ONBOARDING_TOOLS = {
  propose_next_step: {
    name: 'propose_next_step',
    description: 'Determine the next step in the onboarding flow based on user context',
    parameters: {
      type: 'object',
      properties: {
        reasoning: {
          type: 'string',
          description: 'Brief explanation of why this step/configuration was chosen',
        },
        stepConfig: {
          type: 'object',
          properties: {
            stepId: { 
              type: 'string', 
              enum: ['basics', 'workspace', 'preferences', 'review'],
            },
            title: { type: 'string' },
            description: { type: 'string' },
            fields: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  kind: { 
                    type: 'string', 
                    enum: ['text', 'radio', 'checkbox', 'select'],
                  },
                  id: { 
                    type: 'string',
                    enum: ['full_name', 'role', 'primary_use', 'workspace_name', 'template', 'notifications', 'sample_data', 'share_anonymous_metrics'],
                  },
                  label: { type: 'string' },
                  required: { type: 'boolean' },
                  options: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        value: { type: 'string' },
                        label: { type: 'string' },
                      },
                    },
                  },
                },
                required: ['kind', 'id', 'label'],
              },
            },
            skipToReview: {
              type: 'boolean',
              description: 'Whether to skip remaining steps and go to review',
            },
          },
          required: ['stepId', 'title', 'fields'],
        },
      },
      required: ['reasoning', 'stepConfig'],
    },
  },
};
```

#### Task 3.2: LLM Director (3 hours)

Create `lib/policy/llm.ts`:
```typescript
import OpenAI from 'openai';
import { SessionState } from '@/lib/types/session';
import { FormPlan } from '@/lib/types/form';
import { ONBOARDING_TOOLS } from './tools';
import { LLM_CONFIG } from '@/config/constants';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
});

export class LLMDirector {
  static async proposeNextStep(state: SessionState): Promise<FormPlan | null> {
    try {
      const systemPrompt = this.buildSystemPrompt();
      const userPrompt = this.buildUserPrompt(state);

      const completion = await openai.chat.completions.create({
        model: LLM_CONFIG.MODEL,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        tools: [ONBOARDING_TOOLS.propose_next_step],
        tool_choice: { type: 'function', function: { name: 'propose_next_step' } },
        temperature: LLM_CONFIG.TEMPERATURE,
        max_tokens: LLM_CONFIG.MAX_TOKENS,
      });

      const toolCall = completion.choices[0]?.message?.tool_calls?.[0];
      if (!toolCall) return null;

      const args = JSON.parse(toolCall.function.arguments);
      return this.convertToFormPlan(args, state);
    } catch (error) {
      console.error('LLM Director error:', error);
      return null;
    }
  }

  private static buildSystemPrompt(): string {
    return `You are an Onboarding Flow Director AI. Your role is to intelligently orchestrate user onboarding by deciding:
1. Which fields to show/hide
2. Which fields are required vs optional
3. The order of fields
4. Default values based on context
5. When to skip steps entirely

Context-aware rules:
- For "explore" users: Minimize friction, preset defaults, skip complex setup
- For "team" users: Ensure proper workspace configuration, require team-oriented fields
- For engineers: Show technical templates, skip marketing features
- For PMs: Focus on collaboration features, analytics templates
- For designers: Visual templates, simplified technical options

Constraints:
- Use ONLY the whitelisted field IDs provided
- Keep titles under 50 chars, descriptions under 100 chars
- Never generate HTML or markdown
- Maximum 5 fields per step
- Prefer fewer required fields when confidence is high

Recent user behavior patterns:
- Users who hesitate >5s on a field often abandon
- "Explore" users have 73% completion with ≤2 steps
- Pre-filled defaults increase completion by 31%
- Radio buttons outperform dropdowns for ≤4 options`;
  }

  private static buildUserPrompt(state: SessionState): string {
    const recentEvents = state.events.slice(-10);
    const hesitationFields = this.detectHesitation(recentEvents);
    const correctedFields = this.detectCorrections(recentEvents);

    return `Current session state:
- Session ID: ${state.sid}
- Current Step: ${state.currentStepId || 'not started'}
- Completed Steps: ${state.completedSteps.join(', ') || 'none'}
- Values collected: ${JSON.stringify(state.values, null, 2)}

User behavior signals:
- Time on current step: ${this.getTimeOnStep(state)}s
- Fields with hesitation: ${hesitationFields.join(', ') || 'none'}
- Fields corrected: ${correctedFields.join(', ') || 'none'}
- Engagement score: ${this.calculateEngagement(state)}/10

Recent events:
${recentEvents.map(e => `- ${e.type}: ${JSON.stringify(e)}`).join('\n')}

Decide the next optimal step configuration. Consider:
1. Should we skip upcoming steps based on what we know?
2. Which fields are actually needed vs nice-to-have?
3. Can we pre-fill or default any values intelligently?
4. Is the user showing signs of fatigue or confusion?`;
  }

  private static convertToFormPlan(args: any, state: SessionState): FormPlan {
    const { stepConfig, reasoning } = args;
    
    console.log(`[LLM Decision] ${reasoning}`);

    // Map LLM output to our FormPlan structure
    const stepper = this.buildStepper(stepConfig.stepId, state.completedSteps);

    if (stepConfig.skipToReview) {
      return this.createReviewPlan(state, stepper);
    }

    return {
      kind: 'render_step',
      stepper,
      step: {
        stepId: stepConfig.stepId,
        title: stepConfig.title,
        description: stepConfig.description,
        fields: stepConfig.fields.map((f: any) => this.enhanceField(f, state)),
        primaryCta: { label: 'Continue', action: 'submit_step' },
        secondaryCta: stepConfig.stepId !== 'basics' 
          ? { label: 'Back', action: 'back' }
          : undefined,
      },
    };
  }

  private static enhanceField(field: any, state: SessionState): any {
    // Add intelligent defaults based on context
    if (field.id === 'workspace_name' && !field.value) {
      const name = state.values.full_name?.split(' ')[0];
      field.placeholder = name ? `${name}'s Workspace` : 'My Workspace';
    }

    if (field.id === 'template' && state.values.role === 'pm') {
      field.value = 'kanban'; // Default PMs to Kanban
    }

    return field;
  }

  // Helper methods
  private static detectHesitation(events: any[]): string[] {
    const hesitations: string[] = [];
    let lastFocus: any = null;

    for (const event of events) {
      if (event.type === 'field_focus') {
        lastFocus = event;
      } else if (event.type === 'field_blur' && lastFocus) {
        const duration = event.timestamp - lastFocus.timestamp;
        if (duration > 5000) { // >5s is hesitation
          hesitations.push(event.fieldId);
        }
        lastFocus = null;
      }
    }

    return hesitations;
  }

  private static detectCorrections(events: any[]): string[] {
    const changes: Record<string, number> = {};
    
    for (const event of events) {
      if (event.type === 'field_change') {
        changes[event.fieldId] = (changes[event.fieldId] || 0) + 1;
      }
    }

    return Object.entries(changes)
      .filter(([_, count]) => count > 2)
      .map(([fieldId]) => fieldId);
  }

  private static getTimeOnStep(state: SessionState): number {
    const stepEvents = state.events.filter(e => 
      e.type === 'submit_step' && e.stepId === state.currentStepId
    );
    
    if (stepEvents.length === 0) return 0;
    
    const firstEvent = stepEvents[0];
    return Math.floor((Date.now() - firstEvent.timestamp) / 1000);
  }

  private static calculateEngagement(state: SessionState): number {
    // Simple engagement score based on completion and interaction
    const completionScore = state.completedSteps.length * 2.5;
    const hasValues = Object.keys(state.values).length > 0 ? 2 : 0;
    const recentActivity = Date.now() - state.lastActivityAt < 30000 ? 1 : 0;
    
    return Math.min(10, completionScore + hasValues + recentActivity);
  }

  private static buildStepper(currentStep: string, completedSteps: string[]): any[] {
    // Similar to rules engine stepper
    const steps = ['basics', 'workspace', 'preferences', 'review'];
    return steps.map(id => ({
      id,
      label: id.charAt(0).toUpperCase() + id.slice(1),
      active: id === currentStep,
      completed: completedSteps.includes(id),
    }));
  }

  private static createReviewPlan(state: SessionState, stepper: any[]): FormPlan {
    // Generate review summary
    const summary = Object.entries(state.values).map(([key, value]) => ({
      label: key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
      value: String(value),
    }));

    return {
      kind: 'review',
      stepper,
      summary,
    };
  }
}
```

---

### Day 4: API Endpoints & Frontend Components
**Goal:** Connect everything with API routes and UI

#### Task 4.1: API Routes (2 hours)

Create `app/api/plan/route.ts`:
```typescript
import { NextRequest, NextResponse } from 'next/server';
import { SessionStore } from '@/lib/store/session';
import { RulesEngine } from '@/lib/policy/rules';
import { LLMDirector } from '@/lib/policy/llm';
import { z } from 'zod';

// Validation schema
const RequestSchema = z.object({
  sessionId: z.string(),
  currentStep: z.string().optional(),
  values: z.record(z.any()).optional(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { sessionId, currentStep, values } = RequestSchema.parse(body);

    // Get or create session
    let session = SessionStore.get(sessionId);
    if (!session) {
      const variant = request.nextUrl.searchParams.get('variant') as 'adaptive' | 'static' || 'adaptive';
      session = SessionStore.create(variant);
    }

    // Update session with latest state
    if (currentStep !== undefined) {
      session = SessionStore.update(sessionId, { 
        currentStepId: currentStep,
        values: { ...session.values, ...values },
      });
    }

    if (!session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    // Decision cascade
    let plan = null;

    // 1. Try rules engine first (fast path)
    plan = RulesEngine.getNextStep(session);
    if (plan) {
      return NextResponse.json({ plan, source: 'rules' });
    }

    // 2. Try LLM if in adaptive mode
    if (session.variant === 'adaptive') {
      const timeout = new Promise<null>((resolve) => 
        setTimeout(() => resolve(null), 2000)
      );
      
      plan = await Promise.race([
        LLMDirector.proposeNextStep(session),
        timeout,
      ]);

      if (plan) {
        return NextResponse.json({ plan, source: 'llm' });
      }
    }

    // 3. Fallback to basic rules
    plan = RulesEngine.getNextStep({ 
      ...session, 
      values: {}, // Reset values for fallback
    });

    return NextResponse.json({ plan, source: 'fallback' });

  } catch (error) {
    console.error('Plan API error:', error);
    return NextResponse.json(
      { error: 'Failed to generate plan' },
      { status: 500 }
    );
  }
}
```

Create `app/api/events/route.ts`:
```typescript
import { NextRequest, NextResponse } from 'next/server';
import { SessionStore } from '@/lib/store/session';
import { z } from 'zod';

const EventSchema = z.object({
  sessionId: z.string(),
  events: z.array(z.object({
    type: z.string(),
    timestamp: z.number(),
  }).passthrough()),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { sessionId, events } = EventSchema.parse(body);

    const session = SessionStore.get(sessionId);
    if (!session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    // Add events to session
    for (const event of events) {
      SessionStore.addEvent(sessionId, event as any);
    }

    // Analyze patterns for insights
    const insights = analyzeEvents(events);

    return NextResponse.json({ 
      success: true,
      insights,
    });

  } catch (error) {
    console.error('Events API error:', error);
    return NextResponse.json(
      { error: 'Failed to process events' },
      { status: 500 }
    );
  }
}

function analyzeEvents(events: any[]): any {
  // Quick pattern analysis
  const fieldChanges = events.filter(e => e.type === 'field_change');
  const hesitations = events.filter(e => e.type === 'field_blur')
    .filter((e, i, arr) => {
      const prevFocus = arr.find(f => 
        f.type === 'field_focus' && 
        f.fieldId === e.fieldId &&
        f.timestamp < e.timestamp
      );
      return prevFocus && (e.timestamp - prevFocus.timestamp) > 3000;
    });

  return {
    totalEvents: events.length,
    fieldChanges: fieldChanges.length,
    hesitationFields: hesitations.map(h => h.fieldId),
  };
}
```

#### Task 4.2: React Components (3 hours)

Create `components/form/Field.tsx`:
```typescript
import React from 'react';
import { Field as FieldType } from '@/lib/types/form';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface FieldProps {
  field: FieldType;
  onChange: (fieldId: string, value: any) => void;
  onFocus?: (fieldId: string) => void;
  onBlur?: (fieldId: string) => void;
}

export function Field({ field, onChange, onFocus, onBlur }: FieldProps) {
  switch (field.kind) {
    case 'text':
      return (
        <div className="space-y-2">
          <Label htmlFor={field.id}>
            {field.label}
            {field.required && <span className="text-red-500 ml-1">*</span>}
          </Label>
          <Input
            id={field.id}
            name={field.id}
            placeholder={field.placeholder}
            defaultValue={field.value}
            required={field.required}
            pattern={field.pattern}
            onChange={(e) => onChange(field.id, e.target.value)}
            onFocus={() => onFocus?.(field.id)}
            onBlur={() => onBlur?.(field.id)}
            className={field.error ? 'border-red-500' : ''}
          />
          {field.helperText && (
            <p className="text-sm text-muted-foreground">{field.helperText}</p>
          )}
          {field.error && (
            <p className="text-sm text-red-500">{field.error}</p>
          )}
        </div>
      );

    case 'radio':
      return (
        <div className="space-y-2">
          <Label>
            {field.label}
            {field.required && <span className="text-red-500 ml-1">*</span>}
          </Label>
          <RadioGroup
            name={field.id}
            defaultValue={field.value}
            onValueChange={(value) => onChange(field.id, value)}
          >
            {field.options.map((option) => (
              <div key={option.value} className="flex items-start space-x-2 py-2">
                <RadioGroupItem value={option.value} id={`${field.id}-${option.value}`} />
                <div className="grid gap-0.5">
                  <Label
                    htmlFor={`${field.id}-${option.value}`}
                    className="font-normal cursor-pointer"
                  >
                    {option.label}
                  </Label>
                  {option.helperText && (
                    <p className="text-xs text-muted-foreground">
                      {option.helperText}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </RadioGroup>
          {field.error && (
            <p className="text-sm text-red-500">{field.error}</p>
          )}
        </div>
      );

    case 'checkbox':
      return (
        <div className="space-y-2">
          <Label>{field.label}</Label>
          <div className="space-y-2">
            {field.options.map((option) => (
              <div key={option.value} className="flex items-center space-x-2">
                <Checkbox
                  id={`${field.id}-${option.value}`}
                  defaultChecked={field.values?.includes(option.value)}
                  onCheckedChange={(checked) => {
                    const currentValues = field.values || [];
                    const newValues = checked
                      ? [...currentValues, option.value]
                      : currentValues.filter(v => v !== option.value);
                    onChange(field.id, newValues);
                  }}
                />
                <Label
                  htmlFor={`${field.id}-${option.value}`}
                  className="font-normal cursor-pointer"
                >
                  {option.label}
                </Label>
              </div>
            ))}
          </div>
          {field.error && (
            <p className="text-sm text-red-500">{field.error}</p>
          )}
        </div>
      );

    case 'select':
      return (
        <div className="space-y-2">
          <Label htmlFor={field.id}>
            {field.label}
            {field.required && <span className="text-red-500 ml-1">*</span>}
          </Label>
          <Select
            name={field.id}
            defaultValue={field.value}
            onValueChange={(value) => onChange(field.id, value)}
          >
            <SelectTrigger className={field.error ? 'border-red-500' : ''}>
              <SelectValue placeholder="Choose an option" />
            </SelectTrigger>
            <SelectContent>
              {field.options.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {field.error && (
            <p className="text-sm text-red-500">{field.error}</p>
          )}
        </div>
      );

    default:
      return null;
  }
}
```

Create `components/onboarding/OnboardingFlow.tsx`:
```typescript
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { FormPlan } from '@/lib/types/form';
import { UXEvent } from '@/lib/types/session';
import { Field } from '@/components/form/Field';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { CheckCircle2, Loader2 } from 'lucide-react';

interface OnboardingFlowProps {
  variant?: 'adaptive' | 'static';
}

export function OnboardingFlow({ variant = 'adaptive' }: OnboardingFlowProps) {
  const [sessionId, setSessionId] = useState<string>('');
  const [plan, setPlan] = useState<FormPlan | null>(null);
  const [loading, setLoading] = useState(false);
  const [currentValues, setCurrentValues] = useState<Record<string, any>>({});
  const [allValues, setAllValues] = useState<Record<string, any>>({});
  const [eventQueue, setEventQueue] = useState<UXEvent[]>([]);

  // Initialize session
  useEffect(() => {
    const id = `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    setSessionId(id);
    fetchPlan(id, '', {});
    trackEvent({ type: 'page_view', page: 'onboarding', timestamp: Date.now() });
  }, []);

  // Send events in batches
  useEffect(() => {
    if (eventQueue.length === 0) return;

    const timer = setTimeout(() => {
      sendEvents(eventQueue);
      setEventQueue([]);
    }, 1000);

    return () => clearTimeout(timer);
  }, [eventQueue]);

  const fetchPlan = async (sid: string, currentStep: string, values: Record<string, any>) => {
    setLoading(true);
    try {
      const response = await fetch(`/api/plan?variant=${variant}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: sid,
          currentStep,
          values,
        }),
      });

      const data = await response.json();
      setPlan(data.plan);
      console.log(`[Plan Source: ${data.source}]`);
    } catch (error) {
      console.error('Failed to fetch plan:', error);
    } finally {
      setLoading(false);
    }
  };

  const sendEvents = async (events: UXEvent[]) => {
    try {
      await fetch('/api/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          events,
        }),
      });
    } catch (error) {
      console.error('Failed to send events:', error);
    }
  };

  const trackEvent = useCallback((event: UXEvent) => {
    setEventQueue(prev => [...prev, event]);
  }, []);

  const handleFieldChange = useCallback((fieldId: string, value: any) => {
    setCurrentValues(prev => ({ ...prev, [fieldId]: value }));
    trackEvent({
      type: 'field_change',
      stepId: plan?.kind === 'render_step' ? plan.step.stepId : '',
      fieldId,
      value,
      timestamp: Date.now(),
    });
  }, [plan, trackEvent]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!plan || plan.kind !== 'render_step') return;

    const stepId = plan.step.stepId;
    const newAllValues = { ...allValues, ...currentValues };
    setAllValues(newAllValues);

    trackEvent({
      type: 'submit_step',
      stepId,
      values: currentValues,
      timestamp: Date.now(),
    });

    setCurrentValues({});
    fetchPlan(sessionId, stepId, newAllValues);
  };

  const handleBack = () => {
    if (!plan || plan.kind !== 'render_step') return;

    trackEvent({
      type: 'navigate',
      to: 'back',
      fromStepId: plan.step.stepId,
      timestamp: Date.now(),
    });

    // In real app, would navigate to previous step
    fetchPlan(sessionId, '', allValues);
  };

  const renderContent = () => {
    if (!plan) return null;

    switch (plan.kind) {
      case 'render_step':
        return (
          <form onSubmit={handleSubmit} className="space-y-6">
            {plan.step.fields.map((field) => (
              <Field
                key={field.id}
                field={field}
                onChange={handleFieldChange}
                onFocus={(id) => trackEvent({
                  type: 'field_focus',
                  stepId: plan.step.stepId,
                  fieldId: id,
                  timestamp: Date.now(),
                })}
                onBlur={(id) => trackEvent({
                  type: 'field_blur',
                  stepId: plan.step.stepId,
                  fieldId: id,
                  timestamp: Date.now(),
                })}
              />
            ))}
            <CardFooter className="flex justify-between px-0">
              {plan.step.secondaryCta && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleBack}
                >
                  {plan.step.secondaryCta.label}
                </Button>
              )}
              <Button
                type="submit"
                disabled={loading}
                className="ml-auto"
              >
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {plan.step.primaryCta.label}
              </Button>
            </CardFooter>
          </form>
        );

      case 'review':
        return (
          <div className="space-y-4">
            <div className="rounded-lg border p-4 space-y-3">
              {plan.summary.map((item, i) => (
                <div key={i} className="flex justify-between py-2 border-b last:border-0">
                  <span className="text-muted-foreground">{item.label}</span>
                  <span className="font-medium">{item.value}</span>
                </div>
              ))}
            </div>
            <CardFooter className="flex justify-between px-0">
              <Button variant="outline" onClick={handleBack}>
                Edit Details
              </Button>
              <Button onClick={() => {
                trackEvent({ type: 'complete', timestamp: Date.now() });
                fetchPlan(sessionId, 'review', allValues);
              }}>
                Create Workspace
              </Button>
            </CardFooter>
          </div>
        );

      case 'success':
        return (
          <div className="text-center py-8 space-y-4">
            <CheckCircle2 className="h-16 w-16 text-green-500 mx-auto" />
            <h3 className="text-2xl font-bold">All Set!</h3>
            <p className="text-muted-foreground max-w-md mx-auto">
              {plan.message}
            </p>
            <Button size="lg" className="mt-6">
              Go to Dashboard
            </Button>
          </div>
        );

      default:
        return null;
    }
  };

  const getProgress = () => {
    if (!plan || !('stepper' in plan)) return 0;
    const completed = plan.stepper.filter(s => s.completed).length;
    return (completed / plan.stepper.length) * 100;
  };

  return (
    <div className="max-w-2xl mx-auto p-6">
      <div className="mb-8">
        <div className="flex items-center justify-between mb-2">
          <h1 className="text-3xl font-bold">Welcome to GenUI</h1>
          {variant === 'adaptive' && (
            <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">
              AI-Powered
            </span>
          )}
        </div>
        {plan && 'stepper' in plan && (
          <Progress value={getProgress()} className="h-2" />
        )}
      </div>

      <Card>
        <CardHeader>
          {plan?.kind === 'render_step' && (
            <>
              <CardTitle>{plan.step.title}</CardTitle>
              {plan.step.description && (
                <CardDescription>{plan.step.description}</CardDescription>
              )}
            </>
          )}
          {plan?.kind === 'review' && (
            <CardTitle>Review Your Setup</CardTitle>
          )}
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : (
            renderContent()
          )}
        </CardContent>
      </Card>

      {/* Debug Panel (remove in production) */}
      {process.env.NODE_ENV === 'development' && (
        <details className="mt-8 p-4 bg-gray-50 rounded text-xs">
          <summary className="cursor-pointer font-medium">Debug Info</summary>
          <pre className="mt-2 overflow-auto">
            {JSON.stringify({ sessionId, variant, allValues, plan }, null, 2)}
          </pre>
        </details>
      )}
    </div>
  );
}
```

---

### Day 5: Testing & Polish
**Goal:** End-to-end testing, metrics, and documentation

#### Task 5.1: E2E Test Flow (2 hours)

Create `app/onboarding/page.tsx`:
```typescript
import { OnboardingFlow } from '@/components/onboarding/OnboardingFlow';

export default function OnboardingPage({
  searchParams,
}: {
  searchParams: { variant?: 'adaptive' | 'static' };
}) {
  return (
    <main className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <OnboardingFlow variant={searchParams.variant || 'adaptive'} />
    </main>
  );
}
```

#### Task 5.2: Metrics Dashboard (2 hours)

Create `app/metrics/page.tsx`:
```typescript
'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function MetricsPage() {
  const [metrics, setMetrics] = useState<any>(null);

  useEffect(() => {
    // In production, this would fetch from a real metrics API
    const mockMetrics = {
      adaptive: {
        completionRate: 76,
        avgTimeSeconds: 125,
        dropoffStep: 'preferences',
        fieldsPerStep: 3.2,
      },
      static: {
        completionRate: 58,
        avgTimeSeconds: 187,
        dropoffStep: 'workspace',
        fieldsPerStep: 4.5,
      },
    };
    setMetrics(mockMetrics);
  }, []);

  if (!metrics) return <div>Loading...</div>;

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <h1 className="text-3xl font-bold mb-8">Onboarding Metrics</h1>
      
      <div className="grid grid-cols-2 gap-6">
        {Object.entries(metrics).map(([variant, data]: [string, any]) => (
          <Card key={variant}>
            <CardHeader>
              <CardTitle className="capitalize">{variant} Flow</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-sm text-muted-foreground">Completion Rate</p>
                <p className="text-2xl font-bold">{data.completionRate}%</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Avg Time</p>
                <p className="text-2xl font-bold">{data.avgTimeSeconds}s</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Primary Drop-off</p>
                <p className="text-lg capitalize">{data.dropoffStep}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Fields/Step</p>
                <p className="text-lg">{data.fieldsPerStep}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="mt-8">
        <CardHeader>
          <CardTitle>Key Insights</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2">
            <li className="flex items-start">
              <span className="text-green-500 mr-2">✓</span>
              Adaptive flow shows 31% higher completion rate
            </li>
            <li className="flex items-start">
              <span className="text-green-500 mr-2">✓</span>
              33% reduction in time-to-completion with AI orchestration
            </li>
            <li className="flex items-start">
              <span className="text-yellow-500 mr-2">⚠</span>
              Preferences step still shows high abandonment in both variants
            </li>
            <li className="flex items-start">
              <span className="text-blue-500 mr-2">→</span>
              LLM successfully reduced fields by 29% on average
            </li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
```

---

## 📊 Deployment & Testing Guide

### Local Development
```bash
# Start dev server
npm run dev

# Test adaptive flow
open http://localhost:3000/onboarding?variant=adaptive

# Test static flow
open http://localhost:3000/onboarding?variant=static

# View metrics
open http://localhost:3000/metrics
```

### Testing Checklist
- [ ] Complete flow with minimal info (explorer persona)
- [ ] Complete flow with all fields (team persona)
- [ ] Test back navigation at each step
- [ ] Verify field validation works
- [ ] Check LLM timeout fallback (disconnect internet)
- [ ] Verify session persistence across refreshes
- [ ] Test A/B variant switching
- [ ] Monitor console for decision sources (rules/llm/fallback)

### Production Deployment

```bash
# Environment variables for production
OPENAI_API_KEY=sk-...
REDIS_URL=redis://...  # For session persistence
ANALYTICS_KEY=...      # For real metrics

# Build and deploy
npm run build
npm start
```

---

## 🎯 Success Criteria

### Week 1 Metrics
- **Completion Rate:** Adaptive > 70%, Static baseline ~50%
- **Time to Complete:** <2 minutes for adaptive
- **LLM Latency:** p95 < 2 seconds
- **Fallback Rate:** <5% of requests
- **Zero Critical Errors:** No flow-breaking bugs

### Expansion Opportunities
1. **Personalization:** Use company/role data for industry-specific flows
2. **Multi-language:** LLM translates in real-time
3. **Voice Input:** Speech-to-text for accessibility
4. **Predictive Completion:** Pre-fill based on similar users
5. **Dynamic Validation:** Context-aware error messages

---

## 📚 Additional Resources

- [OpenAI Function Calling](https://platform.openai.com/docs/guides/function-calling)
- [Next.js App Router](https://nextjs.org/docs/app)
- [Shadcn/ui Components](https://ui.shadcn.com)
- [Zod Validation](https://zod.dev)

---

**Remember:** This POC proves that LLMs can intelligently orchestrate UI. The goal isn't perfection—it's demonstrating 20-30% improvement in key metrics. Ship fast, measure everything, iterate based on data.

Good luck! You're building the future of adaptive interfaces. 🚀