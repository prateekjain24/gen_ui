# PropertyGuru prompt preset & plan template

## Context
The Canvas prompt, schema, and default copy still target B2B onboarding. PropertyGuru needs seeker-oriented instructions, output sections, and tone controls, while keeping the original Canvas experience behind a flag so production doesn’t break mid-iteration. pg.md also mandates golden fixtures for the Tampines MRT scenario.

## Task
Introduce a PropertyGuru preset that swaps in new system prompt, response template, and copy defaults, gated behind a feature flag/config switch.

## Acceptance Criteria
- Add a configuration toggle (env flag or store setting) that selects between Canvas MVP and PropertyGuru presets.
- New prompt instructions describe the PropertyGuru journey (intent summary, essentials, lifestyle filters, plan actions, micro-copy) and reference tone options.
- Response schema updated to emit the new plan shape (sections + metadata) without breaking existing consumers when the flag is off.
- Golden fixture under `src/lib/store/__tests__` captures the “Tampines MRT twins” prompt flowing through the preset and snapshotting the generated plan structure.
- Documentation (inline or README) explains how to activate the preset for local testing.

## Out of Scope
- UI customization drawer changes or downstream payload mapping; handled separately.
