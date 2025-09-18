/**
 * Field ID Constants
 *
 * This module defines whitelisted field identifiers used throughout
 * the onboarding flow. These IDs are used for form values, validation,
 * and telemetry tracking.
 */

/**
 * Whitelisted field IDs for the onboarding form
 * Uses const assertion for type safety and immutability
 */
export const FIELD_IDS = {
  // ============================================================================
  // Basic Information Fields
  // ============================================================================
  /** User's full name */
  FULL_NAME: 'full_name',

  /** User's email address */
  EMAIL: 'email',

  /** User's company or organization */
  COMPANY: 'company',

  /** User's role/title */
  ROLE: 'role',

  // ============================================================================
  // Workspace Fields
  // ============================================================================
  /** Name of the workspace to create */
  WORKSPACE_NAME: 'workspace_name',

  /** Size of the user's team */
  TEAM_SIZE: 'team_size',

  /** Primary use case for the product */
  PRIMARY_USE: 'primary_use',

  /** Type of project or workflow */
  PROJECT_TYPE: 'project_type',

  /** Industry or domain */
  INDUSTRY: 'industry',

  // ============================================================================
  // Preference Fields
  // ============================================================================
  /** Notification preferences (multi-select) */
  NOTIFICATIONS: 'notifications',

  /** Features to enable (multi-select) */
  FEATURES: 'features',

  /** Preferred project template */
  TEMPLATE: 'template',

  /** UI theme preference */
  THEME: 'theme',

  /** Language preference */
  LANGUAGE: 'language',

  /** Timezone setting */
  TIMEZONE: 'timezone',

  // ============================================================================
  // Additional Fields
  // ============================================================================
  /** How user heard about the product */
  REFERRAL_SOURCE: 'referral_source',

  /** Marketing communications opt-in */
  MARKETING_CONSENT: 'marketing_consent',

  /** Terms of service acceptance */
  TERMS_ACCEPTED: 'terms_accepted',

  /** Additional comments or requirements */
  COMMENTS: 'comments',
} as const;

/**
 * Type representing valid field ID values
 */
export type FieldId = typeof FIELD_IDS[keyof typeof FIELD_IDS];

/**
 * Array of all valid field IDs for validation
 */
export const FIELD_ID_LIST: readonly FieldId[] = Object.values(FIELD_IDS);

/**
 * Set of field IDs for O(1) lookup performance
 */
export const FIELD_ID_SET = new Set(FIELD_ID_LIST);

/**
 * Fields that are required in the basic flow
 */
export const REQUIRED_FIELD_IDS = [
  FIELD_IDS.FULL_NAME,
  FIELD_IDS.EMAIL,
  FIELD_IDS.ROLE,
] as const;

/**
 * Fields that indicate team/enterprise intent
 */
export const TEAM_FIELD_IDS = [
  FIELD_IDS.WORKSPACE_NAME,
  FIELD_IDS.TEAM_SIZE,
  FIELD_IDS.COMPANY,
  FIELD_IDS.INDUSTRY,
] as const;

/**
 * Fields that are optional and can be skipped
 */
export const OPTIONAL_FIELD_IDS = [
  FIELD_IDS.NOTIFICATIONS,
  FIELD_IDS.FEATURES,
  FIELD_IDS.THEME,
  FIELD_IDS.LANGUAGE,
  FIELD_IDS.TIMEZONE,
  FIELD_IDS.REFERRAL_SOURCE,
  FIELD_IDS.COMMENTS,
] as const;

/**
 * Fields that contain sensitive information
 * These should not be included in telemetry events
 */
export const SENSITIVE_FIELD_IDS = [
  FIELD_IDS.EMAIL,
  FIELD_IDS.FULL_NAME,
  FIELD_IDS.COMPANY,
  FIELD_IDS.COMMENTS,
] as const;

/**
 * Type guard to check if a string is a valid field ID
 * @param value - The value to check
 * @returns True if the value is a valid field ID
 */
export const isValidFieldId = (value: string): value is FieldId => {
  return FIELD_ID_SET.has(value as FieldId);
};

/**
 * Type guard to check if a field ID is required
 * @param fieldId - The field ID to check
 * @returns True if the field is required
 */
export const isRequiredField = (fieldId: string): boolean => {
  return (REQUIRED_FIELD_IDS as readonly string[]).includes(fieldId);
};

/**
 * Type guard to check if a field ID is team-related
 * @param fieldId - The field ID to check
 * @returns True if the field is team-related
 */
export const isTeamField = (fieldId: string): boolean => {
  return (TEAM_FIELD_IDS as readonly string[]).includes(fieldId);
};

/**
 * Type guard to check if a field ID is optional
 * @param fieldId - The field ID to check
 * @returns True if the field is optional
 */
export const isOptionalField = (fieldId: string): boolean => {
  return (OPTIONAL_FIELD_IDS as readonly string[]).includes(fieldId);
};

/**
 * Type guard to check if a field ID contains sensitive data
 * @param fieldId - The field ID to check
 * @returns True if the field contains sensitive data
 */
export const isSensitiveField = (fieldId: string): boolean => {
  return (SENSITIVE_FIELD_IDS as readonly string[]).includes(fieldId);
};

/**
 * Helper to sanitize field values for telemetry
 * @param fieldId - The field ID
 * @param value - The field value
 * @returns Sanitized value or placeholder for sensitive fields
 */
export const sanitizeFieldValue = (fieldId: string, value: unknown): unknown => {
  if (isSensitiveField(fieldId)) {
    if (fieldId === FIELD_IDS.EMAIL) {
      // Keep domain for analytics but hide local part
      const domain = typeof value === 'string' ? value.split('@')[1] : undefined;
      return domain ? `***@${domain}` : '***';
    }
    return '***'; // Placeholder for other sensitive fields
  }
  return value;
};

/**
 * Map of field IDs to their step in the flow
 */
export const FIELD_STEP_MAP: Record<FieldId, string> = {
  // Basics step
  [FIELD_IDS.FULL_NAME]: 'basics',
  [FIELD_IDS.EMAIL]: 'basics',
  [FIELD_IDS.COMPANY]: 'basics',
  [FIELD_IDS.ROLE]: 'basics',

  // Workspace step
  [FIELD_IDS.WORKSPACE_NAME]: 'workspace',
  [FIELD_IDS.TEAM_SIZE]: 'workspace',
  [FIELD_IDS.PRIMARY_USE]: 'workspace',
  [FIELD_IDS.PROJECT_TYPE]: 'workspace',
  [FIELD_IDS.INDUSTRY]: 'workspace',

  // Preferences step
  [FIELD_IDS.NOTIFICATIONS]: 'preferences',
  [FIELD_IDS.FEATURES]: 'preferences',
  [FIELD_IDS.TEMPLATE]: 'preferences',
  [FIELD_IDS.THEME]: 'preferences',
  [FIELD_IDS.LANGUAGE]: 'preferences',
  [FIELD_IDS.TIMEZONE]: 'preferences',

  // Additional fields (various steps)
  [FIELD_IDS.REFERRAL_SOURCE]: 'basics',
  [FIELD_IDS.MARKETING_CONSENT]: 'preferences',
  [FIELD_IDS.TERMS_ACCEPTED]: 'basics',
  [FIELD_IDS.COMMENTS]: 'preferences',
};

/**
 * Get the step that contains a given field
 * @param fieldId - The field ID to look up
 * @returns The step ID or undefined if not found
 */
export const getFieldStep = (fieldId: string): string | undefined => {
  return FIELD_STEP_MAP[fieldId as FieldId];
};