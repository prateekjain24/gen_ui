import Link from 'next/link';

/**
 * Temporary onboarding shell until P1-014 through P1-018 are complete.
 */
export default function OnboardingPage() {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-6 p-8">
      <section className="space-y-2">
        <h1 className="text-3xl font-semibold">Onboarding Flow Coming Soon</h1>
        <p className="text-muted-foreground">
          The adaptive onboarding experience is being built. Follow the implementation
          plan in <code>PHASE1.md</code> to wire up the renderer, stepper, and flow orchestrator.
        </p>
      </section>
      <section className="rounded-lg border border-dashed p-6">
        <p className="mb-2 text-sm font-medium uppercase tracking-wide text-muted-foreground">
          Developer Checklist
        </p>
        <ol className="list-inside list-decimal space-y-2 text-sm">
          <li>Create the form renderer components under <code>src/components/form</code>.</li>
          <li>Implement the deterministic rules engine in <code>src/lib/policy/rules.ts</code>.</li>
          <li>Wire the orchestration to <code>/api/plan</code> and persist sessions via the store.</li>
        </ol>
      </section>
      <Link className="text-sm text-primary underline" href="/">
        Back to home
      </Link>
    </main>
  );
}
