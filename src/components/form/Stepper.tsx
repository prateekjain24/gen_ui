import type { StepperItem } from '@/lib/types/form';

/**
 * Placeholder progress stepper component.
 */
export function StepperPlaceholder(_props: { steps: StepperItem[] }) {
  return (
    <div className="flex items-center gap-2 text-xs text-muted-foreground">
      Stepper placeholder – implement active/completed visuals per P1-016.
    </div>
  );
}
