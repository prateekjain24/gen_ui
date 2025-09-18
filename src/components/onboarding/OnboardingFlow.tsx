"use client";

import { Loader2 } from 'lucide-react';
import * as React from 'react';

import { FormRenderer } from '@/components/form/FormRenderer';
import { DebugPanel } from '@/components/onboarding/DebugPanel';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { fetchPlan, createSession, updateSession } from '@/lib/api/onboarding';
import { ENV } from '@/lib/constants';
import { createTelemetryQueue, type TelemetryQueue } from '@/lib/telemetry/events';
import type { ButtonAction, FormPlan, StepperItem } from '@/lib/types/form';
import { cn } from '@/lib/utils';

type FieldValues = Record<string, string | string[]>;

const FIELD_KEY_SEPARATOR = '::';

const createFieldKey = (stepId: string, fieldId: string) => `${stepId}${FIELD_KEY_SEPARATOR}${fieldId}`;

const isFilled = (value: unknown): boolean => {
  if (Array.isArray(value)) {
    return value.length > 0;
  }
  return value !== undefined && value !== null && value !== '';
};

const SESSION_STORAGE_KEY = 'gen_ui_session_id';
const LLM_STRATEGY_STORAGE_KEY = 'gen_ui_llm_strategy';
const DEFAULT_LLM_STRATEGY =
  process.env.NEXT_PUBLIC_LLM_STRATEGY === 'llm' ? 'llm' : 'rules';

function extractCompletedSteps(stepper: StepperItem[]): string[] {
  return stepper.filter(step => step.completed).map(step => step.id);
}

function getPreviousStepId(stepper: StepperItem[], currentStepId: string): string | undefined {
  const index = stepper.findIndex(step => step.id === currentStepId);
  if (index > 0) {
    return stepper[index - 1]?.id;
  }
  return undefined;
}

function getActiveStepId(plan: FormPlan): string | undefined {
  if (plan.kind === 'render_step') {
    return plan.step.stepId;
  }

  if ('stepper' in plan) {
    const active = plan.stepper.find(step => step.active);
    return active?.id;
  }

  return undefined;
}

export function OnboardingFlow() {
  const [sessionId, setSessionId] = React.useState<string | null>(null);
  const [plan, setPlan] = React.useState<FormPlan | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [planSource, setPlanSource] = React.useState<string>('rules');
  const [llmStrategy, setLlmStrategy] = React.useState<'llm' | 'rules'>(DEFAULT_LLM_STRATEGY);
  const [lastPlanFetchedAt, setLastPlanFetchedAt] = React.useState<number | null>(null);

  const requestCounter = React.useRef(0);
  const telemetryRef = React.useRef<TelemetryQueue | null>(null);
  const fieldValuesRef = React.useRef<FieldValues>({});
  const focusTimesRef = React.useRef<Map<string, number>>(new Map());
  const changeCountsRef = React.useRef<Map<string, number>>(new Map());
  const stepStartTimesRef = React.useRef<Map<string, number>>(new Map());

  const ensureSession = React.useCallback(async (): Promise<string> => {
    if (sessionId) {
      return sessionId;
    }

    let storedId: string | null = null;
    if (typeof window !== 'undefined') {
      storedId = window.sessionStorage.getItem(SESSION_STORAGE_KEY);
    }

    if (storedId) {
      setSessionId(storedId);
      return storedId;
    }

    const { sessionId: newSessionId } = await createSession();
    if (typeof window !== 'undefined') {
      window.sessionStorage.setItem(SESSION_STORAGE_KEY, newSessionId);
    }
    setSessionId(newSessionId);
    return newSessionId;
  }, [sessionId]);

  React.useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const stored = window.sessionStorage.getItem(LLM_STRATEGY_STORAGE_KEY) as 'llm' | 'rules' | null;
    if (stored) {
      setLlmStrategy(stored);
    }
  }, []);

  // Fetches the latest plan while ensuring only the newest request updates local state.
  const refreshPlan = React.useCallback(
    async (currentSessionId: string, overrideStrategy?: 'auto' | 'llm' | 'rules') => {
      const requestId = ++requestCounter.current;
      setIsLoading(true);
      setError(null);

      try {
        const strategy = overrideStrategy ?? (llmStrategy === 'llm' ? 'llm' : 'rules');
        const { plan: nextPlan, source } = await fetchPlan(currentSessionId, { strategy });
        if (requestCounter.current === requestId) {
          setPlan(nextPlan);
          setPlanSource(source);
          setLastPlanFetchedAt(Date.now());
          if (source === 'fallback') {
            setError('AI temporarily unavailable – continuing with rules-based plan.');
          } else {
            setError(null);
          }
        }
      } catch (err) {
        if (requestCounter.current === requestId) {
          const message = err instanceof Error ? err.message : 'Failed to fetch plan';
          setError(message);
        }
      } finally {
        if (requestCounter.current === requestId) {
          setIsLoading(false);
        }
      }
    },
    [llmStrategy]
  );

  const initialise = React.useCallback(async () => {
    try {
      const id = await ensureSession();
      await refreshPlan(id);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to initialise onboarding';
      setError(message);
      setIsLoading(false);
    }
  }, [ensureSession, refreshPlan]);

  React.useEffect(() => {
    initialise();
  }, [initialise]);

  const shouldShowDebugPanel = ENV.isDevelopment || ENV.isDebug;

  const handleStrategyChange = React.useCallback(
    (next: 'llm' | 'rules') => {
      setLlmStrategy(next);
      if (typeof window !== 'undefined') {
        window.sessionStorage.setItem(LLM_STRATEGY_STORAGE_KEY, next);
      }

      if (sessionId) {
        void refreshPlan(sessionId, next);
      }
    },
    [refreshPlan, sessionId]
  );

  React.useEffect(() => {
    if (!sessionId) {
      return;
    }

    const queue = createTelemetryQueue(sessionId);
    telemetryRef.current = queue;

    return () => {
      telemetryRef.current = null;
      void queue.dispose();
    };
  }, [sessionId]);

  React.useEffect(() => {
    focusTimesRef.current.clear();

    if (!plan) {
      fieldValuesRef.current = {};
      return;
    }

    if (plan.kind === 'render_step') {
      const initial: FieldValues = {};
      plan.step.fields.forEach(field => {
        const { id } = field;
        if (field.kind === 'checkbox') {
          initial[id] = Array.isArray(field.values) ? [...(field.values ?? [])] : [];
          return;
        }

        if (field.kind === 'select' || field.kind === 'radio' || field.kind === 'text') {
          initial[id] = typeof field.value === 'string' ? field.value : '';
          return;
        }

        initial[id] = '';
      });
      fieldValuesRef.current = initial;
      changeCountsRef.current.clear();
      stepStartTimesRef.current.set(plan.step.stepId, Date.now());
    } else if (plan.kind === 'review') {
      const activeStepId = getActiveStepId(plan);
      if (activeStepId) {
        stepStartTimesRef.current.set(activeStepId, Date.now());
      }
    }
  }, [plan]);

  const handleFieldFocus = React.useCallback((fieldId: string, stepId: string) => {
    const queue = telemetryRef.current;
    if (!queue) {
      return;
    }

    const key = createFieldKey(stepId, fieldId);
    focusTimesRef.current.set(key, Date.now());

    queue.enqueue({
      type: 'field_focus',
      fieldId,
      stepId,
    });
  }, []);

  const handleFieldBlur = React.useCallback(
    (fieldId: string, stepId: string) => {
      const queue = telemetryRef.current;
      if (!queue) {
        return;
      }

      const key = createFieldKey(stepId, fieldId);
      const focusedAt = focusTimesRef.current.get(key);
      if (focusedAt) {
        focusTimesRef.current.delete(key);
      }

      const value = fieldValuesRef.current[fieldId];
      const hadValue = isFilled(value);
      const timeSpentMs = focusedAt ? Date.now() - focusedAt : undefined;

      queue.enqueue({
        type: 'field_blur',
        fieldId,
        stepId,
        hadValue,
        timeSpentMs,
      });
    },
    []
  );

  const handleFieldChange = React.useCallback(
    (fieldId: string, value: string | string[] | undefined, stepId: string) => {
      const queue = telemetryRef.current;
      const previousRaw = fieldValuesRef.current[fieldId];
      const previousValue = Array.isArray(previousRaw) ? [...previousRaw] : previousRaw;
      const nextValue = Array.isArray(value)
        ? [...value]
        : typeof value === 'string'
          ? value
          : '';

      const nextValues = { ...fieldValuesRef.current, [fieldId]: nextValue };
      fieldValuesRef.current = nextValues;

      const key = createFieldKey(stepId, fieldId);
      const changeCount = (changeCountsRef.current.get(key) ?? 0) + 1;
      changeCountsRef.current.set(key, changeCount);

      if (!queue) {
        return;
      }

      queue.enqueue({
        type: 'field_change',
        fieldId,
        stepId,
        previousValue,
        newValue: nextValue,
        changeCount,
      });
    },
    []
  );

  // Orchestrates button intents, persisting session state while emitting telemetry for analytics.
  const handleAction = React.useCallback(
    async (action: ButtonAction['action'], values: Record<string, unknown>) => {
      if (!sessionId || !plan) {
        return;
      }

      const activeStepId = getActiveStepId(plan);

      const persist = async (payload: Omit<Parameters<typeof updateSession>[0], 'sessionId'>) => {
        setIsSubmitting(true);
        setError(null);
        try {
          await updateSession({ sessionId, ...payload });
          await refreshPlan(sessionId);
        } catch (err) {
          const message = err instanceof Error ? err.message : 'Failed to update session';
          setError(message);
        } finally {
          setIsSubmitting(false);
        }
      };

      if (action === 'submit_step' && plan.kind === 'render_step' && activeStepId) {
        const queue = telemetryRef.current;
        if (queue) {
          const stepFields = plan.step.fields;
          const filledFieldCount = stepFields.filter(field => isFilled(values[field.id])).length;
          const startedAt = stepStartTimesRef.current.get(activeStepId);
          const timeSpentMs = startedAt ? Date.now() - startedAt : 0;

          queue.enqueue({
            type: 'step_submit',
            stepId: activeStepId,
            isValid: true,
            fieldCount: stepFields.length,
            filledFieldCount,
            timeSpentMs,
          });
        }

        const sanitizedValues: FieldValues = {};
        Object.entries(values).forEach(([key, value]) => {
          sanitizedValues[key] = Array.isArray(value)
            ? [...value]
            : typeof value === 'string'
              ? value
              : '';
        });
        const mergedValues = { ...fieldValuesRef.current, ...sanitizedValues };
        fieldValuesRef.current = mergedValues;

        await persist({
          values,
          currentStep: activeStepId,
          addCompletedStep: activeStepId,
        });
        return;
      }

      if (action === 'skip' && plan.kind === 'render_step' && activeStepId) {
        const queue = telemetryRef.current;
        if (queue) {
          queue.enqueue({
            type: 'step_skip',
            stepId: activeStepId,
            reason: 'user_action',
          });
        }

        await persist({
          currentStep: activeStepId,
          addCompletedStep: activeStepId,
        });
        return;
      }

      if (action === 'back' && plan.kind === 'render_step' && 'stepper' in plan && activeStepId) {
        const completedSteps = extractCompletedSteps(plan.stepper);
        const trimmed = completedSteps.length > 0 ? completedSteps.slice(0, -1) : [];
        const previousStepId = getPreviousStepId(plan.stepper, activeStepId) ?? activeStepId;

        const queue = telemetryRef.current;
        if (queue) {
          queue.enqueue({
            type: 'step_back',
            fromStepId: activeStepId,
            toStepId: previousStepId,
          });
        }

        await persist({
          currentStep: previousStepId,
          completedSteps: trimmed,
        });
        return;
      }

      if (action === 'complete' && plan.kind === 'review') {
        const stepper = plan.stepper;
        const reviewStep = stepper.find(step => step.id === activeStepId);
        const fallbackStep = stepper.length > 0 ? stepper[stepper.length - 1] : undefined;
        const stepId = reviewStep?.id ?? activeStepId ?? fallbackStep?.id;

        const queue = telemetryRef.current;
        if (queue && stepId) {
          const startedAt = stepStartTimesRef.current.get(stepId);
          const timeSpentMs = startedAt ? Date.now() - startedAt : 0;
          queue.enqueue({
            type: 'step_submit',
            stepId,
            isValid: true,
            fieldCount: plan.summary.length,
            filledFieldCount: plan.summary.length,
            timeSpentMs,
          });
        }

        await persist({
          currentStep: stepId,
          addCompletedStep: stepId,
        });
        return;
      }

      if (action === 'back' && plan.kind === 'review') {
        const stepper = plan.stepper;
        const completedSteps = extractCompletedSteps(stepper);
        const trimmed = completedSteps.length > 0 ? completedSteps.slice(0, -1) : [];
        const fallbackStepId = stepper.length > 0 ? stepper[0].id : 'basics';
        const previousStepId = getPreviousStepId(stepper, activeStepId ?? fallbackStepId) ?? fallbackStepId;

        const queue = telemetryRef.current;
        if (queue) {
          queue.enqueue({
            type: 'step_back',
            fromStepId: activeStepId ?? fallbackStepId,
            toStepId: previousStepId,
          });
        }

        await persist({
          currentStep: previousStepId,
          completedSteps: trimmed,
        });
        return;
      }

      // For success or unhandled actions, attempt to refresh to stay in sync
      await refreshPlan(sessionId);
    },
    [plan, sessionId, refreshPlan]
  );

  const handleRetry = React.useCallback(() => {
    if (sessionId) {
      refreshPlan(sessionId);
    } else {
      initialise();
    }
  }, [initialise, refreshPlan, sessionId]);

  if (isLoading && !plan) {
    return (
      <div className="flex min-h-[240px] items-center justify-center rounded-xl border bg-muted/30">
        <div className="flex flex-col items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-6 w-6 animate-spin" />
          <span>Preparing your onboarding experience…</span>
        </div>
      </div>
    );
  }

  if (error && !plan) {
    return (
      <Card className="mx-auto w-full max-w-xl border-destructive/40 bg-destructive/5">
        <CardHeader>
          <CardTitle className="text-destructive">Something went wrong</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4 text-sm text-destructive">
          <p>{error}</p>
          <div>
            <Button onClick={handleRetry}>Try again</Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!plan) {
    return null;
  }

  return (
    <div className={cn('space-y-4', isLoading && 'opacity-75 transition-opacity')}>
      <FormRenderer
        plan={plan}
        onAction={handleAction}
        onFieldChange={handleFieldChange}
        onFieldFocus={handleFieldFocus}
        onFieldBlur={handleFieldBlur}
        isSubmitting={isSubmitting}
        error={error}
        className={isLoading ? 'pointer-events-none' : undefined}
      />
      {error && plan ? (
        <div className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </div>
      ) : null}
      {shouldShowDebugPanel ? (
        <DebugPanel
          plan={plan}
          planSource={planSource}
          sessionId={sessionId}
          isLoading={isLoading}
          isSubmitting={isSubmitting}
          error={error}
          lastFetchedAt={lastPlanFetchedAt}
          llmStrategy={llmStrategy}
          onStrategyChange={handleStrategyChange}
        />
      ) : null}
    </div>
  );
}
