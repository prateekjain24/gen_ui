"use client";

import { Loader2, Settings2 } from "lucide-react";
import * as React from "react";

import {
  CustomizeDrawer,
  type DrawerKnobState,
  formatCta as formatCustomizeCta,
  formatPreviewHelper as formatCustomizeHelper,
  inviteCaption as formatCustomizeInviteCaption,
  isCanvasKnobState,
  isPropertyGuruKnobState,
  urgencyToMoveInHorizon,
} from "@/app/canvas/components/customize-drawer";
import { PersonaBadge, PromptSignalsDebugPanel, ReasoningChip } from "@/components/canvas";
import { FormRenderer } from "@/components/form/FormRenderer";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useStaggeredMount } from "@/hooks/useStaggeredMount";
import { canvasCopy } from "@/lib/canvas/copy";
import type { CanvasRecipe, CanvasRecipeId, RecipeKnobDefinition, RecipeKnobId } from "@/lib/canvas/recipes";
import { getRecipe } from "@/lib/canvas/recipes";
import type { SlotValidationIssue } from "@/lib/canvas/template-validator";
import { isPropertyGuruPreset } from "@/lib/config/presets";
import { ENV } from "@/lib/constants";
import { FIELD_IDS } from "@/lib/constants/fields";
import type { RecipeKnobOverrides, RecipePersonalizationResult } from "@/lib/personalization/scoring";
import { formatSignalValue, SIGNAL_LABEL_MAP } from "@/lib/prompt-intel/format";
import type {
  ApprovalChainDepth,
  PromptSignals,
  TeamSizeBracket,
  ToolIdentifier,
} from "@/lib/prompt-intel/types";
import type { PropertyGuruPlanTemplate } from "@/lib/property-guru/prompt";
import { createTelemetryQueue, type TelemetryQueue } from "@/lib/telemetry/events";
import type { AIAttribution, AIAttributionSignal } from "@/lib/types/ai";
import type {
  ButtonAction,
  Field,
  FieldOption,
  FormPlan,
  IntegrationPickerField,
  StepperItem,
} from "@/lib/types/form";
import type { PropertyGuruSignals } from "@/lib/types/property-guru";
import { cn } from "@/lib/utils";
import {
  mapPropertyGuruPlanToSearchPayload,
  type PropertyGuruSearchPayload,
} from "@/lib/utils/property-guru-plan-mapper";
import { DEFAULT_PROPERTY_GURU_SIGNALS } from "@/lib/utils/property-guru-signals";

type CanvasDecisionSource = "llm" | "heuristics";

interface CanvasPlanResponse {
  recipeId: CanvasRecipeId;
  persona: "explorer" | "team" | "power";
  intentTags: string[];
  confidence: number;
  reasoning: string;
  decisionSource: CanvasDecisionSource;
  promptSignals: PromptSignals;
  personalization: RecipePersonalizationResult;
  templateCopy: TemplateCopyPayload;
}

interface TemplateCopyPayload {
  stepTitle: string;
  helperText: string;
  primaryCta: string;
  callout: {
    heading?: string;
    body: string;
  };
  badgeCaption: string;
  issues: SlotValidationIssue[];
  propertyGuruPlan?: PropertyGuruPlanTemplate;
  propertyGuruSignals?: PropertyGuruSignals;
  propertyGuruSignalsBaseline?: PropertyGuruSignals;
  propertyGuruSearchPayload?: PropertyGuruSearchPayload;
  propertyGuruDefaults?: string[];
}

interface CanvasPlanState extends CanvasPlanResponse {
  fields: Field[];
  formPlan: FormPlan;
}

const PROPERTY_GURU_PRESET_ENABLED = isPropertyGuruPreset();

const personaCopy: Record<CanvasPlanResponse["persona"], { title: string; description: string; stepLabel: string }> = {
  explorer: {
    title: "Explorer quick start",
    description: "Keep it lightweight so you can dive in immediately.",
    stepLabel: "Quick start",
  },
  team: {
    title: "Team workspace essentials",
    description: "Bring collaborators, integrations, and structure together.",
    stepLabel: "Team setup",
  },
  power: {
    title: "Governance-first configuration",
    description: "Enable approvals, auditing, and secure defaults from the start.",
    stepLabel: "Controls",
  },
};

const describeField = (field: Field): string => {
  switch (field.kind) {
    case "text":
      return "Text input";
    case "select":
      return "Select field";
    case "checkbox":
      return "Checklist";
    case "callout":
      return field.body;
    case "checklist":
      return `${field.items.length} checklist items`;
    case "info_badge":
      return "Persona badge";
    case "ai_hint":
      return field.body;
    case "integration_picker":
      return "Integration picker";
    case "teammate_invite":
      return "Invite teammates";
    case "admin_toggle":
      return "Admin toggle";
    default:
      return field.label;
  }
};

const KNOB_TO_FIELD_IDS: Partial<Record<RecipeKnobId, string[]>> = {
  approvalChainLength: [FIELD_IDS.ADMIN_CONTROLS],
  integrationMode: [FIELD_IDS.PREFERRED_INTEGRATIONS],
  inviteStrategy: [FIELD_IDS.TEAM_INVITES],
  notificationCadence: [FIELD_IDS.GUIDED_CHECKLIST],
};

const COPY_TONE_FIELD_IDS = [FIELD_IDS.GUIDED_CALLOUT, FIELD_IDS.PERSONA_INFO_BADGE];

const KNOB_SIGNAL_KEYS: Partial<Record<RecipeKnobId, Array<keyof PromptSignals>>> = {
  approvalChainLength: ["approvalChainDepth", "decisionMakers"],
  integrationMode: ["integrationCriticality", "tools"],
  copyTone: ["copyTone", "primaryObjective"],
  inviteStrategy: ["decisionMakers", "constraints"],
  notificationCadence: ["constraints"],
};

const MAX_FALLBACK_DETAILS = 3;

const slugify = (value: string): string =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");

const toolToOption = (tool: ToolIdentifier): { value: string; label: string } => ({
  value: slugify(tool),
  label: tool.replace(/\s+/g, " ").trim(),
});

const mergeIntegrationOptions = (
  field: IntegrationPickerField,
  tools: ToolIdentifier[]
): { options: FieldOption[]; values: string[] } => {
  const existing = new Map(field.options.map(option => [option.value, option] as const));
  const selected: string[] = [];

  tools.forEach(tool => {
    if (tool === "Other") {
      return;
    }
    const { value, label } = toolToOption(tool);
    if (!existing.has(value)) {
      existing.set(value, { value, label });
    }
    if (!selected.includes(value)) {
      selected.push(value);
    }
  });

  const options = Array.from(existing.values());
  const maxSelections = field.maxSelections ?? selected.length;
  return {
    options,
    values: selected.slice(0, maxSelections),
  };
};

const mapTeamSizeToOption = (bracket: TeamSizeBracket | undefined): string | undefined => {
  switch (bracket) {
    case "solo":
      return "1";
    case "1-9":
      return "2-5";
    case "10-24":
      return "6-20";
    case "25+":
      return "21-50";
    default:
      return undefined;
  }
};

const mapApprovalDepthToToggleValue = (depth: ApprovalChainDepth | undefined): string | undefined => {
  if (!depth || depth === "unknown") {
    return undefined;
  }
  return depth === "single" ? "disabled" : "required";
};

const MANUAL_OVERRIDE_RATIONALE = "Adjusted in Customize experience drawer.";

const INTEGRATION_MODE_HELPERS: Record<string, string> = {
  multi_tool: "Highlight the collaboration tools your team already uses.",
  single_tool: "Focus on your core system today—you can add more later.",
  custom: "Mix and match integrations to tailor this workspace.",
  lightweight: "Keep integrations optional until the team is ready.",
  client_portal: "Surface shared client folders and handoffs first.",
  governed: "Limit integrations to vetted systems with guardrails.",
};

const mapInviteStrategyToOverrideValue = (strategy: 'immediate' | 'staggered'): string =>
  strategy === 'staggered' ? 'staged' : strategy;

const normalizeApprovalLength = (
  value: number,
  definition: RecipeKnobDefinition | undefined
): number => {
  if (!Number.isFinite(value)) {
    return 0;
  }
  const numeric = Math.max(0, Math.round(value));
  if (!definition || definition.type !== "number") {
    return numeric;
  }
  const min = typeof definition.min === "number" ? definition.min : Number.NEGATIVE_INFINITY;
  const max = typeof definition.max === "number" ? definition.max : Number.POSITIVE_INFINITY;
  return Math.min(Math.max(numeric, min), max);
};

const deriveIntegrationHelper = (mode: string | undefined, fallback?: string): string | undefined => {
  if (!mode) {
    return fallback;
  }
  return INTEGRATION_MODE_HELPERS[mode] ?? fallback;
};

const applyCanvasKnobOverridesToPlan = (plan: CanvasPlanState, state: DrawerKnobState): CanvasPlanState => {
  if (!isCanvasKnobState(state)) {
    return plan;
  }

  const recipe = getRecipe(plan.recipeId);
  const knobDefinitions = recipe.knobs ?? {};

  const normalizedApproval = normalizeApprovalLength(state.approvalChainLength, knobDefinitions.approvalChainLength);
  const canonicalInviteStrategy = mapInviteStrategyToOverrideValue(state.inviteStrategy);

  const overrides: RecipeKnobOverrides = { ...plan.personalization.overrides };

  const setOverride = (id: RecipeKnobId, value: string | number) => {
    const definition = knobDefinitions[id];
    const defaultValue = definition?.defaultValue;
    let changed = true;
    if (definition?.type === "number" && typeof defaultValue === "number") {
      changed = defaultValue !== value;
    } else if (definition?.type === "enum" && typeof defaultValue === "string") {
      changed = defaultValue !== value;
    }
    overrides[id] = {
      value,
      rationale: MANUAL_OVERRIDE_RATIONALE,
      changedFromDefault: changed,
    };
  };

  setOverride("approvalChainLength", normalizedApproval);
  setOverride("integrationMode", state.integrationMode);
  setOverride("copyTone", state.copyTone);
  setOverride("inviteStrategy", canonicalInviteStrategy);

  const updatedPersonalization: RecipePersonalizationResult = {
    ...plan.personalization,
    overrides,
  };

  const helperText = formatCustomizeHelper(state, undefined);
  const primaryCta = formatCustomizeCta(state, undefined);

  const updatedTemplateCopy: TemplateCopyPayload = {
    ...plan.templateCopy,
    helperText,
    primaryCta,
  };

  const response: CanvasPlanResponse = {
    recipeId: plan.recipeId,
    persona: plan.persona,
    intentTags: plan.intentTags,
    confidence: plan.confidence,
    reasoning: plan.reasoning,
    decisionSource: plan.decisionSource,
    promptSignals: plan.promptSignals,
    personalization: updatedPersonalization,
    templateCopy: updatedTemplateCopy,
  };

  const attributions = buildPlanAttributions({
    recipe,
    overrides,
    fallback: updatedPersonalization.fallback,
    promptSignals: plan.promptSignals,
    templateIssues: updatedTemplateCopy.issues,
  });

  const fieldsWithAttribution = recipe.fields.map(field => {
    const attribution = attributions.fields[field.id];
    return attribution ? { ...field, aiAttribution: attribution } : { ...field };
  });

  let formPlan = buildFormPlan(recipe, response, {
    fields: fieldsWithAttribution,
    titleAttribution: attributions.title,
    descriptionAttribution: attributions.description,
    primaryCtaAttribution: attributions.primaryCta,
  });

  const updatedFields = formPlan.step.fields.map(field => {
    if (field.kind === "admin_toggle" && field.id === FIELD_IDS.ADMIN_CONTROLS) {
      const value = normalizedApproval > 1 ? "required" : "disabled";
      return value === field.value ? field : { ...field, value };
    }
    if (field.kind === "integration_picker" && field.id === FIELD_IDS.PREFERRED_INTEGRATIONS) {
      const helper = deriveIntegrationHelper(state.integrationMode, field.helperText);
      return helper === field.helperText ? field : { ...field, helperText: helper };
    }
    if (field.kind === "teammate_invite" && field.id === FIELD_IDS.TEAM_INVITES) {
      const helper = formatCustomizeInviteCaption(state);
      return helper === field.helperText ? field : { ...field, helperText: helper };
    }
    return field;
  });

  formPlan = {
    ...formPlan,
    step: {
      ...formPlan.step,
      fields: updatedFields,
      primaryCta: {
        ...formPlan.step.primaryCta,
        label: primaryCta,
      },
    },
  };

  return {
    ...plan,
    personalization: updatedPersonalization,
    templateCopy: updatedTemplateCopy,
    formPlan,
    fields: updatedFields,
  };
};

const formatCurrencyRange = (min?: number, max?: number, stretch?: boolean): string => {
  if (!min && !max) {
    return 'Budget to refine';
  }

  const formatter = new Intl.NumberFormat('en-SG', {
    style: 'currency',
    currency: 'SGD',
    maximumFractionDigits: 0,
  });

  const minLabel = min ? formatter.format(min) : '';
  let maxLabel = max ? formatter.format(max) : '';
  if (max && stretch) {
    maxLabel = formatter.format(Math.round(max * 1.1));
  }

  if (minLabel && maxLabel) {
    return stretch ? `${minLabel} – ${maxLabel} (stretch +10%)` : `${minLabel} – ${maxLabel}`;
  }
  return minLabel || maxLabel;
};

const describeTonePreference = (tone: PropertyGuruSignals['tonePreference']): string => {
  switch (tone) {
    case 'data_driven':
      return 'data-driven';
    case 'concierge':
      return 'concierge';
    default:
      return 'reassuring';
  }
};

const describeUrgencyBadge = (value: number): string => {
  const clamped = Math.min(5, Math.max(0, Math.round(value)));
  switch (clamped) {
    case 5:
      return 'Immediate move';
    case 4:
      return 'Ready soon';
    case 3:
      return 'Planning next';
    case 2:
      return 'Exploring timelines';
    case 1:
      return 'Browsing ideas';
    default:
      return 'Just browsing';
  }
};

const updatePropertyGuruPlanContent = (
  planTemplate: PropertyGuruPlanTemplate,
  signals: PropertyGuruSignals,
  state: DrawerKnobState
): PropertyGuruPlanTemplate => {
  if (!isPropertyGuruKnobState(state)) {
    return planTemplate;
  }

  const locationLine = `${signals.location.radiusKm ?? 5}km around ${signals.location.primaryArea}`;
  const priceLine = formatCurrencyRange(signals.price.min, signals.price.max, signals.price.stretchOk);

  const essentials = {
    ...planTemplate.essentials,
    items: planTemplate.essentials.items.map(item => {
      if (/location/i.test(item.label)) {
        return {
          ...item,
          value: locationLine,
          helper: 'Tighten or widen the radius to reshape your shortlist.',
        };
      }
      if (/price/i.test(item.label)) {
        return {
          ...item,
          value: priceLine,
          helper: signals.price.stretchOk
            ? 'Includes a 10% buffer so turnkey listings still surface.'
            : 'Keeps suggestions firmly inside your comfort band.',
        };
      }
      return item;
    }),
  };

  const tone = describeTonePreference(state.tonePreference);
  const urgencyLabel = describeUrgencyBadge(state.moveInUrgency).toLowerCase();

  const microCopy = {
    reassurance:
      state.tonePreference === 'data_driven'
        ? 'We will surface price comps and transaction trends so you stay confident.'
        : state.tonePreference === 'concierge'
          ? 'Your concierge will ping you personally when curated matches appear.'
          : 'We keep an eye on family-friendly listings and flag fresh options quickly.',
    follow_up:
      state.moveInUrgency >= 4
        ? 'Expect rapid alerts so you can act the same day.'
        : state.moveInUrgency >= 2
          ? 'We will send twice-weekly summaries with new matches and planning tips.'
          : 'A light weekly digest keeps inspiration flowing until you are ready.',
  };

  return {
    ...planTemplate,
    essentials,
    lifestyle_filters: {
      ...planTemplate.lifestyle_filters,
      helper: `Toggle the cues that matter most; tone is ${tone}, timeline is ${urgencyLabel}.`,
    },
    micro_copy: {
      reassurance: microCopy.reassurance,
      follow_up: microCopy.follow_up,
    },
  };
};

const applyPropertyGuruKnobsToPlan = (plan: CanvasPlanState, state: DrawerKnobState): CanvasPlanState => {
  if (!isPropertyGuruKnobState(state)) {
    return plan;
  }

  const template = plan.templateCopy;
  const planTemplate = template.propertyGuruPlan;
  if (!planTemplate) {
    return plan;
  }

  const baselineSignals = template.propertyGuruSignalsBaseline ?? DEFAULT_PROPERTY_GURU_SIGNALS;
  const currentSignals = template.propertyGuruSignals ?? baselineSignals;

  const baselinePrice = baselineSignals.price;

  const updatedSignals: PropertyGuruSignals = {
    ...currentSignals,
    location: {
      ...currentSignals.location,
      radiusKm: state.locationRadiusKm,
    },
    price: {
      ...currentSignals.price,
      stretchOk: state.budgetStretch,
      max: baselinePrice.max ?? baselinePrice.min ?? currentSignals.price.max,
      min: baselinePrice.min ?? currentSignals.price.min,
    },
    moveInHorizon: urgencyToMoveInHorizon(state.moveInUrgency),
    tonePreference: state.tonePreference,
  };

  const updatedPlanTemplate = updatePropertyGuruPlanContent(planTemplate, updatedSignals, state);
  const { payload, defaultsApplied } = mapPropertyGuruPlanToSearchPayload({
    plan: updatedPlanTemplate,
    signals: updatedSignals,
  });

  const helperText = formatCustomizeHelper(state, undefined);
  const primaryCta = formatCustomizeCta(state, plan.templateCopy.primaryCta);

  const updatedTemplateCopy: TemplateCopyPayload = {
    ...template,
    helperText,
    primaryCta,
    propertyGuruPlan: updatedPlanTemplate,
    propertyGuruSignals: updatedSignals,
    propertyGuruSignalsBaseline: template.propertyGuruSignalsBaseline ?? baselineSignals,
    propertyGuruSearchPayload: payload,
    propertyGuruDefaults: defaultsApplied,
  };

  return {
    ...plan,
    templateCopy: updatedTemplateCopy,
  };
};

const applyKnobOverridesToPlan = (plan: CanvasPlanState, state: DrawerKnobState): CanvasPlanState => {
  if (isPropertyGuruKnobState(state)) {
    return applyPropertyGuruKnobsToPlan(plan, state);
  }
  return applyCanvasKnobOverridesToPlan(plan, state);
};


interface AttributionBuildContext {
  recipe: CanvasRecipe;
  overrides: RecipeKnobOverrides;
  fallback: RecipePersonalizationResult["fallback"];
  promptSignals: PromptSignals;
  templateIssues: SlotValidationIssue[];
}

interface PlanAttributionResult {
  fields: Record<string, AIAttribution>;
  title?: AIAttribution;
  description?: AIAttribution;
  primaryCta?: AIAttribution;
}

const cloneAttribution = (attribution: AIAttribution): AIAttribution => ({
  ...attribution,
  knob: attribution.knob ? { ...attribution.knob } : undefined,
  signals: attribution.signals.map(signal => ({ ...signal })),
  fallbackDetails: attribution.fallbackDetails ? [...attribution.fallbackDetails] : undefined,
});

const buildSignalEntries = (
  keys: Array<keyof PromptSignals>,
  signals: PromptSignals
): AIAttributionSignal[] => {
  const entries: AIAttributionSignal[] = [];
  keys.forEach(signalKey => {
    const signal = signals[signalKey];
    if (!signal) {
      return;
    }
    entries.push({
      label: SIGNAL_LABEL_MAP[signalKey] ?? String(signalKey),
      value: formatSignalValue(signal),
      confidence: signal.metadata.confidence ?? null,
    });
  });
  return entries;
};

const formatKnobDisplayValue = (
  definition: RecipeKnobDefinition | undefined,
  value: unknown
): string => {
  if (value === null || value === undefined) {
    return "Not set";
  }
  if (!definition) {
    return String(value);
  }
  if (definition.type === "enum") {
    const match = definition.options.find(option => option.value === value);
    return match?.label ?? String(value);
  }
  return String(value);
};

const buildKnobAttribution = (
  knobId: RecipeKnobId,
  context: AttributionBuildContext
): AIAttribution => {
  const { recipe, overrides, fallback, promptSignals } = context;
  const knobDefinition = recipe.knobs?.[knobId];
  const override = overrides[knobId];
  const changed = Boolean(override?.changedFromDefault);
  const fallbackApplied = fallback.applied;

  const defaultValue = knobDefinition?.defaultValue;
  const overrideValue = override?.value ?? defaultValue;

  const knobValueDisplay = formatKnobDisplayValue(knobDefinition, overrideValue ?? "");
  const defaultDisplay = formatKnobDisplayValue(knobDefinition, defaultValue ?? "");

  let source: AIAttribution["source"] = changed ? "ai" : "default";
  let summary = knobDefinition?.description ?? "Using standard template settings.";
  let rationale: string | undefined = override?.rationale;
  let fallbackDetails: string[] | undefined;

  if (fallbackApplied) {
    source = "fallback";
    summary = fallback.details[0] ?? "Using baseline settings after fallback.";
    fallbackDetails = fallback.details.slice(0, MAX_FALLBACK_DETAILS);
    rationale = undefined;
  }

  const signals = buildSignalEntries(KNOB_SIGNAL_KEYS[knobId] ?? [], promptSignals);

  return {
    source,
    summary,
    rationale,
    knob: {
      id: knobId,
      label: knobDefinition?.label ?? knobId,
      value: knobValueDisplay,
      changed,
      defaultValue: defaultDisplay,
    },
    signals,
    fallbackDetails,
  };
};

const humanizeIssueReason = (reason: string): string => reason.replace(/_/g, " ");

const buildTemplateCopyAttribution = (
  base: AIAttribution,
  templateIssues: SlotValidationIssue[]
): AIAttribution => {
  const attribution = cloneAttribution(base);
  const hasErrors = templateIssues.some(issue => issue.severity === "error");

  if (hasErrors) {
    attribution.source = "fallback";
    attribution.summary = "Using baseline copy after validation issues.";
    attribution.rationale = undefined;
    attribution.fallbackDetails = templateIssues
      .slice(0, MAX_FALLBACK_DETAILS)
      .map(issue => humanizeIssueReason(issue.reason));
    return attribution;
  }

  attribution.source = "ai";
  attribution.summary = attribution.knob?.changed
    ? `Personalized copy tone: ${attribution.knob.value}`
    : `Generated copy using ${attribution.knob?.value ?? 'default'} tone.`;
  return attribution;
};

const buildPlanAttributions = (context: AttributionBuildContext): PlanAttributionResult => {
  const knobAttributions: Partial<Record<RecipeKnobId, AIAttribution>> = {};
  const knobIds = Object.keys(context.recipe.knobs ?? {}) as RecipeKnobId[];
  knobIds.forEach(knobId => {
    knobAttributions[knobId] = buildKnobAttribution(knobId, context);
  });

  const copyToneBase = knobAttributions.copyTone ?? buildKnobAttribution("copyTone", context);
  const copyToneAttribution = buildTemplateCopyAttribution(copyToneBase, context.templateIssues);

  const fields: Record<string, AIAttribution> = {};

  COPY_TONE_FIELD_IDS.forEach(fieldId => {
    if (context.recipe.fields.some(field => field.id === fieldId)) {
      fields[fieldId] = cloneAttribution(copyToneAttribution);
    }
  });

  Object.entries(KNOB_TO_FIELD_IDS).forEach(([key, fieldIds]) => {
    const knobId = key as RecipeKnobId;
    const attribution = knobAttributions[knobId];
    if (!attribution || !fieldIds) {
      return;
    }
    fieldIds.forEach(fieldId => {
      if (context.recipe.fields.some(field => field.id === fieldId)) {
        fields[fieldId] = cloneAttribution(attribution);
      }
    });
  });

  return {
    fields,
    title: cloneAttribution(copyToneAttribution),
    description: cloneAttribution(copyToneAttribution),
    primaryCta: knobAttributions.inviteStrategy
      ? cloneAttribution(knobAttributions.inviteStrategy)
      : undefined,
  };
};

const buildFormPlan = (
  recipe: CanvasRecipe,
  response: CanvasPlanResponse,
  options: {
    fields: Field[];
    titleAttribution?: AIAttribution;
    descriptionAttribution?: AIAttribution;
    primaryCtaAttribution?: AIAttribution;
  }
): Extract<FormPlan, { kind: "render_step" }> => {
  const personaMeta = personaCopy[response.persona] ?? personaCopy.explorer;
  const stepId = `canvas-${response.recipeId.toLowerCase()}`;
  const stepper: StepperItem[] = [
    {
      id: stepId,
      label: personaMeta.stepLabel,
      active: true,
      completed: false,
    },
  ];

  const fields = options.fields.map(field => {
    if (field.kind === "callout") {
      return {
        ...field,
        label: response.templateCopy.callout.heading ?? field.label,
        body: response.templateCopy.callout.body ?? field.body,
      };
    }

    if (field.kind === "info_badge") {
      return {
        ...field,
        label: response.templateCopy.badgeCaption || field.label,
      };
    }

    if (field.kind === "select" && field.id === FIELD_IDS.TEAM_SIZE) {
      const recommended = mapTeamSizeToOption(response.promptSignals.teamSizeBracket.value);
      return {
        ...field,
        value: recommended ?? field.value,
      };
    }

    if (field.kind === "integration_picker") {
      const recommendedTools = response.promptSignals.tools.value.filter(tool => tool !== "Other");
      if (recommendedTools.length) {
        const { options: mergedOptions, values } = mergeIntegrationOptions(field, recommendedTools);
        return {
          ...field,
          options: mergedOptions,
          values: values.length ? values : field.values,
        };
      }
    }

    if (field.kind === "admin_toggle" && field.id === FIELD_IDS.ADMIN_CONTROLS) {
      const recommended = mapApprovalDepthToToggleValue(response.promptSignals.approvalChainDepth.value);
      return {
        ...field,
        value: recommended ?? field.value,
      };
    }

    return { ...field };
  });

  return {
    kind: "render_step",
    step: {
      stepId,
      title: response.templateCopy.stepTitle || personaMeta.title,
       titleAttribution: options.titleAttribution,
      description: response.templateCopy.helperText || personaMeta.description,
       descriptionAttribution: options.descriptionAttribution,
      fields,
      primaryCta: {
        label: response.templateCopy.primaryCta || "Continue",
        action: "submit_step",
        aiAttribution: options.primaryCtaAttribution,
      },
      secondaryCta: response.persona === "explorer" ? { label: "Skip for now", action: "skip" } : undefined,
    },
    stepper,
  };
};

interface CanvasChatProps {
  personalizationEnabled?: boolean;
}

export function CanvasChat({ personalizationEnabled = true }: CanvasChatProps): React.ReactElement {
  const [prompt, setPrompt] = React.useState("");
  const [submittedPrompt, setSubmittedPrompt] = React.useState<string | null>(null);
  const [plan, setPlan] = React.useState<CanvasPlanState | null>(null);
  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [animationKey, setAnimationKey] = React.useState(0);
  const [isCustomizeOpen, setCustomizeOpen] = React.useState(false);
  const telemetryQueueRef = React.useRef<TelemetryQueue | null>(null);
  const inputRef = React.useRef<HTMLInputElement>(null);

  const [telemetrySessionId, setTelemetrySessionId] = React.useState<string | null>(() => {
    if (typeof window === "undefined") {
      return null;
    }
    const storageKey = "canvasTelemetrySessionId";
    return window.sessionStorage.getItem(storageKey);
  });

  React.useEffect(() => {
    if (!ENV.enableCanvasTelemetry || typeof window === "undefined" || !telemetrySessionId) {
      telemetryQueueRef.current = null;
      return;
    }

    const queue = createTelemetryQueue(telemetrySessionId);
    telemetryQueueRef.current = queue;

    return () => {
      telemetryQueueRef.current = null;
      void queue.dispose();
    };
  }, [telemetrySessionId]);

  React.useEffect(() => {
    if (!ENV.enableCanvasTelemetry || typeof window === "undefined") {
      return;
    }

    const storageKey = "canvasTelemetrySessionId";
    if (telemetrySessionId) {
      window.sessionStorage.setItem(storageKey, telemetrySessionId);
      return;
    }

    let isMounted = true;
    const controller = new AbortController();

    const bootstrapSession = async () => {
      try {
        const response = await fetch("/api/sessions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ metadata: { source: "canvas-chat" } }),
          signal: controller.signal,
        });

        if (!response.ok) {
          throw new Error("Failed to create telemetry session");
        }

        const data = (await response.json()) as { sessionId?: string };
        if (data.sessionId && isMounted) {
          window.sessionStorage.setItem(storageKey, data.sessionId);
          setTelemetrySessionId(data.sessionId);
        }
      } catch (sessionError) {
        console.error("Canvas telemetry session bootstrap failed", sessionError);
      }
    };

    void bootstrapSession();

    return () => {
      isMounted = false;
      controller.abort();
    };
  }, [telemetrySessionId]);

  const submitMessage = React.useCallback(
    async (value: string) => {
      const trimmed = value.trim();
      if (!trimmed) {
        return;
      }

      setIsLoading(true);
      setError(null);
      setSubmittedPrompt(trimmed);

      try {
        const response = await fetch("/api/canvas/plan", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            message: trimmed,
            sessionId:
              ENV.enableCanvasTelemetry && telemetrySessionId ? telemetrySessionId : undefined,
          }),
        });

        if (!response.ok) {
          const errorBody = (await response.json().catch(() => null)) as { error?: string } | null;
          throw new Error(errorBody?.error ?? "Failed to generate plan. Try again.");
        }

        const data = (await response.json()) as CanvasPlanResponse;
        const recipe = getRecipe(data.recipeId);

        const attributions = buildPlanAttributions({
          recipe,
          overrides: data.personalization.overrides,
          fallback: data.personalization.fallback,
          promptSignals: data.promptSignals,
          templateIssues: data.templateCopy.issues,
        });

        const fieldsWithAttribution = recipe.fields.map(field => {
          const attribution = attributions.fields[field.id];
          return attribution ? { ...field, aiAttribution: attribution } : { ...field };
        });

        const formPlan = buildFormPlan(recipe, data, {
          fields: fieldsWithAttribution,
          titleAttribution: attributions.title,
          descriptionAttribution: attributions.description,
          primaryCtaAttribution: attributions.primaryCta,
        });

        const nextPlan: CanvasPlanState = {
          ...data,
          fields: formPlan.step.fields,
          formPlan,
        };
        setPlan(nextPlan);
        setAnimationKey(value => value + 1);
      } catch (planError) {
        console.error("Canvas plan fetch failed", planError);
        setPlan(null);
        const message = planError instanceof Error ? planError.message : "Unexpected error. Try again.";
        setError(message);
        requestAnimationFrame(() => {
          inputRef.current?.focus();
        });
      } finally {
        setIsLoading(false);
      }
    },
    [telemetrySessionId]
  );

  const handleSubmit = React.useCallback(
    (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      submitMessage(prompt);
    },
    [prompt, submitMessage]
  );

  const handleExampleClick = React.useCallback(
    (value: string) => {
      setPrompt(value);
      submitMessage(value);
      requestAnimationFrame(() => {
        inputRef.current?.focus();
      });
    },
    [submitMessage]
  );

  const handleKnobStateChange = React.useCallback((state: DrawerKnobState) => {
    setPlan(current => {
      if (!current) {
        return current;
      }
      return applyKnobOverridesToPlan(current, state);
    });
  }, []);

  const handleFormAction = React.useCallback(
    (action: ButtonAction['action']) => {
      if (!PROPERTY_GURU_PRESET_ENABLED) {
        return;
      }
      if (!ENV.enableCanvasTelemetry) {
        return;
      }
      const queue = telemetryQueueRef.current;
      if (!queue) {
        return;
      }
      if (!plan) {
        return;
      }

      const template = plan.templateCopy;
      const planTemplate = template.propertyGuruPlan;
      const signals = template.propertyGuruSignals;
      const payload = template.propertyGuruSearchPayload;

      if (!planTemplate || !signals || !payload) {
        return;
      }

      const defaultsApplied = template.propertyGuruDefaults ?? [];
      if (plan.formPlan.kind !== 'render_step') {
        return;
      }

      const baseEvent = {
        payload,
        signals,
        defaultsApplied,
        persona: plan.persona,
      };

      if (action === 'submit_step') {
        const ctaLabel = plan.formPlan.step.primaryCta.label;
        queue.enqueue({
          type: 'property_guru_flow_event',
          stage: 'cta_clicked',
          ctaLabel,
          ...baseEvent,
        });

        if (ctaLabel.toLowerCase().includes('save')) {
          queue.enqueue({
            type: 'property_guru_flow_event',
            stage: 'saved_search_created',
            ctaLabel,
            ...baseEvent,
          });
        }
      }

      if (action === 'complete') {
        queue.enqueue({
          type: 'property_guru_flow_event',
          stage: 'flow_complete',
          ...baseEvent,
        });
      }
    },
    [plan]
  );

  const previewItems = React.useMemo(() => {
    if (!plan) {
      return [] as Array<{ id: string; label: string; description: string }>;
    }

    return plan.fields.map(field => ({
      id: field.id,
      label: field.label,
      description: describeField(field),
    }));
  }, [plan]);

  React.useEffect(() => {
    setCustomizeOpen(false);
  }, [plan?.recipeId]);

  const { getAnimationStyle, motionEnabled } = useStaggeredMount(previewItems.length, {
    intervalMs: 65,
    key: [plan?.recipeId ?? "", animationKey],
    disabled: previewItems.length === 0,
  });

  const enableExperimentalComponents = ENV.enableExperimentalComponents;

  React.useEffect(() => {
    if (!plan || !ENV.enableCanvasTelemetry) {
      return;
    }

    telemetryQueueRef.current?.enqueue({
      type: "canvas_plan_rendered",
      recipeId: plan.recipeId,
      persona: plan.persona,
      componentCount: plan.fields.length,
      decisionSource: plan.decisionSource,
      intentTags: plan.intentTags,
      confidence: plan.confidence,
    });
  }, [plan]);

  return (
    <main className="flex min-h-screen flex-col bg-background">
      <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-8 px-4 py-16 md:px-8">
        <header className="flex flex-col gap-3 text-center md:text-left">
          <p className="text-sm font-medium uppercase tracking-wide text-primary">Canvas Chat</p>
          <h1 className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
            What do you want to get done today?
          </h1>
          <p className="text-muted-foreground">
            Describe the onboarding or workspace experience you need and we&apos;ll turn it into a tailored flow.
          </p>
        </header>

        <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Input
              ref={inputRef}
              aria-label="Describe what you want to build"
              placeholder={canvasCopy.placeholder}
              value={prompt}
              onChange={event => setPrompt(event.target.value)}
              className="flex-1"
            />
            <Button type="submit" className="w-full sm:w-auto" disabled={isLoading}>
              {isLoading ? (
                <span className="inline-flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                  Generating…
                </span>
              ) : (
                "Generate"
              )}
            </Button>
          </div>

          <p className="text-xs text-muted-foreground">
            {canvasCopy.helperText}
          </p>

          <div className="flex flex-wrap items-center gap-2">
            {canvasCopy.chips.map(chip => (
              <Button
                key={chip.prompt}
                type="button"
                variant="ghost"
                size="sm"
                className="border border-dashed border-input"
                onClick={() => handleExampleClick(chip.prompt)}
                disabled={isLoading}
              >
                {chip.label}
              </Button>
            ))}
          </div>
        </form>

        <section className="flex flex-1 flex-col gap-4">
          {error ? (
            <div className="rounded-md border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">
              <div className="flex items-start justify-between gap-3">
                <p>{error}</p>
                <Button variant="ghost" size="sm" onClick={() => submitMessage(prompt)} disabled={isLoading}>
                  Retry
                </Button>
              </div>
            </div>
          ) : null}

          {isLoading && !plan ? (
            <Card className="border border-dashed border-muted-foreground/40 bg-muted/20 p-6">
              <div className="flex animate-pulse flex-col gap-4">
                <div className="h-4 w-1/3 rounded bg-muted" />
                <div className="grid gap-3 md:grid-cols-2">
                  <div className="h-20 rounded bg-muted" />
                  <div className="h-20 rounded bg-muted" />
                  <div className="h-20 rounded bg-muted" />
                  <div className="h-20 rounded bg-muted" />
                </div>
              </div>
            </Card>
          ) : null}

          {!plan && !isLoading ? (
            <Card className="flex flex-1 flex-col justify-center gap-3 border border-dashed border-muted-foreground/40 bg-muted/20 p-8 text-center">
              <h2 className="text-xl font-semibold text-foreground">Your tailored workspace will appear here</h2>
              <p className="text-sm text-muted-foreground">
                Start by sharing what you are working on. Canvas Chat will assemble the screens and steps for you.
              </p>
            </Card>
          ) : null}

          {plan ? (
            <div className="flex flex-col gap-6">
              <div className="flex flex-col gap-3 text-left">
                <div className="flex flex-wrap items-center gap-3">
                  <PersonaBadge persona={plan.persona} confidence={plan.confidence} />
                  <ReasoningChip reasoning={plan.reasoning} tags={plan.intentTags} />
                </div>
                <div className="flex flex-col gap-1 text-sm text-muted-foreground">
                  {submittedPrompt ? (
                    <span>
                      Plan generated for <span className="font-medium text-foreground">“{submittedPrompt}”</span>
                    </span>
                  ) : null}
                  <span className="text-xs uppercase tracking-wide text-muted-foreground/80">
                    Decision source: {plan.decisionSource === "llm" ? "LLM recommendation" : "Heuristics fallback"}
                  </span>
                  {plan.personalization.fallback.applied && personalizationEnabled ? (
                    <span className="text-xs text-amber-600 dark:text-amber-400">
                      Personalization fallback triggered ({plan.personalization.fallback.reasons.join(", ")}). You can tweak the fields below manually.
                    </span>
                  ) : null}
                  {plan.templateCopy.issues.length ? (
                    <span className="text-xs text-amber-600 dark:text-amber-400">
                      Some copy reverted to defaults due to validation: {plan.templateCopy.issues.length} issue
                      {plan.templateCopy.issues.length === 1 ? "" : "s"} detected.
                    </span>
                  ) : null}
                  {!enableExperimentalComponents ? (
                    <span className="text-xs text-muted-foreground">
                      Experimental components are disabled, so some rich fields may not render.
                    </span>
                  ) : null}
                </div>
              </div>

              {personalizationEnabled ? (
                <div className="hidden items-center justify-end gap-3 lg:flex">
                  <span className="text-xs text-muted-foreground">
                    Fine-tune copy, approvals, and invites for this plan.
                  </span>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setCustomizeOpen(true)}
                    aria-haspopup="dialog"
                    aria-expanded={isCustomizeOpen}
                    disabled={!plan}
                    className="inline-flex items-center gap-2"
                  >
                    <Settings2 className="h-3.5 w-3.5" aria-hidden="true" />
                    Customize
                  </Button>
                </div>
              ) : null}

              {previewItems.length > 0 ? (
                <div className="grid gap-4 md:grid-cols-2">
                  {previewItems.map((item, index) => (
                    <div
                      key={item.id}
                      className={cn(
                        "rounded-lg border border-border/60 bg-card p-4 shadow-sm",
                        motionEnabled && "stagger-fade-in"
                      )}
                      style={motionEnabled ? getAnimationStyle(index) : undefined}
                    >
                      <p className="text-sm font-semibold text-foreground">{item.label}</p>
                      <p className="text-xs text-muted-foreground">{item.description}</p>
                    </div>
                  ))}
                </div>
              ) : null}

              <Card className="border border-border/60 p-4">
                <FormRenderer
                  key={`${plan.recipeId}-${animationKey}`}
                  plan={plan.formPlan}
                  onAction={action => {
                    handleFormAction(action);
                  }}
                />
              </Card>

              {ENV.isDebug ? (
                <PromptSignalsDebugPanel
                  signals={plan.promptSignals}
                  fallback={plan.personalization.fallback}
                />
              ) : null}
            </div>
          ) : null}
        </section>
      </div>
      {personalizationEnabled ? (
        <CustomizeDrawer
          open={isCustomizeOpen}
          onOpenChange={setCustomizeOpen}
          recipeId={plan?.recipeId}
          promptSignals={plan?.promptSignals}
          knobOverrides={plan?.personalization.overrides}
          previewCopy={plan?.templateCopy}
          onKnobChange={handleKnobStateChange}
        />
      ) : null}
    </main>
  );
}
