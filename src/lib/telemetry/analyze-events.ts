import type { SessionState } from '@/lib/types/session';
import type { UXEvent } from '@/lib/types/events';

export const EVENT_TYPES = [
  'field_focus',
  'field_blur',
  'field_change',
  'step_submit',
  'step_back',
  'step_skip',
  'validation_error',
  'flow_complete',
  'flow_abandon',
  'error',
] as const satisfies readonly UXEvent['type'][];

const HESITATION_THRESHOLD_MS = 3_000;
const CORRECTION_THRESHOLD = 2;
const ABANDONMENT_BACK_THRESHOLD = 2;
const ABANDONMENT_IDLE_MINUTES = 5;
const MAX_RECENT_STEPS = 5;

type StepAwareEvent = UXEvent & { stepId?: string };

const isStepAwareEvent = (event: UXEvent): event is StepAwareEvent =>
  'stepId' in event ||
  event.type === 'step_back' ||
  event.type === 'flow_complete' ||
  event.type === 'flow_abandon';

export interface HesitationSignal {
  fieldId: string;
  timeSpentMs: number;
}

export interface CorrectionSignal {
  fieldId: string;
  changeCount: number;
}

export interface BehaviorSignals {
  hesitantFields: HesitationSignal[];
  correctedFields: CorrectionSignal[];
  backNavigationCount: number;
  validationErrorCount: number;
  skipCount: number;
  idleDurationMs: number;
}

export interface AbandonmentRisk {
  score: number;
  level: 'low' | 'medium' | 'high';
  contributingFactors: string[];
}

export interface TimeOnStepInsight {
  stepId: string;
  totalTimeMs: number;
  visits: number;
  averageTimeMs: number;
}

export interface EventInsights {
  totalEvents: number;
  typeCounts: Record<UXEvent['type'], number>;
  behaviorSignals: BehaviorSignals;
  abandonmentRisk: AbandonmentRisk;
  recentStepActivity: Array<{
    stepId: string;
    lastEvent: UXEvent['type'];
    timestamp: string;
  }>;
  timeOnStep: TimeOnStepInsight[];
}

function collectTypeCounts(events: UXEvent[]): Record<UXEvent['type'], number> {
  return EVENT_TYPES.reduce<Record<UXEvent['type'], number>>((acc, type) => {
    acc[type] = events.filter(event => event.type === type).length;
    return acc;
  }, {} as Record<UXEvent['type'], number>);
}

function collectHesitations(events: UXEvent[]): HesitationSignal[] {
  return events
    .filter(event => event.type === 'field_blur' && typeof event.timeSpentMs === 'number')
    .filter(event => event.timeSpentMs! >= HESITATION_THRESHOLD_MS)
    .map(event => ({ fieldId: event.fieldId, timeSpentMs: event.timeSpentMs! }));
}

function collectCorrections(events: UXEvent[]): CorrectionSignal[] {
  const totals = new Map<string, number>();

  for (const event of events) {
    if (event.type !== 'field_change' || typeof event.changeCount !== 'number') continue;
    if (event.changeCount < CORRECTION_THRESHOLD) continue;
    const current = totals.get(event.fieldId) ?? 0;
    totals.set(event.fieldId, Math.max(current, event.changeCount));
  }

  return Array.from(totals.entries()).map(([fieldId, changeCount]) => ({ fieldId, changeCount }));
}

function calculateIdleDuration(events: UXEvent[]): number {
  if (!events.length) {
    return 0;
  }
  const timestamps = events
    .map(event => new Date(event.timestamp).getTime())
    .filter(time => !Number.isNaN(time))
    .sort((a, b) => a - b);

  if (!timestamps.length) {
    return 0;
  }

  const last = timestamps[timestamps.length - 1];
  return Date.now() - last;
}

export function detectBehaviorSignals(events: UXEvent[]): BehaviorSignals {
  return {
    hesitantFields: collectHesitations(events),
    correctedFields: collectCorrections(events),
    backNavigationCount: events.filter(event => event.type === 'step_back').length,
    validationErrorCount: events.filter(event => event.type === 'validation_error').length,
    skipCount: events.filter(event => event.type === 'step_skip').length,
    idleDurationMs: calculateIdleDuration(events),
  };
}

export function calculateAbandonmentRisk(signals: BehaviorSignals): AbandonmentRisk {
  const factors: string[] = [];
  let score = 0;

  if (signals.backNavigationCount >= ABANDONMENT_BACK_THRESHOLD) {
    score += 0.3;
    factors.push('frequent_back_navigation');
  }

  if (signals.validationErrorCount >= 2) {
    score += 0.25;
    factors.push('repeated_validation_errors');
  }

  if (signals.skipCount >= 2) {
    score += 0.2;
    factors.push('multiple_skips');
  }

  if (signals.idleDurationMs >= ABANDONMENT_IDLE_MINUTES * 60_000) {
    score += 0.3;
    factors.push('prolonged_idle');
  }

  if (signals.hesitantFields.length >= 2) {
    score += 0.15;
    factors.push('multi_field_hesitation');
  }

  score = Math.min(1, Number(score.toFixed(2)));
  const level = score >= 0.7 ? 'high' : score >= 0.4 ? 'medium' : 'low';

  return {
    score,
    level,
    contributingFactors: factors,
  };
}

function summarizeRecentSteps(events: UXEvent[]): Array<{ stepId: string; lastEvent: UXEvent['type']; timestamp: string }> {
  const recentSteps = new Map<string, { stepId: string; lastEvent: UXEvent['type']; timestamp: string }>();

  for (const event of events) {
    if (!isStepAwareEvent(event)) continue;

    if (event.type === 'step_back') {
      recentSteps.set(event.fromStepId, {
        stepId: event.fromStepId,
        lastEvent: event.type,
        timestamp: event.timestamp,
      });
      recentSteps.set(event.toStepId, {
        stepId: event.toStepId,
        lastEvent: event.type,
        timestamp: event.timestamp,
      });
      continue;
    }

    if (event.type === 'flow_complete') {
      for (const completed of event.completedSteps) {
        recentSteps.set(completed, {
          stepId: completed,
          lastEvent: event.type,
          timestamp: event.timestamp,
        });
      }
      continue;
    }

    if (event.type === 'flow_abandon') {
      recentSteps.set(event.lastStepId, {
        stepId: event.lastStepId,
        lastEvent: event.type,
        timestamp: event.timestamp,
      });
      continue;
    }

    if (typeof event.stepId === 'string') {
      recentSteps.set(event.stepId, {
        stepId: event.stepId,
        lastEvent: event.type,
        timestamp: event.timestamp,
      });
    }
  }

  return Array.from(recentSteps.values())
    .sort((a, b) => (a.timestamp > b.timestamp ? -1 : a.timestamp < b.timestamp ? 1 : 0))
    .slice(0, MAX_RECENT_STEPS);
}

export function summarizeTimeOnStep(events: UXEvent[]): TimeOnStepInsight[] {
  const durationByStep = new Map<string, { total: number; visits: number }>();

  for (const event of events) {
    if (event.type !== 'field_blur' || typeof event.stepId !== 'string') continue;
    if (typeof event.timeSpentMs !== 'number') continue;

    const record = durationByStep.get(event.stepId) ?? { total: 0, visits: 0 };
    record.total += event.timeSpentMs;
    record.visits += 1;
    durationByStep.set(event.stepId, record);
  }

  return Array.from(durationByStep.entries()).map(([stepId, { total, visits }]) => ({
    stepId,
    totalTimeMs: total,
    visits,
    averageTimeMs: Math.round(total / Math.max(visits, 1)),
  }));
}

export function analyzeEvents(events: UXEvent[]): EventInsights {
  const typeCounts = collectTypeCounts(events);
  const behaviorSignals = detectBehaviorSignals(events);
  const abandonmentRisk = calculateAbandonmentRisk(behaviorSignals);
  const recentStepActivity = summarizeRecentSteps(events);
  const timeOnStep = summarizeTimeOnStep(events);

  return {
    totalEvents: events.length,
    typeCounts,
    behaviorSignals,
    abandonmentRisk,
    recentStepActivity,
    timeOnStep,
  };
}

export const BehaviorAnalysis = {
  analyzeEvents,
  detectBehaviorSignals,
  calculateAbandonmentRisk,
  summarizeTimeOnStep,
};
