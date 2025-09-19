import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { createRoot } from 'react-dom/client';
import { act } from 'react-dom/test-utils';

import { OnboardingFlow } from '@/components/onboarding/OnboardingFlow';
import * as onboardingApi from '@/lib/api/onboarding';
import type { FormPlan } from '@/lib/types/form';
import type { SessionState } from '@/lib/types/session';

const enqueueMock = jest.fn();
const flushMock = jest.fn(async () => undefined);
const disposeMock = jest.fn(async () => undefined);

const createTelemetryQueueMock = jest.fn((_: string) => ({
  enqueue: enqueueMock,
  flush: flushMock,
  dispose: disposeMock,
}));

jest.mock('@/lib/api/onboarding');
jest.mock('@/lib/telemetry/events', () => ({
  createTelemetryQueue: createTelemetryQueueMock,
  recordEvents: jest.fn(),
}));

const { createSession, fetchPlan, updateSession } = onboardingApi as jest.Mocked<typeof onboardingApi>;

const basicsPlan: FormPlan = {
  kind: 'render_step',
  step: {
    stepId: 'basics',
    title: 'Basics',
    description: 'Tell us about yourself',
    fields: [
      {
        kind: 'text',
        id: 'full_name',
        label: 'Full name',
        required: true,
        value: '',
      },
    ],
    primaryCta: { label: 'Continue', action: 'submit_step' },
  },
  stepper: [
    { id: 'basics', label: 'Basics', active: true, completed: false },
    { id: 'workspace', label: 'Workspace', active: false, completed: false },
  ],
};

const workspacePlan: FormPlan = {
  kind: 'render_step',
  step: {
    stepId: 'workspace',
    title: 'Workspace',
    description: 'Configure your workspace',
    fields: [
      {
        kind: 'text',
        id: 'workspace_name',
        label: 'Workspace name',
        value: '',
      },
    ],
    primaryCta: { label: 'Continue', action: 'submit_step' },
    secondaryCta: { label: 'Back', action: 'back' },
  },
  stepper: [
    { id: 'basics', label: 'Basics', active: false, completed: true },
    { id: 'workspace', label: 'Workspace', active: true, completed: false },
  ],
};

const createSessionState = (overrides: Partial<SessionState> = {}): SessionState => ({
  id: 'session-id',
  createdAt: new Date(),
  lastActivityAt: new Date(),
  currentStep: 'basics',
  completedSteps: [],
  values: {},
  events: [],
  ...overrides,
});

const flushPromises = async () => {
  await act(async () => { await Promise.resolve(); });
};

describe('OnboardingFlow', () => {
  let container: HTMLDivElement;
  let root: ReturnType<typeof createRoot> | null = null;

  const renderComponent = async () => {
    await act(async () => {
      root = createRoot(container);
      root.render(<OnboardingFlow />);
    });
    await flushPromises();
  };

  beforeEach(() => {
    jest.clearAllMocks();
    window.sessionStorage.clear();
    container = document.createElement('div');
    document.body.appendChild(container);
  });

  afterEach(() => {
    if (root) {
      act(() => {
        root?.unmount();
      });
      root = null;
    }
    document.body.removeChild(container);
  });

  it('creates a session and renders the initial plan', async () => {
    createSession.mockResolvedValue({ sessionId: 'session-123', session: createSessionState({ id: 'session-123' }) });
    fetchPlan.mockResolvedValue({ plan: basicsPlan, source: 'rules' });

    await renderComponent();

    expect(container.textContent).toContain('Basics');
    expect(createSession).toHaveBeenCalledTimes(1);
    expect(fetchPlan).toHaveBeenCalledWith('session-123', { strategy: 'rules' });
    expect(createTelemetryQueueMock).toHaveBeenCalledWith('session-123');
  });

  it('submits a step and requests the next plan', async () => {
    createSession.mockResolvedValue({ sessionId: 'session-123', session: createSessionState({ id: 'session-123' }) });
    fetchPlan.mockResolvedValueOnce({ plan: basicsPlan, source: 'rules' });
    fetchPlan.mockResolvedValueOnce({ plan: workspacePlan, source: 'rules' });
    updateSession.mockResolvedValue({ session: createSessionState({ id: 'session-123' }) });

    await renderComponent();

    const input = container.querySelector('input#full_name') as HTMLInputElement;
    expect(input).toBeTruthy();

    await act(async () => {
      input.value = 'Ada Lovelace';
      input.dispatchEvent(new Event('input', { bubbles: true }));
    });

    const submitButton = Array.from(container.querySelectorAll('button')).find(button =>
      button.textContent?.match(/continue/i)
    );
    expect(submitButton).toBeTruthy();

    await act(async () => {
      submitButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    await flushPromises();

    expect(updateSession).toHaveBeenCalledWith(
      expect.objectContaining({
        sessionId: 'session-123',
        values: expect.objectContaining({ full_name: 'Ada Lovelace' }),
        addCompletedStep: 'basics',
      })
    );

    expect(fetchPlan).toHaveBeenNthCalledWith(1, 'session-123', { strategy: 'rules' });
    expect(fetchPlan).toHaveBeenLastCalledWith('session-123', { strategy: 'llm' });
    expect(container.textContent).toContain('Workspace');
    const capturedEvents = enqueueMock.mock.calls.map(call => call[0] as Record<string, unknown>);
    expect(capturedEvents.some(event => event.type === 'field_change' && event.fieldId === 'full_name')).toBe(true);
    expect(capturedEvents.some(event => event.type === 'step_submit' && event.stepId === 'basics')).toBe(true);
  });

  it('handles back navigation by trimming completed steps', async () => {
    window.sessionStorage.setItem('gen_ui_session_id', 'session-456');
    createSession.mockResolvedValue({ sessionId: 'session-456', session: createSessionState({ id: 'session-456' }) });
    fetchPlan.mockResolvedValueOnce({ plan: workspacePlan, source: 'rules' });
    fetchPlan.mockResolvedValueOnce({ plan: basicsPlan, source: 'rules' });
    updateSession.mockResolvedValue({ session: createSessionState({ id: 'session-456' }) });

    await renderComponent();

    const backButton = Array.from(container.querySelectorAll('button')).find(button =>
      button.textContent?.match(/back/i)
    );
    expect(backButton).toBeTruthy();

    await act(async () => {
      backButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    await flushPromises();

    expect(updateSession).toHaveBeenCalledWith(
      expect.objectContaining({
        sessionId: 'session-456',
        completedSteps: [],
        currentStep: 'basics',
      })
    );

    expect(fetchPlan).toHaveBeenNthCalledWith(1, 'session-456', { strategy: 'rules' });
    expect(fetchPlan).toHaveBeenLastCalledWith('session-456', { strategy: 'llm' });
    const backEvents = enqueueMock.mock.calls
      .map(call => call[0] as Record<string, unknown>)
      .filter(event => event.type === 'step_back');
    expect(backEvents.length).toBeGreaterThan(0);
    expect(backEvents[0]).toMatchObject({ fromStepId: 'workspace', toStepId: 'basics' });
  });
});
