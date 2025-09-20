import { propertyGuruPlanSchema } from '@/lib/property-guru/prompt';
import { mapPropertyGuruPlanToSearchPayload } from '@/lib/utils/property-guru-plan-mapper';
import { extractPropertyGuruSignals } from '@/lib/utils/property-guru-signals';

const TAMPINES_PROMPT =
  "Expecting twins in 4 months, want a 3BR condo near Tampines MRT, budget around 1.4M but I'll stretch for turnkey. Need good preschool options and low-reno.";

describe('mapPropertyGuruPlanToSearchPayload', () => {
  it('maps twins scenario into search payload without defaults', () => {
    const { signals } = extractPropertyGuruSignals(TAMPINES_PROMPT);

    const plan = propertyGuruPlanSchema.parse({
      intent_summary: 'Focused search: 3BR turnkey condo near Tampines MRT within ~SGD 1.4M.',
      essentials: {
        title: 'Tune the essentials first',
        items: [
          {
            label: 'Location radius',
            value: '1.5km around Tampines MRT',
            helper: 'Keeps you within walking distance and near childcare hubs.',
          },
          {
            label: 'Price band',
            value: 'SGD 1.2M – 1.4M (stretch +5% for turnkey units)',
            helper: 'Set alerts at SGD 1.45M so turnkey options surface quickly.',
          },
          {
            label: 'Bedrooms & layout',
            value: '3 bedrooms, turnkey finish',
            helper: 'Filter for renovated family layouts with dual nursery potential.',
          },
        ],
      },
      lifestyle_filters: {
        title: 'Lifestyle filters to toggle',
        highlights: [
          'Childcare-ready developments',
          'Family-friendly facilities',
          'Low-renovation inventory',
        ],
        helper: 'Prioritise projects near preschools with playgrounds and service corridors.',
      },
      plan_actions: {
        primary: {
          label: 'Preview curated Tampines listings',
          description: 'Opens a shortlist with MRT proximity and school filters applied.',
        },
        secondary: [
          {
            label: 'Book PropertyGuru Finance consult',
            description: 'Align financing buffers for turnkey units and twins arrival timeline.',
          },
          {
            label: 'Schedule neighbourhood tour',
            description: 'Compare childcare options and transport during a guided visit.',
          },
        ],
      },
      micro_copy: {
        reassurance: 'Listings refresh daily; concierge flags new turnkey options instantly.',
        follow_up: 'Saved searches send weekly MRT-adjacent family picks plus preschool intel.',
      },
    });

    const result = mapPropertyGuruPlanToSearchPayload({ plan, signals });

    expect(result.defaultsApplied).toHaveLength(0);
    expect(result.payload.filters.area).toBe('Tampines');
    expect(result.payload.filters.districts).toEqual([18]);
    expect(result.payload.filters.maxPrice).toBe(1_540_000);
    expect(result.payload.filters.propertyType).toBe('condo');
    expect(result.payload.filters.bedrooms).toBe(3);
    expect(result.payload.highlights).toEqual(
      expect.arrayContaining(['Childcare-ready developments', 'Near MRT', 'Family-friendly'])
    );
    expect(result.payload.nextSteps).toEqual(['viewListings', 'mortgagePreCheck', 'scheduleTour']);
    expect(result.payload.copy.hero).toContain('Tampines');
  });

  it('tracks defaults when signals are missing and removes mortgage CTA for pre-approved seekers', () => {
    const prompt =
      'Already pre-approved, browsing ideas for a future move somewhere peaceful with parks. Budget flexible if the right place appears.';
    const { signals } = extractPropertyGuruSignals(prompt);

    const plan = propertyGuruPlanSchema.parse({
      intent_summary: 'Let’s explore calm neighbourhoods that fit your future move.',
      essentials: {
        title: 'Start with rough settings',
        items: [
          {
            label: 'Location radius',
            value: '5km around preferred neighbourhoods',
            helper: 'Widen until you find a few shortlists to save.',
          },
        ],
      },
      lifestyle_filters: {
        title: 'Lifestyle ideas',
        highlights: ['Green spaces', 'Quiet communities'],
        helper: 'Toggle the cues that make a neighbourhood feel like home.',
      },
      plan_actions: {
        primary: {
          label: 'Save an inspiration shortlist',
          description: 'Collect listings you like for later review.',
        },
        secondary: [
          {
            label: 'Start mortgage check',
            description: 'Confirm repayments and financing confidence.',
          },
        ],
      },
      micro_copy: {
        reassurance: 'We will keep an eye out and surface calm, park-side options.',
        follow_up: 'Expect a light weekly digest with new ideas.',
      },
    });

    const result = mapPropertyGuruPlanToSearchPayload({ plan, signals });

    expect(result.payload.nextSteps).toEqual(['savedSearch']);
    expect(result.defaultsApplied).toEqual(
      expect.arrayContaining(['filters.districts', 'filters.price', 'filters.propertyType', 'filters.bedrooms'])
    );
  });
});
