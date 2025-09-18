/**
 * Session State Type Definitions
 *
 * This module defines the types for managing user sessions in the onboarding flow.
 * Sessions track user progress, collected values, and behavioral events.
 */

import type { UXEvent } from './events';

/**
 * User persona types based on behavioral patterns
 * - explorer: Users who skip optional fields and move quickly
 * - team: Users who fill out most fields and show team/enterprise intent
 */
export type UserPersona = 'explorer' | 'team';

/**
 * Represents the current state of a user's onboarding session
 * @example
 * ```typescript
 * const session: SessionState = {
 *   id: 'uuid-123',
 *   createdAt: new Date('2025-01-01T10:00:00Z'),
 *   lastActivityAt: new Date('2025-01-01T10:05:00Z'),
 *   currentStep: 'workspace',
 *   completedSteps: ['basics'],
 *   values: {
 *     full_name: 'Jane Smith',
 *     email: 'jane@example.com',
 *     role: 'eng'
 *   },
 *   persona: 'team',
 *   events: []
 * };
 * ```
 */
export interface SessionState {
  /** Unique session identifier (UUID v4) */
  id: string;

  /** Timestamp when session was created */
  createdAt: Date;

  /** Timestamp of last user activity */
  lastActivityAt: Date;

  /** Current step ID in the onboarding flow */
  currentStep: string;

  /** Array of completed step IDs in order */
  completedSteps: string[];

  /** Collected form values keyed by field ID */
  values: Record<string, unknown>;

  /** Detected user persona based on behavior */
  persona?: UserPersona;

  /** Queue of UX events for telemetry (max 50) */
  events: UXEvent[];

  /** Optional metadata for extensibility */
  metadata?: SessionMetadata;
}

/**
 * Optional metadata that can be attached to a session
 */
export interface SessionMetadata {
  /** User agent string for device/browser detection */
  userAgent?: string;

  /** IP address for geographic insights */
  ipAddress?: string;

  /** Referrer URL to track traffic source */
  referrer?: string;

  /** UTM parameters for campaign tracking */
  utmParams?: {
    source?: string;
    medium?: string;
    campaign?: string;
    term?: string;
    content?: string;
  };

  /** A/B test variant assignment */
  variant?: 'control' | 'treatment';

  /** Custom properties for future extensibility */
  [key: string]: unknown;
}

/**
 * Options for creating a new session
 */
export interface CreateSessionOptions {
  /** Initial metadata to attach to the session */
  metadata?: SessionMetadata;

  /** Pre-populated values (e.g., from URL params) */
  initialValues?: Record<string, unknown>;
}

/**
 * Options for updating an existing session
 */
export interface UpdateSessionOptions {
  /** Update the current step */
  currentStep?: string;

  /** Add a completed step */
  addCompletedStep?: string;

  /** Merge new values with existing */
  values?: Record<string, unknown>;

  /** Update detected persona */
  persona?: UserPersona;

  /** Add a new event to the queue */
  event?: UXEvent;

  /** Update metadata */
  metadata?: Partial<SessionMetadata>;
}

/**
 * Type guard to check if a value is a valid UserPersona
 * @param value - The value to check
 * @returns True if the value is a valid UserPersona
 */
export const isUserPersona = (value: unknown): value is UserPersona => {
  return value === 'explorer' || value === 'team';
};

/**
 * Type guard to check if an object is a valid SessionState
 * @param obj - The object to check
 * @returns True if the object is a valid SessionState
 */
export const isSessionState = (obj: unknown): obj is SessionState => {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    typeof (obj as SessionState).id === 'string' &&
    (obj as SessionState).createdAt instanceof Date &&
    (obj as SessionState).lastActivityAt instanceof Date &&
    typeof (obj as SessionState).currentStep === 'string' &&
    Array.isArray((obj as SessionState).completedSteps) &&
    typeof (obj as SessionState).values === 'object' &&
    Array.isArray((obj as SessionState).events)
  );
};

/**
 * Helper function to create a new session with defaults
 * @param options - Options for creating the session
 * @returns A new SessionState object
 */
export const createSession = (options: CreateSessionOptions = {}): SessionState => {
  const now = new Date();
  return {
    id: '', // Will be set by the session store using UUID
    createdAt: now,
    lastActivityAt: now,
    currentStep: 'basics', // Start with basics step
    completedSteps: [],
    values: options.initialValues || {},
    events: [],
    metadata: options.metadata,
  };
};

/**
 * Helper function to check if a session has expired
 * @param session - The session to check
 * @param maxIdleMinutes - Maximum idle time in minutes (default: 60)
 * @returns True if the session has expired
 */
export const isSessionExpired = (
  session: SessionState,
  maxIdleMinutes: number = 60
): boolean => {
  const now = new Date();
  const idleTime = now.getTime() - session.lastActivityAt.getTime();
  const maxIdleTime = maxIdleMinutes * 60 * 1000;
  return idleTime > maxIdleTime;
};

/**
 * Helper function to get session progress percentage
 * @param session - The session to analyze
 * @param totalSteps - Total number of steps in the flow
 * @returns Progress percentage (0-100)
 */
export const getSessionProgress = (
  session: SessionState,
  totalSteps: number = 3
): number => {
  if (totalSteps === 0) return 0;
  return Math.round((session.completedSteps.length / totalSteps) * 100);
};

/**
 * Helper function to detect user persona from session behavior
 * @param session - The session to analyze
 * @returns Detected persona or undefined
 */
export const detectPersona = (session: SessionState): UserPersona | undefined => {
  const valueCount = Object.keys(session.values).length;
  const hasTeamFields = 'workspace_name' in session.values || 'team_size' in session.values;
  const hasSkippedSteps = session.events.some(e => e.type === 'step_skip');

  if (hasTeamFields || valueCount > 5) {
    return 'team';
  } else if (hasSkippedSteps || valueCount < 3) {
    return 'explorer';
  }

  return undefined;
};