import type { PropertyGuruPlanTemplate } from '@/lib/property-guru/prompt';
import type { PropertyGuruLifestyleCue, PropertyGuruTonePreset } from '@/lib/types/property-guru';

interface PropertyGuruFlowExpectations {
  location: string;
  propertyType?: string;
  bedrooms?: number;
  lifestyleIncludes?: PropertyGuruLifestyleCue[];
  tone?: PropertyGuruTonePreset;
  nextSteps: string[];
  copyTone: PropertyGuruTonePreset;
  primaryCta: string;
  secondaryCtas?: string[];
  defaultsApplied?: string[];
}

export interface PropertyGuruFlowFixture {
  id: string;
  prompt: string;
  plan: PropertyGuruPlanTemplate;
  expectations: PropertyGuruFlowExpectations;
}

export const PROPERTY_GURU_FLOW_FIXTURES: PropertyGuruFlowFixture[] = [
  {
    id: 'twins_near_tampines',
    prompt:
      "Expecting twins in 4 months, want a 3BR condo near Tampines MRT, budget around 1.4M but I'll stretch for turnkey. Need good preschool options and low-renovation.",
    plan: {
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
    },
    expectations: {
      location: 'Tampines',
      propertyType: 'condo',
      bedrooms: 3,
      lifestyleIncludes: ['near_mrt', 'childcare_ready', 'family_friendly', 'move_in_ready'],
      nextSteps: ['viewListings', 'mortgagePreCheck', 'scheduleTour'],
      copyTone: 'reassuring',
      primaryCta: 'Preview curated Tampines listings',
      secondaryCtas: ['Book PropertyGuru Finance consult', 'Schedule neighbourhood tour'],
    },
  },
  {
    id: 'split_city_worker',
    prompt:
      'Splitting time between Singapore and KL, need a 1BR serviced apartment along the Thomson-East Coast TEL line, want co-working nearby and flexible lease; budget SGD 3.2K monthly.',
    plan: {
      intent_summary: 'Balance your split-city lifestyle with serviced TEL options.',
      essentials: {
        title: 'Lock these in first',
        items: [
          {
            label: 'TEL anchor',
            value: 'Within 1km of Thomson-East Coast Line stations',
            helper: 'Stay near direct airport links for quick KL runs.',
          },
          {
            label: 'Monthly lease budget',
            value: 'SGD 3,200 serviced apartment',
            helper: 'Keep rent aligned with flexible stay expectations.',
          },
          {
            label: 'Layout',
            value: '1 bedroom serviced apartment',
            helper: 'Ensure concierge, housekeeping, and on-demand amenities.',
          },
        ],
      },
      lifestyle_filters: {
        title: 'Remote work essentials',
        highlights: ['Co-working access', 'Serviced amenities', 'Flexible lease terms'],
        helper: 'Toggle extras when you need concierge support or hot desk passes.',
      },
      plan_actions: {
        primary: {
          label: 'View serviced apartments near TEL',
          description: 'See TEL-adjacent units with concierge and co-working perks.',
        },
        secondary: [
          {
            label: 'Arrange remote video tour',
            description: 'Line up virtual walkthroughs while you are in KL.',
          },
          {
            label: 'Book PropertyGuru concierge consult',
            description: 'Get help balancing flexible lease terms across cities.',
          },
        ],
      },
      micro_copy: {
        reassurance: 'We will flag concierge-ready TEL units as soon as they refresh.',
        follow_up: 'Expect mid-week digests and concierge nudges when new serviced stock appears.',
      },
    },
    expectations: {
      location: 'Thomson-east Coast Line',
      propertyType: 'serviced_apartment',
      bedrooms: 1,
      lifestyleIncludes: ['dual_city', 'co_working', 'serviced_amenities'],
      nextSteps: ['viewListings', 'scheduleTour', 'expertConsult'],
      copyTone: 'reassuring',
      primaryCta: 'View serviced apartments near TEL',
      secondaryCtas: ['Arrange remote video tour', 'Book PropertyGuru concierge consult'],
      defaultsApplied: ['filters.districts'],
    },
  },
  {
    id: 'yield_investor',
    prompt:
      'Looking for a 2BR resale condo in Queenstown under 1.3M, strong rental demand, okay with minor reno, want data on yield and past transactions.',
    plan: {
      intent_summary: 'Spot 2BR yield winners in Queenstown under SGD 1.3M.',
      essentials: {
        title: 'Dial in the fundamentals',
        items: [
          {
            label: 'District focus',
            value: 'District 3 – Queenstown resale stock',
            helper: 'Locks in proven rental demand around MRT and business parks.',
          },
          {
            label: 'Price ceiling',
            value: 'SGD 1.25M – 1.3M',
            helper: 'Keep listings inside your yield target while leaving room for fees.',
          },
          {
            label: 'Layout',
            value: '2 bedroom resale condo',
            helper: 'Choose efficient floorplans tenants favour.',
          },
        ],
      },
      lifestyle_filters: {
        title: 'Investor toggles',
        highlights: ['Rental hotspot indicators', 'Reno-friendly layouts', 'Yield comparables'],
        helper: 'Switch on reports and recent transactions while you shortlist.',
      },
      plan_actions: {
        primary: {
          label: 'Review high-yield Queenstown listings',
          description: 'Shortlist data-backed units with tenant demand signals.',
        },
        secondary: [
          {
            label: 'Download rental transaction digest',
            description: 'Export recent transactions and yield benchmarks.',
          },
          {
            label: 'Book investor strategy consult',
            description: 'Walk through financing and renovation math with specialists.',
          },
        ],
      },
      micro_copy: {
        reassurance: 'We surface units where yield forecasts and tenant demand stay strong.',
        follow_up: 'Receive new comparables and rent trend alerts every week.',
      },
    },
    expectations: {
      location: 'Queenstown',
      propertyType: 'condo',
      bedrooms: 2,
      lifestyleIncludes: ['rental_hotspot'],
      tone: 'data_driven',
      nextSteps: ['viewListings', 'expertConsult'],
      copyTone: 'data_driven',
      primaryCta: 'Review high-yield Queenstown listings',
      secondaryCtas: ['Download rental transaction digest', 'Book investor strategy consult'],
    },
  },
  {
    id: 'multigenerational_accessibility',
    prompt:
      'Retiring parents moving in, need 4BR near Bishan, lift access, wheelchair friendly, near hospitals and parks; budget 2.3M; we can wait 6-9 months.',
    plan: {
      intent_summary: 'Plan a Bishan move-in that keeps the whole family comfortable.',
      essentials: {
        title: 'Lock these in early',
        items: [
          {
            label: 'Location radius',
            value: '3km around Bishan with hospital access',
            helper: 'Keeps you minutes from healthcare and park connectors.',
          },
          {
            label: 'Layout & access',
            value: '4 bedroom homes with lift access',
            helper: 'Filter for barrier-free entries and elder-friendly blocks.',
          },
          {
            label: 'Budget',
            value: 'Up to SGD 2.3M with buffer for improvements',
            helper: 'Leaves room for accessibility retrofits if needed.',
          },
        ],
      },
      lifestyle_filters: {
        title: 'Comfort toggles',
        highlights: ['Wheelchair-friendly routes', 'Hospitals within 10 minutes', 'Park connectors & greenery'],
        helper: 'Keep wellness cues on so the plan balances care and downtime.',
      },
      plan_actions: {
        primary: {
          label: 'View accessibility-ready Bishan homes',
          description: 'Opens listings vetted for lift access and elder-friendly layouts.',
        },
        secondary: [
          {
            label: 'Schedule hospital-nearby tour',
            description: 'Plot a visit that checks commute times to clinics.',
          },
          {
            label: 'Book accessibility renovation consult',
            description: 'Line up pros for grab bars or layout tweaks before move-in.',
          },
        ],
      },
      micro_copy: {
        reassurance: 'We emphasise accessibility and calm routes so parents settle in comfortably.',
        follow_up: 'Expect fortnightly updates while you wait for the right listing.',
      },
    },
    expectations: {
      location: 'Bishan',
      bedrooms: 4,
      lifestyleIncludes: ['wheelchair_access', 'healthcare_access', 'green_spaces'],
      nextSteps: ['viewListings', 'scheduleTour', 'expertConsult'],
      copyTone: 'reassuring',
      primaryCta: 'View accessibility-ready Bishan homes',
      secondaryCtas: ['Schedule hospital-nearby tour', 'Book accessibility renovation consult'],
    },
  },
  {
    id: 'first_time_ec',
    prompt:
      'First time buying, looking at executive condos (EC) in Punggol around 1M, not pre-approved, two kids in primary school, want to stay near primary schools, want grants guidance and weekly listing digests.',
    plan: {
      intent_summary: 'Guide your first EC purchase in Punggol with grants in mind.',
      essentials: {
        title: 'Start with these',
        items: [
          {
            label: 'Location focus',
            value: 'Punggol ECs near schools',
            helper: 'Stay close to primary schools and community hubs.',
          },
          {
            label: 'Budget band',
            value: 'Around SGD 1.0M with grant support',
            helper: 'Keep monthly repayments friendly while grants process.',
          },
          {
            label: 'Financing prep',
            value: 'Line up HDB and PropertyGuru Finance guidance',
            helper: 'Know your grants and approval path before locking a unit.',
          },
        ],
      },
      lifestyle_filters: {
        title: 'Family priorities',
        highlights: ['Nearby primary schools', 'Family amenities', 'Weekly digest ready'],
        helper: 'Keep these toggled so the plan nudges you with kid-friendly picks.',
      },
      plan_actions: {
        primary: {
          label: 'Save your EC shortlist',
          description: 'Create a shortlist that refreshes as new launches appear.',
        },
        secondary: [
          {
            label: 'Start HDB grant checklist',
            description: 'Work through grant eligibility with guided steps.',
          },
          {
            label: 'Book PropertyGuru mortgage chat',
            description: 'Get pre-approval coaching before you commit.',
          },
        ],
      },
      micro_copy: {
        reassurance: 'We will nudge you on grants and eligibility as you progress.',
        follow_up: 'Weekly digests keep new EC options top of mind.',
      },
    },
    expectations: {
      location: 'Punggol',
      propertyType: 'executive_condo',
      lifestyleIncludes: ['near_schools', 'family_friendly'],
      nextSteps: ['savedSearch', 'startHdbGrantChecklist'],
      copyTone: 'reassuring',
      primaryCta: 'Save your EC shortlist',
      secondaryCtas: ['Start HDB grant checklist', 'Book PropertyGuru mortgage chat'],
    },
  },
];
