import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import type { NextRequest } from "next/server";

const generateTextMock = jest.fn();

jest.mock("ai", () => ({
  generateText: generateTextMock,
}));

jest.mock("@/lib/canvas/heuristics", () => ({
  classifyByHeuristics: jest.fn(),
}));

jest.mock("@/lib/canvas/logger", () => ({
  logCanvasDecision: jest.fn(async () => undefined),
}));

jest.mock("@/lib/llm/client", () => ({
  getOpenAIProvider: jest.fn(() => (model: string) => model),
  invokeWithTimeout: jest.fn(
    (_timeout: number, operation: (signal: AbortSignal) => Promise<unknown>) =>
      operation(new AbortController().signal)
  ),
  retryWithExponentialBackoff: jest.fn(
    (operation: (attempt: number) => Promise<unknown>, _settings: unknown, _hooks?: unknown) =>
      operation(1)
  ),
  shouldRetryOnError: jest.fn(() => true),
}));

jest.mock("@/lib/llm/usage-tracker", () => ({
  recordLLMUsage: jest.fn(),
}));

describe("POST /api/canvas/plan", () => {
  type GenerateTextType = typeof import("ai").generateText;
  type HeuristicsType = typeof import("@/lib/canvas/heuristics").classifyByHeuristics;
  type LogCanvasDecisionType = typeof import("@/lib/canvas/logger").logCanvasDecision;

  const generateText = generateTextMock as jest.MockedFunction<GenerateTextType>;
  const { classifyByHeuristics } = jest.requireMock("@/lib/canvas/heuristics") as {
    classifyByHeuristics: jest.MockedFunction<HeuristicsType>;
  };
  const { logCanvasDecision } = jest.requireMock("@/lib/canvas/logger") as {
    logCanvasDecision: jest.MockedFunction<LogCanvasDecisionType>;
  };

  const loadRoute = async () => {
    const mod = await import("../route");
    return mod.POST;
  };

  const createRequest = (body: unknown): NextRequest => {
    return {
      json: jest.fn(async () => body),
    } as unknown as NextRequest;
  };

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.OPENAI_API_KEY = "test-key";
    classifyByHeuristics.mockReturnValue({
      recipeId: "R2",
      persona: "team",
      intentTags: ["integrations", "invites"],
      confidence: 0.8,
      reasoning: "Team signals detected",
    });
  });

  it("returns LLM decision when confidence is high", async () => {
    generateText.mockResolvedValue({
      text: '{"persona":"team","recipe_id":"R3","intent_tags":["client","integrations"],"confidence":0.82,"reasoning":"Mentioned client stakeholders and integrations"}',
      usage: { totalTokens: 100, inputTokens: 50, outputTokens: 50 },
    } as Awaited<ReturnType<GenerateTextType>>);

    const POST = await loadRoute();
    const response = await POST(createRequest({ message: "Client rollout with Slack" }));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      recipeId: "R3",
      persona: "team",
      intentTags: ["client", "integrations"],
      confidence: 0.82,
      reasoning: "Mentioned client stakeholders and integrations",
      decisionSource: "llm",
    });

    expect(logCanvasDecision).toHaveBeenCalledWith(
      expect.objectContaining({ decisionSource: "llm", recipeId: "R3" })
    );
  });

  it("falls back to heuristics when LLM confidence is low", async () => {
    generateText.mockResolvedValue({
      text: '{"persona":"team","recipe_id":"R3","intent_tags":["client"],"confidence":0.4,"reasoning":"Uncertain"}',
      usage: { totalTokens: 40, inputTokens: 20, outputTokens: 20 },
    } as Awaited<ReturnType<GenerateTextType>>);

    const POST = await loadRoute();
    const response = await POST(createRequest({ message: "Maybe a team space" }));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      recipeId: "R2",
      persona: "team",
      intentTags: ["integrations", "invites"],
      confidence: 0.8,
      reasoning: "Team signals detected",
      decisionSource: "heuristics",
    });

    expect(logCanvasDecision).toHaveBeenCalledWith(
      expect.objectContaining({ decisionSource: "heuristics", recipeId: "R2" })
    );
  });

  it("uses heuristics when LLM throws", async () => {
    generateText.mockRejectedValue(new Error("network error"));

    const POST = await loadRoute();
    const response = await POST(createRequest({ message: "Need approvals and audit logs" }));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      recipeId: "R2",
      persona: "team",
      intentTags: ["integrations", "invites"],
      confidence: 0.8,
      reasoning: "Team signals detected",
      decisionSource: "heuristics",
    });
  });

  it("returns 400 for invalid payload", async () => {
    const POST = await loadRoute();
    const response = await POST(createRequest({ message: "   " }));

    expect(response.status).toBe(400);
    const json = await response.json();
    expect(json.error).toBe("Invalid request payload");
  });

  it("returns 500 for unexpected errors", async () => {
    classifyByHeuristics.mockImplementation(() => {
      throw new Error("boom");
    });

    const POST = await loadRoute();
    const response = await POST(createRequest({ message: "test" }));

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({ error: "Internal server error" });
  });

  it("skips LLM when API key missing", async () => {
    process.env.OPENAI_API_KEY = "";

    const POST = await loadRoute();
    const response = await POST(createRequest({ message: "Need quick notes" }));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      recipeId: "R2",
      persona: "team",
      intentTags: ["integrations", "invites"],
      confidence: 0.8,
      reasoning: "Team signals detected",
      decisionSource: "heuristics",
    });
    expect(generateText).not.toHaveBeenCalled();
  });
});
