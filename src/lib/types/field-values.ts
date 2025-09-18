/**
 * Type definitions for field values
 *
 * Provides type-safe definitions for form field values,
 * avoiding the use of 'any' while maintaining flexibility.
 */

/**
 * Primitive types that can be stored as field values
 */
export type PrimitiveFieldValue = string | number | boolean | null | undefined;

/**
 * Array field values (for multi-select fields)
 */
export type ArrayFieldValue = PrimitiveFieldValue[];

/**
 * Complex field values (for nested structures)
 */
export interface ComplexFieldValue {
  [key: string]: PrimitiveFieldValue | ArrayFieldValue | ComplexFieldValue;
}

/**
 * Union type for all possible field values
 */
export type FieldValue = PrimitiveFieldValue | ArrayFieldValue | ComplexFieldValue;

/**
 * Type guard to check if a value is a primitive field value
 */
export function isPrimitiveFieldValue(value: unknown): value is PrimitiveFieldValue {
  return (
    value === null ||
    value === undefined ||
    typeof value === 'string' ||
    typeof value === 'number' ||
    typeof value === 'boolean'
  );
}

/**
 * Type guard to check if a value is an array field value
 */
export function isArrayFieldValue(value: unknown): value is ArrayFieldValue {
  return Array.isArray(value) && value.every(item => isPrimitiveFieldValue(item));
}

/**
 * Type guard to check if a value is a complex field value
 */
export function isComplexFieldValue(value: unknown): value is ComplexFieldValue {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return false;
  }

  // Check all nested values
  for (const key in value as object) {
    const nestedValue = (value as Record<string, unknown>)[key];
    if (!isPrimitiveFieldValue(nestedValue) &&
        !isArrayFieldValue(nestedValue) &&
        !isComplexFieldValue(nestedValue)) {
      return false;
    }
  }

  return true;
}

/**
 * Type guard to check if a value is a valid field value
 */
export function isFieldValue(value: unknown): value is FieldValue {
  return (
    isPrimitiveFieldValue(value) ||
    isArrayFieldValue(value) ||
    isComplexFieldValue(value)
  );
}

/**
 * Safely get a string value from an unknown field value
 */
export function getStringValue(value: unknown): string | undefined {
  if (typeof value === 'string') {
    return value;
  }
  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }
  return undefined;
}

/**
 * Safely get a number value from an unknown field value
 */
export function getNumberValue(value: unknown): number | undefined {
  if (typeof value === 'number') {
    return value;
  }
  if (typeof value === 'string') {
    const parsed = Number(value);
    return isNaN(parsed) ? undefined : parsed;
  }
  return undefined;
}

/**
 * Safely get a boolean value from an unknown field value
 */
export function getBooleanValue(value: unknown): boolean | undefined {
  if (typeof value === 'boolean') {
    return value;
  }
  if (value === 'true') return true;
  if (value === 'false') return false;
  return undefined;
}