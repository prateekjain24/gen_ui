import { appendFile, mkdir } from "node:fs/promises";
import path from "node:path";

import type { CanvasRecipeId } from "@/lib/canvas/recipes";
import { EVAL_LOG_CONFIG, LLM_CONFIG, PROMPT_VERSION } from "@/lib/constants";

export type CanvasDecisionSource = "llm" | "heuristics";

export interface CanvasDecisionLog {
  message: string;
  recipeId: CanvasRecipeId;
  persona: "explorer" | "team" | "power";
  intentTags: string[];
  confidence: number;
  reasoning: string;
  decisionSource: CanvasDecisionSource;
  fallbackUsed: boolean;
  llmConfidence?: number | null;
  llmRawResponse?: string | null;
  createdAt?: string;
}

const resolveLogFilePath = async (): Promise<string> => {
  if (!EVAL_LOG_CONFIG.enable) {
    throw new Error("Eval logging disabled");
  }

  const baseDir = path.isAbsolute(EVAL_LOG_CONFIG.logDir)
    ? EVAL_LOG_CONFIG.logDir
    : path.join(process.cwd(), EVAL_LOG_CONFIG.logDir);

  const canvasDir = path.join(baseDir, "canvas");
  await mkdir(canvasDir, { recursive: true });

  const dateSlug = new Date().toISOString().slice(0, 10);
  return path.join(canvasDir, `${dateSlug}.jsonl`);
};

export async function logCanvasDecision(payload: CanvasDecisionLog): Promise<void> {
  if (!EVAL_LOG_CONFIG.enable) {
    return;
  }

  try {
    const filePath = await resolveLogFilePath();
    const record = {
      ...payload,
      createdAt: payload.createdAt ?? new Date().toISOString(),
      modelName: LLM_CONFIG.model,
      promptVersion: PROMPT_VERSION,
    };
    await appendFile(filePath, `${JSON.stringify(record)}\n`, "utf8");
  } catch (error) {
    // Intentionally swallow logging errors to avoid impacting user flows.
    console.warn("Failed to persist canvas decision log", error);
  }
}
