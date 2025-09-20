import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import type { PlanEditTelemetryPayload } from "@/lib/telemetry/plan-edits";
import { recordPlanEdit } from "@/lib/telemetry/plan-edits";
import { createDebugger, debugError } from "@/lib/utils/debug";

const log = createDebugger("PlanEditAPI");

const PlanEditSchema = z.object({
  recipeId: z.string().trim().min(1, "Recipe ID is required"),
  controlId: z.string().trim().min(1, "Control ID is required"),
  previousValue: z.unknown(),
  nextValue: z.unknown(),
  signalsSummary: z.string().trim().min(1, "Signals summary is required"),
  timestamp: z.string().datetime().optional(),
});

export async function POST(request: NextRequest) {
  let rawBody: unknown;

  try {
    rawBody = await request.json();
  } catch (parseError) {
    debugError("Plan edit payload parsing failed", parseError);
    return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 });
  }

  const parsed = PlanEditSchema.safeParse(rawBody);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid plan edit payload", details: parsed.error.format() },
      { status: 400 }
    );
  }

  const payload: PlanEditTelemetryPayload = parsed.data;

  try {
    await recordPlanEdit(payload);
    log("Recorded plan edit for %s", payload.recipeId);
  } catch (error) {
    debugError("Plan edit logging failed", error);
    return NextResponse.json({ error: "Failed to record plan edit" }, { status: 500 });
  }

  return NextResponse.json({ recordedAt: new Date().toISOString() });
}
