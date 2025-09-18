/**
 * Integration tests for Rules Engine
 *
 * Tests complete user flows through the onboarding process,
 * including persona detection, step progression, and state preservation.
 */

import { describe, it, expect } from '@jest/globals';

import { getNextStepPlan } from '../rules';

import {
  FIELD_IDS,
  STEP_IDS,
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

// Helper function to simulate submitting a step
function submitStep(session: SessionState, values: Record<string, unknown>): SessionState {
  const plan = getNextStepPlan(session);
  if (!plan || plan.kind !== 'render_step') {
    throw new Error('Expected render_step plan');
  }

  const currentStep = plan.step.stepId;

  // Only add to completed if not already there
  const completedSteps = session.completedSteps.includes(currentStep)
    ? session.completedSteps
    : [...session.completedSteps, currentStep];

  return {
    ...session,
    currentStep,  // Keep the current step
    completedSteps,
    values: { ...session.values, ...values },
    lastActivityAt: new Date(),
  };
}

describe('Rules Engine Integration Tests', () => {
  describe('Complete Explorer Persona Flow', () => {
    it('should complete minimal onboarding for explorer persona', () => {
      let session = createMockSession();

      // Step 1: Basics
      let plan = getNextStepPlan(session);
      expect(plan?.kind).toBe('render_step');
      if (plan?.kind === 'render_step') {
        expect(plan.step.stepId).toBe(STEP_IDS.BASICS);
        expect(plan.step.fields).toHaveLength(4);
      }

      // Submit basics with minimal info (explorer = <3 values)
      session = submitStep(session, {
        [FIELD_IDS.FULL_NAME]: 'Quick User',
        [FIELD_IDS.EMAIL]: 'quick@example.com',
      });

      // Step 2: Workspace (minimal fields for explorer)
      plan = getNextStepPlan(session);
      expect(plan?.kind).toBe('render_step');
      if (plan?.kind === 'render_step') {
        expect(plan.step.stepId).toBe(STEP_IDS.WORKSPACE);
        expect(plan.step.fields).toHaveLength(1); // Only workspace name
        expect(plan.step.title).toContain('Name your workspace');
      }

      // Submit workspace - still keep values minimal
      session = submitStep(session, {});

      // Step 3: Should skip preferences and go to review
      plan = getNextStepPlan(session);
      expect(plan?.kind).toBe('review');
      if (plan?.kind === 'review') {
        expect(plan.summary).toBeDefined();

        // Check summary contains submitted values (only what was provided)
        const summaryLabels = plan.summary.map(item => item.label);
        expect(summaryLabels).toContain('Name');
        expect(summaryLabels).toContain('Email');
        // Note: Role wasn't submitted, so shouldn't be in summary
        expect(summaryLabels).not.toContain('Theme'); // Preferences were skipped

        // Check stepper doesn't include preferences
        const stepperIds = plan.stepper.map(item => item.id);
        expect(stepperIds).not.toContain(STEP_IDS.PREFERENCES);
      }

      // Submit review
      session = {
        ...session,
        completedSteps: [...session.completedSteps, STEP_IDS.REVIEW],
        currentStep: STEP_IDS.REVIEW,
      };

      // Step 4: Success
      plan = getNextStepPlan(session);
      expect(plan?.kind).toBe('success');
      if (plan?.kind === 'success') {
        expect(plan.message).toContain('Quick'); // First name
        expect(plan.message).toContain('Start exploring');
      }
    });
  });

  describe('Complete Team Persona Flow', () => {
    it('should complete full onboarding for team persona', () => {
      let session = createMockSession();

      // Step 1: Basics
      let plan = getNextStepPlan(session);
      expect(plan?.kind).toBe('render_step');

      // Submit basics with team intent
      session = submitStep(session, {
        [FIELD_IDS.FULL_NAME]: 'Team Lead',
        [FIELD_IDS.EMAIL]: 'lead@company.com',
        [FIELD_IDS.ROLE]: 'pm',
        [FIELD_IDS.PRIMARY_USE]: 'team',
      });

      // Add more values to trigger team persona
      session.values = {
        ...session.values,
        [FIELD_IDS.COMPANY]: 'Tech Corp',
        [FIELD_IDS.WORKSPACE_NAME]: 'Team Hub',
      };

      // Step 2: Workspace (full fields for team)
      plan = getNextStepPlan(session);
      expect(plan?.kind).toBe('render_step');
      if (plan?.kind === 'render_step') {
        expect(plan.step.stepId).toBe(STEP_IDS.WORKSPACE);
        expect(plan.step.fields).toHaveLength(4); // All fields
        expect(plan.step.title).toContain('team workspace');
      }

      // Submit workspace with team fields
      session = submitStep(session, {
        [FIELD_IDS.TEAM_SIZE]: '21-50',
        [FIELD_IDS.PROJECT_TYPE]: 'software',
      });

      // Step 3: Preferences (shown for team)
      plan = getNextStepPlan(session);
      expect(plan?.kind).toBe('render_step');
      if (plan?.kind === 'render_step') {
        expect(plan.step.stepId).toBe(STEP_IDS.PREFERENCES);
        expect(plan.step.title).toBe('Customize your experience');

        // Check field types
        const fieldIds = plan.step.fields.map(f => f.id);
        expect(fieldIds).toContain(FIELD_IDS.FEATURES);
        expect(fieldIds).toContain(FIELD_IDS.THEME);
        expect(fieldIds).toContain(FIELD_IDS.NOTIFICATIONS);
      }

      // Submit preferences
      session = submitStep(session, {
        [FIELD_IDS.FEATURES]: ['ai_assist', 'automation', 'analytics'],
        [FIELD_IDS.THEME]: 'dark',
        [FIELD_IDS.NOTIFICATIONS]: ['email_updates', 'email_mentions'],
      });

      // Step 4: Review
      plan = getNextStepPlan(session);
      expect(plan?.kind).toBe('review');
      if (plan?.kind === 'review') {
        // Check all values are included
        const summaryLabels = plan.summary.map(item => item.label);
        expect(summaryLabels).toContain('Team Size');
        expect(summaryLabels).toContain('Project Type');
        expect(summaryLabels).toContain('Theme');
        expect(summaryLabels).toContain('Features');

        // Check stepper includes all steps
        const stepperIds = plan.stepper.map(item => item.id);
        expect(stepperIds).toContain(STEP_IDS.PREFERENCES);
      }

      // Submit review
      session = {
        ...session,
        completedSteps: [...session.completedSteps, STEP_IDS.REVIEW],
        currentStep: STEP_IDS.REVIEW,
      };

      // Step 5: Success
      plan = getNextStepPlan(session);
      expect(plan?.kind).toBe('success');
      if (plan?.kind === 'success') {
        expect(plan.message).toContain('Welcome aboard');
        expect(plan.message).toContain('team workspace');
      }
    });
  });

  describe('Back Navigation', () => {
    it('should preserve values when navigating back', () => {
      let session = createMockSession();

      // Submit basics
      session = submitStep(session, {
        [FIELD_IDS.FULL_NAME]: 'Test User',
        [FIELD_IDS.EMAIL]: 'test@example.com',
        [FIELD_IDS.ROLE]: 'eng',
        [FIELD_IDS.PRIMARY_USE]: 'personal',
      });

      // Get workspace step
      let plan = getNextStepPlan(session);
      expect(plan?.kind).toBe('render_step');

      // Submit workspace
      session = submitStep(session, {
        [FIELD_IDS.WORKSPACE_NAME]: 'Initial Name',
      });

      // Now simulate going back to workspace
      session = {
        ...session,
        completedSteps: [STEP_IDS.BASICS], // Remove workspace from completed
        currentStep: STEP_IDS.WORKSPACE,
      };

      // Get workspace step again
      plan = getNextStepPlan(session);
      if (plan?.kind === 'render_step') {
        const workspaceField = plan.step.fields.find(f => f.id === FIELD_IDS.WORKSPACE_NAME);
        // Value should be preserved
        expect(workspaceField?.kind === 'text' && workspaceField.value).toBe('Initial Name');
      }

      // Update workspace name
      session = submitStep(session, {
        [FIELD_IDS.WORKSPACE_NAME]: 'Updated Name',
      });

      // Move to review
      plan = getNextStepPlan(session);
      if (plan?.kind === 'review') {
        const workspaceItem = plan.summary.find(item => item.label === 'Workspace');
        expect(workspaceItem?.value).toBe('Updated Name');
      }
    });
  });

  describe('Persona Detection Edge Cases', () => {
    it('should handle persona change mid-flow', () => {
      let session = createMockSession();

      // Start with explorer-like values
      session = submitStep(session, {
        [FIELD_IDS.FULL_NAME]: 'User',
        [FIELD_IDS.EMAIL]: 'user@example.com',
        [FIELD_IDS.ROLE]: 'eng',
        [FIELD_IDS.PRIMARY_USE]: 'personal',
      });

      let plan = getNextStepPlan(session);
      if (plan?.kind === 'render_step') {
        expect(plan.step.fields).toHaveLength(1); // Explorer workspace
      }

      // Now add team fields to trigger persona change
      session.values = {
        ...session.values,
        [FIELD_IDS.COMPANY]: 'Big Corp',
        [FIELD_IDS.TEAM_SIZE]: '51-100',
        [FIELD_IDS.WORKSPACE_NAME]: 'Enterprise Hub',
      };

      // Get workspace step again
      plan = getNextStepPlan(session);
      if (plan?.kind === 'render_step') {
        expect(plan.step.fields).toHaveLength(4); // Now team workspace
        expect(plan.step.title).toContain('team workspace');
      }
    });

    it('should handle empty/minimal session gracefully', () => {
      const session = createMockSession();

      const plan = getNextStepPlan(session);
      expect(plan).not.toBeNull();
      expect(plan?.kind).toBe('render_step');

      if (plan?.kind === 'render_step') {
        expect(plan.step.stepId).toBe(STEP_IDS.BASICS);
        // All fields should have empty/undefined values
        plan.step.fields.forEach(field => {
          if (field.kind === 'text' || field.kind === 'select' || field.kind === 'radio') {
            expect(field.value).toBeUndefined();
          } else if (field.kind === 'checkbox') {
            expect(field.values).toEqual([]);
          }
        });
      }
    });
  });

  describe('Performance Under Load', () => {
    it('should handle rapid succession of step progressions', () => {
      const durations: number[] = [];

      for (let i = 0; i < 10; i++) {
        let session = createMockSession();

        // Measure full flow
        const flowStart = performance.now();

        // Basics
        session = submitStep(session, {
          [FIELD_IDS.FULL_NAME]: `User ${i}`,
          [FIELD_IDS.EMAIL]: `user${i}@example.com`,
          [FIELD_IDS.ROLE]: 'eng',
          [FIELD_IDS.PRIMARY_USE]: i % 2 === 0 ? 'personal' : 'team',
        });

        // Add team fields for team personas
        if (i % 2 !== 0) {
          session.values = {
            ...session.values,
            [FIELD_IDS.COMPANY]: `Company ${i}`,
            [FIELD_IDS.TEAM_SIZE]: '21-50',
            [FIELD_IDS.WORKSPACE_NAME]: `Workspace ${i}`,
          };
        }

        // Workspace
        session = submitStep(session, {
          [FIELD_IDS.WORKSPACE_NAME]: `Workspace ${i}`,
        });

        // Preferences (if team)
        if (i % 2 !== 0) {
          session = submitStep(session, {
            [FIELD_IDS.THEME]: 'dark',
            [FIELD_IDS.FEATURES]: ['ai_assist'],
          });
        }

        // Review
        session.completedSteps.push(STEP_IDS.REVIEW);

        // Success
        const finalPlan = getNextStepPlan(session);
        expect(finalPlan?.kind).toBe('success');

        const flowDuration = performance.now() - flowStart;
        durations.push(flowDuration);
      }

      // All flows should complete quickly
      const maxDuration = Math.max(...durations);
      const avgDuration = durations.reduce((a, b) => a + b, 0) / durations.length;

      expect(maxDuration).toBeLessThan(500); // Full flow under 500ms
      expect(avgDuration).toBeLessThan(200); // Average under 200ms
    });
  });

  describe('Field Value Formatting', () => {
    it('should format values correctly in review step', () => {
      const session = createMockSession({
        completedSteps: [STEP_IDS.BASICS, STEP_IDS.WORKSPACE, STEP_IDS.PREFERENCES],
        values: {
          [FIELD_IDS.FULL_NAME]: 'John Doe',
          [FIELD_IDS.EMAIL]: 'john@example.com',
          [FIELD_IDS.ROLE]: 'pm',
          [FIELD_IDS.PRIMARY_USE]: 'team',
          [FIELD_IDS.COMPANY]: 'Acme Corp',
          [FIELD_IDS.WORKSPACE_NAME]: 'Product Team',
          [FIELD_IDS.TEAM_SIZE]: '21-50',
          [FIELD_IDS.PROJECT_TYPE]: 'software',
          [FIELD_IDS.THEME]: 'dark',
          [FIELD_IDS.FEATURES]: ['ai_assist', 'automation'],
        },
      });

      const plan = getNextStepPlan(session);

      if (plan?.kind === 'review') {
        // Check label mapping
        const roleItem = plan.summary.find(s => s.label === 'Role');
        expect(roleItem?.value).toBe('Product Manager'); // Not 'pm'

        const teamSizeItem = plan.summary.find(s => s.label === 'Team Size');
        expect(teamSizeItem?.value).toBe('21-50 people'); // Not just '21-50'

        const projectTypeItem = plan.summary.find(s => s.label === 'Project Type');
        expect(projectTypeItem?.value).toBe('Software Development'); // Not 'software'

        const themeItem = plan.summary.find(s => s.label === 'Theme');
        expect(themeItem?.value).toBe('Dark'); // Not 'dark'

        const featuresItem = plan.summary.find(s => s.label === 'Features');
        expect(featuresItem?.value).toContain('AI Assistant');
        expect(featuresItem?.value).toContain('Workflow Automation');
      }
    });
  });
});