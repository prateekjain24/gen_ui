import { fetchSignalsFromLLM } from '../llm-parser';

jest.mock('ai', () => ({
  generateText: jest.fn(),
}));

jest.mock('@/lib/llm/client', () => ({
  getOpenAIProvider: jest.fn(),
}));

jest.mock('@/lib/runtime/with-timeout', () => ({
  withTimeout: jest.fn(),
}));

jest.mock('@/lib/llm/usage-tracker', () => ({
  recordLLMUsage: jest.fn(),
}));

jest.mock('@/lib/utils/debug', () => {
  const actual = jest.requireActual('@/lib/utils/debug');
  return {
    ...actual,
    createDebugger: jest.fn(() => jest.fn()),
    debugError: jest.fn(),
  };
});

const { generateText } = jest.requireMock('ai');
const { getOpenAIProvider } = jest.requireMock('@/lib/llm/client');
const { withTimeout } = jest.requireMock('@/lib/runtime/with-timeout');
const { recordLLMUsage } = jest.requireMock('@/lib/llm/usage-tracker');
const { debugError } = jest.requireMock('@/lib/utils/debug');

describe('fetchSignalsFromLLM', () => {
  beforeEach(() => {
    jest.resetAllMocks();

    process.env.OPENAI_API_KEY = 'test-key';

    const mockModel = jest.fn(() => 'mock-model');
    getOpenAIProvider.mockReturnValue(mockModel);

    withTimeout.mockImplementation(async (operation: (signal: AbortSignal) => Promise<unknown>, options?: { timeoutMs?: number }) => {
      if (options?.timeoutMs === undefined) {
        throw new Error('Expected timeout configuration');
      }
      return operation(new AbortController().signal);
    });
  });

  afterEach(() => {
    delete process.env.OPENAI_API_KEY;
  });

  it('returns structured signals when LLM response is valid', async () => {
    generateText.mockResolvedValue({
      text: '```json\n{"teamSizeBracket": {"value": "10-24", "confidence": 0.82}, "tools": {"value": ["Slack", "Salesforce", "Slack"], "confidence": 0.7, "notes": "explicit mention"}, "constraints": {"value": {"timeline": "rush", "notes": "ASAP launch"}}, "copyTone": {"value": "trusted-advisor"}}\n```',
      usage: { totalTokens: 120 },
    });

    const result = await fetchSignalsFromLLM('We have 18 operators relying on Slack and Salesforce.');

    expect(withTimeout).toHaveBeenCalledWith(expect.any(Function), { timeoutMs: 30_000 });
    expect(generateText).toHaveBeenCalledWith(
      expect.objectContaining({
        model: 'mock-model',
        temperature: 0.2,
        maxOutputTokens: 1200,
      })
    );
    expect(recordLLMUsage).toHaveBeenCalledWith({ totalTokens: 120 });

    expect(result.teamSizeBracket?.value).toBe('10-24');
    expect(result.teamSizeBracket?.metadata.source).toBe('llm');
    expect(result.teamSizeBracket?.metadata.confidence).toBeCloseTo(0.82, 5);

    expect(result.tools?.value).toEqual(['Slack', 'Salesforce']);
    expect(result.tools?.metadata.notes).toContain('explicit mention');

    expect(result.constraints?.value.timeline).toBe('rush');
    expect(result.constraints?.value.notes).toBe('ASAP launch');

    expect(result.copyTone?.value).toBe('trusted-advisor');
  });

  it('returns empty object when schema validation fails', async () => {
    generateText.mockResolvedValue({
      text: '{"teamSizeBracket": {"value": "huge"}}',
    });

    const result = await fetchSignalsFromLLM('Malformed output test');

    expect(result).toEqual({});
    expect(debugError).toHaveBeenCalled();
  });

  it('returns empty object when invocation throws', async () => {
    withTimeout.mockRejectedValueOnce(new Error('timeout'));

    const result = await fetchSignalsFromLLM('This will timeout');

    expect(result).toEqual({});
    expect(generateText).not.toHaveBeenCalled();
    expect(debugError).toHaveBeenCalled();
  });

  it('skips call when API key is missing', async () => {
    delete process.env.OPENAI_API_KEY;
    const result = await fetchSignalsFromLLM('No key available');
    expect(result).toEqual({});
    expect(generateText).not.toHaveBeenCalled();
  });
});
