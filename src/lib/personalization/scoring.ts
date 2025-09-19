import type { CanvasRecipeId, RecipeKnobId, RecipeNumberKnobDefinition, RecipeEnumKnobDefinition } from "@/lib/canvas/recipes";
import { getRecipe } from "@/lib/canvas/recipes";
import type { PromptSignalMetadata, PromptSignals } from "@/lib/prompt-intel/types";
import { createDebugger } from "@/lib/utils/debug";

const log = createDebugger("Personalization:Scoring");

const HIGH_CONFIDENCE_THRESHOLD = 0.4;
const SUPPORTING_CONFIDENCE_THRESHOLD = 0.25;

export interface RecipeKnobOverrideResult<TValue = string | number> {
  value: TValue;
  rationale: string;
  changedFromDefault: boolean;
}

export type RecipeKnobOverrides = Record<RecipeKnobId, RecipeKnobOverrideResult>;

export function scoreRecipeKnobs(recipeId: CanvasRecipeId, signals: PromptSignals): RecipeKnobOverrides {
  const recipe = getRecipe(recipeId);
  const overrides: Partial<Record<RecipeKnobId, RecipeKnobOverrideResult>> = {};

  Object.values(recipe.knobs).forEach(definition => {
    if (!definition) {
      return;
    }

    switch (definition.type) {
      case "number":
        if (definition.id === "approvalChainLength") {
          overrides[definition.id] = scoreApprovalChainLength(definition, signals);
        }
        break;
      case "enum":
        overrides[definition.id] = scoreEnumKnob(definition, signals, recipeId);
        break;
    }
  });

  log("Computed knob overrides for %s", recipeId);
  return overrides as RecipeKnobOverrides;
}

function scoreApprovalChainLength(
  definition: RecipeNumberKnobDefinition,
  signals: PromptSignals
): RecipeKnobOverrideResult<number> {
  const { approvalChainDepth, decisionMakers } = signals;

  let value = definition.defaultValue;
  const rationale: string[] = [];
  let changed = false;
  let locked = false;
  let ignoredLowConfidence = false;

  const complianceEscalation = hasComplianceSignals(signals);
  const primaryDeciders = decisionMakers.value.filter(decider => decider.isPrimary);
  const multipleApprovers = primaryDeciders.length >= 2;
  const hasDecisionSignals = decisionMakers.value.length > 0;
  const canTrustDecisionMakers = hasDecisionSignals && shouldUseSignal(decisionMakers.metadata, multipleApprovers);

  const depth = approvalChainDepth.value;
  const depthPresent = depth !== "unknown";

  if (depthPresent) {
    const mappedValue = mapApprovalDepthToLength(depth);
    if (shouldUseSignal(approvalChainDepth.metadata, complianceEscalation || multipleApprovers)) {
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
  recipeId: CanvasRecipeId
): RecipeKnobOverrideResult<string> {
  switch (definition.id) {
    case "integrationMode":
      return scoreIntegrationMode(definition, signals, recipeId);
    case "copyTone":
      return scoreCopyTone(definition, signals);
    case "inviteStrategy":
      return scoreInviteStrategy(definition, signals, recipeId);
    case "notificationCadence":
      return scoreNotificationCadence(definition, signals);
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
  recipeId: CanvasRecipeId
): RecipeKnobOverrideResult<string> {
  const defaultValue = definition.defaultValue;
  let value = defaultValue;
  const rationale: string[] = [];
  let changed = false;
  let locked = false;

  const compliance = hasComplianceSignals(signals);
  const tools = signals.tools.value;
  const multiToolEvidence = tools.includes("Slack") && tools.includes("Jira");
  const toolCount = tools.length;
  const integrationMustHave = signals.integrationCriticality.value === "must-have";
  const integrationConfidence = signals.integrationCriticality.metadata.confidence;
  const toolConfidence = signals.tools.metadata.confidence;

  if (compliance) {
    value = "governed";
    changed = value !== defaultValue;
    rationale.push("Compliance or governance signals detected – forcing governed integrations");
    locked = true;
  }

  if (!locked && toolCount >= 2 && shouldUseConfidence(toolConfidence, integrationMustHave || multiToolEvidence)) {
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
  signals: PromptSignals
): RecipeKnobOverrideResult<string> {
  const defaultValue = definition.defaultValue;
  let value = defaultValue;
  const rationale: string[] = [];
  let changed = false;
  let locked = false;

  const tone = signals.copyTone.value;
  const toneConfidence = signals.copyTone.metadata.confidence;
  const compliance = hasComplianceSignals(signals);

  if (compliance && defaultValue !== "compliance") {
    value = "compliance";
    changed = value !== defaultValue;
    rationale.push("Compliance signals found; shifting copy to formal tone");
    locked = true;
  }

  if (!locked && tone !== "neutral" && shouldUseConfidence(toneConfidence, compliance)) {
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
  recipeId: CanvasRecipeId
): RecipeKnobOverrideResult<string> {
  const defaultValue = definition.defaultValue;
  let value = defaultValue;
  const rationale: string[] = [];
  let changed = false;
  let locked = false;

  const teamSize = signals.teamSizeBracket.value;
  const teamConfidence = signals.teamSizeBracket.metadata.confidence;
  const multipleApprovers = signals.decisionMakers.value.filter(decider => decider.isPrimary).length > 1;
  const decisionConfidence = signals.decisionMakers.metadata.confidence;
  const compliance = hasComplianceSignals(signals);

  if (compliance) {
    value = "staged";
    changed = value !== defaultValue;
    rationale.push("Compliance cues present; staging invites until controls are ready");
    locked = true;
  }

  if (!locked && teamSize === "solo" && shouldUseConfidence(teamConfidence, false)) {
    value = "self_serve";
    changed = value !== defaultValue;
    rationale.push("Solo team detected; delaying invites until user opts in");
    locked = true;
  }

  if (!locked && multipleApprovers && shouldUseConfidence(decisionConfidence, compliance)) {
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
  signals: PromptSignals
): RecipeKnobOverrideResult<string> {
  const defaultValue = definition.defaultValue;
  let value = defaultValue;
  const rationale: string[] = [];
  let changed = false;
  let locked = false;

  const constraints = signals.constraints.value;
  const constraintConfidence = signals.constraints.metadata.confidence;
  const teamSize = signals.teamSizeBracket.value;
  const teamConfidence = signals.teamSizeBracket.metadata.confidence;
  const compliance = hasComplianceSignals(signals);

  if (compliance) {
    value = "real_time";
    changed = value !== defaultValue;
    rationale.push("Compliance focus detected; escalating to real-time notifications");
    locked = true;
  }

  if (!locked && constraints.timeline === "rush" && shouldUseConfidence(constraintConfidence, true)) {
    value = "real_time";
    changed = value !== defaultValue;
    rationale.push("Rush timeline requires real-time notifications");
    locked = true;
  } else if (!locked && constraints.timeline === "flexible" && shouldUseConfidence(constraintConfidence, false)) {
    value = "weekly";
    changed = value !== defaultValue;
    rationale.push("Flexible timeline allows slower notification cadence");
    locked = true;
  }

  if (!locked && teamSize !== "unknown" && shouldUseConfidence(teamConfidence, compliance)) {
    if (teamSize === "solo") {
      value = "none";
      changed = value !== defaultValue;
      rationale.push("Solo operator – suppressing notifications by default");
    } else if (teamSize === "1-9") {
      value = "weekly";
      changed = value !== defaultValue;
      rationale.push("Small team – weekly digest keeps signal without noise");
    } else if (teamSize === "10-24") {
      value = "daily";
      changed = value !== defaultValue;
      rationale.push("Mid-size team – daily summaries recommended");
    } else if (teamSize === "25+") {
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

function hasComplianceSignals(signals: PromptSignals): boolean {
  const tags = signals.complianceTags.value;
  const objective = signals.primaryObjective.value;
  const approvalDepth = signals.approvalChainDepth.value;

  const complianceTagsPresent = Array.isArray(tags) && tags.length > 0;
  const complianceObjective = objective === "compliance" && shouldUseConfidence(signals.primaryObjective.metadata.confidence, complianceTagsPresent);
  const multiApproval = approvalDepth === "multi" && shouldUseConfidence(signals.approvalChainDepth.metadata.confidence, complianceTagsPresent);

  return complianceTagsPresent || complianceObjective || multiApproval;
}

function formatConfidence(confidence: number): string {
  return confidence.toFixed(2);
}
