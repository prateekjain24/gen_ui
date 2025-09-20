import { generateText } from 'ai';
import { z } from 'zod';

import { TOOL_LOOKUP } from './tool-definitions';
import type {
  ApprovalChainDepth,
  ConstraintSignal,
  CopyTone,
  DecisionMakerSignal,
  IndustryTag,
  OperatingRegion,
  PrimaryObjective,
  PromptSignalValue,
  PromptSignalsPartial,
  TeamSizeBracket,
  ToolIdentifier,
} from './types';

import { LLM_CONFIG } from '@/lib/constants';
import { getOpenAIProvider } from '@/lib/llm/client';
import { recordLLMUsage } from '@/lib/llm/usage-tracker';
import { withTimeout } from '@/lib/runtime/with-timeout';
import { createDebugger, debugError } from '@/lib/utils/debug';

type IntegrationCriticality = NonNullable<PromptSignalsPartial['integrationCriticality']>['value'];
type ComplianceTag = NonNullable<PromptSignalsPartial['complianceTags']>['value'][number];

type ParsedSignal<T> = {
  value: T;
  confidence?: number;
  notes?: string;
};

const debug = createDebugger('PromptIntel:LLMParser');

const PROMPT_TIMEOUT_MS = 30_000;
const MAX_OUTPUT_TOKENS = 1_200;
const DEFAULT_CONFIDENCE = 0.6;

const SYSTEM_PROMPT = `You are the Prompt Intelligence extraction service. Convert user workspace briefs into structured JSON signals.\n- Respond with ONLY a JSON object that matches the schema below. No commentary.\n- Omit any field you cannot determine confidently.\n- Populate confidences between 0 and 1.\n\nSchema (partial fields allowed):\n{\n  "teamSizeBracket": { "value": "solo|1-9|10-24|25+|unknown", "confidence": 0-1, "notes": string? },\n  "decisionMakers": { "value": [ { "role": string, "seniority": "ic|manager|director+", "isPrimary": boolean } ], "confidence": 0-1, "notes": string? },\n  "approvalChainDepth": { "value": "single|dual|multi|unknown", ... },\n  "tools": { "value": ["Slack|Jira|Notion|Salesforce|Asana|ServiceNow|Zendesk|Other"...], ... },\n  "integrationCriticality": { "value": "must-have|nice-to-have|unspecified", ... },\n  "complianceTags": { "value": ["SOC2|HIPAA|ISO27001|GDPR|SOX|audit|regulated-industry|other"...], ... },\n  "copyTone": { "value": "fast-paced|meticulous|trusted-advisor|onboarding|migration|neutral", ... },\n  "industry": { "value": "saas|fintech|healthcare|education|manufacturing|public-sector|other", ... },\n  "primaryObjective": { "value": "launch|scale|migrate|optimize|compliance|other", ... },\n  "constraints": { "value": { "timeline": "rush|standard|flexible"?, "budget": "tight|standard|premium"?, "notes": string? }, ... },\n  "operatingRegion": { "value": "na|emea|latam|apac|global|unspecified", ... }\n}\n`;

const payloadSchema = z
  .object({})
  .catchall(z.unknown());

const teamSizeSchema = z
  .enum(['solo', '1-9', '10-24', '25+', 'unknown'])
  .transform(value => value as TeamSizeBracket);

const decisionMakerSchema = z
  .object({
    role: z
      .string()
      .trim()
      .min(1)
      .max(80)
      .transform(value => value),
    seniority: z.enum(['ic', 'manager', 'director+']),
    isPrimary: z.boolean(),
  })
  .transform<DecisionMakerSignal>(value => ({
    role: value.role,
    seniority: value.seniority,
    isPrimary: value.isPrimary,
  }));

const decisionMakerArraySchema = z
  .array(decisionMakerSchema)
  .min(1)
  .max(5)
  .transform<DecisionMakerSignal[]>(values => values);

const approvalDepthSchema = z
  .enum(['single', 'dual', 'multi', 'unknown'])
  .transform(value => value as ApprovalChainDepth);

const normalizeToolName = (value: string): string =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const toolSchema = z
  .string()
  .transform<ToolIdentifier>(value => {
    const normalized = normalizeToolName(value);
    return TOOL_LOOKUP[normalized] ?? 'Other';
  });

const toolArraySchema = z
  .array(toolSchema)
  .min(1)
  .max(8)
  .transform<ToolIdentifier[]>(values => {
    const deduped: ToolIdentifier[] = [];
    const seen = new Set<ToolIdentifier>();
    for (const entry of values) {
      if (!seen.has(entry)) {
        seen.add(entry);
        deduped.push(entry);
      }
    }
    return deduped;
  });

const integrationCriticalitySchema = z
  .enum(['must-have', 'nice-to-have', 'unspecified'])
  .transform(value => value as IntegrationCriticality);

const complianceTagSchema = z
  .enum(['SOC2', 'HIPAA', 'ISO27001', 'GDPR', 'SOX', 'audit', 'regulated-industry', 'other'])
  .transform(value => value as ComplianceTag);

const complianceArraySchema = z
  .array(complianceTagSchema)
  .min(1)
  .max(8)
  .transform<ComplianceTag[]>(values => {
    const deduped: ComplianceTag[] = [];
    const seen = new Set<ComplianceTag>();
    for (const entry of values) {
      if (!seen.has(entry)) {
        seen.add(entry);
        deduped.push(entry);
      }
    }
    return deduped;
  });

const toneSchema = z
  .enum(['fast-paced', 'meticulous', 'trusted-advisor', 'onboarding', 'migration', 'neutral'])
  .transform(value => value as CopyTone);

const industrySchema = z
  .enum(['saas', 'fintech', 'healthcare', 'education', 'manufacturing', 'public-sector', 'other'])
  .transform(value => value as IndustryTag);

const primaryObjectiveSchema = z
  .enum(['launch', 'scale', 'migrate', 'optimize', 'compliance', 'other'])
  .transform(value => value as PrimaryObjective);

const constraintSchema = z
  .object({
    timeline: z.enum(['rush', 'standard', 'flexible']).optional(),
    budget: z.enum(['tight', 'standard', 'premium']).optional(),
    notes: z
      .string()
      .trim()
      .max(160)
      .optional(),
  })
  .transform<ConstraintSignal>(value => {
    const constraint: ConstraintSignal = {};
    if (value.timeline) {
      constraint.timeline = value.timeline;
    }
    if (value.budget) {
      constraint.budget = value.budget;
    }
    if (value.notes && value.notes.trim().length > 0) {
      constraint.notes = value.notes.trim();
    }
    return constraint;
  });

const regionSchema = z
  .enum(['na', 'emea', 'latam', 'apac', 'global', 'unspecified'])
  .transform(value => value as OperatingRegion);

export async function fetchSignalsFromLLM(
  prompt: string,
  abortSignal?: AbortSignal
): Promise<PromptSignalsPartial> {
  if (!prompt.trim()) {
    return {};
  }

  if (!process.env.OPENAI_API_KEY) {
    debug('OPENAI_API_KEY is not configured; skipping LLM parser');
    return {};
  }

  try {
    const openai = getOpenAIProvider();

    const response = await withTimeout(async timeoutSignal => {
      const combined = combineSignals(timeoutSignal, abortSignal);
      try {
        const output = await generateText({
          model: openai(LLM_CONFIG.model),
          system: SYSTEM_PROMPT,
          prompt: buildUserPrompt(prompt),
          maxOutputTokens: MAX_OUTPUT_TOKENS,
          abortSignal: combined.signal,
          maxRetries: 0,
        });

        recordLLMUsage(output.usage ?? null);
        return output;
      } finally {
        combined.cleanup();
      }
    }, { timeoutMs: PROMPT_TIMEOUT_MS });

    const raw = response.text ?? '';
    const jsonText = extractJsonSnippet(raw);
    if (!jsonText) {
      debug('LLM parser returned empty or non-JSON response');
      return {};
    }

    let payload: unknown;
    try {
      payload = JSON.parse(jsonText);
    } catch (error) {
      debugError('Failed to parse LLM parser JSON payload', error);
      return {};
    }

    const signals = parseSignals(payload);
    debug('LLM parser extracted signals: %o', Object.keys(signals));
    return signals;
  } catch (error) {
    if ((error as Error | undefined)?.name === 'AbortError') {
      debug('LLM parser aborted for prompt snippet: %s', prompt.slice(0, 60));
      return {};
    }

    debugError('LLM parser call failed', error);
    return {};
  }
}

function parseSignals(payload: unknown): PromptSignalsPartial {
  const base = payloadSchema.safeParse(payload);
  if (!base.success) {
    throw new Error('LLM parser payload is not an object');
  }

  const data = base.data as Record<string, unknown>;
  const result: PromptSignalsPartial = {};

  const teamSize = parseSignal('teamSizeBracket', data.teamSizeBracket, teamSizeSchema);
  const decisionMakers = parseSignal('decisionMakers', data.decisionMakers, decisionMakerArraySchema);
  const approvalChainDepth = parseSignal('approvalChainDepth', data.approvalChainDepth, approvalDepthSchema);
  const tools = parseSignal('tools', data.tools, toolArraySchema, value => (value.length ? value : undefined));
  const integrationCriticality = parseSignal(
    'integrationCriticality',
    data.integrationCriticality,
    integrationCriticalitySchema
  );
  const complianceTags = parseSignal(
    'complianceTags',
    data.complianceTags,
    complianceArraySchema,
    value => (value.length ? value : undefined)
  );
  const copyTone = parseSignal('copyTone', data.copyTone, toneSchema);
  const industry = parseSignal('industry', data.industry, industrySchema);
  const primaryObjective = parseSignal('primaryObjective', data.primaryObjective, primaryObjectiveSchema);
  const constraints = parseSignal('constraints', data.constraints, constraintSchema, value => {
    if (!value.timeline && !value.budget && !value.notes) {
      return undefined;
    }
    return value;
  });
  const operatingRegion = parseSignal('operatingRegion', data.operatingRegion, regionSchema);

  const teamSizeValue = teamSize && toPromptSignalValue(teamSize);
  if (teamSizeValue) {
    result.teamSizeBracket = teamSizeValue;
  }

  const decisionMakerValue = decisionMakers && toPromptSignalValue(decisionMakers);
  if (decisionMakerValue) {
    result.decisionMakers = decisionMakerValue;
  }

  const approvalValue = approvalChainDepth && toPromptSignalValue(approvalChainDepth);
  if (approvalValue) {
    result.approvalChainDepth = approvalValue;
  }

  const toolsValue = tools && toPromptSignalValue(tools);
  if (toolsValue) {
    result.tools = toolsValue;
  }

  const integrationValue = integrationCriticality && toPromptSignalValue(integrationCriticality);
  if (integrationValue) {
    result.integrationCriticality = integrationValue;
  }

  const complianceValue = complianceTags && toPromptSignalValue(complianceTags);
  if (complianceValue) {
    result.complianceTags = complianceValue;
  }

  const toneValue = copyTone && toPromptSignalValue(copyTone);
  if (toneValue) {
    result.copyTone = toneValue;
  }

  const industryValue = industry && toPromptSignalValue(industry);
  if (industryValue) {
    result.industry = industryValue;
  }

  const objectiveValue = primaryObjective && toPromptSignalValue(primaryObjective);
  if (objectiveValue) {
    result.primaryObjective = objectiveValue;
  }

  const constraintsValue = constraints && toPromptSignalValue(constraints);
  if (constraintsValue) {
    result.constraints = constraintsValue;
  }

  const regionValue = operatingRegion && toPromptSignalValue(operatingRegion);
  if (regionValue) {
    result.operatingRegion = regionValue;
  }

  return result;
}

function parseSignal<T>(
  key: string,
  raw: unknown,
  schema: z.ZodType<T>,
  sanitizer?: (value: T) => T | undefined
): ParsedSignal<T> | undefined {
  if (raw === undefined || raw === null) {
    return undefined;
  }

  if (typeof raw === 'object' && !Array.isArray(raw) && 'value' in (raw as Record<string, unknown>)) {
    const container = raw as Record<string, unknown>;
    const parsedValue = schema.safeParse(container.value);
    if (!parsedValue.success) {
      throw new Error(`Invalid value for ${key}`);
    }

    let nextValue = parsedValue.data;
    if (sanitizer) {
      const sanitized = sanitizer(nextValue);
      if (sanitized === undefined) {
        return undefined;
      }
      nextValue = sanitized;
    }

    const confidence = normalizeConfidence(container.confidence);
    const notes = normalizeNotes(container.notes);

    return {
      value: nextValue,
      confidence,
      notes,
    };
  }

  const parsedValue = schema.safeParse(raw);
  if (!parsedValue.success) {
    throw new Error(`Invalid value for ${key}`);
  }

  let value = parsedValue.data;
  if (sanitizer) {
    const sanitized = sanitizer(value);
    if (sanitized === undefined) {
      return undefined;
    }
    value = sanitized;
  }

  return { value };
}

function toPromptSignalValue<T>(signal: ParsedSignal<T>): PromptSignalValue<T> | undefined {
  if (signal.value === undefined) {
    return undefined;
  }

  return {
    value: signal.value,
    metadata: {
      source: 'llm',
      confidence: clampConfidence(signal.confidence ?? DEFAULT_CONFIDENCE),
      ...(signal.notes ? { notes: signal.notes } : {}),
    },
  };
}

function normalizeConfidence(value: unknown): number | undefined {
  if (typeof value !== 'number' || Number.isNaN(value)) {
    return undefined;
  }

  return clampConfidence(value);
}

function clampConfidence(value: number): number {
  if (!Number.isFinite(value)) {
    return DEFAULT_CONFIDENCE;
  }

  return Math.min(1, Math.max(0, value));
}

function normalizeNotes(value: unknown): string | undefined {
  if (typeof value !== 'string') {
    return undefined;
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return undefined;
  }

  return trimmed.length > 160 ? trimmed.slice(0, 160) : trimmed;
}

function extractJsonSnippet(text: string): string {
  let output = text.trim();
  if (!output) {
    return '';
  }

  if (output.startsWith('```')) {
    output = output.replace(/^```(?:json)?/i, '').replace(/```$/, '').trim();
  }

  const start = output.indexOf('{');
  const end = output.lastIndexOf('}');
  if (start === -1 || end === -1 || end <= start) {
    return '';
  }

  return output.slice(start, end + 1);
}

function buildUserPrompt(prompt: string): string {
  return `Prompt:\n"""${prompt.trim()}"""\nExtract the taxonomy signals. Remember to respond with JSON only.`;
}

function combineSignals(...signals: Array<AbortSignal | undefined>) {
  const controller = new AbortController();
  const cleanups: Array<() => void> = [];

  const abort = (reason?: unknown) => {
    if (!controller.signal.aborted) {
      controller.abort(reason);
    }
  };

  for (const signal of signals) {
    if (!signal) {
      continue;
    }

    if (signal.aborted) {
      abort(signal.reason);
      continue;
    }

    const handler = () => abort(signal.reason);
    signal.addEventListener('abort', handler, { once: true });
    cleanups.push(() => signal.removeEventListener('abort', handler));
  }

  return {
    signal: controller.signal,
    cleanup: () => {
      for (const cleanup of cleanups) {
        cleanup();
      }
    },
  };
}
