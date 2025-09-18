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
import type { SessionState, UserPersona } from '@/lib/types/session';
import { createDebugger } from '@/lib/utils/debug';

const debug = createDebugger('RulesEngine');

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
  const persona = detectPersona(session.values);

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
      return createBasicsStep(session);
    case STEP_IDS.WORKSPACE:
      return createWorkspaceStep(session, persona);
    case STEP_IDS.PREFERENCES:
      return createPreferencesStep(session, persona);
    case STEP_IDS.REVIEW:
      return createReviewStep(session);
    case STEP_IDS.SUCCESS:
      return createSuccessStep(session);
    default:
      debug(`Unhandled step: ${nextStepId}`);
      return null;
  }
}

/**
 * Detect user persona based on collected values.
 */
function detectPersona(values: Record<string, unknown>): UserPersona {
  const primaryUse = values[FIELD_IDS.PRIMARY_USE] as string;

  // Personal use indicates explorer persona
  if (primaryUse === 'personal') {
    return 'explorer';
  }

  // Team, client, enterprise indicate team persona
  if (primaryUse === 'team' || primaryUse === 'client' || primaryUse === 'enterprise') {
    return 'team';
  }

  // Default to explorer if not specified
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
    stepper: buildStepperItems(session),
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
    stepper: buildStepperItems(session),
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
    stepper: buildStepperItems(session),
  };
}

/**
 * Create the review step with summary of collected data.
 */
function createReviewStep(session: SessionState): FormPlan {
  const summary: Array<{ label: string; value: string }> = [];

  // Add basic information
  if (session.values[FIELD_IDS.FULL_NAME]) {
    summary.push({
      label: 'Name',
      value: session.values[FIELD_IDS.FULL_NAME] as string,
    });
  }

  if (session.values[FIELD_IDS.EMAIL]) {
    summary.push({
      label: 'Email',
      value: session.values[FIELD_IDS.EMAIL] as string,
    });
  }

  if (session.values[FIELD_IDS.ROLE]) {
    const role = ROLE_OPTIONS.find(
      opt => opt.value === session.values[FIELD_IDS.ROLE]
    );
    summary.push({
      label: 'Role',
      value: role?.label || session.values[FIELD_IDS.ROLE] as string,
    });
  }

  if (session.values[FIELD_IDS.PRIMARY_USE]) {
    const useCase = USE_CASE_OPTIONS.find(
      opt => opt.value === session.values[FIELD_IDS.PRIMARY_USE]
    );
    summary.push({
      label: 'Primary Use',
      value: useCase?.label || session.values[FIELD_IDS.PRIMARY_USE] as string,
    });
  }

  // Add workspace information
  if (session.values[FIELD_IDS.WORKSPACE_NAME]) {
    summary.push({
      label: 'Workspace',
      value: session.values[FIELD_IDS.WORKSPACE_NAME] as string,
    });
  }

  if (session.values[FIELD_IDS.COMPANY]) {
    summary.push({
      label: 'Company',
      value: session.values[FIELD_IDS.COMPANY] as string,
    });
  }

  if (session.values[FIELD_IDS.TEAM_SIZE]) {
    const teamSize = TEAM_SIZE_OPTIONS.find(
      opt => opt.value === session.values[FIELD_IDS.TEAM_SIZE]
    );
    summary.push({
      label: 'Team Size',
      value: teamSize?.label || session.values[FIELD_IDS.TEAM_SIZE] as string,
    });
  }

  if (session.values[FIELD_IDS.PROJECT_TYPE]) {
    const projectType = PROJECT_TYPE_OPTIONS.find(
      opt => opt.value === session.values[FIELD_IDS.PROJECT_TYPE]
    );
    summary.push({
      label: 'Project Type',
      value: projectType?.label || session.values[FIELD_IDS.PROJECT_TYPE] as string,
    });
  }

  // Add preferences
  if (session.values[FIELD_IDS.THEME]) {
    const theme = THEME_OPTIONS.find(
      opt => opt.value === session.values[FIELD_IDS.THEME]
    );
    summary.push({
      label: 'Theme',
      value: theme?.label || session.values[FIELD_IDS.THEME] as string,
    });
  }

  if (session.values[FIELD_IDS.FEATURES] && Array.isArray(session.values[FIELD_IDS.FEATURES])) {
    const features = session.values[FIELD_IDS.FEATURES] as string[];
    if (features.length > 0) {
      const featureLabels = features
        .map(f => FEATURE_OPTIONS.find(opt => opt.value === f)?.label || f)
        .join(', ');
      summary.push({
        label: 'Features',
        value: featureLabels,
      });
    }
  }

  return {
    kind: 'review',
    summary,
    stepper: buildStepperItems(session),
  };
}

/**
 * Create the success step with persona-aware message.
 */
function createSuccessStep(session: SessionState): FormPlan {
  const persona = detectPersona(session.values);
  const name = session.values[FIELD_IDS.FULL_NAME] as string || 'there';
  const firstName = name.split(' ')[0];

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
function buildStepperItems(session: SessionState): StepperItem[] {
  const persona = detectPersona(session.values);

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
    active: stepId === session.currentStep,
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