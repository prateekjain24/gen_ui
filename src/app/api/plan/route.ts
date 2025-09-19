import { NextRequest, NextResponse } from 'next/server';

import { DECISION_SOURCES, shouldUseLLM } from '@/lib/constants/llm';
import { generatePlanWithLLM } from '@/lib/policy/llm';
import { getNextStepPlan } from '@/lib/policy/rules';
import { sessionStore } from '@/lib/store/session';
import { createDebugger } from '@/lib/utils/debug';

type DecisionSource = (typeof DECISION_SOURCES)[keyof typeof DECISION_SOURCES];

type PlanStrategy = 'auto' | 'rules' | 'llm';

function normalizeStrategy(value: unknown): PlanStrategy {
  if (typeof value !== 'string') {
    return 'auto';
  }

  const lowered = value.trim().toLowerCase();
  if (lowered === 'rules') return 'rules';
  if (lowered === 'llm') return 'llm';
  return 'auto';
}

const debug = createDebugger('PlanAPI');

/**
 * Plan generation endpoint that orchestrates the decision cascade.
 * Uses rules engine for deterministic flow (Phase 1).
 * Will add LLM director in Phase 2.
 */
export async function POST(req: NextRequest) {
  try {
    const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
    const rawSessionId = typeof body?.sessionId === 'string' ? body.sessionId.trim() : '';
    const strategy = normalizeStrategy(body?.strategy);

    if (!rawSessionId) {
      return NextResponse.json(
        {
          error: 'Session ID is required',
          status: 400,
        },
        { status: 400 }
      );
    }

    // Get session from store
    const session = sessionStore.getSession(rawSessionId);
    if (!session) {
      return NextResponse.json(
        {
          error: 'Session not found',
          status: 404,
        },
        { status: 404 }
      );
    }

    const rulesPlan = getNextStepPlan(session);

    if (!rulesPlan) {
      return NextResponse.json(
        {
          error: 'Unable to determine next step',
          status: 500,
        },
        { status: 500 }
      );
    }

    let finalPlan = rulesPlan;
    let source: DecisionSource = DECISION_SOURCES.RULES;
    let metadata: Record<string, unknown> | null = null;

    const hasSignals =
      session.events.length > 0 ||
      session.completedSteps.length > 0 ||
      Object.keys(session.values ?? {}).length > 0;

    const forcedLLM = strategy === 'llm';
    const allowLLM = (forcedLLM || (strategy === 'auto' && shouldUseLLM(session.id))) && hasSignals;

    if (allowLLM) {
      const llmDecision = await generatePlanWithLLM(session);
      if (llmDecision) {
        finalPlan = llmDecision.plan;
        source = DECISION_SOURCES.LLM;
        metadata = llmDecision.metadata;
      } else if (forcedLLM) {
        source = DECISION_SOURCES.FALLBACK;
      }
    } else if (forcedLLM) {
      source = DECISION_SOURCES.FALLBACK;
    }

    debug(`Generated plan for session ${rawSessionId}: ${finalPlan.kind} (source=${source})`);

    return NextResponse.json({
      plan: finalPlan,
      source,
      metadata,
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
