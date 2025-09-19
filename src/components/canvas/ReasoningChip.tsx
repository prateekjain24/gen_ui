import * as React from "react";

import { cn } from "@/lib/utils";

export interface ReasoningChipProps extends React.HTMLAttributes<HTMLDivElement> {
  reasoning: string;
  tags?: string[];
}

export function ReasoningChip({ reasoning, tags, className, ...rest }: ReasoningChipProps): React.ReactElement {
  const hasTags = Boolean(tags && tags.length > 0);
  const ariaLabel = hasTags ? `Reasoning: ${reasoning}. Tags: ${tags?.join(", ")}` : `Reasoning: ${reasoning}`;

  return (
    <div
      {...rest}
      className={cn(
        "inline-flex items-center gap-2 rounded-full border border-muted-foreground/30 bg-background px-3 py-1 text-sm text-muted-foreground shadow-sm",
        className
      )}
      role="note"
      aria-label={ariaLabel}
      title={reasoning}
    >
      <span className="font-medium text-foreground">Why</span>
      <span className="text-sm text-muted-foreground">{reasoning}</span>
      {hasTags ? (
        <span className="flex items-center gap-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          {tags?.map(tag => (
            <span
              key={tag}
              className="inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-[11px] text-muted-foreground"
            >
              {tag}
            </span>
          ))}
        </span>
      ) : null}
    </div>
  );
}
