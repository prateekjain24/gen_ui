# Ticket PLAN4-13 — Template completion caching

- **Story Points:** 1
- **Depends on:** PLAN4-12

## Goal
Introduce a cache for validated template completions keyed by persona, industry, and template id to avoid redundant LLM calls during a session.

## Context
Phase 4 prioritizes correctness over cost, but caching improves responsiveness and provides hooks for reuse in future optimization work.

## Requirements
1. Implement an in-memory cache module (`src/lib/prompt-intel/template-cache.ts`) storing completions for the current process with configurable TTL (default 15 minutes).
2. Key entries by template id + persona + industry + knob signature; include checksum of prompt signals.
3. Integrate cache lookups into the template fill pipeline so we reuse text when available and still pass through validation.
4. Record cache hits/misses in telemetry for later analysis.
5. Add unit tests covering cache insert, hit, expiry, and invalidation when knobs change.

## Implementation Steps
1. Design cache key helper using stable JSON hashing.
2. Build simple Map-based cache with timestamp metadata and invalidation function.
3. Update template fill helper to consult the cache before calling the LLM and to store validated results afterward.
4. Write tests verifying behavior across sessions and knob changes.

## Definition of Done
- Cache module exists with TTL and invalidation support.
- Template fill pipeline uses the cache transparently.
- Telemetry captures hit/miss metrics.
- Tests cover caching lifecycle scenarios.
