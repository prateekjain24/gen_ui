import { z } from 'zod';

import { DEFAULT_STEP_ORDER, STEP_IDS } from '@/lib/constants';
import { FIELD_ID_SET } from '@/lib/constants/fields';
import type {
  AdminToggleField,
  AIHintField,
  ButtonAction,
  CalloutField,
  CheckboxField,
  ChecklistField,
  Field,
  FormPlan,
  InfoBadgeField,
  IntegrationPickerField,
  RadioField,
  SelectField,
  TeammateInviteField,
  TextField,
} from '@/lib/types/form';
import type { SessionState } from '@/lib/types/session';

const CTA_ACTIONS = ['submit_step', 'back', 'skip', 'complete'] as const;
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
  icon: z.string().min(1).max(40).optional(),
});

const baseFieldSchema = z.object({
  id: fieldIdSchema,
  label: z.string().min(1).max(60),
  helperText: z.string().min(1).max(160).optional(),
  required: z.boolean().optional(),
  disabled: z.boolean().optional(),
  placeholder: z.string().min(1).max(80).optional(),
});

const textFieldSchema = baseFieldSchema.extend({
  kind: z.literal('text'),
  defaultValue: z.string().max(200).optional(),
  pattern: z.string().max(200).optional(),
  minLength: z.number().int().min(0).max(500).optional(),
  maxLength: z.number().int().min(1).max(500).optional(),
  autocomplete: z.string().max(80).optional(),
  type: z.enum(['text', 'email', 'password', 'tel', 'url']).optional(),
});

const selectFieldSchema = baseFieldSchema.extend({
  kind: z.literal('select'),
  options: z.array(optionSchema).min(1).max(20),
  defaultValue: z.string().max(200).optional(),
  multiple: z.boolean().optional(),
});

const radioFieldSchema = baseFieldSchema.extend({
  kind: z.literal('radio'),
  options: z.array(optionSchema).min(1).max(12),
  defaultValue: z.string().max(200).optional(),
  orientation: z.enum(ORIENTATIONS).optional(),
});

const checkboxFieldSchema = baseFieldSchema.extend({
  kind: z.literal('checkbox'),
  options: z.array(optionSchema).min(1).max(12),
  defaultValues: z.array(z.string().max(200)).min(1).max(12).optional(),
  orientation: z.enum(ORIENTATIONS).optional(),
});

const integrationPickerFieldSchema = baseFieldSchema.extend({
  kind: z.literal('integration_picker'),
  options: z.array(optionSchema).min(1).max(12),
  values: z.array(z.string().max(200)).min(1).max(12).optional(),
  maxSelections: z.number().int().min(1).max(12).optional(),
  categoryLabel: z.string().min(1).max(60).optional(),
});

const adminToggleFieldSchema = baseFieldSchema.extend({
  kind: z.literal('admin_toggle'),
  options: z.array(optionSchema).min(2).max(5),
  defaultValue: z.string().max(200).optional(),
});

const teammateInviteFieldSchema = baseFieldSchema.extend({
  kind: z.literal('teammate_invite'),
  values: z.array(z.string().email()).min(1).max(20).optional(),
  roleOptions: z.array(optionSchema).min(1).max(10).optional(),
  maxInvites: z.number().int().min(1).max(20).optional(),
  placeholder: z.string().min(1).max(120).optional(),
});

const calloutFieldSchema = baseFieldSchema.extend({
  kind: z.literal('callout'),
  body: z.string().min(1).max(280),
  variant: z.enum(['info', 'success', 'warning']).optional(),
  icon: z.string().min(1).max(40).optional(),
  cta: z
    .object({
      label: z.string().min(1).max(40),
      href: z.string().url().optional(),
    })
    .optional(),
});

const checklistFieldSchema = baseFieldSchema.extend({
  kind: z.literal('checklist'),
  items: z
    .array(
      z.object({
        id: z.string().min(1).max(60),
        label: z.string().min(1).max(160),
        helperText: z.string().min(1).max(160).optional(),
      })
    )
    .min(1)
    .max(6),
});

const infoBadgeFieldSchema = baseFieldSchema.extend({
  kind: z.literal('info_badge'),
  variant: z.enum(['info', 'success', 'warning', 'danger']).optional(),
  icon: z.string().min(1).max(40).optional(),
});

const aiHintFieldSchema = baseFieldSchema.extend({
  kind: z.literal('ai_hint'),
  body: z.string().min(1).max(200),
  targetFieldId: fieldIdSchema.optional(),
});

const fieldSchema = z.discriminatedUnion('kind', [
  textFieldSchema,
  selectFieldSchema,
  radioFieldSchema,
  checkboxFieldSchema,
  integrationPickerFieldSchema,
  adminToggleFieldSchema,
  teammateInviteFieldSchema,
  calloutFieldSchema,
  checklistFieldSchema,
  infoBadgeFieldSchema,
  aiHintFieldSchema,
]);

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
  switch (field.kind) {
    case 'text': {
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
    case 'select': {
      const selectField: SelectField = {
        kind: 'select',
        id: field.id,
        label: field.label,
        required: field.required ?? false,
        helperText: field.helperText,
        options: field.options,
        value: field.defaultValue,
        placeholder: field.placeholder,
      };
      return selectField;
    }
    case 'radio': {
      const radioField: RadioField = {
        kind: 'radio',
        id: field.id,
        label: field.label,
        required: field.required ?? false,
        helperText: field.helperText,
        options: field.options,
        value: field.defaultValue,
        orientation: field.orientation ?? 'vertical',
      };
      return radioField;
    }
    case 'checkbox': {
      const checkboxField: CheckboxField = {
        kind: 'checkbox',
        id: field.id,
        label: field.label,
        required: field.required ?? false,
        helperText: field.helperText,
        options: field.options,
        values: field.defaultValues ?? [],
        orientation: field.orientation ?? 'vertical',
      };
      return checkboxField;
    }
    case 'integration_picker': {
      const integrationPicker: IntegrationPickerField = {
        kind: 'integration_picker',
        id: field.id,
        label: field.label,
        required: field.required ?? false,
        helperText: field.helperText,
        options: field.options,
        values: field.values,
        maxSelections: field.maxSelections,
        categoryLabel: field.categoryLabel,
      };
      return integrationPicker;
    }
    case 'admin_toggle': {
      const adminToggle: AdminToggleField = {
        kind: 'admin_toggle',
        id: field.id,
        label: field.label,
        required: field.required ?? false,
        helperText: field.helperText,
        options: field.options,
        value: field.defaultValue,
      };
      return adminToggle;
    }
    case 'teammate_invite': {
      const teammateInvite: TeammateInviteField = {
        kind: 'teammate_invite',
        id: field.id,
        label: field.label,
        required: field.required ?? false,
        helperText: field.helperText,
        values: field.values,
        roleOptions: field.roleOptions,
        maxInvites: field.maxInvites,
        placeholder: field.placeholder,
      };
      return teammateInvite;
    }
    case 'callout': {
      const calloutField: CalloutField = {
        kind: 'callout',
        id: field.id,
        label: field.label,
        helperText: field.helperText,
        body: field.body,
        variant: field.variant,
        icon: field.icon,
        cta: field.cta,
      };
      return calloutField;
    }
    case 'checklist': {
      const checklistField: ChecklistField = {
        kind: 'checklist',
        id: field.id,
        label: field.label,
        helperText: field.helperText,
        items: field.items,
      };
      return checklistField;
    }
    case 'info_badge': {
      const infoBadgeField: InfoBadgeField = {
        kind: 'info_badge',
        id: field.id,
        label: field.label,
        helperText: field.helperText,
        variant: field.variant,
        icon: field.icon,
      };
      return infoBadgeField;
    }
    case 'ai_hint': {
      const aiHintField: AIHintField = {
        kind: 'ai_hint',
        id: field.id,
        label: field.label,
        helperText: field.helperText,
        body: field.body,
        targetFieldId: field.targetFieldId,
      };
      return aiHintField;
    }
    default:
      return field as unknown as Field;
  }
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
      switch (field.kind) {
        case 'checkbox':
        case 'integration_picker': {
          const values = field.values ?? [];
          return values.length ? { label: field.label, value: values.join(', ') } : undefined;
        }
        case 'radio':
        case 'select':
        case 'text':
        case 'admin_toggle': {
          const value = field.value;
          return value ? { label: field.label, value } : undefined;
        }
        case 'teammate_invite': {
          const invites = field.values ?? [];
          if (invites.length === 0) return undefined;
          return { label: field.label, value: invites.join(', ') };
        }
        default:
          return undefined;
      }
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
