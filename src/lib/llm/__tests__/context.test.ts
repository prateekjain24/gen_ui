import { DEFAULT_STEP_ORDER } from '@/lib/constants';
import {
  buildLLMUserContext,
  detectBehaviorSignals,
  formatLLMUserContext,
  sanitizeSessionValues,
} from '@/lib/llm/context';
import type { UXEvent } from '@/lib/types/events';
import type { SessionState } from '@/lib/types/session';

const baseSession = (): SessionState => ({
  id: 'session-1',
  createdAt: new Date('2025-01-01T00:00:00Z'),
  lastActivityAt: new Date('2025-01-01T00:05:00Z'),
  currentStep: 'workspace',
  completedSteps: ['basics'],
  values: {
    full_name: 'Test User',
    role: 'eng',
    team_size: 3,
  },
  persona: 'explorer',
  events: [],
});

const buildEvent = <T extends UXEvent>(event: T): T => event;

describe('sanitizeSessionValues', () => {
  it('sanitizes dates and truncates long strings', () => {
    const values = {
      createdAt: new Date('2025-01-01T00:00:00Z'),
      description: 'a'.repeat(300),
      list: [new Date('2025-01-02T00:00:00Z'), 'short', { nested: true }],
    };

    const sanitized = sanitizeSessionValues(values);
    expect(sanitized.createdAt).toBe('2025-01-01T00:00:00.000Z');
    expect((sanitized.description as string).length).toBeLessThanOrEqual(180);
    expect(Array.isArray(sanitized.list)).toBe(true);
  });
});

describe('detectBehaviorSignals', () => {
  it('identifies hesitations, corrections, and navigation', () => {
    const events: UXEvent[] = [
      buildEvent({
        type: 'field_blur',
        timestamp: '2025-01-01T00:00:05.000Z',
        sessionId: 'session-1',
        fieldId: 'team_size',
        stepId: 'workspace',
        hadValue: true,
        timeSpentMs: 6000,
      }),
      buildEvent({
        type: 'field_change',
        timestamp: '2025-01-01T00:00:06.000Z',
        sessionId: 'session-1',
        fieldId: 'team_size',
        stepId: 'workspace',
        changeCount: 3,
      }),
      buildEvent({
        type: 'step_back',
        timestamp: '2025-01-01T00:00:07.000Z',
        sessionId: 'session-1',
        fromStepId: 'workspace',
        toStepId: 'basics',
      }),
      buildEvent({
        type: 'validation_error',
        timestamp: '2025-01-01T00:00:08.000Z',
        sessionId: 'session-1',
        fieldId: 'workspace_name',
        stepId: 'workspace',
        errorType: 'required',
        errorMessage: 'Required',
        attemptCount: 1,
      }),
      buildEvent({
        type: 'step_skip',
        timestamp: '2025-01-01T00:00:09.000Z',
        sessionId: 'session-1',
        stepId: 'preferences',
        reason: 'ai_recommendation',
      }),
    ];

    const signals = detectBehaviorSignals(events);
    expect(signals.hesitantFields).toHaveLength(1);
    expect(signals.correctedFields[0]).toEqual({ fieldId: 'team_size', changeCount: 3 });
    expect(signals.backNavigationCount).toBe(1);
    expect(signals.validationErrorCount).toBe(1);
    expect(signals.skipCount).toBe(1);
  });
});

describe('buildLLMUserContext', () => {
  it('builds a context object with engagement score and recent events', () => {
    const session = baseSession();
    session.events = [
      buildEvent({
        type: 'field_change',
        timestamp: '2025-01-01T00:00:02.000Z',
        sessionId: 'session-1',
        fieldId: 'role',
        stepId: 'basics',
        changeCount: 1,
      }),
      buildEvent({
        type: 'field_blur',
        timestamp: '2025-01-01T00:00:03.000Z',
        sessionId: 'session-1',
        fieldId: 'role',
        stepId: 'basics',
        hadValue: true,
        timeSpentMs: 2000,
      }),
      buildEvent({
        type: 'step_submit',
        timestamp: '2025-01-01T00:00:04.000Z',
        sessionId: 'session-1',
        stepId: 'basics',
        isValid: true,
        fieldCount: 3,
        filledFieldCount: 3,
        timeSpentMs: 20_000,
      }),
    ];

    const context = buildLLMUserContext(session);

    expect(context.session.id).toBe('session-1');
    expect(context.session.persona).toBe('explorer');
    expect(context.session.completedSteps).toContain('basics');
    expect(context.behaviorSignals.hesitantFields).toHaveLength(0);
    expect(context.recentEvents).toHaveLength(session.events.length);
    expect(context.engagement.score).toBeGreaterThanOrEqual(0);
    expect(context.engagement.score).toBeLessThanOrEqual(1);
    expect(context.totals.completedStepRatio).toBeCloseTo(1 / (DEFAULT_STEP_ORDER.filter(step => step !== 'success').length));
  });

  it('formats context as JSON string', () => {
    const context = buildLLMUserContext(baseSession());
    const serialized = formatLLMUserContext(context);

    expect(serialized.startsWith('{')).toBe(true);
    expect(serialized).toContain('"session"');
  });
});
