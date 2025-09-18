/**
 * Field Options Constants
 *
 * This module defines predefined options for select dropdowns,
 * radio groups, and checkbox groups used in the onboarding flow.
 * All options follow the FieldOption interface from the form types.
 */

import type { FieldOption } from '../types/form';

/**
 * Role options for the user's position
 */
export const ROLE_OPTIONS: readonly FieldOption[] = [
  { value: 'eng', label: 'Engineer' },
  { value: 'pm', label: 'Product Manager' },
  { value: 'designer', label: 'Designer' },
  { value: 'data', label: 'Data Analyst' },
  { value: 'marketing', label: 'Marketing' },
  { value: 'sales', label: 'Sales' },
  { value: 'support', label: 'Customer Support' },
  { value: 'ops', label: 'Operations' },
  { value: 'exec', label: 'Executive' },
  { value: 'other', label: 'Other' },
] as const;

/**
 * Team size options for workspace configuration
 */
export const TEAM_SIZE_OPTIONS: readonly FieldOption[] = [
  { value: '1', label: 'Just me' },
  { value: '2-5', label: '2-5 people' },
  { value: '6-20', label: '6-20 people' },
  { value: '21-50', label: '21-50 people' },
  { value: '51-100', label: '51-100 people' },
  { value: '101-500', label: '101-500 people' },
  { value: '500+', label: 'More than 500' },
] as const;

/**
 * Primary use case options
 */
export const USE_CASE_OPTIONS: readonly FieldOption[] = [
  { value: 'personal', label: 'Personal Projects' },
  { value: 'team', label: 'Team Collaboration' },
  { value: 'client', label: 'Client Work' },
  { value: 'education', label: 'Education' },
  { value: 'enterprise', label: 'Enterprise' },
] as const;

/**
 * Project type options
 */
export const PROJECT_TYPE_OPTIONS: readonly FieldOption[] = [
  { value: 'software', label: 'Software Development' },
  { value: 'design', label: 'Design & Creative' },
  { value: 'marketing', label: 'Marketing Campaigns' },
  { value: 'operations', label: 'Business Operations' },
  { value: 'research', label: 'Research & Development' },
  { value: 'content', label: 'Content Creation' },
  { value: 'events', label: 'Event Planning' },
  { value: 'other', label: 'Other' },
] as const;

/**
 * Industry options
 */
export const INDUSTRY_OPTIONS: readonly FieldOption[] = [
  { value: 'tech', label: 'Technology' },
  { value: 'finance', label: 'Finance & Banking' },
  { value: 'healthcare', label: 'Healthcare' },
  { value: 'retail', label: 'Retail & E-commerce' },
  { value: 'education', label: 'Education' },
  { value: 'media', label: 'Media & Entertainment' },
  { value: 'manufacturing', label: 'Manufacturing' },
  { value: 'consulting', label: 'Consulting' },
  { value: 'nonprofit', label: 'Non-profit' },
  { value: 'government', label: 'Government' },
  { value: 'other', label: 'Other' },
] as const;

/**
 * Template options for project setup
 */
export const TEMPLATE_OPTIONS: readonly FieldOption[] = [
  { value: 'blank', label: 'Blank Project' },
  { value: 'kanban', label: 'Kanban Board' },
  { value: 'scrum', label: 'Scrum Sprint' },
  { value: 'waterfall', label: 'Waterfall' },
  { value: 'gantt', label: 'Gantt Timeline' },
  { value: 'okr', label: 'OKR Tracking' },
  { value: 'crm', label: 'CRM Pipeline' },
  { value: 'content', label: 'Content Calendar' },
] as const;

/**
 * Notification preference options (multi-select)
 */
export const NOTIFICATION_OPTIONS: readonly FieldOption[] = [
  { value: 'email_updates', label: 'Email updates' },
  { value: 'email_mentions', label: 'Email on mentions' },
  { value: 'email_daily', label: 'Daily digest' },
  { value: 'push_desktop', label: 'Desktop notifications' },
  { value: 'push_mobile', label: 'Mobile push notifications' },
  { value: 'sms_urgent', label: 'SMS for urgent items' },
] as const;

/**
 * Feature preference options (multi-select)
 */
export const FEATURE_OPTIONS: readonly FieldOption[] = [
  { value: 'ai_assist', label: 'AI Assistant' },
  { value: 'automation', label: 'Workflow Automation' },
  { value: 'integrations', label: 'Third-party Integrations' },
  { value: 'analytics', label: 'Advanced Analytics' },
  { value: 'api', label: 'API Access' },
  { value: 'custom_fields', label: 'Custom Fields' },
  { value: 'time_tracking', label: 'Time Tracking' },
  { value: 'resource_mgmt', label: 'Resource Management' },
] as const;

/**
 * Theme preference options
 */
export const THEME_OPTIONS: readonly FieldOption[] = [
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
  { value: 'auto', label: 'System Default' },
] as const;

/**
 * Language preference options
 */
export const LANGUAGE_OPTIONS: readonly FieldOption[] = [
  { value: 'en', label: 'English' },
  { value: 'es', label: 'Español' },
  { value: 'fr', label: 'Français' },
  { value: 'de', label: 'Deutsch' },
  { value: 'ja', label: '日本語' },
  { value: 'zh', label: '中文' },
  { value: 'ko', label: '한국어' },
  { value: 'pt', label: 'Português' },
] as const;

/**
 * Referral source options
 */
export const REFERRAL_SOURCE_OPTIONS: readonly FieldOption[] = [
  { value: 'search', label: 'Search Engine' },
  { value: 'social', label: 'Social Media' },
  { value: 'friend', label: 'Friend or Colleague' },
  { value: 'blog', label: 'Blog or Article' },
  { value: 'ad', label: 'Advertisement' },
  { value: 'event', label: 'Conference or Event' },
  { value: 'other', label: 'Other' },
] as const;

/**
 * Map of field IDs to their corresponding options
 */
export const FIELD_OPTIONS_MAP = {
  role: ROLE_OPTIONS,
  team_size: TEAM_SIZE_OPTIONS,
  primary_use: USE_CASE_OPTIONS,
  project_type: PROJECT_TYPE_OPTIONS,
  industry: INDUSTRY_OPTIONS,
  template: TEMPLATE_OPTIONS,
  notifications: NOTIFICATION_OPTIONS,
  features: FEATURE_OPTIONS,
  theme: THEME_OPTIONS,
  language: LANGUAGE_OPTIONS,
  referral_source: REFERRAL_SOURCE_OPTIONS,
} as const;

/**
 * Type representing the keys of FIELD_OPTIONS_MAP
 */
export type FieldWithOptions = keyof typeof FIELD_OPTIONS_MAP;

/**
 * Get options for a specific field
 * @param fieldId - The field ID to get options for
 * @returns Array of options or undefined if field has no predefined options
 */
export const getFieldOptions = (fieldId: string): readonly FieldOption[] | undefined => {
  return FIELD_OPTIONS_MAP[fieldId as FieldWithOptions];
};

/**
 * Check if a value is valid for a given field
 * @param fieldId - The field ID to check against
 * @param value - The value to validate
 * @returns True if the value is valid for the field
 */
export const isValidOption = (fieldId: string, value: string): boolean => {
  const options = getFieldOptions(fieldId);
  if (!options) return true; // No predefined options means any value is valid
  return options.some(option => option.value === value);
};

/**
 * Get option label by value
 * @param fieldId - The field ID
 * @param value - The option value
 * @returns The option label or the value itself if not found
 */
export const getOptionLabel = (fieldId: string, value: string): string => {
  const options = getFieldOptions(fieldId);
  if (!options) return value;
  const option = options.find(opt => opt.value === value);
  return option?.label || value;
};

/**
 * Get multiple option labels for multi-select fields
 * @param fieldId - The field ID
 * @param values - Array of option values
 * @returns Array of option labels
 */
export const getOptionLabels = (fieldId: string, values: string[]): string[] => {
  return values.map(value => getOptionLabel(fieldId, value));
};

/**
 * Default values for certain fields
 */
export const DEFAULT_FIELD_VALUES = {
  theme: 'auto',
  language: 'en',
  team_size: '2-5',
  template: 'blank',
} as const;

/**
 * Get default value for a field
 * @param fieldId - The field ID
 * @returns Default value or undefined if no default
 */
export const getDefaultValue = (fieldId: string): string | undefined => {
  return DEFAULT_FIELD_VALUES[fieldId as keyof typeof DEFAULT_FIELD_VALUES];
};