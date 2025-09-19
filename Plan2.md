# Plan 2 — Canvas Chat (LLM-to-UI Showcase)

## Product Thesis
- One-input “Canvas Chat” that materializes a tailored onboarding workspace in seconds.
- The model does a tiny, deterministic job (classify intent → select a recipe). UI assembly is local and safe using prebuilt, schema-validated components.
- The wow moment: type a sentence → watch the page assemble relevant UI with a short “why” explanation.

## Experience Principles
- Single action, instant payoff; no dead-ends (always a reasonable fallback).
- Visible adaptation across personas (explorer vs team vs power).
- Strict safety rails: render only whitelisted components with validation.
- Minimal latency, graceful degradation if LLM is slow/unavailable.

## User Journey (MVP)
1. Entry screen shows a centered chat input with example chips (e.g., “Plan a team space”, “Solo notes hub”, “Client project with Slack/Jira”).
2. User types a sentence and submits. A brief “assembling your workspace…” animation plays.
3. UI assembles using a preselected recipe (LLM output or heuristics) and fades in components.
4. A persona badge and reasoning chip explains the choice. User can edit values or hit Continue → Review.
5. Optional refinement: one follow‑up instruction (e.g., “no invites, add Notion”) patches the plan (P1+).

## Recipes (Prebuilt, Deterministic)
- R1 Explorer Quick Start
  - Components: callout(info), text(workspace_name optional), ai_hint, checklist(“What’s next”).
  - CTAs: Continue, Skip for now. Goal: frictionless start.
- R2 Team Workspace
  - Components: info_badge(“Team mode”), text(workspace_name), select(team_size), integration_picker(Slack/Jira preselected), teammate_invite, admin_toggle(Approvals On/Off).
- R3 Client Project
  - Components: text(workspace_name), select(project_type=client), integration_picker(GDrive/Slack/Asana), ai_hint(share safely), checklist(kickoff/files/access).
- R4 Power/Compliance
  - Components: text(workspace_name), admin_toggle(Approvals), checkbox(audit_logging), select(access_level), integration_picker(Okta/Jira).

Each recipe is an exact field list using the supported palette you added (callout, checklist, info_badge, ai_hint, integration_picker, teammate_invite, admin_toggle + core inputs).

## LLM Contract (Tiny)
- Input: `{ user_message, optional_context }`
- Output JSON (strict):
  - `persona`: `explorer | team | power`
  - `intent_tags`: string[] (e.g., `['integrations','invites','governance','client','solo']`)
  - `recipe_id`: `R1|R2|R3|R4`
  - `confidence`: 0–1 (clamped)
  - `reasoning`: <= 160 chars
- Client maps `recipe_id` → a local recipe payload and renders. No freeform fields accepted from the model in MVP.

## Heuristics Fallback (if LLM low-confidence or timeout)
- “team”, “invite”, numbers > 2 → R2
- “client”, “agency”, “stakeholder” → R3
- “policy”, “approval”, “audit”, “security” → R4
- Else → R1

## Wow Mechanics
- Assembly animation: staggered slide/fade (50–75ms intervals) for sections.
- Persona badge color: Explorer (blue), Team (indigo), Power (amber).
- Reasoning chip: concise explanation, e.g., “Team setup: mentioned 10 people + Slack/Jira.”

## Copy Deck (samples)
- Prompt placeholder: “What do you want to get done today?”
- Explorer callout: “We’ll start simple. You can add more later.”
- Team info_badge: “Team workspace with invites and integrations.”
- Power admin_toggle labels: “Disabled • Required approvals • Learn more”.

## Architecture (MVP)
- Frontend
  - Route: `src/app/canvas/page.tsx` with `CanvasChat` component.
  - Recipe registry: `src/lib/canvas/recipes.ts` exports R1–R4 as typed field arrays.
  - Persona badge + reasoning chip; assembly animation helper.
  - Reuse `FormRenderer` with experimental components behind `NEXT_PUBLIC_ENABLE_EXPERIMENTAL_COMPONENTS` (already added).
- Backend / LLM
  - Endpoint: `POST /api/canvas/plan` → calls tiny classifier (existing LLM infra) with 3s timeout, 1 retry.
  - Returns `{ recipe_id, persona, tags, confidence, reasoning }`. Heuristics compute if LLM fails.
- Observability
  - Log to eval JSONL: `user_message, recipe_id, persona, components_count, confidence, reasoning, fallback_used`.
  - Debug drawer: show selected recipe vs. heuristics and component deltas.

## Acceptance Criteria
- “Stand up a space for 10 people with Slack & Jira” → R2 with integration_picker preselected (Slack/Jira), teammate_invite visible, admin_toggle present.
- “Personal notes, I’ll set details later” → R1 with callout + ai_hint + optional name + checklist; skip available.
- Reasoning chip present; field count differs from R1 baseline by ≥3 for R2/R3/R4.
- If LLM fails, heuristics still produce a coherent recipe; all outputs validate against Zod schema.

## Metrics
- Conversion to Review from first screen.
- Time to assemble (ms) < 800ms target.
- Component deltas (count/types) per recipe.
- Recipe distribution and fallback rate.
- Reasoning chip open rate (proxy for “wow”).

## Risks & Mitigations
- Ambiguous queries → heuristics tie‑break; example chips to guide.
- Latency → render heuristics immediately; if LLM disagrees within 1s, gently patch with a toast (“Adjusted for team setup”).
- Visual sameness → enforce AI‑only component per recipe (e.g., R2 must include either invite or integration_picker).

## Build Plan (1 Sprint)
- Day 1: Recipes R1–R4 JSON + canvas route shell + persona badge + animations.
- Day 2: Minimal API + LLM classifier + heuristics fallback + reasoning chip.
- Day 3: Wire FormRenderer + experimental components; test 4 scripted prompts.
- Day 4: Copy polish, example chips, logging, demo script.
- Day 5: Bugfix, Railway smoke, record demo video.

