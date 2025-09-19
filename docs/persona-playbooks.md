# Persona Branching Playbooks

Phase 3 requires the onboarding flow to visibly diverge by persona. This document defines the behaviour, content, and acceptance criteria for the **Explorer** and **Team** journeys, along with a stretch "Power" persona used for internal evals.

## Goals
- Make LLM-driven screens obviously different from the rules baseline.
- Provide copy, fields, and step sequencing that product/design can review.
- Supply testable fixtures so engineers can lock behaviour into unit tests and eval snapshots.

## Persona Signal Matrix
| Persona | Entry Signals | Confidence Boosters | Confidence Reducers |
| ------- | ------------- | ------------------- | ------------------- |
| Explorer | `primary_use` = personal, team_size ≤ 2, no company provided, high correction count on identity fields, short sessions | Completed Basics without validation errors, entered workspace name | Idle > 12s on business fields, multiple corrections on workspace name |
| Team | `primary_use` = team/org, team_size ≥ 5, company field populated, integration interest flagged | Completed Workspace quickly, invited teammates, consistent domain email | Idle > 8s on team-specific fields, skipping Workspace |
| Power (stretch) | enterprise domain email, `role` in leadership, features toggled extensively | Provided integrations + advanced feature interest, low hesitation | Any skipped fields, frequent back navigation |

LLM metadata must include detected persona and reasoning referencing at least one signal above.

## Journey Blueprints

### Explorer Flow (2–3 steps max)
1. **Basics**
   - Required: full_name, email, role, primary_use.
   - Copy leans casual: "Tell us the essentials so we can tailor recommendations."
2. **Workspace (Optional)**
   - Fields: workspace_name (optional), callout highlighting smart defaults, checklist for "Remind me later" toggle.
   - Skip allowed with primary CTA "Continue" + secondary "Skip for now".
3. **Review / Complete**
   - If confidence ≥ 0.7 and corrections ≤ 3, jump directly to Review.
   - Reasoning should mention friction minimisation.

### Team Flow (4+ steps)
1. **Basics** (same fields, business tone copy).
2. **Workspace Setup**
   - Required: workspace_name, company, team_size, project_type.
   - Additional AI-only components: integrations checklist, info_badge about inviting teammates.
3. **Invite Teammates** *(AI-only step)*
   - Fields: team_invites (text list), notify_team (checkbox), preferred_integrations (multi-select).
   - CTA: "Send Invites" with secondary "Skip for now".
4. **Preferences**
   - Highlight advanced notification defaults; include timezone select if not already captured.
5. **Review**
   - Always present; ensure summary groups team settings separately.

### Power Persona (Eval Only)
- Shares team baseline but asks for admin controls (access_level, auditing opt-in).
- Used to validate the LLM can stretch while staying within schema.

## Copy & Tone Guidelines
- Explorer: conversational, encourage skipping optional fields, reassure they can edit later.
- Team: outcomes-focused, emphasise collaboration benefits, reference security/compliance if signals detected.
- Power: authoritative tone, highlight governance.

## Component Palette Expectations
- Explorer-only: `callout` with reassuring message; `checklist` describing what happens next.
- Team-only: `info_badge`, `multi_select` (alias of `checkbox` but validated via repair step), `integration_picker` (maps to checkbox list with integrations ID set).
- Ensure `repairLLMPayload` recognises these IDs and maps to supported kinds.

## Acceptance Snapshots
Create canned session fixtures under `eval/snapshots/`:
- `explorer_happy_path.json` – expects Workspace skipped, AI reasoning referencing corrections.
- `team_full_setup.json` – expects Invite step plus integrations.
- `power_admin_controls.json` – stretch with auditing field.
Each snapshot should include the serialized `sessionContext`, `metadata`, and `stepConfig` returned by the LLM.

## Testing Checklist
- Update `src/lib/policy/__tests__/llm.test.ts` with persona-specific payloads.
- Add visual regression screenshots (Explorer vs Team) to `/docs/assets/` for demo use.
- Ensure `bunx jest --filter=llm` covers new fixtures once implemented.

## Open Questions for Design Review
1. Do Explorer callouts need icons or can we reuse existing Tailwind utility badges?
2. Should Team invites block progression if no emails entered (currently optional)?
3. How do we represent integration interest when the provider has 20+ options—limit to top 5?

---
**Next Actions**
1. Review this playbook with Design + PM.
2. Confirm component naming with engineering before updating schema.
3. Start authoring prompt examples that reference these flows.
