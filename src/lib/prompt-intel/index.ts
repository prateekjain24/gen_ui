import { extractSignalsFromKeywords } from './keyword-extractor';
import { fetchSignalsFromLLM } from './llm-parser';
import type {
  PromptSignalMetadata,
  PromptSignalSource,
  PromptSignalValue,
  PromptSignals,
  PromptSignalsPartial,
} from './types';

import { isPromptIntelEnabled } from '@/lib/config/toggles';
import { createDebugger } from '@/lib/utils/debug';

const debug = createDebugger('PromptIntel:Merger');

const DEFAULT_LLM_CONFIDENCE_THRESHOLD = 0.75;
const DEFAULT_CONFIDENCE = 0;

export interface BuildPromptSignalsOptions {
  signal?: AbortSignal;
  llmConfidenceThreshold?: number;
}

export interface PromptSignalSummary {
  key: keyof PromptSignals;
  value: unknown;
  source: PromptSignalSource;
  confidence: number;
  notes?: string;
}

export async function buildPromptSignals(
  prompt: string,
  options: BuildPromptSignalsOptions = {}
): Promise<PromptSignals> {
  if (!isPromptIntelEnabled()) {
    return createDefaultSignals();
  }

  const threshold = clampConfidence(
    options.llmConfidenceThreshold ?? DEFAULT_LLM_CONFIDENCE_THRESHOLD
  );

  const normalizedPrompt = prompt.trim();
  if (!normalizedPrompt) {
    debug('buildPromptSignals received empty prompt');
    return createDefaultSignals();
  }

  const keywordSignals = extractSignalsFromKeywords(normalizedPrompt);
  debug('Keyword signals extracted: %o', Object.keys(keywordSignals));

  let llmSignals: PromptSignalsPartial = {};
  try {
    llmSignals = await fetchSignalsFromLLM(normalizedPrompt, options.signal);
  } catch (error) {
    debug('LLM parser threw error, continuing with keyword results', error);
  }

  debug('LLM signals extracted: %o', Object.keys(llmSignals));

  const merged = mergeSignals(keywordSignals, llmSignals, threshold);
  debug('Merged prompt signals ready with sources: %o', summarizePromptSignals(merged));
  return merged;
}

export function summarizePromptSignals(signals: PromptSignals): PromptSignalSummary[] {
  return (Object.entries(signals) as Array<[
    keyof PromptSignals,
    PromptSignalValue<unknown>,
  ]>).map(([key, entry]) => ({
    key,
    value: entry.value,
    source: entry.metadata.source,
    confidence: clampConfidence(entry.metadata.confidence),
    notes: entry.metadata.notes,
  }));
}

function mergeSignals(
  keywordSignals: PromptSignalsPartial,
  llmSignals: PromptSignalsPartial,
  threshold: number
): PromptSignals {
  const defaults = createDefaultSignals();
  const result: PromptSignals = { ...defaults };

  applyMerge('teamSizeBracket', result, keywordSignals, llmSignals, threshold, valuesEqual);
  applyMerge('decisionMakers', result, keywordSignals, llmSignals, threshold, valuesEqual);
  applyMerge('approvalChainDepth', result, keywordSignals, llmSignals, threshold);
  applyMerge('tools', result, keywordSignals, llmSignals, threshold, arrayEqual);
  applyMerge('integrationCriticality', result, keywordSignals, llmSignals, threshold);
  applyMerge('complianceTags', result, keywordSignals, llmSignals, threshold, arrayEqual);
  applyMerge('copyTone', result, keywordSignals, llmSignals, threshold);
  applyMerge('industry', result, keywordSignals, llmSignals, threshold);
  applyMerge('primaryObjective', result, keywordSignals, llmSignals, threshold);
  applyMerge('constraints', result, keywordSignals, llmSignals, threshold, valuesEqual);
  applyMerge('operatingRegion', result, keywordSignals, llmSignals, threshold);

  return result;
}

function applyMerge<K extends keyof PromptSignals>(
  key: K,
  target: PromptSignals,
  keywordSignals: PromptSignalsPartial,
  llmSignals: PromptSignalsPartial,
  threshold: number,
  comparator: (a: unknown, b: unknown) => boolean = strictEqual
) {
  const base = target[key] as PromptSignalValue<unknown>;
  const keyword = keywordSignals[key] as PromptSignalValue<unknown> | undefined;
  const llm = llmSignals[key] as PromptSignalValue<unknown> | undefined;

  target[key] = resolveSignal(base, keyword, llm, threshold, comparator) as PromptSignals[K];
}

function resolveSignal<T>(
  base: PromptSignalValue<T>,
  keyword: PromptSignalValue<T> | undefined,
  llm: PromptSignalValue<T> | undefined,
  threshold: number,
  comparator: (a: unknown, b: unknown) => boolean
): PromptSignalValue<T> {
  if (!keyword && !llm) {
    return base;
  }

  if (keyword && !llm) {
    return cloneSignal(keyword);
  }

  if (!keyword && llm) {
    return normaliseMetadata(cloneSignal(llm), 'llm');
  }

  if (!keyword || !llm) {
    return base;
  }

  const valuesMatch = comparator(keyword.value, llm.value);

  if (valuesMatch) {
    return createMergedValue(keyword.value, keyword.metadata, llm.metadata);
  }

  const llmConfidence = clampConfidence(llm.metadata.confidence ?? DEFAULT_CONFIDENCE);
  if (llmConfidence >= threshold) {
    return {
      value: llm.value,
      metadata: {
        source: 'llm',
        confidence: llmConfidence,
        notes: appendNotes('LLM override of keyword value', llm.metadata.notes, keyword.metadata.notes),
      },
    };
  }

  return {
    value: keyword.value,
    metadata: {
      source: 'keyword',
      confidence: clampConfidence(keyword.metadata.confidence ?? 1),
      notes: appendNotes('Keyword preferred over lower-confidence LLM', keyword.metadata.notes, llm.metadata.notes),
    },
  };
}

function createMergedValue<T>(
  value: T,
  keywordMeta: PromptSignalMetadata,
  llmMeta: PromptSignalMetadata
): PromptSignalValue<T> {
  const confidence = Math.max(
    clampConfidence(keywordMeta.confidence ?? DEFAULT_CONFIDENCE),
    clampConfidence(llmMeta.confidence ?? DEFAULT_CONFIDENCE)
  );

  return {
    value,
    metadata: {
      source: 'merge',
      confidence,
      notes: appendNotes('Keyword and LLM agreement', keywordMeta.notes, llmMeta.notes),
    },
  };
}

function cloneSignal<T>(signal: PromptSignalValue<T>): PromptSignalValue<T> {
  return {
    value: signal.value,
    metadata: { ...signal.metadata },
  };
}

function normaliseMetadata<T>(signal: PromptSignalValue<T>, expectedSource: PromptSignalSource): PromptSignalValue<T> {
  if (signal.metadata.source === expectedSource) {
    signal.metadata.confidence = clampConfidence(signal.metadata.confidence ?? DEFAULT_CONFIDENCE);
    return signal;
  }

  return {
    value: signal.value,
    metadata: {
      source: expectedSource,
      confidence: clampConfidence(signal.metadata.confidence ?? DEFAULT_CONFIDENCE),
      notes: signal.metadata.notes,
    },
  };
}

function createDefaultSignals(): PromptSignals {
  return {
    teamSizeBracket: defaultValue('unknown'),
    decisionMakers: defaultValue([]),
    approvalChainDepth: defaultValue('unknown'),
    tools: defaultValue([]),
    integrationCriticality: defaultValue('unspecified'),
    complianceTags: defaultValue([]),
    copyTone: defaultValue('neutral'),
    industry: defaultValue('other'),
    primaryObjective: defaultValue('other'),
    constraints: defaultValue({}),
    operatingRegion: defaultValue('unspecified'),
  };
}

function defaultValue<T>(value: T): PromptSignalValue<T> {
  return {
    value,
    metadata: {
      source: 'merge',
      confidence: DEFAULT_CONFIDENCE,
    },
  };
}

function appendNotes(
  leading: string | undefined,
  ...notes: Array<string | undefined>
): string | undefined {
  const parts = [leading, ...notes].filter((part): part is string => Boolean(part && part.trim()));
  if (!parts.length) {
    return undefined;
  }

  const combined = parts.join(' | ');
  return combined.length > 160 ? combined.slice(0, 160) : combined;
}

function strictEqual(a: unknown, b: unknown): boolean {
  return Object.is(a, b);
}

function arrayEqual(a: unknown, b: unknown): boolean {
  if (!Array.isArray(a) || !Array.isArray(b)) {
    return false;
  }

  if (a.length !== b.length) {
    return false;
  }

  for (let i = 0; i < a.length; i += 1) {
    if (!valuesEqual(a[i], b[i])) {
      return false;
    }
  }

  return true;
}

function valuesEqual(a: unknown, b: unknown): boolean {
  if (Object.is(a, b)) {
    return true;
  }

  if (Array.isArray(a) && Array.isArray(b)) {
    return arrayEqual(a, b);
  }

  if (isPlainObject(a) && isPlainObject(b)) {
    const aKeys = Object.keys(a as Record<string, unknown>);
    const bKeys = Object.keys(b as Record<string, unknown>);

    if (aKeys.length !== bKeys.length) {
      return false;
    }

    for (const key of aKeys) {
      if (!valuesEqual((a as Record<string, unknown>)[key], (b as Record<string, unknown>)[key])) {
        return false;
      }
    }

    return true;
  }

  return false;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function clampConfidence(value: number): number {
  if (!Number.isFinite(value)) {
    return DEFAULT_CONFIDENCE;
  }
  return Math.min(1, Math.max(0, value));
}
