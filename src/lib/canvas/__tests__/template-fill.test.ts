import type { CanvasPersona } from "@/lib/canvas/recipes";
import { renderTemplateCopy } from "@/lib/canvas/template-fill";
import { TEMPLATE_CATALOG } from "@/lib/canvas/templates";
import type { RecipeKnobOverrides } from "@/lib/personalization/scoring";
import type { PromptSignals } from "@/lib/prompt-intel/types";

jest.mock("@/lib/llm/client", () => ({
  getOpenAIProvider: jest.fn(() => (model: string) => model),
  invokeWithTimeout: jest.fn(
    (_timeout: number, operation: (signal: AbortSignal) => Promise<unknown>) =>
      operation(new AbortController().signal)
  ),
  retryWithExponentialBackoff: jest.fn(async (operation: (attempt: number) => Promise<unknown>) =>
    operation(1)
  ),
  shouldRetryOnError: jest.fn(() => false),
}));

const { retryWithExponentialBackoff } = jest.requireMock("@/lib/llm/client") as {
  retryWithExponentialBackoff: jest.Mock;
};

const baseSignals: PromptSignals = {
  teamSizeBracket: { value: "10-24", metadata: { source: "merge", confidence: 0.6 } },
  decisionMakers: { value: [], metadata: { source: "merge", confidence: 0.2 } },
  approvalChainDepth: { value: "unknown", metadata: { source: "merge", confidence: 0.2 } },
  tools: { value: ["Slack", "Jira"], metadata: { source: "keyword", confidence: 0.9 } },
  integrationCriticality: { value: "must-have", metadata: { source: "llm", confidence: 0.7 } },
  complianceTags: { value: [], metadata: { source: "merge", confidence: 0.1 } },
  copyTone: { value: "fast-paced", metadata: { source: "keyword", confidence: 0.8 } },
  industry: { value: "saas", metadata: { source: "llm", confidence: 0.6 } },
  primaryObjective: { value: "scale", metadata: { source: "llm", confidence: 0.6 } },
  constraints: { value: {}, metadata: { source: "merge", confidence: 0.1 } },
  operatingRegion: { value: "na", metadata: { source: "llm", confidence: 0.5 } },
};

const baseKnobs: RecipeKnobOverrides = {
  approvalChainLength: { value: 1, rationale: "", changedFromDefault: true },
  integrationMode: { value: "multi_tool", rationale: "", changedFromDefault: true },
  copyTone: { value: "collaborative", rationale: "", changedFromDefault: true },
  inviteStrategy: { value: "immediate", rationale: "", changedFromDefault: true },
  notificationCadence: { value: "daily", rationale: "", changedFromDefault: true },
};

describe("renderTemplateCopy", () => {
  beforeEach(() => {
    jest.resetAllMocks();
    process.env.OPENAI_API_KEY = "test-key";
  });

  it("returns validated copy from LLM response", async () => {
    retryWithExponentialBackoff.mockResolvedValueOnce({
      text: JSON.stringify({
        step_title: { title: "Open collaboration hub" },
        helper_text: { body: "Bring teammates together with Jira and Slack." },
      }),
    });

    const result = await renderTemplateCopy({
      recipeId: "R2",
      persona: "team" as CanvasPersona,
      signals: baseSignals,
      knobOverrides: baseKnobs,
      requests: [
        { templateId: "step_title" },
        { templateId: "helper_text" },
      ],
    });

    expect(result.templates).toHaveLength(2);
    const stepTitle = result.templates.find(item => item.templateId === "step_title");
    expect(stepTitle?.values.title).toBe("Open collaboration hub");
    expect(stepTitle?.issues).toHaveLength(0);
    const helper = result.templates.find(item => item.templateId === "helper_text");
    expect(helper?.values.body).toContain("Bring teammates together");
    expect(result.telemetry[0].hashedValues).toBeDefined();
  });

  it("falls back to defaults when LLM returns invalid JSON", async () => {
    retryWithExponentialBackoff.mockResolvedValueOnce({ text: "not-json" });

    const template = TEMPLATE_CATALOG.step_title;
    const result = await renderTemplateCopy({
      recipeId: "R2",
      persona: "team" as CanvasPersona,
      signals: baseSignals,
      knobOverrides: baseKnobs,
      requests: [{ templateId: "step_title" }],
    });

    expect(result.templates[0].values.title).toBe(template.slots[0].fallback);
    expect(result.templates[0].fallbackApplied).toBe(true);
    expect(result.templates[0].issues.some(issue => issue.reason.includes("invalid_template_json"))).toBe(true);
  });

  it("skips slots that already have values when partial is true", async () => {
    retryWithExponentialBackoff.mockReset();
    retryWithExponentialBackoff.mockImplementation(async (operation: (attempt: number) => Promise<unknown>) =>
      operation(1)
    );

    const result = await renderTemplateCopy({
      recipeId: "R2",
      persona: "team" as CanvasPersona,
      signals: baseSignals,
      knobOverrides: baseKnobs,
      requests: [
        {
          templateId: "helper_text",
          existingValues: { body: "Existing helper" },
          partial: true,
        },
      ],
    });

    expect(retryWithExponentialBackoff).not.toHaveBeenCalled();
    expect(result.templates[0].values.body).toBe("Existing helper");
  });
});
