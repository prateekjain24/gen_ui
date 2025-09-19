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

jest.mock('@/lib/llm/response-parser', () => {
  const actual = jest.requireActual('@/lib/llm/response-parser');
  return {
    ...actual,
    parseLLMDecision: jest.fn(),
  };
});

const baseSession = (): SessionState => ({
  id: 'session-123',
  createdAt: new Date('2025-01-01T00:00:00Z'),
  lastActivityAt: new Date('2025-01-01T00:05:00Z'),
  currentStep: 'basics',
  completedSteps: [],
  values: {
    workspace_name: 'Existing Workspace',
  },
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
  const getParserMock = () => jest.requireMock('@/lib/llm/response-parser').parseLLMDecision as jest.Mock;

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
    const parseMock = getParserMock();
    generateTextMock.mockResolvedValue({
      text: '{"kind":"success"}',
      usage: {
        inputTokens: 10,
        outputTokens: 5,
        totalTokens: 16,
      },
    });
    const plan = {
      kind: 'render_step',
      step: {
        stepId: 'workspace',
        title: 'Configure workspace',
        fields: [
          {
            kind: 'text',
            id: 'workspace_name',
            label: 'Workspace Name',
            required: false,
          },
        ],
        primaryCta: { label: 'Continue', action: 'submit_step' },
      },
      stepper: [],
    } as const;
    const rawStepConfig = {
      stepId: 'workspace',
      title: 'Configure workspace',
      fields: [
        {
          kind: 'text',
          id: 'workspace_name',
          label: 'Workspace Name',
        },
      ],
      primaryCta: { label: 'Continue', action: 'submit_step' },
    };
    parseMock.mockReturnValue({
      metadata: { reasoning: 'test', confidence: 0.8, decision: 'progress' },
      raw: rawStepConfig,
      plan,
    });

    const { generatePlanWithLLM } = await import('@/lib/policy/llm');

    const result = await generatePlanWithLLM(baseSession());

    expect(result?.plan.kind).toBe('render_step');
    if (!result || result.plan.kind !== 'render_step') {
      throw new Error('Expected render_step result');
    }
    expect(result.plan.step.fields[0]).toMatchObject({
      id: 'workspace_name',
      value: 'Existing Workspace',
    });
    expect(result.metadata).toMatchObject({ reasoning: 'test', confidence: 0.8 });
    expect(clientMocks.getOpenAIProvider).toHaveBeenCalledTimes(1);
    expect(provider).toHaveBeenCalledWith('gpt-5-mini-test');
    expect(generateTextMock).toHaveBeenCalledTimes(1);
    expect(usageRecorder).toHaveBeenCalledWith({
      inputTokens: 10,
      outputTokens: 5,
      totalTokens: 16,
    });
    expect(parseMock).toHaveBeenCalledTimes(1);
    expect(parseMock).toHaveBeenCalledWith(expect.any(Object), expect.anything());
  });

  it('parses tool call args when text output is empty', async () => {
    process.env.OPENAI_API_KEY = 'test-key';

    const clientMocks = getClientMocks();
    const provider = jest.fn().mockReturnValue('model-instance');
    clientMocks.getOpenAIProvider.mockReturnValue(provider);
    clientMocks.invokeWithTimeout.mockImplementation((_timeout, operation) => operation(new AbortController().signal));
    clientMocks.retryWithExponentialBackoff.mockImplementation(async (operation, _settings) => operation(1));
    clientMocks.shouldRetryOnError.mockReturnValue(true);

    const generateTextMock = getGenerateTextMock();
    const parseMock = getParserMock();
    const usageRecorder = getUsageRecorder();

    const toolPayload = {
      metadata: { reasoning: 'tool-call', confidence: 0.91, decision: 'progress' },
      stepConfig: {
        stepId: 'workspace',
        title: 'Workspace step',
        fields: [],
        primaryCta: { label: 'Continue', action: 'submit_step' },
      },
    };

    generateTextMock.mockResolvedValue({
      text: '',
      usage: {
        inputTokens: 20,
        outputTokens: 8,
        totalTokens: 28,
      },
      toolCalls: [
        {
          toolName: 'propose_next_step',
          input: toolPayload,
        },
      ],
    });

    parseMock.mockReturnValue({
      metadata: toolPayload.metadata,
      raw: toolPayload.stepConfig,
      plan: {
        kind: 'render_step',
        step: {
          stepId: 'workspace',
          title: 'Workspace step',
          fields: [],
          primaryCta: { label: 'Continue', action: 'submit_step' },
        },
        stepper: [],
      },
    });

    const { generatePlanWithLLM } = await import('@/lib/policy/llm');

    await generatePlanWithLLM(baseSession());

    expect(usageRecorder).toHaveBeenCalledWith({
      inputTokens: 20,
      outputTokens: 8,
      totalTokens: 28,
    });
    expect(parseMock).toHaveBeenCalledTimes(1);
    expect(parseMock.mock.calls[0]?.[0]).toEqual(toolPayload);
  });

  it('parses propose_next_step wrapper when text output is wrapped', async () => {
    process.env.OPENAI_API_KEY = 'test-key';

    const clientMocks = getClientMocks();
    const provider = jest.fn().mockReturnValue('model-instance');
    clientMocks.getOpenAIProvider.mockReturnValue(provider);
    clientMocks.invokeWithTimeout.mockImplementation((_timeout, operation) => operation(new AbortController().signal));
    clientMocks.retryWithExponentialBackoff.mockImplementation(async (operation, _settings) => operation(1));
    clientMocks.shouldRetryOnError.mockReturnValue(true);

    const generateTextMock = getGenerateTextMock();
    const parseMock = getParserMock();

    const wrappedPayload = {
      metadata: { reasoning: 'wrapper', confidence: 0.72, decision: 'progress' },
      stepConfig: {
        stepId: 'workspace',
        title: 'Workspace step',
        fields: [],
        primaryCta: { label: 'Continue', action: 'submit_step' },
      },
    };

    generateTextMock.mockResolvedValue({
      text: `propose_next_step(${JSON.stringify(wrappedPayload)});`,
      usage: {
        inputTokens: 15,
        outputTokens: 6,
        totalTokens: 21,
      },
    });

    parseMock.mockReturnValue({
      metadata: wrappedPayload.metadata,
      raw: wrappedPayload.stepConfig,
      plan: {
        kind: 'render_step',
        step: {
          stepId: 'workspace',
          title: 'Workspace step',
          fields: [],
          primaryCta: { label: 'Continue', action: 'submit_step' },
        },
        stepper: [],
      },
    });

    const { generatePlanWithLLM } = await import('@/lib/policy/llm');

    await generatePlanWithLLM(baseSession());

    expect(parseMock).toHaveBeenCalledTimes(1);
    expect(parseMock.mock.calls[0]?.[0]).toEqual(wrappedPayload);

    expect(parseMock).toHaveBeenCalledWith(expect.any(Object), expect.anything());
  });

  it('repairs payloads with out-of-range confidence, unsupported kinds, and string CTAs', async () => {
    process.env.OPENAI_API_KEY = 'test-key';

    const clientMocks = getClientMocks();
    const provider = jest.fn().mockReturnValue('model-instance');
    clientMocks.getOpenAIProvider.mockReturnValue(provider);
    clientMocks.invokeWithTimeout.mockImplementation((_timeout, operation) => operation(new AbortController().signal));
    clientMocks.retryWithExponentialBackoff.mockImplementation(async (operation, _settings) => operation(1));
    clientMocks.shouldRetryOnError.mockReturnValue(true);

    const generateTextMock = getGenerateTextMock();
    const parseMock = getParserMock();

  const malformedPayload = {
    metadata: { reasoning: 'repair-needed', confidence: 1.4, persona: 'personal', decision: 'progress' },
    stepConfig: {
      stepId: 'workspace',
      fields: [
        {
          kind: 'toggle',
          id: 'notify_team',
          label: '',
        },
      ],
      primaryCta: 'Continue to workspace',
    },
  };

    generateTextMock.mockResolvedValue({
      text: JSON.stringify(malformedPayload),
      usage: {
        inputTokens: 12,
        outputTokens: 6,
        totalTokens: 18,
      },
    });

    parseMock.mockReturnValue({
      metadata: { reasoning: 'repair-needed', confidence: 1, persona: 'explorer', decision: 'progress' },
      raw: {
        stepId: 'workspace',
        title: 'Workspace',
        fields: [
          {
            kind: 'checkbox',
            id: 'notify_team',
            label: 'Notify Team',
          },
        ],
        primaryCta: { label: 'Continue to workspace', action: 'submit_step' },
      },
      plan: {
        kind: 'render_step',
        step: {
          stepId: 'workspace',
          title: 'Workspace',
          fields: [
            {
              kind: 'checkbox',
              id: 'notify_team',
              label: 'Notify Team',
            },
          ],
          primaryCta: { label: 'Continue to workspace', action: 'submit_step' },
        },
        stepper: [],
      },
    });

    const { generatePlanWithLLM } = await import('@/lib/policy/llm');

    await generatePlanWithLLM(baseSession());

    expect(parseMock).toHaveBeenCalledWith(
      expect.objectContaining({
        metadata: expect.objectContaining({ confidence: 1, persona: 'explorer' }),
        stepConfig: expect.objectContaining({
          title: 'Workspace',
          primaryCta: expect.objectContaining({ label: 'Continue to workspace', action: 'submit_step' }),
        }),
      }),
      expect.anything()
    );
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
