# Phase 3 – Adaptive Onboarding Showcase

## Vision
Phase 3 turns the onboarding prototype into a visceral demo that proves the UI can be rewritten at runtime by GPT-5-mini. Reviewers should clearly see the form reshape itself based on user behaviour, understand why the AI made each decision, and have logs/metrics that back up the story.

## Guiding Principles
- **Visibility over subtlety:** Every AI-driven change must be visible without digging into the console.
- **Safety rails stay on:** Maintain schema validation, fallbacks, and guardrails introduced in Phase 2.
- **Product story first:** Frame each enhancement around the user journey (explorer vs. team) and the value it unlocks.
- **Telemetry-ready:** Everything new must emit signals we can review later in Airtable and eval logs.

## Success Criteria
- Demo script shows two distinct personas producing obviously different flows (field count, component types, CTA copy).
- Debug HUD surfaces reasoning, persona, and confidence for each LLM decision alongside a rules-engine comparison.
- Eval logs capture deltas (added/dropped fields, steps skipped) and sync successfully to Airtable via `bun run push:evals`.
- README + Phase docs explain the story to non-technical stakeholders.
- Railway environment configuration instructions include new env vars/toggles and remain deployable end-to-end.

## Workstreams & Deliverables

### 1. Persona Branching Playbooks
**Goal:** Design deliberately different explorer vs. team journeys so AI decisions feel impactful.
- Map required vs. optional steps per persona (e.g., explorers can skip Workspace entirely; teams add "Invite teammates" and "Integrations" micro-steps).
- Author copy decks and helper text variants for each persona.
- Produce acceptance snapshots (JSON fixtures + screenshots) that describe “what good looks like”.
- Deliverable: `docs/persona-playbooks.md` summarising flows, field justification, and success metrics.

### 2. Component Palette Expansion
**Goal:** Introduce AI-only components that the rules engine never returns.
- Extend `FIELD_ID_SET` and the schema to allow safe new kinds (e.g. `callout`, `checklist`, `info_badge`). Provide renderers in the UI.
- Update `SYSTEM_PROMPTS.FORM_ORCHESTRATOR` with examples covering new components and when to use them.
- Enhance post-processing (`repairLLMPayload`, `enhancePlanWithContext`) to map/validate the expanded palette without breaking fallbacks.
- Deliverable: Updated field schema, tests in `src/lib/store/__tests__`, and Storybook-like MDX snippets or screenshots.

### 3. LLM Prompt & Tuning Iteration
**Goal:** Make the prompt produce bold UI differences reliably.
- Add structured examples for explorer/team/enterprise flows in the prompt library with commentary on triggers.
- Introduce guidance for aggressively dropping or merging steps when confidence is high.
- Explore adding few-shot completions or "negative" examples to avoid rules-like outputs.
- Document prompt changes and experiment notes in `docs/prompt-changelog.md`.
- Optional stretch: evaluate temperature/top-k settings even if reasoning models ignore some parameters.

### 4. Runtime Experience Layer
**Goal:** Show the AI at work directly in the UI.
- Add a persona badge + confidence meter next to the form title.
- Surface `metadata.reasoning` in the debug panel and allow collapsing.
- Build a "Compare" drawer that renders the rules-engine plan vs. LLM plan side by side (field count, CTA text, step order).
- Highlight AI-specific components or skipped fields with a subtle “AI suggested” tag.
- Ensure the experience degrades gracefully when in fallback/rules mode.

### 5. Evaluation & Observability
**Goal:** Capture quantitative proof of adaptation.
- Extend eval logger to compute deltas: `field_count_delta`, `skipped_steps`, `component_diff`, `persona_selected`.
- Update JSONL format and Airtable sync script to include the new columns; backfill Airtable schema.
- Add CLI command `bun run eval:summary` that prints key metrics from the logs for quick demos.
- Define an eval harness scenario for at least three personas (explorer, team, power user) with canned sessions.

### 6. Platform & Deployment Readiness
**Goal:** Keep Railway + local setups simple despite new features.
- Add new environment toggles (`ENABLE_AI_DEBUG_BADGES`, `EXPERIMENTAL_COMPONENTS`) to `.env.local.example` and README.
- Verify bun/Next build still tree-shakes unused components when AI is off.
- Update `docs/railway-checklist.md` with additional smoke tests covering AI-only components and debug HUD.

### 7. Documentation & Storytelling
**Goal:** Package the POC narrative for non-technical stakeholders.
- Expand README with a "How the AI rewrites your UI" section, including persona walkthroughs and screenshots.
- Create `docs/demo-script.md` outlining the demo flow, what to click, and callouts for the AI reasoning panel.
- Summarise lessons learned + next bets in `PHASE3.md` once milestones are complete (iteratively update this file).

## Milestones & Timeline (T-shirt estimate assuming 2-week sprints)
- **Sprint 1:** Workstreams 1–2 foundational schema + UI renderer updates. Ship persona playbooks draft.
- **Sprint 2:** Prompt iteration and runtime experience (Workstreams 3–4). Internal demo to validate wow factor.
- **Sprint 3:** Evaluation pipeline, deployment updates, documentation polish (Workstreams 5–7). Prep Railway demo environment.

## Dependencies & Risks
- OpenAI API limits or model regressions → mitigate with cached fixtures + ability to swap models via env var.
- UI complexity creeping into baseline rules → enforce "AI-only" component flag to avoid regression.
- Airtable API quota → batch uploads and keep offline JSONL as source of truth.
- Designer input required for persona copy; schedule a review early in Sprint 1.

## Open Questions
- Do we need a third persona (e.g., "power") for enterprise pilots, or is explorer/team sufficient for the demo?
- Should we gate experimental components behind feature flags for production readiness, or accept them as POC-only?
- How aggressively should we allow the LLM to skip directly to Review when confidence > 0.8?

## Next Steps Checklist
1. Align stakeholders on persona playbooks (PM + Design review).
2. Kick off schema expansion spike; update tests before touching UI.
3. Draft prompt changes and run manual evals using saved sessions.
4. Stand up the debug HUD compare view with mocked data to test layout.
5. Define Airtable column schema changes and update sync script.
