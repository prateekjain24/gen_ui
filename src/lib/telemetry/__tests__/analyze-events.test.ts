import { describe, expect, it } from '@jest/globals';

import { analyzeEvents } from '../analyze-events';

import type { UXEvent } from '@/lib/types/events';

describe('analyzeEvents', () => {
  it('summarizes type counts and validation errors', () => {
    const events: UXEvent[] = [
      {
        type: 'field_focus',
        fieldId: 'email',
        stepId: 'basics',
        timestamp: '2025-01-01T00:00:00.000Z',
        sessionId: 'session-123',
      },
      {
        type: 'validation_error',
        fieldId: 'email',
        stepId: 'basics',
        errorType: 'format',
        errorMessage: 'Invalid email',
        attemptCount: 1,
        timestamp: '2025-01-01T00:00:01.000Z',
        sessionId: 'session-123',
      },
    ];

    const insights = analyzeEvents(events);

    expect(insights.totalEvents).toBe(2);
    expect(insights.typeCounts.field_focus).toBe(1);
    expect(insights.typeCounts.validation_error).toBe(1);
    expect(insights.validationErrorCount).toBe(1);
  });

  it('identifies hesitation fields from blur events', () => {
    const events: UXEvent[] = [
      {
        type: 'field_blur',
        fieldId: 'company',
        stepId: 'workspace',
        hadValue: true,
        timeSpentMs: 5_000,
        timestamp: '2025-01-01T00:00:00.000Z',
        sessionId: 'session-123',
      },
      {
        type: 'field_blur',
        fieldId: 'role',
        stepId: 'basics',
        hadValue: false,
        timeSpentMs: 2_000,
        timestamp: '2025-01-01T00:00:05.000Z',
        sessionId: 'session-123',
      },
    ];

    const insights = analyzeEvents(events);

    expect(insights.fieldsWithHesitation).toEqual(['company']);
  });

  it('tracks recent step activity across events', () => {
    const events: UXEvent[] = [
      {
        type: 'field_focus',
        fieldId: 'name',
        stepId: 'basics',
        timestamp: '2025-01-01T00:00:00.000Z',
        sessionId: 'session-123',
      },
      {
        type: 'step_submit',
        stepId: 'basics',
        isValid: true,
        fieldCount: 3,
        filledFieldCount: 3,
        timeSpentMs: 10_000,
        timestamp: '2025-01-01T00:00:05.000Z',
        sessionId: 'session-123',
      },
      {
        type: 'step_back',
        fromStepId: 'workspace',
        toStepId: 'basics',
        timestamp: '2025-01-01T00:00:10.000Z',
        sessionId: 'session-123',
      },
    ];

    const insights = analyzeEvents(events);

    const stepIds = insights.recentStepActivity.map(item => item.stepId);
    expect(stepIds).toEqual(expect.arrayContaining(['basics', 'workspace']));
  });
});
