import { TOOL_DEFINITIONS } from './tool-definitions';
import type {
  CopyTone,
  ComplianceTag,
  PromptSignalMetadata,
  PromptSignalValue,
  PromptSignalsPartial,
  TeamSizeBracket,
  ToolIdentifier,
} from './types';

import { createDebugger } from '@/lib/utils/debug';

const debug = createDebugger('PromptIntel:KeywordExtractor');

const KEYWORD_CONFIDENCE = 1;

interface NormalizedPrompt {
  original: string;
  lower: string;
  sanitized: string;
}

const TOOL_KEYWORDS: Record<ToolIdentifier, string[]> = TOOL_DEFINITIONS.reduce(
  (accumulator, definition) => {
    accumulator[definition.id] = definition.keywords;
    return accumulator;
  },
  {} as Record<ToolIdentifier, string[]>
);

const COMPLIANCE_KEYWORDS: Record<Exclude<ComplianceTag, 'other'>, string[]> = {
  SOC2: ['soc2', 'soc 2'],
  HIPAA: ['hipaa'],
  ISO27001: ['iso27001', 'iso 27001'],
  GDPR: ['gdpr', 'privacy law', 'privacy regulation'],
  SOX: ['sox', 'sarbanes-oxley', 'sarbanes oxley'],
  audit: ['audit ready', 'audit-ready', 'audit'],
  'regulated-industry': ['regulated industry', 'highly regulated', 'regulated market'],
};

const GENERAL_COMPLIANCE_KEYWORDS = ['compliance', 'regulatory', 'regulation'];

const TONE_KEYWORDS: Array<{ tone: CopyTone; keywords: string[] }> = [
  {
    tone: 'fast-paced',
    keywords: ['fast paced', 'fast-paced', 'punchy', 'energetic', 'snappy', 'quick turnaround'],
  },
  {
    tone: 'meticulous',
    keywords: ['meticulous', 'detailed', 'thorough', 'buttoned up', 'buttoned-up', 'compliance focused'],
  },
  {
    tone: 'trusted-advisor',
    keywords: ['trusted advisor', 'trusted-advisor', 'advisory', 'consultative', 'guidance'],
  },
  {
    tone: 'onboarding',
    keywords: ['onboarding', 'welcome experience', 'getting started'],
  },
  {
    tone: 'migration',
    keywords: ['migration', 'cutover', 'data move'],
  },
];

const SOLO_KEYWORDS = ['solo', 'just me', 'individual contributor', 'one person', 'single founder'];
const SMALL_TEAM_KEYWORDS = ['small team', 'under 10', 'less than 10', 'tiny team'];
const MID_TEAM_KEYWORDS = ['mid-sized team', 'mid size team', 'mid team', 'growth team'];
const LARGE_TEAM_KEYWORDS = ['large team', 'enterprise team', 'big team', 'over 25'];

export function extractSignalsFromKeywords(prompt: string): PromptSignalsPartial {
  const partial: PromptSignalsPartial = {};

  if (!prompt || !prompt.trim()) {
    debug('No prompt provided to keyword extractor');
    return partial;
  }

  const normalized = normalizePrompt(prompt);

  const teamSize = detectTeamSize(normalized);
  if (teamSize) {
    partial.teamSizeBracket = teamSize;
  }

  const tools = detectTools(normalized);
  if (tools) {
    partial.tools = tools;
  }

  const compliance = detectCompliance(normalized);
  if (compliance) {
    partial.complianceTags = compliance;
  }

  const tone = detectTone(normalized);
  if (tone) {
    partial.copyTone = tone;
  }

  if (Object.keys(partial).length === 0) {
    debug('No keyword signals detected for prompt snippet: "%s"', normalized.original.slice(0, 80));
  }

  return partial;
}

function normalizePrompt(prompt: string): NormalizedPrompt {
  const lower = prompt.toLowerCase();
  const sanitized = lower.replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();

  return {
    original: prompt,
    lower,
    sanitized,
  };
}

function detectTeamSize(normalized: NormalizedPrompt): PromptSignalValue<TeamSizeBracket> | undefined {
  const { lower, original } = normalized;

  for (const phrase of SOLO_KEYWORDS) {
    if (lower.includes(phrase)) {
      return signalValue('solo', `keyword: ${phrase}`);
    }
  }

  const rangeMatches = collectRangeMatches(original);

  const explicitRegex = /(\d{1,3})(?:\s*-\s*(?=person|people|member|team))?\s*(?:person|people|member|team)s?\b/gi;
  let explicitMatch: RegExpExecArray | null;
  while ((explicitMatch = explicitRegex.exec(original)) !== null) {
    if (isWithinRange(rangeMatches, explicitMatch.index)) {
      continue;
    }

    const value = Number(explicitMatch[1]);
    const bracket = bracketForHeadcount(value);
    if (bracket) {
      return signalValue(bracket, `matched explicit headcount "${explicitMatch[0]}"`);
    }
  }

  const plusRegex = /(\d{1,3})\s*\+/gi;
  let plusMatch: RegExpExecArray | null;
  while ((plusMatch = plusRegex.exec(original)) !== null) {
    if (isWithinRange(rangeMatches, plusMatch.index)) {
      continue;
    }

    const value = Number(plusMatch[1]);
    const bracket = bracketForHeadcount(value < 25 ? value : 25);
    if (bracket) {
      return signalValue(bracket, `matched plus headcount "${plusMatch[0]}"`);
    }
  }

  if (rangeMatches.length > 0) {
    const [firstRange] = rangeMatches;
    const bracket = bracketForHeadcount(Math.round((firstRange.min + firstRange.max) / 2));
    if (bracket) {
      return signalValue(bracket, `matched range "${firstRange.raw}"`);
    }
  }

  for (const phrase of SMALL_TEAM_KEYWORDS) {
    if (lower.includes(phrase)) {
      return signalValue('1-9', `keyword: ${phrase}`);
    }
  }

  for (const phrase of MID_TEAM_KEYWORDS) {
    if (lower.includes(phrase)) {
      return signalValue('10-24', `keyword: ${phrase}`);
    }
  }

  for (const phrase of LARGE_TEAM_KEYWORDS) {
    if (lower.includes(phrase)) {
      return signalValue('25+', `keyword: ${phrase}`);
    }
  }

  const looseNumberRegex = /(\d{1,3})/gi;
  let looseMatch: RegExpExecArray | null;
  while ((looseMatch = looseNumberRegex.exec(original)) !== null) {
    if (isWithinRange(rangeMatches, looseMatch.index)) {
      continue;
    }

    const value = Number(looseMatch[1]);
    const bracket = bracketForHeadcount(value);
    if (bracket) {
      return signalValue(bracket, `matched numeric headcount "${looseMatch[0]}"`);
    }
  }

  return undefined;
}

function detectTools(normalized: NormalizedPrompt): PromptSignalValue<ToolIdentifier[]> | undefined {
  const matchedTools: ToolIdentifier[] = [];
  const notes: string[] = [];

  for (const [tool, keywords] of Object.entries(TOOL_KEYWORDS) as Array<[
    ToolIdentifier,
    string[],
  ]>) {
    if (tool === 'Other') {
      continue;
    }

    const hit = keywords.find((keyword) => normalized.sanitized.includes(keyword));
    if (hit) {
      matchedTools.push(tool);
      notes.push(`${tool} (${hit})`);
    }
  }

  if (matchedTools.length === 0) {
    return undefined;
  }

  const uniqueTools = Array.from(new Set(matchedTools));

  return signalValue(uniqueTools, `keywords: ${notes.join(', ')}`);
}

function detectCompliance(normalized: NormalizedPrompt): PromptSignalValue<ComplianceTag[]> | undefined {
  const matches = new Set<ComplianceTag>();
  const notes: string[] = [];

  for (const [tag, keywords] of Object.entries(COMPLIANCE_KEYWORDS) as Array<[
    Exclude<ComplianceTag, 'other'>,
    string[],
  ]>) {
    const hit = keywords.find((keyword) => normalized.sanitized.includes(keyword));
    if (hit) {
      matches.add(tag);
      notes.push(`${tag} (${hit})`);
    }
  }

  if (matches.size === 0) {
    const generalHit = GENERAL_COMPLIANCE_KEYWORDS.find((keyword) =>
      normalized.sanitized.includes(keyword),
    );
    if (generalHit) {
      matches.add('other');
      notes.push(`other (${generalHit})`);
    }
  }

  if (matches.size === 0) {
    return undefined;
  }

  return signalValue(Array.from(matches), `keywords: ${notes.join(', ')}`);
}

function detectTone(normalized: NormalizedPrompt): PromptSignalValue<CopyTone> | undefined {
  for (const { tone, keywords } of TONE_KEYWORDS) {
    const hit = keywords.find((keyword) => normalized.sanitized.includes(keyword));
    if (hit) {
      return signalValue(tone, `keyword: ${hit}`);
    }
  }

  return undefined;
}

function bracketForHeadcount(value: number): TeamSizeBracket | undefined {
  if (Number.isNaN(value) || value <= 0) {
    return undefined;
  }

  if (value <= 1) {
    return 'solo';
  }

  if (value <= 9) {
    return '1-9';
  }

  if (value <= 24) {
    return '10-24';
  }

  return '25+';
}

interface RangeMatch {
  start: number;
  end: number;
  min: number;
  max: number;
  raw: string;
}

function collectRangeMatches(text: string): RangeMatch[] {
  const regex = /(\d{1,3})\s*(?:-|to)\s*(\d{1,3})/gi;
  const matches: RangeMatch[] = [];
  let match: RegExpExecArray | null;

  while ((match = regex.exec(text)) !== null) {
    matches.push({
      start: match.index,
      end: regex.lastIndex,
      min: Number(match[1]),
      max: Number(match[2]),
      raw: match[0],
    });
  }

  return matches;
}

function isWithinRange(ranges: RangeMatch[], index: number): boolean {
  return ranges.some((range) => index >= range.start && index < range.end);
}

function signalValue<T>(value: T, notes?: string): PromptSignalValue<T> {
  return {
    value,
    metadata: makeMetadata(notes),
  };
}

function makeMetadata(notes?: string): PromptSignalMetadata {
  return {
    source: 'keyword',
    confidence: KEYWORD_CONFIDENCE,
    ...(notes ? { notes } : {}),
  };
}
