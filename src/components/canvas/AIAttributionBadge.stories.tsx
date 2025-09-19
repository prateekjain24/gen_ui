import React from "react";

import { AIAttributionBadge } from "./AIAttributionBadge";

export default {
  title: "Canvas/AIAttributionBadge",
  component: AIAttributionBadge,
};

const aiAttribution = {
  source: "ai" as const,
  summary: "Personalized using collaboration signals",
  rationale: "Elevated tone based on Slack + Jira mention in prompt.",
  knob: {
    id: "copyTone",
    label: "Copy tone",
    value: "Collaborative",
    changed: true,
  },
  signals: [
    { label: "Copy tone", value: "fast-paced", confidence: 0.82 },
    { label: "Tools", value: "Slack, Jira", confidence: 0.91 },
  ],
};

const fallbackAttribution = {
  source: "fallback" as const,
  summary: "Using defaults after validation issues",
  fallbackDetails: ["LLM returned invalid JSON", "Reused baseline helper text"],
  signals: [],
};

const defaultAttribution = {
  source: "default" as const,
  summary: "Using standard template settings",
  signals: [{ label: "Primary objective", value: "scale" }],
};

export const Personalized = () => <AIAttributionBadge attribution={aiAttribution} />;

export const Fallback = () => <AIAttributionBadge attribution={fallbackAttribution} />;

export const DefaultTemplate = () => <AIAttributionBadge attribution={defaultAttribution} />;
