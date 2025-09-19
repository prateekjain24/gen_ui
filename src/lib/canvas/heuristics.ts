import type { CanvasRecipeId } from "./recipes";

export type HeuristicPersona = "explorer" | "team" | "power";

export interface HeuristicClassification {
  recipeId: CanvasRecipeId;
  intentTags: string[];
  persona: HeuristicPersona;
  confidence: number;
  reasoning: string;
}

const GOVERNANCE_KEYWORDS = ["policy", "approval", "audit", "security", "compliance"] as const;
const TEAM_KEYWORDS = ["team", "invite", "collaborate"] as const;
const CLIENT_KEYWORDS = ["client", "stakeholder", "agency", "contract"] as const;

const TEAM_INTENT_TAGS = ["integrations", "invites"] as const;
const CLIENT_INTENT_TAGS = ["client"] as const;
const GOVERNANCE_INTENT_TAGS = ["governance"] as const;
const SOLO_INTENT_TAGS = ["solo"] as const;

const MATCHED_CONFIDENCE = 0.8;
const DEFAULT_CONFIDENCE = 0.5;
const MAX_REASONING_LENGTH = 120;

/**
 * Extract lower-cased alphanumeric tokens from input text.
 */
export const extractKeywords = (message: string): string[] => {
  if (!message) {
    return [];
  }

  const matches = message.toLowerCase().match(/[a-z0-9]+/g);
  if (!matches) {
    return [];
  }

  const seen = new Set<string>();
  matches.forEach(token => {
    if (token) {
      seen.add(token);
    }
  });
  return Array.from(seen);
};

const findNumbersAtLeastThree = (message: string): string[] => {
  const matches = message.match(/\b\d+\b/g);
  if (!matches) {
    return [];
  }

  return matches.filter(token => {
    const value = Number.parseInt(token, 10);
    return Number.isInteger(value) && value >= 3;
  });
};

const formatReasoning = (prefix: string, signals: string[]): string => {
  const uniqueSignals = Array.from(new Set(signals));
  const detail = uniqueSignals.slice(0, 3).join(", ");
  const base = detail ? `${prefix}: ${detail}` : prefix;
  return base.length > MAX_REASONING_LENGTH ? `${base.slice(0, MAX_REASONING_LENGTH - 1)}…` : base;
};

const buildClassification = (
  recipeId: CanvasRecipeId,
  persona: HeuristicPersona,
  intentTags: readonly string[],
  reasoningPrefix: string,
  signals: string[]
): HeuristicClassification => ({
  recipeId,
  persona,
  intentTags: Array.from(intentTags),
  confidence: MATCHED_CONFIDENCE,
  reasoning: formatReasoning(reasoningPrefix, signals),
});

export const classifyByHeuristics = (message: string): HeuristicClassification => {
  const rawMessage = message ?? "";
  const normalizedMessage = rawMessage.toLowerCase();
  const keywords = extractKeywords(rawMessage);
  const numbers = findNumbersAtLeastThree(rawMessage);

  const governanceMatches = GOVERNANCE_KEYWORDS.filter(keyword => normalizedMessage.includes(keyword));
  if (governanceMatches.length > 0) {
    return buildClassification("R4", "power", GOVERNANCE_INTENT_TAGS, "Governance keywords detected", governanceMatches);
  }

  const teamSignals: string[] = [];
  TEAM_KEYWORDS.forEach(keyword => {
    if (keywords.includes(keyword)) {
      teamSignals.push(keyword);
    }
  });
  if (numbers.length > 0) {
    teamSignals.push(...numbers.map(number => `${number} people`));
  }

  if (teamSignals.length > 0) {
    return buildClassification("R2", "team", TEAM_INTENT_TAGS, "Team signals detected", teamSignals);
  }

  const clientSignals = CLIENT_KEYWORDS.filter(keyword => keywords.includes(keyword));
  if (clientSignals.length > 0) {
    return buildClassification("R3", "team", CLIENT_INTENT_TAGS, "Client signals detected", clientSignals);
  }

  return {
    recipeId: "R1",
    persona: "explorer",
    intentTags: Array.from(SOLO_INTENT_TAGS),
    confidence: DEFAULT_CONFIDENCE,
    reasoning: "Defaulted to explorer path",
  };
};
