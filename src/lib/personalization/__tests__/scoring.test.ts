import { scoreRecipeKnobs } from "../scoring";

import type {
  PromptSignalMetadata,
  PromptSignalValue,
  PromptSignals,
  TeamSizeBracket,
  ApprovalChainDepth,
  ToolIdentifier,
  IntegrationCriticality,
  ComplianceTag,
  CopyTone,
  ConstraintSignal,
  DecisionMakerSignal,
} from "@/lib/prompt-intel/types";

function buildSignal<T>(value: T, metadata?: Partial<PromptSignalMetadata>): PromptSignalValue<T> {
  const base: PromptSignalMetadata = {
    source: metadata?.source ?? "merge",
    confidence: metadata?.confidence ?? 0.5,
    notes: metadata?.notes,
  };
  return { value, metadata: base };
}

function createSignals(): PromptSignals {
  return {
    teamSizeBracket: buildSignal<TeamSizeBracket>("unknown"),
    decisionMakers: buildSignal<DecisionMakerSignal[]>([]),
    approvalChainDepth: buildSignal<ApprovalChainDepth>("unknown"),
    tools: buildSignal<ToolIdentifier[]>([]),
    integrationCriticality: buildSignal<IntegrationCriticality>("unspecified"),
    complianceTags: buildSignal<ComplianceTag[]>([]),
    copyTone: buildSignal<CopyTone>("neutral"),
    industry: buildSignal("other"),
    primaryObjective: buildSignal("other"),
    constraints: buildSignal<ConstraintSignal>({}),
    operatingRegion: buildSignal("unspecified"),
  };
}

describe("scoreRecipeKnobs", () => {
  it("elevates approval chain for compliance signals", () => {
    const signals = createSignals();
    signals.complianceTags = buildSignal<ComplianceTag[]>(["SOC2"], {
      source: "keyword",
      confidence: 0.9,
    });

    const result = scoreRecipeKnobs("R2", signals);
    const overrides = result.overrides;

    expect(overrides.approvalChainLength.value).toBe(2);
    expect(overrides.approvalChainLength.changedFromDefault).toBe(true);
    expect(overrides.approvalChainLength.rationale).toContain("compliance");
    expect(overrides.notificationCadence.value).toBe("real_time");
    expect(result.fallback.applied).toBe(false);
    expect(result.fallback.reasons).toHaveLength(0);
  });

  it("selects multi-tool integration mode when Slack and Jira are detected", () => {
    const signals = createSignals();
    signals.tools = buildSignal<ToolIdentifier[]>(["Slack", "Jira"], {
      source: "keyword",
      confidence: 0.85,
    });
    signals.integrationCriticality = buildSignal<IntegrationCriticality>("must-have", {
      source: "llm",
      confidence: 0.7,
    });

    const result = scoreRecipeKnobs("R1", signals);
    const overrides = result.overrides;

    expect(overrides.integrationMode.value).toBe("multi_tool");
    expect(overrides.integrationMode.changedFromDefault).toBe(true);
    expect(overrides.integrationMode.rationale).toContain("Slack and Jira");
    expect(result.fallback.applied).toBe(false);
    expect(result.fallback.reasons).toHaveLength(0);
  });

  it("keeps defaults when approval depth confidence is too low", () => {
    const signals = createSignals();
    signals.approvalChainDepth = buildSignal<ApprovalChainDepth>("multi", {
      source: "llm",
      confidence: 0.2,
    });

    const result = scoreRecipeKnobs("R1", signals);
    const overrides = result.overrides;

    expect(overrides.approvalChainLength.value).toBe(0);
    expect(overrides.approvalChainLength.changedFromDefault).toBe(false);
    expect(overrides.approvalChainLength.rationale).toContain("Ignored low-confidence");
    expect(result.fallback.applied).toBe(true);
    expect(result.fallback.reasons).toContain("insufficient_confidence");
  });

  it("maps meticulous tone requests to compliance copy", () => {
    const signals = createSignals();
    signals.copyTone = buildSignal<CopyTone>("meticulous", {
      source: "keyword",
      confidence: 0.8,
    });

    const result = scoreRecipeKnobs("R1", signals);
    const overrides = result.overrides;

    expect(overrides.copyTone.value).toBe("compliance");
    expect(overrides.copyTone.changedFromDefault).toBe(true);
    expect(overrides.copyTone.rationale).toContain("Mapped extracted tone");
    expect(result.fallback.applied).toBe(false);
  });

  it("falls back when aggregate confidence stays below threshold", () => {
    const signals = createSignals();
    signals.tools = buildSignal<ToolIdentifier[]>(["Slack", "Jira"], {
      source: "keyword",
      confidence: 0.3,
    });
    signals.integrationCriticality = buildSignal<IntegrationCriticality>("must-have", {
      source: "llm",
      confidence: 0.28,
    });

    const result = scoreRecipeKnobs("R2", signals);

    expect(result.fallback.applied).toBe(true);
    expect(result.fallback.reasons).toContain("insufficient_confidence");
    expect(result.overrides.integrationMode.value).toBe("multi_tool");
    expect(result.overrides.integrationMode.changedFromDefault).toBe(false);
  });

  it("falls back when compliance conflicts with fast tone", () => {
    const signals = createSignals();
    signals.complianceTags = buildSignal<ComplianceTag[]>(["SOC2"], {
      source: "keyword",
      confidence: 0.9,
    });
    signals.copyTone = buildSignal<CopyTone>("fast-paced", {
      source: "llm",
      confidence: 0.85,
    });

    const result = scoreRecipeKnobs("R3", signals);

    expect(result.fallback.applied).toBe(true);
    expect(result.fallback.reasons).toContain("conflict_governance_vs_fast");
    Object.values(result.overrides).forEach(override => {
      expect(override.changedFromDefault).toBe(false);
    });
  });
});
