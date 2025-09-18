import { STEP_IDS } from '@/lib/constants';
import { enhancePlanWithContext } from '@/lib/llm/field-enhancer';
import type { FormPlan } from '@/lib/types/form';
import type { SessionState } from '@/lib/types/session';

const baseSession = (): SessionState => ({
  id: 'session-1',
  createdAt: new Date('2025-01-01T00:00:00Z'),
  lastActivityAt: new Date('2025-01-01T00:05:00Z'),
  currentStep: STEP_IDS.WORKSPACE,
  completedSteps: [STEP_IDS.BASICS],
  values: {
    workspace_name: 'Existing Workspace',
    team_size: '2-5',
  },
  events: [],
});

describe('enhancePlanWithContext', () => {
  it('applies session defaults and persona placeholders', () => {
    const plan: FormPlan = {
      kind: 'render_step',
      step: {
        stepId: STEP_IDS.WORKSPACE,
        title: 'Workspace setup',
        fields: [
          {
            kind: 'text',
            id: 'workspace_name',
            label: 'Workspace Name',
            required: true,
          },
          {
            kind: 'select',
            id: 'team_size',
            label: 'Team Size',
            required: true,
            options: [
              { value: '1', label: 'Just me' },
              { value: '2-5', label: '2-5 people' },
            ],
          },
        ],
        primaryCta: { label: 'Continue', action: 'submit_step' },
      },
      stepper: [],
    };

    const session = baseSession();
    const enhanced = enhancePlanWithContext(plan, session, 'explorer');
    if (enhanced.kind !== 'render_step') {
      throw new Error('Expected render_step plan');
    }

    const workspaceField = enhanced.step.fields[0];
    expect(workspaceField).toMatchObject({
      kind: 'text',
      value: 'Existing Workspace',
      placeholder: expect.any(String),
      required: false,
    });

    const teamSizeField = enhanced.step.fields[1];
    expect(teamSizeField).toMatchObject({
      kind: 'select',
      value: '2-5',
    });
  });

  it('filters options for persona-specific fields', () => {
    const plan: FormPlan = {
      kind: 'render_step',
      step: {
        stepId: STEP_IDS.PREFERENCES,
        title: 'Choose features',
        fields: [
          {
            kind: 'checkbox',
            id: 'features',
            label: 'Enable Features',
            options: [
              { value: 'ai_assist', label: 'AI Assistant' },
              { value: 'analytics', label: 'Advanced Analytics' },
              { value: 'integrations', label: 'Third-party Integrations' },
            ],
            values: ['analytics', 'integrations'],
          },
        ],
        primaryCta: { label: 'Continue', action: 'submit_step' },
      },
      stepper: [],
    };

    const session = baseSession();
    const enhanced = enhancePlanWithContext(plan, session, 'explorer');
    if (enhanced.kind !== 'render_step') {
      throw new Error('Expected render_step plan');
    }

    const featureField = enhanced.step.fields[0];
    expect(featureField.kind).toBe('checkbox');
    if (featureField.kind !== 'checkbox') {
      throw new Error('Expected checkbox field');
    }

    expect(featureField.options.map(option => option.value)).toEqual(['ai_assist', 'integrations']);
    expect(featureField.values).toEqual(['integrations']);
  });
});
