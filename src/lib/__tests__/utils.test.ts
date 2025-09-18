import { describe, expect, it } from '@jest/globals';

import { cn } from '@/lib/utils';

describe('cn utility', () => {
  it('merges class names and filters falsy values', () => {
    const shouldHide = false;
    expect(cn('base', shouldHide && 'hidden', 'mt-2')).toBe('base mt-2');
  });

  it('deduplicates tailwind-like classes', () => {
    expect(cn('px-2', 'px-4')).toBe('px-4');
  });
});
