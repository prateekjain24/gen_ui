import { buildPropertyGuruPlanPrompt, propertyGuruPlanSchema } from '@/lib/property-guru/prompt';
import { extractPropertyGuruSignals } from '@/lib/utils/property-guru-signals';

const TAMPINES_PROMPT =
  'Expecting twins in 4 months, want a 3BR condo near Tampines MRT, budget around 1.4M but I\'ll stretch for turnkey. Need good preschool options and low-reno.';

describe('PropertyGuru plan preset fixtures', () => {
  it('produces prompt context containing extracted signals', () => {
    const { signals } = extractPropertyGuruSignals(TAMPINES_PROMPT);
    const planPrompt = buildPropertyGuruPlanPrompt({ prompt: TAMPINES_PROMPT, signals });

    expect(planPrompt).toMatchSnapshot();
  });

  it('validates golden plan structure for the Tampines MRT twins scenario', () => {
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

    expect(plan).toMatchSnapshot();
  });
});
