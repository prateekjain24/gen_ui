import { invokeWithTimeout } from "@/lib/llm/client";

const DEFAULT_TIMEOUT_MS = 15_000;

const parseTimeout = (value: string | undefined): number | null => {
  if (!value) {
    return null;
  }
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed < 0) {
    return null;
  }
  return parsed;
};

const resolveTimeout = (override?: number): number => {
  if (typeof override === "number" && Number.isFinite(override) && override >= 0) {
    return override;
  }

  const envTimeout = parseTimeout(process.env.PERSONALIZATION_TIMEOUT_MS);
  if (envTimeout !== null) {
    return envTimeout;
  }

  return DEFAULT_TIMEOUT_MS;
};

export interface WithTimeoutOptions {
  timeoutMs?: number;
}

export function getDefaultTimeoutMs(): number {
  return resolveTimeout();
}

export async function withTimeout<T>(
  operation: (signal: AbortSignal) => Promise<T>,
  options: WithTimeoutOptions = {}
): Promise<T> {
  const timeoutMs = resolveTimeout(options.timeoutMs);
  return invokeWithTimeout(timeoutMs, operation);
}
