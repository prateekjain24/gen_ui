import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { isLabelingReviewEnabled } from "@/lib/config/toggles";
import { listLabelCandidates, pushLabelCandidate } from "@/lib/labeling/memory-queue";
import type { LabelCandidateInput } from "@/lib/labeling/types";
import { createDebugger, debugError } from "@/lib/utils/debug";

const log = createDebugger("LabelingAPI");

const planEditSchema = z.object({
  recipeId: z.string().trim().min(1, "Recipe ID is required"),
  controlId: z.string().trim().min(1, "Control ID is required"),
  previousValue: z.unknown(),
  nextValue: z.unknown(),
  signalsSummary: z.string().trim().min(1, "Signals summary is required"),
  timestamp: z.string().datetime().optional(),
});

const candidateSchema = planEditSchema.extend({
  notes: z.string().trim().min(1, "Reviewer notes are required"),
});

const disabledResponse = NextResponse.json({ error: "Labeling review is disabled." }, { status: 403 });

export async function GET() {
  if (!isLabelingReviewEnabled()) {
    return disabledResponse;
  }

  const items = listLabelCandidates();
  return NextResponse.json({
    items,
    count: items.length,
    generatedAt: new Date().toISOString(),
  });
}

export async function POST(request: NextRequest) {
  if (!isLabelingReviewEnabled()) {
    return disabledResponse;
  }

  let rawBody: unknown;

  try {
    rawBody = await request.json();
  } catch (parseError) {
    debugError("Labeling payload parsing failed", parseError);
    return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 });
  }

  const parsed = candidateSchema.safeParse(rawBody);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid labeling payload", details: parsed.error.format() },
      { status: 400 }
    );
  }

  const payload: LabelCandidateInput = parsed.data;

  try {
    const queued = pushLabelCandidate(payload);
    if (queued) {
      log("Queued labeling candidate for %s", payload.recipeId);
    }
  } catch (error) {
    debugError("Failed to queue labeling candidate", error);
    return NextResponse.json({ error: "Failed to queue labeling candidate" }, { status: 500 });
  }

  return NextResponse.json({ queuedAt: new Date().toISOString() }, { status: 202 });
}
