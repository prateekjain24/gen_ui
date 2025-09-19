import { jest } from '@jest/globals';

const appendFileMock = jest.fn();
const mkdirMock = jest.fn();

jest.mock('node:fs/promises', () => ({
  appendFile: appendFileMock,
  mkdir: mkdirMock,
}));

describe('logCanvasDecision', () => {
  const ORIGINAL_ENV = process.env.ENABLE_EVAL_LOGGING;
  const ORIGINAL_LOG_DIR = process.env.EVAL_LOG_DIR;

  beforeEach(() => {
    jest.resetModules();
    appendFileMock.mockReset();
    mkdirMock.mockReset();
  });

  afterAll(() => {
    if (typeof ORIGINAL_ENV === 'string') {
      process.env.ENABLE_EVAL_LOGGING = ORIGINAL_ENV;
    } else {
      delete process.env.ENABLE_EVAL_LOGGING;
    }

    if (typeof ORIGINAL_LOG_DIR === 'string') {
      process.env.EVAL_LOG_DIR = ORIGINAL_LOG_DIR;
    } else {
      delete process.env.EVAL_LOG_DIR;
    }
  });

  it('writes canvas decision record with required fields', async () => {
    process.env.ENABLE_EVAL_LOGGING = 'true';
    process.env.EVAL_LOG_DIR = 'tmp/eval';

    const { logCanvasDecision } = await import('../eval-logger');

    await logCanvasDecision({
      message: 'Plan a team space with Slack',
      recipeId: 'R2',
      persona: 'team',
      intentTags: ['integrations', 'invites'],
      confidence: 0.82,
      decisionSource: 'llm',
      componentCount: 6,
      fallbackUsed: false,
      reasoning: 'Mentioned team and Slack integrations',
      llmConfidence: 0.82,
      llmRawResponse: '{"recipe_id":"R2"}',
    });

    expect(mkdirMock).toHaveBeenCalledWith(expect.stringContaining('tmp/eval/canvas'), { recursive: true });
    expect(appendFileMock).toHaveBeenCalledTimes(1);

    const [filePath, payload] = appendFileMock.mock.calls[0] as [string, string, string];
    expect(filePath).toContain('tmp/eval/canvas');
    const record = JSON.parse(payload.trim()) as Record<string, unknown>;
    expect(record).toMatchObject({
      type: 'canvas_decision',
      recipeId: 'R2',
      persona: 'team',
      decisionSource: 'llm',
      componentCount: 6,
      intentTags: ['integrations', 'invites'],
      reasoning: 'Mentioned team and Slack integrations',
    });
    expect(typeof record.createdAt).toBe('string');
    expect(record.promptVersion).toBeDefined();
    expect(record.modelName).toBeDefined();
  });

  it('skips logging when eval logging disabled', async () => {
    process.env.ENABLE_EVAL_LOGGING = 'false';

    const { logCanvasDecision } = await import('../eval-logger');

    await logCanvasDecision({
      message: 'Solo notes',
      recipeId: 'R1',
      persona: 'explorer',
      intentTags: ['solo'],
      confidence: 0.5,
      decisionSource: 'heuristics',
      componentCount: 4,
      fallbackUsed: true,
      reasoning: 'Defaulted to explorer',
    });

    expect(mkdirMock).not.toHaveBeenCalled();
    expect(appendFileMock).not.toHaveBeenCalled();
  });
});
