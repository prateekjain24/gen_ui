"use client";

import { Check, Clipboard } from "lucide-react";
import * as React from "react";

import { Button } from "@/components/ui/button";
import { summarizePromptSignals } from "@/lib/prompt-intel";
import type { PromptSignals } from "@/lib/prompt-intel/types";
import { cn } from "@/lib/utils";

interface PromptSignalsDebugPanelProps {
  signals: PromptSignals;
  className?: string;
}

const formatValue = (value: unknown): string => {
  if (value === null || value === undefined) {
    return "—";
  }

  if (Array.isArray(value)) {
    if (value.every(item => typeof item === "string")) {
      return value.join(", ");
    }
    return JSON.stringify(value, null, 2);
  }

  if (typeof value === "object") {
    return JSON.stringify(value, null, 2);
  }

  return String(value);
};

export function PromptSignalsDebugPanel({ signals, className }: PromptSignalsDebugPanelProps): React.ReactElement {
  const summary = React.useMemo(() => summarizePromptSignals(signals), [signals]);
  const [copied, setCopied] = React.useState(false);

  const handleCopy = React.useCallback(async () => {
    try {
      await navigator.clipboard.writeText(JSON.stringify(signals, null, 2));
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch (error) {
      console.error("Failed to copy prompt signals", error);
    }
  }, [signals]);

  return (
    <section
      className={cn(
        "rounded-lg border border-dashed border-muted-foreground/40 bg-muted/10 p-4",
        className
      )}
      aria-label="Prompt intelligence debug panel"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Prompt signals</h3>
          <p className="text-xs text-muted-foreground/80">Merged keyword + LLM output with provenance.</p>
        </div>
        <Button type="button" variant="outline" size="sm" onClick={handleCopy}>
          {copied ? (
            <span className="inline-flex items-center gap-2">
              <Check className="h-3.5 w-3.5" aria-hidden="true" /> Copied
            </span>
          ) : (
            <span className="inline-flex items-center gap-2">
              <Clipboard className="h-3.5 w-3.5" aria-hidden="true" /> Copy JSON
            </span>
          )}
        </Button>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-2">
        {summary.map(item => (
          <div
            key={item.key}
            className="rounded-md border border-border/40 bg-background px-3 py-2 text-sm shadow-sm"
          >
            <div className="flex items-center justify-between gap-2">
              <span className="font-medium text-foreground">{item.key}</span>
              <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] uppercase tracking-wide text-muted-foreground">
                {item.source}
              </span>
            </div>
            <div className="mt-1 text-xs text-muted-foreground/80">Confidence: {item.confidence.toFixed(2)}</div>
            <pre className="mt-2 max-h-36 overflow-auto rounded bg-muted/60 px-2 py-1 text-xs font-mono text-muted-foreground whitespace-pre-wrap">
              {formatValue(item.value)}
            </pre>
            {item.notes ? (
              <div className="mt-1 text-[11px] text-muted-foreground/80">Notes: {item.notes}</div>
            ) : null}
          </div>
        ))}
      </div>
    </section>
  );
}
