import { propertyGuruPlanSchema } from '@/lib/property-guru/prompt';
import { PROPERTY_GURU_FLOW_FIXTURES } from '@/lib/store/__fixtures__/property-guru/flows';
import { mapPropertyGuruPlanToSearchPayload } from '@/lib/utils/property-guru-plan-mapper';
import { extractPropertyGuruSignals } from '@/lib/utils/property-guru-signals';

describe('PropertyGuru flow playbooks', () => {
  it.each(PROPERTY_GURU_FLOW_FIXTURES)('%s scenario stays coherent', fixture => {
    const { signals } = extractPropertyGuruSignals(fixture.prompt);

    expect(signals.location.primaryArea).toBe(fixture.expectations.location);

    if (fixture.expectations.propertyType) {
      expect(signals.propertyType).toBe(fixture.expectations.propertyType);
    }

    if (typeof fixture.expectations.bedrooms === 'number') {
      expect(signals.bedrooms).toBe(fixture.expectations.bedrooms);
    }

    if (fixture.expectations.lifestyleIncludes) {
      fixture.expectations.lifestyleIncludes.forEach(cue => {
        expect(signals.lifestyle).toEqual(expect.arrayContaining([cue]));
      });
    }

    if (fixture.expectations.tone) {
      expect(signals.tonePreference).toBe(fixture.expectations.tone);
    }

    const plan = propertyGuruPlanSchema.parse(fixture.plan);
    const { payload, defaultsApplied } = mapPropertyGuruPlanToSearchPayload({ plan, signals });

    expect(plan.plan_actions.primary.label).toBe(fixture.expectations.primaryCta);

    if (fixture.expectations.secondaryCtas) {
      const labels = plan.plan_actions.secondary.map(action => action.label);
      fixture.expectations.secondaryCtas.forEach(label => {
        expect(labels).toEqual(expect.arrayContaining([label]));
      });
    }

    expect(payload.nextSteps).toEqual(expect.arrayContaining(fixture.expectations.nextSteps));
    expect(payload.copy.tone).toBe(fixture.expectations.copyTone);

    if (fixture.expectations.defaultsApplied) {
      expect(defaultsApplied).toEqual(expect.arrayContaining(fixture.expectations.defaultsApplied));
    } else {
      expect(defaultsApplied).toEqual([]);
    }

    expect({
      filters: payload.filters,
      highlights: payload.highlights,
      nextSteps: payload.nextSteps,
      copy: payload.copy,
    }).toMatchSnapshot();
  });
});
