import type { FormPlan } from '@/lib/types/form';
import type { SessionState } from '@/lib/types/session';

type PlanStrategy = 'auto' | 'llm' | 'rules';

export interface LLMPlanMetadata {
  reasoning: string;
  confidence: number;
  persona?: string;
  decision?: string;
}

interface PlanResponse {
  plan: FormPlan;
  source: string;
  metadata?: LLMPlanMetadata | null;
}

interface CreateSessionResponse {
  sessionId: string;
  session: SessionState;
}

export interface UpdateSessionPayload {
  sessionId: string;
  values?: Record<string, unknown>;
  currentStep?: string;
  addCompletedStep?: string;
  completedSteps?: string[];
}

interface UpdateSessionResponse {
  session: SessionState;
}

async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    let message = response.statusText || 'Unexpected response from server';

    try {
      const data = await response.clone().json();
      if (typeof data?.error === 'string') {
        message = data.error;
      }
    } catch {
      try {
        const text = await response.text();
        message = text || message;
      } catch {
        // Ignore parsing failure and fallback to default message
      }
    }

    throw new Error(message);
  }

  return response.json() as Promise<T>;
}

export async function createSession(): Promise<CreateSessionResponse> {
  const response = await fetch('/api/sessions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({}),
  });

  return handleResponse<CreateSessionResponse>(response);
}

export async function fetchPlan(
  sessionId: string,
  options: { strategy?: PlanStrategy } = {}
): Promise<PlanResponse> {
  const response = await fetch('/api/plan', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ sessionId, strategy: options.strategy }),
  });

  return handleResponse<PlanResponse>(response);
}

export async function updateSession(payload: UpdateSessionPayload): Promise<UpdateSessionResponse> {
  const response = await fetch('/api/sessions', {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  return handleResponse<UpdateSessionResponse>(response);
}
