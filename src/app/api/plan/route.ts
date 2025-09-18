import { NextRequest, NextResponse } from 'next/server';

/**
 * Placeholder for the Phase 1 deterministic plan endpoint.
 * P1-009/P1-012 will replace this with real rules + LLM orchestration logic.
 */
export async function POST(_req: NextRequest) {
  return NextResponse.json(
    {
      error: 'Plan generation not yet implemented',
      status: 501,
    },
    { status: 501 }
  );
}
