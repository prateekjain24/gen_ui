import { afterAll, afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';

import { createSession, fetchPlan, updateSession } from '../onboarding';

const originalFetch = globalThis.fetch;
let fetchMock: jest.MockedFunction<typeof globalThis.fetch>;

describe('lib/api/onboarding', () => {
  beforeEach(() => {
    fetchMock = jest.fn(async () =>
      new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    );
    globalThis.fetch = fetchMock;
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  afterAll(() => {
    globalThis.fetch = originalFetch;
  });

  it('creates a session via POST', async () => {
    const mockResponse = {
      sessionId: 'session-123',
      session: { id: 'session-123', createdAt: new Date().toISOString() },
    };

    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify(mockResponse), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    );

    const result = await createSession();
    expect(result).toEqual(mockResponse);
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/sessions',
      expect.objectContaining({ method: 'POST' })
    );
  });

  it('fetches plan with session id', async () => {
    const mockPlan = { plan: { kind: 'success', message: 'done' }, source: 'rules' };

    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify(mockPlan), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    );

    const result = await fetchPlan('session-123');
    expect(result).toEqual(mockPlan);
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/plan',
      expect.objectContaining({ body: JSON.stringify({ sessionId: 'session-123' }) })
    );
  });

  it('updates session data', async () => {
    const mockSession = { session: { id: 'session-123' } };

    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify(mockSession), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    );

    const result = await updateSession({ sessionId: 'session-123', currentStep: 'basics' });
    expect(result).toEqual(mockSession);
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/sessions',
      expect.objectContaining({ body: JSON.stringify({ sessionId: 'session-123', currentStep: 'basics' }) })
    );
  });

  it('throws on non-ok responses', async () => {
    fetchMock.mockResolvedValueOnce(
      new Response('Bad request', { status: 400, headers: { 'Content-Type': 'text/plain' } })
    );

    await expect(fetchPlan('bad-session')).rejects.toThrow('Bad request');
  });
});
