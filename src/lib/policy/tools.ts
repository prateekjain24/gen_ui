import { STEP_IDS } from '@/lib/constants';
import { FIELD_ID_LIST } from '@/lib/constants/fields';

const FIELD_KIND_ENUM = ['text', 'select', 'radio', 'checkbox'] as const;
const CTA_ACTION_ENUM = ['submit_step', 'back', 'skip', 'complete'] as const;

const STEP_ID_ENUM = Object.values(STEP_IDS);

const fieldOptionSchema = {
  type: 'object',
  additionalProperties: false,
  properties: {
    value: { type: 'string', minLength: 1, maxLength: 100 },
    label: { type: 'string', minLength: 1, maxLength: 100 },
    helperText: { type: 'string', minLength: 1, maxLength: 160 },
    disabled: { type: 'boolean' },
  },
  required: ['value', 'label'] as const,
};

const ctaSchema = {
  type: 'object',
  additionalProperties: false,
  properties: {
    label: { type: 'string', minLength: 1, maxLength: 40 },
    action: { type: 'string', enum: CTA_ACTION_ENUM },
  },
  required: ['label', 'action'] as const,
};

const fieldSchema = {
  type: 'object',
  additionalProperties: false,
  properties: {
    kind: { type: 'string', enum: FIELD_KIND_ENUM },
    id: { type: 'string', enum: FIELD_ID_LIST },
    label: { type: 'string', minLength: 1, maxLength: 60 },
    helperText: { type: 'string', minLength: 1, maxLength: 160 },
    required: { type: 'boolean' },
    placeholder: { type: 'string', minLength: 1, maxLength: 80 },
    defaultValue: { type: 'string', maxLength: 200 },
    defaultValues: {
      type: 'array',
      items: { type: 'string', maxLength: 200 },
      minItems: 1,
      maxItems: 6,
      uniqueItems: true,
    },
    options: {
      type: 'array',
      items: fieldOptionSchema,
      minItems: 1,
      maxItems: 12,
    },
    orientation: { type: 'string', enum: ['horizontal', 'vertical'] },
  },
  required: ['kind', 'id', 'label'] as const,
};

const stepConfigSchema = {
  type: 'object',
  additionalProperties: false,
  properties: {
    stepId: { type: 'string', enum: STEP_ID_ENUM },
    title: { type: 'string', minLength: 1, maxLength: 60 },
    description: { type: 'string', minLength: 1, maxLength: 160 },
    fields: {
      type: 'array',
      items: fieldSchema,
      minItems: 1,
      maxItems: 6,
    },
    primaryCta: ctaSchema,
    secondaryCta: ctaSchema,
    skipToReview: { type: 'boolean' },
  },
  required: ['stepId', 'title', 'fields', 'primaryCta'] as const,
};

const decisionMetadataSchema = {
  type: 'object',
  additionalProperties: false,
  properties: {
    reasoning: {
      type: 'string',
      minLength: 1,
      maxLength: 280,
      description: 'Brief explanation of why this configuration was chosen',
    },
    confidence: {
      type: 'number',
      minimum: 0,
      maximum: 1,
      description: 'Confidence score between 0 and 1',
    },
    persona: {
      type: 'string',
      enum: ['explorer', 'team'],
      description: 'Persona classification that influenced the decision',
    },
    decision: {
      type: 'string',
      enum: ['progress', 'review', 'fallback'],
      description: 'High level decision outcome for telemetry',
    },
  },
  required: ['reasoning', 'confidence'] as const,
};

const proposeNextStepParameters = {
  type: 'object',
  additionalProperties: false,
  properties: {
    metadata: decisionMetadataSchema,
    stepConfig: stepConfigSchema,
  },
  required: ['metadata', 'stepConfig'] as const,
};

export const ONBOARDING_TOOLS = {
  propose_next_step: {
    name: 'propose_next_step',
    description: 'Determine the next onboarding step configuration to present to the user',
    parameters: proposeNextStepParameters,
  },
} as const;

export const proposeNextStepTool = ONBOARDING_TOOLS.propose_next_step;

export type ProposeNextStepParameters = typeof proposeNextStepParameters;
