import type { PromptSignalValue, PromptSignals } from "./types";

export const SIGNAL_LABEL_MAP: Partial<Record<keyof PromptSignals, string>> = {
  teamSizeBracket: "Team size",
  decisionMakers: "Decision makers",
  approvalChainDepth: "Approval depth",
  tools: "Tools",
  integrationCriticality: "Integration criticality",
  complianceTags: "Compliance",
  copyTone: "Copy tone",
  industry: "Industry",
  primaryObjective: "Primary objective",
  constraints: "Constraints",
  operatingRegion: "Region",
};

export const formatSignalValue = (signal: PromptSignalValue<unknown>): string => {
  const { value } = signal;
  if (Array.isArray(value)) {
    if (value.length === 0) {
      return "Not set";
    }
    if (typeof value[0] === "object" && value[0] !== null) {
      return `${value.length} entries`;
    }
    return value.join(", ");
  }

  if (value && typeof value === "object") {
    const parts: string[] = [];
    if ("timeline" in value && value.timeline) {
      parts.push(String(value.timeline));
    }
    if ("budget" in value && value.budget) {
      parts.push(String(value.budget));
    }
    if ("notes" in value && value.notes) {
      parts.push(String(value.notes));
    }
    return parts.length ? parts.join(" • ") : "No constraints";
  }

  if (value === null || value === undefined || value === "") {
    return "Not set";
  }

  return String(value);
};
