import type { CanvasPersona } from "@/lib/canvas/recipes";

/**
 * Template identifiers cover the copy surfaces we allow the LLM to influence.
 * Each template is made up of one or more slots with guardrails for tone and length.
 */
export type TemplateId =
  | "step_title"
  | "cta_primary"
  | "helper_text"
  | "callout_info"
  | "badge_caption";

export type TemplateTone =
  | "friendly"
  | "collaborative"
  | "formal"
  | "compliance"
  | "confident";

export interface TemplateSlot {
  /** Stable identifier used for slot lookup when filling templates. */
  id: string;
  /** Human readable label explaining the purpose of the slot. */
  label: string;
  /** Additional guidance for prompt engineers and copy reviewers. */
  description: string;
  /** Whether callers must provide text for this slot. */
  required: boolean;
  /** Maximum number of characters permitted in the final rendered slot. */
  maxLength: number;
  /** Expected tone so the LLM can stay within brand voice guidelines. */
  tone: TemplateTone;
  /** Baseline copy used when personalization is disabled or guardrails trigger. */
  fallback: string;
}

export interface Template {
  /** Unique identifier for the template. */
  id: TemplateId;
  /** Short label describing how the UI consumes the template. */
  label: string;
  /** Longer explanation of where the template appears in the canvas experience. */
  description: string;
  /** Slots that compose the template. */
  slots: TemplateSlot[];
  /** Example baseline output demonstrating the expected voice. */
  example: string;
  /** Optional persona hint to steer tone adjustments when filling slots. */
  personaHint?: CanvasPersona;
}

export type TemplateCatalog = Record<TemplateId, Template>;

/**
 * Baseline template catalog aligned with Phase 3 copy.
 * Each slot includes fallbacks that mirror our existing static content.
 */
export const TEMPLATE_CATALOG: TemplateCatalog = {
  step_title: {
    id: "step_title",
    label: "Step title",
    description: "Headline that anchors the current canvas step or task.",
    personaHint: "explorer",
    example: "Explorer quick start",
    slots: [
      {
        id: "title",
        label: "Step Title",
        description: "Concise title displayed at the top of the step panel.",
        required: true,
        maxLength: 60,
        tone: "friendly",
        fallback: "Workspace setup",
      },
    ],
  },
  cta_primary: {
    id: "cta_primary",
    label: "Primary CTA label",
    description: "Primary action button copy for the current step.",
    example: "Continue",
    personaHint: "team",
    slots: [
      {
        id: "label",
        label: "Button label",
        description: "Short verb phrase describing the immediate next action.",
        required: true,
        maxLength: 24,
        tone: "confident",
        fallback: "Continue",
      },
    ],
  },
  helper_text: {
    id: "helper_text",
    label: "Helper text",
    description: "Supporting copy under the step title guiding the user forward.",
    example: "Keep it lightweight so you can dive in immediately.",
    personaHint: "explorer",
    slots: [
      {
        id: "body",
        label: "Helper text body",
        description: "One sentence that sets expectations for the step and tone.",
        required: true,
        maxLength: 160,
        tone: "friendly",
        fallback: "Keep it lightweight so you can dive in immediately.",
      },
    ],
  },
  callout_info: {
    id: "callout_info",
    label: "Informational callout",
    description: "Info or success callouts rendered above form controls.",
    example: "We'll start simple. You can add more later.",
    personaHint: "explorer",
    slots: [
      {
        id: "heading",
        label: "Callout heading",
        description: "Optional heading text that introduces the callout body.",
        required: false,
        maxLength: 70,
        tone: "friendly",
        fallback: "A quick heads-up",
      },
      {
        id: "body",
        label: "Callout body",
        description: "Primary message surfaced in the callout card.",
        required: true,
        maxLength: 180,
        tone: "friendly",
        fallback: "We'll start simple. You can add more later.",
      },
    ],
  },
  badge_caption: {
    id: "badge_caption",
    label: "Badge caption",
    description: "Compact caption shown in badges or chips highlighting AI context.",
    example: "AI recommended",
    personaHint: "power",
    slots: [
      {
        id: "caption",
        label: "Badge caption",
        description: "Short descriptor explaining why the badge appears.",
        required: true,
        maxLength: 32,
        tone: "formal",
        fallback: "AI recommended",
      },
    ],
  },
};

export const TEMPLATE_IDS = Object.keys(TEMPLATE_CATALOG) as TemplateId[];

/**
 * Look up a template definition by its identifier.
 */
export const getTemplate = (id: TemplateId): Template => TEMPLATE_CATALOG[id];

/**
 * Returns all templates for validation or authoring tools.
 */
export const listTemplates = (): Template[] => TEMPLATE_IDS.map(id => TEMPLATE_CATALOG[id]);
