/**
 * LLM Configuration Constants
 *
 * This module defines configuration constants for AI/LLM integration,
 * including model parameters, timeouts, and system prompts.
 * These will be used in Phase 2 when AI capabilities are added.
 */

/**
 * LLM model configuration
 */
const FALLBACK_MODEL = 'gpt-5-mini';
const configuredModel = process.env.OPENAI_MODEL?.trim() || FALLBACK_MODEL;

const DEFAULT_PROMPT_VERSION = '2025-09-19-form-orchestrator';
const promptVersion = process.env.LLM_PROMPT_VERSION?.trim() || DEFAULT_PROMPT_VERSION;
const evalLogDir = process.env.EVAL_LOG_DIR?.trim() || 'eval/logs';
const enableEvalLogging = process.env.ENABLE_EVAL_LOGGING !== 'false';
const airtableTableName = process.env.AIRTABLE_TABLE_NAME?.trim() || 'llm_decisions';

export const LLM_CONFIG = {
  /** OpenAI model to use for form decisions */
  model: configuredModel,

  /** Maximum tokens for response */
  maxTokens: 4000,

  /** Timeout for LLM calls in milliseconds */
  timeout: 120000,

  /** Frequency penalty to reduce repetition */
  frequencyPenalty: 0.0,

  /** Presence penalty to encourage diversity */
  presencePenalty: 0.0,

  /** Whether to use streaming responses */
  stream: false,

  /** Retry configuration */
  retry: {
    /** Maximum number of retry attempts */
    maxAttempts: 3,
    /** Initial delay between retries in ms */
    initialDelay: 400,
    /** Maximum delay between retries in ms */
    maxDelay: 3200,
    /** Backoff multiplier between attempts */
    backoffMultiplier: 2,
    /** Random jitter percentage applied to delays */
    jitterRatio: 0.2,
  },
} as const;

/**
 * Prompt versioning used for eval tracking and regression comparisons.
 */
export const PROMPT_VERSION = promptVersion;

/**
 * Evaluation logging configuration.
 */
export const EVAL_LOG_CONFIG = {
  /** Whether JSONL logging is enabled */
  enable: enableEvalLogging,
  /** Directory (relative or absolute) for eval logs */
  logDir: evalLogDir,
  /** Airtable table name for sync script */
  airtableTable: airtableTableName,
} as const;

/**
 * Decision source types for tracking what made UI decisions
 */
export const DECISION_SOURCES = {
  /** Fast, deterministic rules engine */
  RULES: 'rules',
  /** AI-powered decision */
  LLM: 'llm',
  /** Fallback when LLM fails or times out */
  FALLBACK: 'fallback',
} as const;

export type DecisionSource = typeof DECISION_SOURCES[keyof typeof DECISION_SOURCES];

/**
 * System prompts for different LLM decision points
 */
export const SYSTEM_PROMPTS = {
  /**
   * Main form flow orchestration prompt
   */
  FORM_ORCHESTRATOR: `You are the AI director for a multi-step onboarding flow. Always respond by calling the 'propose_next_step' tool with metadata and stepConfig that match the provided JSON schema.

### Context-aware rules
- Respect the existing session progress: do not repeat completed steps unless you are intentionally revisiting for corrections.
- Basics → Workspace → Preferences → Review is the default order. You may skip Workspace or Preferences when the user already supplied the necessary data and confidence is high.
- Avoid asking for information we already have a high-confidence value for; focus on filling gaps or confirming risky fields.

### Persona playbook
- **Explorer** (lightweight / individual): Signals include few completed fields, skip actions, small team size, or hesitation on business questions. Minimize friction: ≤3 total steps, prefer optional fields, enable defaults.
- **Team** (collaborative / enterprise): Signals include team_size ≥ 5, company provided, interest in integrations. Collect workspace configuration, templates, notifications. Allow longer flows when confidence is high.
- If persona is unknown, make a balanced recommendation and set metadata.persona accordingly.

### Behavioral signals
- **Hesitation > 5 seconds** on a field ⇒ consider simplifying, adding helper text, or deferring the field.
- **Repeat corrections (>1 change)** ⇒ mark field optional or provide clearer copy/helper text.
- **Abandonment risk** (multiple back actions or idle steps) ⇒ reduce fields and consider 'skipToReview: true' once essentials are gathered.

### Constraints
- Only reference step IDs from {basics, workspace, preferences, review} and field IDs from the approved whitelist.
- Limit fields to ≤6 per step; prefer ≤4 when persona is explorer or risk is elevated.
- Field kinds must be one of 'text', 'select', 'radio', 'checkbox'. Map any other interaction to the closest allowed kind or omit it entirely.
- For single-select inputs use 'defaultValue'; for multi-select use 'defaultValues' (never both).
- Titles ≤60 characters, descriptions ≤160 characters, helper text ≤160 characters.
- Primary CTA must be an object with { label, action }. Valid actions: 'submit_step', 'back', 'skip', 'complete'. Secondary CTA is optional.
- Reasoning must be concise (≤280 characters) and describe the decisive signals used.
- Confidence must be between 0 and 1. Treat <0.4 as low, 0.4-0.7 medium, >0.7 high. Clamp into range instead of emitting out-of-bounds values.
- Map persona synonyms: individual/personal/solo ⇒ 'explorer'; team/collaborator/organization ⇒ 'team'.
- metadata.decision must be one of {progress, review, fallback}. Use 'fallback' when you cannot make a confident recommendation.

### Output contract
- Always call the 'propose_next_step' tool with:
  - metadata: { reasoning, confidence, persona, decision }
  - stepConfig: { stepId, title, description?, fields[], primaryCta, secondaryCta?, skipToReview? }
- Ensure each field includes { kind, id, label } and optional helpers that adhere to the schema.
- When recommending review, set 'skipToReview: true' and omit non-essential fields.
- When confidence is low, favor keeping the user in the current step with minimal adjustments.

Focus on delivering the smallest, highest-impact set of fields for the next step while satisfying the constraints above.

### Expected response template
Example JSON:
{
  "metadata": {
    "reasoning": "Explorer persona with corrections on identity fields—keep the next step light",
    "confidence": 0.72,
    "persona": "explorer",
    "decision": "progress"
  },
  "stepConfig": {
    "stepId": "workspace",
    "title": "Set up your workspace",
    "description": "Choose a workspace name and focus so we can personalise recommendations.",
    "fields": [
      {
        "kind": "text",
        "id": "workspace_name",
        "label": "Workspace name",
        "placeholder": "e.g. Design Lab",
        "required": false
      },
      {
        "kind": "select",
        "id": "primary_focus",
        "label": "What will you work on?",
        "defaultValue": "personal_projects"
      }
    ],
    "primaryCta": {
      "label": "Continue",
      "action": "submit_step"
    }
  }
}
`,

  /**
   * Field configuration prompt
   */
  FIELD_CONFIGURATOR: `You are configuring form fields based on user context.
Determine which fields to show, hide, or make required.

Consider:
1. User's role and company size
2. Previous answers and patterns
3. Minimize cognitive load
4. Collect essential information only

Output field configurations as JSON.`,

  /**
   * Persona detection prompt
   */
  PERSONA_DETECTOR: `Analyze user behavior to determine their persona:
- "explorer": Quick, minimal info, likely individual user
- "team": Detailed, complete info, likely team/enterprise user

Consider: field completion rate, time spent, company info, team size.
Output: { persona: string, confidence: number, signals: string[] }`,

  /**
   * Success message generation prompt
   */
  SUCCESS_MESSAGE: `Generate a personalized success message based on user's inputs.
Keep it brief (1-2 sentences), friendly, and relevant to their use case.
Reference their specific goals or role when appropriate.`,

  /**
   * Error recovery prompt
   */
  ERROR_RECOVERY: `User encountered an error. Determine the best recovery path:
1. Retry the current step
2. Skip to next step
3. Show simplified version
4. Provide helpful message

Consider error type, user progress, and frustration level.`,
} as const;

/**
 * Structured output schemas for LLM responses
 * These will be used with Zod for runtime validation
 */
export const LLM_SCHEMAS = {
  /** Schema for form plan decisions */
  formPlanSchema: {
    type: 'object',
    properties: {
      kind: {
        type: 'string',
        enum: ['render_step', 'review', 'success', 'error'],
      },
      stepId: { type: 'string' },
      fields: {
        type: 'array',
        items: { type: 'string' },
      },
      reason: { type: 'string' },
      confidence: { type: 'number' },
    },
    required: ['kind', 'confidence'],
  },

  /** Schema for field configuration */
  fieldConfigSchema: {
    type: 'object',
    properties: {
      fieldId: { type: 'string' },
      visible: { type: 'boolean' },
      required: { type: 'boolean' },
      defaultValue: { type: 'string' },
      helperText: { type: 'string' },
    },
    required: ['fieldId', 'visible'],
  },

  /** Schema for persona detection */
  personaSchema: {
    type: 'object',
    properties: {
      persona: {
        type: 'string',
        enum: ['explorer', 'team'],
      },
      confidence: {
        type: 'number',
        minimum: 0,
        maximum: 1,
      },
      signals: {
        type: 'array',
        items: { type: 'string' },
      },
    },
    required: ['persona', 'confidence', 'signals'],
  },
} as const;

/**
 * Telemetry events to track for LLM training data
 */
export const LLM_TELEMETRY_EVENTS = [
  'field_skip_rate',
  'step_completion_time',
  'back_navigation_count',
  'error_rate',
  'overall_completion_rate',
  'field_change_frequency',
  'session_duration',
] as const;

/**
 * Feature flags for LLM capabilities (for gradual rollout)
 */
const envEnableAiOrchestration = process.env.ENABLE_LLM_ORCHESTRATION === 'true';
const envRollout = Number.parseInt(process.env.LLM_ROLLOUT_PERCENTAGE ?? '', 10);
const normalizedRollout = Number.isFinite(envRollout)
  ? Math.min(Math.max(envRollout, 0), 100)
  : envEnableAiOrchestration
    ? 100
    : 0;

export const LLM_FEATURES = {
  /** Enable LLM-powered form orchestration */
  ENABLE_AI_ORCHESTRATION: envEnableAiOrchestration,

  /** Enable persona detection */
  ENABLE_PERSONA_DETECTION: false,

  /** Enable dynamic field configuration */
  ENABLE_DYNAMIC_FIELDS: false,

  /** Enable AI-generated success messages */
  ENABLE_AI_MESSAGES: false,

  /** Enable error recovery suggestions */
  ENABLE_ERROR_RECOVERY: false,

  /** Percentage of users to include in AI features (0-100) */
  ROLLOUT_PERCENTAGE: normalizedRollout,
} as const;

/**
 * Cost tracking constants
 */
export const LLM_COSTS = {
  /** Cost per 1K input tokens in USD */
  INPUT_TOKEN_COST: 0.01,

  /** Cost per 1K output tokens in USD */
  OUTPUT_TOKEN_COST: 0.03,

  /** Monthly budget limit in USD */
  MONTHLY_BUDGET: 100,

  /** Alert threshold as percentage of budget */
  ALERT_THRESHOLD: 0.8,
} as const;

/**
 * Check if LLM features are enabled
 * @returns True if any LLM feature is enabled
 */
export const isLLMEnabled = (): boolean => {
  return (
    LLM_FEATURES.ENABLE_AI_ORCHESTRATION ||
    LLM_FEATURES.ENABLE_PERSONA_DETECTION ||
    LLM_FEATURES.ENABLE_DYNAMIC_FIELDS ||
    LLM_FEATURES.ENABLE_AI_MESSAGES ||
    LLM_FEATURES.ENABLE_ERROR_RECOVERY
  );
};

/**
 * Check if user should get LLM features based on rollout
 * @param userId - User or session ID
 * @returns True if user should get LLM features
 */
export const shouldUseLLM = (userId: string): boolean => {
  if (!isLLMEnabled()) return false;

  // Simple hash-based rollout (deterministic per user)
  const hash = userId.split('').reduce((acc, char) => {
    return ((acc << 5) - acc + char.charCodeAt(0)) | 0;
  }, 0);

  const percentage = Math.abs(hash) % 100;
  return percentage < LLM_FEATURES.ROLLOUT_PERCENTAGE;
};

/**
 * Format system prompt with context
 * @param promptKey - Key from SYSTEM_PROMPTS
 * @param context - Additional context to inject
 * @returns Formatted prompt
 */
export const formatSystemPrompt = (
  promptKey: keyof typeof SYSTEM_PROMPTS,
  context?: Record<string, unknown>
): string => {
  let prompt = SYSTEM_PROMPTS[promptKey];

  if (context) {
    prompt += '\n\nContext:\n' + JSON.stringify(context, null, 2);
  }

  return prompt;
};
