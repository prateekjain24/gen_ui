import type { UXEvent } from '@/lib/types/events';

interface RecordOptions {
  useBeacon?: boolean;
}

const EVENTS_ENDPOINT = '/api/events';

export async function recordEvents(
  sessionId: string,
  events: UXEvent[],
  options: RecordOptions = {}
): Promise<void> {
  if (!events.length) {
    return;
  }

  const payload = JSON.stringify({ sessionId, events });

  if (options.useBeacon && typeof navigator !== 'undefined' && 'sendBeacon' in navigator) {
    const blob = new Blob([payload], { type: 'application/json' });
    const sent = navigator.sendBeacon(EVENTS_ENDPOINT, blob);
    if (sent) {
      return;
    }
  }

  const response = await fetch(EVENTS_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: payload,
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || 'Failed to record events');
  }
}

type EnqueueEvent = Partial<UXEvent> & Pick<UXEvent, 'type'>;

interface TelemetryQueueOptions {
  flushDelayMs?: number;
}

export interface TelemetryQueue {
  enqueue(event: EnqueueEvent): void;
  flush(options?: RecordOptions): Promise<void>;
  dispose(): Promise<void>;
}

export function createTelemetryQueue(
  sessionId: string,
  options: TelemetryQueueOptions = {}
): TelemetryQueue {
  if (typeof window === 'undefined') {
    return {
      enqueue: () => {
        // No-op in SSR environment
      },
      flush: async () => {
        // No-op in SSR environment
      },
      dispose: async () => {
        // No-op in SSR environment
      },
    };
  }

  const flushDelay = options.flushDelayMs ?? 1000;
  let events: UXEvent[] = [];
  let timer: number | null = null;
  let isFlushing = false;

  const scheduleFlush = () => {
    if (timer !== null || isFlushing) {
      return;
    }
    timer = window.setTimeout(() => {
      void flush();
    }, flushDelay);
  };

  const beforeUnload = () => {
    void flush({ useBeacon: true });
  };

  const flush = async (recordOptions: RecordOptions = {}) => {
    if (!events.length || isFlushing) {
      return;
    }

    const batch = events;
    events = [];

    if (timer !== null) {
      window.clearTimeout(timer);
      timer = null;
    }

    isFlushing = true;
    try {
      await recordEvents(sessionId, batch, recordOptions);
    } catch (error) {
      console.error('Telemetry flush failed', error);
      events = batch.concat(events);

      if (!recordOptions.useBeacon) {
        scheduleFlush();
      }
    } finally {
      isFlushing = false;
    }
  };

  const enqueue = (event: EnqueueEvent) => {
    const normalized: UXEvent = {
      ...event,
      timestamp: event.timestamp ?? new Date().toISOString(),
      sessionId,
    } as UXEvent;

    events.push(normalized);
    scheduleFlush();
  };

  window.addEventListener('beforeunload', beforeUnload);

  const dispose = async () => {
    window.removeEventListener('beforeunload', beforeUnload);
    if (timer !== null) {
      window.clearTimeout(timer);
      timer = null;
    }
    await flush();
  };

  return {
    enqueue,
    flush,
    dispose,
  };
}
