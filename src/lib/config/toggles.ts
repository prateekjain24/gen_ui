const FALSE_VALUES = new Set(["0", "false", "off", "no"]);
const TRUE_VALUES = new Set(["1", "true", "on", "yes"]);

const cache = new Map<string, boolean>();

function parseBoolean(rawValue: string | undefined, defaultValue: boolean): boolean {
  if (!rawValue) {
    return defaultValue;
  }

  const normalized = rawValue.trim().toLowerCase();

  if (FALSE_VALUES.has(normalized)) {
    return false;
  }

  if (TRUE_VALUES.has(normalized)) {
    return true;
  }

  return defaultValue;
}

function getToggle(name: string, defaultValue: boolean): boolean {
  if (cache.has(name)) {
    return cache.get(name) as boolean;
  }
  const value = parseBoolean(process.env[name], defaultValue);
  cache.set(name, value);
  return value;
}

export function isPromptIntelEnabled(): boolean {
  return getToggle("ENABLE_PROMPT_INTEL", true);
}

export function isPersonalizationEnabled(): boolean {
  return getToggle("ENABLE_PERSONALIZATION", true);
}

export function isLabelingReviewEnabled(): boolean {
  return getToggle("ENABLE_LABELING_REVIEW", false);
}

export function __resetTogglesForTesting(): void {
  cache.clear();
}
