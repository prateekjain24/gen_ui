export type AttributionSource = 'ai' | 'fallback' | 'default';

export interface AIAttributionSignal {
  label: string;
  value: string;
  confidence?: number | null;
}

export interface AIAttributionKnob {
  id: string;
  label: string;
  value: string;
  changed: boolean;
  defaultValue?: string;
}

export interface AIAttribution {
  source: AttributionSource;
  summary: string;
  rationale?: string;
  knob?: AIAttributionKnob;
  signals: AIAttributionSignal[];
  fallbackDetails?: string[];
}
