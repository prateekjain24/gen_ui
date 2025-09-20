"use client";

import { Layers, Search, Settings2, Sparkles, X } from "lucide-react";
import * as React from "react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { RecipeKnobOverrides } from "@/lib/personalization/scoring";
import { formatSignalValue, SIGNAL_LABEL_MAP } from "@/lib/prompt-intel/format";
import type { PromptSignalSource, PromptSignals } from "@/lib/prompt-intel/types";
import { cn } from "@/lib/utils";

interface CustomizeDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  recipeId?: string;
  promptSignals?: PromptSignals;
  knobOverrides?: RecipeKnobOverrides;
  previewCopy?: {
    stepTitle?: string;
    helperText?: string;
    primaryCta?: string;
  };
}

interface DrawerKnobState {
  approvalChainLength: number;
  integrationMode: string;
  copyTone: string;
  inviteStrategy: "immediate" | "staggered";
}

interface SignalDescriptor {
  id: string;
  label: string;
  value: string;
  confidence: number;
  source: PromptSignalSource;
}

type PlanEditControlId = keyof DrawerKnobState | "undo" | "reset";

interface PlanEditLogPayload {
  recipeId: string;
  controlId: PlanEditControlId;
  previousValue: unknown;
  nextValue: unknown;
  signalsSummary: string;
}

const isSameKnobState = (a: DrawerKnobState, b: DrawerKnobState): boolean =>
  a.approvalChainLength === b.approvalChainLength &&
  a.integrationMode === b.integrationMode &&
  a.copyTone === b.copyTone &&
  a.inviteStrategy === b.inviteStrategy;

const DEFAULT_KNOB_STATE: DrawerKnobState = {
  approvalChainLength: 1,
  integrationMode: "multi_tool",
  copyTone: "collaborative",
  inviteStrategy: "immediate",
};

const FALLBACK_SIGNALS: SignalDescriptor[] = [
  {
    id: "industry",
    label: "Industry",
    value: "SaaS",
    confidence: 0.6,
    source: "llm",
  },
  {
    id: "tone",
    label: "Copy tone",
    value: "Collaborative",
    confidence: 0.8,
    source: "keyword",
  },
  {
    id: "approvals",
    label: "Approval depth",
    value: "Dual",
    confidence: 0.5,
    source: "merge",
  },
];

const SOURCE_ICON: Record<PromptSignalSource, React.ComponentType<{ className?: string }>> = {
  keyword: Search,
  llm: Sparkles,
  merge: Layers,
};

const SOURCE_LABEL: Record<PromptSignalSource, string> = {
  keyword: "Keyword",
  llm: "LLM",
  merge: "Merged",
};

const HIGH_CONFIDENCE_THRESHOLD = 0.6;

const formatKnobState = (overrides?: RecipeKnobOverrides): DrawerKnobState => {
  if (!overrides) {
    return DEFAULT_KNOB_STATE;
  }

  const next: DrawerKnobState = {
    approvalChainLength: Number(overrides.approvalChainLength?.value ?? DEFAULT_KNOB_STATE.approvalChainLength),
    integrationMode: String(overrides.integrationMode?.value ?? DEFAULT_KNOB_STATE.integrationMode),
    copyTone: String(overrides.copyTone?.value ?? DEFAULT_KNOB_STATE.copyTone),
    inviteStrategy:
      (overrides.inviteStrategy?.value as DrawerKnobState["inviteStrategy"]) ?? DEFAULT_KNOB_STATE.inviteStrategy,
  };

  if (!Number.isFinite(next.approvalChainLength) || next.approvalChainLength < 0) {
    next.approvalChainLength = DEFAULT_KNOB_STATE.approvalChainLength;
  }

  if (next.inviteStrategy !== "immediate" && next.inviteStrategy !== "staggered") {
    next.inviteStrategy = DEFAULT_KNOB_STATE.inviteStrategy;
  }

  return next;
};

const mapSignals = (signals?: PromptSignals): SignalDescriptor[] => {
  if (!signals) {
    return [];
  }

  const selectedKeys: Array<keyof PromptSignals> = [
    "industry",
    "copyTone",
    "approvalChainDepth",
    "integrationCriticality",
    "tools",
  ];

  return selectedKeys.reduce<SignalDescriptor[]>((accumulator, key) => {
    const signal = signals[key];
    if (!signal) {
      return accumulator;
    }
    accumulator.push({
      id: String(key),
      label: SIGNAL_LABEL_MAP[key] ?? String(key),
      value: formatSignalValue(signal),
      confidence: signal.metadata.confidence ?? 0,
      source: signal.metadata.source,
    });
    return accumulator;
  }, []);
};

const summarizeHighConfidenceSignals = (signalDescriptors: SignalDescriptor[]): string => {
  const highConfidence = signalDescriptors.filter(signal => signal.confidence >= HIGH_CONFIDENCE_THRESHOLD);

  if (!highConfidence.length) {
    return "[]";
  }

  return JSON.stringify(
    highConfidence.map(signal => ({
      id: signal.id,
      label: signal.label,
      value: signal.value,
      confidence: Number(signal.confidence.toFixed(2)),
      source: signal.source,
    }))
  );
};

const confidenceClass = (confidence: number): string => {
  if (confidence >= 0.6) {
    return "bg-emerald-100 text-emerald-700";
  }
  if (confidence >= 0.35) {
    return "bg-amber-100 text-amber-700";
  }
  return "bg-rose-100 text-rose-700";
};

const formatCta = (inviteStrategy: DrawerKnobState["inviteStrategy"], primaryCta?: string): string => {
  if (primaryCta) {
    return primaryCta;
  }
  return inviteStrategy === "immediate" ? "Invite collaborators" : "Schedule invites";
};

const humanize = (value: string): string => value.replace(/_/g, " ").replace(/\b\w/g, char => char.toUpperCase());

const focusableSelectors = [
  "a[href]",
  "button:not([disabled])",
  "textarea:not([disabled])",
  "input:not([disabled])",
  "select:not([disabled])",
  "[tabindex]:not([tabindex='-1'])",
];

const getFocusableElements = (node: HTMLElement | null): HTMLElement[] => {
  if (!node) {
    return [];
  }
  return Array.from(node.querySelectorAll<HTMLElement>(focusableSelectors.join(",")));
};

const formatPreviewHelper = (state: DrawerKnobState, helper?: string): string => {
  if (helper?.trim()) {
    return helper.trim();
  }
  return `We will keep the tone ${humanize(state.copyTone).toLowerCase()}, support ${humanize(
    state.integrationMode
  ).toLowerCase()} integrations, and require ${state.approvalChainLength} approval${state.approvalChainLength === 1 ? "" : "s"}.`;
};

const inviteCaption = (state: DrawerKnobState): string =>
  state.inviteStrategy === "immediate"
    ? "Invitations are sent as soon as approvals complete."
    : "Invitations will be staggered after foundational steps are done.";

export function CustomizeDrawer({
  open,
  onOpenChange,
  recipeId,
  promptSignals,
  knobOverrides,
  previewCopy,
}: CustomizeDrawerProps): React.ReactElement | null {
  const drawerRef = React.useRef<HTMLDivElement>(null);
  const [knobState, setKnobState] = React.useState<DrawerKnobState>(() => formatKnobState(knobOverrides));
  const [history, setHistory] = React.useState<DrawerKnobState[]>([]);
  const [toast, setToast] = React.useState<{ id: number; message: string } | null>(null);

  const normalizedRecipeId = React.useMemo(() => recipeId?.trim() ?? "", [recipeId]);

  const showToast = React.useCallback((message: string) => {
    setToast({ id: Date.now(), message });
  }, []);

  React.useEffect(() => {
    if (!toast) {
      return;
    }
    const timer = window.setTimeout(() => {
      setToast(current => (current?.id === toast.id ? null : current));
    }, 3200);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const pushHistory = React.useCallback((state: DrawerKnobState) => {
    setHistory(current => {
      if (current.length && isSameKnobState(current[0], state)) {
        return current;
      }
      const next = [state, ...current];
      return next.slice(0, 5);
    });
  }, []);

  const signals = React.useMemo(() => {
    const mapped = mapSignals(promptSignals);
    return mapped.length ? mapped : FALLBACK_SIGNALS;
  }, [promptSignals]);

  const signalsSummary = React.useMemo(() => summarizeHighConfidenceSignals(signals), [signals]);

  const sendPlanEditTelemetry = React.useCallback(async (payload: PlanEditLogPayload) => {
    try {
      const response = await fetch("/api/telemetry/plan-edits", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const message = await response.text();
        console.warn("Plan edit telemetry rejected", message || response.statusText);
      }
    } catch (error) {
      console.warn("Plan edit telemetry request failed", error);
    }
  }, []);

  const emitPlanEdit = React.useCallback(
    (controlId: PlanEditControlId, previousValue: unknown, nextValue: unknown) => {
      if (!normalizedRecipeId) {
        return;
      }

      const payload: PlanEditLogPayload = {
        recipeId: normalizedRecipeId,
        controlId,
        previousValue,
        nextValue,
        signalsSummary,
      };

      void sendPlanEditTelemetry(payload);
    },
    [normalizedRecipeId, sendPlanEditTelemetry, signalsSummary]
  );

  const applyKnobState = React.useCallback(
    (controlId: keyof DrawerKnobState, updater: (prev: DrawerKnobState) => DrawerKnobState) => {
      setKnobState(prev => {
        const next = updater(prev);

        if (!isSameKnobState(prev, next)) {
          pushHistory(prev);

          const previousValue = prev[controlId];
          const nextValue = next[controlId];

          if (previousValue !== nextValue) {
            emitPlanEdit(controlId, previousValue, nextValue);
          }
        }

        return next;
      });
    },
    [emitPlanEdit, pushHistory]
  );

  React.useEffect(() => {
    if (open) {
      setKnobState(formatKnobState(knobOverrides));
      setHistory([]);
    }
  }, [open, knobOverrides]);

  React.useEffect(() => {
    if (!open) {
      setToast(null);
    }
  }, [open]);

  React.useEffect(() => {
    if (!open) {
      return;
    }

    const focusable = getFocusableElements(drawerRef.current);
    (focusable[0] ?? drawerRef.current)?.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (!open) {
        return;
      }
      if (event.key === "Escape") {
        event.preventDefault();
        onOpenChange(false);
        return;
      }
      if (event.key !== "Tab") {
        return;
      }
      const elements = getFocusableElements(drawerRef.current);
      if (elements.length === 0) {
        event.preventDefault();
        return;
      }
      const first = elements[0];
      const last = elements[elements.length - 1];
      if (event.shiftKey) {
        if (document.activeElement === first) {
          event.preventDefault();
          last.focus();
        }
      } else if (document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open, onOpenChange]);

  const handleUndo = React.useCallback(() => {
    setHistory(current => {
      if (!current.length) {
        showToast("Nothing to undo");
        return current;
      }
      const [previous, ...rest] = current;
      setKnobState(previous);
      emitPlanEdit("undo", knobState, previous);
      showToast("Reverted last change");
      return rest;
    });
  }, [emitPlanEdit, knobState, showToast]);

  const handleReset = React.useCallback(() => {
    if (isSameKnobState(knobState, DEFAULT_KNOB_STATE)) {
      showToast("Already using baseline settings");
      return;
    }
    const baselineState: DrawerKnobState = { ...DEFAULT_KNOB_STATE };
    setHistory(current => [knobState, ...current].slice(0, 5));
    setKnobState(baselineState);
    emitPlanEdit("reset", knobState, baselineState);
    showToast("Reset to baseline settings");
  }, [emitPlanEdit, knobState, showToast]);

  if (!open) {
    return null;
  }

  const previewHeading = previewCopy?.stepTitle?.trim() || "Customized plan preview";
  const previewHelper = formatPreviewHelper(knobState, previewCopy?.helperText);
  const previewCta = formatCta(knobState.inviteStrategy, previewCopy?.primaryCta);

  return (
    <>
      <div
        className="fixed inset-0 z-40 hidden bg-background/40 backdrop-blur-sm lg:block"
        aria-hidden="true"
        onClick={() => onOpenChange(false)}
      />
      <aside
        ref={drawerRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="customize-drawer-title"
        tabIndex={-1}
        className="fixed right-0 top-0 z-50 hidden h-full w-full max-w-xl flex-col border-l border-border bg-background shadow-xl transition-transform lg:flex"
      >
        <header className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-6 py-4">
          <div className="flex items-center gap-3">
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-primary">
              <Settings2 className="h-4 w-4" aria-hidden="true" />
            </span>
            <div>
              <h2 id="customize-drawer-title" className="text-base font-semibold text-foreground">
                Customize experience
              </h2>
              <p className="text-sm text-muted-foreground">Adjust signals and knobs to refine the canvas plan.</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={handleUndo} disabled={!history.length}>
              Undo
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleReset}
              disabled={isSameKnobState(knobState, DEFAULT_KNOB_STATE)}
            >
              Reset to baseline
            </Button>
            <Button
              variant="ghost"
              size="icon"
              aria-label="Close customize drawer"
              onClick={() => onOpenChange(false)}
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </Button>
          </div>
        </header>

        {toast ? (
          <div
            role="status"
            aria-live="polite"
            className="mx-6 mt-4 rounded-md border border-primary/40 bg-primary/10 px-3 py-2 text-xs font-medium text-primary shadow-sm"
          >
            {toast.message}
          </div>
        ) : null}

        <div className="flex flex-1 flex-col gap-8 overflow-y-auto px-6 py-6">
          <section className="space-y-4">
            <h3 className="text-sm font-semibold text-foreground">Detected signals</h3>
            <div className="grid gap-3 md:grid-cols-2">
              {signals.map(signal => (
                <SignalBadge key={signal.id} signal={signal} />
              ))}
              {signals.length === 0 ? (
                <div className="rounded-lg border border-dashed border-border/60 bg-muted/30 p-4 text-sm text-muted-foreground">
                  No signals detected yet. Share more context to populate this list.
                </div>
              ) : null}
            </div>
          </section>

          <section className="space-y-5">
            <h3 className="text-sm font-semibold text-foreground">Knob controls</h3>

            <div className="space-y-3">
              <Label htmlFor="approval-chain-length" className="text-sm font-medium text-foreground">
                Approval chain length
              </Label>
              <div className="flex items-center gap-3">
                <Input
                  id="approval-chain-length"
                  type="range"
                  min={0}
                  max={5}
                  step={1}
                  value={knobState.approvalChainLength}
                  onChange={event =>
                    applyKnobState("approvalChainLength", prev => ({
                      ...prev,
                      approvalChainLength: Number(event.target.value),
                    }))
                  }
                  aria-valuemin={0}
                  aria-valuemax={5}
                  aria-valuenow={knobState.approvalChainLength}
                  className="h-2 flex-1 cursor-pointer appearance-none bg-gradient-to-r from-primary/60 via-primary/70 to-primary"
                />
                <span className="w-8 text-right text-sm font-semibold text-foreground">
                  {knobState.approvalChainLength}
                </span>
              </div>
              <p className="text-xs text-muted-foreground">
                Set how many approvers must sign off before launch.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="integration-mode" className="text-sm font-medium text-foreground">
                Integration mode
              </Label>
              <Select
                value={knobState.integrationMode}
                onValueChange={value =>
                  applyKnobState("integrationMode", prev => ({ ...prev, integrationMode: value }))
                }
              >
                <SelectTrigger id="integration-mode">
                  <SelectValue placeholder="Select integration mode" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="multi_tool">Multi tool workspace</SelectItem>
                  <SelectItem value="single_tool">Single tool focus</SelectItem>
                  <SelectItem value="custom">Custom integrations</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Choose how aggressively Canvas recommends integrations.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="copy-tone" className="text-sm font-medium text-foreground">
                Copy tone
              </Label>
              <Select
                value={knobState.copyTone}
                onValueChange={value =>
                  applyKnobState("copyTone", prev => ({ ...prev, copyTone: value }))
                }
              >
                <SelectTrigger id="copy-tone">
                  <SelectValue placeholder="Select tone" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="collaborative">Collaborative</SelectItem>
                  <SelectItem value="governed">Governed</SelectItem>
                  <SelectItem value="fast-paced">Fast paced</SelectItem>
                  <SelectItem value="trusted-advisor">Trusted advisor</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Adjust the language style used in generated copy.
              </p>
            </div>

            <div className="flex items-start gap-3 rounded-lg border border-border/60 bg-muted/20 px-4 py-3">
              <Checkbox
                id="invite-strategy"
                checked={knobState.inviteStrategy === "staggered"}
                onCheckedChange={checked =>
                  applyKnobState("inviteStrategy", prev => ({
                    ...prev,
                    inviteStrategy: checked ? "staggered" : "immediate",
                  }))
                }
              />
              <div className="space-y-1">
                <Label htmlFor="invite-strategy" className="text-sm font-medium text-foreground">
                  Stagger invite strategy
                </Label>
                <p className="text-xs text-muted-foreground">
                  When enabled, invites are batched until foundational tasks are done. Otherwise they send immediately.
                </p>
              </div>
            </div>
          </section>

          <section className="space-y-3">
            <h3 className="text-sm font-semibold text-foreground">Live preview</h3>
            <Card className="border border-border/60 p-4">
              <div className="flex flex-col gap-4">
                <div>
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">Step title</p>
                  <p className="text-lg font-semibold text-foreground">{previewHeading}</p>
                </div>
                <p className="text-sm text-muted-foreground">{previewHelper}</p>
                <div className="rounded-md border border-dashed border-primary/40 bg-primary/5 px-3 py-2 text-sm text-primary">
                  {inviteCaption(knobState)}
                </div>
                <Button size="sm" className="self-start">
                  {previewCta}
                </Button>
              </div>
            </Card>
          </section>
        </div>
      </aside>
    </>
  );
}

interface SignalBadgeProps {
  signal: SignalDescriptor;
}

const SignalBadge = ({ signal }: SignalBadgeProps): React.ReactElement => {
  const Icon = SOURCE_ICON[signal.source];
  return (
    <article className="flex items-start justify-between gap-3 rounded-lg border border-border/60 bg-card p-3 shadow-sm">
      <div className="flex items-start gap-3">
        <span className="mt-0.5 inline-flex h-9 w-9 items-center justify-center rounded-md bg-muted">
          <Icon className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
        </span>
        <div className="space-y-1">
          <p className="text-sm font-medium text-foreground">{signal.label}</p>
          <p className="text-xs text-muted-foreground">{signal.value}</p>
          <span className="inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
            {SOURCE_LABEL[signal.source]}
          </span>
        </div>
      </div>
      <span
        className={cn(
          "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
          confidenceClass(signal.confidence)
        )}
      >
        {Math.round(signal.confidence * 100)}%
      </span>
    </article>
  );
};
