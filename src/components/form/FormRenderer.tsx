import type { FormPlan } from '@/lib/types/form';

/**
 * Placeholder renderer until UI wiring lands.
 */
export function FormRenderer(_props: { plan: FormPlan }) {
  return (
    <div className="rounded border border-dashed p-4 text-sm text-muted-foreground">
      Form renderer not yet implemented. See P1-014 and P1-015.
    </div>
  );
}
