import { STEP_IDS } from '@/lib/constants';
import {
  LLMResponseValidationError,
  parseLLMDecision,
  parseLLMDecisionFromText,
} from '@/lib/llm/response-parser';
import type { SessionState } from '@/lib/types/session';

const baseSession = (): SessionState => ({
  id: 'session-1',
  createdAt: new Date('2025-01-01T00:00:00Z'),
  lastActivityAt: new Date('2025-01-01T00:05:00Z'),
  currentStep: STEP_IDS.BASICS,
  completedSteps: [],
  values: {},
  events: [],
});

describe('parseLLMDecision', () => {
  it('converts valid tool output into a FormPlan', () => {
    const payload = {
      metadata: {
        reasoning: 'User hesitated on workspace name, keeping flow lean.',
        confidence: 0.72,
        persona: 'explorer',
        decision: 'progress',
      },
      stepConfig: {
        stepId: STEP_IDS.WORKSPACE,
        title: 'Name your workspace',
        description: 'Keep it short and memorable.',
        fields: [
          {
            kind: 'text',
            id: 'workspace_name',
            label: 'Workspace Name',
            placeholder: 'My workspace',
            defaultValue: 'Acme Workspace',
          },
        ],
        primaryCta: {
          label: 'Continue',
          action: 'submit_step',
        },
        secondaryCta: {
          label: 'Back',
          action: 'back',
        },
      },
    };

    const { plan, metadata } = parseLLMDecision(payload, baseSession());

    expect(metadata.confidence).toBeCloseTo(0.72);
    expect(plan.kind).toBe('render_step');
    if (plan.kind !== 'render_step') {
      throw new Error('Plan was not render_step');
    }
    expect(plan.step.stepId).toBe(STEP_IDS.WORKSPACE);
    expect(plan.step.fields[0]).toMatchObject({
      kind: 'text',
      id: 'workspace_name',
      label: 'Workspace Name',
      value: 'Acme Workspace',
    });
    expect(plan.stepper.some((item) => item.id === STEP_IDS.WORKSPACE)).toBe(true);
  });

  it('produces a review plan when skipToReview is set', () => {
    const payload = {
      metadata: {
        reasoning: 'All required info gathered, ready for review.',
        confidence: 0.81,
      },
      stepConfig: {
        stepId: STEP_IDS.REVIEW,
        title: 'Review your details',
        fields: [
          {
            kind: 'text',
            id: 'full_name',
            label: 'Full Name',
            defaultValue: 'Test User',
          },
        ],
        primaryCta: {
          label: 'Finish',
          action: 'submit_step',
        },
        skipToReview: true,
      },
    };

    const { plan } = parseLLMDecision(payload, baseSession());

    expect(plan.kind).toBe('review');
    if (plan.kind !== 'review') {
      throw new Error('Plan was not review');
    }
    expect(plan.summary[0]).toEqual({ label: 'Full Name', value: 'Test User' });
  });

  it('throws when validation fails', () => {
    const invalidPayload = {
      metadata: {
        reasoning: 'Missing confidence',
      },
      stepConfig: {
        stepId: 'unknown',
      },
    } as unknown;

    expect(() => parseLLMDecision(invalidPayload, baseSession())).toThrow(LLMResponseValidationError);
  });
});

describe('parseLLMDecisionFromText', () => {
  it('parses JSON text and validates it', () => {
    const text = JSON.stringify({
      metadata: {
        reasoning: 'Return to workspace setup',
        confidence: 0.5,
      },
      stepConfig: {
        stepId: STEP_IDS.WORKSPACE,
        title: 'Workspace setup',
        fields: [
          {
            kind: 'text',
            id: 'workspace_name',
            label: 'Workspace Name',
          },
        ],
        primaryCta: {
          label: 'Continue',
          action: 'submit_step',
        },
      },
    });

    const result = parseLLMDecisionFromText(text, baseSession());
    if (result.plan.kind !== 'render_step') {
      throw new Error('Expected render_step plan');
    }
    expect(result.plan.step.stepId).toBe(STEP_IDS.WORKSPACE);
  });

  it('throws a validation error when JSON is malformed', () => {
    expect(() => parseLLMDecisionFromText('not-json', baseSession())).toThrow(LLMResponseValidationError);
  });
});
