import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { SESSION_CONFIG } from '@/lib/constants';
import { sessionStore } from '@/lib/store/session';
import { analyzeEvents } from '@/lib/telemetry/analyze-events';
import type { UXEvent } from '@/lib/types/events';
import { createDebugger, debugError } from '@/lib/utils/debug';

const log = createDebugger('EventsAPI');

const timestampSchema = z
  .union([z.string(), z.number(), z.date()])
  .transform(value => {
    if (value instanceof Date) {
      return value.toISOString();
    }

    if (typeof value === 'number') {
      return new Date(value).toISOString();
    }

    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? new Date().toISOString() : parsed.toISOString();
  });

const baseEventShape = {
  timestamp: timestampSchema,
  sessionId: z.string().optional(),
};

const fieldFocusEventSchema = z.object({
  type: z.literal('field_focus'),
  fieldId: z.string(),
  stepId: z.string(),
  ...baseEventShape,
});

const fieldBlurEventSchema = z.object({
  type: z.literal('field_blur'),
  fieldId: z.string(),
  stepId: z.string(),
  hadValue: z.boolean(),
  timeSpentMs: z.number().optional(),
  ...baseEventShape,
});

const fieldChangeEventSchema = z.object({
  type: z.literal('field_change'),
  fieldId: z.string(),
  stepId: z.string(),
  previousValue: z.unknown().optional(),
  newValue: z.unknown().optional(),
  changeCount: z.number().int().nonnegative(),
  ...baseEventShape,
});

const stepSubmitEventSchema = z.object({
  type: z.literal('step_submit'),
  stepId: z.string(),
  isValid: z.boolean(),
  fieldCount: z.number().int().nonnegative(),
  filledFieldCount: z.number().int().nonnegative(),
  timeSpentMs: z.number().int().nonnegative(),
  ...baseEventShape,
});

const stepBackEventSchema = z.object({
  type: z.literal('step_back'),
  fromStepId: z.string(),
  toStepId: z.string(),
  ...baseEventShape,
});

const stepSkipEventSchema = z.object({
  type: z.literal('step_skip'),
  stepId: z.string(),
  reason: z.enum(['user_action', 'ai_recommendation', 'rule_based']).optional(),
  ...baseEventShape,
});

const validationErrorEventSchema = z.object({
  type: z.literal('validation_error'),
  fieldId: z.string(),
  stepId: z.string(),
  errorType: z.enum(['required', 'format', 'length', 'custom']),
  errorMessage: z.string(),
  attemptCount: z.number().int().nonnegative(),
  ...baseEventShape,
});

const flowCompleteEventSchema = z.object({
  type: z.literal('flow_complete'),
  totalTimeMs: z.number().int().nonnegative(),
  completedSteps: z.array(z.string()),
  skippedSteps: z.array(z.string()),
  decisionSource: z.enum(['rules', 'llm', 'fallback']),
  ...baseEventShape,
});

const flowAbandonEventSchema = z.object({
  type: z.literal('flow_abandon'),
  lastStepId: z.string(),
  completedSteps: z.array(z.string()),
  reason: z.enum(['timeout', 'navigation', 'error', 'unknown']),
  ...baseEventShape,
});

const errorEventSchema = z.object({
  type: z.literal('error'),
  errorCode: z.string(),
  errorMessage: z.string(),
  context: z.record(z.string(), z.unknown()).optional(),
  ...baseEventShape,
});

const canvasPlanRenderedEventSchema = z.object({
  type: z.literal('canvas_plan_rendered'),
  recipeId: z.enum(['R1', 'R2', 'R3', 'R4']),
  persona: z.enum(['explorer', 'team', 'power']),
  componentCount: z.number().int().nonnegative(),
  decisionSource: z.enum(['llm', 'heuristics']),
  intentTags: z.array(z.string()).max(10).default([]),
  confidence: z.number().min(0).max(1),
  ...baseEventShape,
});

const eventSchema = z.discriminatedUnion('type', [
  fieldFocusEventSchema,
  fieldBlurEventSchema,
  fieldChangeEventSchema,
  stepSubmitEventSchema,
  stepBackEventSchema,
  stepSkipEventSchema,
  validationErrorEventSchema,
  flowCompleteEventSchema,
  flowAbandonEventSchema,
  errorEventSchema,
  canvasPlanRenderedEventSchema,
]);

const EventBatchSchema = z.object({
  sessionId: z
    .string()
    .trim()
    .min(1, 'Session ID is required'),
  events: z.array(eventSchema).min(1, 'At least one event is required'),
});

const MAX_BATCH_SIZE = SESSION_CONFIG.MAX_EVENTS_PER_SESSION;

export async function POST(request: NextRequest) {
  try {
    let rawBody: unknown;

    try {
      rawBody = await request.json();
    } catch (jsonError) {
      debugError('Events API body parsing failed', jsonError);
      return NextResponse.json({ error: 'Invalid JSON payload' }, { status: 400 });
    }

    const parsed = EventBatchSchema.safeParse(rawBody);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid event payload', details: parsed.error.format() },
        { status: 400 }
      );
    }

    const sessionId = parsed.data.sessionId.trim();
    const session = sessionStore.getSession(sessionId);

    if (!session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    const normalizedEvents: UXEvent[] = parsed.data.events.map(event => ({
      ...event,
      sessionId,
    }));

    const batch = normalizedEvents.slice(0, MAX_BATCH_SIZE);
    const acceptedCount = sessionStore.addEvents(sessionId, batch);

    log(`Accepted ${acceptedCount} telemetry events for session`, sessionId);

    const insights = analyzeEvents(batch);

    return NextResponse.json({
      acceptedCount,
      receivedAt: new Date().toISOString(),
      insights,
    });
  } catch (error) {
    debugError('Events API failure', error);
    return NextResponse.json(
      { error: 'Failed to process events' },
      { status: 500 }
    );
  }
}
