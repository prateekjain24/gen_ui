/**
 * PropertyGuru seeker signal definitions
 *
 * Shared contract describing the typed signals the PropertyGuru preset
 * expects. This keeps extractors, prompt engineering, UI, and telemetry
 * aligned so new work avoids ad hoc string keys.
 */

export type PropertyGuruTonePreset = 'reassuring' | 'data_driven' | 'concierge';

export type PropertyGuruPropertyType =
  | 'condo'
  | 'executive_condo'
  | 'hdb'
  | 'landed'
  | 'serviced_apartment'
  | 'co_living'
  | 'other';

export type PropertyGuruLifestyleCue =
  | 'near_mrt'
  | 'near_schools'
  | 'childcare_ready'
  | 'family_friendly'
  | 'pet_friendly'
  | 'wheelchair_access'
  | 'healthcare_access'
  | 'green_spaces'
  | 'co_working'
  | 'serviced_amenities'
  | 'rental_hotspot'
  | 'move_in_ready'
  | 'renovation_friendly'
  | 'dual_city'
  | 'community_events';

export type PropertyGuruFinanceReadiness =
  | 'pre_approved'
  | 'exploring_options'
  | 'needs_guidance'
  | 'cash_purchase'
  | 'unknown';

export type PropertyGuruMoveInHorizon =
  | 'immediate'
  | 'three_months'
  | 'six_months'
  | 'year_plus'
  | 'flexible'
  | 'unspecified';

export type PropertyGuruBedroomCount = 0 | 1 | 2 | 3 | 4 | 5 | 6;

export interface PropertyGuruLocationFocus {
  /** Primary area, neighbourhood, or planning region name */
  primaryArea: string;
  /** Optional secondary areas to consider */
  secondaryAreas?: string[];
  /** Specific landmarks or transport anchors (e.g. MRT lines) */
  anchorPoints?: string[];
  /** Preferred search radius in kilometres */
  radiusKm?: number;
  /** Optional PropertyGuru district identifiers */
  districtIds?: number[];
}

export interface PropertyGuruPriceBand {
  /** Minimum budget in currency units */
  min?: number;
  /** Maximum comfortable budget */
  max?: number;
  /** Currency code, defaulting to SGD */
  currency: 'SGD';
  /** Whether seeker is open to stretching beyond max (~10%) */
  stretchOk?: boolean;
}

export interface PropertyGuruSignals {
  location: PropertyGuruLocationFocus;
  price: PropertyGuruPriceBand;
  propertyType: PropertyGuruPropertyType;
  bedrooms: PropertyGuruBedroomCount;
  moveInHorizon: PropertyGuruMoveInHorizon;
  lifestyle: PropertyGuruLifestyleCue[];
  financeReadiness: PropertyGuruFinanceReadiness;
  tonePreference: PropertyGuruTonePreset;
}

export type PropertyGuruSignalsPartial = Partial<PropertyGuruSignals>;
