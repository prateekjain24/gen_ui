import { Shield, User, Users } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import * as React from "react";

import { cn } from "@/lib/utils";

type Persona = "explorer" | "team" | "power";

type PersonaConfig = {
  label: string;
  icon: LucideIcon;
  badgeClassName: string;
  textClassName: string;
};

const PERSONA_CONFIG: Record<Persona, PersonaConfig> = {
  explorer: {
    label: "Explorer",
    icon: User,
    badgeClassName: "inline-flex items-center gap-2 rounded-full bg-sky-100 px-3 py-1 text-sm font-medium",
    textClassName: "text-sky-900",
  },
  team: {
    label: "Team",
    icon: Users,
    badgeClassName: "inline-flex items-center gap-2 rounded-full bg-indigo-100 px-3 py-1 text-sm font-medium",
    textClassName: "text-indigo-900",
  },
  power: {
    label: "Power",
    icon: Shield,
    badgeClassName: "inline-flex items-center gap-2 rounded-full bg-amber-100 px-3 py-1 text-sm font-medium",
    textClassName: "text-amber-900",
  },
};

const clampConfidence = (confidence: number): number => {
  if (confidence < 0) {
    return 0;
  }
  if (confidence > 1) {
    return 1;
  }
  return confidence;
};

const formatConfidence = (confidence?: number): string | null => {
  if (confidence === undefined || !Number.isFinite(confidence)) {
    return null;
  }
  const clamped = clampConfidence(confidence);
  const percent = Math.round(clamped * 100);
  return `Confidence ${percent}%`;
};

const buildAriaLabel = (label: string, confidenceLabel: string | null): string => {
  if (!confidenceLabel) {
    return `${label} persona`;
  }
  return `${label} persona, ${confidenceLabel.toLowerCase()}`;
};

export interface PersonaBadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  persona: Persona;
  confidence?: number;
}

export function PersonaBadge({ persona, confidence, className, ...rest }: PersonaBadgeProps): React.ReactElement {
  const config = PERSONA_CONFIG[persona];
  const PersonaIcon = config.icon;
  const confidenceLabel = formatConfidence(confidence);
  const ariaLabel = buildAriaLabel(config.label, confidenceLabel);

  return (
    <span
      {...rest}
      className={cn(config.badgeClassName, config.textClassName, className)}
      aria-label={ariaLabel}
      title={confidenceLabel ?? undefined}
    >
      <PersonaIcon aria-hidden="true" className="h-4 w-4" />
      <span>{config.label}</span>
      {confidenceLabel ? <span className="text-xs font-semibold">{confidenceLabel}</span> : null}
    </span>
  );
}
