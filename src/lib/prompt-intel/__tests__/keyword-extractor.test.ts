import { extractSignalsFromKeywords } from '../keyword-extractor';

describe('extractSignalsFromKeywords', () => {
  it('detects headcount, tools, compliance tags, and tone signals', () => {
    const prompt =
      "Need a punchy migration plan for our 40-person healthcare onboarding team. Must stay HIPAA compliant and integrate Zendesk without slowing the go-live.";

    const result = extractSignalsFromKeywords(prompt);

    expect(result.teamSizeBracket?.value).toBe('25+');
    expect(result.teamSizeBracket?.metadata.source).toBe('keyword');
    expect(result.teamSizeBracket?.metadata.notes).toContain('40-person');

    expect(result.tools?.value).toEqual(expect.arrayContaining(['Zendesk']));
    expect(result.tools?.value).toHaveLength(1);
    expect(result.tools?.metadata.confidence).toBe(1);

    expect(result.complianceTags?.value).toEqual(expect.arrayContaining(['HIPAA']));
    expect(result.complianceTags?.metadata.notes).toContain('HIPAA');

    expect(result.copyTone?.value).toBe('fast-paced');
    expect(result.copyTone?.metadata.notes).toContain('punchy');
  });

  it('prefers explicit headcount mentions over ranges', () => {
    const prompt =
      'Supporting squads of 5-10 people, but right now an 8-person pilot team is standing up ServiceNow workflows.';

    const result = extractSignalsFromKeywords(prompt);

    expect(result.teamSizeBracket?.value).toBe('1-9');
    expect(result.teamSizeBracket?.metadata.notes).toContain('8-person');

    expect(result.tools?.value).toEqual(expect.arrayContaining(['ServiceNow']));
  });

  it('falls back to general compliance tag and deduplicates tool matches', () => {
    const prompt =
      'Looking for a collaboration hub that keeps us in regulatory compliance. Slack is already our source of truth across Slack channels.';

    const result = extractSignalsFromKeywords(prompt);

    expect(result.complianceTags?.value).toEqual(['other']);
    expect(result.tools?.value).toEqual(['Slack']);
  });

  it('returns an empty partial when no keywords are detected', () => {
    const result = extractSignalsFromKeywords('Tell me more about your product features.');
    expect(result).toEqual({});
  });
});
