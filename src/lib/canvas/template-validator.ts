import { getTemplate, type TemplateId, type TemplateTone } from "@/lib/canvas/templates";

export type ValidationSeverity = "error" | "warning";

export interface SlotValidationIssue {
  slotId: string;
  reason: string;
  severity: ValidationSeverity;
}

export interface SlotValidationResult {
  templateId: TemplateId;
  isValid: boolean;
  sanitizedValues: Record<string, string>;
  issues: SlotValidationIssue[];
  fallbackApplied: boolean;
}

export interface TemplateValidationOptions {
  /**
   * Allow missing required slots without marking them as errors. Used for partial rerenders.
   */
  allowPartial?: boolean;
  /**
   * Additional forbidden content matchers.
   */
  forbiddenPatterns?: RegExp[];
  /**
   * Override expected tone per slot id.
   */
  toneOverrides?: Record<string, TemplateTone>;
}

const DEFAULT_FORBIDDEN_PATTERNS = [/lorem ipsum/i, /<script/i, /<style/i];
const NEGATIVE_WORDS = ["failure", "penalty", "violation", "disciplinary", "shutdown", "breach", "lawsuit"];
const SLANG_WORDS = ["gonna", "wanna", "kinda", "sorta", "lol", "btw", "omg", "y'all"];
const COMPLIANCE_KEYWORDS = ["compliance", "policy", "controls", "audit", "governance", "review"];

interface ToneCheckResult {
  ok: boolean;
  reason?: string;
}

export const validateTemplateSlots = (
  templateId: TemplateId,
  slotValues: Record<string, string>,
  options: TemplateValidationOptions = {}
): SlotValidationResult => {
  const template = getTemplate(templateId);
  const issues: SlotValidationIssue[] = [];
  const sanitizedValues: Record<string, string> = {};

  let fallbackApplied = false;

  const forbiddenMatchers = [...DEFAULT_FORBIDDEN_PATTERNS, ...(options.forbiddenPatterns ?? [])];

  for (const slot of template.slots) {
    const expectedTone = options.toneOverrides?.[slot.id] ?? slot.tone;
    const rawValue = slotValues?.[slot.id];
    let sanitized = rawValue?.trim() ?? "";

    const pushIssue = (reason: string, severity: ValidationSeverity = "error") => {
      issues.push({ slotId: slot.id, reason, severity });
    };

    const applyFallback = (reason: string, severity: ValidationSeverity = "error") => {
      pushIssue(reason, severity);
      sanitized = slot.fallback;
      fallbackApplied = true;
    };

    if (!sanitized) {
      if (slot.required && !options.allowPartial) {
        applyFallback("required_slot_missing");
      } else {
        sanitized = slot.fallback;
        if (slot.required) {
          // Track that we used a fallback during partial validation.
          pushIssue("required_slot_missing", "warning");
        }
        fallbackApplied = true;
      }
      sanitizedValues[slot.id] = sanitized;
      continue;
    }

    if (sanitized.length > slot.maxLength) {
      applyFallback(`exceeds_max_length_${slot.maxLength}`);
      sanitizedValues[slot.id] = sanitized;
      continue;
    }

    if (forbiddenMatchers.some(matcher => matcher.test(sanitized))) {
      applyFallback("contains_forbidden_content");
      sanitizedValues[slot.id] = sanitized;
      continue;
    }

    const toneCheck = evaluateTone(expectedTone, sanitized);
    if (!toneCheck.ok) {
      applyFallback(toneCheck.reason ?? "tone_mismatch");
      sanitizedValues[slot.id] = sanitized;
      continue;
    }

    sanitizedValues[slot.id] = sanitiseWhitespace(sanitized);
  }

  const isValid = issues.every(issue => issue.severity !== "error");
  return {
    templateId,
    isValid,
    sanitizedValues,
    issues,
    fallbackApplied,
  };
};

const sanitiseWhitespace = (value: string): string => value.replace(/\s+/g, " ").trim();

const evaluateTone = (tone: TemplateTone, value: string): ToneCheckResult => {
  const lower = value.toLowerCase();

  if (NEGATIVE_WORDS.some(word => lower.includes(word))) {
    if (tone === "friendly" || tone === "collaborative" || tone === "confident") {
      return { ok: false, reason: "tone_negative_language" };
    }
  }

  if (SLANG_WORDS.some(word => lower.includes(word))) {
    if (tone === "formal" || tone === "compliance") {
      return { ok: false, reason: "tone_informal_language" };
    }
  }

  if (tone === "compliance") {
    const includesKeyword = COMPLIANCE_KEYWORDS.some(keyword => lower.includes(keyword));
    if (!includesKeyword) {
      return { ok: false, reason: "tone_missing_compliance_keyword" };
    }
  }

  return { ok: true };
};
