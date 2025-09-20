import { randomUUID } from "node:crypto";

import type { LabelCandidateInput, LabelQueueItem } from "./types";

import { isLabelingReviewEnabled } from "@/lib/config/toggles";

const MAX_QUEUE_LENGTH = 50;

let queue: LabelQueueItem[] = [];

const normalizeCandidate = (candidate: LabelCandidateInput): LabelQueueItem => ({
  ...candidate,
  id: randomUUID(),
  timestamp: candidate.timestamp ?? new Date().toISOString(),
});

export function pushLabelCandidate(candidate: LabelCandidateInput): LabelQueueItem | null {
  if (!isLabelingReviewEnabled()) {
    return null;
  }

  const normalized = normalizeCandidate(candidate);
  queue = queue.concat(normalized);

  if (queue.length > MAX_QUEUE_LENGTH) {
    queue = queue.slice(queue.length - MAX_QUEUE_LENGTH);
  }

  return normalized;
}

export function listLabelCandidates(): LabelQueueItem[] {
  if (!isLabelingReviewEnabled()) {
    return [];
  }

  return queue.slice();
}

export function clearLabelCandidates(): void {
  queue = [];
}
