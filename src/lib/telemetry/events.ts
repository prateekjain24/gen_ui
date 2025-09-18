import type { UXEvent } from '@/lib/types/events';

/**
 * Placeholder telemetry utilities (P1-013, P2-010 roadmap).
 */
export function recordEvents(_events: UXEvent[]): void {
  // TODO: Batch and forward events to /api/events.
}
