import { APICallError } from '@ai-sdk/provider';
import { generateText } from 'ai';

import { ERROR_CODES } from '@/lib/constants';
import { LLM_CONFIG, SYSTEM_PROMPTS } from '@/lib/constants/llm';
import type { BackoffSettings } from '@/lib/llm/client';
import {
  LLMServiceError,
  getOpenAIProvider,
  invokeWithTimeout,
  retryWithExponentialBackoff,
  shouldRetryOnError,
} from '@/lib/llm/client';
import { recordLLMUsage } from '@/lib/llm/usage-tracker';
import type { FormPlan } from '@/lib/types/form';
import type { SessionState } from '@/lib/types/session';
import { createDebugger, debugError } from '@/lib/utils/debug';

const debug = createDebugger('LLMPolicy');

const backoffSettings: BackoffSettings = {
  maxAttempts: LLM_CONFIG.retry.maxAttempts,
  initialDelay: LLM_CONFIG.retry.initialDelay,
  maxDelay: LLM_CONFIG.retry.maxDelay,
  backoffMultiplier: LLM_CONFIG.retry.backoffMultiplier,
  jitterRatio: LLM_CONFIG.retry.jitterRatio,
};

function sanitizeValues(values: Record<string, unknown>): Record<string, unknown> {
  const entries = Object.entries(values).slice(0, 15);
  return entries.reduce<Record<string, unknown>>((acc, [key, value]) => {
    if (value instanceof Date) {
      acc[key] = value.toISOString();
    } else if (typeof value === 'object' && value !== null) {
      if (Array.isArray(value)) {
        acc[key] = value
          .slice(0, 10)
          .map(item => (item instanceof Date ? item.toISOString() : item));
      } else {
        acc[key] = value;
      }
    } else {
      acc[key] = value;
    }
    return acc;
  }, {});
}

function buildPrompt(session: SessionState): string {
  const context = {
    sessionId: session.id,
    persona: session.persona ?? 'unknown',
    currentStep: session.currentStep,
    completedSteps: session.completedSteps,
    values: sanitizeValues(session.values),
    metadata: session.metadata,
  };

  const serialized = JSON.stringify(context, null, 2);

  return `You are orchestrating an adaptive onboarding form.

Session snapshot:
${serialized}

Produce a JSON object describing the recommended next step and fields. Follow the system instructions strictly.`;
}

function mapToLLMServiceError(error: unknown): LLMServiceError {
  if (error instanceof LLMServiceError) {
    return error;
  }

  if (APICallError.isInstance(error)) {
    const isRateLimit = error.statusCode === 429;
    return new LLMServiceError(error.message, isRateLimit ? ERROR_CODES.RATE_LIMIT_EXCEEDED : ERROR_CODES.LLM_ERROR, {
      cause: error,
    });
  }

  if (error instanceof Error) {
    if (error.name === 'AbortError') {
      return new LLMServiceError(error.message || 'LLM request timed out', ERROR_CODES.LLM_TIMEOUT, {
        cause: error,
      });
    }

    return new LLMServiceError(error.message, ERROR_CODES.LLM_ERROR, { cause: error });
  }

  return new LLMServiceError('Unknown LLM failure', ERROR_CODES.LLM_ERROR);
}

/**
 * Generates a plan using the OpenAI provider via the AI SDK.
 * Currently returns null until schema mapping is implemented in later stories.
 */
export async function generatePlanWithLLM(session: SessionState): Promise<FormPlan | null> {
  if (!process.env.OPENAI_API_KEY) {
    debug('Skipping LLM plan generation: OPENAI_API_KEY not configured');
    return null;
  }

  try {
    const openai = getOpenAIProvider();

    const responseText = await retryWithExponentialBackoff(
      attempt =>
        invokeWithTimeout(LLM_CONFIG.timeout, async signal => {
          const result = await generateText({
            model: openai(LLM_CONFIG.model),
            system: SYSTEM_PROMPTS.FORM_ORCHESTRATOR,
            prompt: buildPrompt(session),
            temperature: LLM_CONFIG.temperature,
            topP: LLM_CONFIG.topP,
            maxOutputTokens: LLM_CONFIG.maxTokens,
            abortSignal: signal,
            maxRetries: 0,
          });

          recordLLMUsage(result.usage);
          debug(`LLM call succeeded on attempt ${attempt}`);
          return result.text;
        }),
      backoffSettings,
      {
        shouldRetry: error => shouldRetryOnError(error),
        onRetry: (error, attempt, delayMs) => {
          const mapped = mapToLLMServiceError(error);
          debug(
            `Retrying LLM call after failure (attempt ${attempt} of ${backoffSettings.maxAttempts}). ` +
              `Next attempt in ${delayMs}ms. [code=${mapped.code}]`
          );
        },
      }
    );

    debug(`LLM response captured (${responseText.length} chars)`);

    // TODO (P2-002/P2-005): parse structured plan from responseText.
    return null;
  } catch (error) {
    const mappedError = mapToLLMServiceError(error);
    debugError('LLM plan generation failed', mappedError);
    return null;
  }
}
