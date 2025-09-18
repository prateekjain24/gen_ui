'use client';

import * as React from 'react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import type { FormPlan, StepperItem } from '@/lib/types/form';

interface DebugPanelProps {
  readonly plan: FormPlan | null;
  readonly planSource: string;
  readonly sessionId: string | null;
  readonly isLoading: boolean;
  readonly isSubmitting: boolean;
  readonly error: string | null;
  readonly lastFetchedAt: number | null;
  readonly llmStrategy: 'llm' | 'rules';
  readonly onStrategyChange?: (strategy: 'llm' | 'rules') => void;
}

function formatTimestamp(timestamp: number | null): string {
  if (!timestamp) {
    return '—';
  }

  return new Intl.DateTimeFormat(undefined, {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).format(new Date(timestamp));
}

function getActiveStep(stepper: StepperItem[] | undefined): StepperItem | undefined {
  return stepper?.find(step => step.active);
}

function getCompletedSteps(stepper: StepperItem[] | undefined): string {
  if (!stepper || stepper.length === 0) {
    return '—';
  }

  const completed = stepper.filter(step => step.completed);
  if (completed.length === 0) {
    return 'None';
  }

  return completed.map(step => step.label ?? step.id).join(', ');
}

function getPlanSummary(plan: FormPlan | null): { label: string; value: string }[] {
  if (!plan) {
    return [
      {
        label: 'Plan',
        value: 'Unavailable',
      },
    ];
  }

  if (plan.kind === 'render_step') {
    const activeStep = getActiveStep(plan.stepper);
    return [
      { label: 'Plan', value: 'render_step' },
      {
        label: 'Active step',
        value: activeStep ? `${activeStep.label} (${activeStep.id})` : plan.step.stepId,
      },
      { label: 'Fields', value: String(plan.step.fields.length) },
      { label: 'Completed', value: getCompletedSteps(plan.stepper) },
    ];
  }

  if (plan.kind === 'review') {
    const activeStep = getActiveStep(plan.stepper);
    return [
      { label: 'Plan', value: 'review' },
      {
        label: 'Active step',
        value: activeStep ? `${activeStep.label} (${activeStep.id})` : 'Review',
      },
      { label: 'Summary rows', value: String(plan.summary.length) },
      { label: 'Completed', value: getCompletedSteps(plan.stepper) },
    ];
  }

  if (plan.kind === 'success' || plan.kind === 'error') {
    return [
      { label: 'Plan', value: plan.kind },
      { label: 'Message', value: plan.message },
    ];
  }

  return [];
}

function DebugRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-1 rounded-md border border-border/60 bg-background/70 p-3">
      <span className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</span>
      <span className="break-all text-sm font-medium text-foreground">{value}</span>
    </div>
  );
}

export function DebugPanel({
  plan,
  planSource,
  sessionId,
  isLoading,
  isSubmitting,
  error,
  lastFetchedAt,
  llmStrategy,
  onStrategyChange,
}: DebugPanelProps) {
  const planSummary = React.useMemo(() => getPlanSummary(plan), [plan]);
  const prettyPlan = React.useMemo(() => (plan ? JSON.stringify(plan, null, 2) : 'No plan loaded yet.'), [plan]);

  const handleToggle = React.useCallback(() => {
    if (!onStrategyChange) {
      return;
    }
    onStrategyChange(llmStrategy === 'llm' ? 'rules' : 'llm');
  }, [llmStrategy, onStrategyChange]);

  return (
    <Card className="border-dashed border-primary/40 bg-muted/40">
      <CardHeader className="pb-4">
        <CardTitle className="text-base font-semibold">Debug Panel</CardTitle>
        <CardDescription className="text-xs">
          Visible in development builds. Inspect the latest rules-backed plan and session wiring.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4 text-sm">
        <div className="grid gap-3 sm:grid-cols-2">
          <DebugRow label="Session" value={sessionId ?? 'Not initialized'} />
          <DebugRow label="Plan source" value={planSource || 'unknown'} />
          <DebugRow label="Last fetch" value={formatTimestamp(lastFetchedAt)} />
          <DebugRow label="Status" value={isLoading ? 'Fetching plan…' : isSubmitting ? 'Submitting data…' : 'Idle'} />
          <DebugRow label="Error" value={error ?? 'None'} />
        </div>
        <div className="flex flex-col gap-2 rounded-md border border-border/60 bg-background/70 p-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-sm">
            <span className="text-[11px] uppercase tracking-wide text-muted-foreground">LLM Strategy</span>
            <div className="font-medium text-foreground">
              {llmStrategy === 'llm' ? 'LLM (with fallback)' : 'Rules only'}
            </div>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleToggle}
            disabled={!onStrategyChange}
          >
            Switch to {llmStrategy === 'llm' ? 'rules' : 'LLM'}
          </Button>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          {planSummary.map(item => (
            <DebugRow key={item.label} label={item.label} value={item.value} />
          ))}
        </div>
        <details className="rounded-md border border-border/60 bg-background/80">
          <summary className="cursor-pointer select-none px-3 py-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Plan payload
          </summary>
          <pre className="max-h-64 overflow-auto px-3 py-3 text-xs leading-relaxed text-muted-foreground">{prettyPlan}</pre>
        </details>
      </CardContent>
    </Card>
  );
}
