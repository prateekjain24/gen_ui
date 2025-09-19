import { generateText } from "ai";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { classifyByHeuristics } from "@/lib/canvas/heuristics";
import { CANVAS_CLASSIFIER_SYSTEM_PROMPT, buildCanvasClassifierPrompt } from "@/lib/canvas/prompt";
import type { CanvasRecipeId } from "@/lib/canvas/recipes";
import { getRecipe } from "@/lib/canvas/recipes";
import { LLM_CONFIG } from "@/lib/constants";
import {
  getOpenAIProvider,
  invokeWithTimeout,
  retryWithExponentialBackoff,
  shouldRetryOnError,
  type BackoffSettings,
} from "@/lib/llm/client";
import { logCanvasDecision } from "@/lib/llm/eval-logger";
import { recordLLMUsage } from "@/lib/llm/usage-tracker";
import { createDebugger, debugError } from "@/lib/utils/debug";

export const runtime = "nodejs";

const log = createDebugger("CanvasPlanAPI");

const requestSchema = z
  .object({
    message: z
      .string()
      .transform(value => value.trim())
      .pipe(z.string().min(1, "Message is required")),
    domainEmail: z.string().email().optional(),
    teamSize: z.union([z.string(), z.number()]).optional(),
    metadata: z.record(z.string(), z.unknown()).optional(),
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

const LLM_TIMEOUT_MS = 3_000;
const LLM_RETRY_SETTINGS: BackoffSettings = {
  maxAttempts: 2,
  initialDelay: 150,
  maxDelay: 300,
  backoffMultiplier: 2,
  jitterRatio: 0.2,
  sleep: async () => undefined,
};

const LLM_CONFIDENCE_THRESHOLD = 0.6;

type CanvasDecisionResponse = {
  recipeId: CanvasRecipeId;
  persona: "explorer" | "team" | "power";
  intentTags: string[];
  confidence: number;
  reasoning: string;
  decisionSource: "llm" | "heuristics";
};

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
      invokeWithTimeout(LLM_TIMEOUT_MS, async signal => {
        const output = await generateText({
          model: openai(LLM_CONFIG.model),
          system: CANVAS_CLASSIFIER_SYSTEM_PROMPT,
          prompt,
          maxOutputTokens: 256,
          abortSignal: signal,
          maxRetries: 0,
        });

        recordLLMUsage(output.usage ?? null);
        log(`Canvas classifier succeeded (attempt ${attempt})`);
        return output;
      }),
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

  const normalized = stripCodeFence(result.text ?? "");
  if (!normalized) {
    return null;
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(normalized);
  } catch (error) {
    debugError("Canvas classifier returned invalid JSON", error);
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

    const { message, domainEmail, teamSize, metadata } = parsedBody.data;
    const heuristicsDecision = classifyByHeuristics(message);

    let responsePayload: CanvasDecisionResponse = {
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
        log(
          `Canvas classifier confidence ${llmConfidence.toFixed(
            2
          )} below threshold; using heuristics`
        );
      }
    }

    const recipeForLog = getRecipe(responsePayload.recipeId);

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
    });

    return NextResponse.json(responsePayload);
  } catch (error) {
    debugError("Canvas plan endpoint error", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
