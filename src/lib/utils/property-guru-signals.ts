import { PROPERTY_GURU_LIFESTYLE_CUES } from '@/lib/constants';
import type { PromptSignalSummary } from '@/lib/prompt-intel';
import type { PromptSignalsExtractedEvent } from '@/lib/types/events';
import type {
  PropertyGuruBedroomCount,
  PropertyGuruFinanceReadiness,
  PropertyGuruLifestyleCue,
  PropertyGuruMoveInHorizon,
  PropertyGuruPropertyType,
  PropertyGuruSignals,
  PropertyGuruTonePreset,
} from '@/lib/types/property-guru';
import { createDebugger } from '@/lib/utils/debug';

const debug = createDebugger('PropertyGuru:Signals');

interface Detection<T> {
  value: T;
  confidence: number;
  notes?: string;
}

const DEFAULT_SIGNALS: PropertyGuruSignals = {
  location: {
    primaryArea: 'Singapore',
    radiusKm: 5,
  },
  price: {
    currency: 'SGD',
    stretchOk: false,
  },
  propertyType: 'other',
  bedrooms: 0,
  moveInHorizon: 'unspecified',
  lifestyle: [],
  financeReadiness: 'unknown',
  tonePreference: 'reassuring',
};

const AREA_KEYWORDS: Record<string, { area: string; districts?: number[] }> = {
  tampines: { area: 'Tampines', districts: [18] },
  bishan: { area: 'Bishan', districts: [20] },
  queenstown: { area: 'Queenstown', districts: [3] },
  punggol: { area: 'Punggol', districts: [19] },
  'bukit timah': { area: 'Bukit Timah', districts: [10, 11] },
  'bukit panjang': { area: 'Bukit Panjang', districts: [23] },
  orchard: { area: 'Orchard', districts: [9] },
  'thomson-east coast': { area: 'Thomson-East Coast Line' },
  thomson: { area: 'Thomson', districts: [11, 20] },
  jurong: { area: 'Jurong', districts: [22] },
  hougang: { area: 'Hougang', districts: [19] },
  'bukit merah': { area: 'Bukit Merah', districts: [3] },
};

const MRT_REGEX = /([a-zA-Z\s]+?)\s*MRT/gi;
const BEDROOM_REGEX = /(\d+(?:\.5)?)\s*(?:br|bed|bedroom)s?/i;
const BEDROOM_WORD_REGEX = /(studio)/i;
const CURRENCY_BUDGET_REGEX = /(sgd|\$)\s*([\d,.]+)\s*(million|m|k|thousand)?\b/gi;
const SUFFIX_BUDGET_REGEX = /(\d+(?:\.\d+)?)\s*(million|m|k|thousand)\b/gi;
const MONTH_REGEX = /(\d{1,2})\s*(?:-\s*(\d{1,2}))?\s*(?:month|months)/i;

const PROPERTY_TYPE_KEYWORDS: Array<{ match: RegExp; value: PropertyGuruPropertyType }> = [
  { match: /executive condo|\bEC\b/i, value: 'executive_condo' },
  { match: /condo|min(?:i)?um/i, value: 'condo' },
  { match: /hdb/i, value: 'hdb' },
  { match: /landed|terrace|semi-detached|bungalow/i, value: 'landed' },
  { match: /serviced apartment|serviced flat/i, value: 'serviced_apartment' },
  { match: /co-?living/i, value: 'co_living' },
];

const LIFESTYLE_KEYWORDS: Record<PropertyGuruLifestyleCue, RegExp[]> = {
  near_mrt: [/near [a-z\s]+mrt/i, /mrt access/i, /steps? from mrt/i],
  near_schools: [/near .*school/i, /good schools?/i, /top school/i],
  childcare_ready: [/preschool/i, /childcare/i, /daycare/i],
  family_friendly: [/family friendly/i, /kids?/i, /children/i, /twins?/i],
  pet_friendly: [/pet[-\s]?friendly/i, /pets?/i],
  wheelchair_access: [/wheelchair/i, /accessible/i, /lift access/i],
  healthcare_access: [/hospital/i, /clinic/i, /healthcare/i, /medical/i],
  green_spaces: [/park/i, /green space/i, /nature/i],
  co_working: [/co-?working/i, /shared office/i],
  serviced_amenities: [/serviced/i, /hotel-like/i],
  rental_hotspot: [/rental demand/i, /yield/i, /investment/i],
  move_in_ready: [/move[-\s]?in ready/i, /turnkey/i, /minimal reno/i, /low reno/i],
  renovation_friendly: [/renovation/i, /reno potential/i],
  dual_city: [/split(?:ting)? time/i, /dual[-\s]?city/i, /singapore and kl/i],
  community_events: [/community/i, /events?/i, /neighbourhood activities/i],
};

const FINANCE_KEYWORDS: Array<{ match: RegExp; value: PropertyGuruFinanceReadiness }> = [
  { match: /pre-?approved/i, value: 'pre_approved' },
  { match: /cash purchase|paying cash|buy.*cash/i, value: 'cash_purchase' },
  { match: /need.*advice|help with financing|guidance on (?:loan|financing)/i, value: 'needs_guidance' },
  { match: /exploring finance|market check|compare loan/i, value: 'exploring_options' },
  { match: /mortgage/i, value: 'exploring_options' },
  { match: /loan options?/i, value: 'exploring_options' },
];

const TONE_KEYWORDS: Array<{ match: RegExp; value: PropertyGuruTonePreset }> = [
  { match: /reassur|comfort|peace of mind/i, value: 'reassuring' },
  { match: /data|stats?|yield|report/i, value: 'data_driven' },
  { match: /concierge|white glove|bespoke|high touch/i, value: 'concierge' },
];

export interface ExtractPropertyGuruSignalsOptions {
  sessionId?: string;
  telemetryLogger?: (event: PromptSignalsExtractedEvent) => void;
  now?: () => Date;
}

export interface PropertyGuruSignalExtractionResult {
  signals: PropertyGuruSignals;
  summaries: PromptSignalSummary[];
}

export function extractPropertyGuruSignals(
  prompt: string,
  options: ExtractPropertyGuruSignalsOptions = {}
): PropertyGuruSignalExtractionResult {
  const trimmed = prompt.trim();
  if (!trimmed) {
    debug('Received empty prompt payload');
    const fallbackSummaries = createDefaultSummaries(DEFAULT_SIGNALS);
    emitTelemetry(fallbackSummaries, options);
    return { signals: { ...DEFAULT_SIGNALS }, summaries: fallbackSummaries };
  }

  const lower = trimmed.toLowerCase();
  const signals: PropertyGuruSignals = {
    location: { ...DEFAULT_SIGNALS.location },
    price: { ...DEFAULT_SIGNALS.price },
    propertyType: DEFAULT_SIGNALS.propertyType,
    bedrooms: DEFAULT_SIGNALS.bedrooms,
    moveInHorizon: DEFAULT_SIGNALS.moveInHorizon,
    lifestyle: [...DEFAULT_SIGNALS.lifestyle],
    financeReadiness: DEFAULT_SIGNALS.financeReadiness,
    tonePreference: DEFAULT_SIGNALS.tonePreference,
  };
  const summaries: PromptSignalSummary[] = [];

  const locationDetection = detectLocation(trimmed, lower);
  if (locationDetection) {
    signals.location = locationDetection.value;
    summaries.push(
      createSummary('propertyGuru.location', signals.location, locationDetection.confidence, locationDetection.notes)
    );
  } else {
    summaries.push(createSummary('propertyGuru.location', signals.location, 0.2, 'Fallback location defaults'));
  }

  const priceDetection = detectPrice(trimmed, lower);
  if (priceDetection) {
    signals.price = priceDetection.value;
    summaries.push(
      createSummary('propertyGuru.price', signals.price, priceDetection.confidence, priceDetection.notes)
    );
  } else {
    summaries.push(createSummary('propertyGuru.price', signals.price, 0.1, 'No explicit budget found'));
  }

  const propertyTypeDetection = detectPropertyType(trimmed);
  if (propertyTypeDetection) {
    signals.propertyType = propertyTypeDetection.value;
    summaries.push(
      createSummary(
        'propertyGuru.propertyType',
        signals.propertyType,
        propertyTypeDetection.confidence,
        propertyTypeDetection.notes
      )
    );
  } else {
    const inferredCondo = priceDetection && shouldInferCondo(priceDetection.value, trimmed);
    if (inferredCondo) {
      signals.propertyType = 'condo';
      summaries.push(
        createSummary(
          'propertyGuru.propertyType',
          signals.propertyType,
          0.5,
          'Inferred condo from multi-bedroom context and budget'
        )
      );
    } else {
      summaries.push(createSummary('propertyGuru.propertyType', signals.propertyType, 0.2, 'Defaulted to other'));
    }
  }

  const bedroomsDetection = detectBedrooms(trimmed, lower);
  if (bedroomsDetection) {
    signals.bedrooms = bedroomsDetection.value;
    summaries.push(
      createSummary(
        'propertyGuru.bedrooms',
        signals.bedrooms,
        bedroomsDetection.confidence,
        bedroomsDetection.notes
      )
    );
  } else {
    summaries.push(createSummary('propertyGuru.bedrooms', signals.bedrooms, 0.2, 'Bedrooms unspecified'));
  }

  const moveInDetection = detectMoveIn(trimmed, lower);
  if (moveInDetection) {
    signals.moveInHorizon = moveInDetection.value;
    summaries.push(
      createSummary(
        'propertyGuru.moveInHorizon',
        signals.moveInHorizon,
        moveInDetection.confidence,
        moveInDetection.notes
      )
    );
  } else {
    summaries.push(createSummary('propertyGuru.moveInHorizon', signals.moveInHorizon, 0.2, 'Move-in timing unspecified'));
  }

  const lifestyleDetection = detectLifestyle(trimmed, lower);
  if (lifestyleDetection) {
    signals.lifestyle = lifestyleDetection.value;
    summaries.push(
      createSummary(
        'propertyGuru.lifestyle',
        signals.lifestyle,
        lifestyleDetection.confidence,
        lifestyleDetection.notes
      )
    );
  } else {
    summaries.push(createSummary('propertyGuru.lifestyle', signals.lifestyle, 0.2, 'No lifestyle cues detected'));
  }

  const financeDetection = detectFinance(trimmed);
  if (financeDetection) {
    signals.financeReadiness = financeDetection.value;
    summaries.push(
      createSummary(
        'propertyGuru.financeReadiness',
        signals.financeReadiness,
        financeDetection.confidence,
        financeDetection.notes
      )
    );
  } else {
    summaries.push(createSummary('propertyGuru.financeReadiness', signals.financeReadiness, 0.2, 'Finance readiness default'));
  }

  const toneDetection = detectTone(trimmed);
  if (toneDetection) {
    signals.tonePreference = toneDetection.value;
    summaries.push(
      createSummary(
        'propertyGuru.tonePreference',
        signals.tonePreference,
        toneDetection.confidence,
        toneDetection.notes
      )
    );
  } else {
    summaries.push(createSummary('propertyGuru.tonePreference', signals.tonePreference, 0.3, 'Fallback reassuring tone'));
  }

  emitTelemetry(summaries, options);
  debug('Extracted PropertyGuru signals: %o', signals);

  return { signals, summaries };
}

function detectLocation(original: string, lower: string): Detection<PropertyGuruSignals['location']> | undefined {
  const matchedArea = Object.entries(AREA_KEYWORDS).find(([keyword]) => lower.includes(keyword));

  const anchorPoints: string[] = [];
  let match: RegExpExecArray | null;
  while ((match = MRT_REGEX.exec(original)) !== null) {
    const rawSegment = match[1].trim();
    const lowerSegment = rawSegment.toLowerCase();
    const nearIndex = lowerSegment.lastIndexOf('near ');
    const segment = nearIndex >= 0 ? rawSegment.slice(nearIndex + 5) : rawSegment;
    const cleaned = segment.replace(/[^a-zA-Z\s]/g, '').trim();
    if (cleaned) {
      anchorPoints.push(`${titleCase(cleaned)} MRT`);
    }
  }

  if (!matchedArea && anchorPoints.length === 0) {
    return undefined;
  }

  const area = matchedArea?.[1].area ?? anchorPoints[0]?.replace(/ MRT$/i, '') ?? 'Singapore';
  const districts = matchedArea?.[1].districts;

  const detected: PropertyGuruSignals['location'] = {
    primaryArea: titleCase(area),
    radiusKm: anchorPoints.length > 0 ? 1.5 : 5,
    anchorPoints: anchorPoints.length ? anchorPoints : undefined,
    districtIds: districts,
  };

  return {
    value: detected,
    confidence: matchedArea ? 0.9 : 0.6,
    notes: matchedArea
      ? `Matched area keyword "${matchedArea[0]}"`
      : 'Derived from MRT anchor reference',
  };
}

function detectPrice(original: string, lower: string): Detection<PropertyGuruSignals['price']> | undefined {
  const values: number[] = [];
  const contexts: string[] = [];

  for (const [, , rawValue, unit] of original.matchAll(CURRENCY_BUDGET_REGEX)) {
    const parsed = normaliseBudgetValue(rawValue, unit);
    if (parsed !== undefined) {
      values.push(parsed);
      contexts.push(`currency:${rawValue}${unit ?? ''}`);
    }
  }

  for (const [, rawValue, unit] of original.matchAll(SUFFIX_BUDGET_REGEX)) {
    const parsed = normaliseBudgetValue(rawValue, unit);
    if (parsed !== undefined) {
      values.push(parsed);
      contexts.push(`suffix:${rawValue}${unit}`);
    }
  }

  if (!values.length) {
    return undefined;
  }

  const max = Math.max(...values);
  const min = Math.min(...values);

  const budget: PropertyGuruSignals['price'] = {
    currency: 'SGD',
    max,
    min,
    stretchOk: /stretch|buffer|if needed|flexible budget/i.test(original),
  };

  const confidence = /under|budget|around|tops? out|cap|monthly|rent/i.test(lower) ? 0.9 : 0.7;

  return {
    value: budget,
    confidence,
    notes: `Detected budget references (${contexts.join(', ')})`,
  };
}

function detectPropertyType(original: string): Detection<PropertyGuruPropertyType> | undefined {
  for (const { match, value } of PROPERTY_TYPE_KEYWORDS) {
    if (match.test(original)) {
      return {
        value,
        confidence: 0.95,
        notes: `Matched property type keyword via ${match}`,
      };
    }
  }

  return undefined;
}

function detectBedrooms(original: string, lower: string): Detection<PropertyGuruBedroomCount> | undefined {
  const numericMatch = BEDROOM_REGEX.exec(original);
  if (numericMatch) {
    const value = clampBedrooms(Number.parseFloat(numericMatch[1]));
    return {
      value,
      confidence: 0.95,
      notes: `Matched numeric bedroom count "${numericMatch[0]}"`,
    };
  }

  if (BEDROOM_WORD_REGEX.test(original)) {
    return {
      value: 0,
      confidence: 0.7,
      notes: 'Detected studio reference',
    };
  }

  if (/family|kids|children|parents/i.test(original)) {
    return {
      value: 3,
      confidence: 0.45,
      notes: 'Inferred family scenario without explicit bedroom count',
    };
  }

  if (/couple|single/i.test(lower)) {
    return {
      value: 1,
      confidence: 0.3,
      notes: 'No bedrooms specified; defaulting to compact household assumption',
    };
  }

  return undefined;
}

function detectMoveIn(original: string, lower: string): Detection<PropertyGuruMoveInHorizon> | undefined {
  if (/immediate|right away|asap|urgent/i.test(original)) {
    return {
      value: 'immediate',
      confidence: 0.9,
      notes: 'Detected urgent phrasing',
    };
  }

  const monthMatch = MONTH_REGEX.exec(original);
  if (monthMatch) {
    const first = Number.parseInt(monthMatch[1], 10);
    const second = monthMatch[2] ? Number.parseInt(monthMatch[2], 10) : undefined;
    const average = second ? (first + second) / 2 : first;

    const horizon = average <= 3 ? 'three_months' : average <= 6 ? 'six_months' : 'year_plus';

    return {
      value: horizon,
      confidence: 0.85,
      notes: `Detected move-in window: ${monthMatch[0]}`,
    };
  }

  if (/flexible|open timeline|no rush/i.test(original)) {
    return {
      value: 'flexible',
      confidence: 0.7,
      notes: 'Flexible move-in phrasing',
    };
  }

  if (/next year|12 months|18 months/i.test(lower)) {
    return {
      value: 'year_plus',
      confidence: 0.7,
      notes: 'Longer-term timeline referenced',
    };
  }

  return undefined;
}

function detectLifestyle(original: string, lower: string): Detection<PropertyGuruLifestyleCue[]> | undefined {
  const cues = new Set<PropertyGuruLifestyleCue>();

  for (const cue of PROPERTY_GURU_LIFESTYLE_CUES) {
    const patterns = LIFESTYLE_KEYWORDS[cue];
    if (!patterns) {
      continue;
    }

    for (const pattern of patterns) {
      if (pattern.test(original)) {
        cues.add(cue);
        break;
      }
    }
  }

  // Additional heuristics
  if (/parents|elderly|mobility/i.test(lower)) {
    cues.add('wheelchair_access');
  }

  if (/split.*kl|kuala lumpur/i.test(lower)) {
    cues.add('dual_city');
  }

  if (/investment|yield|rent/i.test(lower)) {
    cues.add('rental_hotspot');
  }

  if (/(family|kids|children|parents|twins)/i.test(lower)) {
    cues.add('family_friendly');
  }

  if (!cues.size) {
    return undefined;
  }

  return {
    value: Array.from(cues),
    confidence: 0.85,
    notes: `Matched ${cues.size} lifestyle cue${cues.size > 1 ? 's' : ''}`,
  };
}

function detectFinance(original: string): Detection<PropertyGuruFinanceReadiness> | undefined {
  for (const { match, value } of FINANCE_KEYWORDS) {
    if (match.test(original)) {
      return {
        value,
        confidence: value === 'exploring_options' ? 0.7 : 0.9,
        notes: `Matched finance keyword via ${match}`,
      };
    }
  }

  return undefined;
}

function detectTone(original: string): Detection<PropertyGuruTonePreset> | undefined {
  for (const { match, value } of TONE_KEYWORDS) {
    if (match.test(original)) {
      return {
        value,
        confidence: 0.8,
        notes: `Matched tone keyword via ${match}`,
      };
    }
  }

  if (/family|comfort|reassur/i.test(original)) {
    return {
      value: 'reassuring',
      confidence: 0.6,
      notes: 'Defaulted to reassuring tone for family-centric language',
    };
  }

  return undefined;
}

function clampBedrooms(value: number): PropertyGuruBedroomCount {
  if (Number.isNaN(value)) {
    return 0;
  }

  const clamped = Math.min(Math.max(Math.round(value), 0), 6) as PropertyGuruBedroomCount;
  return clamped;
}

function normaliseBudgetValue(rawValue: string, unit?: string): number | undefined {
  const cleaned = rawValue.replace(/,/g, '');
  const numeric = Number.parseFloat(cleaned);
  if (Number.isNaN(numeric)) {
    return undefined;
  }

  if (!unit) {
    return numeric;
  }

  const lower = unit.toLowerCase();
  if (lower.startsWith('m')) {
    return numeric * 1_000_000;
  }

  if (lower.startsWith('k') || lower.includes('thousand')) {
    return numeric * 1_000;
  }

  return numeric;
}

function shouldInferCondo(price: PropertyGuruSignals['price'], prompt: string): boolean {
  const maxBudget = price.max ?? price.min ?? 0;
  if (maxBudget < 800_000) {
    return false;
  }

  if (!/(\d+\s*(?:br|bed|bedroom))|multi-?generational|family/i.test(prompt)) {
    return false;
  }

  return true;
}

function titleCase(value: string): string {
  return value
    .split(' ')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(' ');
}

function createSummary(
  key: string,
  value: unknown,
  confidence: number,
  notes?: string
): PromptSignalSummary {
  return {
    key,
    value,
    source: confidence >= 0.5 ? 'keyword' : 'merge',
    confidence,
    notes,
  };
}

function createDefaultSummaries(signals: PropertyGuruSignals): PromptSignalSummary[] {
  return [
    createSummary('propertyGuru.location', signals.location, 0.1, 'Default location applied'),
    createSummary('propertyGuru.price', signals.price, 0.1, 'Default budget applied'),
    createSummary('propertyGuru.propertyType', signals.propertyType, 0.1, 'Default property type applied'),
    createSummary('propertyGuru.bedrooms', signals.bedrooms, 0.1, 'Default bedrooms applied'),
    createSummary('propertyGuru.moveInHorizon', signals.moveInHorizon, 0.1, 'Default move-in horizon applied'),
    createSummary('propertyGuru.lifestyle', signals.lifestyle, 0.1, 'No lifestyle cues detected'),
    createSummary('propertyGuru.financeReadiness', signals.financeReadiness, 0.1, 'Default finance readiness applied'),
    createSummary('propertyGuru.tonePreference', signals.tonePreference, 0.1, 'Default tone applied'),
  ];
}

function emitTelemetry(
  summaries: PromptSignalSummary[],
  options: ExtractPropertyGuruSignalsOptions
): void {
  if (!options.telemetryLogger) {
    return;
  }

  const event: PromptSignalsExtractedEvent = {
    type: 'prompt_signals_extracted',
    timestamp: (options.now ?? (() => new Date()))().toISOString(),
    sessionId: options.sessionId ?? 'property-guru-preview',
    signals: summaries,
  };

  options.telemetryLogger(event);
}
