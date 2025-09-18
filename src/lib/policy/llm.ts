import type { FormPlan } from '@/lib/types/form';
import type { SessionState } from '@/lib/types/session';

/**
 * Placeholder for LLM-assisted decision making (Phase 2).
 */
export async function generatePlanWithLLM(_session: SessionState): Promise<FormPlan | null> {
  // TODO: Wire into OpenAI via AI SDK when Phase 2 begins.
  return null;
}
