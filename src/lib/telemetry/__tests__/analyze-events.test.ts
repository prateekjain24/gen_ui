import {
  BehaviorAnalysis,
  analyzeEvents,
  calculateAbandonmentRisk,
  detectBehaviorSignals,
  summarizeTimeOnStep,
} from '@/lib/telemetry/analyze-events';
import type { UXEvent } from '@/lib/types/events';

const baseEvent = (partial: Partial<UXEvent> & { type: UXEvent['type'] }): UXEvent => ({
  timestamp: '2025-01-01T00:00:00.000Z',
  sessionId: 'session-1',
  ...partial,
}) as UXEvent;

const sampleEvents: UXEvent[] = [
  baseEvent({
    type: 'field_blur',
    fieldId: 'workspace_name',
    stepId: 'workspace',
    timeSpentMs: 6000,
    hadValue: true,
  }),
  baseEvent({
    type: 'field_change',
    fieldId: 'workspace_name',
    stepId: 'workspace',
    changeCount: 3,
  }),
  baseEvent({
    type: 'step_back',
    fromStepId: 'workspace',
    toStepId: 'basics',
  }),
  baseEvent({
    type: 'step_back',
    fromStepId: 'basics',
    toStepId: 'workspace',
  }),
  baseEvent({
    type: 'validation_error',
    fieldId: 'email',
    stepId: 'basics',
    errorType: 'required',
    errorMessage: 'Required',
    attemptCount: 1,
  }),
  baseEvent({
    type: 'step_skip',
    stepId: 'preferences',
    reason: 'ai_recommendation',
  }),
  baseEvent({
    type: 'field_blur',
    fieldId: 'role',
    stepId: 'basics',
    timeSpentMs: 1000,
    hadValue: true,
  }),
];

describe('detectBehaviorSignals', () => {
  it('detects hesitation, corrections, and counts', () => {
    const signals = detectBehaviorSignals(sampleEvents);
    expect(signals.hesitantFields).toEqual([
      { fieldId: 'workspace_name', timeSpentMs: 6000 },
    ]);
    expect(signals.correctedFields).toEqual([
      { fieldId: 'workspace_name', changeCount: 3 },
    ]);
    expect(signals.backNavigationCount).toBe(2);
    expect(signals.skipCount).toBe(1);
    expect(signals.validationErrorCount).toBe(1);
  });
});

describe('calculateAbandonmentRisk', () => {
  it('produces risk levels from behavior signals', () => {
    const signals = detectBehaviorSignals(sampleEvents);
    const risk = calculateAbandonmentRisk(signals);

    expect(risk.level).toBe('medium');
    expect(risk.score).toBeGreaterThan(0);
    expect(risk.contributingFactors).toContain('frequent_back_navigation');
  });
});

describe('summarizeTimeOnStep', () => {
  it('aggregates time per step', () => {
    const insights = summarizeTimeOnStep(sampleEvents);
    expect(insights).toEqual([
      {
        stepId: 'workspace',
        totalTimeMs: 6000,
        visits: 1,
        averageTimeMs: 6000,
      },
      {
        stepId: 'basics',
        totalTimeMs: 1000,
        visits: 1,
        averageTimeMs: 1000,
      },
    ]);
  });
});

describe('analyzeEvents', () => {
  it('returns overall insights', () => {
    const insights = analyzeEvents(sampleEvents);
    expect(insights.totalEvents).toBe(sampleEvents.length);
    expect(insights.behaviorSignals.hesitantFields).toHaveLength(1);
    expect(insights.abandonmentRisk.level).toBeDefined();
    expect(insights.recentStepActivity.length).toBeLessThanOrEqual(5);
    expect(insights.timeOnStep).toHaveLength(2);
  });
});

describe('BehaviorAnalysis namespace', () => {
  it('exposes helper functions', () => {
    expect(BehaviorAnalysis.analyzeEvents).toBe(analyzeEvents);
    expect(BehaviorAnalysis.detectBehaviorSignals).toBe(detectBehaviorSignals);
  });
});
