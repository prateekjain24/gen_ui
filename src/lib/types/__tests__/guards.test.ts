import { describe, expect, it } from '@jest/globals';

import type { FormPlan } from '@/lib/types/form';
import {
  isCheckboxField,
  isRadioField,
  isRenderStepPlan,
  isReviewPlan,
  isSelectField,
  isSuccessPlan,
  isTextField,
} from '@/lib/types/form';
import { isSessionState, isUserPersona } from '@/lib/types/session';

const createPlan = (plan: FormPlan): FormPlan => plan;

describe('type guards – form', () => {
  const sampleField = {
    kind: 'text' as const,
    id: 'full_name',
    label: 'Full name',
    value: 'Ada Lovelace',
  };

  it('identifies text/select/radio/checkbox fields', () => {
    expect(isTextField(sampleField)).toBe(true);
    expect(isSelectField({ ...sampleField, kind: 'select', options: [] })).toBe(true);
    expect(isRadioField({ ...sampleField, kind: 'radio', options: [] })).toBe(true);
    expect(isCheckboxField({ ...sampleField, kind: 'checkbox', options: [] })).toBe(true);
  });

  it('narrow form plans correctly', () => {
    const renderPlan = createPlan({
      kind: 'render_step',
      step: {
        stepId: 'basics',
        title: 'Basics',
        fields: [sampleField],
        primaryCta: { label: 'Continue', action: 'submit_step' },
      },
      stepper: [],
    });

    expect(isRenderStepPlan(renderPlan)).toBe(true);
    expect(isReviewPlan(renderPlan)).toBe(false);

    const reviewPlan = createPlan({
      kind: 'review',
      summary: [{ label: 'Name', value: 'Ada' }],
      stepper: [],
    });

    expect(isReviewPlan(reviewPlan)).toBe(true);
    expect(isSuccessPlan(reviewPlan)).toBe(false);

    const successPlan = createPlan({ kind: 'success', message: 'Done' });
    expect(isSuccessPlan(successPlan)).toBe(true);

    const errorPlan = createPlan({ kind: 'error', message: 'Oops' });
    expect(isSuccessPlan(errorPlan)).toBe(false);
  });
});

describe('type guards – session', () => {
  it('validates user persona', () => {
    expect(isUserPersona('explorer')).toBe(true);
    expect(isUserPersona('team')).toBe(true);
    expect(isUserPersona('unknown')).toBe(false);
  });

  it('validates session state shape', () => {
    const session = {
      id: 'session-123',
      createdAt: new Date(),
      lastActivityAt: new Date(),
      currentStep: 'basics',
      completedSteps: [],
      values: {},
      events: [],
    };

    expect(isSessionState(session)).toBe(true);
    expect(isSessionState({ ...session, createdAt: 'not-a-date' })).toBe(false);
  });
});
