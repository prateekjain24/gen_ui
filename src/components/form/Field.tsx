import type { Field } from '@/lib/types/form';

/**
 * Placeholder field component to keep project structure aligned with IMP.md.
 */
export function FieldPlaceholder(_props: { field: Field }) {
  return (
    <div className="rounded border border-dashed bg-muted/20 px-3 py-2 text-xs text-muted-foreground">
      Field placeholder – replace with shadcn/ui components in P1-014.
    </div>
  );
}
