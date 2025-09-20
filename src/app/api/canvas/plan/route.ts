import { generateObject, generateText } from "ai";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { classifyByHeuristics } from "@/lib/canvas/heuristics";
import { CANVAS_CLASSIFIER_SYSTEM_PROMPT, buildCanvasClassifierPrompt } from "@/lib/canvas/prompt";
import type { CanvasRecipeId } from "@/lib/canvas/recipes";
import { getRecipe } from "@/lib/canvas/recipes";
import type { SlotValidationIssue } from "@/lib/canvas/template-validator";
import { LLM_CONFIG } from "@/lib/constants";
import { isPropertyGuruPreset } from "@/lib/config/presets";
import {
  getOpenAIProvider,
  retryWithExponentialBackoff,
  shouldRetryOnError,
  type BackoffSettings,
} from "@/lib/llm/client";
import { logCanvasDecision } from "@/lib/llm/eval-logger";
import { recordLLMUsage } from "@/lib/llm/usage-tracker";
import { scoreRecipeKnobs, type RecipePersonalizationResult } from "@/lib/personalization/scoring";
import { buildPromptSignals, summarizePromptSignals } from "@/lib/prompt-intel";
import type { PromptSignals } from "@/lib/prompt-intel/types";
import {
  PROPERTY_GURU_PLAN_SYSTEM_PROMPT,
  buildPropertyGuruPlanPrompt,
  createDefaultPropertyGuruPlan,
  propertyGuruPlanSchema,
  type PropertyGuruPlanTemplate,
} from "@/lib/property-guru/prompt";
import type { PropertyGuruSignals } from "@/lib/types/property-guru";
import { canProcessRequest, trackFailure, trackPersonalizationSuccess } from "@/lib/runtime/personalization-health";
import { withTimeout } from "@/lib/runtime/with-timeout";
import { sessionStore } from "@/lib/store/session";
import type { PromptSignalsExtractedEvent, PropertyGuruPlanPayloadEvent } from "@/lib/types/events";
import { createDebugger, debugError } from "@/lib/utils/debug";
import { extractPropertyGuruSignals } from "@/lib/utils/property-guru-signals";
import {
  mapPropertyGuruPlanToSearchPayload,
  type PropertyGuruSearchPayload,
} from "@/lib/utils/property-guru-plan-mapper";
import { DEFAULT_PROPERTY_GURU_SIGNALS } from "@/lib/utils/property-guru-signals";

export const runtime = "nodejs";

const log = createDebugger("CanvasPlanAPI");
const copyLog = createDebugger("CanvasPlanCopy");

const requestSchema = z
  .object({
    message: z
      .string()
      .transform(value => value.trim())
      .pipe(z.string().min(1, "Message is required")),
    domainEmail: z.string().email().optional(),
    teamSize: z.union([z.string(), z.number()]).optional(),
    metadata: z.record(z.string(), z.unknown()).optional(),
    sessionId: z.string().min(1).optional(),
  })
  .strict();

const personaMap = new Map<string, "explorer" | "team" | "power">([
  ["explorer", "explorer"],
  ["team", "team"],
  ["power", "power"],
  ["personal", "explorer"],
  ["solo", "explorer"],
  ["individual", "explorer"],
  ["client", "team"],
]);

const recipeMap = new Map<string, CanvasRecipeId>([
  ["R1", "R1"],
  ["R2", "R2"],
  ["R3", "R3"],
  ["R4", "R4"],
]);

const llmResponseSchema = z.object({
  persona: z
    .string()
    .transform(value => value.trim().toLowerCase())
    .refine(value => personaMap.has(value), "Unsupported persona")
    .transform(value => personaMap.get(value) ?? "explorer"),
  recipe_id: z
    .string()
    .transform(value => value.trim().toUpperCase())
    .refine(value => recipeMap.has(value), "Unsupported recipe id")
    .transform(value => recipeMap.get(value) as CanvasRecipeId),
  intent_tags: z
    .array(z.string())
    .default([])
    .transform(tags => {
      const seen = new Set<string>();
      for (const tag of tags) {
        const cleaned = tag.trim().toLowerCase().replace(/\s+/g, "_");
        if (cleaned) {
          seen.add(cleaned);
        }
      }
      return Array.from(seen).slice(0, 3);
    }),
  confidence: z.number().optional().nullable(),
  reasoning: z
    .string()
    .trim()
    .refine(value => value.length > 0, "Reasoning is required")
    .transform(value => (value.length > 160 ? `${value.slice(0, 159)}…` : value)),
});

const LLM_TIMEOUT_MS = 30_000;
const LLM_RETRY_SETTINGS: BackoffSettings = {
  maxAttempts: 2,
  initialDelay: 150,
  maxDelay: 300,
  backoffMultiplier: 2,
  jitterRatio: 0.2,
  sleep: async () => undefined,
};

const LLM_CONFIDENCE_THRESHOLD = 0.6;
const RATE_LIMIT_WINDOW_FALLBACK_MS = 60_000;

type CanvasDecisionResponse = {
  recipeId: CanvasRecipeId;
  persona: "explorer" | "team" | "power";
  intentTags: string[];
  confidence: number;
  reasoning: string;
  decisionSource: "llm" | "heuristics";
  promptSignals: PromptSignals;
  personalization: RecipePersonalizationResult;
  templateCopy: TemplateCopyPayload;
};

interface TemplateCopyPayload {
  stepTitle: string;
  helperText: string;
  primaryCta: string;
  callout: {
    heading?: string;
    body: string;
  };
  badgeCaption: string;
  issues: SlotValidationIssue[];
  propertyGuruPlan?: PropertyGuruPlanTemplate;
  propertyGuruSignals?: PropertyGuruSignals;
  propertyGuruSignalsBaseline?: PropertyGuruSignals;
  propertyGuruSearchPayload?: PropertyGuruSearchPayload;
  propertyGuruDefaults?: string[];
}

type CanvasDecisionResponseBase = Omit<CanvasDecisionResponse, "promptSignals" | "personalization" | "templateCopy">;

const sanitizeReasoning = (value: string): string => {
  const trimmed = value.trim();
  if (!trimmed) {
    return "Classified by heuristics";
  }
  return trimmed.length > 160 ? `${trimmed.slice(0, 159)}…` : trimmed;
};

const clampConfidence = (value: number): number => {
  if (!Number.isFinite(value)) {
    return 0;
  }
  return Math.min(1, Math.max(0, value));
};

const stripCodeFence = (text: string): string => {
  let output = text.trim();
  if (output.startsWith("```") && output.endsWith("```")) {
    output = output.replace(/^```(?:json)?/i, "").replace(/```$/, "").trim();
  }
  return output;
};

async function classifyWithLLM(
  message: string,
  context: {
    domainEmail?: string;
    teamSize?: string;
    metadata?: Record<string, unknown>;
  }
): Promise<{ decision: z.infer<typeof llmResponseSchema>; rawText: string } | null> {
  if (!process.env.OPENAI_API_KEY) {
    return null;
  }

  const openai = getOpenAIProvider();

  const prompt = buildCanvasClassifierPrompt({
    message,
    domainEmail: context.domainEmail,
    teamSize: context.teamSize,
    metadata: context.metadata,
  });

  const result = await retryWithExponentialBackoff(
    attempt =>
      withTimeout(async signal => {
        const output = await generateText({
          model: openai(LLM_CONFIG.model),
          system: CANVAS_CLASSIFIER_SYSTEM_PROMPT,
          prompt,
          maxOutputTokens: 4000,
          abortSignal: signal,
          maxRetries: 0,
        });

        recordLLMUsage(output.usage ?? null);
        log(`Canvas classifier succeeded (attempt ${attempt})`);
        return output;
      }, { timeoutMs: LLM_TIMEOUT_MS }),
    LLM_RETRY_SETTINGS,
    {
      shouldRetry: (error, _attempt) => shouldRetryOnError(error),
      onRetry: (error, attempt, delayMs) => {
        const attemptLabel = typeof attempt === "number" ? attempt : 0;
        debugError(
          `Canvas classifier attempt ${attemptLabel} failed; retrying in ${delayMs}ms`,
          error
        );
      },
    }
  );

  const rawText = result.text ?? "";
  const resolvedOutput = (result as { resolvedOutput?: unknown }).resolvedOutput;
  const toolCalls = (result as { toolCalls?: unknown }).toolCalls;
  const content = (result as { content?: unknown }).content;
  const outputText = (result as { outputText?: unknown }).outputText;
  const responseMessages = (result as { response?: { messages?: unknown } }).response?.messages;

  console.warn("[CanvasClassifier] raw LLM text:", rawText);
  console.warn("[CanvasClassifier] result snapshot:", {
    finishReason: (result as { finishReason?: unknown }).finishReason,
    toolCalls,
    resolvedOutput,
    content,
    outputText,
    responseMessages,
  });
  if (Array.isArray(content)) {
    console.warn(
      '[CanvasClassifier] content segments detailed:',
      content.map(segment => {
        if (segment && typeof segment === 'object') {
          return {
            type: (segment as { type?: unknown }).type,
            keys: Object.keys(segment as Record<string, unknown>),
            providerMetadata: (segment as { providerMetadata?: unknown }).providerMetadata,
          };
        }
        return segment;
      })
    );
  }

  let normalized = stripCodeFence(rawText);
  if (typeof normalized === 'string') {
    normalized = normalized.trim();
  }

  if (!normalized && typeof outputText === 'string' && outputText.trim().length > 0) {
    normalized = stripCodeFence(outputText).trim();
  }

  if (!normalized && resolvedOutput) {
    try {
      normalized = typeof resolvedOutput === 'string' ? resolvedOutput : JSON.stringify(resolvedOutput);
      normalized = normalized.trim();
    } catch (error) {
      debugError('Failed to stringify resolvedOutput', error);
    }
  }

  if (!normalized && Array.isArray(content)) {
    try {
      const textSegments = content
        .map(segment => {
          if (typeof segment === 'string') return segment;
          if (segment && typeof segment === 'object' && 'text' in segment) {
            return (segment as { text?: unknown }).text ?? '';
          }
          return '';
        })
        .join('');
      normalized = stripCodeFence(String(textSegments)).trim();
    } catch (error) {
      debugError('Failed to extract text from content', error);
    }
  }

  if (!normalized && Array.isArray(toolCalls) && toolCalls.length > 0) {
    const firstCall = toolCalls[0] as { args?: unknown };
    try {
      const argsValue = firstCall?.args;
      if (typeof argsValue === 'string') {
        normalized = argsValue.trim();
      } else if (argsValue) {
        normalized = JSON.stringify(argsValue).trim();
      }
    } catch (error) {
      debugError('Failed to stringify tool call args', error);
    }
  }

  if (!normalized && Array.isArray(responseMessages)) {
    try {
      for (const message of responseMessages) {
        if (!message || typeof message !== 'object') continue;
        const msgContent = (message as { content?: unknown }).content;
        if (!Array.isArray(msgContent)) continue;
        for (const item of msgContent) {
          if (!item || typeof item !== 'object') continue;
          const type = (item as { type?: unknown }).type;
          if (type === 'output_text' && typeof (item as { text?: unknown }).text === 'string') {
            normalized = stripCodeFence((item as { text?: string }).text ?? '').trim();
            if (normalized) break;
          }
          if (type === 'tool_call' && typeof (item as { args?: unknown }).args === 'string') {
            normalized = stripCodeFence((item as { args?: string }).args ?? '').trim();
            if (normalized) break;
          }
          if (type === 'text' && typeof (item as { text?: unknown }).text === 'string') {
            normalized = stripCodeFence((item as { text?: string }).text ?? '').trim();
            if (normalized) break;
          }
        }
        if (normalized) break;
      }
    } catch (error) {
      debugError('Failed to extract output text from response messages', error);
    }
  }

  console.warn("[CanvasClassifier] normalized text:", normalized);
  if (!normalized) {
    return null;
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(normalized);
  } catch (error) {
    debugError("Canvas classifier returned invalid JSON", {
      error,
      normalized,
    });
    return null;
  }

  const decision = llmResponseSchema.safeParse(parsed);
  if (!decision.success) {
    debugError("Canvas classifier response failed schema validation", decision.error);
    return null;
  }

  return { decision: decision.data, rawText: normalized };
}

export async function POST(req: NextRequest) {
  try {
    const rawBody = await req
      .json()
      .catch(() => null);

    const parsedBody = requestSchema.safeParse(rawBody);
    if (!parsedBody.success) {
      return NextResponse.json(
        { error: "Invalid request payload", details: parsedBody.error.format() },
        { status: 400 }
      );
    }

    const { message, domainEmail, teamSize, metadata, sessionId } = parsedBody.data;

    if (sessionId) {
      const rateLimit = canProcessRequest(sessionId);
      if (!rateLimit.allowed) {
        const retryAfterSeconds = Math.max(
          1,
          Math.ceil(((rateLimit.retryAfterMs ?? RATE_LIMIT_WINDOW_FALLBACK_MS) / 1000))
        );
        return NextResponse.json(
          { error: "Too many personalization attempts. Please retry shortly." },
          {
            status: 429,
            headers: {
              "Retry-After": String(retryAfterSeconds),
            },
          }
        );
      }
    }
    const heuristicsDecision = classifyByHeuristics(message);

    let responsePayload: CanvasDecisionResponseBase = {
      recipeId: heuristicsDecision.recipeId,
      persona: heuristicsDecision.persona,
      intentTags: heuristicsDecision.intentTags,
      confidence: clampConfidence(heuristicsDecision.confidence),
      reasoning: sanitizeReasoning(heuristicsDecision.reasoning),
      decisionSource: "heuristics",
    };

    let llmConfidence: number | null = null;
    let rawLlmResponse: string | null = null;

    const llmResult = await classifyWithLLM(message, {
      domainEmail,
      teamSize: teamSize ? String(teamSize) : undefined,
      metadata,
    }).catch(error => {
      debugError("Canvas classifier LLM failure", error);
      return null;
    });

    if (llmResult) {
      rawLlmResponse = llmResult.rawText;
      llmConfidence = clampConfidence(llmResult.decision.confidence ?? 0);
      console.warn('[CanvasClassifier] raw response:', rawLlmResponse);

      if (llmConfidence >= LLM_CONFIDENCE_THRESHOLD) {
        responsePayload = {
          recipeId: llmResult.decision.recipe_id,
          persona: llmResult.decision.persona,
          intentTags: llmResult.decision.intent_tags,
          confidence: llmConfidence,
          reasoning: sanitizeReasoning(llmResult.decision.reasoning),
          decisionSource: "llm",
        };
      } else {
        console.warn(
          '[CanvasClassifier] confidence below threshold',
          {
            confidence: llmConfidence,
            persona: llmResult.decision.persona,
            recipeId: llmResult.decision.recipe_id,
            intentTags: llmResult.decision.intent_tags,
          }
        );
        log(
          `Canvas classifier confidence ${llmConfidence.toFixed(
            2
          )} below threshold; using heuristics`
        );
      }
    }

    const recipeForLog = getRecipe(responsePayload.recipeId);

    const promptSignals = await buildPromptSignals(message);
    const personalization = scoreRecipeKnobs(responsePayload.recipeId, promptSignals);

    const planCopy = await generatePlanCopy({
      message,
      recipeId: responsePayload.recipeId,
      persona: responsePayload.persona,
      signals: promptSignals,
      overrides: personalization.overrides,
      sessionId,
    });

    const templateCopy = planCopy.copy;
    const responsePayloadWithSignals: CanvasDecisionResponse = {
      ...responsePayload,
      promptSignals,
      personalization,
      templateCopy,
    };

    if (sessionId) {
      const telemetryEvent: PromptSignalsExtractedEvent = {
        type: 'prompt_signals_extracted',
        timestamp: new Date().toISOString(),
        sessionId,
        signals: summarizePromptSignals(promptSignals),
      };

      const updatedSession = sessionStore.updateSession(sessionId, {
        promptSignals,
        event: telemetryEvent,
      });

      if (!updatedSession) {
        log(`No session found for sessionId ${sessionId}; prompt signals not persisted`);
      }
    }

    await logCanvasDecision({
      message,
      recipeId: responsePayload.recipeId,
      persona: responsePayload.persona,
      intentTags: responsePayload.intentTags,
      confidence: responsePayload.confidence,
      reasoning: responsePayload.reasoning,
      decisionSource: responsePayload.decisionSource,
      fallbackUsed: responsePayload.decisionSource !== "llm",
      componentCount: recipeForLog.fields.length,
      llmConfidence,
      llmRawResponse: rawLlmResponse,
      rawDecision: llmResult?.decision ?? null,
      personalizationFallback: personalization.fallback,
      templateTelemetry: [],
    });

    trackPersonalizationSuccess();
    return NextResponse.json(responsePayloadWithSignals);
  } catch (error) {
    debugError("Canvas plan endpoint error", error);
    trackFailure();
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

const PLAN_COPY_SYSTEM_PROMPT = `You are the UI copywriter for a product setup flow. Respond ONLY with a JSON object containing concise strings.`;

const copySchema = z.object({
  stepTitle: z.string().min(1),
  helperText: z.string().min(1),
  primaryCta: z.string().min(1),
  calloutHeading: z.string().min(1),
  calloutBody: z.string().min(1),
  badgeCaption: z.string().min(1),
});

const PLAN_COPY_TIMEOUT_MS = 25_000;

const PROPERTY_GURU_PLAN_TIMEOUT_MS = 25_000;

const generatePlanCopy = async (options: {
  message: string;
  recipeId: CanvasRecipeId;
  persona: CanvasDecisionResponse["persona"];
  signals: PromptSignals;
  overrides: RecipePersonalizationResult["overrides"];
  sessionId?: string;
}): Promise<{ copy: TemplateCopyPayload }> => {
  if (isPropertyGuruPreset()) {
    return generatePropertyGuruPlanCopy(options);
  }

  return generateCanvasPlanCopy(options);
};

const generateCanvasPlanCopy = async ({
  message,
  recipeId,
  persona,
  signals,
  overrides,
}: {
  message: string;
  recipeId: CanvasRecipeId;
  persona: CanvasDecisionResponse["persona"];
  signals: PromptSignals;
  overrides: RecipePersonalizationResult["overrides"];
}): Promise<{ copy: TemplateCopyPayload }> => {
  const openaiApiKey = process.env.OPENAI_API_KEY;
  const defaults = getDefaultCopy();

  if (!openaiApiKey) {
    return { copy: defaults };
  }

  const openai = getOpenAIProvider();
  const prompt = buildCopyPrompt({ message, recipeId, persona, signals, overrides });

  try {
    const { object, usage } = await withTimeout(
      signal =>
        generateObject({
          model: openai(LLM_CONFIG.model),
          system: PLAN_COPY_SYSTEM_PROMPT,
          prompt,
          schema: copySchema,
          abortSignal: signal,
          maxRetries: 1,
        }),
      { timeoutMs: PLAN_COPY_TIMEOUT_MS }
    );

    recordLLMUsage(usage);

    const copy: TemplateCopyPayload = {
      stepTitle: object.stepTitle.trim() || defaults.stepTitle,
      helperText: object.helperText.trim() || defaults.helperText,
      primaryCta: object.primaryCta.trim() || defaults.primaryCta,
      callout: {
        heading: object.calloutHeading.trim() || defaults.callout.heading,
        body: object.calloutBody.trim() || defaults.callout.body,
      },
      badgeCaption: object.badgeCaption.trim() || defaults.badgeCaption,
      issues: [],
    };

    return { copy };
  } catch (error) {
    debugError("Plan copy generation failed", error);
    copyLog("Generation error", { message, recipeId, persona });
    return {
      copy: { ...defaults, issues: [{ slotId: "*", reason: "copy_generation_failed", severity: "warning" }] },
    };
  }
};

const buildCopyPrompt = ({
  message,
  recipeId,
  persona,
  signals,
  overrides,
}: {
  message: string;
  recipeId: CanvasRecipeId;
  persona: CanvasDecisionResponse["persona"];
  signals: PromptSignals;
  overrides: RecipePersonalizationResult["overrides"];
}): string => {
  const summary = {
    message,
    recipeId,
    persona,
    signals: summarizePromptSignals(signals),
    overrides,
  };

  return `Context: ${JSON.stringify(summary, null, 2)}\n\nReturn JSON with these keys:\n{\n  "stepTitle": string,\n  "helperText": string,\n  "primaryCta": string,\n  "calloutHeading": string,\n  "calloutBody": string,\n  "badgeCaption": string\n}\nEach value must be under 160 characters and actionable. Do not add commentary or extra fields.`;
};


const getDefaultCopy = (): TemplateCopyPayload => ({
  stepTitle: "Workspace setup",
  helperText: "Keep it lightweight so you can dive in immediately.",
  primaryCta: "Continue",
  callout: {
    heading: "A quick heads-up",
    body: "We'll start simple. You can add more later.",
  },
  badgeCaption: "AI recommended",
  issues: [],
});

const getDefaultPropertyGuruCopy = (): TemplateCopyPayload => ({
  stepTitle: "PropertyGuru plan preview",
  helperText: "Review the concierge plan, then adjust essentials or lifestyle cues.",
  primaryCta: "Preview curated listings",
  callout: {
    heading: "Fast track",
    body: "Use the plan actions to jump into listings or financing support.",
  },
  badgeCaption: "AI concierge",
  issues: [],
  propertyGuruPlan: createDefaultPropertyGuruPlan(),
  propertyGuruSignals: DEFAULT_PROPERTY_GURU_SIGNALS,
  propertyGuruSignalsBaseline: DEFAULT_PROPERTY_GURU_SIGNALS,
  propertyGuruSearchPayload: {
    filters: {
      area: 'Singapore',
      districts: [],
      radiusKm: 5,
      lifestyle: [],
      propertyType: 'other',
      bedrooms: 0,
    },
    highlights: [],
    nextSteps: [],
    copy: {
      hero: "Let's refine your home search together.",
      reassurance: 'Listings refresh daily so you never miss a new opportunity.',
      followUp: 'We will keep the weekly digest light until you narrow your brief.',
      tone: 'reassuring',
    },
  },
  propertyGuruDefaults: ['filters.districts', 'filters.price', 'filters.propertyType', 'filters.bedrooms', 'nextSteps'],
});

const generatePropertyGuruPlanCopy = async ({
  message,
  sessionId,
}: {
  message: string;
  recipeId: CanvasRecipeId;
  persona: CanvasDecisionResponse["persona"];
  signals: PromptSignals;
  overrides: RecipePersonalizationResult["overrides"];
  sessionId?: string;
}): Promise<{ copy: TemplateCopyPayload }> => {
  const { signals: extractedSignals } = extractPropertyGuruSignals(message);
  const defaults = getDefaultPropertyGuruCopy();
  const openaiApiKey = process.env.OPENAI_API_KEY;

  if (!openaiApiKey) {
    return { copy: defaults };
  }

  const openai = getOpenAIProvider();
  const prompt = buildPropertyGuruPlanPrompt({ prompt: message, signals: extractedSignals });

  try {
    const { object, usage } = await withTimeout(
      signal =>
        generateObject({
          model: openai(LLM_CONFIG.model),
          system: PROPERTY_GURU_PLAN_SYSTEM_PROMPT,
          prompt,
          schema: propertyGuruPlanSchema,
          abortSignal: signal,
          maxRetries: 1,
        }),
      { timeoutMs: PROPERTY_GURU_PLAN_TIMEOUT_MS }
    );

    recordLLMUsage(usage);

    const plan = propertyGuruPlanSchema.parse(object);
    const baselineSignals: PropertyGuruSignals = structuredClone(extractedSignals);
    const { payload, defaultsApplied } = mapPropertyGuruPlanToSearchPayload({
      plan,
      signals: extractedSignals,
    });

    const copy: TemplateCopyPayload = {
      ...defaults,
      propertyGuruPlan: plan,
      propertyGuruSignals: extractedSignals,
      propertyGuruSignalsBaseline: baselineSignals,
      propertyGuruSearchPayload: payload,
      propertyGuruDefaults: defaultsApplied,
      issues: [],
    };

    if (sessionId && defaultsApplied.length > 0) {
      recordPropertyGuruPayloadEvent(sessionId, defaultsApplied, payload);
    }

    return { copy };
  } catch (error) {
    debugError("PropertyGuru plan generation failed", error);
    copyLog("PropertyGuru generation error", { message });
    return {
      copy: {
        ...defaults,
        issues: [{ slotId: "*", reason: "property_guru_plan_generation_failed", severity: "warning" }],
      },
    };
  }
};

const recordPropertyGuruPayloadEvent = (
  sessionId: string,
  defaults: string[],
  payload: PropertyGuruSearchPayload
) => {
  const event: PropertyGuruPlanPayloadEvent = {
    type: 'property_guru_plan_payload',
    timestamp: new Date().toISOString(),
    sessionId,
    defaultsApplied: defaults,
    payload,
  };

  const updatedSession = sessionStore.updateSession(sessionId, {
    event,
  });

  if (!updatedSession) {
    log(`No session found for sessionId ${sessionId}; property guru payload telemetry dropped`);
  }
};
