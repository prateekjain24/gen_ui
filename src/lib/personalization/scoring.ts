import type {
  CanvasRecipe,
  CanvasRecipeId,
  RecipeKnobId,
  RecipeNumberKnobDefinition,
  RecipeEnumKnobDefinition,
} from "@/lib/canvas/recipes";
import { getRecipe } from "@/lib/canvas/recipes";
import type {
  CopyTone,
  PromptSignalMetadata,
  PromptSignals,
  TeamSizeBracket,
} from "@/lib/prompt-intel/types";
import { createDebugger } from "@/lib/utils/debug";

const log = createDebugger("Personalization:Scoring");

const HIGH_CONFIDENCE_THRESHOLD = 0.4;
const SUPPORTING_CONFIDENCE_THRESHOLD = 0.25;
const FALLBACK_CONFIDENCE_THRESHOLD = 0.5;

export interface RecipeKnobOverrideResult<TValue = string | number> {
  value: TValue;
  rationale: string;
  changedFromDefault: boolean;
}

export type RecipeKnobOverrides = Record<RecipeKnobId, RecipeKnobOverrideResult>;

export type PersonalizationFallbackReason =
  | "insufficient_confidence"
  | "conflict_governance_vs_fast"
  | "conflict_solo_vs_team";

export interface PersonalizationFallbackMeta {
  applied: boolean;
  reasons: PersonalizationFallbackReason[];
  aggregateConfidence: number;
  details: string[];
}

export interface RecipePersonalizationResult {
  overrides: RecipeKnobOverrides;
  fallback: PersonalizationFallbackMeta;
}

interface PersonalizationContext {
  registerConfidence: (confidence: number) => void;
  addFallbackReason: (reason: PersonalizationFallbackReason, note?: string) => void;
  getAggregateConfidence: () => number;
  getFallbackReasons: () => PersonalizationFallbackReason[];
  getFallbackNotes: () => string[];
}

interface ConflictDescriptor {
  reason: PersonalizationFallbackReason;
  note: string;
}

export function scoreRecipeKnobs(
  recipeId: CanvasRecipeId,
  signals: PromptSignals
): RecipePersonalizationResult {
  const recipe = getRecipe(recipeId);
  const context = createPersonalizationContext();

  const conflicts = detectConflicts(signals);
  if (conflicts.length > 0) {
    conflicts.forEach(conflict => context.addFallbackReason(conflict.reason, conflict.note));
    const fallbackOverrides = createDefaultOverrides(recipe, conflictRationaleLabel(conflicts));
    const aggregateConfidence = context.getAggregateConfidence();
    const fallbackMeta: PersonalizationFallbackMeta = {
      applied: true,
      reasons: context.getFallbackReasons(),
      aggregateConfidence,
      details: context.getFallbackNotes(),
    };
    log("Fallback enforced due to signal conflicts for %s", recipeId);
    return {
      overrides: fallbackOverrides,
      fallback: fallbackMeta,
    };
  }

  const overrides: Partial<Record<RecipeKnobId, RecipeKnobOverrideResult>> = {};

  Object.values(recipe.knobs).forEach(definition => {
    if (!definition) {
      return;
    }

    switch (definition.type) {
      case "number":
        if (definition.id === "approvalChainLength") {
          overrides[definition.id] = scoreApprovalChainLength(definition, signals, context);
        }
        break;
      case "enum":
        overrides[definition.id] = scoreEnumKnob(definition, signals, recipeId, context);
        break;
    }
  });

  const resolvedOverrides = overrides as RecipeKnobOverrides;
  const aggregateConfidence = context.getAggregateConfidence();
  let fallbackApplied = false;
  if (aggregateConfidence < FALLBACK_CONFIDENCE_THRESHOLD) {
    fallbackApplied = true;
    context.addFallbackReason(
      "insufficient_confidence",
      `Aggregate confidence ${aggregateConfidence.toFixed(2)} below ${FALLBACK_CONFIDENCE_THRESHOLD.toFixed(2)}`
    );
  }

  if (fallbackApplied) {
    log("Fallback enforced due to insufficient confidence for %s", recipeId);
    const fallbackOverrides = applyFallbackDefaults(
      recipe,
      resolvedOverrides,
      "Default preserved due to fallback guardrail."
    );
    return {
      overrides: fallbackOverrides,
      fallback: {
        applied: true,
        reasons: context.getFallbackReasons(),
        aggregateConfidence,
        details: context.getFallbackNotes(),
      },
    };
  }

  log("Computed knob overrides for %s (aggregate confidence %.2f)", recipeId, aggregateConfidence);

  const reasons = context.getFallbackReasons();
  const details = context.getFallbackNotes();

  return {
    overrides: resolvedOverrides,
    fallback: {
      applied: reasons.length > 0,
      reasons,
      aggregateConfidence,
      details,
    },
  };
}

function scoreApprovalChainLength(
  definition: RecipeNumberKnobDefinition,
  signals: PromptSignals,
  context: PersonalizationContext
): RecipeKnobOverrideResult<number> {
  const { approvalChainDepth, decisionMakers } = signals;

  let value = definition.defaultValue;
  const rationale: string[] = [];
  let changed = false;
  let locked = false;
  let ignoredLowConfidence = false;

  const complianceEscalation = evaluateCompliance(signals, context);
  const primaryDeciders = decisionMakers.value.filter(decider => decider.isPrimary);
  const multipleApprovers = primaryDeciders.length >= 2;
  const hasDecisionSignals = decisionMakers.value.length > 0;
  const canTrustDecisionMakers = hasDecisionSignals && shouldUseSignal(decisionMakers.metadata, multipleApprovers);

  const depth = approvalChainDepth.value;
  const depthPresent = depth !== "unknown";

  if (depthPresent) {
    const mappedValue = mapApprovalDepthToLength(depth);
    if (shouldUseSignal(approvalChainDepth.metadata, complianceEscalation || multipleApprovers)) {
      context.registerConfidence(approvalChainDepth.metadata.confidence ?? 0);
      value = clampNumberKnob(definition, mappedValue);
      changed = value !== definition.defaultValue;
      rationale.push(
        `Mapped approval depth '${depth}' (confidence ${formatConfidence(
          approvalChainDepth.metadata.confidence
        )}) to ${value}`
      );
    } else {
      ignoredLowConfidence = true;
    }
  }

  if (complianceEscalation) {
    if (value < 2) {
      value = clampNumberKnob(definition, 2);
      changed = value !== definition.defaultValue;
    }
    rationale.push("Raised approvals for compliance-sensitive signals");
    locked = true;
  }

  if (!locked && canTrustDecisionMakers && value < 1) {
    context.registerConfidence(decisionMakers.metadata.confidence ?? 0);
    value = clampNumberKnob(definition, 1);
    changed = value !== definition.defaultValue;
    rationale.push("Ensured at least one approver based on multiple decision makers");
    locked = true;
  }

  if (!changed) {
    rationale.push(`Kept default (${definition.defaultValue}) due to limited high-confidence signals.`);
  }

  if (ignoredLowConfidence) {
    rationale.push("Ignored low-confidence approval depth signal (<0.4)");
  }

  return {
    value,
    rationale: rationale.join(". "),
    changedFromDefault: changed,
  };
}

function scoreEnumKnob(
  definition: RecipeEnumKnobDefinition,
  signals: PromptSignals,
  recipeId: CanvasRecipeId,
  context: PersonalizationContext
): RecipeKnobOverrideResult<string> {
  switch (definition.id) {
    case "integrationMode":
      return scoreIntegrationMode(definition, signals, recipeId, context);
    case "copyTone":
      return scoreCopyTone(definition, signals, context);
    case "inviteStrategy":
      return scoreInviteStrategy(definition, signals, recipeId, context);
    case "notificationCadence":
      return scoreNotificationCadence(definition, signals, context);
    default:
      return {
        value: definition.defaultValue,
        changedFromDefault: false,
        rationale: "No personalization rules defined; kept default value.",
      };
  }
}

function scoreIntegrationMode(
  definition: RecipeEnumKnobDefinition,
  signals: PromptSignals,
  recipeId: CanvasRecipeId,
  context: PersonalizationContext
): RecipeKnobOverrideResult<string> {
  const defaultValue = definition.defaultValue;
  let value = defaultValue;
  const rationale: string[] = [];
  let changed = false;
  let locked = false;

  const compliance = evaluateCompliance(signals, context);
  const tools = signals.tools.value;
  const multiToolEvidence = tools.includes("Slack") && tools.includes("Jira");
  const toolCount = tools.length;
  const integrationMustHave = signals.integrationCriticality.value === "must-have";
  const integrationConfidence = signals.integrationCriticality.metadata.confidence ?? 0;
  const toolConfidence = signals.tools.metadata.confidence ?? 0;

  if (compliance) {
    value = "governed";
    changed = value !== defaultValue;
    rationale.push("Compliance or governance signals detected – forcing governed integrations");
    locked = true;
  }

  if (!locked && toolCount >= 2 && shouldUseConfidence(toolConfidence, integrationMustHave || multiToolEvidence)) {
    context.registerConfidence(toolConfidence ?? 0);
    value = "multi_tool";
    changed = value !== defaultValue;
    rationale.push(
      multiToolEvidence
        ? "Detected Slack and Jira; prioritizing multi-tool integrations"
        : "Multiple high-confidence tools referenced; surfacing multi-tool mode"
    );
    locked = true;
  }

  if (!locked && integrationMustHave && shouldUseConfidence(integrationConfidence, toolCount > 0)) {
    context.registerConfidence(integrationConfidence ?? 0);
    value = "multi_tool";
    changed = value !== defaultValue;
    rationale.push("Integration called out as must-have; elevating multi-tool mode");
    locked = true;
  }

  if (!locked && recipeId === "R3" && value !== "client_portal") {
    value = "client_portal";
    changed = value !== defaultValue;
    rationale.push("Client recipe prefers portal integrations by default");
    locked = true;
  }

  if (!changed) {
    rationale.push(`Kept default ('${defaultValue}') with no strong integration signals.`);
  }

  return {
    value,
    rationale: rationale.join(". "),
    changedFromDefault: changed,
  };
}

function scoreCopyTone(
  definition: RecipeEnumKnobDefinition,
  signals: PromptSignals,
  context: PersonalizationContext
): RecipeKnobOverrideResult<string> {
  const defaultValue = definition.defaultValue;
  let value = defaultValue;
  const rationale: string[] = [];
  let changed = false;
  let locked = false;

  const tone = signals.copyTone.value;
  const toneConfidence = signals.copyTone.metadata.confidence ?? 0;
  const compliance = evaluateCompliance(signals, context);

  if (compliance && defaultValue !== "compliance") {
    value = "compliance";
    changed = value !== defaultValue;
    rationale.push("Compliance signals found; shifting copy to formal tone");
    locked = true;
  }

  if (!locked && tone !== "neutral" && shouldUseConfidence(toneConfidence, compliance)) {
    context.registerConfidence(toneConfidence ?? 0);
    const mappedTone = mapCopyToneToKnob(tone);
    if (mappedTone && mappedTone !== value) {
      value = mappedTone;
      changed = value !== defaultValue;
      rationale.push(`Mapped extracted tone '${tone}' to knob '${mappedTone}'`);
    }
  }

  if (!changed) {
    rationale.push(`Kept default ('${defaultValue}') due to neutral or low-confidence tone.`);
  }

  return {
    value,
    rationale: rationale.join(". "),
    changedFromDefault: changed,
  };
}

function scoreInviteStrategy(
  definition: RecipeEnumKnobDefinition,
  signals: PromptSignals,
  recipeId: CanvasRecipeId,
  context: PersonalizationContext
): RecipeKnobOverrideResult<string> {
  const defaultValue = definition.defaultValue;
  let value = defaultValue;
  const rationale: string[] = [];
  let changed = false;
  let locked = false;

  const teamSize = signals.teamSizeBracket.value;
  const teamConfidence = signals.teamSizeBracket.metadata.confidence ?? 0;
  const multipleApprovers = signals.decisionMakers.value.filter(decider => decider.isPrimary).length > 1;
  const decisionConfidence = signals.decisionMakers.metadata.confidence ?? 0;
  const compliance = evaluateCompliance(signals, context);

  if (compliance) {
    value = "staged";
    changed = value !== defaultValue;
    rationale.push("Compliance cues present; staging invites until controls are ready");
    locked = true;
  }

  if (!locked && teamSize === "solo" && shouldUseConfidence(teamConfidence, false)) {
    context.registerConfidence(teamConfidence ?? 0);
    value = "self_serve";
    changed = value !== defaultValue;
    rationale.push("Solo team detected; delaying invites until user opts in");
    locked = true;
  }

  if (!locked && multipleApprovers && shouldUseConfidence(decisionConfidence, compliance)) {
    context.registerConfidence(decisionConfidence ?? 0);
    value = "staged";
    changed = value !== defaultValue;
    rationale.push("Multiple decision makers detected; using staged invite rollout");
    locked = true;
  }

  if (
    !locked &&
    teamSize !== "unknown" &&
    teamSize !== "solo" &&
    shouldUseConfidence(teamConfidence, multipleApprovers)
  ) {
    context.registerConfidence(teamConfidence ?? 0);
    value = "immediate";
    changed = value !== defaultValue;
    rationale.push("Team size implies collaboration; prompting immediate invites");
    locked = true;
  }

  if (!locked && recipeId === "R3" && value !== "stakeholder_first") {
    value = "stakeholder_first";
    changed = value !== defaultValue;
    rationale.push("Client recipe prioritises stakeholder invites first");
    locked = true;
  }

  if (!changed) {
    rationale.push(`Kept default ('${defaultValue}') due to insufficient invite signals.`);
  }

  return {
    value,
    rationale: rationale.join(". "),
    changedFromDefault: changed,
  };
}

function scoreNotificationCadence(
  definition: RecipeEnumKnobDefinition,
  signals: PromptSignals,
  context: PersonalizationContext
): RecipeKnobOverrideResult<string> {
  const defaultValue = definition.defaultValue;
  let value = defaultValue;
  const rationale: string[] = [];
  let changed = false;
  let locked = false;

  const constraints = signals.constraints.value;
  const constraintConfidence = signals.constraints.metadata.confidence ?? 0;
  const teamSize = signals.teamSizeBracket.value;
  const teamConfidence = signals.teamSizeBracket.metadata.confidence ?? 0;
  const compliance = evaluateCompliance(signals, context);

  if (compliance) {
    value = "real_time";
    changed = value !== defaultValue;
    rationale.push("Compliance focus detected; escalating to real-time notifications");
    locked = true;
  }

  if (!locked && constraints.timeline === "rush" && shouldUseConfidence(constraintConfidence, true)) {
    context.registerConfidence(constraintConfidence ?? 0);
    value = "real_time";
    changed = value !== defaultValue;
    rationale.push("Rush timeline requires real-time notifications");
    locked = true;
  } else if (!locked && constraints.timeline === "flexible" && shouldUseConfidence(constraintConfidence, false)) {
    context.registerConfidence(constraintConfidence ?? 0);
    value = "weekly";
    changed = value !== defaultValue;
    rationale.push("Flexible timeline allows slower notification cadence");
    locked = true;
  }

  if (!locked && teamSize !== "unknown" && shouldUseConfidence(teamConfidence, compliance)) {
    if (teamSize === "solo") {
      context.registerConfidence(teamConfidence ?? 0);
      value = "none";
      changed = value !== defaultValue;
      rationale.push("Solo operator – suppressing notifications by default");
    } else if (teamSize === "1-9") {
      context.registerConfidence(teamConfidence ?? 0);
      value = "weekly";
      changed = value !== defaultValue;
      rationale.push("Small team – weekly digest keeps signal without noise");
    } else if (teamSize === "10-24") {
      context.registerConfidence(teamConfidence ?? 0);
      value = "daily";
      changed = value !== defaultValue;
      rationale.push("Mid-size team – daily summaries recommended");
    } else if (teamSize === "25+") {
      context.registerConfidence(teamConfidence ?? 0);
      value = "real_time";
      changed = value !== defaultValue;
      rationale.push("Large team – real-time alerts maintain alignment");
    }
    locked = true;
  }

  if (!changed) {
    rationale.push(`Kept default ('${defaultValue}') due to limited cadence cues.`);
  }

  return {
    value,
    rationale: rationale.join(". "),
    changedFromDefault: changed,
  };
}

function clampNumberKnob(definition: RecipeNumberKnobDefinition, value: number): number {
  const min = definition.min ?? Number.NEGATIVE_INFINITY;
  const max = definition.max ?? Number.POSITIVE_INFINITY;
  const clamped = Math.min(Math.max(value, min), max);
  if (definition.step && definition.step > 0) {
    const rounded = Math.round(clamped / definition.step) * definition.step;
    return clampNumberKnob({ ...definition, step: undefined }, rounded);
  }
  return clamped;
}

function mapApprovalDepthToLength(depth: string): number {
  switch (depth) {
    case "single":
      return 0;
    case "dual":
      return 1;
    case "multi":
      return 2;
    default:
      return 0;
  }
}

function mapCopyToneToKnob(tone: string): string | null {
  switch (tone) {
    case "fast-paced":
    case "onboarding":
      return "friendly";
    case "meticulous":
      return "compliance";
    case "trusted-advisor":
    case "migration":
      return "client_ready";
    default:
      return null;
  }
}

function shouldUseSignal(metadata: PromptSignalMetadata, hasSupportingEvidence: boolean): boolean {
  if (!metadata) {
    return false;
  }

  if (metadata.confidence >= HIGH_CONFIDENCE_THRESHOLD) {
    return true;
  }

  return hasSupportingEvidence && metadata.confidence >= SUPPORTING_CONFIDENCE_THRESHOLD;
}

function shouldUseConfidence(confidence: number, hasSupportingEvidence: boolean): boolean {
  if (confidence >= HIGH_CONFIDENCE_THRESHOLD) {
    return true;
  }

  return hasSupportingEvidence && confidence >= SUPPORTING_CONFIDENCE_THRESHOLD;
}

function formatConfidence(confidence: number): string {
  return confidence.toFixed(2);
}

function createPersonalizationContext(): PersonalizationContext {
  const confidences: number[] = [];
  const reasons = new Set<PersonalizationFallbackReason>();
  const notes = new Set<string>();

  return {
    registerConfidence(confidence: number) {
      if (Number.isFinite(confidence)) {
        confidences.push(confidence);
      }
    },
    addFallbackReason(reason: PersonalizationFallbackReason, note?: string) {
      reasons.add(reason);
      if (note) {
        notes.add(note);
      }
    },
    getAggregateConfidence() {
      if (confidences.length === 0) {
        return 0;
      }
      const total = confidences.reduce((sum, value) => sum + value, 0);
      return total / confidences.length;
    },
    getFallbackReasons() {
      return Array.from(reasons);
    },
    getFallbackNotes() {
      return Array.from(notes);
    },
  };
}

function detectConflicts(signals: PromptSignals): ConflictDescriptor[] {
  const conflicts: ConflictDescriptor[] = [];

  const complianceConfidence = Math.max(
    signals.complianceTags.metadata.confidence ?? 0,
    signals.primaryObjective.value === "compliance"
      ? signals.primaryObjective.metadata.confidence ?? 0
      : 0,
    signals.approvalChainDepth.value === "multi"
      ? signals.approvalChainDepth.metadata.confidence ?? 0
      : 0
  );

  const toneConflict = isComplianceToneConflict(signals.copyTone.value, signals.copyTone.metadata.confidence);
  if (complianceConfidence >= FALLBACK_CONFIDENCE_THRESHOLD && toneConflict) {
    conflicts.push({
      reason: "conflict_governance_vs_fast",
      note: "Compliance cues conflicted with high-energy tone",
    });
  }

  const teamConflict = isSoloTeamConflict(
    signals.teamSizeBracket.value,
    signals.decisionMakers.value,
    signals.teamSizeBracket.metadata.confidence,
    signals.decisionMakers.metadata.confidence
  );

  if (teamConflict) {
    conflicts.push({
      reason: "conflict_solo_vs_team",
      note: "Solo team signal conflicted with multiple decision makers",
    });
  }

  return conflicts;
}

function isComplianceToneConflict(tone: CopyTone, toneConfidence?: number): boolean {
  if (!toneConfidence || toneConfidence < FALLBACK_CONFIDENCE_THRESHOLD) {
    return false;
  }

  return tone === "fast-paced" || tone === "onboarding";
}

function isSoloTeamConflict(
  teamSize: TeamSizeBracket,
  deciders: PromptSignals["decisionMakers"]["value"],
  teamConfidence?: number,
  deciderConfidence?: number
): boolean {
  if (!teamConfidence || !deciderConfidence) {
    return false;
  }

  if (teamConfidence < FALLBACK_CONFIDENCE_THRESHOLD || deciderConfidence < FALLBACK_CONFIDENCE_THRESHOLD) {
    return false;
  }

  const isSolo = teamSize === "solo";
  const primaryCount = deciders.filter(decider => decider.isPrimary).length;

  return isSolo && primaryCount > 1;
}

function evaluateCompliance(signals: PromptSignals, context: PersonalizationContext): boolean {
  const tags = signals.complianceTags.value;
  const objective = signals.primaryObjective.value;
  const approvalDepth = signals.approvalChainDepth.value;

  const complianceTagsPresent = Array.isArray(tags) && tags.length > 0;
  if (complianceTagsPresent && shouldUseConfidence(signals.complianceTags.metadata.confidence ?? 0, false)) {
    context.registerConfidence(signals.complianceTags.metadata.confidence ?? 0);
    return true;
  }

  const complianceObjective = objective === "compliance";
  if (
    complianceObjective &&
    shouldUseConfidence(signals.primaryObjective.metadata.confidence ?? 0, complianceTagsPresent)
  ) {
    context.registerConfidence(signals.primaryObjective.metadata.confidence ?? 0);
    return true;
  }

  const multiApproval = approvalDepth === "multi";
  if (
    multiApproval &&
    shouldUseConfidence(signals.approvalChainDepth.metadata.confidence ?? 0, complianceTagsPresent)
  ) {
    context.registerConfidence(signals.approvalChainDepth.metadata.confidence ?? 0);
    return true;
  }

  return false;
}

function createDefaultOverrides(
  recipe: CanvasRecipe,
  rationale: string
): RecipeKnobOverrides {
  const overrides: Partial<Record<RecipeKnobId, RecipeKnobOverrideResult>> = {};
  Object.values(recipe.knobs).forEach(definition => {
    if (!definition) {
      return;
    }

    overrides[definition.id] = {
      value: definition.defaultValue,
      changedFromDefault: false,
      rationale,
    };
  });
  return overrides as RecipeKnobOverrides;
}

function conflictRationaleLabel(conflicts: ConflictDescriptor[]): string {
  if (conflicts.length === 0) {
    return "Default preserved.";
  }

  const labels = conflicts.map(conflict => conflict.note).join("; ");
  return `Default preserved due to ${labels}.`;
}

function applyFallbackDefaults(
  recipe: CanvasRecipe,
  overrides: RecipeKnobOverrides,
  fallbackNote: string
): RecipeKnobOverrides {
  const merged: Partial<Record<RecipeKnobId, RecipeKnobOverrideResult>> = {};

  Object.values(recipe.knobs).forEach(definition => {
    if (!definition) {
      return;
    }

    const existing = overrides[definition.id];
    const rationale = [existing?.rationale, fallbackNote].filter(Boolean).join(" ");

    merged[definition.id] = {
      value: definition.defaultValue,
      changedFromDefault: false,
      rationale,
    };
  });

  return merged as RecipeKnobOverrides;
}
