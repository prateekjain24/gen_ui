import React from "react";

import { CustomizeDrawer } from "./customize-drawer";

import type { RecipeKnobOverrides } from "@/lib/personalization/scoring";
import type { PromptSignals } from "@/lib/prompt-intel/types";

const noop = (): void => {
  // Storybook stories pass a stable callback but do not toggle the drawer open state.
};

const StoryViewport = ({ children }: { children: React.ReactNode }) => (
  <div className="relative min-h-screen bg-[radial-gradient(circle_at_top,_#f4f6fb,_#ffffff_65%)]">
    <div className="pointer-events-none absolute left-8 top-8 max-w-sm rounded-lg border border-primary/30 bg-primary/10 px-4 py-3 text-sm font-medium text-primary shadow-sm">
      These stories mount the customize drawer in isolation so reviewers can inspect signals, overrides, and reset
      controls without running the full canvas experience.
    </div>
    <div className="relative flex h-full items-start justify-end px-12 py-16">
      {children}
    </div>
  </div>
);

const defaultSignals: PromptSignals = {
  teamSizeBracket: {
    value: "10-24",
    metadata: { source: "keyword", confidence: 0.58 },
  },
  decisionMakers: {
    value: [
      { role: "Program Manager", seniority: "manager", isPrimary: true },
      { role: "Operations Lead", seniority: "manager", isPrimary: false },
    ],
    metadata: { source: "llm", confidence: 0.47 },
  },
  approvalChainDepth: {
    value: "dual",
    metadata: { source: "llm", confidence: 0.52 },
  },
  tools: {
    value: ["Slack", "Jira"],
    metadata: { source: "keyword", confidence: 0.84 },
  },
  integrationCriticality: {
    value: "must-have",
    metadata: { source: "merge", confidence: 0.63 },
  },
  complianceTags: {
    value: ["SOC2"],
    metadata: { source: "keyword", confidence: 0.41 },
  },
  copyTone: {
    value: "trusted-advisor",
    metadata: { source: "llm", confidence: 0.55 },
  },
  industry: {
    value: "saas",
    metadata: { source: "llm", confidence: 0.6 },
  },
  primaryObjective: {
    value: "scale",
    metadata: { source: "keyword", confidence: 0.5 },
  },
  constraints: {
    value: { timeline: "standard", budget: "premium" },
    metadata: { source: "llm", confidence: 0.44 },
  },
  operatingRegion: {
    value: "na",
    metadata: { source: "merge", confidence: 0.48 },
  },
};

const personalizedSignals: PromptSignals = {
  teamSizeBracket: {
    value: "25+",
    metadata: { source: "keyword", confidence: 0.72 },
  },
  decisionMakers: {
    value: [
      { role: "Head of PMO", seniority: "director+", isPrimary: true },
      { role: "Security Lead", seniority: "manager", isPrimary: true },
    ],
    metadata: { source: "merge", confidence: 0.68 },
  },
  approvalChainDepth: {
    value: "multi",
    metadata: { source: "llm", confidence: 0.61 },
  },
  tools: {
    value: ["Slack", "Jira", "ServiceNow"],
    metadata: { source: "keyword", confidence: 0.86 },
  },
  integrationCriticality: {
    value: "must-have",
    metadata: { source: "merge", confidence: 0.7 },
  },
  complianceTags: {
    value: ["SOX", "audit"],
    metadata: { source: "keyword", confidence: 0.57 },
  },
  copyTone: {
    value: "trusted-advisor",
    metadata: { source: "llm", confidence: 0.66 },
  },
  industry: {
    value: "fintech",
    metadata: { source: "llm", confidence: 0.64 },
  },
  primaryObjective: {
    value: "optimize",
    metadata: { source: "keyword", confidence: 0.59 },
  },
  constraints: {
    value: { timeline: "rush", budget: "premium", notes: "Board review in two weeks" },
    metadata: { source: "llm", confidence: 0.51 },
  },
  operatingRegion: {
    value: "global",
    metadata: { source: "merge", confidence: 0.53 },
  },
};

const personalizedOverrides: RecipeKnobOverrides = {
  approvalChainLength: {
    value: 3,
    rationale: "Scaled approvals for multi-region rollout",
    changedFromDefault: true,
  },
  integrationMode: {
    value: "custom",
    rationale: "Surface ServiceNow workflows alongside Slack and Jira",
    changedFromDefault: true,
  },
  copyTone: {
    value: "trusted-advisor",
    rationale: "LLM-matched tone with stakeholder expectations",
    changedFromDefault: true,
  },
  inviteStrategy: {
    value: "staggered",
    rationale: "Delay invites until compliance sign-off",
    changedFromDefault: true,
  },
  notificationCadence: {
    value: "weekly",
    rationale: "Stakeholder digest on Friday",
    changedFromDefault: false,
  },
};

const resetReadyOverrides: RecipeKnobOverrides = {
  approvalChainLength: {
    value: 2,
    rationale: "Raised approvals for finance involvement",
    changedFromDefault: true,
  },
  integrationMode: {
    value: "single_tool",
    rationale: "Testing a focused Jira-only path",
    changedFromDefault: true,
  },
  copyTone: {
    value: "collaborative",
    rationale: "Matching workshop cadence",
    changedFromDefault: true,
  },
  inviteStrategy: {
    value: "immediate",
    rationale: "Pilot requires simultaneous onboarding",
    changedFromDefault: true,
  },
  notificationCadence: {
    value: "daily",
    rationale: "Highlight rapid turnaround for trials",
    changedFromDefault: true,
  },
};

export default {
  title: "Canvas/CustomizeDrawer",
  component: CustomizeDrawer,
};

export const DefaultPlan = () => (
  <StoryViewport>
    <CustomizeDrawer
      open
      onOpenChange={noop}
      promptSignals={defaultSignals}
      previewCopy={{
        stepTitle: "Baseline team workspace",
        helperText: "We stay collaborative and recommend Slack + Jira integrations for setup.",
        primaryCta: "Invite teammates",
      }}
    />
  </StoryViewport>
);

export const PersonalizedPlan = () => (
  <StoryViewport>
    <CustomizeDrawer
      open
      onOpenChange={noop}
      promptSignals={personalizedSignals}
      knobOverrides={personalizedOverrides}
      previewCopy={{
        stepTitle: "Enterprise launch plan",
        helperText: "Tone shifts to trusted advisor with staged invites for compliance reviewers.",
        primaryCta: "Share with steering group",
      }}
    />
  </StoryViewport>
);

export const FallbackSignals = () => (
  <StoryViewport>
    <CustomizeDrawer
      open
      onOpenChange={noop}
      previewCopy={{
        stepTitle: "Awaiting signal enrichment",
        helperText: "Defaults hold steady while we gather more context from the prompt.",
        primaryCta: "Keep drafting",
      }}
    />
  </StoryViewport>
);

export const ResetFlow = () => (
  <StoryViewport>
    <CustomizeDrawer
      open
      onOpenChange={noop}
      promptSignals={defaultSignals}
      knobOverrides={resetReadyOverrides}
      previewCopy={{
        stepTitle: "Testing alternate path",
        helperText: "Controls are primed to reset after stakeholder review.",
        primaryCta: "Save draft",
      }}
    />
  </StoryViewport>
);
