/**
 * Session Store Implementation
 *
 * Provides in-memory session management with automatic cleanup,
 * event tracking, and memory-bounded operations.
 */

import { SESSION_CONFIG } from '@/lib/constants';
import { UXEvent } from '@/lib/types/events';
import {
  SessionState,
  CreateSessionOptions,
  UpdateSessionOptions,
  createSession as createSessionHelper,
  isSessionExpired
} from '@/lib/types/session';
import { createDebugger } from '@/lib/utils/debug';
import { generateId } from '@/lib/utils/id';

/**
 * Session store statistics for monitoring
 */
interface SessionStoreStats {
  totalSessions: number;
  activeSessions: number;
  totalEventsStored: number;
  lastCleanupAt: Date | null;
  sessionsCleanedUp: number;
}

// Create debug logger for this module
const debug = createDebugger('SessionStore');

/**
 * In-memory session store with automatic cleanup and event management
 *
 * Features:
 * - O(1) session lookup with Map
 * - Automatic cleanup of stale sessions
 * - Event queue management with circular buffer
 * - Memory-bounded operations
 * - Thread-safe singleton pattern
 */
class SessionStore {
  private static instance: SessionStore;
  private sessions: Map<string, SessionState>;
  private cleanupInterval: NodeJS.Timeout | null = null;
  private stats: SessionStoreStats;
  private isServerSide: boolean;

  private constructor() {
    this.sessions = new Map();
    this.isServerSide = typeof window === 'undefined';
    this.stats = {
      totalSessions: 0,
      activeSessions: 0,
      totalEventsStored: 0,
      lastCleanupAt: null,
      sessionsCleanedUp: 0,
    };

    // Start cleanup timer only on server side
    if (this.isServerSide) {
      this.startCleanupTimer();
    }

    // Graceful shutdown
    if (this.isServerSide && typeof process !== 'undefined') {
      process.on('exit', () => this.shutdown());
      process.on('SIGINT', () => this.shutdown());
      process.on('SIGTERM', () => this.shutdown());
    }
  }

  /**
   * Get singleton instance of SessionStore
   */
  public static getInstance(): SessionStore {
    if (!SessionStore.instance) {
      SessionStore.instance = new SessionStore();
    }
    return SessionStore.instance;
  }

  /**
   * Create a new session
   *
   * @param options - Optional session creation parameters
   * @returns The created session state
   * @throws Error if max concurrent sessions exceeded
   */
  public createSession(options?: CreateSessionOptions): SessionState {
    // Check concurrent session limit
    if (this.sessions.size >= SESSION_CONFIG.MAX_CONCURRENT_SESSIONS) {
      // Try cleanup first
      this.cleanupStaleSessions();

      // If still over limit, implement LRU eviction
      if (this.sessions.size >= SESSION_CONFIG.MAX_CONCURRENT_SESSIONS) {
        this.evictLRUSessions(1);
      }
    }

    const id = generateId();
    const session = createSessionHelper(options);
    session.id = id;  // Set the ID after creation

    this.sessions.set(id, session);
    this.stats.totalSessions++;
    this.updateActiveSessionCount();

    debug(`Created session ${id}`);
    return session;
  }

  /**
   * Get a session by ID
   *
   * @param id - Session ID
   * @returns Session state or null if not found/expired
   */
  public getSession(id: string): SessionState | null {
    const session = this.sessions.get(id);

    if (!session) {
      return null;
    }

    // Check if session has expired
    if (isSessionExpired(session, SESSION_CONFIG.MAX_IDLE_MINUTES)) {
      this.deleteSession(id);
      return null;
    }

    // Update last activity
    session.lastActivityAt = new Date();
    return session;
  }

  /**
   * Update an existing session
   *
   * @param id - Session ID
   * @param options - Update options
   * @returns Updated session or null if not found
   */
  public updateSession(id: string, options: UpdateSessionOptions): SessionState | null {
    const session = this.getSession(id);

    if (!session) {
      return null;
    }

    // Update session fields
    if (options.currentStep !== undefined) {
      session.currentStep = options.currentStep;
    }

    if (options.addCompletedStep !== undefined) {
      if (!session.completedSteps.includes(options.addCompletedStep)) {
        session.completedSteps.push(options.addCompletedStep);
      }
    }

    if (options.values !== undefined) {
      session.values = { ...session.values, ...options.values };
    }

    if (options.persona !== undefined) {
      session.persona = options.persona;
    }

    if (options.metadata !== undefined) {
      session.metadata = { ...session.metadata, ...options.metadata };
    }

    // Add event if provided
    if (options.event) {
      this.addEvent(id, options.event);
    }

    session.lastActivityAt = new Date();
    return session;
  }

  /**
   * Delete a session
   *
   * @param id - Session ID
   * @returns True if session was deleted
   */
  public deleteSession(id: string): boolean {
    const deleted = this.sessions.delete(id);
    if (deleted) {
      debug(`Deleted session ${id}`);
      this.updateActiveSessionCount();
    }
    return deleted;
  }

  /**
   * Add an event to a session's queue
   * Implements circular buffer pattern for memory management
   *
   * @param sessionId - Session ID
   * @param event - UX event to add
   * @returns True if event was added
   */
  public addEvent(sessionId: string, event: UXEvent): boolean {
    const session = this.getSession(sessionId);

    if (!session) {
      return false;
    }

    // Ensure event has session ID
    event.sessionId = sessionId;

    // Implement circular buffer - remove oldest if at limit
    if (session.events.length >= SESSION_CONFIG.MAX_EVENTS_PER_SESSION) {
      session.events.shift(); // Remove oldest event
    }

    session.events.push(event);
    this.stats.totalEventsStored++;

    return true;
  }

  /**
   * Add multiple events to a session
   *
   * @param sessionId - Session ID
   * @param events - Array of events to add
   * @returns Number of events successfully added
   */
  public addEvents(sessionId: string, events: UXEvent[]): number {
    let added = 0;
    for (const event of events) {
      if (this.addEvent(sessionId, event)) {
        added++;
      }
    }
    return added;
  }

  /**
   * Get all events for a session
   *
   * @param sessionId - Session ID
   * @returns Array of events or empty array
   */
  public getEvents(sessionId: string): UXEvent[] {
    const session = this.getSession(sessionId);
    return session?.events || [];
  }

  /**
   * Get events filtered by type
   *
   * @param sessionId - Session ID
   * @param type - Event type to filter
   * @returns Filtered events array
   */
  public getEventsByType(sessionId: string, type: UXEvent['type']): UXEvent[] {
    const events = this.getEvents(sessionId);
    return events.filter(event => event.type === type);
  }

  /**
   * Get the most recent event of a specific type
   *
   * @param sessionId - Session ID
   * @param type - Event type
   * @returns Most recent event or null
   */
  public getLatestEventOfType(sessionId: string, type: UXEvent['type']): UXEvent | null {
    const events = this.getEventsByType(sessionId, type);
    return events[events.length - 1] || null;
  }

  /**
   * Clean up stale sessions
   * Removes sessions that have been idle for longer than MAX_IDLE_MINUTES
   */
  private cleanupStaleSessions(): void {
    const now = Date.now();
    const maxIdleMs = SESSION_CONFIG.MAX_IDLE_MINUTES * 60 * 1000;
    let cleaned = 0;

    for (const [id, session] of this.sessions) {
      const idleTime = now - session.lastActivityAt.getTime();
      if (idleTime > maxIdleMs) {
        this.sessions.delete(id);
        cleaned++;
      }
    }

    if (cleaned > 0) {
      debug(`Cleaned up ${cleaned} stale sessions`);
      this.stats.sessionsCleanedUp += cleaned;
    }

    this.stats.lastCleanupAt = new Date();
    this.updateActiveSessionCount();
  }

  /**
   * Evict least recently used sessions
   *
   * @param count - Number of sessions to evict
   */
  private evictLRUSessions(count: number): void {
    const sessions = Array.from(this.sessions.entries());

    // Sort by last activity (oldest first)
    sessions.sort((a, b) =>
      a[1].lastActivityAt.getTime() - b[1].lastActivityAt.getTime()
    );

    // Evict the oldest sessions
    for (let i = 0; i < Math.min(count, sessions.length); i++) {
      const [id] = sessions[i];
      this.sessions.delete(id);
      debug(`Evicted LRU session ${id}`);
    }

    this.updateActiveSessionCount();
  }

  /**
   * Start the automatic cleanup timer
   */
  private startCleanupTimer(): void {
    if (this.cleanupInterval) {
      return; // Already running
    }

    const intervalMs = SESSION_CONFIG.CLEANUP_INTERVAL_MINUTES * 60 * 1000;

    this.cleanupInterval = setInterval(() => {
      this.cleanupStaleSessions();
    }, intervalMs);

    debug(`Cleanup timer started (${SESSION_CONFIG.CLEANUP_INTERVAL_MINUTES} min intervals)`);
  }

  /**
   * Stop the cleanup timer
   */
  private stopCleanupTimer(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
      debug('Cleanup timer stopped');
    }
  }

  /**
   * Update active session count in stats
   */
  private updateActiveSessionCount(): void {
    this.stats.activeSessions = this.sessions.size;
  }

  /**
   * Get store statistics
   */
  public getStats(): SessionStoreStats {
    return { ...this.stats };
  }

  /**
   * Get all active sessions (for debugging/monitoring)
   *
   * @returns Array of all active sessions
   */
  public getAllSessions(): SessionState[] {
    return Array.from(this.sessions.values());
  }

  /**
   * Clear all sessions (for testing)
   */
  public clearAllSessions(): void {
    this.sessions.clear();
    this.updateActiveSessionCount();
    debug('All sessions cleared');
  }

  /**
   * Graceful shutdown
   */
  public shutdown(): void {
    this.stopCleanupTimer();
    debug(`Shutdown - ${this.sessions.size} active sessions`);
  }
}

// Export singleton instance getter
export const sessionStore = SessionStore.getInstance();

// Export types for external use
export type { SessionStoreStats };