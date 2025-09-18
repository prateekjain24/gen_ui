import { createOpenAI } from '@ai-sdk/openai';
import { APICallError } from '@ai-sdk/provider';

import type { ErrorCode } from '@/lib/constants';
import { ERROR_CODES } from '@/lib/constants';
import { createDebugger } from '@/lib/utils/debug';

const debug = createDebugger('LLMClient');

let cachedOpenAI: ReturnType<typeof createOpenAI> | null = null;

export class LLMServiceError extends Error {
  public readonly code: ErrorCode;

  constructor(message: string, code: ErrorCode, options?: ErrorOptions) {
    super(message, options);
    this.name = 'LLMServiceError';
    this.code = code;
  }
}

export interface BackoffSettings {
  maxAttempts: number;
  initialDelay: number;
  maxDelay: number;
  backoffMultiplier: number;
  jitterRatio: number;
  sleep?: (ms: number) => Promise<void>;
  random?: () => number;
}

export interface RetryHooks {
  shouldRetry?: (error: unknown, attempt: number) => boolean;
  onRetry?: (error: unknown, attempt: number, delayMs: number) => void;
}

const defaultSleep = (ms: number) => new Promise<void>(resolve => setTimeout(resolve, ms));

function calculateDelay(
  baseDelay: number,
  maxDelay: number,
  jitterRatio: number,
  randomFn: () => number
): number {
  if (baseDelay >= maxDelay) {
    return maxDelay;
  }

  if (jitterRatio <= 0) {
    return Math.min(baseDelay, maxDelay);
  }

  const minFactor = 1 - jitterRatio;
  const maxFactor = 1 + jitterRatio;
  const factor = minFactor + (maxFactor - minFactor) * randomFn();
  const delay = Math.round(baseDelay * factor);
  return Math.max(0, Math.min(delay, maxDelay));
}

export async function retryWithExponentialBackoff<T>(
  operation: (attempt: number) => Promise<T>,
  settings: BackoffSettings,
  hooks: RetryHooks = {}
): Promise<T> {
  const {
    maxAttempts,
    initialDelay,
    maxDelay,
    backoffMultiplier,
    jitterRatio,
    sleep = defaultSleep,
    random = Math.random,
  } = settings;

  let attempt = 0;
  let delay = initialDelay;
  let lastError: unknown;

  while (attempt < maxAttempts) {
    try {
      attempt += 1;
      return await operation(attempt);
    } catch (error) {
      lastError = error;

      const nextAttempt = attempt + 1;
      const shouldAttemptRetry =
        nextAttempt <= maxAttempts && (hooks.shouldRetry?.(error, attempt) ?? true);

      if (!shouldAttemptRetry) {
        break;
      }

      const waitMs = calculateDelay(delay, maxDelay, jitterRatio, random);
      hooks.onRetry?.(error, attempt, waitMs);
      await sleep(waitMs);
      delay = Math.min(maxDelay, Math.round(delay * backoffMultiplier));
    }
  }

  if (lastError instanceof Error) {
    throw lastError;
  }

  throw new LLMServiceError('LLM operation failed with an unknown error', ERROR_CODES.LLM_ERROR);
}

export async function invokeWithTimeout<T>(
  timeoutMs: number,
  operation: (signal: AbortSignal) => Promise<T>
): Promise<T> {
  if (timeoutMs <= 0) {
    return operation(new AbortController().signal);
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => {
    controller.abort(new Error(`LLM request timed out after ${timeoutMs}ms`));
  }, timeoutMs);

  try {
    return await operation(controller.signal);
  } finally {
    clearTimeout(timeoutId);
  }
}

export function getOpenAIProvider() {
  if (cachedOpenAI) {
    return cachedOpenAI;
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new LLMServiceError('OPENAI_API_KEY is not configured', ERROR_CODES.LLM_ERROR);
  }

  cachedOpenAI = createOpenAI({
    apiKey,
  });

  debug('OpenAI provider initialised');
  return cachedOpenAI;
}

export function shouldRetryOnError(error: unknown): boolean {
  if (APICallError.isInstance(error)) {
    return error.isRetryable !== false;
  }

  return true;
}
