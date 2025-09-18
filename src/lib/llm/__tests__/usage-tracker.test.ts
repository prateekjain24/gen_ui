import type { LanguageModelUsage } from 'ai';

import {
  getLLMUsageTotals,
  recordLLMUsage,
  resetLLMUsageTotals,
} from '@/lib/llm/usage-tracker';

describe('LLM usage tracker', () => {
  beforeEach(() => {
    resetLLMUsageTotals();
  });

  it('aggregates totals from multiple usage reports', () => {
    const firstUsage: LanguageModelUsage = {
      inputTokens: 100,
      outputTokens: 60,
      totalTokens: 162,
      reasoningTokens: 2,
      cachedInputTokens: 0,
    };

    const secondUsage: LanguageModelUsage = {
      inputTokens: 50,
      outputTokens: 20,
      totalTokens: undefined,
      reasoningTokens: 0,
      cachedInputTokens: 5,
    };

    recordLLMUsage(firstUsage);
    recordLLMUsage(secondUsage);

    const snapshot = getLLMUsageTotals();

    expect(snapshot.totalInputTokens).toBe(150);
    expect(snapshot.totalOutputTokens).toBe(80);
    expect(snapshot.totalTokens).toBe(162 + 70); // second call falls back to input+output
    expect(snapshot.totalReasoningTokens).toBe(2);
    expect(snapshot.totalCachedInputTokens).toBe(5);
    expect(snapshot.callCount).toBe(2);
    expect(snapshot.lastCallAt).toBeInstanceOf(Date);
  });

  it('ignores null or undefined usage payloads', () => {
    recordLLMUsage(null);
    recordLLMUsage(undefined);

    const snapshot = getLLMUsageTotals();
    expect(snapshot.callCount).toBe(0);
    expect(snapshot.totalTokens).toBe(0);
    expect(snapshot.lastCallAt).toBeNull();
  });
});
