import type { SessionState } from '@/lib/types/session';

jest.mock('ai', () => ({
  generateText: jest.fn(),
}));

jest.mock('@/lib/llm/usage-tracker', () => ({
  recordLLMUsage: jest.fn(),
  getLLMUsageTotals: jest.fn(),
  resetLLMUsageTotals: jest.fn(),
}));

jest.mock('@/lib/llm/client', () => {
  const actual = jest.requireActual('@/lib/llm/client');
  return {
    ...actual,
    getOpenAIProvider: jest.fn(),
    invokeWithTimeout: jest.fn(),
    retryWithExponentialBackoff: jest.fn(),
    shouldRetryOnError: jest.fn(),
  };
});

const baseSession = (): SessionState => ({
  id: 'session-123',
  createdAt: new Date('2025-01-01T00:00:00Z'),
  lastActivityAt: new Date('2025-01-01T00:05:00Z'),
  currentStep: 'basics',
  completedSteps: [],
  values: {},
  events: [],
});

describe('generatePlanWithLLM', () => {
  const originalApiKey = process.env.OPENAI_API_KEY;
  const originalModel = process.env.OPENAI_MODEL;

  const getGenerateTextMock = () => jest.requireMock('ai').generateText as jest.Mock;
  const getUsageRecorder = () => jest.requireMock('@/lib/llm/usage-tracker').recordLLMUsage as jest.Mock;
  const getClientMocks = () => jest.requireMock('@/lib/llm/client') as {
    getOpenAIProvider: jest.Mock;
    invokeWithTimeout: jest.Mock;
    retryWithExponentialBackoff: jest.Mock;
    shouldRetryOnError: jest.Mock;
  };

  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
    if (originalApiKey) {
      process.env.OPENAI_API_KEY = originalApiKey;
    } else {
      delete process.env.OPENAI_API_KEY;
    }

    if (originalModel) {
      process.env.OPENAI_MODEL = originalModel;
    } else {
      delete process.env.OPENAI_MODEL;
    }
  });

  afterAll(() => {
    if (originalApiKey) {
      process.env.OPENAI_API_KEY = originalApiKey;
    } else {
      delete process.env.OPENAI_API_KEY;
    }

    if (originalModel) {
      process.env.OPENAI_MODEL = originalModel;
    } else {
      delete process.env.OPENAI_MODEL;
    }
  });

  it('short-circuits when OPENAI_API_KEY is not set', async () => {
    delete process.env.OPENAI_API_KEY;

    const { generatePlanWithLLM } = await import('@/lib/policy/llm');
    const clientMocks = getClientMocks();

    const result = await generatePlanWithLLM(baseSession());

    expect(result).toBeNull();
    expect(clientMocks.retryWithExponentialBackoff).not.toHaveBeenCalled();
  });

  it('invokes AI SDK helpers when API key is present', async () => {
    process.env.OPENAI_API_KEY = 'test-key';
    process.env.OPENAI_MODEL = 'gpt-5-mini-test';

    const clientMocks = getClientMocks();
    const provider = jest.fn().mockReturnValue('model-instance');
    clientMocks.getOpenAIProvider.mockReturnValue(provider);
    clientMocks.invokeWithTimeout.mockImplementation((_timeout, operation) => operation(new AbortController().signal));
    clientMocks.retryWithExponentialBackoff.mockImplementation(async (operation, _settings) => operation(1));
    clientMocks.shouldRetryOnError.mockReturnValue(true);

    const usageRecorder = getUsageRecorder();
    const generateTextMock = getGenerateTextMock();
    generateTextMock.mockResolvedValue({
      text: '{"kind":"success"}',
      usage: {
        inputTokens: 10,
        outputTokens: 5,
        totalTokens: 16,
      },
    });

    const { generatePlanWithLLM } = await import('@/lib/policy/llm');

    const result = await generatePlanWithLLM(baseSession());

    expect(result).toBeNull();
    expect(clientMocks.getOpenAIProvider).toHaveBeenCalledTimes(1);
    expect(provider).toHaveBeenCalledWith('gpt-5-mini-test');
    expect(generateTextMock).toHaveBeenCalledTimes(1);
    expect(usageRecorder).toHaveBeenCalledWith({
      inputTokens: 10,
      outputTokens: 5,
      totalTokens: 16,
    });
  });

  it('handles errors from the retry helper gracefully', async () => {
    process.env.OPENAI_API_KEY = 'test-key';

    const clientMocks = getClientMocks();
    clientMocks.retryWithExponentialBackoff.mockRejectedValue(new Error('network failure'));

    const consoleErrorSpy = jest
      .spyOn(console, 'error')
      .mockImplementation((..._args: unknown[]) => undefined);

    const { generatePlanWithLLM } = await import('@/lib/policy/llm');

    await expect(generatePlanWithLLM(baseSession())).resolves.toBeNull();

    consoleErrorSpy.mockRestore();
  });
});
