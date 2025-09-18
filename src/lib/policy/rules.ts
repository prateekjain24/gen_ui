import type { FormPlan } from '@/lib/types/form';
import type { SessionState } from '@/lib/types/session';

/**
 * Deterministic rules engine stub (P1-009 responsibility).
 */
export function getNextStepPlan(_session: SessionState): FormPlan | null {
  // TODO: Implement baseline rules for onboarding flow.
  return null;
}
