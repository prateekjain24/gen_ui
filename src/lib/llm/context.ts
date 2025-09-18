import { DEFAULT_STEP_ORDER } from '@/lib/constants';
import type { UXEvent } from '@/lib/types/events';
import type { SessionState } from '@/lib/types/session';

const MAX_VALUES = 20;
const MAX_RECENT_EVENTS = 12;
const HESITATION_THRESHOLD_MS = 5_000;

interface HesitationSignal {
  fieldId: string;
  timeSpentMs: number;
}

interface CorrectionSignal {
  fieldId: string;
  changeCount: number;
}

export interface BehaviorSignals {
  hesitantFields: HesitationSignal[];
  correctedFields: CorrectionSignal[];
  backNavigationCount: number;
  validationErrorCount: number;
  skipCount: number;
}

export interface EngagementSummary {
  score: number;
  level: 'low' | 'medium' | 'high';
  breakdown: Record<string, number>;
}

export interface RecentEventSummary {
  type: UXEvent['type'];
  timestamp: string;
  fieldId?: string;
  stepId?: string;
  changeCount?: number;
  timeSpentMs?: number;
}

export interface LLMUserContext {
  session: {
    id: string;
    persona: SessionState['persona'] | 'unknown';
    currentStep: string;
    completedSteps: string[];
    values: Record<string, unknown>;
    metadata?: SessionState['metadata'];
  };
  behaviorSignals: BehaviorSignals;
  engagement: EngagementSummary;
  recentEvents: RecentEventSummary[];
  totals: {
    eventCount: number;
    completedStepRatio: number;
  };
}

export function sanitizeSessionValues(values: SessionState['values']): Record<string, unknown> {
  const entries = Object.entries(values ?? {}).slice(0, MAX_VALUES);

  return entries.reduce<Record<string, unknown>>((acc, [key, value]) => {
    if (value instanceof Date) {
      acc[key] = value.toISOString();
      return acc;
    }

    if (Array.isArray(value)) {
      acc[key] = value.slice(0, 10).map(item => {
        if (item instanceof Date) {
          return item.toISOString();
        }
        if (typeof item === 'string') {
          return item.length > 180 ? `${item.slice(0, 177)}...` : item;
        }
        if (typeof item === 'number' || typeof item === 'boolean') {
          return item;
        }
        return String(item);
      });
      return acc;
    }

    if (typeof value === 'object' && value !== null) {
      acc[key] = JSON.parse(JSON.stringify(value));
      return acc;
    }

    if (typeof value === 'string') {
      acc[key] = value.length > 180 ? `${value.slice(0, 177)}...` : value;
      return acc;
    }

    if (typeof value === 'number' || typeof value === 'boolean') {
      acc[key] = value;
      return acc;
    }

    acc[key] = String(value);
    return acc;
  }, {});
}

function detectHesitations(events: UXEvent[]): HesitationSignal[] {
  const signals: HesitationSignal[] = [];
  for (const event of events) {
    if (event.type === 'field_blur' && typeof event.timeSpentMs === 'number') {
      if (event.timeSpentMs >= HESITATION_THRESHOLD_MS) {
        signals.push({ fieldId: event.fieldId, timeSpentMs: event.timeSpentMs });
      }
    }
  }
  return signals;
}

function detectCorrections(events: UXEvent[]): CorrectionSignal[] {
  const corrections = new Map<string, number>();
  for (const event of events) {
    if (event.type === 'field_change' && typeof event.changeCount === 'number' && event.changeCount >= 2) {
      const current = corrections.get(event.fieldId) ?? 0;
      corrections.set(event.fieldId, Math.max(current, event.changeCount));
    }
  }

  return Array.from(corrections.entries()).map(([fieldId, changeCount]) => ({ fieldId, changeCount }));
}

function summarizeRecentEvents(events: UXEvent[]): RecentEventSummary[] {
  return events
    .slice(-MAX_RECENT_EVENTS)
    .map(event => {
      const summary: RecentEventSummary = {
        type: event.type,
        timestamp: event.timestamp,
      };

      if ('fieldId' in event && typeof event.fieldId === 'string') {
        summary.fieldId = event.fieldId;
      }

      if ('stepId' in event && typeof (event as { stepId?: string }).stepId === 'string') {
        summary.stepId = (event as { stepId: string }).stepId;
      }

      if (event.type === 'field_change' && typeof event.changeCount === 'number') {
        summary.changeCount = event.changeCount;
      }

      if (event.type === 'field_blur' && typeof event.timeSpentMs === 'number') {
        summary.timeSpentMs = event.timeSpentMs;
      }

      if (event.type === 'step_back') {
        summary.stepId = event.fromStepId;
      }

      return summary;
    });
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function calculateEngagement(
  session: SessionState,
  signals: BehaviorSignals
): EngagementSummary {
  const totalSteps = DEFAULT_STEP_ORDER.filter(step => step !== 'success').length;
  const completedRatio = clamp(session.completedSteps.length / totalSteps, 0, 1);

  const breakdown: Record<string, number> = {
    progress: completedRatio * 0.4,
    submissions: session.events.filter(event => event.type === 'step_submit').length ? 0.1 : 0,
    hesitations: signals.hesitantFields.length * -0.08,
    corrections: signals.correctedFields.length * -0.05,
    backNavigation: signals.backNavigationCount * -0.04,
    skips: signals.skipCount * -0.03,
    validation: signals.validationErrorCount ? -0.05 : 0,
  };

  const rawScore = 0.5 + Object.values(breakdown).reduce((sum, value) => sum + value, 0);
  const score = clamp(Number(rawScore.toFixed(3)), 0, 1);
  const level = score < 0.33 ? 'low' : score < 0.66 ? 'medium' : 'high';

  return { score, level, breakdown };
}

export function detectBehaviorSignals(events: UXEvent[]): BehaviorSignals {
  const hesitantFields = detectHesitations(events);
  const correctedFields = detectCorrections(events);
  const backNavigationCount = events.filter(event => event.type === 'step_back').length;
  const validationErrorCount = events.filter(event => event.type === 'validation_error').length;
  const skipCount = events.filter(event => event.type === 'step_skip').length;

  return {
    hesitantFields,
    correctedFields,
    backNavigationCount,
    validationErrorCount,
    skipCount,
  };
}

export function buildLLMUserContext(session: SessionState): LLMUserContext {
  const sanitizedValues = sanitizeSessionValues(session.values ?? {});
  const behaviorSignals = detectBehaviorSignals(session.events ?? []);
  const engagement = calculateEngagement(session, behaviorSignals);
  const recentEvents = summarizeRecentEvents(session.events ?? []);
  const totalSteps = DEFAULT_STEP_ORDER.filter(step => step !== 'success').length;
  const completedStepRatio = clamp(session.completedSteps.length / totalSteps, 0, 1);

  return {
    session: {
      id: session.id,
      persona: session.persona ?? 'unknown',
      currentStep: session.currentStep,
      completedSteps: [...session.completedSteps],
      values: sanitizedValues,
      metadata: session.metadata,
    },
    behaviorSignals,
    engagement,
    recentEvents,
    totals: {
      eventCount: session.events.length,
      completedStepRatio,
    },
  };
}

export function formatLLMUserContext(context: LLMUserContext): string {
  return JSON.stringify(context, null, 2);
}
