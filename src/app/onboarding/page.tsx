import { OnboardingFlow } from '@/components/onboarding/OnboardingFlow';

export default function OnboardingPage() {
  return (
    <main className="mx-auto flex min-h-[80vh] w-full max-w-3xl flex-col gap-6 p-6 sm:p-10">
      <section className="space-y-2 text-center">
        <h1 className="text-3xl font-semibold sm:text-4xl">Adaptive Onboarding</h1>
        <p className="text-sm text-muted-foreground sm:text-base">
          Tell us a little about yourself and we&rsquo;ll tailor the perfect workspace setup.
        </p>
      </section>
      <OnboardingFlow />
    </main>
  );
}
