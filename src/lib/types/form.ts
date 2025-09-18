/**
 * Form Type Definitions
 *
 * This module defines the core types for the dynamic form system including:
 * - Field types (TextField, SelectField, RadioField, CheckboxField)
 * - Form structure types (FormStep, FormPlan)
 * - UI state types (StepperItem, ButtonAction)
 * Uses discriminated unions with a 'kind' field for type safety.
 */

/**
 * Represents an option in select, radio, or checkbox fields
 */
export interface FieldOption {
  /** The internal value stored when this option is selected */
  value: string;
  /** The display label shown to users */
  label: string;
  /** Whether this option is disabled */
  disabled?: boolean;
  /** Additional helper copy displayed for the option */
  helperText?: string;
}

/**
 * Base properties shared by all field types
 */
interface BaseField {
  /** Unique identifier for the field */
  id: string;
  /** Display label for the field */
  label: string;
  /** Whether the field is required */
  required?: boolean;
  /** Whether the field is disabled */
  disabled?: boolean;
  /** Helper text shown below the field */
  helperText?: string;
  /** Error message to display when validation fails */
  errorMessage?: string;
}

/**
 * Text input field configuration
 * @example
 * ```typescript
 * const nameField: TextField = {
 *   kind: 'text',
 *   id: 'full_name',
 *   label: 'Full Name',
 *   placeholder: 'Jane Smith',
 *   required: true,
 *   pattern: '^[a-zA-Z\\s]+$'
 * };
 * ```
 */
export interface TextField extends BaseField {
  kind: 'text';
  /** Placeholder text shown when field is empty */
  placeholder?: string;
  /** Current value of the field */
  value?: string;
  /** Regex pattern for validation */
  pattern?: string;
  /** Minimum character length */
  minLength?: number;
  /** Maximum character length */
  maxLength?: number;
  /** HTML autocomplete attribute value */
  autocomplete?: string;
  /** HTML input type */
  type?: 'text' | 'email' | 'password' | 'tel' | 'url';
}

/**
 * Select dropdown field configuration
 * @example
 * ```typescript
 * const roleField: SelectField = {
 *   kind: 'select',
 *   id: 'role',
 *   label: 'Your Role',
 *   options: [
 *     { value: 'eng', label: 'Engineer' },
 *     { value: 'pm', label: 'Product Manager' }
 *   ],
 *   required: true
 * };
 * ```
 */
export interface SelectField extends BaseField {
  kind: 'select';
  /** Available options to choose from */
  options: FieldOption[];
  /** Currently selected value */
  value?: string;
  /** Placeholder text when no option is selected */
  placeholder?: string;
  /** Allow multiple selections (not used in current POC) */
  multiple?: boolean;
}

/**
 * Radio button group field configuration
 * @example
 * ```typescript
 * const useCaseField: RadioField = {
 *   kind: 'radio',
 *   id: 'primary_use',
 *   label: 'How will you use this?',
 *   options: [
 *     { value: 'personal', label: 'Personal Projects' },
 *     { value: 'team', label: 'Team Collaboration' }
 *   ],
 *   required: true
 * };
 * ```
 */
export interface RadioField extends BaseField {
  kind: 'radio';
  /** Available radio button options */
  options: FieldOption[];
  /** Currently selected value */
  value?: string;
  /** Layout orientation of radio buttons */
  orientation?: 'horizontal' | 'vertical';
}

/**
 * Checkbox group field configuration
 * @example
 * ```typescript
 * const notificationsField: CheckboxField = {
 *   kind: 'checkbox',
 *   id: 'notifications',
 *   label: 'Notification Preferences',
 *   options: [
 *     { value: 'email', label: 'Email notifications' },
 *     { value: 'sms', label: 'SMS alerts' }
 *   ],
 *   values: ['email']
 * };
 * ```
 */
export interface CheckboxField extends BaseField {
  kind: 'checkbox';
  /** Available checkbox options */
  options: FieldOption[];
  /** Currently selected values (multiple selection) */
  values?: string[];
  /** Layout orientation of checkboxes */
  orientation?: 'horizontal' | 'vertical';
}

/**
 * Union type representing all possible field types
 * Uses discriminated union pattern with 'kind' property
 */
export type Field = TextField | SelectField | RadioField | CheckboxField;

/**
 * Type guard to check if a field is a TextField
 * @param field - The field to check
 * @returns True if the field is a TextField
 */
export const isTextField = (field: Field): field is TextField =>
  field.kind === 'text';

/**
 * Type guard to check if a field is a SelectField
 * @param field - The field to check
 * @returns True if the field is a SelectField
 */
export const isSelectField = (field: Field): field is SelectField =>
  field.kind === 'select';

/**
 * Type guard to check if a field is a RadioField
 * @param field - The field to check
 * @returns True if the field is a RadioField
 */
export const isRadioField = (field: Field): field is RadioField =>
  field.kind === 'radio';

/**
 * Type guard to check if a field is a CheckboxField
 * @param field - The field to check
 * @returns True if the field is a CheckboxField
 */
export const isCheckboxField = (field: Field): field is CheckboxField =>
  field.kind === 'checkbox';

/**
 * Helper function to get field value(s) regardless of field type
 * @param field - The field to get value from
 * @returns The field's value(s) as string or string array
 */
export const getFieldValue = (field: Field): string | string[] | undefined => {
  if (field.kind === 'checkbox') {
    return field.values;
  }
  return field.value;
};

/**
 * Helper function to check if a field has a value
 * @param field - The field to check
 * @returns True if the field has a non-empty value
 */
export const hasFieldValue = (field: Field): boolean => {
  const value = getFieldValue(field);
  if (Array.isArray(value)) {
    return value.length > 0;
  }
  return value !== undefined && value !== '';
};

// ============================================================================
// Form Structure Types
// ============================================================================

/**
 * Represents a button action in the form flow
 */
export interface ButtonAction {
  /** Display text for the button */
  label: string;
  /** Action to perform when clicked */
  action: 'submit_step' | 'back' | 'skip' | 'complete';
}

/**
 * Represents a single step in the form flow
 * @example
 * ```typescript
 * const basicsStep: FormStep = {
 *   stepId: 'basics',
 *   title: 'Welcome! Let's get started',
 *   description: 'Tell us about yourself',
 *   fields: [nameField, roleField],
 *   primaryCta: { label: 'Continue', action: 'submit_step' },
 *   secondaryCta: { label: 'Skip', action: 'skip' }
 * };
 * ```
 */
export interface FormStep {
  /** Unique identifier for the step */
  stepId: string;
  /** Display title for the step */
  title: string;
  /** Optional description or subtitle */
  description?: string;
  /** Array of fields to display in this step */
  fields: Field[];
  /** Primary call-to-action button */
  primaryCta: ButtonAction;
  /** Optional secondary action button */
  secondaryCta?: ButtonAction;
}

/**
 * Represents an item in the progress stepper UI
 */
export interface StepperItem {
  /** Step identifier */
  id: string;
  /** Display label for the step */
  label: string;
  /** Whether this step is currently active */
  active: boolean;
  /** Whether this step has been completed */
  completed: boolean;
}

/**
 * Represents the current form plan/state
 * Uses discriminated union for different flow states
 */
export type FormPlan =
  | {
      /** Render a form step */
      kind: 'render_step';
      /** The step to render */
      step: FormStep;
      /** Progress stepper state */
      stepper: StepperItem[];
    }
  | {
      /** Show review/summary screen */
      kind: 'review';
      /** Summary items to display */
      summary: Array<{ label: string; value: string }>;
      /** Progress stepper state */
      stepper: StepperItem[];
    }
  | {
      /** Show success state */
      kind: 'success';
      /** Success message to display */
      message: string;
    }
  | {
      /** Show error state */
      kind: 'error';
      /** Error message to display */
      message: string;
    };

/**
 * Type guard to check if plan is render_step
 * @param plan - The plan to check
 * @returns True if the plan is render_step type
 */
export const isRenderStepPlan = (plan: FormPlan): plan is Extract<FormPlan, { kind: 'render_step' }> =>
  plan.kind === 'render_step';

/**
 * Type guard to check if plan is review
 * @param plan - The plan to check
 * @returns True if the plan is review type
 */
export const isReviewPlan = (plan: FormPlan): plan is Extract<FormPlan, { kind: 'review' }> =>
  plan.kind === 'review';

/**
 * Type guard to check if plan is success
 * @param plan - The plan to check
 * @returns True if the plan is success type
 */
export const isSuccessPlan = (plan: FormPlan): plan is Extract<FormPlan, { kind: 'success' }> =>
  plan.kind === 'success';

/**
 * Type guard to check if plan is error
 * @param plan - The plan to check
 * @returns True if the plan is error type
 */
export const isErrorPlan = (plan: FormPlan): plan is Extract<FormPlan, { kind: 'error' }> =>
  plan.kind === 'error';
