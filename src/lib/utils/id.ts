/**
 * ID generation utilities for the Generative UI POC
 *
 * Provides consistent UUID generation and validation across the application.
 * Uses UUID v4 for random, collision-resistant identifiers.
 */

import { v4 as uuidv4 } from 'uuid';

/**
 * Generates a new UUID v4
 *
 * @returns A random UUID v4 string
 * @example
 * const sessionId = generateId();
 * // Returns: "550e8400-e29b-41d4-a716-446655440000"
 */
export function generateId(): string {
  return uuidv4();
}

/**
 * Generates a prefixed ID for specific entity types
 *
 * @param prefix - The prefix to add (e.g., "session", "event")
 * @returns A prefixed UUID string
 * @example
 * const sessionId = generatePrefixedId('session');
 * // Returns: "session_550e8400-e29b-41d4-a716-446655440000"
 */
export function generatePrefixedId(prefix: string): string {
  return `${prefix}_${uuidv4()}`;
}

/**
 * Validates if a string is a valid UUID v4
 *
 * @param id - The string to validate
 * @returns True if the string is a valid UUID v4
 */
export function isValidUUID(id: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(id);
}

/**
 * Validates if a string is a valid prefixed UUID
 *
 * @param id - The string to validate
 * @param prefix - The expected prefix
 * @returns True if the string has the correct prefix and valid UUID
 */
export function isValidPrefixedId(id: string, prefix: string): boolean {
  if (!id.startsWith(`${prefix}_`)) {
    return false;
  }
  const uuid = id.slice(prefix.length + 1);
  return isValidUUID(uuid);
}

/**
 * Generates a short ID suitable for user-facing purposes
 *
 * @param length - The desired length (default: 8)
 * @returns A short random string
 * @example
 * const shortId = generateShortId();
 * // Returns: "a3k9x2p1"
 */
export function generateShortId(length: number = 8): string {
  const chars = '0123456789abcdefghijklmnopqrstuvwxyz';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

/**
 * Extracts the UUID from a prefixed ID
 *
 * @param prefixedId - The prefixed ID string
 * @returns The UUID portion or null if invalid
 */
export function extractUUID(prefixedId: string): string | null {
  const match = prefixedId.match(/[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}/i);
  return match ? match[0] : null;
}