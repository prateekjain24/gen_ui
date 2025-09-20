/**
 * PropertyGuru-specific constant lookups shared across extractor, UI, and telemetry.
 */

import type {
  PropertyGuruLifestyleCue,
  PropertyGuruMoveInHorizon,
  PropertyGuruPropertyType,
  PropertyGuruTonePreset,
} from '@/lib/types/property-guru';

export const PROPERTY_GURU_PROPERTY_TYPES: readonly PropertyGuruPropertyType[] = [
  'condo',
  'executive_condo',
  'hdb',
  'landed',
  'serviced_apartment',
  'co_living',
  'other',
] as const;

export const PROPERTY_GURU_LIFESTYLE_CUES: readonly PropertyGuruLifestyleCue[] = [
  'near_mrt',
  'near_schools',
  'childcare_ready',
  'family_friendly',
  'pet_friendly',
  'wheelchair_access',
  'healthcare_access',
  'green_spaces',
  'co_working',
  'serviced_amenities',
  'rental_hotspot',
  'move_in_ready',
  'renovation_friendly',
  'dual_city',
  'community_events',
] as const;

export const PROPERTY_GURU_TONE_PRESETS: readonly PropertyGuruTonePreset[] = [
  'reassuring',
  'data_driven',
  'concierge',
] as const;

export const PROPERTY_GURU_MOVE_IN_HORIZONS: readonly PropertyGuruMoveInHorizon[] = [
  'immediate',
  'three_months',
  'six_months',
  'year_plus',
  'flexible',
  'unspecified',
] as const;
