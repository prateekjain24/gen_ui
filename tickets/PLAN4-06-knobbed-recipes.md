# Ticket PLAN4-06 — Recipe knob scaffolding

- **Story Points:** 1
- **Depends on:** PLAN4-01

## Goal
Extend recipe definitions to support tunable knobs such as approval chain length, integration mode, copy tone, and invite cadence.

## Context
Personalized flows require recipes to expose adjustable parameters instead of hard-coded defaults. This scaffolding enables future scoring logic to mutate plans safely.

## Requirements
1. Update `src/lib/canvas/recipes.ts` (or successor) to include a `knobs` property describing adjustable fields with type metadata and default values.
2. Support at minimum: `approvalChainLength` (number), `integrationMode` (enum), `copyTone` (enum), `inviteStrategy` (enum), `notificationCadence` (enum/number).
3. Ensure defaults align with Phase 3 behavior when no adjustments are applied.
4. Add TypeScript types for knob definitions and export them for reuse in scoring and UI.
5. Provide doc comments explaining each knob’s effect on the rendered experience.

## Implementation Steps
1. Design the `RecipeKnobDefinition` type (name, type, options, default, description).
2. Annotate each existing recipe with its supported knobs and defaults.
3. Update any builders or consumers to handle the new `knobs` property without breaking existing flows.
4. Document the knobs in module comments for quick reference by PM and design.

## Definition of Done
- Recipes expose typed knob metadata with safe defaults.
- Existing flows continue to behave like Phase 3 when knobs are unused.
- Knob documentation is discoverable via comments and type exports.
