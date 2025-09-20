import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { listLabelCandidates, pushLabelCandidate } from "@/lib/labeling/memory-queue";
import type { LabelCandidate } from "@/lib/labeling/memory-queue";
import { createDebugger, debugError } from "@/lib/utils/debug";

const log = createDebugger("LabelingAPI");

const isReviewEnabled = (): boolean => process.env.ENABLE_LABELING_REVIEW === "true";

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
  if (!isReviewEnabled()) {
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
  if (!isReviewEnabled()) {
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

  const payload: LabelCandidate = parsed.data;

  try {
    pushLabelCandidate(payload);
    log("Queued labeling candidate for %s", payload.recipeId);
  } catch (error) {
    debugError("Failed to queue labeling candidate", error);
    return NextResponse.json({ error: "Failed to queue labeling candidate" }, { status: 500 });
  }

  return NextResponse.json({ queuedAt: new Date().toISOString() }, { status: 202 });
}
