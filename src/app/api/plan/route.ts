import { NextRequest, NextResponse } from 'next/server';
import { sessionStore } from '@/lib/store/session';
import { getNextStepPlan } from '@/lib/policy/rules';
import { createDebugger } from '@/lib/utils/debug';

const debug = createDebugger('PlanAPI');

/**
 * Plan generation endpoint that orchestrates the decision cascade.
 * Uses rules engine for deterministic flow (Phase 1).
 * Will add LLM director in Phase 2.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { sessionId } = body;

    if (!sessionId) {
      return NextResponse.json(
        {
          error: 'Session ID is required',
          status: 400,
        },
        { status: 400 }
      );
    }

    // Get session from store
    const session = sessionStore.getSession(sessionId);
    if (!session) {
      return NextResponse.json(
        {
          error: 'Session not found',
          status: 404,
        },
        { status: 404 }
      );
    }

    // Generate plan using rules engine
    const plan = getNextStepPlan(session);

    if (!plan) {
      return NextResponse.json(
        {
          error: 'Unable to determine next step',
          status: 500,
        },
        { status: 500 }
      );
    }

    debug(`Generated plan for session ${sessionId}: ${plan.kind}`);

    return NextResponse.json({
      plan,
      source: 'rules', // Will be 'rules' | 'llm' | 'fallback' in Phase 2
    });
  } catch (error) {
    console.error('Error generating plan:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        status: 500,
      },
      { status: 500 }
    );
  }
}