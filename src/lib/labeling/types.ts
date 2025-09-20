import type { PlanEditTelemetryPayload } from "@/lib/telemetry/plan-edits";

export interface LabelCandidateInput extends PlanEditTelemetryPayload {
  notes: string;
}

export interface LabelQueueItem extends LabelCandidateInput {
  id: string;
}

export interface AcceptedLabelDescriptor {
  recipeId: string;
  controlId: string;
  nextValue: unknown;
  notes: string;
}
