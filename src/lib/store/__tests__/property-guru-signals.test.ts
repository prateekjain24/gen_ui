import { PROPERTY_GURU_LIFESTYLE_CUES, PROPERTY_GURU_PROPERTY_TYPES } from '@/lib/constants';
import type { PropertyGuruSignals } from '@/lib/types/property-guru';

describe('PropertyGuruSignals contract', () => {
  it('locks the schema for the Tampines MRT twins scenario', () => {
    const twinsScenario: PropertyGuruSignals = {
      location: {
        primaryArea: 'Tampines',
        anchorPoints: ['Tampines MRT'],
        radiusKm: 1.5,
        districtIds: [18],
      },
      price: {
        currency: 'SGD',
        min: 1200000,
        max: 1400000,
        stretchOk: true,
      },
      propertyType: 'condo',
      bedrooms: 3,
      moveInHorizon: 'three_months',
      lifestyle: ['near_mrt', 'childcare_ready', 'family_friendly', 'move_in_ready'],
      financeReadiness: 'needs_guidance',
      tonePreference: 'reassuring',
    };

    expect(twinsScenario).toMatchInlineSnapshot(`
      {
        "bedrooms": 3,
        "financeReadiness": "needs_guidance",
        "lifestyle": [
          "near_mrt",
          "childcare_ready",
          "family_friendly",
          "move_in_ready",
        ],
        "location": {
          "anchorPoints": [
            "Tampines MRT",
          ],
          "districtIds": [
            18,
          ],
          "primaryArea": "Tampines",
          "radiusKm": 1.5,
        },
        "moveInHorizon": "three_months",
        "price": {
          "currency": "SGD",
          "max": 1400000,
          "min": 1200000,
          "stretchOk": true,
        },
        "propertyType": "condo",
        "tonePreference": "reassuring",
      }
    `);
  });

  it('exposes canonical lookup tables for downstream use', () => {
    expect(PROPERTY_GURU_PROPERTY_TYPES).toContain('executive_condo');
    expect(PROPERTY_GURU_LIFESTYLE_CUES).toContain('wheelchair_access');
  });
});
