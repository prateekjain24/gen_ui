import { APICallError } from '@ai-sdk/provider';
import { generateText } from 'ai';

import { ERROR_CODES } from '@/lib/constants';
import { FIELD_ID_SET } from '@/lib/constants/fields';
import { LLM_CONFIG, SYSTEM_PROMPTS } from '@/lib/constants/llm';
import type { BackoffSettings } from '@/lib/llm/client';
import {
  LLMServiceError,
  getOpenAIProvider,
  invokeWithTimeout,
  retryWithExponentialBackoff,
  shouldRetryOnError,
} from '@/lib/llm/client';
import { buildLLMUserContext, formatLLMUserContext } from '@/lib/llm/context';
import { logLLMDecision } from '@/lib/llm/eval-logger';
import { enhancePlanWithContext } from '@/lib/llm/field-enhancer';
import {
  LLMResponseValidationError,
  type LLMDecisionMetadata,
  parseLLMDecision,
} from '@/lib/llm/response-parser';
import { recordLLMUsage } from '@/lib/llm/usage-tracker';
import type { FormPlan } from '@/lib/types/form';
import type { SessionState } from '@/lib/types/session';
import { createDebugger, debugError } from '@/lib/utils/debug';

const debug = createDebugger('LLMPolicy');

const backoffSettings: BackoffSettings = {
  maxAttempts: LLM_CONFIG.retry.maxAttempts,
  initialDelay: LLM_CONFIG.retry.initialDelay,
  maxDelay: LLM_CONFIG.retry.maxDelay,
  backoffMultiplier: LLM_CONFIG.retry.backoffMultiplier,
  jitterRatio: LLM_CONFIG.retry.jitterRatio,
};

function buildPrompt(session: SessionState): string {
  const context = buildLLMUserContext(session);
  const serialized = formatLLMUserContext(context);

  return `You are orchestrating an adaptive onboarding form.

Session snapshot:
${serialized}

Produce a JSON object describing the recommended next step and fields. Follow the system instructions strictly.`;
}

function mapToLLMServiceError(error: unknown): LLMServiceError {
  if (error instanceof LLMServiceError) {
    return error;
  }

  if (APICallError.isInstance(error)) {
    const isRateLimit = error.statusCode === 429;
    return new LLMServiceError(error.message, isRateLimit ? ERROR_CODES.RATE_LIMIT_EXCEEDED : ERROR_CODES.LLM_ERROR, {
      cause: error,
    });
  }

  if (error instanceof Error) {
    if (error.name === 'AbortError') {
      return new LLMServiceError(error.message || 'LLM request timed out', ERROR_CODES.LLM_TIMEOUT, {
        cause: error,
      });
    }

    return new LLMServiceError(error.message, ERROR_CODES.LLM_ERROR, { cause: error });
  }

  return new LLMServiceError('Unknown LLM failure', ERROR_CODES.LLM_ERROR);
}

function normalizeLLMTextPayload(raw: string): string {
  let text = raw.trim();

  if (!text) {
    return text;
  }

  // Unwrap propose_next_step(...) wrapper if present.
  if (text.startsWith('propose_next_step')) {
    const match = text.match(/propose_next_step\s*\(([\s\S]*)\)\s*;?$/);
    if (match?.[1]) {
      text = match[1].trim();
    }
  }

  if (!text) {
    return text;
  }

  // If already valid JSON, return as-is.
  try {
    JSON.parse(text);
    return text;
  } catch {
    // continue with normalization
  }

  let normalized = text;

  // Remove trailing commas before closing braces/brackets.
  normalized = normalized.replace(/,\s*(\]|\})/g, '$1');

  // Convert single-quoted strings to double-quoted JSON strings.
  normalized = normalized.replace(/'([^'\\]*(?:\\.[^'\\]*)*)'/g, (_match, inner) => {
    return JSON.stringify(inner.replace(/\\'/g, "'"));
  });

  // Ensure object keys are quoted when they are bare identifiers.
  normalized = normalized.replace(
    /(?<![\\w"'])\b([A-Za-z_][A-Za-z0-9_]*)\b\s*:/g,
    (_match, key: string) => `${JSON.stringify(key)}:`
  );

  // After normalization attempt, return the transformed string. If JSON.parse still fails,
  // the caller will throw a validation error and fallback.
  return normalized;
}

function repairLLMPayload(payload: unknown): unknown {
  if (payload === null || typeof payload !== 'object') {
    return payload;
  }

  const repaired = JSON.parse(JSON.stringify(payload)) as Record<string, unknown>;

  const metadata = (repaired.metadata ?? {}) as Record<string, unknown>;
  if (typeof metadata.confidence === 'number') {
    metadata.confidence = Math.min(Math.max(metadata.confidence, 0), 1);
  }

  if (typeof metadata.persona === 'string') {
    const persona = metadata.persona.toLowerCase();
    if (persona === 'personal' || persona === 'solo') {
      metadata.persona = 'explorer';
    }
    if (persona === 'team' || persona === 'explorer') {
      metadata.persona = persona;
    }
  }

  repaired.metadata = metadata;

  const stepConfig = (repaired.stepConfig ?? {}) as Record<string, unknown>;
  if (typeof stepConfig.stepId !== 'string' && typeof repaired.kind === 'string') {
    stepConfig.stepId = repaired.kind;
  }

  if (typeof stepConfig.title !== 'string' || !stepConfig.title.trim()) {
    const id = typeof stepConfig.stepId === 'string' ? stepConfig.stepId : 'next step';
    stepConfig.title = id.charAt(0).toUpperCase() + id.slice(1).replace(/[_-]/g, ' ');
  }

  const defaultPrimaryCta: Record<string, unknown> = { label: 'Continue', action: 'submit_step' };
  if (typeof stepConfig.primaryCta === 'string') {
    const trimmed = stepConfig.primaryCta.trim();
    if (trimmed) {
      defaultPrimaryCta.label = trimmed;
    }
  }

  const primaryCtaSource =
    typeof stepConfig.primaryCta === 'object' && stepConfig.primaryCta !== null && !Array.isArray(stepConfig.primaryCta)
      ? (stepConfig.primaryCta as Record<string, unknown>)
      : {};

  const primaryCta = { ...defaultPrimaryCta, ...primaryCtaSource } as Record<string, unknown>;

  if (typeof primaryCta.label !== 'string' || !primaryCta.label.trim()) {
    primaryCta.label = 'Continue';
  }

  if (!['submit_step', 'complete', 'back', 'skip'].includes(primaryCta.action as string)) {
    primaryCta.action = 'submit_step';
  }

  stepConfig.primaryCta = primaryCta;

  const allowedKinds = new Set([
    'text',
    'select',
    'radio',
    'checkbox',
    'integration_picker',
    'admin_toggle',
    'teammate_invite',
    'callout',
    'checklist',
    'info_badge',
    'ai_hint',
  ]);
  const kindAliases: Record<string, string> = {
    toggle: 'checkbox',
    switch: 'checkbox',
    dropdown: 'select',
    button: 'radio',
    banner: 'callout',
    pill: 'info_badge',
    badge: 'info_badge',
    hint: 'ai_hint',
    helper: 'ai_hint',
    multi_select: 'integration_picker',
    integrations: 'integration_picker',
    teammate_list: 'teammate_invite',
    invites: 'teammate_invite',
    segmented: 'admin_toggle',
  };
  const idRemap: Record<string, string> = {
    workspace_goal: 'primary_focus',
    preferred_integrations: 'preferred_integrations',
    notify_team: 'notification_preferences',
    integrations: 'preferred_integrations',
    team_invite_list: 'team_invites',
    invite_list: 'team_invites',
    admin_controls_toggle: 'admin_controls',
    access_control: 'access_level',
    audit_logs: 'audit_logging',
    explorer_callout: 'guided_callout',
    explorer_checklist: 'guided_checklist',
    persona_badge: 'persona_info_badge',
  };

  if (Array.isArray(stepConfig.fields)) {
    const repairedFields: Array<Record<string, unknown>> = [];
    for (const field of stepConfig.fields as Array<unknown>) {
      if (!field || typeof field !== 'object' || Array.isArray(field)) {
        continue;
      }

      const cloned = { ...(field as Record<string, unknown>) };

      if (typeof cloned.id !== 'string' || !cloned.id.trim()) {
        continue;
      }

      const normalizedId = cloned.id.trim();
      const remappedId = idRemap[normalizedId] ?? normalizedId;
      if (!FIELD_ID_SET.has(remappedId as never)) {
        debug('Dropping unsupported field id', { originalId: normalizedId });
        continue;
      }
      cloned.id = remappedId;

      const rawKind = typeof cloned.kind === 'string' ? cloned.kind.toLowerCase() : 'text';
      let mappedKind = rawKind;

      if (!allowedKinds.has(mappedKind) && kindAliases[mappedKind]) {
        mappedKind = kindAliases[mappedKind];
      }

      if (!allowedKinds.has(mappedKind)) {
        mappedKind = 'text';
      }

      cloned.kind = mappedKind;

      if (mappedKind === 'integration_picker') {
        if (!Array.isArray(cloned.options)) {
          cloned.options = [];
        }
        if (!Array.isArray(cloned.values)) {
          const defaults = Array.isArray(cloned.defaultValues) ? cloned.defaultValues : [];
          cloned.values = defaults;
        }
      }

      if (mappedKind === 'admin_toggle') {
        if (!Array.isArray(cloned.options)) {
          cloned.options = [];
        }
        if (typeof cloned.defaultValue === 'string' && typeof cloned.value !== 'string') {
          cloned.value = cloned.defaultValue;
        }
      }

      if (mappedKind === 'teammate_invite') {
        if (!Array.isArray(cloned.values)) {
          const emails = Array.isArray(cloned.invites)
            ? (cloned.invites as Array<{ email?: string }>)
                .map((invite) => (invite && typeof invite.email === 'string' ? invite.email : null))
                .filter((email): email is string => Boolean(email))
            : [];
          cloned.values = emails;
        }
        if (!Array.isArray(cloned.roleOptions)) {
          cloned.roleOptions = [];
        }
        if ('invites' in cloned) {
          delete cloned.invites;
        }
      }

      if (mappedKind === 'callout' || mappedKind === 'checklist' || mappedKind === 'info_badge' || mappedKind === 'ai_hint') {
        cloned.required = false;
      }

      if (mappedKind === 'callout' && typeof cloned.body !== 'string') {
        cloned.body = typeof cloned.helperText === 'string' ? cloned.helperText : '';
      }

      if (mappedKind === 'ai_hint' && typeof cloned.body !== 'string') {
        cloned.body = typeof cloned.helperText === 'string' ? cloned.helperText : '';
      }

      if (typeof cloned.label !== 'string' || !cloned.label.trim()) {
        if (typeof cloned.id === 'string') {
          const pretty = cloned.id
            .replace(/[_-]+/g, ' ')
            .replace(/\b\w/g, char => char.toUpperCase());
          cloned.label = pretty;
        } else {
          cloned.label = 'Field';
        }
      }

      repairedFields.push(cloned);
    }

    stepConfig.fields = repairedFields;
  } else {
    stepConfig.fields = [];
  }

  repaired.stepConfig = stepConfig;

  return repaired;
}

/**
 * Generates a plan using the OpenAI provider via the AI SDK.
 * Currently returns null until schema mapping is implemented in later stories.
 */
export interface LLMDecisionResult {
  plan: FormPlan;
  metadata: LLMDecisionMetadata;
}

export async function generatePlanWithLLM(session: SessionState): Promise<LLMDecisionResult | null> {
  if (!process.env.OPENAI_API_KEY) {
    debug('Skipping LLM plan generation: OPENAI_API_KEY not configured');
    return null;
  }

  try {
    const openai = getOpenAIProvider();

    const result = await retryWithExponentialBackoff(
      attempt =>
        invokeWithTimeout(LLM_CONFIG.timeout, async signal => {
          const output = await generateText({
            model: openai(LLM_CONFIG.model),
            system: SYSTEM_PROMPTS.FORM_ORCHESTRATOR,
            prompt: buildPrompt(session),
            maxOutputTokens: LLM_CONFIG.maxTokens,
            abortSignal: signal,
            maxRetries: 0,
            providerOptions: {
              openai: {
                reasoning: {
                  effort: 'medium',
                },
              },
            },
          });

          recordLLMUsage(output.usage);
          debug(`LLM call succeeded on attempt ${attempt}`);
          return output;
        }),
      backoffSettings,
      {
        shouldRetry: error => shouldRetryOnError(error),
        onRetry: (error, attempt, delayMs) => {
          const mapped = mapToLLMServiceError(error);
          debug(
            `Retrying LLM call after failure (attempt ${attempt} of ${backoffSettings.maxAttempts}). ` +
              `Next attempt in ${delayMs}ms. [code=${mapped.code}]`
          );
        },
      }
    );

    debug(
      'LLM raw result snapshot',
      {
        keys: Object.keys(result ?? {}),
        finishReason: (result as { finishReason?: unknown }).finishReason,
        toolCalls: Array.isArray((result as { toolCalls?: unknown }).toolCalls)
          ? (result as { toolCalls?: unknown[] }).toolCalls?.length
          : 0,
        warnings: (result as { warnings?: unknown }).warnings,
      }
    );

    let responseText = normalizeLLMTextPayload(result.text ?? '');

    const resolvedOutput = (result as { resolvedOutput?: unknown }).resolvedOutput;
    if (resolvedOutput) {
      try {
        const serialized = typeof resolvedOutput === 'string' ? resolvedOutput : JSON.stringify(resolvedOutput);
        debug('LLM resolved output preview', {
          preview: serialized.slice(0, 200),
          type: typeof resolvedOutput,
        });
      } catch {
        debug('LLM resolved output preview unavailable');
      }
    }

    if (!responseText && resolvedOutput) {
      if (typeof resolvedOutput === 'string') {
        responseText = normalizeLLMTextPayload(resolvedOutput);
      } else {
        try {
          responseText = normalizeLLMTextPayload(JSON.stringify(resolvedOutput));
        } catch {
          // fall back to other extraction strategies
        }
      }
    }

    const toolCalls = (result as {
      toolCalls?: Array<{ toolName?: string; args?: unknown; input?: unknown }>;
    }).toolCalls;

    if (!responseText && Array.isArray(toolCalls) && toolCalls.length > 0) {
      const matchedToolCall = toolCalls.find(call => call.toolName === 'propose_next_step') ?? toolCalls[0];
      if (matchedToolCall) {
        const args = matchedToolCall.args ?? matchedToolCall.input;
        if (typeof args === 'string') {
          responseText = normalizeLLMTextPayload(args);
        } else if (args) {
          try {
            responseText = normalizeLLMTextPayload(JSON.stringify(args));
          } catch {
            // fall through to empty check below
          }
        }
      }

      debug(
        responseText
          ? 'LLM provided tool call payload; using args for parsing'
          : 'LLM tool call detected but args were empty or non-serializable'
      );
    }

    debug(`LLM response captured (${responseText.length} chars)`, {
      preview: responseText.slice(0, 200),
    });

    if (responseText.startsWith('propose_next_step')) {
      const proposeRegex = /propose_next_step\s*\(([\s\S]*)\)\s*;?$/;
      const match = responseText.match(proposeRegex);
      if (match?.[1]) {
        responseText = match[1].trim();
        debug('Extracted payload from propose_next_step call wrapper');
      }
    }

    if (!responseText.trim()) {
      let rawResponseBody = '';
      const responseBody = (result as { response?: { body?: unknown } }).response?.body;
      if (typeof responseBody === 'string') {
        rawResponseBody = responseBody;
      } else if (responseBody && typeof responseBody === 'object') {
        try {
          rawResponseBody = JSON.stringify(responseBody);
        } catch {
          rawResponseBody = '[unserializable body]';
        }
      }

      debug(
        'LLM returned empty text output',
        {
          toolCallsCount: Array.isArray(toolCalls) ? toolCalls.length : 0,
          toolCallKeys: Array.isArray(toolCalls) && toolCalls[0] ? Object.keys(toolCalls[0] as object) : [],
          finishReason: (result as { finishReason?: unknown }).finishReason,
          warnings: (result as { warnings?: unknown }).warnings,
          rawBodyPreview: rawResponseBody ? `${rawResponseBody.slice(0, 200)}…` : null,
        }
      );

      throw new LLMResponseValidationError('LLM returned an empty response');
    }

    let parsedPayload: unknown;
    try {
      parsedPayload = JSON.parse(responseText);
    } catch (error) {
      debugError('LLM JSON parse failed', { preview: responseText.slice(0, 400) });
      throw new LLMResponseValidationError('LLM response was not valid JSON', error);
    }

    const repairedPayload = repairLLMPayload(parsedPayload);

    let parsed: ReturnType<typeof parseLLMDecision> | null = null;
    try {
      parsed = parseLLMDecision(repairedPayload, session);
    } catch (error) {
      if (error instanceof LLMResponseValidationError) {
        debugError('LLM schema validation failed', error.details ?? error);
        try {
          debug('LLM payload snapshot', { preview: JSON.stringify(repairedPayload).slice(0, 400) });
        } catch {
          debug('LLM payload snapshot unavailable');
        }
      }
      throw error;
    }

    debug(`LLM decision parsed with confidence ${parsed.metadata.confidence}`);

    const enhancedPlan = enhancePlanWithContext(parsed.plan, session, parsed.metadata.persona);

    void logLLMDecision({
      session,
      plan: enhancedPlan,
      metadata: parsed.metadata,
      rawResponse: responseText,
    });

    return {
      plan: enhancedPlan,
      metadata: parsed.metadata,
    };
  } catch (error) {
    if (error instanceof LLMResponseValidationError) {
      debugError('LLM response validation failed', error);
      return null;
    }

    const mappedError = mapToLLMServiceError(error);
    debugError('LLM plan generation failed', mappedError);
    return null;
  }
}
