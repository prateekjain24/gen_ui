import type { PlanEditTelemetryPayload } from "@/lib/telemetry/plan-edits";

export interface LabelCandidate extends PlanEditTelemetryPayload {
  notes: string;
}

const MAX_QUEUE_LENGTH = 50;

let queue: LabelCandidate[] = [];

const isLabelingEnabled = (): boolean => process.env.ENABLE_LABELING_REVIEW === "true";

const normalizeCandidate = (candidate: LabelCandidate): LabelCandidate => ({
  ...candidate,
  timestamp: candidate.timestamp ?? new Date().toISOString(),
});

export function pushLabelCandidate(candidate: LabelCandidate): void {
  if (!isLabelingEnabled()) {
    return;
  }

  queue = queue.concat(normalizeCandidate(candidate));

  if (queue.length > MAX_QUEUE_LENGTH) {
    queue = queue.slice(queue.length - MAX_QUEUE_LENGTH);
  }
}

export function listLabelCandidates(): LabelCandidate[] {
  if (!isLabelingEnabled()) {
    return [];
  }

  return queue.slice();
}

export function clearLabelCandidates(): void {
  queue = [];
}
