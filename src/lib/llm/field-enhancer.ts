import { detectBehaviorSignals, type BehaviorSignals } from './context';

import {
  FIELD_ID_SET,
  REQUIRED_FIELD_IDS,
  type FieldId,
} from '@/lib/constants/fields';
import type { CheckboxField, Field, FormPlan, RadioField, SelectField, TextField } from '@/lib/types/form';
import type { SessionState } from '@/lib/types/session';

type Persona = NonNullable<SessionState['persona']> | 'explorer' | 'team';

type PlanField = Field & {
  helperText?: string;
};

const REQUIRED_FOR_TEAM = new Set<FieldId>(['workspace_name', 'team_size']);
const REQUIRED_FIELD_SET = new Set<string>(REQUIRED_FIELD_IDS as readonly string[]);

const PLACEHOLDER_MAP: Record<Persona, Partial<Record<FieldId, string>>> = {
  explorer: {
    workspace_name: 'e.g. Design Lab',
    company: 'Optional — add later if needed',
    primary_use: 'What brings you here?',
  },
  team: {
    workspace_name: 'e.g. Acme Growth Team',
    company: 'Company or organization name',
    primary_use: 'Select the main team goal',
  },
};

const PERSONA_OPTION_FILTERS: Record<Persona, Partial<Record<FieldId, string[]>>> = {
  explorer: {
    template: ['blank', 'kanban', 'content'],
    features: ['ai_assist', 'automation', 'integrations'],
    notifications: ['email_updates', 'push_mobile'],
  },
  team: {
    template: ['kanban', 'scrum', 'okr', 'crm'],
    features: ['integrations', 'analytics', 'api', 'custom_fields', 'time_tracking'],
    notifications: ['email_updates', 'email_mentions', 'push_desktop', 'push_mobile'],
  },
};

function determinePersona(metadataPersona?: Persona, sessionPersona?: Persona): Persona {
  if (metadataPersona) {
    return metadataPersona;
  }
  if (sessionPersona) {
    return sessionPersona;
  }
  return 'explorer';
}

function applySessionDefaults(field: PlanField, session: SessionState): PlanField {
  const sessionValue = session.values[field.id];

  if (sessionValue === undefined) {
    return field;
  }

  if (field.kind === 'checkbox') {
    const values = Array.isArray(sessionValue)
      ? sessionValue.filter((value): value is string => typeof value === 'string')
      : typeof sessionValue === 'string'
        ? [sessionValue]
        : [];
    return {
      ...field,
      values,
    } as CheckboxField;
  }

  if (typeof sessionValue === 'string' || typeof sessionValue === 'number') {
    const value = String(sessionValue);
    if (field.kind === 'text') {
      return {
        ...field,
        value,
      } as TextField;
    }
    if (field.kind === 'select' || field.kind === 'radio') {
      return {
        ...field,
        value,
      } as SelectField | RadioField;
    }
  }

  return field;
}

function applyPlaceholders(field: PlanField, persona: Persona): PlanField {
  const placeholder = PLACEHOLDER_MAP[persona]?.[field.id as FieldId];
  if (!placeholder) {
    return field;
  }

  if (field.kind === 'text' && !field.placeholder) {
    return { ...field, placeholder } as TextField;
  }

  if (field.kind === 'select' && !field.placeholder) {
    return { ...field, placeholder } as SelectField;
  }

  return field;
}

function adjustRequired(field: PlanField, persona: Persona): PlanField {
  if (persona === 'explorer') {
    if (!REQUIRED_FIELD_SET.has(field.id)) {
      return { ...field, required: false } as PlanField;
    }
    return field;
  }

  if (persona === 'team') {
    if (REQUIRED_FOR_TEAM.has(field.id as FieldId)) {
      return { ...field, required: true } as PlanField;
    }
  }

  return field;
}

function filterOptions(field: PlanField, persona: Persona): PlanField {
  const allowed = PERSONA_OPTION_FILTERS[persona]?.[field.id as FieldId];
  if (!allowed || !('options' in field) || !field.options) {
    return field;
  }

  const optionSet = new Set(allowed);
  const filteredOptions = field.options.filter(option => optionSet.has(option.value));
  if (!filteredOptions.length) {
    return field;
  }

  if (field.kind === 'checkbox') {
    const filteredValues = (field.values ?? []).filter(value => optionSet.has(value));
    return {
      ...field,
      options: filteredOptions,
      values: filteredValues,
    } as CheckboxField;
  }

  if (field.kind === 'select') {
    const value = field.value && optionSet.has(field.value) ? field.value : undefined;
    return {
      ...field,
      options: filteredOptions,
      value,
    } as SelectField;
  }

  if (field.kind === 'radio') {
    const value = field.value && optionSet.has(field.value) ? field.value : undefined;
    return {
      ...field,
      options: filteredOptions,
      value,
    } as RadioField;
  }

  return field;
}

function addBehaviorHints(field: PlanField, signals: BehaviorSignals): PlanField {
  const hesitant = signals.hesitantFields.find(signal => signal.fieldId === field.id);
  const corrected = signals.correctedFields.find(signal => signal.fieldId === field.id);

  if (!hesitant && !corrected) {
    return field;
  }

  const hints: string[] = [];
  if (hesitant) {
    hints.push('We noticed this field takes time—feel free to keep it simple.');
  }
  if (corrected) {
    hints.push('Preview your answer before continuing to avoid rework.');
  }

  const helperText = [field.helperText, hints.join(' ')].filter(Boolean).join(' ');
  return { ...field, helperText };
}

function enhanceField(
  field: Field,
  session: SessionState,
  persona: Persona,
  signals: BehaviorSignals
): Field {
  let enhanced = { ...field } as PlanField;

  if (!FIELD_ID_SET.has(enhanced.id as FieldId)) {
    return field;
  }

  enhanced = applySessionDefaults(enhanced, session);
  enhanced = applyPlaceholders(enhanced, persona);
  enhanced = adjustRequired(enhanced, persona);
  enhanced = filterOptions(enhanced, persona);
  enhanced = addBehaviorHints(enhanced, signals);

  return enhanced;
}

function enhanceRenderPlan(
  plan: Extract<FormPlan, { kind: 'render_step' }>,
  session: SessionState,
  persona: Persona,
  signals: BehaviorSignals
): FormPlan {
  const enhancedFields = plan.step.fields.map(field => enhanceField(field, session, persona, signals));
  return {
    kind: 'render_step',
    step: {
      ...plan.step,
      fields: enhancedFields,
    },
    stepper: plan.stepper,
  };
}

export function enhancePlanWithContext(
  plan: FormPlan,
  session: SessionState,
  metadataPersona?: Persona
): FormPlan {
  if (plan.kind !== 'render_step') {
    return plan;
  }

  const persona = determinePersona(metadataPersona, session.persona ?? undefined);
  const signals = detectBehaviorSignals(session.events ?? []);
  return enhanceRenderPlan(plan, session, persona, signals);
}
