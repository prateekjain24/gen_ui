"use client";

import { Loader2, Settings2 } from "lucide-react";
import * as React from "react";

import { CustomizeDrawer } from "@/app/canvas/components/customize-drawer";
import { PersonaBadge, PromptSignalsDebugPanel, ReasoningChip } from "@/components/canvas";
import { FormRenderer } from "@/components/form/FormRenderer";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useStaggeredMount } from "@/hooks/useStaggeredMount";
import { canvasCopy } from "@/lib/canvas/copy";
import type { CanvasRecipe, CanvasRecipeId } from "@/lib/canvas/recipes";
import { getRecipe } from "@/lib/canvas/recipes";
import type { SlotValidationIssue } from "@/lib/canvas/template-validator";
import { ENV } from "@/lib/constants";
import type { RecipePersonalizationResult } from "@/lib/personalization/scoring";
import type { PromptSignals } from "@/lib/prompt-intel/types";
import { createTelemetryQueue, type TelemetryQueue } from "@/lib/telemetry/events";
import type { Field, FormPlan, StepperItem } from "@/lib/types/form";
import { cn } from "@/lib/utils";

type CanvasDecisionSource = "llm" | "heuristics";

interface CanvasPlanResponse {
  recipeId: CanvasRecipeId;
  persona: "explorer" | "team" | "power";
  intentTags: string[];
  confidence: number;
  reasoning: string;
  decisionSource: CanvasDecisionSource;
  promptSignals: PromptSignals;
  personalization: RecipePersonalizationResult;
  templateCopy: TemplateCopyPayload;
}

interface TemplateCopyPayload {
  stepTitle: string;
  helperText: string;
  primaryCta: string;
  callout: {
    heading?: string;
    body: string;
  };
  badgeCaption: string;
  issues: SlotValidationIssue[];
}

interface CanvasPlanState extends CanvasPlanResponse {
  fields: Field[];
  formPlan: FormPlan;
}

const personaCopy: Record<CanvasPlanResponse["persona"], { title: string; description: string; stepLabel: string }> = {
  explorer: {
    title: "Explorer quick start",
    description: "Keep it lightweight so you can dive in immediately.",
    stepLabel: "Quick start",
  },
  team: {
    title: "Team workspace essentials",
    description: "Bring collaborators, integrations, and structure together.",
    stepLabel: "Team setup",
  },
  power: {
    title: "Governance-first configuration",
    description: "Enable approvals, auditing, and secure defaults from the start.",
    stepLabel: "Controls",
  },
};

const describeField = (field: Field): string => {
  switch (field.kind) {
    case "text":
      return "Text input";
    case "select":
      return "Select field";
    case "checkbox":
      return "Checklist";
    case "callout":
      return field.body;
    case "checklist":
      return `${field.items.length} checklist items`;
    case "info_badge":
      return "Persona badge";
    case "ai_hint":
      return field.body;
    case "integration_picker":
      return "Integration picker";
    case "teammate_invite":
      return "Invite teammates";
    case "admin_toggle":
      return "Admin toggle";
    default:
      return field.label;
  }
};

const buildFormPlan = (recipe: CanvasRecipe, response: CanvasPlanResponse): FormPlan => {
  const personaMeta = personaCopy[response.persona] ?? personaCopy.explorer;
  const stepId = `canvas-${response.recipeId.toLowerCase()}`;
  const stepper: StepperItem[] = [
    {
      id: stepId,
      label: personaMeta.stepLabel,
      active: true,
      completed: false,
    },
  ];

  const fields = recipe.fields.map(field => {
    if (field.kind === "callout") {
      return {
        ...field,
        label: response.templateCopy.callout.heading ?? field.label,
        body: response.templateCopy.callout.body ?? field.body,
      };
    }

    if (field.kind === "info_badge") {
      return {
        ...field,
        label: response.templateCopy.badgeCaption || field.label,
      };
    }

    return field;
  });

  return {
    kind: "render_step",
    step: {
      stepId,
      title: response.templateCopy.stepTitle || personaMeta.title,
      description: response.templateCopy.helperText || personaMeta.description,
      fields,
      primaryCta: { label: response.templateCopy.primaryCta || "Continue", action: "submit_step" },
      secondaryCta: response.persona === "explorer" ? { label: "Skip for now", action: "skip" } : undefined,
    },
    stepper,
  };
};

export function CanvasChat(): React.ReactElement {
  const [prompt, setPrompt] = React.useState("");
  const [submittedPrompt, setSubmittedPrompt] = React.useState<string | null>(null);
  const [plan, setPlan] = React.useState<CanvasPlanState | null>(null);
  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [animationKey, setAnimationKey] = React.useState(0);
  const [isCustomizeOpen, setCustomizeOpen] = React.useState(false);
  const telemetryQueueRef = React.useRef<TelemetryQueue | null>(null);
  const inputRef = React.useRef<HTMLInputElement>(null);

  const [telemetrySessionId, setTelemetrySessionId] = React.useState<string | null>(() => {
    if (typeof window === "undefined") {
      return null;
    }
    const storageKey = "canvasTelemetrySessionId";
    return window.sessionStorage.getItem(storageKey);
  });

  React.useEffect(() => {
    if (!ENV.enableCanvasTelemetry || typeof window === "undefined" || !telemetrySessionId) {
      telemetryQueueRef.current = null;
      return;
    }

    const queue = createTelemetryQueue(telemetrySessionId);
    telemetryQueueRef.current = queue;

    return () => {
      telemetryQueueRef.current = null;
      void queue.dispose();
    };
  }, [telemetrySessionId]);

  React.useEffect(() => {
    if (!ENV.enableCanvasTelemetry || typeof window === "undefined") {
      return;
    }

    const storageKey = "canvasTelemetrySessionId";
    if (telemetrySessionId) {
      window.sessionStorage.setItem(storageKey, telemetrySessionId);
      return;
    }

    let isMounted = true;
    const controller = new AbortController();

    const bootstrapSession = async () => {
      try {
        const response = await fetch("/api/sessions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ metadata: { source: "canvas-chat" } }),
          signal: controller.signal,
        });

        if (!response.ok) {
          throw new Error("Failed to create telemetry session");
        }

        const data = (await response.json()) as { sessionId?: string };
        if (data.sessionId && isMounted) {
          window.sessionStorage.setItem(storageKey, data.sessionId);
          setTelemetrySessionId(data.sessionId);
        }
      } catch (sessionError) {
        console.error("Canvas telemetry session bootstrap failed", sessionError);
      }
    };

    void bootstrapSession();

    return () => {
      isMounted = false;
      controller.abort();
    };
  }, [telemetrySessionId]);

  const submitMessage = React.useCallback(
    async (value: string) => {
      const trimmed = value.trim();
      if (!trimmed) {
        return;
      }

      setIsLoading(true);
      setError(null);
      setSubmittedPrompt(trimmed);

      try {
        const response = await fetch("/api/canvas/plan", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            message: trimmed,
            sessionId:
              ENV.enableCanvasTelemetry && telemetrySessionId ? telemetrySessionId : undefined,
          }),
        });

        if (!response.ok) {
          const errorBody = (await response.json().catch(() => null)) as { error?: string } | null;
          throw new Error(errorBody?.error ?? "Failed to generate plan. Try again.");
        }

        const data = (await response.json()) as CanvasPlanResponse;
        const recipe = getRecipe(data.recipeId);
        const nextPlan: CanvasPlanState = {
          ...data,
          fields: recipe.fields,
          formPlan: buildFormPlan(recipe, data),
        };
        setPlan(nextPlan);
        setAnimationKey(value => value + 1);
      } catch (planError) {
        console.error("Canvas plan fetch failed", planError);
        setPlan(null);
        const message = planError instanceof Error ? planError.message : "Unexpected error. Try again.";
        setError(message);
        requestAnimationFrame(() => {
          inputRef.current?.focus();
        });
      } finally {
        setIsLoading(false);
      }
    },
    [telemetrySessionId]
  );

  const handleSubmit = React.useCallback(
    (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      submitMessage(prompt);
    },
    [prompt, submitMessage]
  );

  const handleExampleClick = React.useCallback(
    (value: string) => {
      setPrompt(value);
      submitMessage(value);
      requestAnimationFrame(() => {
        inputRef.current?.focus();
      });
    },
    [submitMessage]
  );

  const previewItems = React.useMemo(() => {
    if (!plan) {
      return [] as Array<{ id: string; label: string; description: string }>;
    }

    return plan.fields.map(field => ({
      id: field.id,
      label: field.label,
      description: describeField(field),
    }));
  }, [plan]);

  React.useEffect(() => {
    setCustomizeOpen(false);
  }, [plan?.recipeId]);

  const { getAnimationStyle, motionEnabled } = useStaggeredMount(previewItems.length, {
    intervalMs: 65,
    key: [plan?.recipeId ?? "", animationKey],
    disabled: previewItems.length === 0,
  });

  const enableExperimentalComponents = ENV.enableExperimentalComponents;

  React.useEffect(() => {
    if (!plan || !ENV.enableCanvasTelemetry) {
      return;
    }

    telemetryQueueRef.current?.enqueue({
      type: "canvas_plan_rendered",
      recipeId: plan.recipeId,
      persona: plan.persona,
      componentCount: plan.fields.length,
      decisionSource: plan.decisionSource,
      intentTags: plan.intentTags,
      confidence: plan.confidence,
    });
  }, [plan]);

  return (
    <main className="flex min-h-screen flex-col bg-background">
      <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-8 px-4 py-16 md:px-8">
        <header className="flex flex-col gap-3 text-center md:text-left">
          <p className="text-sm font-medium uppercase tracking-wide text-primary">Canvas Chat</p>
          <h1 className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
            What do you want to get done today?
          </h1>
          <p className="text-muted-foreground">
            Describe the onboarding or workspace experience you need and we&apos;ll turn it into a tailored flow.
          </p>
        </header>

        <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Input
              ref={inputRef}
              aria-label="Describe what you want to build"
              placeholder={canvasCopy.placeholder}
              value={prompt}
              onChange={event => setPrompt(event.target.value)}
              className="flex-1"
            />
            <Button type="submit" className="w-full sm:w-auto" disabled={isLoading}>
              {isLoading ? (
                <span className="inline-flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                  Generating…
                </span>
              ) : (
                "Generate"
              )}
            </Button>
          </div>

          <p className="text-xs text-muted-foreground">
            {canvasCopy.helperText}
          </p>

          <div className="flex flex-wrap items-center gap-2">
            {canvasCopy.chips.map(chip => (
              <Button
                key={chip.prompt}
                type="button"
                variant="ghost"
                size="sm"
                className="border border-dashed border-input"
                onClick={() => handleExampleClick(chip.prompt)}
                disabled={isLoading}
              >
                {chip.label}
              </Button>
            ))}
          </div>
        </form>

        <section className="flex flex-1 flex-col gap-4">
          {error ? (
            <div className="rounded-md border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">
              <div className="flex items-start justify-between gap-3">
                <p>{error}</p>
                <Button variant="ghost" size="sm" onClick={() => submitMessage(prompt)} disabled={isLoading}>
                  Retry
                </Button>
              </div>
            </div>
          ) : null}

          {isLoading && !plan ? (
            <Card className="border border-dashed border-muted-foreground/40 bg-muted/20 p-6">
              <div className="flex animate-pulse flex-col gap-4">
                <div className="h-4 w-1/3 rounded bg-muted" />
                <div className="grid gap-3 md:grid-cols-2">
                  <div className="h-20 rounded bg-muted" />
                  <div className="h-20 rounded bg-muted" />
                  <div className="h-20 rounded bg-muted" />
                  <div className="h-20 rounded bg-muted" />
                </div>
              </div>
            </Card>
          ) : null}

          {!plan && !isLoading ? (
            <Card className="flex flex-1 flex-col justify-center gap-3 border border-dashed border-muted-foreground/40 bg-muted/20 p-8 text-center">
              <h2 className="text-xl font-semibold text-foreground">Your tailored workspace will appear here</h2>
              <p className="text-sm text-muted-foreground">
                Start by sharing what you are working on. Canvas Chat will assemble the screens and steps for you.
              </p>
            </Card>
          ) : null}

          {plan ? (
            <div className="flex flex-col gap-6">
              <div className="flex flex-col gap-3 text-left">
                <div className="flex flex-wrap items-center gap-3">
                  <PersonaBadge persona={plan.persona} confidence={plan.confidence} />
                  <ReasoningChip reasoning={plan.reasoning} tags={plan.intentTags} />
                </div>
                <div className="flex flex-col gap-1 text-sm text-muted-foreground">
                  {submittedPrompt ? (
                    <span>
                      Plan generated for <span className="font-medium text-foreground">“{submittedPrompt}”</span>
                    </span>
                  ) : null}
                  <span className="text-xs uppercase tracking-wide text-muted-foreground/80">
                    Decision source: {plan.decisionSource === "llm" ? "LLM recommendation" : "Heuristics fallback"}
                  </span>
                  {plan.personalization.fallback.applied ? (
                    <span className="text-xs text-amber-600 dark:text-amber-400">
                      Personalization fallback triggered ({plan.personalization.fallback.reasons.join(", ")}). You can tweak the fields below manually.
                    </span>
                  ) : null}
                  {plan.templateCopy.issues.length ? (
                    <span className="text-xs text-amber-600 dark:text-amber-400">
                      Some copy reverted to defaults due to validation: {plan.templateCopy.issues.length} issue
                      {plan.templateCopy.issues.length === 1 ? "" : "s"} detected.
                    </span>
                  ) : null}
                  {!enableExperimentalComponents ? (
                    <span className="text-xs text-muted-foreground">
                      Experimental components are disabled, so some rich fields may not render.
                    </span>
                  ) : null}
                </div>
              </div>

              <div className="hidden items-center justify-end gap-3 lg:flex">
                <span className="text-xs text-muted-foreground">
                  Fine-tune copy, approvals, and invites for this plan.
                </span>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setCustomizeOpen(true)}
                  aria-haspopup="dialog"
                  aria-expanded={isCustomizeOpen}
                  disabled={!plan}
                  className="inline-flex items-center gap-2"
                >
                  <Settings2 className="h-3.5 w-3.5" aria-hidden="true" />
                  Customize
                </Button>
              </div>

              {previewItems.length > 0 ? (
                <div className="grid gap-4 md:grid-cols-2">
                  {previewItems.map((item, index) => (
                    <div
                      key={item.id}
                      className={cn(
                        "rounded-lg border border-border/60 bg-card p-4 shadow-sm",
                        motionEnabled && "stagger-fade-in"
                      )}
                      style={motionEnabled ? getAnimationStyle(index) : undefined}
                    >
                      <p className="text-sm font-semibold text-foreground">{item.label}</p>
                      <p className="text-xs text-muted-foreground">{item.description}</p>
                    </div>
                  ))}
                </div>
              ) : null}

              <Card className="border border-border/60 p-4">
                <FormRenderer key={`${plan.recipeId}-${animationKey}`} plan={plan.formPlan} />
              </Card>

              {ENV.isDebug ? (
                <PromptSignalsDebugPanel
                  signals={plan.promptSignals}
                  fallback={plan.personalization.fallback}
                />
              ) : null}
            </div>
          ) : null}
        </section>
      </div>
      <CustomizeDrawer
        open={isCustomizeOpen}
        onOpenChange={setCustomizeOpen}
        promptSignals={plan?.promptSignals}
        knobOverrides={plan?.personalization.overrides}
        previewCopy={plan?.templateCopy}
      />
    </main>
  );
}
