/**
 * Simple tests for SessionStore to verify basic functionality
 */

import { sessionStore } from '../session';

import { SESSION_CONFIG } from '@/lib/constants';


console.log('Testing SessionStore Implementation...\n');

// Test 1: Create Session
const session1 = sessionStore.createSession();
console.log('Created session:', session1.id);
console.assert(session1 != null, '✗ Failed to create session');
console.assert(session1.id && session1.id.length > 0, '✗ Session ID is empty');
console.assert(session1.events.length === 0, '✗ Session events should be empty initially');
console.assert(Object.keys(session1.values).length === 0, '✗ Session values should be empty initially');
console.log('✓ Create session test passed');

// Test 2: Get Session
console.log('Attempting to retrieve session:', session1.id);
const retrieved = sessionStore.getSession(session1.id);
console.log('Retrieved session:', retrieved ? retrieved.id : 'null');
console.assert(retrieved != null, '✗ Failed to retrieve session');
console.assert(retrieved?.id === session1.id, '✗ Retrieved session ID mismatch');
console.log('✓ Get session test passed');

// Test 3: Update Session
const updated = sessionStore.updateSession(session1.id, {
  currentStep: 'preferences',
  values: { role: 'developer' },
  persona: 'team',
});
console.assert(updated != null, '✗ Failed to update session');
console.assert(updated?.currentStep === 'preferences', '✗ Current step not updated');
console.assert(updated?.values.role === 'developer', '✗ Session values not updated');
console.assert(updated?.persona === 'team', '✗ Session persona not updated');
console.log('✓ Update session test passed');

// Test 4: Add Event
const eventAdded = sessionStore.addEvent(session1.id, {
  type: 'field_change',
  timestamp: new Date().toISOString(),
  sessionId: session1.id,
  fieldId: 'name',
  stepId: 'basics',
  previousValue: '',
});
console.assert(eventAdded === true, '✗ Failed to add event');
const events = sessionStore.getEvents(session1.id);
console.assert(events.length === 1, '✗ Event not added to session');
console.assert(events[0].type === 'field_change', '✗ Event type incorrect');
console.log('✓ Add event test passed');

// Test 5: Event Queue Limit
for (let i = 0; i < SESSION_CONFIG.MAX_EVENTS_PER_SESSION + 10; i++) {
  sessionStore.addEvent(session1.id, {
    type: 'field_focus',
    timestamp: new Date().toISOString(),
    sessionId: session1.id,
    fieldId: `field_${i}`,
    stepId: 'basics',
  });
}
const limitedEvents = sessionStore.getEvents(session1.id);
console.assert(
  limitedEvents.length === SESSION_CONFIG.MAX_EVENTS_PER_SESSION,
  `✗ Event queue limit not enforced (got ${limitedEvents.length}, expected ${SESSION_CONFIG.MAX_EVENTS_PER_SESSION})`
);
console.log('✓ Event queue limit test passed');

// Test 6: Delete Session
const deleted = sessionStore.deleteSession(session1.id);
console.assert(deleted === true, '✗ Failed to delete session');
const deletedSession = sessionStore.getSession(session1.id);
console.assert(deletedSession === null, '✗ Session not deleted properly');
console.log('✓ Delete session test passed');

// Test 7: Statistics
const stats = sessionStore.getStats();
console.assert(stats.totalSessions > 0, '✗ Total sessions not tracked');
console.assert(stats.totalEventsStored > 0, '✗ Total events not tracked');
console.log('✓ Statistics tracking test passed');

// Test 8: Multiple Sessions
const session2 = sessionStore.createSession();
const session3 = sessionStore.createSession();
console.assert(session2.id !== session3.id, '✗ Session IDs not unique');
const allSessions = sessionStore.getAllSessions();
console.assert(allSessions.length >= 2, '✗ Multiple sessions not stored');
console.log('✓ Multiple sessions test passed');

// Cleanup
sessionStore.clearAllSessions();
const clearedSessions = sessionStore.getAllSessions();
console.assert(clearedSessions.length === 0, '✗ Sessions not cleared');
console.log('✓ Clear all sessions test passed');

console.log('\n✅ All SessionStore tests passed successfully!');

// Shutdown
sessionStore.shutdown();
console.log('SessionStore shutdown complete.\n');