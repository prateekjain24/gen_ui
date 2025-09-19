import type { TemplateId } from "@/lib/canvas/templates";
import type { RecipeKnobOverrides } from "@/lib/personalization/scoring";
import { TemplateCompletionCache, type TemplateCacheKeyInput } from "@/lib/prompt-intel/template-cache";
import type { PromptSignals } from "@/lib/prompt-intel/types";

const baseTemplateId = "step_title" as TemplateId;

const baseKnobs: RecipeKnobOverrides = {
  approvalChainLength: { value: 1, rationale: "", changedFromDefault: true },
  integrationMode: { value: "multi_tool", rationale: "", changedFromDefault: true },
  copyTone: { value: "collaborative", rationale: "", changedFromDefault: true },
  inviteStrategy: { value: "immediate", rationale: "", changedFromDefault: true },
  notificationCadence: { value: "daily", rationale: "", changedFromDefault: true },
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

const cloneOverrides = (overrides: RecipeKnobOverrides): RecipeKnobOverrides =>
  Object.fromEntries(Object.entries(overrides).map(([key, value]) => [key, { ...value }])) as RecipeKnobOverrides;

const createKeyInput = (overrides: Partial<TemplateCacheKeyInput> = {}): TemplateCacheKeyInput => ({
  templateId: baseTemplateId,
  persona: "team",
  industry: baseSignals.industry.value,
  knobOverrides: cloneOverrides(baseKnobs),
  signals: { ...baseSignals },
  ...overrides,
});

describe("TemplateCompletionCache", () => {
  it("returns cached values before expiry", () => {
    const cache = new TemplateCompletionCache({ ttlMs: 1_000, now: () => Date.now() });
    const key = createKeyInput();
    cache.set(key, { title: "Open collaboration hub" });

    expect(cache.get(key)).toEqual({ title: "Open collaboration hub" });
  });

  it("expires entries when TTL elapses", () => {
    let currentTime = 1_000;
    const cache = new TemplateCompletionCache({ ttlMs: 2_000, now: () => currentTime });
    const key = createKeyInput();
    cache.set(key, { title: "Governance ready" });

    currentTime = 4_500;
    expect(cache.get(key)).toBeNull();
    cache.pruneExpired();
    expect(cache.size).toBe(0);
  });

  it("treats knob signature changes as cache misses", () => {
    const cache = new TemplateCompletionCache({ ttlMs: 5_000, now: () => Date.now() });
    const key = createKeyInput();
    cache.set(key, { title: "Automation blueprint" });

    const knobVariant = cloneOverrides(baseKnobs);
    knobVariant.copyTone.value = "governed";

    const missKey = createKeyInput({ knobOverrides: knobVariant });
    expect(cache.get(missKey)).toBeNull();
  });
});
