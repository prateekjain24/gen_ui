import { createHash } from "node:crypto";

import { generateText } from "ai";
import { jsonrepair } from "jsonrepair";

import type { CanvasPersona, CanvasRecipeId } from "@/lib/canvas/recipes";
import { validateTemplateSlots, type SlotValidationIssue } from "@/lib/canvas/template-validator";
import { TEMPLATE_CATALOG, TEMPLATE_IDS, type Template, type TemplateId } from "@/lib/canvas/templates";
import { LLM_CONFIG } from "@/lib/constants";
import {
  getOpenAIProvider,
  retryWithExponentialBackoff,
  shouldRetryOnError,
  type BackoffSettings,
} from "@/lib/llm/client";
import type { RecipeKnobOverrides } from "@/lib/personalization/scoring";
import {
  templateCompletionCache,
  type TemplateCacheKeyInput,
  type TemplateCacheStatus,
} from "@/lib/prompt-intel/template-cache";
import type { PromptSignals } from "@/lib/prompt-intel/types";
import { withTimeout } from "@/lib/runtime/with-timeout";
import { createDebugger, debugError } from "@/lib/utils/debug";

const debug = createDebugger("Canvas:TemplateFill");

const TEMPLATE_TIMEOUT_MS = 30_000;

const TEMPLATE_RETRY: BackoffSettings = {
  maxAttempts: 2,
  initialDelay: 250,
  maxDelay: 1_000,
  backoffMultiplier: 2,
  jitterRatio: 0.2,
  sleep: async () => undefined,
};

export interface TemplateFillRequest {
  templateId: TemplateId;
  existingValues?: Record<string, string>;
  partial?: boolean;
}

export interface TemplateFillContext {
  recipeId: CanvasRecipeId;
  persona: CanvasPersona;
  signals: PromptSignals;
  knobOverrides: RecipeKnobOverrides;
  requests: TemplateFillRequest[];
}

export interface RenderedTemplate {
  templateId: TemplateId;
  values: Record<string, string>;
  issues: SlotValidationIssue[];
  fallbackApplied: boolean;
}

export interface TemplateFillTelemetry {
  templateId: TemplateId;
  hashedValues: Record<string, string>;
  issues: SlotValidationIssue[];
  fallbackApplied: boolean;
  cacheStatus: TemplateCacheStatus;
}

export interface TemplateFillResult {
  templates: RenderedTemplate[];
  telemetry: TemplateFillTelemetry[];
  rawResponse?: string | null;
}

interface TemplatePromptPayload {
  templateId: TemplateId;
  personaHint?: CanvasPersona;
  slots: Array<{
    id: string;
    label: string;
    description: string;
    tone: string;
    maxLength: number;
    required: boolean;
    existing?: string;
  }>;
}

export const renderTemplateCopy = async (context: TemplateFillContext): Promise<TemplateFillResult> => {
  if (!context.requests.length) {
    return { templates: [], telemetry: [], rawResponse: null };
  }

  const openaiApiKey = process.env.OPENAI_API_KEY;
  const allTemplates = context.requests
    .filter(request => TEMPLATE_IDS.includes(request.templateId))
    .map(request => ({ request, template: TEMPLATE_CATALOG[request.templateId] }));

  const baseSanitized: RenderedTemplate[] = [];
  const telemetry: TemplateFillTelemetry[] = [];

  const cacheStatuses = new Map<TemplateId, TemplateCacheStatus>();
  const shouldRequestMap = new Map<TemplateId, boolean>();

  const pendingTemplates = allTemplates.filter(({ request, template }) => {
    const shouldRequest = shouldRequestSlots(template, request);
    shouldRequestMap.set(template.id, shouldRequest);
    if (!shouldRequest) {
      cacheStatuses.set(template.id, "skip");
    }
    return shouldRequest;
  });

  const cacheKeyBase = {
    persona: context.persona,
    industry: context.signals.industry.value,
    knobOverrides: context.knobOverrides,
    signals: context.signals,
  } satisfies Omit<TemplateCacheKeyInput, "templateId">;

  const cacheKeyInputs = new Map<TemplateId, TemplateCacheKeyInput>();
  const generatedByTemplate = new Map<TemplateId, Record<string, string>>();
  const templatesForLLM: Array<{
    template: Template;
    request: TemplateFillRequest;
    cacheKey: TemplateCacheKeyInput;
  }> = [];

  for (const pending of pendingTemplates) {
    const cacheKey: TemplateCacheKeyInput = {
      ...cacheKeyBase,
      templateId: pending.template.id,
    };
    cacheKeyInputs.set(pending.template.id, cacheKey);

    const cachedValues = templateCompletionCache.get(cacheKey);
    if (cachedValues) {
      generatedByTemplate.set(pending.template.id, cachedValues);
      cacheStatuses.set(pending.template.id, "hit");
      continue;
    }

    templatesForLLM.push({ ...pending, cacheKey });
    if (!cacheStatuses.has(pending.template.id)) {
      cacheStatuses.set(pending.template.id, "miss");
    }
  }

  const shouldInvokeLLM = Boolean(openaiApiKey) && templatesForLLM.length > 0;
  const openai = shouldInvokeLLM ? getOpenAIProvider() : null;

  let rawResponse: string | null = null;
  let parseFailed = false;
  let llmFailed = false;

  if (shouldInvokeLLM && openai) {
    const prompt = buildTemplatePrompt(
      context,
      templatesForLLM.map(({ template, request }) => ({ template, request }))
    );

    try {
      const result = await retryWithExponentialBackoff(
        attempt =>
          withTimeout(async signal => {
            const output = await generateText({
              model: openai(LLM_CONFIG.model),
              system: TEMPLATE_SYSTEM_PROMPT,
              prompt,
              maxOutputTokens: Math.min(1200, LLM_CONFIG.maxTokens),
              abortSignal: signal,
              maxRetries: 0,
            });
            debug("Template fill success (attempt %d)", attempt);
            return output;
          }, { timeoutMs: TEMPLATE_TIMEOUT_MS }),
        TEMPLATE_RETRY,
        {
          shouldRetry: error => shouldRetryOnError(error),
          onRetry: (error, attempt, delayMs) => {
            debugError(`Template fill attempt ${attempt} failed; retrying in ${delayMs}ms`, error);
          },
        }
      );

      rawResponse = result.text ?? null;
      const parsed = parseTemplateResponse(rawResponse);
      parseFailed = !parsed && Boolean(rawResponse);

      for (const { template } of templatesForLLM) {
        const generatedValues = parsed?.[template.id] ?? {};
        generatedByTemplate.set(template.id, generatedValues);
      }
    } catch (error) {
      llmFailed = true;
      debugError("Template fill failed – falling back to defaults", error);
    }
  }

  const relaxedValidation = !shouldInvokeLLM || llmFailed;

  for (const { template, request } of allTemplates) {
    const shouldRequest = shouldRequestMap.get(template.id) ?? false;
    const generatedValues = generatedByTemplate.get(template.id) ?? {};
    const mergedValues = {
      ...(request.existingValues ?? {}),
      ...generatedValues,
    };
    const validation = validateTemplateSlots(template.id, mergedValues, {
      allowPartial: shouldRequest ? (!relaxedValidation && !parseFailed ? Boolean(request.partial) : true) : true,
    });

    let issues = validation.issues;
    let fallbackApplied = validation.fallbackApplied;

    if (parseFailed) {
      issues = [
        ...issues,
        { slotId: "*", reason: "invalid_template_json", severity: "error" } as SlotValidationIssue,
      ];
      fallbackApplied = true;
    }

    if (llmFailed) {
      issues = [
        ...issues,
        { slotId: "*", reason: "llm_error", severity: "error" },
      ];
      fallbackApplied = true;
    }

    const cacheStatus = cacheStatuses.get(template.id) ?? "skip";

    baseSanitized.push({
      templateId: template.id,
      values: validation.sanitizedValues,
      issues,
      fallbackApplied,
    });

    telemetry.push(
      buildTelemetry(
        template.id,
        {
          sanitizedValues: validation.sanitizedValues,
          issues,
          fallbackApplied,
        },
        cacheStatus
      )
    );

    if (
      cacheStatus === "miss" &&
      !fallbackApplied &&
      issues.length === 0 &&
      Object.keys(generatedValues).length > 0
    ) {
      const cacheKey = cacheKeyInputs.get(template.id);
      if (cacheKey) {
        templateCompletionCache.set(cacheKey, validation.sanitizedValues);
      }
    }
  }

  return { templates: baseSanitized, telemetry, rawResponse };
};

const shouldRequestSlots = (template: Template, request: TemplateFillRequest): boolean => {
  if (!request.partial) {
    return true;
  }
  const existing = request.existingValues ?? {};
  return template.slots.some(slot => {
    const candidate = existing[slot.id]?.trim();
    return !candidate;
  });
};

const buildTemplatePrompt = (
  context: TemplateFillContext,
  pendingTemplates: Array<{ template: Template; request: TemplateFillRequest }>
): string => {
  const payload: TemplatePromptPayload[] = pendingTemplates.map(({ template, request }) => ({
    templateId: template.id,
    personaHint: template.personaHint,
    slots: template.slots.map(slot => ({
      id: slot.id,
      label: slot.label,
      description: slot.description,
      tone: slot.tone,
      maxLength: slot.maxLength,
      required: slot.required,
      existing: request.existingValues?.[slot.id] ?? undefined,
    })),
  }));

  const summary = {
    recipeId: context.recipeId,
    persona: context.persona,
    knobOverrides: summarizeKnobs(context.knobOverrides),
    signals: summarizeSignals(context.signals),
    templates: payload,
  };

  return `You will receive template definitions and contextual signals for rendering copy in a Canvas planning experience.

Respond with ONLY a JSON object where each key is a template id mapping to an object of slot values. Do not include commentary.

Example response:
{
  "step_title": { "title": "Team workspace essentials" },
  "helper_text": { "body": "Bring collaborators, integrations, and structure together." }
}

Guidelines:
- Respect maxLength for each slot.
- Use the expected tone hints.
- Reuse provided existing values when present; only generate text for slots without an existing value.
- Avoid marketing fluff; keep statements actionable and clear.
- Never invent new slot ids.

Context JSON:
${JSON.stringify(summary, null, 2)}`;
};

const parseTemplateResponse = (raw: string | null): Record<TemplateId, Record<string, string>> | null => {
  if (!raw) {
    return null;
  }

  const trimmed = raw.trim();
  if (!trimmed) {
    return null;
  }

  const cleaned = trimmed.replace(/^```(?:json)?/i, "").replace(/```$/, "").trim();

  const attempt = (candidate: string) => {
    try {
      const parsed = JSON.parse(candidate) as Record<string, Record<string, string>>;
      return parsed as Record<TemplateId, Record<string, string>>;
    } catch {
      return null;
    }
  };

  const directParse = attempt(cleaned);
  if (directParse) {
    return directParse;
  }

  const repairedWithLibrary = attemptRepairWithLibrary(cleaned);
  if (repairedWithLibrary) {
    return repairedWithLibrary;
  }

  const repaired = repairJson(cleaned);
  if (repaired) {
    return repaired;
  }

  debugError("Failed to parse template response", new Error("invalid_template_json"), { raw });
  return null;
};

const repairJson = (input: string): Record<TemplateId, Record<string, string>> | null => {
  const normalized = normalizeJsonInput(input);
  const attempts: string[] = [];
  const enqueue = (candidate: string | null | undefined) => {
    if (!candidate) {
      return;
    }
    const trimmed = candidate.trim();
    if (!trimmed) {
      return;
    }
    if (!attempts.includes(trimmed)) {
      attempts.push(trimmed);
    }
  };

  const balanced = trimToBalancedStructure(normalized);
  enqueue(normalized);
  enqueue(closeDelimiters(normalized));
  enqueue(balanced);
  if (balanced) {
    enqueue(closeDelimiters(balanced));
  }

  for (const candidate of attempts) {
    try {
      const parsed = JSON.parse(candidate) as Record<string, Record<string, string>>;
      return parsed as Record<TemplateId, Record<string, string>>;
    } catch {
      continue;
    }
  }

  return null;
};

const attemptRepairWithLibrary = (input: string): Record<TemplateId, Record<string, string>> | null => {
  try {
    const repaired = jsonrepair(input);
    const parsed = JSON.parse(repaired) as Record<string, Record<string, string>>;
    return parsed as Record<TemplateId, Record<string, string>>;
  } catch {
    return null;
  }
};

const normalizeJsonInput = (value: string): string =>
  value
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/\\u201[cd]/gi, '"');

const trimToBalancedStructure = (value: string): string | null => {
  let depth = 0;
  let inString = false;
  let isEscaped = false;
  let lastBalancedIndex = -1;

  for (let index = 0; index < value.length; index += 1) {
    const char = value[index];

    if (isEscaped) {
      isEscaped = false;
      continue;
    }

    if (char === "\\") {
      isEscaped = inString;
      continue;
    }

    if (char === '"') {
      inString = !inString;
      continue;
    }

    if (inString) {
      continue;
    }

    if (char === '{' || char === '[') {
      depth += 1;
    } else if (char === '}' || char === ']') {
      depth = Math.max(0, depth - 1);
      if (depth === 0) {
        lastBalancedIndex = index + 1;
      }
    }
  }

  if (lastBalancedIndex > 0 && lastBalancedIndex < value.length) {
    return value.slice(0, lastBalancedIndex);
  }

  return depth === 0 ? value : closeDelimiters(value);
};

const closeDelimiters = (input: string): string => {
  let candidate = input;

  const count = (value: string, pattern: RegExp) => (value.match(pattern) ?? []).length;

  const braceDelta = count(candidate, /\{/g) - count(candidate, /}/g);
  if (braceDelta > 0) {
    candidate += "}".repeat(braceDelta);
  }

  const bracketDelta = count(candidate, /\[/g) - count(candidate, /\]/g);
  if (bracketDelta > 0) {
    candidate += "]".repeat(bracketDelta);
  }

  const quoteCount = count(candidate, /"/g);
  if (quoteCount % 2 !== 0) {
    candidate += '"';
  }

  return candidate;
};

const summarizeSignals = (signals: PromptSignals) => ({
  teamSize: signals.teamSizeBracket.value,
  approvalDepth: signals.approvalChainDepth.value,
  tools: signals.tools.value.slice(0, 3),
  objective: signals.primaryObjective.value,
  constraints: signals.constraints.value,
  compliance: signals.complianceTags.value,
});

const summarizeKnobs = (overrides: RecipeKnobOverrides) =>
  Object.fromEntries(
    Object.entries(overrides).map(([key, value]) => [key, { value: value.value, changed: value.changedFromDefault }])
  );

interface ValidationSnapshot {
  sanitizedValues: Record<string, string>;
  issues: SlotValidationIssue[];
  fallbackApplied: boolean;
}

const buildTelemetry = (
  templateId: TemplateId,
  snapshot: ValidationSnapshot,
  cacheStatus: TemplateCacheStatus
): TemplateFillTelemetry => {
  const hashedValues: Record<string, string> = {};
  Object.entries(snapshot.sanitizedValues).forEach(([slotId, slotValue]) => {
    hashedValues[slotId] = hashValue(slotValue);
  });

  return {
    templateId,
    hashedValues,
    issues: snapshot.issues,
    fallbackApplied: snapshot.fallbackApplied,
    cacheStatus,
  };
};

const hashValue = (value: string): string =>
  createHash("sha256").update(value).digest("hex").slice(0, 16);

const TEMPLATE_SYSTEM_PROMPT = `You generate short UI copy for Canvas planning experiences.
Follow the provided template definitions strictly. Each slot maps to UI text displayed to end users.
Requirements:
- Honour persona hints and knob overrides when crafting language.
- Keep statements factual; avoid marketing jargon or unsupported promises.
- NEVER invent new slots or change the output format.
- Respect the character limits and tone guidance; when unsure, choose neutral, concise phrasing.
- Use existing slot values as-is when provided.
Answer with JSON only.`;
