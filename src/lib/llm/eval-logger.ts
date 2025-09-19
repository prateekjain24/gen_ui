import { appendFile, mkdir } from 'node:fs/promises';
import path from 'node:path';

import type { CanvasRecipeId } from '@/lib/canvas/recipes';
import { EVAL_LOG_CONFIG, LLM_CONFIG, PROMPT_VERSION } from '@/lib/constants';
import { buildLLMUserContext } from '@/lib/llm/context';
import type { LLMDecisionMetadata } from '@/lib/llm/response-parser';
import type { FormPlan } from '@/lib/types/form';
import type { SessionState } from '@/lib/types/session';
import { createDebugger, debugError } from '@/lib/utils/debug';

interface EvalLogRecord {
  decisionId: string;
  sessionId: string;
  createdAt: string;
  promptVersion: string;
  modelName: string;
  metadata: LLMDecisionMetadata;
  plan: FormPlan;
  sessionContext: ReturnType<typeof buildLLMUserContext>;
  rawResponse: string;
  summary: {
    stepId: string;
    fieldCount: number;
  };
}

const debug = createDebugger('LLMEvalLogger');

function resolveLogDir(): string {
  if (path.isAbsolute(EVAL_LOG_CONFIG.logDir)) {
    return EVAL_LOG_CONFIG.logDir;
  }

  return path.join(process.cwd(), EVAL_LOG_CONFIG.logDir);
}

function createDecisionId(sessionId: string): string {
  const suffix = Math.random().toString(36).slice(2, 8);
  return `${sessionId}-${Date.now()}-${suffix}`;
}

function deriveSummary(plan: FormPlan): EvalLogRecord['summary'] {
  if (plan.kind === 'render_step') {
    return {
      stepId: plan.step.stepId,
      fieldCount: plan.step.fields.length,
    };
  }

  if (plan.kind === 'review') {
    return {
      stepId: 'review',
      fieldCount: plan.summary.length,
    };
  }

  return {
    stepId: plan.kind,
    fieldCount: 0,
  };
}

export async function logLLMDecision({
  session,
  plan,
  metadata,
  rawResponse,
}: {
  session: SessionState;
  plan: FormPlan;
  metadata: LLMDecisionMetadata;
  rawResponse: string;
}): Promise<void> {
  if (!EVAL_LOG_CONFIG.enable) {
    return;
  }

  try {
    const logDir = resolveLogDir();
    await mkdir(logDir, { recursive: true });

    const timestamp = new Date().toISOString();
    const record: EvalLogRecord = {
      decisionId: createDecisionId(session.id),
      sessionId: session.id,
      createdAt: timestamp,
      promptVersion: PROMPT_VERSION,
      modelName: LLM_CONFIG.model,
      metadata,
      plan,
      sessionContext: buildLLMUserContext(session),
      rawResponse,
      summary: deriveSummary(plan),
    };

    const dateSlug = timestamp.slice(0, 10);
    const filePath = path.join(logDir, `${dateSlug}.jsonl`);
    await appendFile(filePath, `${JSON.stringify(record)}\n`, 'utf8');
    debug(`Logged eval decision ${record.decisionId} to ${path.basename(filePath)}`);
  } catch (error) {
    debugError('Failed to persist eval decision', error);
  }
}

export interface CanvasDecisionLog {
  message: string;
  recipeId: CanvasRecipeId;
  persona: 'explorer' | 'team' | 'power';
  intentTags: string[];
  confidence: number;
  decisionSource: 'llm' | 'heuristics';
  componentCount: number;
  fallbackUsed: boolean;
  reasoning: string;
  llmConfidence?: number | null;
  llmRawResponse?: string | null;
}

function resolveCanvasLogDir(): string {
  return path.join(resolveLogDir(), 'canvas');
}

export async function logCanvasDecision(payload: CanvasDecisionLog): Promise<void> {
  if (!EVAL_LOG_CONFIG.enable) {
    return;
  }

  try {
    const canvasDir = resolveCanvasLogDir();
    await mkdir(canvasDir, { recursive: true });

    const timestamp = new Date().toISOString();
    const record = {
      type: 'canvas_decision' as const,
      createdAt: timestamp,
      promptVersion: PROMPT_VERSION,
      modelName: LLM_CONFIG.model,
      ...payload,
    };

    const dateSlug = timestamp.slice(0, 10);
    const filePath = path.join(canvasDir, `${dateSlug}.jsonl`);
    await appendFile(filePath, `${JSON.stringify(record)}\n`, 'utf8');
    debug('Logged canvas decision to %s', path.basename(filePath));
  } catch (error) {
    debugError('Failed to persist canvas decision', error);
  }
}

export type { EvalLogRecord };
