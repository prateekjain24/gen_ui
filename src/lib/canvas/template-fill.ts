import { createHash } from "node:crypto";

import { generateText } from "ai";

import type { CanvasPersona, CanvasRecipeId } from "@/lib/canvas/recipes";
import { validateTemplateSlots, type SlotValidationIssue, type SlotValidationResult } from "@/lib/canvas/template-validator";
import { TEMPLATE_CATALOG, TEMPLATE_IDS, type Template, type TemplateId } from "@/lib/canvas/templates";
import { LLM_CONFIG } from "@/lib/constants";
import {
  getOpenAIProvider,
  invokeWithTimeout,
  retryWithExponentialBackoff,
  shouldRetryOnError,
  type BackoffSettings,
} from "@/lib/llm/client";
import type { RecipeKnobOverrides } from "@/lib/personalization/scoring";
import type { PromptSignals } from "@/lib/prompt-intel/types";
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

  const pendingTemplates = allTemplates.filter(({ request, template }) =>
    shouldRequestSlots(template, request)
  );

  if (!openaiApiKey || pendingTemplates.length === 0) {
    for (const { template, request } of allTemplates) {
      const mergedValues = request.existingValues ?? {};
      const validation = validateTemplateSlots(template.id, mergedValues, { allowPartial: true });
      baseSanitized.push({
        templateId: template.id,
        values: validation.sanitizedValues,
        issues: validation.issues,
        fallbackApplied: validation.fallbackApplied,
      });
      telemetry.push(buildTelemetry(template.id, validation));
    }
    return { templates: baseSanitized, telemetry, rawResponse: null };
  }

  const prompt = buildTemplatePrompt(context, pendingTemplates);
  const openai = getOpenAIProvider();

  let rawResponse: string | null = null;

  try {
    const result = await retryWithExponentialBackoff(
      attempt =>
        invokeWithTimeout(TEMPLATE_TIMEOUT_MS, async signal => {
          const output = await generateText({
            model: openai(LLM_CONFIG.model),
            system: TEMPLATE_SYSTEM_PROMPT,
            prompt,
            maxOutputTokens: Math.min(1200, LLM_CONFIG.maxTokens),
            temperature: 0.2,
            topP: 0.9,
            presencePenalty: 0,
            frequencyPenalty: 0,
            abortSignal: signal,
            maxRetries: 0,
          });
          debug("Template fill success (attempt %d)", attempt);
          return output;
        }),
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

    const parseFailed = !parsed && Boolean(rawResponse);

    for (const { template, request } of allTemplates) {
      const generatedValues = parsed?.[template.id] ?? {};
      const mergedValues = {
        ...(request.existingValues ?? {}),
        ...generatedValues,
      };
      const validation = validateTemplateSlots(template.id, mergedValues, {
        allowPartial: Boolean(request.partial),
      });
      const combinedIssues = parseFailed
        ? [
            ...validation.issues,
            { slotId: "*", reason: "invalid_template_json", severity: "error" } as SlotValidationIssue,
          ]
        : validation.issues;
      baseSanitized.push({
        templateId: template.id,
        values: validation.sanitizedValues,
        issues: combinedIssues,
        fallbackApplied: validation.fallbackApplied || parseFailed,
      });
      telemetry.push(buildTelemetry(template.id, validation));
    }
  } catch (error) {
    debugError("Template fill failed – falling back to defaults", error);
    for (const { template, request } of allTemplates) {
      const mergedValues = request.existingValues ?? {};
      const validation = validateTemplateSlots(template.id, mergedValues, { allowPartial: true });
      baseSanitized.push({
        templateId: template.id,
        values: validation.sanitizedValues,
        issues: [
          ...validation.issues,
          { slotId: "*", reason: "llm_error", severity: "error" },
        ],
        fallbackApplied: true,
      });
      telemetry.push(buildTelemetry(template.id, validation));
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

  try {
    const cleaned = trimmed.replace(/^```(?:json)?/i, "").replace(/```$/, "").trim();
    const parsed = JSON.parse(cleaned) as Record<string, Record<string, string>>;
    return parsed as Record<TemplateId, Record<string, string>>;
  } catch (error) {
    debugError("Failed to parse template response", error, { raw });
    return null;
  }
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

const buildTelemetry = (templateId: TemplateId, validation: SlotValidationResult): TemplateFillTelemetry => {
  const hashedValues: Record<string, string> = {};
  Object.entries(validation.sanitizedValues).forEach(([slotId, slotValue]) => {
    hashedValues[slotId] = hashValue(slotValue);
  });

  return {
    templateId,
    hashedValues,
    issues: validation.issues,
    fallbackApplied: validation.fallbackApplied,
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
