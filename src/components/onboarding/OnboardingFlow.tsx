import { FormRenderer } from '@/components/form/FormRenderer';
import type { FormPlan } from '@/lib/types/form';

/**
 * Placeholder orchestrator until API + rules engine are wired.
 */
export function OnboardingFlow({ plan }: { plan: FormPlan }) {
  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Onboarding flow orchestrator pending implementation (see P1-017).
      </p>
      <FormRenderer plan={plan} />
    </div>
  );
}
