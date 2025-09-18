import { z } from 'zod';

import { DEFAULT_STEP_ORDER, STEP_IDS } from '@/lib/constants';
import { FIELD_ID_SET } from '@/lib/constants/fields';
import type {
  ButtonAction,
  CheckboxField,
  Field,
  FormPlan,
  RadioField,
  SelectField,
  TextField,
} from '@/lib/types/form';
import type { SessionState } from '@/lib/types/session';

const CTA_ACTIONS = ['submit_step', 'back', 'skip', 'complete'] as const;
const FIELD_KINDS = ['text', 'select', 'radio', 'checkbox'] as const;
const ORIENTATIONS = ['horizontal', 'vertical'] as const;
const STEP_LABELS: Record<string, string> = {
  [STEP_IDS.BASICS]: 'Basics',
  [STEP_IDS.WORKSPACE]: 'Workspace',
  [STEP_IDS.PREFERENCES]: 'Preferences',
  [STEP_IDS.REVIEW]: 'Review',
};

const fieldIdSchema = z
  .string()
  .refine((value) => FIELD_ID_SET.has(value as never), { message: 'Invalid field ID' });

const stepIdSchema = z
  .string()
  .refine((value) => Object.values(STEP_IDS).includes(value as never), { message: 'Invalid step ID' });

const optionSchema = z.object({
  value: z.string().min(1).max(100),
  label: z.string().min(1).max(100),
  helperText: z.string().min(1).max(160).optional(),
  disabled: z.boolean().optional(),
});

const fieldSchema = z.object({
  kind: z.enum(FIELD_KINDS),
  id: fieldIdSchema,
  label: z.string().min(1).max(60),
  helperText: z.string().min(1).max(160).optional(),
  required: z.boolean().optional(),
  placeholder: z.string().min(1).max(80).optional(),
  defaultValue: z.string().max(200).optional(),
  defaultValues: z.array(z.string().max(200)).min(1).max(6).optional(),
  options: z.array(optionSchema).min(1).max(12).optional(),
  orientation: z.enum(ORIENTATIONS).optional(),
});

const ctaSchema = z.object({
  label: z.string().min(1).max(40),
  action: z.enum(CTA_ACTIONS),
});

const metadataSchema = z.object({
  reasoning: z.string().min(1).max(280),
  confidence: z
    .number()
    .min(0, { message: 'Confidence must be >= 0' })
    .max(1, { message: 'Confidence must be <= 1' }),
  persona: z.enum(['explorer', 'team']).optional(),
  decision: z.enum(['progress', 'review', 'fallback']).optional(),
});

const stepConfigSchema = z.object({
  stepId: stepIdSchema,
  title: z.string().min(1).max(60),
  description: z.string().min(1).max(160).optional(),
  fields: z.array(fieldSchema).min(1).max(6),
  primaryCta: ctaSchema,
  secondaryCta: ctaSchema.optional(),
  skipToReview: z.boolean().optional(),
});

const decisionSchema = z.object({
  metadata: metadataSchema,
  stepConfig: stepConfigSchema,
}).strict();

export type LLMDecisionMetadata = z.infer<typeof metadataSchema>;

export interface ParsedLLMDecision {
  metadata: LLMDecisionMetadata;
  raw: z.infer<typeof stepConfigSchema>;
  plan: FormPlan;
}

export class LLMResponseValidationError extends Error {
  public readonly details?: unknown;

  constructor(message: string, details?: unknown) {
    super(message);
    this.name = 'LLMResponseValidationError';
    this.details = details;
  }
}

function convertCta(cta: z.infer<typeof ctaSchema>): ButtonAction {
  return {
    label: cta.label,
    action: cta.action,
  };
}

function convertField(field: z.infer<typeof fieldSchema>): Field {
  if (field.kind === 'text') {
    const textField: TextField = {
      kind: 'text',
      id: field.id,
      label: field.label,
      required: field.required ?? false,
      helperText: field.helperText,
      placeholder: field.placeholder,
      value: field.defaultValue,
    };
    return textField;
  }

  if (field.kind === 'select') {
    const selectField: SelectField = {
      kind: 'select',
      id: field.id,
      label: field.label,
      required: field.required ?? false,
      helperText: field.helperText,
      options: field.options ?? [],
      value: field.defaultValue,
      placeholder: field.placeholder,
    };
    return selectField;
  }

  if (field.kind === 'radio') {
    const radioField: RadioField = {
      kind: 'radio',
      id: field.id,
      label: field.label,
      required: field.required ?? false,
      helperText: field.helperText,
      options: field.options ?? [],
      value: field.defaultValue,
      orientation: field.orientation ?? 'vertical',
    };
    return radioField;
  }

  const checkboxField: CheckboxField = {
    kind: 'checkbox',
    id: field.id,
    label: field.label,
    required: field.required ?? false,
    helperText: field.helperText,
    options: field.options ?? [],
    values: field.defaultValues ?? [],
    orientation: field.orientation ?? 'vertical',
  };

  return checkboxField;
}

function buildStepper(session: SessionState, activeStepId: string, personaHint?: string) {
  const persona = (personaHint as SessionState['persona']) ?? session.persona ?? 'explorer';

  return DEFAULT_STEP_ORDER.filter((stepId) => {
    if (stepId === STEP_IDS.SUCCESS) return false;
    if (persona === 'explorer' && stepId === STEP_IDS.PREFERENCES && stepId !== activeStepId) {
      return session.completedSteps.includes(stepId);
    }
    return true;
  }).map((stepId) => ({
    id: stepId,
    label: STEP_LABELS[stepId] ?? stepId,
    active: stepId === activeStepId,
    completed: session.completedSteps.includes(stepId),
  }));
}

function buildReviewSummary(fields: Field[]): Array<{ label: string; value: string }> {
  return fields
    .map((field) => {
      let value: string | undefined;
      if (field.kind === 'checkbox') {
        value = (field.values ?? []).join(', ');
      } else if ('value' in field && field.value) {
        value = field.value as string;
      }
      return value ? { label: field.label, value } : undefined;
    })
    .filter((item): item is { label: string; value: string } => Boolean(item));
}

function convertToPlan(
  stepConfig: z.infer<typeof stepConfigSchema>,
  session: SessionState,
  metadata: LLMDecisionMetadata
): FormPlan {
  const fields = stepConfig.fields.map(convertField);

  if (stepConfig.skipToReview || stepConfig.stepId === STEP_IDS.REVIEW) {
    return {
      kind: 'review',
      summary: buildReviewSummary(fields),
      stepper: buildStepper(session, STEP_IDS.REVIEW, metadata.persona),
    };
  }

  return {
    kind: 'render_step',
    step: {
      stepId: stepConfig.stepId,
      title: stepConfig.title,
      description: stepConfig.description,
      fields,
      primaryCta: convertCta(stepConfig.primaryCta),
      secondaryCta: stepConfig.secondaryCta ? convertCta(stepConfig.secondaryCta) : undefined,
    },
    stepper: buildStepper(session, stepConfig.stepId, metadata.persona),
  };
}

export function parseLLMDecision(raw: unknown, session: SessionState): ParsedLLMDecision {
  const result = decisionSchema.safeParse(raw);

  if (!result.success) {
    throw new LLMResponseValidationError('LLM response failed validation', result.error.flatten());
  }

  const { metadata, stepConfig } = result.data;
  const plan = convertToPlan(stepConfig, session, metadata);

  return {
    metadata,
    raw: stepConfig,
    plan,
  };
}

export function parseLLMDecisionFromText(text: string, session: SessionState): ParsedLLMDecision {
  let parsed: unknown;

  try {
    parsed = JSON.parse(text);
  } catch (error) {
    throw new LLMResponseValidationError('LLM response was not valid JSON', error);
  }

  return parseLLMDecision(parsed, session);
}
