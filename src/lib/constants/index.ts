/**
 * Constants Module
 *
 * Central export point for all constants used throughout the application.
 * This module re-exports constants from specialized modules for easy import.
 *
 * @example
 * ```typescript
 * import { FIELD_IDS, ROLE_OPTIONS, LLM_CONFIG } from '@/lib/constants';
 * ```
 */

// ============================================================================
// Field ID Constants
// ============================================================================
export {
  FIELD_IDS,
  FIELD_ID_LIST,
  FIELD_ID_SET,
  REQUIRED_FIELD_IDS,
  TEAM_FIELD_IDS,
  OPTIONAL_FIELD_IDS,
  SENSITIVE_FIELD_IDS,
  FIELD_STEP_MAP,
  isValidFieldId,
  isRequiredField,
  isTeamField,
  isOptionalField,
  isSensitiveField,
  sanitizeFieldValue,
  getFieldStep,
  type FieldId,
} from './fields';

// ============================================================================
// Field Options Constants
// ============================================================================
export {
  ROLE_OPTIONS,
  TEAM_SIZE_OPTIONS,
  USE_CASE_OPTIONS,
  PROJECT_TYPE_OPTIONS,
  INDUSTRY_OPTIONS,
  TEMPLATE_OPTIONS,
  NOTIFICATION_OPTIONS,
  FEATURE_OPTIONS,
  THEME_OPTIONS,
  LANGUAGE_OPTIONS,
  REFERRAL_SOURCE_OPTIONS,
  FIELD_OPTIONS_MAP,
  DEFAULT_FIELD_VALUES,
  getFieldOptions,
  isValidOption,
  getOptionLabel,
  getOptionLabels,
  getDefaultValue,
  type FieldWithOptions,
} from './options';

// ============================================================================
// LLM Configuration Constants
// ============================================================================
export {
  LLM_CONFIG,
  DECISION_SOURCES,
  EVAL_LOG_CONFIG,
  SYSTEM_PROMPTS,
  LLM_SCHEMAS,
  LLM_TELEMETRY_EVENTS,
  LLM_FEATURES,
  LLM_COSTS,
  isLLMEnabled,
  shouldUseLLM,
  formatSystemPrompt,
  PROMPT_VERSION,
  type DecisionSource,
} from './llm';

// ============================================================================
// Application-wide Constants
// ============================================================================

/**
 * Step IDs used in the onboarding flow
 */
export const STEP_IDS = {
  BASICS: 'basics',
  WORKSPACE: 'workspace',
  PREFERENCES: 'preferences',
  REVIEW: 'review',
  SUCCESS: 'success',
} as const;

export type StepId = typeof STEP_IDS[keyof typeof STEP_IDS];

/**
 * Default step order for the onboarding flow
 */
export const DEFAULT_STEP_ORDER: readonly StepId[] = [
  STEP_IDS.BASICS,
  STEP_IDS.WORKSPACE,
  STEP_IDS.PREFERENCES,
  STEP_IDS.REVIEW,
  STEP_IDS.SUCCESS,
] as const;

/**
 * Session configuration
 */
export const SESSION_CONFIG = {
  /** Maximum idle time before session expires (minutes) */
  MAX_IDLE_MINUTES: 60,

  /** Maximum number of events to store per session */
  MAX_EVENTS_PER_SESSION: 50,

  /** Session cleanup interval (minutes) */
  CLEANUP_INTERVAL_MINUTES: 15,

  /** Maximum number of concurrent sessions */
  MAX_CONCURRENT_SESSIONS: 1000,
} as const;

/**
 * API configuration
 */
export const API_CONFIG = {
  /** Base path for API routes */
  BASE_PATH: '/api',

  /** API version */
  VERSION: 'v1',

  /** Request timeout (milliseconds) */
  REQUEST_TIMEOUT: 30000,

  /** Maximum request body size */
  MAX_BODY_SIZE: '1mb',

  /** Rate limiting */
  RATE_LIMIT: {
    /** Maximum requests per window */
    maxRequests: 100,
    /** Time window in minutes */
    windowMinutes: 1,
  },
} as const;

/**
 * Validation rules
 */
export const VALIDATION = {
  /** Email regex pattern */
  EMAIL_PATTERN: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,

  /** Name constraints */
  NAME: {
    minLength: 2,
    maxLength: 100,
    pattern: /^[a-zA-Z\s'-]+$/,
  },

  /** Company name constraints */
  COMPANY: {
    minLength: 2,
    maxLength: 100,
  },

  /** Workspace name constraints */
  WORKSPACE: {
    minLength: 3,
    maxLength: 50,
    pattern: /^[a-zA-Z0-9\s-_]+$/,
  },

  /** Password constraints (for future use) */
  PASSWORD: {
    minLength: 8,
    maxLength: 128,
    requireUppercase: true,
    requireLowercase: true,
    requireNumbers: true,
    requireSpecialChars: true,
  },
} as const;

/**
 * UI configuration
 */
export const UI_CONFIG = {
  /** Animation durations (milliseconds) */
  ANIMATION: {
    fast: 150,
    normal: 300,
    slow: 500,
  },

  /** Debounce delays (milliseconds) */
  DEBOUNCE: {
    search: 300,
    fieldChange: 1000,
    resize: 100,
  },

  /** Toast notification duration (milliseconds) */
  TOAST_DURATION: 5000,

  /** Maximum number of retries for failed requests */
  MAX_RETRIES: 3,
} as const;

/**
 * Error codes
 */
export const ERROR_CODES = {
  // Client errors
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  INVALID_FIELD_ID: 'INVALID_FIELD_ID',
  MISSING_REQUIRED_FIELD: 'MISSING_REQUIRED_FIELD',
  SESSION_NOT_FOUND: 'SESSION_NOT_FOUND',
  SESSION_EXPIRED: 'SESSION_EXPIRED',

  // Server errors
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  LLM_TIMEOUT: 'LLM_TIMEOUT',
  LLM_ERROR: 'LLM_ERROR',
  RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED',

  // Network errors
  NETWORK_ERROR: 'NETWORK_ERROR',
  TIMEOUT: 'TIMEOUT',
} as const;

export type ErrorCode = typeof ERROR_CODES[keyof typeof ERROR_CODES];

/**
 * Success messages
 */
export const SUCCESS_MESSAGES = {
  FORM_SUBMITTED: 'Your information has been saved successfully!',
  STEP_COMPLETED: 'Great! Let\'s continue to the next step.',
  ONBOARDING_COMPLETE: 'Welcome aboard! Your account is all set up.',
  PREFERENCES_SAVED: 'Your preferences have been updated.',
} as const;

/**
 * Environment configuration
 */
export const ENV = {
  /** Check if running in development mode */
  isDevelopment: process.env.NODE_ENV === 'development',

  /** Check if running in production mode */
  isProduction: process.env.NODE_ENV === 'production',

  /** Check if running in test mode */
  isTest: process.env.NODE_ENV === 'test',

  /** Check if debug mode is enabled */
  isDebug: process.env.NEXT_PUBLIC_DEBUG === 'true',

  /** Enable experimental AI-driven components */
  enableExperimentalComponents: process.env.NEXT_PUBLIC_ENABLE_EXPERIMENTAL_COMPONENTS !== 'false',
} as const;
