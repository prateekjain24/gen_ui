import { createHash } from "node:crypto";

import type { CanvasPersona } from "@/lib/canvas/recipes";
import type { TemplateId } from "@/lib/canvas/templates";
import type { RecipeKnobOverrides } from "@/lib/personalization/scoring";
import type {
  IndustryTag,
  PromptSignalValue,
  PromptSignals,
} from "@/lib/prompt-intel/types";

const DEFAULT_TTL_MS = 15 * 60 * 1000;

export type TemplateCacheStatus = "hit" | "miss" | "skip";

export interface TemplateCacheKeyInput {
  templateId: TemplateId;
  persona: CanvasPersona;
  industry: IndustryTag;
  knobOverrides: RecipeKnobOverrides;
  signals: PromptSignals;
}

interface CacheEntry {
  values: Record<string, string>;
  insertedAt: number;
  expiresAt: number;
}

interface TemplateCacheOptions {
  ttlMs?: number;
  now?: () => number;
}

interface CacheSetOptions {
  ttlMs?: number;
}

const stableStringify = (value: unknown): string => JSON.stringify(sortValue(value));

const sortValue = (value: unknown): unknown => {
  if (Array.isArray(value)) {
    return value.map(item => sortValue(item));
  }
  if (value && typeof value === "object") {
    return Object.keys(value as Record<string, unknown>)
      .sort()
      .reduce<Record<string, unknown>>((accumulator, key) => {
        accumulator[key] = sortValue((value as Record<string, unknown>)[key]);
        return accumulator;
      }, {});
  }
  return value;
};

const normalizeSignalValue = (signal: PromptSignalValue<unknown>) => {
  const { value } = signal;
  if (Array.isArray(value)) {
    if (value.length > 0 && typeof value[0] === "object" && value[0] !== null) {
      return (value as Record<string, unknown>[])
        .map(item => sortValue(item))
        .sort((a, b) => stableStringify(a).localeCompare(stableStringify(b)));
    }
    return [...(value as unknown[])].sort((a, b) => {
      const left = typeof a === "string" ? a : JSON.stringify(a);
      const right = typeof b === "string" ? b : JSON.stringify(b);
      return left.localeCompare(right);
    });
  }
  if (value && typeof value === "object") {
    return sortValue(value);
  }
  return value ?? null;
};

const computeKnobSignature = (overrides: RecipeKnobOverrides): string => {
  const entries = (Object.keys(overrides) as Array<keyof RecipeKnobOverrides>)
    .sort()
    .map(knobId => {
      const override = overrides[knobId];
      if (!override) {
        return `${String(knobId)}:__missing`;
      }
      const serializedValue =
        typeof override.value === "object"
          ? stableStringify(sortValue(override.value))
          : String(override.value ?? "");
      return `${String(knobId)}:${serializedValue}:${override.changedFromDefault ? "1" : "0"}`;
    });

  return createHash("sha1").update(entries.join("|"), "utf8").digest("hex");
};

const computeSignalsChecksum = (signals: PromptSignals): string => {
  const canonical = Object.keys(signals)
    .sort()
    .reduce<Record<string, unknown>>((accumulator, key) => {
      const signal = signals[key as keyof PromptSignals] as PromptSignalValue<unknown>;
      accumulator[key] = {
        value: normalizeSignalValue(signal),
        confidence: signal.metadata.confidence ?? null,
      };
      return accumulator;
    }, {});

  return createHash("sha1").update(stableStringify(canonical), "utf8").digest("hex");
};

export class TemplateCompletionCache {
  private readonly store = new Map<string, CacheEntry>();
  private readonly now: () => number;
  private ttlMs: number;

  constructor(options?: TemplateCacheOptions) {
    this.ttlMs = options?.ttlMs ?? DEFAULT_TTL_MS;
    this.now = options?.now ?? (() => Date.now());
  }

  public setTtl(ttlMs: number): void {
    this.ttlMs = ttlMs;
  }

  public get size(): number {
    return this.store.size;
  }

  public get(keyInput: TemplateCacheKeyInput): Record<string, string> | null {
    const key = this.buildCacheKey(keyInput);
    const entry = this.store.get(key);
    if (!entry) {
      return null;
    }

    if (entry.expiresAt <= this.now()) {
      this.store.delete(key);
      return null;
    }

    return entry.values;
  }

  public set(
    keyInput: TemplateCacheKeyInput,
    values: Record<string, string>,
    options?: CacheSetOptions
  ): void {
    const key = this.buildCacheKey(keyInput);
    const ttl = options?.ttlMs ?? this.ttlMs;
    const timestamp = this.now();
    this.store.set(key, {
      values,
      insertedAt: timestamp,
      expiresAt: timestamp + ttl,
    });
  }

  public invalidate(keyInput: TemplateCacheKeyInput): void {
    const key = this.buildCacheKey(keyInput);
    this.store.delete(key);
  }

  public clear(): void {
    this.store.clear();
  }

  public pruneExpired(): void {
    const now = this.now();
    for (const [key, entry] of this.store.entries()) {
      if (entry.expiresAt <= now) {
        this.store.delete(key);
      }
    }
  }

  private buildCacheKey(input: TemplateCacheKeyInput): string {
    const signature = computeKnobSignature(input.knobOverrides);
    const signalsChecksum = computeSignalsChecksum(input.signals);
    return [input.templateId, input.persona, input.industry, signature, signalsChecksum].join("::");
  }
}

export const templateCompletionCache = new TemplateCompletionCache();

export { DEFAULT_TTL_MS };
