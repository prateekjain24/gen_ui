/**
 * Unit tests for SessionStore
 */

import { sessionStore } from '../session';

import { SESSION_CONFIG } from '@/lib/constants';
import { UXEvent, FieldChangeEvent } from '@/lib/types/events';


// Mock timers for testing
jest.useFakeTimers();

describe('SessionStore', () => {
  beforeEach(() => {
    // Clear all sessions before each test
    sessionStore.clearAllSessions();
    jest.clearAllTimers();
  });

  afterAll(() => {
    // Cleanup
    sessionStore.shutdown();
  });

  describe('Session CRUD Operations', () => {
    test('should create a new session with unique ID', () => {
      const session1 = sessionStore.createSession();
      const session2 = sessionStore.createSession();

      expect(session1).toBeDefined();
      expect(session2).toBeDefined();
      expect(session1.id).not.toBe(session2.id);
      expect(session1.events).toEqual([]);
      expect(session1.values).toEqual({});
    });

    test('should create session with initial options', () => {
      const metadata = {
        userAgent: 'test-browser',
        referrer: 'https://example.com',
      };

      const session = sessionStore.createSession({
        currentStep: 'basics',
        values: { name: 'Test User' },
        metadata,
      });

      expect(session.currentStep).toBe('basics');
      expect(session.values).toEqual({ name: 'Test User' });
      expect(session.metadata).toEqual(metadata);
    });

    test('should get session by ID', () => {
      const created = sessionStore.createSession();
      const retrieved = sessionStore.getSession(created.id);

      expect(retrieved).toEqual(created);
    });

    test('should return null for non-existent session', () => {
      const session = sessionStore.getSession('non-existent-id');
      expect(session).toBeNull();
    });

    test('should update session fields', () => {
      const session = sessionStore.createSession();

      const updated = sessionStore.updateSession(session.id, {
        currentStep: 'preferences',
        completedSteps: ['basics', 'workspace'],
        values: { role: 'developer', team: 'engineering' },
        persona: 'team',
      });

      expect(updated).toBeDefined();
      expect(updated?.currentStep).toBe('preferences');
      expect(updated?.completedSteps).toEqual(['basics', 'workspace']);
      expect(updated?.values).toEqual({ role: 'developer', team: 'engineering' });
      expect(updated?.persona).toBe('team');
    });

    test('should merge values on update', () => {
      const session = sessionStore.createSession({
        values: { name: 'Test' },
      });

      sessionStore.updateSession(session.id, {
        values: { role: 'developer' },
      });

      const updated = sessionStore.getSession(session.id);
      expect(updated?.values).toEqual({ name: 'Test', role: 'developer' });
    });

    test('should delete session', () => {
      const session = sessionStore.createSession();

      const deleted = sessionStore.deleteSession(session.id);
      expect(deleted).toBe(true);

      const retrieved = sessionStore.getSession(session.id);
      expect(retrieved).toBeNull();
    });

    test('should update lastActivityAt on get', () => {
      const session = sessionStore.createSession();
      const initialActivity = session.lastActivityAt;

      // Wait a bit
      jest.advanceTimersByTime(100);

      const retrieved = sessionStore.getSession(session.id);
      expect(retrieved?.lastActivityAt.getTime()).toBeGreaterThan(initialActivity.getTime());
    });
  });

  describe('Event Management', () => {
    test('should add event to session', () => {
      const session = sessionStore.createSession();
      const event: FieldChangeEvent = {
        type: 'field_change',
        timestamp: new Date().toISOString(),
        sessionId: session.id,
        fieldId: 'name',
        value: 'Test User',
        previousValue: '',
      };

      const added = sessionStore.addEvent(session.id, event);
      expect(added).toBe(true);

      const events = sessionStore.getEvents(session.id);
      expect(events).toHaveLength(1);
      expect(events[0]).toMatchObject(event);
    });

    test('should enforce event queue limit', () => {
      const session = sessionStore.createSession();

      // Add more than the limit
      for (let i = 0; i < SESSION_CONFIG.MAX_EVENTS_PER_SESSION + 10; i++) {
        const event: FieldChangeEvent = {
          type: 'field_change',
          timestamp: new Date().toISOString(),
          sessionId: session.id,
          fieldId: `field_${i}`,
          value: `value_${i}`,
          previousValue: '',
        };
        sessionStore.addEvent(session.id, event);
      }

      const events = sessionStore.getEvents(session.id);
      expect(events).toHaveLength(SESSION_CONFIG.MAX_EVENTS_PER_SESSION);

      // First events should have been removed (circular buffer)
      expect(events[0].fieldId).toBe('field_10');
    });

    test('should add multiple events', () => {
      const session = sessionStore.createSession();
      const events: UXEvent[] = [
        {
          type: 'field_focus',
          timestamp: new Date().toISOString(),
          sessionId: session.id,
          fieldId: 'name',
        },
        {
          type: 'field_blur',
          timestamp: new Date().toISOString(),
          sessionId: session.id,
          fieldId: 'name',
          timeSpentMs: 5000,
        },
      ];

      const added = sessionStore.addEvents(session.id, events);
      expect(added).toBe(2);

      const retrieved = sessionStore.getEvents(session.id);
      expect(retrieved).toHaveLength(2);
    });

    test('should filter events by type', () => {
      const session = sessionStore.createSession();

      sessionStore.addEvent(session.id, {
        type: 'field_focus',
        timestamp: new Date().toISOString(),
        sessionId: session.id,
        fieldId: 'name',
      });

      sessionStore.addEvent(session.id, {
        type: 'field_change',
        timestamp: new Date().toISOString(),
        sessionId: session.id,
        fieldId: 'name',
        value: 'Test',
        previousValue: '',
      });

      sessionStore.addEvent(session.id, {
        type: 'field_focus',
        timestamp: new Date().toISOString(),
        sessionId: session.id,
        fieldId: 'role',
      });

      const focusEvents = sessionStore.getEventsByType(session.id, 'field_focus');
      expect(focusEvents).toHaveLength(2);
      expect(focusEvents.every(e => e.type === 'field_focus')).toBe(true);
    });

    test('should get latest event of type', () => {
      const session = sessionStore.createSession();

      sessionStore.addEvent(session.id, {
        type: 'step_submit',
        timestamp: '2024-01-01T10:00:00.000Z',
        sessionId: session.id,
        stepId: 'basics',
        values: { name: 'Test' },
        timeSpentMs: 1000,
      });

      sessionStore.addEvent(session.id, {
        type: 'step_submit',
        timestamp: '2024-01-01T10:01:00.000Z',
        sessionId: session.id,
        stepId: 'workspace',
        values: { role: 'developer' },
        timeSpentMs: 2000,
      });

      const latest = sessionStore.getLatestEventOfType(session.id, 'step_submit');
      expect(latest).toBeDefined();
      expect((latest as any)?.stepId).toBe('workspace');
    });

    test('should add event via update', () => {
      const session = sessionStore.createSession();
      const event: FieldChangeEvent = {
        type: 'field_change',
        timestamp: new Date().toISOString(),
        sessionId: session.id,
        fieldId: 'name',
        value: 'Test',
        previousValue: '',
      };

      sessionStore.updateSession(session.id, {
        values: { name: 'Test' },
        event,
      });

      const events = sessionStore.getEvents(session.id);
      expect(events).toHaveLength(1);
      expect(events[0]).toMatchObject(event);
    });
  });

  describe('Session Cleanup', () => {
    test('should remove expired sessions on get', () => {
      const session = sessionStore.createSession();

      // Simulate session expiration
      const expiredTime = (SESSION_CONFIG.MAX_IDLE_MINUTES + 1) * 60 * 1000;
      jest.advanceTimersByTime(expiredTime);

      const retrieved = sessionStore.getSession(session.id);
      expect(retrieved).toBeNull();

      // Session should have been deleted
      const stats = sessionStore.getStats();
      expect(stats.activeSessions).toBe(0);
    });

    test('should clean up stale sessions', () => {
      // Create multiple sessions
      const session1 = sessionStore.createSession();
      const session2 = sessionStore.createSession();
      const session3 = sessionStore.createSession();

      // Make session1 stale
      const staleTime = (SESSION_CONFIG.MAX_IDLE_MINUTES + 1) * 60 * 1000;
      jest.advanceTimersByTime(staleTime);

      // Keep session2 active
      sessionStore.getSession(session2.id);

      // Keep session3 active
      sessionStore.getSession(session3.id);

      // Trigger cleanup
      jest.advanceTimersByTime(SESSION_CONFIG.CLEANUP_INTERVAL_MINUTES * 60 * 1000);

      // Only session1 should be cleaned up
      expect(sessionStore.getSession(session1.id)).toBeNull();
      expect(sessionStore.getSession(session2.id)).toBeDefined();
      expect(sessionStore.getSession(session3.id)).toBeDefined();

      const stats = sessionStore.getStats();
      expect(stats.activeSessions).toBe(2);
      expect(stats.sessionsCleanedUp).toBeGreaterThan(0);
    });

    test('should enforce max concurrent sessions', () => {
      const sessions = [];

      // Create max sessions
      for (let i = 0; i < SESSION_CONFIG.MAX_CONCURRENT_SESSIONS; i++) {
        sessions.push(sessionStore.createSession());
      }

      // Create one more - should trigger LRU eviction
      const newSession = sessionStore.createSession();
      expect(newSession).toBeDefined();

      // First session should have been evicted (LRU)
      const firstSession = sessionStore.getSession(sessions[0].id);
      expect(firstSession).toBeNull();
    });

    test('should perform LRU eviction', () => {
      // Create sessions up to limit
      const sessions = [];
      for (let i = 0; i < SESSION_CONFIG.MAX_CONCURRENT_SESSIONS; i++) {
        sessions.push(sessionStore.createSession());
      }

      // Access middle session to update its activity
      const middleIndex = Math.floor(SESSION_CONFIG.MAX_CONCURRENT_SESSIONS / 2);
      sessionStore.getSession(sessions[middleIndex].id);

      // Create new session - should evict least recently used
      sessionStore.createSession();

      // First session should be evicted (not the middle one we accessed)
      expect(sessionStore.getSession(sessions[0].id)).toBeNull();
      expect(sessionStore.getSession(sessions[middleIndex].id)).toBeDefined();
    });
  });

  describe('Statistics and Monitoring', () => {
    test('should track session statistics', () => {
      const initialStats = sessionStore.getStats();

      // Create sessions
      const session1 = sessionStore.createSession();
      const _session2 = sessionStore.createSession();

      // Add events
      sessionStore.addEvent(session1.id, {
        type: 'field_focus',
        timestamp: new Date().toISOString(),
        sessionId: session1.id,
        fieldId: 'name',
      });

      const stats = sessionStore.getStats();
      expect(stats.totalSessions).toBe(initialStats.totalSessions + 2);
      expect(stats.activeSessions).toBe(2);
      expect(stats.totalEventsStored).toBe(initialStats.totalEventsStored + 1);

      // Delete a session
      sessionStore.deleteSession(session1.id);
      const updatedStats = sessionStore.getStats();
      expect(updatedStats.activeSessions).toBe(1);
    });

    test('should get all sessions', () => {
      const session1 = sessionStore.createSession();
      const session2 = sessionStore.createSession();

      const allSessions = sessionStore.getAllSessions();
      expect(allSessions).toHaveLength(2);
      expect(allSessions.map(s => s.id)).toContain(session1.id);
      expect(allSessions.map(s => s.id)).toContain(session2.id);
    });

    test('should track cleanup statistics', () => {
      // Create stale session
      sessionStore.createSession();

      const initialStats = sessionStore.getStats();

      // Make session stale
      jest.advanceTimersByTime((SESSION_CONFIG.MAX_IDLE_MINUTES + 1) * 60 * 1000);

      // Trigger cleanup
      jest.advanceTimersByTime(SESSION_CONFIG.CLEANUP_INTERVAL_MINUTES * 60 * 1000);

      const stats = sessionStore.getStats();
      expect(stats.sessionsCleanedUp).toBeGreaterThan(initialStats.sessionsCleanedUp);
      expect(stats.lastCleanupAt).toBeDefined();
    });
  });

  describe('Edge Cases and Error Handling', () => {
    test('should handle operations on non-existent session', () => {
      const nonExistentId = 'non-existent-id';

      expect(sessionStore.getSession(nonExistentId)).toBeNull();
      expect(sessionStore.updateSession(nonExistentId, { currentStep: 'test' })).toBeNull();
      expect(sessionStore.deleteSession(nonExistentId)).toBe(false);
      expect(sessionStore.addEvent(nonExistentId, {
        type: 'field_focus',
        timestamp: new Date().toISOString(),
        sessionId: nonExistentId,
        fieldId: 'test',
      })).toBe(false);
      expect(sessionStore.getEvents(nonExistentId)).toEqual([]);
    });

    test('should handle empty event arrays', () => {
      const session = sessionStore.createSession();

      const events = sessionStore.getEvents(session.id);
      expect(events).toEqual([]);

      const filtered = sessionStore.getEventsByType(session.id, 'field_focus');
      expect(filtered).toEqual([]);

      const latest = sessionStore.getLatestEventOfType(session.id, 'field_focus');
      expect(latest).toBeNull();
    });

    test('should clear all sessions', () => {
      sessionStore.createSession();
      sessionStore.createSession();
      sessionStore.createSession();

      sessionStore.clearAllSessions();

      const stats = sessionStore.getStats();
      expect(stats.activeSessions).toBe(0);
      expect(sessionStore.getAllSessions()).toEqual([]);
    });
  });
});