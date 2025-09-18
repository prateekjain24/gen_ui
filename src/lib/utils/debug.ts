/**
 * Debug utilities for development-only logging
 *
 * Provides conditional logging that only outputs in development mode,
 * preventing console statements from appearing in production builds.
 */

/**
 * Checks if the current environment is development
 */
const isDevelopment = process.env.NODE_ENV === 'development';

/**
 * Debug logger that only outputs in development mode
 *
 * @param message - The primary message to log
 * @param args - Additional arguments to log
 *
 * @example
 * debug('Session created', sessionId);
 * debug('[SessionStore]', 'Cleanup completed', { count: 5 });
 */
export function debug(message: string, ...args: unknown[]): void {
  if (isDevelopment) {
    // eslint-disable-next-line no-console
    console.log(message, ...args);
  }
}

/**
 * Debug warning that only outputs in development mode
 *
 * @param message - The warning message
 * @param args - Additional arguments
 */
export function debugWarn(message: string, ...args: unknown[]): void {
  if (isDevelopment) {
    console.warn(message, ...args);
  }
}

/**
 * Debug error that always outputs (even in production)
 *
 * @param message - The error message
 * @param args - Additional arguments
 */
export function debugError(message: string, ...args: unknown[]): void {
  console.error(message, ...args);
}

/**
 * Creates a namespaced debug logger
 *
 * @param namespace - The namespace for the logger
 * @returns A debug function for that namespace
 *
 * @example
 * const log = createDebugger('SessionStore');
 * log('Created session', sessionId);
 * // Output: [SessionStore] Created session abc123
 */
export function createDebugger(namespace: string) {
  return (message: string, ...args: unknown[]) => {
    debug(`[${namespace}] ${message}`, ...args);
  };
}

/**
 * Conditional debug logger based on a flag
 *
 * @param condition - Whether to log
 * @param message - The message to log
 * @param args - Additional arguments
 */
export function debugIf(condition: boolean, message: string, ...args: unknown[]): void {
  if (condition) {
    debug(message, ...args);
  }
}

/**
 * Performance timer for development debugging
 *
 * @param label - The label for the timer
 * @returns A function to end the timer
 *
 * @example
 * const endTimer = debugTimer('API Call');
 * await fetchData();
 * endTimer(); // Logs: [Timer] API Call: 234ms
 */
export function debugTimer(label: string): () => void {
  if (!isDevelopment) {
    // eslint-disable-next-line @typescript-eslint/no-empty-function
    return () => {}; // No-op in production
  }

  const start = performance.now();
  return () => {
    const duration = performance.now() - start;
    debug(`[Timer] ${label}: ${duration.toFixed(2)}ms`);
  };
}