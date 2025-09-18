import type { LanguageModelUsage } from 'ai';

export interface LLMUsageTotals {
  /** Aggregate count of input tokens */
  totalInputTokens: number;
  /** Aggregate count of output tokens */
  totalOutputTokens: number;
  /** Aggregate count of total tokens as reported by the provider */
  totalTokens: number;
  /** Aggregate count of reasoning tokens (if provided) */
  totalReasoningTokens: number;
  /** Aggregate count of cached input tokens (if provided) */
  totalCachedInputTokens: number;
  /** Number of successful calls that reported usage */
  callCount: number;
  /** Timestamp of the most recent usage record */
  lastCallAt: Date | null;
}

const usageState: LLMUsageTotals = {
  totalInputTokens: 0,
  totalOutputTokens: 0,
  totalTokens: 0,
  totalReasoningTokens: 0,
  totalCachedInputTokens: 0,
  callCount: 0,
  lastCallAt: null,
};

/**
 * Records token usage information reported by the AI SDK call.
 */
export function recordLLMUsage(usage: LanguageModelUsage | null | undefined): void {
  if (!usage) {
    return;
  }

  const inputTokens = usage.inputTokens ?? 0;
  const outputTokens = usage.outputTokens ?? 0;
  const reasoningTokens = usage.reasoningTokens ?? 0;
  const cachedInputTokens = usage.cachedInputTokens ?? 0;

  const totalTokens = usage.totalTokens ?? inputTokens + outputTokens + reasoningTokens;

  usageState.totalInputTokens += inputTokens;
  usageState.totalOutputTokens += outputTokens;
  usageState.totalTokens += totalTokens;
  usageState.totalReasoningTokens += reasoningTokens;
  usageState.totalCachedInputTokens += cachedInputTokens;
  usageState.callCount += 1;
  usageState.lastCallAt = new Date();
}

/**
 * Returns a snapshot of the aggregated LLM usage totals.
 */
export function getLLMUsageTotals(): LLMUsageTotals {
  return {
    totalInputTokens: usageState.totalInputTokens,
    totalOutputTokens: usageState.totalOutputTokens,
    totalTokens: usageState.totalTokens,
    totalReasoningTokens: usageState.totalReasoningTokens,
    totalCachedInputTokens: usageState.totalCachedInputTokens,
    callCount: usageState.callCount,
    lastCallAt: usageState.lastCallAt ? new Date(usageState.lastCallAt) : null,
  };
}

/**
 * Resets the in-memory usage counters. Intended for testing only.
 */
export function resetLLMUsageTotals(): void {
  usageState.totalInputTokens = 0;
  usageState.totalOutputTokens = 0;
  usageState.totalTokens = 0;
  usageState.totalReasoningTokens = 0;
  usageState.totalCachedInputTokens = 0;
  usageState.callCount = 0;
  usageState.lastCallAt = null;
}
