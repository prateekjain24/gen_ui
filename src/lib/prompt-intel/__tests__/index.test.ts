import fixtures from '../__fixtures__';
import { buildPromptSignals, summarizePromptSignals } from '../index';
import { extractSignalsFromKeywords } from '../keyword-extractor';

jest.mock('../llm-parser', () => ({
  fetchSignalsFromLLM: jest.fn(),
}));

jest.mock('@/lib/utils/debug', () => {
  const actual = jest.requireActual('@/lib/utils/debug');
  return {
    ...actual,
    createDebugger: jest.fn(() => jest.fn()),
  };
});

const { fetchSignalsFromLLM } = jest.requireMock('../llm-parser');

describe('buildPromptSignals', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('returns default signals for empty prompt', async () => {
    const result = await buildPromptSignals('   ');

    expect(result.teamSizeBracket.value).toBe('unknown');
    expect(result.teamSizeBracket.metadata.source).toBe('merge');
    expect(fetchSignalsFromLLM).not.toHaveBeenCalled();
  });

  it('uses keyword signals when LLM returns nothing', async () => {
    fetchSignalsFromLLM.mockResolvedValue({});

    const prompt =
      'Need a punchy migration plan for our 40-person healthcare onboarding team. Must stay HIPAA compliant and integrate Zendesk.';

    const keywordSignals = extractSignalsFromKeywords(prompt);
    const result = await buildPromptSignals(prompt);

    expect(fetchSignalsFromLLM).toHaveBeenCalledTimes(1);
    expect(result.teamSizeBracket.value).toBe(keywordSignals.teamSizeBracket?.value);
    expect(result.teamSizeBracket.metadata.source).toBe('keyword');
    expect(result.copyTone.value).toBe('fast-paced');
    expect(result.copyTone.metadata.source).toBe('keyword');
  });

  it('prefers LLM value when confidence exceeds threshold', async () => {
    fetchSignalsFromLLM.mockResolvedValue({
      teamSizeBracket: {
        value: '10-24',
        metadata: { source: 'llm', confidence: 0.92 },
      },
      copyTone: {
        value: 'meticulous',
        metadata: { source: 'llm', confidence: 0.88 },
      },
    });

    const prompt =
      'We are a 40-person operations crew rolling out Salesforce. Need punchy copy and Slack automation callouts.';

    const result = await buildPromptSignals(prompt);

    expect(result.teamSizeBracket.value).toBe('10-24');
    expect(result.teamSizeBracket.metadata.source).toBe('llm');
    expect(result.copyTone.value).toBe('meticulous');
    expect(result.copyTone.metadata.source).toBe('llm');
  });

  it('retains keyword value when LLM confidence is below threshold', async () => {
    fetchSignalsFromLLM.mockResolvedValue({
      tools: {
        value: ['Notion'],
        metadata: { source: 'llm', confidence: 0.5 },
      },
    });

    const prompt = 'Integrate Slack and Jira for our 12 person team.';

    const result = await buildPromptSignals(prompt);

    expect(result.tools.value).toEqual(['Slack', 'Jira']);
    expect(result.tools.metadata.source).toBe('keyword');
  });

  it('merges matching signals and reports combined summary', async () => {
    fetchSignalsFromLLM.mockResolvedValue({
      complianceTags: {
        value: ['HIPAA'],
        metadata: { source: 'llm', confidence: 0.7 },
      },
    });

    const prompt = 'HIPAA compliant workflows for healthcare onboarding.';
    const result = await buildPromptSignals(prompt);

    expect(result.complianceTags.metadata.source).toBe('merge');
    expect(result.complianceTags.metadata.confidence).toBeGreaterThanOrEqual(0.7);

    const summary = summarizePromptSignals(result);
    const complianceSummary = summary.find(item => item.key === 'complianceTags');
    expect(complianceSummary?.source).toBe('merge');
    expect(complianceSummary?.confidence).toBeGreaterThan(0.6);
  });
});

describe('prompt fixtures', () => {
  it.each(fixtures)("produces stable signals for %s", async fixture => {
    fetchSignalsFromLLM.mockReset();
    fetchSignalsFromLLM.mockResolvedValueOnce(fixture.llm ?? {});

    const result = await buildPromptSignals(fixture.prompt);
    const serializable = JSON.parse(JSON.stringify(result));

    expect(serializable).toMatchSnapshot(fixture.id);
  });
});
