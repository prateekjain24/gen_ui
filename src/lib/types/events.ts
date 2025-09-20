import type { PromptSignalSummary } from '@/lib/prompt-intel';
import type { PropertyGuruSignals } from '@/lib/types/property-guru';
import type { PropertyGuruSearchPayload } from '@/lib/utils/property-guru-plan-mapper';
/**
 * UX Event Type Definitions
 *
 * This module defines the event types for tracking user interactions
 * and behavior patterns during the onboarding flow.
 * Uses discriminated unions with a 'type' field for type safety.
 */

/**
 * Base properties shared by all events
 */
interface BaseEvent {
  /** ISO timestamp when the event occurred */
  timestamp: string;

  /** Session ID this event belongs to */
  sessionId: string;
}

/**
 * Event fired when a field receives focus
 * @example
 * ```typescript
 * const event: FieldFocusEvent = {
 *   type: 'field_focus',
 *   timestamp: '2025-01-01T10:00:00.000Z',
 *   sessionId: 'uuid-123',
 *   fieldId: 'email',
 *   stepId: 'basics'
 * };
 * ```
 */
export interface FieldFocusEvent extends BaseEvent {
  type: 'field_focus';
  /** ID of the field that received focus */
  fieldId: string;
  /** ID of the current step */
  stepId: string;
}

/**
 * Event fired when a field loses focus
 * @example
 * ```typescript
 * const event: FieldBlurEvent = {
 *   type: 'field_blur',
 *   timestamp: '2025-01-01T10:00:05.000Z',
 *   sessionId: 'uuid-123',
 *   fieldId: 'email',
 *   stepId: 'basics',
 *   hadValue: true,
 *   timeSpentMs: 5000
 * };
 * ```
 */
export interface FieldBlurEvent extends BaseEvent {
  type: 'field_blur';
  /** ID of the field that lost focus */
  fieldId: string;
  /** ID of the current step */
  stepId: string;
  /** Whether the field had a value when blurred */
  hadValue: boolean;
  /** Time spent on this field in milliseconds */
  timeSpentMs?: number;
}

/**
 * Event fired when a field value changes
 * @example
 * ```typescript
 * const event: FieldChangeEvent = {
 *   type: 'field_change',
 *   timestamp: '2025-01-01T10:00:03.000Z',
 *   sessionId: 'uuid-123',
 *   fieldId: 'role',
 *   stepId: 'basics',
 *   previousValue: undefined,
 *   newValue: 'eng',
 *   changeCount: 1
 * };
 * ```
 */
export interface FieldChangeEvent extends BaseEvent {
  type: 'field_change';
  /** ID of the field that changed */
  fieldId: string;
  /** ID of the current step */
  stepId: string;
  /** Previous value (omitted for security) */
  previousValue?: unknown;
  /** New value (may be omitted for sensitive fields) */
  newValue?: unknown;
  /** Number of times this field has been changed */
  changeCount: number;
}

/**
 * Event fired when a step is submitted
 * @example
 * ```typescript
 * const event: StepSubmitEvent = {
 *   type: 'step_submit',
 *   timestamp: '2025-01-01T10:01:00.000Z',
 *   sessionId: 'uuid-123',
 *   stepId: 'basics',
 *   isValid: true,
 *   fieldCount: 3,
 *   filledFieldCount: 3,
 *   timeSpentMs: 60000
 * };
 * ```
 */
export interface StepSubmitEvent extends BaseEvent {
  type: 'step_submit';
  /** ID of the submitted step */
  stepId: string;
  /** Whether all validations passed */
  isValid: boolean;
  /** Total number of fields in the step */
  fieldCount: number;
  /** Number of fields with values */
  filledFieldCount: number;
  /** Time spent on this step in milliseconds */
  timeSpentMs: number;
}

/**
 * Event fired when user navigates back
 * @example
 * ```typescript
 * const event: StepBackEvent = {
 *   type: 'step_back',
 *   timestamp: '2025-01-01T10:02:00.000Z',
 *   sessionId: 'uuid-123',
 *   fromStepId: 'workspace',
 *   toStepId: 'basics'
 * };
 * ```
 */
export interface StepBackEvent extends BaseEvent {
  type: 'step_back';
  /** Step ID navigating from */
  fromStepId: string;
  /** Step ID navigating to */
  toStepId: string;
}

/**
 * Event fired when user skips a step
 * @example
 * ```typescript
 * const event: StepSkipEvent = {
 *   type: 'step_skip',
 *   timestamp: '2025-01-01T10:01:30.000Z',
 *   sessionId: 'uuid-123',
 *   stepId: 'preferences',
 *   reason: 'user_action'
 * };
 * ```
 */
export interface StepSkipEvent extends BaseEvent {
  type: 'step_skip';
  /** ID of the skipped step */
  stepId: string;
  /** Reason for skipping */
  reason?: 'user_action' | 'ai_recommendation' | 'rule_based';
}

/**
 * Event fired when validation fails
 * @example
 * ```typescript
 * const event: ValidationErrorEvent = {
 *   type: 'validation_error',
 *   timestamp: '2025-01-01T10:00:50.000Z',
 *   sessionId: 'uuid-123',
 *   fieldId: 'email',
 *   stepId: 'basics',
 *   errorType: 'format',
 *   errorMessage: 'Please enter a valid email address',
 *   attemptCount: 1
 * };
 * ```
 */
export interface ValidationErrorEvent extends BaseEvent {
  type: 'validation_error';
  /** ID of the field with validation error */
  fieldId: string;
  /** ID of the current step */
  stepId: string;
  /** Type of validation error */
  errorType: 'required' | 'format' | 'length' | 'custom';
  /** Error message shown to user */
  errorMessage: string;
  /** Number of validation attempts */
  attemptCount: number;
}

/**
 * Event fired when the flow is completed
 * @example
 * ```typescript
 * const event: FlowCompleteEvent = {
 *   type: 'flow_complete',
 *   timestamp: '2025-01-01T10:05:00.000Z',
 *   sessionId: 'uuid-123',
 *   totalTimeMs: 300000,
 *   completedSteps: ['basics', 'workspace', 'preferences'],
 *   skippedSteps: [],
 *   decisionSource: 'rules'
 * };
 * ```
 */

/**
 * Event fired when prompt intelligence extracts signals
 */
export interface PromptSignalsExtractedEvent extends BaseEvent {
  type: 'prompt_signals_extracted';
  signals: PromptSignalSummary[];
}

export interface PropertyGuruPlanPayloadEvent extends BaseEvent {
  type: 'property_guru_plan_payload';
  defaultsApplied: string[];
  payload: PropertyGuruSearchPayload;
  signals: PropertyGuruSignals;
  essentials: string[];
  lifestyleHighlights: string[];
  primaryCta: string;
  secondaryCtas: string[];
}

export interface PropertyGuruFlowEvent extends BaseEvent {
  type: 'property_guru_flow_event';
  stage: 'cta_clicked' | 'flow_complete' | 'saved_search_created';
  ctaLabel?: string;
  experimentId?: string;
  persona?: string;
  payload?: PropertyGuruSearchPayload;
  signals?: PropertyGuruSignals;
  defaultsApplied?: string[];
}

export interface FlowCompleteEvent extends BaseEvent {
  type: 'flow_complete';
  /** Total time to complete in milliseconds */
  totalTimeMs: number;
  /** List of completed step IDs */
  completedSteps: string[];
  /** List of skipped step IDs */
  skippedSteps: string[];
  /** Primary decision source used */
  decisionSource: 'rules' | 'llm' | 'fallback';
}

/**
 * Event fired when the flow is abandoned
 * @example
 * ```typescript
 * const event: FlowAbandonEvent = {
 *   type: 'flow_abandon',
 *   timestamp: '2025-01-01T10:10:00.000Z',
 *   sessionId: 'uuid-123',
 *   lastStepId: 'workspace',
 *   completedSteps: ['basics'],
 *   reason: 'timeout'
 * };
 * ```
 */
export interface FlowAbandonEvent extends BaseEvent {
  type: 'flow_abandon';
  /** Last step the user was on */
  lastStepId: string;
  /** Steps completed before abandonment */
  completedSteps: string[];
  /** Reason for abandonment */
  reason: 'timeout' | 'navigation' | 'error' | 'unknown';
}

/**
 * Event fired when Canvas Chat renders a plan tile
 */
export interface CanvasPlanRenderedEvent extends BaseEvent {
  type: 'canvas_plan_rendered';
  recipeId: 'R1' | 'R2' | 'R3' | 'R4';
  persona: 'explorer' | 'team' | 'power';
  componentCount: number;
  decisionSource: 'llm' | 'heuristics';
  intentTags: string[];
  confidence: number;
}

/**
 * Event fired when an error occurs
 * @example
 * ```typescript
 * const event: ErrorEvent = {
 *   type: 'error',
 *   timestamp: '2025-01-01T10:03:00.000Z',
 *   sessionId: 'uuid-123',
 *   errorCode: 'API_ERROR',
 *   errorMessage: 'Failed to fetch next step',
 *   context: { stepId: 'workspace', apiEndpoint: '/api/plan' }
 * };
 * ```
 */
export interface ErrorEvent extends BaseEvent {
  type: 'error';
  /** Error code for categorization */
  errorCode: string;
  /** Human-readable error message */
  errorMessage: string;
  /** Additional context about the error */
  context?: Record<string, unknown>;
}

/**
 * Union type representing all possible UX events
 * Uses discriminated union pattern with 'type' property
 */
export type UXEvent =
  | FieldFocusEvent
  | FieldBlurEvent
  | FieldChangeEvent
  | StepSubmitEvent
  | StepBackEvent
  | StepSkipEvent
  | ValidationErrorEvent
  | FlowCompleteEvent
  | FlowAbandonEvent
  | PromptSignalsExtractedEvent
  | PropertyGuruPlanPayloadEvent
  | PropertyGuruFlowEvent
  | ErrorEvent
  | CanvasPlanRenderedEvent;

/**
 * Type guard to check if an event is a FieldFocusEvent
 * @param event - The event to check
 * @returns True if the event is a FieldFocusEvent
 */
export const isFieldFocusEvent = (event: UXEvent): event is FieldFocusEvent =>
  event.type === 'field_focus';

/**
 * Type guard to check if an event is a FieldBlurEvent
 * @param event - The event to check
 * @returns True if the event is a FieldBlurEvent
 */
export const isFieldBlurEvent = (event: UXEvent): event is FieldBlurEvent =>
  event.type === 'field_blur';

/**
 * Type guard to check if an event is a FieldChangeEvent
 * @param event - The event to check
 * @returns True if the event is a FieldChangeEvent
 */
export const isFieldChangeEvent = (event: UXEvent): event is FieldChangeEvent =>
  event.type === 'field_change';

/**
 * Type guard to check if an event is a StepSubmitEvent
 * @param event - The event to check
 * @returns True if the event is a StepSubmitEvent
 */
export const isStepSubmitEvent = (event: UXEvent): event is StepSubmitEvent =>
  event.type === 'step_submit';

/**
 * Type guard to check if an event is a StepBackEvent
 * @param event - The event to check
 * @returns True if the event is a StepBackEvent
 */
export const isStepBackEvent = (event: UXEvent): event is StepBackEvent =>
  event.type === 'step_back';

/**
 * Type guard to check if an event is a StepSkipEvent
 * @param event - The event to check
 * @returns True if the event is a StepSkipEvent
 */
export const isStepSkipEvent = (event: UXEvent): event is StepSkipEvent =>
  event.type === 'step_skip';

/**
 * Type guard to check if an event is a ValidationErrorEvent
 * @param event - The event to check
 * @returns True if the event is a ValidationErrorEvent
 */
export const isValidationErrorEvent = (event: UXEvent): event is ValidationErrorEvent =>
  event.type === 'validation_error';

/**
 * Type guard to check if an event is a FlowCompleteEvent
 * @param event - The event to check
 * @returns True if the event is a FlowCompleteEvent
 */
export const isFlowCompleteEvent = (event: UXEvent): event is FlowCompleteEvent =>
  event.type === 'flow_complete';

/**
 * Type guard to check if an event is a FlowAbandonEvent
 * @param event - The event to check
 * @returns True if the event is a FlowAbandonEvent
 */
export const isFlowAbandonEvent = (event: UXEvent): event is FlowAbandonEvent =>
  event.type === 'flow_abandon';

/**
 * Type guard to check if an event is a PromptSignalsExtractedEvent
 * @param event - The event to check
 * @returns True if the event is a PromptSignalsExtractedEvent
 */
export const isPromptSignalsExtractedEvent = (
  event: UXEvent
): event is PromptSignalsExtractedEvent => event.type === 'prompt_signals_extracted';

/**
 * Type guard to check if an event is an ErrorEvent
 * @param event - The event to check
 * @returns True if the event is an ErrorEvent
 */
export const isErrorEvent = (event: UXEvent): event is ErrorEvent =>
  event.type === 'error';

/**
 * Type guard to check if an event is a CanvasPlanRenderedEvent
 * @param event - The event to check
 * @returns True if the event is a CanvasPlanRenderedEvent
 */
export const isCanvasPlanRenderedEvent = (event: UXEvent): event is CanvasPlanRenderedEvent =>
  event.type === 'canvas_plan_rendered';

/**
 * Helper function to create a timestamp for events
 * @returns ISO timestamp string
 */
export const createEventTimestamp = (): string => {
  return new Date().toISOString();
};

/**
 * Helper function to calculate time difference in milliseconds
 * @param startTime - Start timestamp
 * @param endTime - End timestamp (defaults to now)
 * @returns Time difference in milliseconds
 */
export const calculateTimeSpent = (
  startTime: string | Date,
  endTime: string | Date = new Date()
): number => {
  const start = typeof startTime === 'string' ? new Date(startTime) : startTime;
  const end = typeof endTime === 'string' ? new Date(endTime) : endTime;
  return end.getTime() - start.getTime();
};

/**
 * Helper function to filter events by type
 * @param events - Array of events
 * @param type - Event type to filter by
 * @returns Filtered events of the specified type
 */
export function filterEventsByType<T extends UXEvent['type']>(
  events: UXEvent[],
  type: T
): Extract<UXEvent, { type: T }>[] {
  return events.filter((e): e is Extract<UXEvent, { type: T }> => e.type === type);
};

/**
 * Helper function to get the latest event of a specific type
 * @param events - Array of events
 * @param type - Event type to find
 * @returns Latest event of the specified type or undefined
 */
export function getLatestEventOfType<T extends UXEvent['type']>(
  events: UXEvent[],
  type: T
): Extract<UXEvent, { type: T }> | undefined {
  const filtered = filterEventsByType(events, type);
  return filtered[filtered.length - 1];
};

/**
 * Helper function to analyze field interaction patterns
 * @param events - Array of events
 * @param fieldId - Field ID to analyze
 * @returns Analysis of field interactions
 */
export const analyzeFieldInteractions = (events: UXEvent[], fieldId: string) => {
  const focusEvents = filterEventsByType(events, 'field_focus').filter(e => e.fieldId === fieldId);
  const blurEvents = filterEventsByType(events, 'field_blur').filter(e => e.fieldId === fieldId);
  const changeEvents = filterEventsByType(events, 'field_change').filter(e => e.fieldId === fieldId);
  const errorEvents = filterEventsByType(events, 'validation_error').filter(e => e.fieldId === fieldId);

  return {
    focusCount: focusEvents.length,
    changeCount: changeEvents.length,
    errorCount: errorEvents.length,
    totalTimeMs: blurEvents.reduce((sum, e) => sum + (e.timeSpentMs || 0), 0),
    hasValue: blurEvents.some(e => e.hadValue),
  };
};
