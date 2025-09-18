/**
 * Unit tests for Rules Engine step builder functions
 *
 * Tests the deterministic step generation functions that create
 * form steps based on session state and user persona.
 */

import { describe, it, expect } from '@jest/globals';

import { getNextStepPlan } from '../rules';

import {
  FIELD_IDS,
  ROLE_OPTIONS,
  USE_CASE_OPTIONS,
  TEAM_SIZE_OPTIONS,
  PROJECT_TYPE_OPTIONS,
  FEATURE_OPTIONS,
  NOTIFICATION_OPTIONS,
  STEP_IDS
} from '@/lib/constants';
import type { SessionState } from '@/lib/types/session';

// Helper function to create a mock session
function createMockSession(overrides?: Partial<SessionState>): SessionState {
  const now = new Date();
  return {
    id: 'test-session-123',
    createdAt: now,
    lastActivityAt: now,
    currentStep: 'basics',
    completedSteps: [],
    values: {},
    events: [],
    ...overrides,
  };
}

describe('Rules Engine - Step Builders', () => {
  describe('createBasicsStep', () => {
    it('should create basics step with all required fields', () => {
      const session = createMockSession();
      const plan = getNextStepPlan(session);

      expect(plan).not.toBeNull();
      expect(plan?.kind).toBe('render_step');

      if (plan?.kind === 'render_step') {
        expect(plan.step.stepId).toBe(STEP_IDS.BASICS);
        expect(plan.step.title).toBe("Welcome! Let's get started");
        expect(plan.step.fields).toHaveLength(4);

        // Check field IDs
        const fieldIds = plan.step.fields.map(f => f.id);
        expect(fieldIds).toContain(FIELD_IDS.FULL_NAME);
        expect(fieldIds).toContain(FIELD_IDS.EMAIL);
        expect(fieldIds).toContain(FIELD_IDS.ROLE);
        expect(fieldIds).toContain(FIELD_IDS.PRIMARY_USE);

        // Check required flags
        const nameField = plan.step.fields.find(f => f.id === FIELD_IDS.FULL_NAME);
        expect(nameField?.required).toBe(true);

        const emailField = plan.step.fields.find(f => f.id === FIELD_IDS.EMAIL);
        expect(emailField?.required).toBe(true);
      }
    });

    it('should preserve existing values from session', () => {
      const session = createMockSession({
        values: {
          [FIELD_IDS.FULL_NAME]: 'John Doe',
          [FIELD_IDS.EMAIL]: 'john@example.com',
          [FIELD_IDS.ROLE]: 'eng',
        },
      });

      const plan = getNextStepPlan(session);

      if (plan?.kind === 'render_step') {
        const nameField = plan.step.fields.find(f => f.id === FIELD_IDS.FULL_NAME);
        expect(nameField?.kind === 'text' && nameField.value).toBe('John Doe');

        const emailField = plan.step.fields.find(f => f.id === FIELD_IDS.EMAIL);
        expect(emailField?.kind === 'text' && emailField.value).toBe('john@example.com');

        const roleField = plan.step.fields.find(f => f.id === FIELD_IDS.ROLE);
        expect(roleField?.kind === 'select' && roleField.value).toBe('eng');
      }
    });

    it('should have correct field types and options', () => {
      const session = createMockSession();
      const plan = getNextStepPlan(session);

      if (plan?.kind === 'render_step') {
        const roleField = plan.step.fields.find(f => f.id === FIELD_IDS.ROLE);
        expect(roleField?.kind).toBe('select');
        if (roleField?.kind === 'select') {
          expect(roleField.options).toEqual(ROLE_OPTIONS);
        }

        const primaryUseField = plan.step.fields.find(f => f.id === FIELD_IDS.PRIMARY_USE);
        expect(primaryUseField?.kind).toBe('radio');
        if (primaryUseField?.kind === 'radio') {
          expect(primaryUseField.options).toEqual(USE_CASE_OPTIONS);
          expect(primaryUseField.orientation).toBe('vertical');
        }
      }
    });

    it('should execute in less than 100ms', () => {
      const session = createMockSession();
      const start = performance.now();
      const plan = getNextStepPlan(session);
      const duration = performance.now() - start;

      expect(duration).toBeLessThan(100);
      expect(plan).not.toBeNull();
    });
  });

  describe('createWorkspaceStep', () => {
    it('should show minimal fields for explorer persona', () => {
      const session = createMockSession({
        completedSteps: [STEP_IDS.BASICS],
        values: {
          [FIELD_IDS.PRIMARY_USE]: 'personal', // Only a few values triggers explorer
          [FIELD_IDS.FULL_NAME]: 'John Doe',
        },
      });

      const plan = getNextStepPlan(session);

      if (plan?.kind === 'render_step') {
        expect(plan.step.stepId).toBe(STEP_IDS.WORKSPACE);
        expect(plan.step.fields).toHaveLength(1); // Only workspace_name

        const workspaceField = plan.step.fields[0];
        expect(workspaceField.id).toBe(FIELD_IDS.WORKSPACE_NAME);
        expect(workspaceField.required).toBe(true);

        // Explorer gets simpler title
        expect(plan.step.title).toBe('Name your workspace');
      }
    });

    it('should show all fields for team persona', () => {
      const session = createMockSession({
        completedSteps: [STEP_IDS.BASICS],
        values: {
          // More than 5 values triggers team persona
          [FIELD_IDS.PRIMARY_USE]: 'team',
          [FIELD_IDS.FULL_NAME]: 'Jane Smith',
          [FIELD_IDS.EMAIL]: 'jane@example.com',
          [FIELD_IDS.ROLE]: 'pm',
          [FIELD_IDS.COMPANY]: 'Acme Inc',
          [FIELD_IDS.WORKSPACE_NAME]: 'Team Workspace', // Team fields trigger team persona
        },
      });

      const plan = getNextStepPlan(session);

      if (plan?.kind === 'render_step') {
        expect(plan.step.stepId).toBe(STEP_IDS.WORKSPACE);
        expect(plan.step.fields).toHaveLength(4); // workspace_name, company, team_size, project_type

        const fieldIds = plan.step.fields.map(f => f.id);
        expect(fieldIds).toContain(FIELD_IDS.WORKSPACE_NAME);
        expect(fieldIds).toContain(FIELD_IDS.COMPANY);
        expect(fieldIds).toContain(FIELD_IDS.TEAM_SIZE);
        expect(fieldIds).toContain(FIELD_IDS.PROJECT_TYPE);

        // Team gets collaborative title
        expect(plan.step.title).toBe('Set up your team workspace');
      }
    });

    it('should include back button', () => {
      const session = createMockSession({
        completedSteps: [STEP_IDS.BASICS],
        values: {
          [FIELD_IDS.PRIMARY_USE]: 'personal',
          [FIELD_IDS.FULL_NAME]: 'Test User',
        },
      });

      const plan = getNextStepPlan(session);

      if (plan?.kind === 'render_step') {
        expect(plan.step.secondaryCta).toBeDefined();
        expect(plan.step.secondaryCta?.label).toBe('Back');
        expect(plan.step.secondaryCta?.action).toBe('back');
      }
    });

    it('should use correct field options', () => {
      const session = createMockSession({
        completedSteps: [STEP_IDS.BASICS],
        values: {
          [FIELD_IDS.PRIMARY_USE]: 'team',
          [FIELD_IDS.FULL_NAME]: 'Test User',
          [FIELD_IDS.EMAIL]: 'test@example.com',
          [FIELD_IDS.ROLE]: 'eng',
          [FIELD_IDS.COMPANY]: 'Test Co',
          [FIELD_IDS.WORKSPACE_NAME]: 'Test Workspace',
        },
      });

      const plan = getNextStepPlan(session);

      if (plan?.kind === 'render_step') {
        const teamSizeField = plan.step.fields.find(f => f.id === FIELD_IDS.TEAM_SIZE);
        if (teamSizeField?.kind === 'select') {
          expect(teamSizeField.options).toEqual(TEAM_SIZE_OPTIONS);
        }

        const projectTypeField = plan.step.fields.find(f => f.id === FIELD_IDS.PROJECT_TYPE);
        if (projectTypeField?.kind === 'select') {
          expect(projectTypeField.options).toEqual(PROJECT_TYPE_OPTIONS);
        }
      }
    });
  });

  describe('createPreferencesStep', () => {
    it('should be skipped for explorer persona', () => {
      const session = createMockSession({
        completedSteps: [STEP_IDS.BASICS, STEP_IDS.WORKSPACE],
        values: {
          // Few values = explorer persona
          [FIELD_IDS.PRIMARY_USE]: 'personal',
          [FIELD_IDS.FULL_NAME]: 'Explorer User',
        },
      });

      const plan = getNextStepPlan(session);

      // Should skip to review step
      if (plan?.kind === 'review') {
        expect(plan.summary).toBeDefined();
      } else {
        // If not review yet, it should not be preferences
        expect(plan?.kind).not.toBe('render_step');
      }
    });

    it('should be shown for team persona', () => {
      const session = createMockSession({
        completedSteps: [STEP_IDS.BASICS, STEP_IDS.WORKSPACE],
        values: {
          // Many values = team persona
          [FIELD_IDS.PRIMARY_USE]: 'team',
          [FIELD_IDS.FULL_NAME]: 'Team User',
          [FIELD_IDS.EMAIL]: 'team@example.com',
          [FIELD_IDS.ROLE]: 'pm',
          [FIELD_IDS.COMPANY]: 'Team Co',
          [FIELD_IDS.WORKSPACE_NAME]: 'Team Space',
        },
      });

      const plan = getNextStepPlan(session);

      if (plan?.kind === 'render_step') {
        expect(plan.step.stepId).toBe(STEP_IDS.PREFERENCES);
        expect(plan.step.title).toBe('Customize your experience');

        // Should have 3 fields: features, theme, notifications
        expect(plan.step.fields).toHaveLength(3);

        const fieldIds = plan.step.fields.map(f => f.id);
        expect(fieldIds).toContain(FIELD_IDS.FEATURES);
        expect(fieldIds).toContain(FIELD_IDS.THEME);
        expect(fieldIds).toContain(FIELD_IDS.NOTIFICATIONS);
      }
    });

    it('should handle checkbox fields with array values', () => {
      const session = createMockSession({
        completedSteps: [STEP_IDS.BASICS, STEP_IDS.WORKSPACE],
        values: {
          [FIELD_IDS.PRIMARY_USE]: 'team',
          [FIELD_IDS.FULL_NAME]: 'Test User',
          [FIELD_IDS.EMAIL]: 'test@example.com',
          [FIELD_IDS.ROLE]: 'eng',
          [FIELD_IDS.COMPANY]: 'Test Co',
          [FIELD_IDS.WORKSPACE_NAME]: 'Test Space',
          [FIELD_IDS.FEATURES]: ['ai_assist', 'automation'],
          [FIELD_IDS.NOTIFICATIONS]: ['email_updates'],
        },
      });

      const plan = getNextStepPlan(session);

      if (plan?.kind === 'render_step') {
        const featuresField = plan.step.fields.find(f => f.id === FIELD_IDS.FEATURES);
        if (featuresField?.kind === 'checkbox') {
          expect(featuresField.values).toEqual(['ai_assist', 'automation']);
          expect(featuresField.options).toEqual(FEATURE_OPTIONS);
        }

        const notificationsField = plan.step.fields.find(f => f.id === FIELD_IDS.NOTIFICATIONS);
        if (notificationsField?.kind === 'checkbox') {
          expect(notificationsField.values).toEqual(['email_updates']);
          expect(notificationsField.options).toEqual(NOTIFICATION_OPTIONS);
        }
      }
    });

    it('should have correct field orientations', () => {
      const session = createMockSession({
        completedSteps: [STEP_IDS.BASICS, STEP_IDS.WORKSPACE],
        values: {
          [FIELD_IDS.PRIMARY_USE]: 'team',
          [FIELD_IDS.FULL_NAME]: 'Test User',
          [FIELD_IDS.EMAIL]: 'test@example.com',
          [FIELD_IDS.ROLE]: 'eng',
          [FIELD_IDS.COMPANY]: 'Test Co',
          [FIELD_IDS.WORKSPACE_NAME]: 'Test Space',
        },
      });

      const plan = getNextStepPlan(session);

      if (plan?.kind === 'render_step') {
        const featuresField = plan.step.fields.find(f => f.id === FIELD_IDS.FEATURES);
        if (featuresField?.kind === 'checkbox') {
          expect(featuresField.orientation).toBe('vertical');
        }

        const themeField = plan.step.fields.find(f => f.id === FIELD_IDS.THEME);
        if (themeField?.kind === 'radio') {
          expect(themeField.orientation).toBe('horizontal');
        }
      }
    });
  });

  describe('createReviewStep', () => {
    it('should generate summary with correct labels', () => {
      const session = createMockSession({
        completedSteps: [STEP_IDS.BASICS, STEP_IDS.WORKSPACE, STEP_IDS.PREFERENCES],
        values: {
          [FIELD_IDS.FULL_NAME]: 'Jane Smith',
          [FIELD_IDS.EMAIL]: 'jane@example.com',
          [FIELD_IDS.ROLE]: 'pm',
          [FIELD_IDS.PRIMARY_USE]: 'team',
          [FIELD_IDS.WORKSPACE_NAME]: 'Product Team',
          [FIELD_IDS.TEAM_SIZE]: '6-20',
          [FIELD_IDS.THEME]: 'dark',
        },
      });

      const plan = getNextStepPlan(session);

      if (plan?.kind === 'review') {
        expect(plan.summary).toBeDefined();
        expect(plan.summary.length).toBeGreaterThan(0);

        // Check that labels are mapped correctly
        const roleItem = plan.summary.find(item => item.label === 'Role');
        expect(roleItem?.value).toBe('Product Manager'); // Not 'pm'

        const teamSizeItem = plan.summary.find(item => item.label === 'Team Size');
        expect(teamSizeItem?.value).toBe('6-20 people'); // Not just '6-20'

        const themeItem = plan.summary.find(item => item.label === 'Theme');
        expect(themeItem?.value).toBe('Dark'); // Not just 'dark'
      }
    });

    it('should handle missing optional fields gracefully', () => {
      const session = createMockSession({
        completedSteps: [STEP_IDS.BASICS, STEP_IDS.WORKSPACE, STEP_IDS.PREFERENCES],
        values: {
          [FIELD_IDS.FULL_NAME]: 'John Doe',
          [FIELD_IDS.EMAIL]: 'john@example.com',
          [FIELD_IDS.ROLE]: 'eng',
          [FIELD_IDS.PRIMARY_USE]: 'personal',
          [FIELD_IDS.WORKSPACE_NAME]: 'My Workspace',
        },
      });

      const plan = getNextStepPlan(session);

      if (plan?.kind === 'review') {
        // Should not include undefined values
        const summaryLabels = plan.summary.map(item => item.label);
        expect(summaryLabels).not.toContain('Company'); // Not provided
        expect(summaryLabels).not.toContain('Team Size'); // Not provided

        // Should include provided values
        expect(summaryLabels).toContain('Name');
        expect(summaryLabels).toContain('Email');
        expect(summaryLabels).toContain('Role');
        expect(summaryLabels).toContain('Workspace');
      }
    });

    it('should format array values correctly', () => {
      const session = createMockSession({
        completedSteps: [STEP_IDS.BASICS, STEP_IDS.WORKSPACE, STEP_IDS.PREFERENCES],
        values: {
          [FIELD_IDS.FULL_NAME]: 'Test User',
          [FIELD_IDS.EMAIL]: 'test@example.com',
          [FIELD_IDS.ROLE]: 'eng',
          [FIELD_IDS.PRIMARY_USE]: 'team',
          [FIELD_IDS.FEATURES]: ['ai_assist', 'automation', 'analytics'],
        },
      });

      const plan = getNextStepPlan(session);

      if (plan?.kind === 'review') {
        const featuresItem = plan.summary.find(item => item.label === 'Features');
        expect(featuresItem?.value).toContain('AI Assistant');
        expect(featuresItem?.value).toContain('Workflow Automation');
        expect(featuresItem?.value).toContain('Advanced Analytics');
      }
    });
  });

  describe('createSuccessStep', () => {
    it('should show team message for team persona', () => {
      const session = createMockSession({
        completedSteps: [STEP_IDS.BASICS, STEP_IDS.WORKSPACE, STEP_IDS.PREFERENCES, STEP_IDS.REVIEW],
        values: {
          [FIELD_IDS.FULL_NAME]: 'Alice Johnson',
          [FIELD_IDS.PRIMARY_USE]: 'team',
        },
        persona: 'team',
      });

      const plan = getNextStepPlan(session);

      expect(plan?.kind).toBe('success');
      if (plan?.kind === 'success') {
        expect(plan.message).toContain('Welcome aboard, Alice!');
        expect(plan.message).toContain('team workspace');
      }
    });

    it('should show explorer message for explorer persona', () => {
      const session = createMockSession({
        completedSteps: [STEP_IDS.BASICS, STEP_IDS.WORKSPACE, STEP_IDS.PREFERENCES, STEP_IDS.REVIEW],
        values: {
          [FIELD_IDS.FULL_NAME]: 'Bob Smith',
          [FIELD_IDS.PRIMARY_USE]: 'personal',
        },
        persona: 'explorer',
      });

      const plan = getNextStepPlan(session);

      expect(plan?.kind).toBe('success');
      if (plan?.kind === 'success') {
        expect(plan.message).toContain("You're all set, Bob!");
        expect(plan.message).toContain('Start exploring');
      }
    });

    it('should handle missing name gracefully', () => {
      const session = createMockSession({
        completedSteps: [STEP_IDS.BASICS, STEP_IDS.WORKSPACE, STEP_IDS.PREFERENCES, STEP_IDS.REVIEW],
        values: {
          [FIELD_IDS.PRIMARY_USE]: 'personal',
        },
        persona: 'explorer',
      });

      const plan = getNextStepPlan(session);

      if (plan?.kind === 'success') {
        expect(plan.message).toContain('there'); // Fallback name
      }
    });

    it('should extract first name correctly', () => {
      const session = createMockSession({
        completedSteps: [STEP_IDS.BASICS, STEP_IDS.WORKSPACE, STEP_IDS.PREFERENCES, STEP_IDS.REVIEW],
        values: {
          [FIELD_IDS.FULL_NAME]: 'Mary Jane Watson',
          [FIELD_IDS.PRIMARY_USE]: 'team',
        },
        persona: 'team',
      });

      const plan = getNextStepPlan(session);

      if (plan?.kind === 'success') {
        expect(plan.message).toContain('Mary'); // First name only
        expect(plan.message).not.toContain('Jane');
        expect(plan.message).not.toContain('Watson');
      }
    });
  });

  describe('buildStepperItems', () => {
    it('should hide preferences step for explorer persona', () => {
      const session = createMockSession({
        currentStep: STEP_IDS.WORKSPACE,
        completedSteps: [STEP_IDS.BASICS],
        values: {
          [FIELD_IDS.PRIMARY_USE]: 'personal',
          [FIELD_IDS.FULL_NAME]: 'Explorer',
        },
      });

      const plan = getNextStepPlan(session);

      if (plan && 'stepper' in plan) {
        const stepperIds = plan.stepper.map(item => item.id);
        expect(stepperIds).toContain(STEP_IDS.BASICS);
        expect(stepperIds).toContain(STEP_IDS.WORKSPACE);
        expect(stepperIds).toContain(STEP_IDS.REVIEW);
        expect(stepperIds).not.toContain(STEP_IDS.PREFERENCES); // Hidden for explorer
        expect(stepperIds).not.toContain(STEP_IDS.SUCCESS); // Never shown in stepper
      }
    });

    it('should show all steps for team persona', () => {
      const session = createMockSession({
        currentStep: STEP_IDS.WORKSPACE,
        completedSteps: [STEP_IDS.BASICS],
        values: {
          [FIELD_IDS.PRIMARY_USE]: 'team',
          [FIELD_IDS.FULL_NAME]: 'Team User',
          [FIELD_IDS.EMAIL]: 'team@example.com',
          [FIELD_IDS.ROLE]: 'pm',
          [FIELD_IDS.COMPANY]: 'Team Co',
          [FIELD_IDS.WORKSPACE_NAME]: 'Team Space',
        },
      });

      const plan = getNextStepPlan(session);

      if (plan && 'stepper' in plan) {
        const stepperIds = plan.stepper.map(item => item.id);
        expect(stepperIds).toContain(STEP_IDS.BASICS);
        expect(stepperIds).toContain(STEP_IDS.WORKSPACE);
        expect(stepperIds).toContain(STEP_IDS.PREFERENCES); // Shown for team
        expect(stepperIds).toContain(STEP_IDS.REVIEW);
        expect(stepperIds).not.toContain(STEP_IDS.SUCCESS); // Never shown in stepper
      }
    });

    it('should mark active and completed steps correctly', () => {
      const session = createMockSession({
        currentStep: STEP_IDS.WORKSPACE,
        completedSteps: [STEP_IDS.BASICS],
        values: {
          [FIELD_IDS.PRIMARY_USE]: 'team',
          [FIELD_IDS.FULL_NAME]: 'Team User',
          [FIELD_IDS.EMAIL]: 'team@example.com',
          [FIELD_IDS.ROLE]: 'pm',
          [FIELD_IDS.COMPANY]: 'Team Co',
          [FIELD_IDS.WORKSPACE_NAME]: 'Team Space',
        },
      });

      const plan = getNextStepPlan(session);

      if (plan && 'stepper' in plan) {
        const basicsStep = plan.stepper.find(item => item.id === STEP_IDS.BASICS);
        expect(basicsStep?.completed).toBe(true);
        expect(basicsStep?.active).toBe(false);

        const workspaceStep = plan.stepper.find(item => item.id === STEP_IDS.WORKSPACE);
        expect(workspaceStep?.completed).toBe(false);
        expect(workspaceStep?.active).toBe(true);

        const preferencesStep = plan.stepper.find(item => item.id === STEP_IDS.PREFERENCES);
        expect(preferencesStep?.completed).toBe(false);
        expect(preferencesStep?.active).toBe(false);
      }
    });
  });

  describe('Performance Tests', () => {
    it('should handle large session values efficiently', () => {
      const largeValues: Record<string, unknown> = {};
      for (let i = 0; i < 100; i++) {
        largeValues[`field_${i}`] = `value_${i}`;
      }

      const session = createMockSession({
        values: {
          ...largeValues,
          [FIELD_IDS.PRIMARY_USE]: 'team',
        },
      });

      const start = performance.now();
      const plan = getNextStepPlan(session);
      const duration = performance.now() - start;

      expect(duration).toBeLessThan(100);
      expect(plan).not.toBeNull();
    });

    it('should handle many completed steps efficiently', () => {
      // Use valid step IDs
      const validSteps = [STEP_IDS.BASICS, STEP_IDS.WORKSPACE, STEP_IDS.PREFERENCES];

      const session = createMockSession({
        completedSteps: validSteps,
        values: {
          [FIELD_IDS.PRIMARY_USE]: 'team',
          [FIELD_IDS.FULL_NAME]: 'Team User',
          [FIELD_IDS.EMAIL]: 'team@example.com',
          [FIELD_IDS.ROLE]: 'pm',
          [FIELD_IDS.COMPANY]: 'Team Co',
          [FIELD_IDS.WORKSPACE_NAME]: 'Team Space',
        },
      });

      const start = performance.now();
      const plan = getNextStepPlan(session);
      const duration = performance.now() - start;

      expect(duration).toBeLessThan(100);
      expect(plan).not.toBeNull();
      // Should return review step after all steps completed
      expect(plan?.kind).toBe('review');
    });

    it('should maintain performance with repeated calls', () => {
      const session = createMockSession({
        values: {
          [FIELD_IDS.PRIMARY_USE]: 'team',
        },
      });

      const durations: number[] = [];

      // Call 100 times
      for (let i = 0; i < 100; i++) {
        const start = performance.now();
        getNextStepPlan(session);
        durations.push(performance.now() - start);
      }

      // All calls should be under 100ms
      const maxDuration = Math.max(...durations);
      const avgDuration = durations.reduce((a, b) => a + b, 0) / durations.length;

      expect(maxDuration).toBeLessThan(100);
      expect(avgDuration).toBeLessThan(50); // Average should be much faster
    });
  });
});