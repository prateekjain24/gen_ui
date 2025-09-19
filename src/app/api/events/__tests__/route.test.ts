import { describe, expect, it, beforeEach } from '@jest/globals';
import type { NextRequest } from 'next/server';

import { POST } from '../route';

import { SESSION_CONFIG } from '@/lib/constants';
import type { SessionState } from '@/lib/types/session';

jest.mock('@/lib/store/session', () => ({
  sessionStore: {
    getSession: jest.fn(),
    addEvents: jest.fn(),
  },
}));

jest.mock('@/lib/telemetry/analyze-events', () => ({
  analyzeEvents: jest.fn(),
}));

const { sessionStore } = jest.requireMock('@/lib/store/session') as {
  sessionStore: {
    getSession: jest.Mock;
    addEvents: jest.Mock;
  };
};

const { analyzeEvents } = jest.requireMock('@/lib/telemetry/analyze-events') as {
  analyzeEvents: jest.Mock;
};

const createMockRequest = (body: unknown): NextRequest => {
  return {
    json: jest.fn().mockResolvedValue(body),
  } as unknown as NextRequest;
};

const createSession = (): SessionState => {
  const now = new Date();
  return {
    id: 'session-123',
    createdAt: now,
    lastActivityAt: now,
    currentStep: 'basics',
    completedSteps: [],
    values: {},
    events: [],
  };
};

describe('POST /api/events', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns 400 when JSON parsing fails', async () => {
    const req = {
      json: jest.fn().mockRejectedValue(new Error('bad json')),
    } as unknown as NextRequest;

    const res = await POST(req);
    expect(res.status).toBe(400);
    await expect(res.json()).resolves.toMatchObject({ error: 'Invalid JSON payload' });
  });

  it('returns 400 when validation fails', async () => {
    const req = createMockRequest({ sessionId: '', events: [] });

    const res = await POST(req);
    expect(res.status).toBe(400);
    await expect(res.json()).resolves.toMatchObject({ error: 'Invalid event payload' });
  });

  it('returns 404 when session is missing', async () => {
    sessionStore.getSession.mockReturnValue(null);

    const req = createMockRequest({
      sessionId: 'missing-session',
      events: [
        {
          type: 'field_focus',
          fieldId: 'email',
          stepId: 'basics',
          timestamp: new Date().toISOString(),
        },
      ],
    });

    const res = await POST(req);
    expect(res.status).toBe(404);
    await expect(res.json()).resolves.toMatchObject({ error: 'Session not found' });
  });

  it('stores events and returns insights on success', async () => {
    const session = createSession();
    sessionStore.getSession.mockReturnValue(session);
    sessionStore.addEvents.mockReturnValue(1);
    analyzeEvents.mockReturnValue({ totalEvents: 1 });

    const event = {
      type: 'field_focus' as const,
      fieldId: 'email',
      stepId: 'basics',
      timestamp: new Date().toISOString(),
    };

    const req = createMockRequest({
      sessionId: ' session-123 ',
      events: [event],
    });

    const res = await POST(req);
    expect(res.status).toBe(200);

    expect(sessionStore.getSession).toHaveBeenCalledWith('session-123');
    expect(sessionStore.addEvents).toHaveBeenCalledTimes(1);
    const addedBatch = sessionStore.addEvents.mock.calls[0][1];
    expect(Array.isArray(addedBatch)).toBe(true);
    expect(addedBatch).toHaveLength(1);
    expect(addedBatch[0]).toMatchObject({ sessionId: 'session-123' });
    expect(analyzeEvents).toHaveBeenCalledWith(addedBatch);

    await expect(res.json()).resolves.toMatchObject({
      acceptedCount: 1,
      insights: { totalEvents: 1 },
    });
  });

  it('truncates event batches that exceed the configured maximum', async () => {
    const session = createSession();
    sessionStore.getSession.mockReturnValue(session);
    sessionStore.addEvents.mockImplementation((_sessionId, events) => events.length);
    analyzeEvents.mockReturnValue({ totalEvents: SESSION_CONFIG.MAX_EVENTS_PER_SESSION });

    const oversizedBatch = Array.from({ length: SESSION_CONFIG.MAX_EVENTS_PER_SESSION + 5 }, (_, index) => ({
      type: 'field_focus' as const,
      fieldId: `field-${index}`,
      stepId: 'basics',
      timestamp: new Date().toISOString(),
    }));

    const req = createMockRequest({
      sessionId: 'session-123',
      events: oversizedBatch,
    });

    const res = await POST(req);
    expect(res.status).toBe(200);

    const addedBatch = sessionStore.addEvents.mock.calls[0][1];
    expect(addedBatch).toHaveLength(SESSION_CONFIG.MAX_EVENTS_PER_SESSION);
    expect(analyzeEvents).toHaveBeenCalledWith(addedBatch);
  });

  it('accepts canvas plan rendered events', async () => {
    const session = createSession();
    sessionStore.getSession.mockReturnValue(session);
    sessionStore.addEvents.mockReturnValue(1);
    analyzeEvents.mockReturnValue({ totalEvents: 1 });

    const canvasEvent = {
      type: 'canvas_plan_rendered' as const,
      recipeId: 'R3',
      persona: 'team',
      componentCount: 5,
      decisionSource: 'llm' as const,
      intentTags: ['client'],
      confidence: 0.8,
      timestamp: new Date().toISOString(),
    };

    const req = createMockRequest({
      sessionId: session.id,
      events: [canvasEvent],
    });

    const res = await POST(req);
    expect(res.status).toBe(200);
    const addedBatch = sessionStore.addEvents.mock.calls[0][1];
    expect(addedBatch[0]).toMatchObject({ type: 'canvas_plan_rendered', recipeId: 'R3' });
  });
});
