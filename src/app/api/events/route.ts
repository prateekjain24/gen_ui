import { NextRequest, NextResponse } from 'next/server';

/**
 * Placeholder telemetry ingestion endpoint awaiting P1-013 implementation.
 */
export async function POST(_req: NextRequest) {
  return NextResponse.json(
    {
      error: 'Telemetry ingestion not yet implemented',
      status: 501,
    },
    { status: 501 }
  );
}
