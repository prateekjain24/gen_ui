import { FIELD_ID_LIST } from '@/lib/constants/fields';
import { STEP_IDS } from '@/lib/constants';
import { ONBOARDING_TOOLS, proposeNextStepTool } from '@/lib/policy/tools';

describe('propose_next_step tool schema', () => {
  it('is registered in ONBOARDING_TOOLS map', () => {
    expect(ONBOARDING_TOOLS.propose_next_step).toBe(proposeNextStepTool);
  });

  it('defines required metadata and stepConfig objects', () => {
    const { parameters } = proposeNextStepTool;
    expect(parameters.type).toBe('object');
    expect(parameters.required).toEqual(['metadata', 'stepConfig']);
    expect(parameters.additionalProperties).toBe(false);
  });

  it('enforces whitelisted step IDs and field IDs', () => {
    const { parameters } = proposeNextStepTool;
    const stepIdEnum = parameters.properties?.stepConfig.properties?.stepId.enum;
    const fieldIdEnum = parameters.properties?.stepConfig.properties?.fields.items.properties?.id.enum;

    expect(stepIdEnum).toEqual(Object.values(STEP_IDS));
    expect(fieldIdEnum).toEqual(FIELD_ID_LIST);
  });

  it('restricts button actions to known values', () => {
    const { parameters } = proposeNextStepTool;
    const ctaEnum = parameters.properties?.stepConfig.properties?.primaryCta.properties?.action.enum;

    expect(ctaEnum).toEqual(['submit_step', 'back', 'skip', 'complete']);
  });

  it('disables additional properties across nested schemas', () => {
    const { parameters } = proposeNextStepTool;

    expect(parameters.additionalProperties).toBe(false);
    expect(parameters.properties?.metadata.additionalProperties).toBe(false);
    expect(parameters.properties?.stepConfig.additionalProperties).toBe(false);
    expect(parameters.properties?.stepConfig.properties?.fields.items.additionalProperties).toBe(false);
    expect(parameters.properties?.stepConfig.properties?.fields.items.properties?.options.items.additionalProperties).toBe(
      false
    );
  });
});
