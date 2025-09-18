import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import type { NextRequest } from 'next/server';

import { GET, POST, PUT } from '../route';

import type { SessionState } from '@/lib/types/session';

jest.mock('@/lib/store/session', () => ({
  sessionStore: {
    createSession: jest.fn(),
    getSession: jest.fn(),
    updateSession: jest.fn(),
  },
}));

const { sessionStore } = jest.requireMock('@/lib/store/session') as {
  sessionStore: {
    createSession: jest.Mock;
    getSession: jest.Mock;
    updateSession: jest.Mock;
  };
};

const createSession = (overrides: Partial<SessionState> = {}): SessionState => {
  const now = new Date();
  return {
    id: 'session-id',
    createdAt: now,
    lastActivityAt: now,
    currentStep: 'basics',
    completedSteps: [],
    values: {},
    events: [],
    ...overrides,
  };
};

describe('/api/sessions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST', () => {
    it('creates a new session', async () => {
      const mockSession = createSession();
      sessionStore.createSession.mockReturnValue(mockSession);

      const request = {
        json: async () => ({ values: { name: 'Ada' } }),
      } as unknown as NextRequest;

      const response = await POST(request);
      expect(response.status).toBe(200);
      await expect(response.json()).resolves.toMatchObject({
        sessionId: mockSession.id,
        session: expect.objectContaining({ id: mockSession.id, currentStep: 'basics' }),
      });
      expect(sessionStore.createSession).toHaveBeenCalledWith({ initialValues: { name: 'Ada' } });
    });
  });

  describe('GET', () => {
    it('requires a session id', async () => {
      const request = {
        nextUrl: { searchParams: new URLSearchParams() },
      } as unknown as NextRequest;

      const response = await GET(request);
      expect(response.status).toBe(400);
    });

    it('returns 404 when session missing', async () => {
      sessionStore.getSession.mockReturnValue(null);
      const request = {
        nextUrl: { searchParams: new URLSearchParams([['id', 'missing']]) },
      } as unknown as NextRequest;

      const response = await GET(request);
      expect(response.status).toBe(404);
      expect(sessionStore.getSession).toHaveBeenCalledWith('missing');
    });

    it('returns session when found', async () => {
      const mockSession = createSession();
      sessionStore.getSession.mockReturnValue(mockSession);

      const request = {
        nextUrl: { searchParams: new URLSearchParams([['id', mockSession.id]]) },
      } as unknown as NextRequest;

      const response = await GET(request);
      expect(response.status).toBe(200);
      await expect(response.json()).resolves.toMatchObject({
        session: expect.objectContaining({ id: mockSession.id }),
      });
    });
  });

  describe('PUT', () => {
    it('requires a session id', async () => {
      const request = {
        json: async () => ({}),
      } as unknown as NextRequest;

      const response = await PUT(request);
      expect(response.status).toBe(400);
    });

    it('returns 404 when session not found', async () => {
      sessionStore.updateSession.mockReturnValue(null);

      const request = {
        json: async () => ({ sessionId: 'unknown', values: { name: 'Ada' } }),
      } as unknown as NextRequest;

      const response = await PUT(request);
      expect(response.status).toBe(404);
      expect(sessionStore.updateSession).toHaveBeenCalledWith('unknown', expect.any(Object));
    });

    it('updates session values', async () => {
      const mockSession = createSession({ completedSteps: ['basics'] });
      sessionStore.updateSession.mockReturnValue(mockSession);

      const request = {
        json: async () => ({
          sessionId: 'session-id',
          values: { name: 'Ada' },
          currentStep: 'workspace',
          addCompletedStep: 'workspace',
        }),
      } as unknown as NextRequest;

      const response = await PUT(request);
      expect(response.status).toBe(200);
      await expect(response.json()).resolves.toMatchObject({
        session: expect.objectContaining({ id: mockSession.id }),
      });
      expect(sessionStore.updateSession).toHaveBeenCalledWith(
        'session-id',
        expect.objectContaining({
          values: { name: 'Ada' },
          currentStep: 'workspace',
          addCompletedStep: 'workspace',
        })
      );
    });
  });
});
