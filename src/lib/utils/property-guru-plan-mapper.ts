import type { PropertyGuruPlanTemplate } from '@/lib/property-guru/prompt';
import type {
  PropertyGuruLifestyleCue,
  PropertyGuruSignals,
  PropertyGuruTonePreset,
} from '@/lib/types/property-guru';

export interface PropertyGuruSearchPayload {
  filters: {
    area: string;
    districts: number[];
    radiusKm: number;
    minPrice?: number;
    maxPrice?: number;
    propertyType: string;
    bedrooms: number;
    lifestyle: PropertyGuruLifestyleCue[];
  };
  highlights: string[];
  nextSteps: string[];
  copy: {
    hero: string;
    reassurance: string;
    followUp: string;
    tone: PropertyGuruTonePreset;
  };
}

export interface PropertyGuruPlanMapperResult {
  payload: PropertyGuruSearchPayload;
  defaultsApplied: string[];
}

export interface PropertyGuruPlanMapperArgs {
  plan: PropertyGuruPlanTemplate;
  signals: PropertyGuruSignals;
}

export const mapPropertyGuruPlanToSearchPayload = ({
  plan,
  signals,
}: PropertyGuruPlanMapperArgs): PropertyGuruPlanMapperResult => {
  const defaultsApplied: string[] = [];

  const districts = signals.location.districtIds ?? [];
  if (!districts.length) {
    defaultsApplied.push('filters.districts');
  }

  const radiusKm = signals.location.radiusKm ?? 5;
  if (!signals.location.radiusKm) {
    defaultsApplied.push('filters.radiusKm');
  }

  const minPrice = signals.price.min;
  const baseMax = signals.price.max ?? signals.price.min;
  let maxPrice = baseMax;
  if (!signals.price.max && !signals.price.min) {
    defaultsApplied.push('filters.price');
  }

  if (baseMax && signals.price.stretchOk) {
    maxPrice = Math.round(baseMax * 1.1);
  }

  const propertyType = signals.propertyType ?? 'other';
  if (propertyType === 'other') {
    defaultsApplied.push('filters.propertyType');
  }

  const bedrooms = signals.bedrooms ?? 0;
  if (!signals.bedrooms) {
    defaultsApplied.push('filters.bedrooms');
  }

  const lifestyleHighlights = dedupe([
    ...plan.lifestyle_filters.highlights,
    ...signals.lifestyle.map(cue => formatLifestyleCue(cue)),
  ]).filter(Boolean);

  const heroCopy = plan.intent_summary.trim();
  const reassurance = plan.micro_copy.reassurance.trim();
  const followUp = plan.micro_copy.follow_up.trim();

  const actions = deriveNextSteps(plan, signals);
  if (!actions.length) {
    defaultsApplied.push('nextSteps');
  }

  const payload: PropertyGuruSearchPayload = {
    filters: {
      area: signals.location.primaryArea,
      districts,
      radiusKm,
      minPrice,
      maxPrice: maxPrice ?? undefined,
      propertyType,
      bedrooms,
      lifestyle: signals.lifestyle,
    },
    highlights: lifestyleHighlights,
    nextSteps: actions,
    copy: {
      hero: heroCopy,
      reassurance,
      followUp,
      tone: signals.tonePreference,
    },
  };

  return { payload, defaultsApplied: dedupe(defaultsApplied) };
};

const formatLifestyleCue = (cue: PropertyGuruLifestyleCue): string => {
  return cue
    .split('_')
    .map((segment, index) => {
      if (segment === 'mrt') {
        return 'MRT';
      }
      if (segment === 'sgd') {
        return 'SGD';
      }
      const lower = segment.toLowerCase();
      const text = lower.charAt(0).toUpperCase() + lower.slice(1);
      return index === 0 ? text : text.toLowerCase();
    })
    .join(' ')
    .replace('Family friendly', 'Family-friendly')
    .replace('Move in', 'Move-in');
};

const deriveNextSteps = (
  plan: PropertyGuruPlanTemplate,
  signals: PropertyGuruSignals
): string[] => {
  const rawLabels = [
    plan.plan_actions.primary?.label ?? '',
    ...plan.plan_actions.secondary.map(action => action.label),
  ].filter(Boolean);

  const actionIds = rawLabels.map(label => canonicaliseAction(label));
  const deduped = dedupe(actionIds).filter(Boolean);

  if (signals.financeReadiness === 'pre_approved') {
    return deduped.filter(action => action !== 'mortgagePreCheck');
  }

  return deduped;
};

const canonicaliseAction = (label: string): string => {
  const lower = label.toLowerCase();

  if (lower.includes('mortgage') || lower.includes('finance')) {
    return 'mortgagePreCheck';
  }

  if (lower.includes('preview') || lower.includes('view') || lower.includes('listings')) {
    return 'viewListings';
  }

  if (lower.includes('save') || lower.includes('digest') || lower.includes('alert')) {
    return 'savedSearch';
  }

  if (lower.includes('tour') || lower.includes('visit')) {
    return 'scheduleTour';
  }

  if (lower.includes('consult')) {
    return 'expertConsult';
  }

  return toCamelCase(label);
};

const toCamelCase = (value: string): string => {
  const cleaned = value.replace(/[^a-zA-Z0-9]+/g, ' ').trim();
  if (!cleaned) {
    return '';
  }

  const parts = cleaned.split(' ');
  const [first, ...rest] = parts;
  return (
    first.toLowerCase() +
    rest.map(part => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase()).join('')
  );
};

const dedupe = <T>(values: T[]): T[] => Array.from(new Set(values));
