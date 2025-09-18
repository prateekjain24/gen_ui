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

export interface EventInsights {
  totalEvents: number;
  typeCounts: Record<UXEvent['type'], number>;
  fieldsWithHesitation: string[];
  validationErrorCount: number;
  recentStepActivity: Array<{
    stepId: string;
    lastEvent: UXEvent['type'];
    timestamp: string;
  }>;
}

const HESITATION_THRESHOLD_MS = 3_000;
const MAX_RECENT_STEPS = 5;

type StepAwareEvent = UXEvent & { stepId?: string };

const isStepAwareEvent = (event: UXEvent): event is StepAwareEvent => {
  return (
    'stepId' in event ||
    event.type === 'step_back' ||
    event.type === 'flow_complete' ||
    event.type === 'flow_abandon'
  );
};

export function analyzeEvents(events: UXEvent[]): EventInsights {
  const typeCounts = EVENT_TYPES.reduce<Record<UXEvent['type'], number>>((acc, type) => {
    acc[type] = 0;
    return acc;
  }, {} as Record<UXEvent['type'], number>);

  const hesitationFields = new Set<string>();
  const recentSteps = new Map<string, { stepId: string; lastEvent: UXEvent['type']; timestamp: string }>();

  for (const event of events) {
    typeCounts[event.type] += 1;

    if (event.type === 'field_blur') {
      if (typeof event.timeSpentMs === 'number' && event.timeSpentMs >= HESITATION_THRESHOLD_MS) {
        hesitationFields.add(event.fieldId);
      }
    }

    if (isStepAwareEvent(event)) {
      switch (event.type) {
        case 'step_back':
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
          break;
        case 'flow_complete':
          for (const completed of event.completedSteps) {
            recentSteps.set(completed, {
              stepId: completed,
              lastEvent: event.type,
              timestamp: event.timestamp,
            });
          }
          break;
        case 'flow_abandon':
          recentSteps.set(event.lastStepId, {
            stepId: event.lastStepId,
            lastEvent: event.type,
            timestamp: event.timestamp,
          });
          break;
        default: {
          const stepId = (event as StepAwareEvent).stepId;
          if (typeof stepId === 'string') {
            recentSteps.set(stepId, {
              stepId,
              lastEvent: event.type,
              timestamp: event.timestamp,
            });
          }
        }
      }
    }
  }

  const recentStepActivity = Array.from(recentSteps.values())
    .sort((a, b) => (a.timestamp > b.timestamp ? -1 : a.timestamp < b.timestamp ? 1 : 0))
    .slice(0, MAX_RECENT_STEPS);

  return {
    totalEvents: events.length,
    typeCounts,
    fieldsWithHesitation: Array.from(hesitationFields),
    validationErrorCount: typeCounts.validation_error,
    recentStepActivity,
  };
}
