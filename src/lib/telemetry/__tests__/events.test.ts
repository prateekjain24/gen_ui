import { beforeEach, describe, expect, it, jest } from '@jest/globals';

import { createTelemetryQueue } from '../events';

const originalWindow = globalThis.window as (Window & typeof globalThis) | undefined;

const createFetchResponse = (): Response =>
  new Response(JSON.stringify({ success: true }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });

describe('createTelemetryQueue', () => {
  type FetchType = typeof globalThis.fetch;
  let fetchMock: jest.MockedFunction<FetchType>;
  const originalFetch = globalThis.fetch;
  const originalSendBeacon = navigator.sendBeacon;

  beforeEach(() => {
    if (typeof window === 'undefined' || !window) {
      (globalThis as any).window = {
        setTimeout: globalThis.setTimeout.bind(globalThis),
        clearTimeout: globalThis.clearTimeout.bind(globalThis),
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
      } as unknown as Window & typeof globalThis;
    }

    jest.useFakeTimers();
    fetchMock = jest.fn(async (..._args: Parameters<FetchType>) => createFetchResponse()) as jest.MockedFunction<FetchType>;
    (globalThis as { fetch: FetchType }).fetch = fetchMock as unknown as FetchType;
    Object.defineProperty(globalThis.navigator, 'sendBeacon', {
      configurable: true,
      writable: true,
      value: jest.fn().mockReturnValue(true),
    });
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
    (globalThis as any).fetch = originalFetch;
    Object.defineProperty(globalThis.navigator, 'sendBeacon', {
      configurable: true,
      writable: true,
      value: originalSendBeacon,
    });

    if (originalWindow) {
      (globalThis as any).window = originalWindow;
    } else {
      delete (globalThis as any).window;
    }
  });

  const flushMicrotasks = async () => {
    await Promise.resolve();
    await Promise.resolve();
  };

  it('flushes queued events after the delay', async () => {
    const queue = createTelemetryQueue('session-queue', { flushDelayMs: 500 });

    queue.enqueue({
      type: 'field_focus',
      fieldId: 'name',
      stepId: 'basics',
    });

    expect(fetchMock).not.toHaveBeenCalled();

    jest.advanceTimersByTime(500);
    await flushMicrotasks();
    await queue.flush();

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const requestInit = fetchMock.mock.calls[0]?.[1] as RequestInit | undefined;
    expect(requestInit?.body).toContain('session-queue');

    await queue.dispose();
  });

  it('uses sendBeacon when requested', async () => {
    const queue = createTelemetryQueue('session-beacon', { flushDelayMs: 500 });
    const sendBeaconMock = navigator.sendBeacon as jest.Mock;

    queue.enqueue({
      type: 'field_blur',
      fieldId: 'role',
      stepId: 'basics',
      hadValue: false,
    });

    await queue.flush({ useBeacon: true });

    expect(sendBeaconMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).not.toHaveBeenCalled();

    await queue.dispose();
  });
});
