import { describe, expect, it, beforeEach } from '@jest/globals';
import type { NextRequest } from 'next/server';

import { POST } from '../route';

import type { FormPlan } from '@/lib/types/form';
import type { SessionState } from '@/lib/types/session';

jest.mock('@/lib/store/session', () => ({
  sessionStore: {
    getSession: jest.fn(),
  },
}));

jest.mock('@/lib/policy/rules', () => ({
  getNextStepPlan: jest.fn(),
}));

jest.mock('@/lib/policy/llm', () => ({
  generatePlanWithLLM: jest.fn(),
}));

const { sessionStore } = jest.requireMock('@/lib/store/session') as {
  sessionStore: {
    getSession: jest.Mock;
  };
};

const { getNextStepPlan } = jest.requireMock('@/lib/policy/rules') as {
  getNextStepPlan: jest.Mock;
};

const { generatePlanWithLLM } = jest.requireMock('@/lib/policy/llm') as {
  generatePlanWithLLM: jest.Mock;
};

const createMockRequest = (body: unknown): NextRequest => {
  return {
    json: jest.fn().mockResolvedValue(body),
  } as unknown as NextRequest;
};

const createSession = (overrides: Partial<SessionState> = {}): SessionState => {
  const now = new Date();
  return {
    id: 'session-123',
    createdAt: now,
    lastActivityAt: now,
    currentStep: 'basics',
    completedSteps: [],
    values: {},
    events: [],
    ...overrides,
  };
};

describe('POST /api/plan', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    generatePlanWithLLM.mockReset();
  });

  it('returns 400 when sessionId is missing', async () => {
    const req = createMockRequest({});

    const res = await POST(req);
    expect(res.status).toBe(400);
    await expect(res.json()).resolves.toMatchObject({ error: 'Session ID is required' });
    expect(sessionStore.getSession).not.toHaveBeenCalled();
  });

  it('returns 404 when session does not exist', async () => {
    sessionStore.getSession.mockReturnValue(null);
    const req = createMockRequest({ sessionId: 'unknown' });

    const res = await POST(req);
    expect(res.status).toBe(404);
    await expect(res.json()).resolves.toMatchObject({ error: 'Session not found' });
    expect(sessionStore.getSession).toHaveBeenCalledWith('unknown');
  });

  it('returns 500 when rules engine cannot produce a plan', async () => {
    const session = createSession();
    sessionStore.getSession.mockReturnValue(session);
    getNextStepPlan.mockReturnValue(null);

    const req = createMockRequest({ sessionId: 'session-123' });

    const res = await POST(req);
    expect(res.status).toBe(500);
    await expect(res.json()).resolves.toMatchObject({ error: 'Unable to determine next step' });
  });

  it('returns plan payload when successful', async () => {
    const session = createSession();
    sessionStore.getSession.mockReturnValue(session);

    const plan: FormPlan = {
      kind: 'render_step',
      step: {
        stepId: 'basics',
        title: 'Basics',
        fields: [],
        primaryCta: { label: 'Continue', action: 'submit_step' },
      },
      stepper: [],
    };

    getNextStepPlan.mockReturnValue(plan);

    const req = createMockRequest({ sessionId: 'session-123' });

    const res = await POST(req);
    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({
      plan,
      source: 'rules',
    });

    expect(sessionStore.getSession).toHaveBeenCalledWith('session-123');
    expect(getNextStepPlan).toHaveBeenCalledWith(session);
  });

  it('returns LLM plan when strategy is llm and generation succeeds', async () => {
    const session = createSession();
    sessionStore.getSession.mockReturnValue(session);

    const rulesPlan: FormPlan = {
      kind: 'render_step',
      step: {
        stepId: 'basics',
        title: 'Basics',
        fields: [],
        primaryCta: { label: 'Continue', action: 'submit_step' },
      },
      stepper: [],
    };

    const llmPlan: FormPlan = {
      kind: 'render_step',
      step: {
        stepId: 'workspace',
        title: 'Workspace',
        fields: [],
        primaryCta: { label: 'Next', action: 'submit_step' },
      },
      stepper: [],
    };

    getNextStepPlan.mockReturnValue(rulesPlan);
    generatePlanWithLLM.mockResolvedValue(llmPlan);

    const req = createMockRequest({ sessionId: 'session-123', strategy: 'llm' });

    const res = await POST(req);
    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({ plan: llmPlan, source: 'llm' });
  });

  it('falls back to rules when strategy is llm but LLM plan is unavailable', async () => {
    const session = createSession();
    sessionStore.getSession.mockReturnValue(session);

    const rulesPlan: FormPlan = {
      kind: 'render_step',
      step: {
        stepId: 'basics',
        title: 'Basics',
        fields: [],
        primaryCta: { label: 'Continue', action: 'submit_step' },
      },
      stepper: [],
    };

    getNextStepPlan.mockReturnValue(rulesPlan);
    generatePlanWithLLM.mockResolvedValue(null);

    const req = createMockRequest({ sessionId: 'session-123', strategy: 'llm' });

    const res = await POST(req);
    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({ plan: rulesPlan, source: 'fallback' });
  });

  it('trims sessionId before lookup', async () => {
    const session = createSession();
    sessionStore.getSession.mockReturnValue(session);

    const plan: FormPlan = {
      kind: 'success',
      message: 'done',
    };

    getNextStepPlan.mockReturnValue(plan);

    const req = createMockRequest({ sessionId: '  session-123  ' });

    const res = await POST(req);
    expect(res.status).toBe(200);

    expect(sessionStore.getSession).toHaveBeenCalledWith('session-123');
  });

  it('returns 400 when request body is invalid JSON', async () => {
    const req = {
      json: jest.fn().mockRejectedValue(new Error('bad json')),
    } as unknown as NextRequest;

    const res = await POST(req);
    expect(res.status).toBe(400);
    await expect(res.json()).resolves.toMatchObject({ error: 'Session ID is required' });
  });
});
