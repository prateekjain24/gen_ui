/**
 * Rules Engine Implementation
 *
 * Deterministic rules engine for the onboarding flow.
 * Provides <100ms response time without AI dependencies.
 * Serves as both the baseline for Phase 1 and fallback for Phase 2.
 */

import {
  STEP_IDS,
  DEFAULT_STEP_ORDER,
  FIELD_IDS,
  ROLE_OPTIONS,
  USE_CASE_OPTIONS,
  TEAM_SIZE_OPTIONS,
  PROJECT_TYPE_OPTIONS,
  FEATURE_OPTIONS,
  THEME_OPTIONS,
  NOTIFICATION_OPTIONS,
} from '@/lib/constants';
import type { FormPlan, Field, StepperItem } from '@/lib/types/form';
import { detectPersona as detectPersonaFromSession }
  from '@/lib/types/session';
import type { SessionState, UserPersona } from '@/lib/types/session';
import { createDebugger } from '@/lib/utils/debug';

const debug = createDebugger('RulesEngine');

/**
 * Performance benchmark wrapper for development mode
 */
function benchmark<T>(name: string, fn: () => T): T {
  if (process.env.NODE_ENV === 'development') {
    const start = performance.now();
    const result = fn();
    const duration = performance.now() - start;

    if (duration > 100) {
      console.warn(`[Rules Engine] ${name} exceeded 100ms: ${duration.toFixed(2)}ms`);
    }

    debug(`${name}: ${duration.toFixed(2)}ms`);
    return result;
  }
  return fn();
}

/**
 * Main entry point for the rules engine.
 * Returns the next step plan based on session state.
 */
export function getNextStepPlan(session: SessionState): FormPlan | null {
  const start = performance.now();
  const plan = getNextStep(session);
  const duration = performance.now() - start;

  if (duration > 100) {
    console.warn(`[Rules Engine] Slow response: ${duration.toFixed(2)}ms`);
  }

  // Only log in development/debugging
  if (process.env.NODE_ENV === 'development') {
    // eslint-disable-next-line no-console
    console.log(`[Plan Source: rules] (${duration.toFixed(2)}ms)`);
  }
  debug(`Generated plan for session ${session.id} in ${duration.toFixed(2)}ms`);

  return plan;
}

/**
 * Core decision function that determines the next step.
 */
function getNextStep(session: SessionState): FormPlan | null {
  // Handle initial state - no steps completed
  if (!session.completedSteps || session.completedSteps.length === 0) {
    return createBasicsStep(session);
  }

  // Get the last completed step
  const lastCompleted = session.completedSteps[session.completedSteps.length - 1];
  const currentIndex = DEFAULT_STEP_ORDER.indexOf(lastCompleted as typeof DEFAULT_STEP_ORDER[number]);

  if (currentIndex === -1) {
    debug(`Unknown step: ${lastCompleted}`);
    return null; // Unknown step
  }

  // Check if we've completed all steps
  if (lastCompleted === STEP_IDS.REVIEW) {
    return createSuccessStep(session);
  }

  if (currentIndex >= DEFAULT_STEP_ORDER.length - 1) {
    return createSuccessStep(session);
  }

  // Get next step in sequence
  const nextStepIndex = currentIndex + 1;
  const nextStepId = DEFAULT_STEP_ORDER[nextStepIndex];

  // Detect persona based on primary_use field
  const persona = detectPersona(session);

  // Check if we should skip this step based on persona
  if (shouldSkipStep(nextStepId, persona)) {
    // Simulate completing the skipped step and recurse
    const updatedSession = {
      ...session,
      completedSteps: [...session.completedSteps, nextStepId]
    };
    return getNextStep(updatedSession);
  }

  // Build the appropriate step
  switch (nextStepId) {
    case STEP_IDS.BASICS:
      return benchmark('createBasicsStep', () => createBasicsStep(session));
    case STEP_IDS.WORKSPACE:
      return benchmark('createWorkspaceStep', () => createWorkspaceStep(session, persona));
    case STEP_IDS.PREFERENCES:
      return benchmark('createPreferencesStep', () => createPreferencesStep(session, persona));
    case STEP_IDS.REVIEW:
      return benchmark('createReviewStep', () => createReviewStep(session));
    case STEP_IDS.SUCCESS:
      return benchmark('createSuccessStep', () => createSuccessStep(session));
    default:
      debug(`Unhandled step: ${nextStepId}`);
      return null;
  }
}

/**
 * Detect user persona based on collected values.
 */
function detectPersona(session: SessionState): UserPersona {
  if (session.persona) {
    return session.persona;
  }

  const inferred = detectPersonaFromSession(session);
  if (inferred) {
    return inferred;
  }

  const primaryUse = session.values[FIELD_IDS.PRIMARY_USE];
  if (typeof primaryUse === 'string') {
    if (['team', 'client', 'enterprise'].includes(primaryUse)) {
      return 'team';
    }
    if (primaryUse === 'personal') {
      return 'explorer';
    }
  }

  return 'explorer';
}

/**
 * Determine if a step should be skipped based on persona.
 */
function shouldSkipStep(stepId: string, persona: UserPersona): boolean {
  if (persona === 'explorer') {
    // Explorers skip preferences step
    if (stepId === STEP_IDS.PREFERENCES) {
      return true;
    }
  }

  return false;
}

/**
 * Create the basics step with initial fields.
 */
function createBasicsStep(session: SessionState): FormPlan {
  const fields: Field[] = [
    {
      kind: 'text',
      id: FIELD_IDS.FULL_NAME,
      label: 'Full Name',
      required: true,
      placeholder: 'John Doe',
      value: session.values[FIELD_IDS.FULL_NAME] as string,
      type: 'text',
    },
    {
      kind: 'text',
      id: FIELD_IDS.EMAIL,
      label: 'Email',
      required: true,
      type: 'email',
      placeholder: 'john@example.com',
      value: session.values[FIELD_IDS.EMAIL] as string,
    },
    {
      kind: 'select',
      id: FIELD_IDS.ROLE,
      label: 'Role',
      required: true,
      options: [...ROLE_OPTIONS],
      placeholder: 'Select your role',
      value: session.values[FIELD_IDS.ROLE] as string,
    },
    {
      kind: 'radio',
      id: FIELD_IDS.PRIMARY_USE,
      label: 'Primary Use Case',
      required: true,
      options: [...USE_CASE_OPTIONS],
      value: session.values[FIELD_IDS.PRIMARY_USE] as string,
      orientation: 'vertical',
    },
  ];

  return {
    kind: 'render_step',
    step: {
      stepId: STEP_IDS.BASICS,
      title: 'Welcome! Let\'s get started',
      description: 'Tell us a bit about yourself',
      fields,
      primaryCta: {
        label: 'Continue',
        action: 'submit_step',
      },
    },
    stepper: buildStepperItems(session, STEP_IDS.BASICS),
  };
}

/**
 * Create the workspace step with persona-aware fields.
 */
function createWorkspaceStep(session: SessionState, persona: UserPersona): FormPlan {
  const fields: Field[] = [];

  // Always include workspace name
  fields.push({
    kind: 'text',
    id: FIELD_IDS.WORKSPACE_NAME,
    label: 'Workspace Name',
    required: true,
    placeholder: 'My Workspace',
    value: session.values[FIELD_IDS.WORKSPACE_NAME] as string,
  });

  // Team persona gets additional fields
  if (persona === 'team') {
    fields.push(
      {
        kind: 'text',
        id: FIELD_IDS.COMPANY,
        label: 'Company',
        required: false,
        placeholder: 'Acme Inc.',
        value: session.values[FIELD_IDS.COMPANY] as string,
      },
      {
        kind: 'select',
        id: FIELD_IDS.TEAM_SIZE,
        label: 'Team Size',
        required: true,
        options: [...TEAM_SIZE_OPTIONS],
        placeholder: 'Select team size',
        value: session.values[FIELD_IDS.TEAM_SIZE] as string,
      },
      {
        kind: 'select',
        id: FIELD_IDS.PROJECT_TYPE,
        label: 'Project Type',
        required: false,
        options: [...PROJECT_TYPE_OPTIONS],
        placeholder: 'Select project type',
        value: session.values[FIELD_IDS.PROJECT_TYPE] as string,
      }
    );
  }

  return {
    kind: 'render_step',
    step: {
      stepId: STEP_IDS.WORKSPACE,
      title: persona === 'team' ? 'Set up your team workspace' : 'Name your workspace',
      description: persona === 'team'
        ? 'Configure your collaborative environment'
        : 'Choose a name for your personal workspace',
      fields,
      primaryCta: {
        label: 'Continue',
        action: 'submit_step',
      },
      secondaryCta: {
        label: 'Back',
        action: 'back',
      },
    },
    stepper: buildStepperItems(session, STEP_IDS.WORKSPACE),
  };
}

/**
 * Create the preferences step (team persona only).
 */
function createPreferencesStep(session: SessionState, _persona: UserPersona): FormPlan {
  const fields: Field[] = [
    {
      kind: 'checkbox',
      id: FIELD_IDS.FEATURES,
      label: 'Enable Features',
      options: [...FEATURE_OPTIONS],
      values: session.values[FIELD_IDS.FEATURES] as string[] || [],
      orientation: 'vertical',
    },
    {
      kind: 'radio',
      id: FIELD_IDS.THEME,
      label: 'Interface Theme',
      options: [...THEME_OPTIONS],
      value: session.values[FIELD_IDS.THEME] as string || 'auto',
      orientation: 'horizontal',
    },
    {
      kind: 'checkbox',
      id: FIELD_IDS.NOTIFICATIONS,
      label: 'Notification Preferences',
      options: [...NOTIFICATION_OPTIONS],
      values: session.values[FIELD_IDS.NOTIFICATIONS] as string[] || [],
      orientation: 'vertical',
    },
  ];

  return {
    kind: 'render_step',
    step: {
      stepId: STEP_IDS.PREFERENCES,
      title: 'Customize your experience',
      description: 'Choose your preferred settings',
      fields,
      primaryCta: {
        label: 'Continue',
        action: 'submit_step',
      },
      secondaryCta: {
        label: 'Back',
        action: 'back',
      },
    },
    stepper: buildStepperItems(session, STEP_IDS.PREFERENCES),
  };
}

/**
 * Create the review step with summary of collected data.
 */
function createReviewStep(session: SessionState): FormPlan {
  const summary: Array<{ label: string; value: string }> = [];

  const addItem = (label: string, value?: string | string[]) => {
    if (!value || (Array.isArray(value) && value.length === 0)) {
      return;
    }

    const normalizedValue = Array.isArray(value) ? value.join(', ') : value;
    summary.push({ label, value: normalizedValue });
  };

  const getOptionLabel = (
    options: ReadonlyArray<{ value: string; label: string }>,
    value?: unknown
  ) => {
    if (typeof value !== 'string') return undefined;
    return options.find(opt => opt.value === value)?.label ?? value;
  };

  // Basics
  addItem('Name', session.values[FIELD_IDS.FULL_NAME] as string | undefined);
  addItem('Email', session.values[FIELD_IDS.EMAIL] as string | undefined);
  addItem('Role', getOptionLabel(ROLE_OPTIONS, session.values[FIELD_IDS.ROLE]));
  addItem('Primary Use', getOptionLabel(USE_CASE_OPTIONS, session.values[FIELD_IDS.PRIMARY_USE]));

  // Workspace
  addItem('Workspace', session.values[FIELD_IDS.WORKSPACE_NAME] as string | undefined);
  addItem('Company', session.values[FIELD_IDS.COMPANY] as string | undefined);
  addItem('Team Size', getOptionLabel(TEAM_SIZE_OPTIONS, session.values[FIELD_IDS.TEAM_SIZE]));
  addItem('Project Type', getOptionLabel(PROJECT_TYPE_OPTIONS, session.values[FIELD_IDS.PROJECT_TYPE]));

  // Preferences
  const featureValues = session.values[FIELD_IDS.FEATURES];
  if (Array.isArray(featureValues) && featureValues.length) {
    const labels = featureValues
      .map(value => getOptionLabel(FEATURE_OPTIONS, value))
      .filter(Boolean) as string[];
    addItem('Features', labels);
  }

  const notificationValues = session.values[FIELD_IDS.NOTIFICATIONS];
  if (Array.isArray(notificationValues) && notificationValues.length) {
    const labels = notificationValues
      .map(value => getOptionLabel(NOTIFICATION_OPTIONS, value))
      .filter(Boolean) as string[];
    addItem('Notifications', labels);
  }

  addItem('Theme', getOptionLabel(THEME_OPTIONS, session.values[FIELD_IDS.THEME]));

  return {
    kind: 'review',
    summary,
    stepper: buildStepperItems(session, STEP_IDS.REVIEW),
  };
}

/**
 * Create the success step with persona-aware message.
 */
function createSuccessStep(session: SessionState): FormPlan {
  const persona = session.persona ?? detectPersona(session);
  const name = (session.values[FIELD_IDS.FULL_NAME] as string | undefined)?.trim();
  const firstName = name ? name.split(/\s+/)[0] : 'there';

  const message = persona === 'team'
    ? `Welcome aboard, ${firstName}! Your team workspace is ready.`
    : `You're all set, ${firstName}! Start exploring your workspace.`;

  return {
    kind: 'success',
    message,
  };
}

/**
 * Build stepper items for progress indication.
 */
function buildStepperItems(session: SessionState, activeStepId?: string): StepperItem[] {
  const persona = session.persona ?? detectPersona(session);
  const currentActiveStep = activeStepId ?? session.currentStep;

  // Filter steps based on persona
  const visibleSteps = DEFAULT_STEP_ORDER.filter(stepId => {
    // Don't show success in stepper
    if (stepId === STEP_IDS.SUCCESS) return false;
    // Hide preferences for explorer
    if (persona === 'explorer' && stepId === STEP_IDS.PREFERENCES) return false;
    return true;
  });

  return visibleSteps.map((stepId) => ({
    id: stepId,
    label: getStepLabel(stepId),
    active: stepId === currentActiveStep,
    completed: session.completedSteps.includes(stepId),
  }));
}

/**
 * Get display label for a step.
 */
function getStepLabel(stepId: string): string {
  const labels: Record<string, string> = {
    [STEP_IDS.BASICS]: 'Basics',
    [STEP_IDS.WORKSPACE]: 'Workspace',
    [STEP_IDS.PREFERENCES]: 'Preferences',
    [STEP_IDS.REVIEW]: 'Review',
    [STEP_IDS.SUCCESS]: 'Complete',
  };
  return labels[stepId] || stepId;
}
