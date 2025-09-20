import type { PromptSignalsExtractedEvent } from '@/lib/types/events';
import { extractPropertyGuruSignals } from '@/lib/utils/property-guru-signals';

const now = () => new Date('2025-01-01T00:00:00.000Z');

describe('extractPropertyGuruSignals', () => {
  it('parses urgent twin mover scenario and emits telemetry', () => {
    const prompt =
      'Expecting twins in 4 months, want a 3BR condo near Tampines MRT, budget around 1.4M but I\'ll stretch for turnkey. Need good preschool options and low-reno.';

    const telemetryLogger = jest.fn<void, [PromptSignalsExtractedEvent]>();

    const { signals, summaries } = extractPropertyGuruSignals(prompt, {
      sessionId: 'session-123',
      telemetryLogger,
      now,
    });

    expect(signals.location.primaryArea).toBe('Tampines');
    expect(signals.location.anchorPoints).toContain('Tampines MRT');
    expect(signals.price.max).toBe(1_400_000);
    expect(signals.price.stretchOk).toBe(true);
    expect(signals.propertyType).toBe('condo');
    expect(signals.bedrooms).toBe(3);
    expect(signals.lifestyle).toEqual(
      expect.arrayContaining(['near_mrt', 'childcare_ready', 'family_friendly', 'move_in_ready'])
    );

    const locationSummary = summaries.find(({ key }) => key === 'propertyGuru.location');
    expect(locationSummary?.confidence).toBeGreaterThan(0.5);

    expect(telemetryLogger).toHaveBeenCalledTimes(1);
    expect(telemetryLogger).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'prompt_signals_extracted',
        sessionId: 'session-123',
        signals: expect.arrayContaining([
          expect.objectContaining({ key: 'propertyGuru.location' }),
        ]),
      })
    );
  });

  it('detects multi-generational accessibility cues', () => {
    const prompt =
      'Retiring parents moving in, need 4BR near Bishan, lift access, wheelchair friendly, near hospitals and parks; budget 2.3M; we can wait 6-9 months.';

    const { signals } = extractPropertyGuruSignals(prompt, { now });

    expect(signals.location.primaryArea).toBe('Bishan');
    expect(signals.price.max).toBe(2_300_000);
    expect(signals.propertyType).toBe('condo');
    expect(signals.bedrooms).toBe(4);
    expect(signals.moveInHorizon).toBe('year_plus');
    expect(signals.lifestyle).toEqual(
      expect.arrayContaining(['wheelchair_access', 'healthcare_access', 'green_spaces', 'family_friendly'])
    );
    expect(signals.tonePreference).toBe('reassuring');
  });

  it('recognises split-city remote worker lifestyle signals', () => {
    const prompt =
      'Splitting time between Singapore and KL, need a 1BR serviced apartment near TEL, want co-working nearby and flexible lease; budget SGD 3.2K monthly.';

    const { signals } = extractPropertyGuruSignals(prompt, { now });

    expect(signals.propertyType).toBe('serviced_apartment');
    expect(signals.bedrooms).toBe(1);
    expect(signals.lifestyle).toEqual(
      expect.arrayContaining(['co_working', 'serviced_amenities', 'dual_city'])
    );
    expect(signals.price.max).toBe(3_200);
    expect(signals.moveInHorizon).toBe('flexible');
  });
});
