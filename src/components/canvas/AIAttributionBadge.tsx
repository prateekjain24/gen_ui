"use client";

import { AlertCircle, Info, Sparkles } from "lucide-react";
import * as React from "react";

import type { AIAttribution } from "@/lib/types/ai";
import { cn } from "@/lib/utils";

interface AIAttributionBadgeProps {
  attribution?: AIAttribution | null;
  className?: string;
  size?: "sm" | "md";
}

const sourceConfig: Record<Required<AIAttribution>["source"], { label: string; icon: React.ComponentType<{ className?: string }>; tone: string }> = {
  ai: { label: "AI generated", icon: Sparkles, tone: "text-purple-700 bg-purple-100" },
  fallback: { label: "Fallback applied", icon: AlertCircle, tone: "text-amber-700 bg-amber-100" },
  default: { label: "Standard template", icon: Info, tone: "text-slate-600 bg-slate-100" },
};

export function AIAttributionBadge({ attribution, className, size = "md" }: AIAttributionBadgeProps): React.ReactElement | null {
  const [open, setOpen] = React.useState(false);
  const containerRef = React.useRef<HTMLDivElement | null>(null);
  const tooltipId = React.useId();

  React.useEffect(() => {
    if (!open) {
      return;
    }

    const handleClick = (event: MouseEvent) => {
      if (!containerRef.current) {
        return;
      }
      if (!containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClick);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handleClick);
      document.removeEventListener("keydown", handleKey);
    };
  }, [open]);

  if (!attribution) {
    return null;
  }

  const config = sourceConfig[attribution.source];
  const Icon = config.icon;
  const paddingClass = size === "sm" ? "px-2 py-0.5 text-xs" : "px-3 py-1 text-sm";

  const formatConfidence = (value?: number | null): string | undefined => {
    if (value === undefined || value === null || Number.isNaN(value)) {
      return undefined;
    }
    return `${(value * 100).toFixed(2)}%`;
  };

  return (
    <div
      ref={containerRef}
      className={cn(
        "group relative inline-flex cursor-pointer items-center gap-1 rounded-full border border-transparent font-medium transition focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        config.tone,
        paddingClass,
        className
      )}
      onClick={() => setOpen(current => !current)}
      onKeyDown={event => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          setOpen(current => !current);
        }
        if (event.key === "Escape") {
          setOpen(false);
        }
      }}
      role="button"
      tabIndex={0}
      aria-expanded={open}
      aria-controls={tooltipId}
    >
      <Icon aria-hidden="true" className={size === "sm" ? "h-3 w-3" : "h-4 w-4"} />
      <span className="font-semibold tracking-tight">{config.label}</span>
      {open ? (
        <div
          id={tooltipId}
          role="dialog"
          aria-modal="false"
          className="absolute right-0 top-full z-50 mt-2 w-72 rounded-lg border border-border/60 bg-card p-4 text-sm shadow-lg"
        >
          <div className="space-y-2">
            <p className="text-sm font-semibold text-foreground">{attribution.summary}</p>
            {attribution.rationale ? (
              <p className="text-xs text-muted-foreground">{attribution.rationale}</p>
            ) : null}
            {attribution.knob ? (
              <p className="text-xs font-medium text-foreground">
                Knob: <span className="font-semibold">{attribution.knob.label}</span>
                {" "}→{" "}
                <span className="text-muted-foreground">{attribution.knob.value}</span>
                {attribution.knob.defaultValue && !attribution.knob.changed ? (
                  <span className="ml-1 text-muted-foreground">(default: {attribution.knob.defaultValue})</span>
                ) : null}
              </p>
            ) : null}
            {attribution.signals.length ? (
              <div className="space-y-1">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Signals</p>
                <ul className="space-y-1">
                  {attribution.signals.map(signal => (
                    <li key={`${signal.label}-${signal.value}`} className="flex items-start justify-between gap-2 text-xs">
                      <span className="font-medium text-foreground">{signal.label}</span>
                      <span className="text-right text-muted-foreground">
                        {signal.value}
                        {signal.confidence !== undefined && signal.confidence !== null ? (
                          <span className="ml-1 text-[10px] uppercase tracking-wide">
                            ({formatConfidence(signal.confidence)})
                          </span>
                        ) : null}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
            {attribution.fallbackDetails?.length ? (
              <div className="space-y-1">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Details</p>
                <ul className="list-disc space-y-1 pl-5 text-xs text-muted-foreground">
                  {attribution.fallbackDetails.map((detail, index) => (
                    <li key={`fallback-detail-${index}`}>{detail}</li>
                  ))}
                </ul>
              </div>
            ) : null}
            {!attribution.knob && !attribution.signals.length && !attribution.fallbackDetails?.length ? (
              <p className="text-xs text-muted-foreground">Using standard template values.</p>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
