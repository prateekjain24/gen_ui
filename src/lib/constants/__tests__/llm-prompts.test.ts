import { SYSTEM_PROMPTS } from '@/lib/constants/llm';

describe('FORM_ORCHESTRATOR prompt', () => {
  const prompt = SYSTEM_PROMPTS.FORM_ORCHESTRATOR;

  it('directs usage of propose_next_step tool', () => {
    expect(prompt).toContain("propose_next_step");
  });

  it('documents persona guidance', () => {
    expect(prompt).toMatch(/Persona playbook/i);
    expect(prompt).toMatch(/Explorer/i);
    expect(prompt).toMatch(/Team/i);
  });

  it('captures behavioral signal instructions', () => {
    expect(prompt).toMatch(/Hesitation/);
    expect(prompt).toMatch(/corrections/);
    expect(prompt).toMatch(/Abandonment/);
  });

  it('lists critical constraints', () => {
    expect(prompt).toMatch(/Only reference step IDs/);
    expect(prompt).toMatch(/Limit fields to ≤6/);
    expect(prompt).toMatch(/Reasoning must be concise/);
    expect(prompt).toMatch(/metadata\.decision/);
  });

  it('describes the output contract', () => {
    expect(prompt).toMatch(/Output contract/);
    expect(prompt).toMatch(/metadata: \{ reasoning, confidence, persona, decision \}/);
    expect(prompt).toMatch(/stepConfig: \{ stepId, title/);
  });
});
