import { z } from 'zod';

import type { PropertyGuruSignals } from '@/lib/types/property-guru';

export const PROPERTY_GURU_PLAN_SYSTEM_PROMPT = `You are a PropertyGuru onboarding planner helping home seekers turn a conversational brief into an actionable discovery plan.

Always respond with JSON that matches the provided schema. Your plan must feel like a concierge advisor who understands the seeker. Reflect the user's tone preference when available.

### Plan structure
1. intent_summary — 1-2 sentences affirming the seeker's goal.
2. essentials — key filters to tune first (location radius, price band, property type/bedrooms). Present as labelled items with short guidance and recommended values.
3. lifestyle_filters — highlight lifestyle toggles worth adjusting (amenities, accessibility, commute, family cues). Explain why each matters.
4. plan_actions — primary and optional secondary actions to continue in PropertyGuru (e.g., view matches, start mortgage check, schedule tour). Include CTA labels and contextual helper copy.
5. micro_copy — reassurance + follow-up language (listing freshness, weekly digest, concierge support).

### Guardrails
- Never invent impossible data; stay within the signals provided.
- Use Singapore context (currency SGD, MRT references, districts).
- Tone must be one of: reassuring, data-driven, concierge.
- Keep each string ≤ 200 characters.
- Prefer bullet-like phrasing separated by semicolons when listing multiple benefits.
- If information is missing, note sensible defaults (e.g., "Budget not specified — starting with SGD 1.0M").

Return JSON only.`;

export const propertyGuruPlanSchema = z.object({
  intent_summary: z.string().min(1),
  essentials: z.object({
    title: z.string().min(1),
    items: z
      .array(
        z.object({
          label: z.string().min(1),
          value: z.string().min(1),
          helper: z.string().min(1),
        })
      )
      .min(1),
  }),
  lifestyle_filters: z.object({
    title: z.string().min(1),
    highlights: z.array(z.string().min(1)).min(1),
    helper: z.string().min(1),
  }),
  plan_actions: z.object({
    primary: z.object({
      label: z.string().min(1),
      description: z.string().min(1),
    }),
    secondary: z
      .array(
        z.object({
          label: z.string().min(1),
          description: z.string().min(1),
        })
      )
      .default([]),
  }),
  micro_copy: z.object({
    reassurance: z.string().min(1),
    follow_up: z.string().min(1),
  }),
});

export type PropertyGuruPlanTemplate = z.infer<typeof propertyGuruPlanSchema>;

export const buildPropertyGuruPlanPrompt = ({
  prompt,
  signals,
}: {
  prompt: string;
  signals: PropertyGuruSignals;
}): string => {
  const summary = {
    prompt,
    signals,
  };

  return `Context: ${JSON.stringify(summary, null, 2)}\n\nReturn a JSON object that matches the PropertyGuru schema.`;
};

export const createDefaultPropertyGuruPlan = (): PropertyGuruPlanTemplate => ({
  intent_summary: 'Let\'s refine your home search together.',
  essentials: {
    title: 'Tune the essentials',
    items: [
      {
        label: 'Location radius',
        value: '5km around your preferred neighbourhood',
        helper: 'Adjust the slider to widen or tighten nearby listings.',
      },
      {
        label: 'Price band',
        value: 'SGD 1.0M - 1.2M',
        helper: 'Set a range that keeps monthly payments comfortable.',
      },
    ],
  },
  lifestyle_filters: {
    title: 'Lifestyle filters',
    highlights: ['Commute to MRT', 'Nearby schools', 'Pet-friendly options'],
    helper: 'Toggle the priorities that matter; we will reshuffle matches instantly.',
  },
  plan_actions: {
    primary: {
      label: 'Preview curated listings',
      description: 'Opens a shortlist with filters applied.',
    },
    secondary: [
      {
        label: 'Start mortgage check',
        description: 'See monthly repayments and financing options.',
      },
    ],
  },
  micro_copy: {
    reassurance: 'Listings refresh daily so you don\'t miss new launches.',
    follow_up: 'We will email a weekly digest and concierge tips.',
  },
});
