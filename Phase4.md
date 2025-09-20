# Phase 4 – Hyper-Personalized Canvas Planner

## Vision
Phase 4 transforms the canvas planner from a rules-heavy demo into a genuinely adaptive product. The system should interpret any workspace brief, extract structured signals, and configure flows that feel tailored—while keeping deterministic guardrails. Reviewers should experience prompts that produce bespoke component mixes, calibrated copy, and parameterized settings without manual fiddling.

## Guiding Principles
- **Context first, heuristics second:** Always derive structured context from the user brief before engaging the rule engine.
- **Templates with trusted blanks:** Components ship with vetted scaffolds; the LLM only fills safe, text-level slots.
- **Explain every adjustment:** UI, logs, and telemetry must reveal why a particular variant or parameter was chosen.
- **Tunable by humans:** Product, design, and ops need toggles and weights they can adjust without code pushes.
- **Fallback friendly:** When signals are weak, we degrade gracefully to Phase 3 heuristics and document the rationale.

## Success Criteria
- Prompts containing new tools, team sizes, or compliance cues change the selected recipe, component parameters, and helper text within one request.
- Less than 10% of LLM responses require fallback because of schema violations after introducing structured slot-filling.
- Review screen highlights at least three customizable levers (e.g., approval chain depth, integration picks, tone) and allows quick edits.
- Telemetry and eval logs capture extracted prompt signals, chosen variants, and post-edit deltas for every session.
- Stakeholders can adjust weighting tables and slot templates via JSON config without redeploying.

## Workstreams & Deliverables

### 1. Prompt Intelligence Layer
**Goal:** Convert free-form briefs into structured intent objects.
- Design a hybrid extractor (deterministic keyword map + low-temperature LLM parser) capturing team size, decision makers, tools, constraints, tone.
- Persist extracted signals in session state and expose them in the debug HUD.
- Build unit/fixture coverage for edge prompts (jargon, multilingual, partial sentences).
- Deliverable: `src/lib/prompt-intel` module with tests and telemetry annotations.

### 2. Personalization Engine
**Goal:** Parameterize recipes and components using the extracted signals.
- Extend recipe definitions with tunable knobs (e.g., `approvalChainLength`, `integrationMode`, `copyTone`).
- Introduce a scoring layer that merges extracted signals with heuristics to pick knob values.
- Ensure fallbacks roll back to Phase 3 defaults when confidence is low.
- Deliverable: Updated recipe config, scoring utilities, and validation tests.

### 3. Template & Copy System
**Goal:** Allow safe LLM co-authoring without compromising structure.
- Define template schemas for step titles, CTAs, helper text, and callouts with explicit allowed slots.
- Let the LLM populate only whitelisted slots; keep guardrails that compare sentiment/tone to requested persona.
- Cache successful completions per persona/industry to reuse without API hits.
- Deliverable: Template library (`src/lib/canvas/templates.ts`), slot validator, and snapshot tests.

### 4. UI Personalization Surfaces
**Goal:** Visualize choices and enable quick adjustments.
- Add a “Customize” drawer showing detected signals, adjustable knobs, and real-time previews.
- Annotate AI-populated text/iconography with subtle badges and tooltips explaining source signals.
- Provide undo/reset to Phase 3 baseline for any knob.
- Deliverable: Updated canvas UI components, storybook fixtures, and UX acceptance screenshots.

### 5. Learning & Feedback Loop
**Goal:** Turn user edits into future improvements.
- Log post-plan edits (e.g., knob changes, text overrides) and tie them back to extracted signals.
- Create a lightweight label queue for PMs/ops to approve new heuristics or examples.
- Feed approved labels into prompt examples and scoring weights via config.
- Deliverable: Telemetry schema updates, `docs/feedback-loop.md`, and label processing CLI.

### 6. Platform & Safety Readiness
**Goal:** Keep the system reliable and governable as customization increases.
- Add environment toggles for prompt intelligence, personalization engine, and template overrides.
- Document runtime toggles (`ENABLE_PROMPT_INTEL`, `ENABLE_PERSONALIZATION`, `ENABLE_LABELING_REVIEW`) with Railway defaults (true/true/false).
- Introduce rate limiting and timeout policies tuned for richer LLM usage (e.g., 30s classifier timeout, higher context window models).
- Document red-team scenarios (ambiguous prompts, regulated industries) with mitigation guidance.
- Deliverable: Updated `.env.local.example`, runbooks in `docs/operability/`, and alerting hooks.

## Milestones & Timeline (2-week sprints)
- **Sprint 1:** Prompt intelligence and recipe parameterization foundations (Workstreams 1–2).
- **Sprint 2:** Template system + UI surfaces (Workstreams 3–4) with internal demo.
- **Sprint 3:** Feedback loop, safety hardening, documentation polish (Workstreams 5–6) leading to stakeholder review.

## Dependencies & Risks
- Need clear ownership for maintaining slot templates and weight tables; missing DRI could stall updates.
- Increased LLM usage may hit rate limits; budget monitoring and caching is critical.
- Misaligned tuning knobs could overwhelm users—ensure UX executes usability tests alongside development.
- Legal/compliance review may be required before using extracted constraints in automated approvals.

## Open Questions
- Which signals must remain deterministic vs. LLM-derived for compliance-sensitive customers?
- Do we need region-specific templates (e.g., EU onboarding) before launch?
- How will we prioritize manual overrides when multiple editors tweak the same plan?
- Should we pursue few-shot fine-tuning or stay with prompt-only adjustments in Phase 4?

## Next Steps Checklist
1. Host cross-functional kickoff to align on extracted signal list and ownership.
2. Spike on extractor accuracy with a curated prompt set; document baseline metrics.
3. Prototype knobbed recipes for two core personas (explorer, power) and review with design.
4. Draft template schemas and vet with legal/compliance for copy boundaries.
5. Plan telemetry schema changes with data infra to ensure downstream compatibility.
