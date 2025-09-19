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
import type { PromptSignalSource, PromptSignals } from "@/lib/prompt-intel/types";
import { cn } from "@/lib/utils";

interface CustomizeDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
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

const LABEL_MAP: Partial<Record<keyof PromptSignals, string>> = {
  industry: "Industry",
  copyTone: "Copy tone",
  approvalChainDepth: "Approval depth",
  integrationCriticality: "Integration criticality",
  tools: "Mentioned tools",
};

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

const formatSignalValue = (signal: PromptSignals[keyof PromptSignals]): string => {
  if (!signal) {
    return "Not set";
  }
  const { value } = signal;
  if (Array.isArray(value)) {
    if (value.length === 0) {
      return "Not set";
    }
    if (typeof value[0] === "object" && value[0] !== null) {
      return `${value.length} decision makers`;
    }
    return value.join(", ");
  }

  if (typeof value === "object" && value !== null) {
    const parts = ["timeline" in value ? value.timeline : null, "budget" in value ? value.budget : null].filter(
      Boolean
    );
    return parts.length ? parts.join(" • ") : "No constraints";
  }

  return String(value ?? "Not set");
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
      label: LABEL_MAP[key] ?? String(key),
      value: formatSignalValue(signal),
      confidence: signal.metadata.confidence ?? 0,
      source: signal.metadata.source,
    });
    return accumulator;
  }, []);
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
  promptSignals,
  knobOverrides,
  previewCopy,
}: CustomizeDrawerProps): React.ReactElement | null {
  const drawerRef = React.useRef<HTMLDivElement>(null);
  const [knobState, setKnobState] = React.useState<DrawerKnobState>(() => formatKnobState(knobOverrides));
  const signals = React.useMemo(() => {
    const mapped = mapSignals(promptSignals);
    return mapped.length ? mapped : FALLBACK_SIGNALS;
  }, [promptSignals]);

  React.useEffect(() => {
    if (open) {
      setKnobState(formatKnobState(knobOverrides));
    }
  }, [open, knobOverrides]);

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
        <header className="flex items-center justify-between border-b border-border px-6 py-4">
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
          <Button
            variant="ghost"
            size="icon"
            aria-label="Close customize drawer"
            onClick={() => onOpenChange(false)}
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </Button>
        </header>

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
                    setKnobState(prev => ({ ...prev, approvalChainLength: Number(event.target.value) }))
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
                onValueChange={value => setKnobState(prev => ({ ...prev, integrationMode: value }))}
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
              <Select value={knobState.copyTone} onValueChange={value => setKnobState(prev => ({ ...prev, copyTone: value }))}>
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
                  setKnobState(prev => ({ ...prev, inviteStrategy: checked ? "staggered" : "immediate" }))
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
