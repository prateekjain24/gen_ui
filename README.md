# Generative Onboarding UI – Proof of Concept

This repository contains a Next.js proof of concept that teaches a computer how to adjust an onboarding experience in real time. The goal is simple: when someone fills out our form, the interface reacts like a thoughtful teammate—removing irrelevant questions, highlighting the useful ones, and shortening the path to “you’re all set!”

> **Audience note:** this README is written for non-technical teammates first. Developers will still find run commands and environment details in the “Getting Started” section.

---
## How the Experience Works (Plain-English Walkthrough)

1. **We observe what the person is doing.**
   - Every click, focus, or step submission creates a small event (e.g., “hesitated on workspace name for 6 seconds”).
   - These events are summarized into “signals” such as hesitation, repeated corrections, skips, or idle time.

2. **We store the person’s current state.**
   - The session keeps track of which fields are filled, which steps are complete, and which persona they resemble (an “explorer” taking a quick solo look vs. a “team” user setting up coworkers).

3. **We describe the session to the AI.**
   - A structured JSON “context packet” is built for the language model. It includes the session snapshot, the latest behavior signals, and engagement metrics.

4. **We ask the AI to suggest the next step.**
   - The prompt gives the AI very specific boundaries: use only approved field IDs, keep titles short, never exceed six fields, and prefer lighter flows for explorers.
   - The AI responds with a tool call (`propose_next_step`) that describes step metadata, fields, buttons, and a confidence score.

5. **We validate and polish the AI’s answer.**
   - A deterministic parser checks the AI response against the schema. If anything looks off, we ignore it and fall back to the rules-based plan.
   - When valid, the “field enhancer” adds finishing touches: default values from the person’s previous answers, persona-specific placeholders, and helper text if we noticed hesitation or corrections.

6. **We show the updated UI.**
   - The onboarding flow renders the new plan immediately.
   - A debug panel (visible in development) shows whether the AI or rules engine produced the plan.

7. **We keep a safety net.**
   - A toggle lets us switch back to deterministic rules at any time.
   - If the AI ever misbehaves, the fallback plan displays automatically with a “sticking with rules” notice.

In other words, the person filling out the form sees a friendly assistant that adapts to them. Behind the scenes we always keep a safe rules engine ready, so the experience never breaks.

### A Tale of Two Journeys

- **Maya (solo designer):** breezes through the basics, skips workspace settings, and hesitates on pricing. The AI keeps her flow under three steps, prefills optional fields, and suggests “Skip for now” CTAs.
- **Leo (team lead):** enters a company domain, invites 7 teammates, and selects “project templates.” The AI adds workspace configuration, integration checkboxes, and keeps review mandatory so he can double-check details.

Both flows start with rules, but once each person submits their first step the LLM takes the lead, tailoring the next screen while the debug panel shows how confident the model felt and why.

---
## Current Capabilities (Phase 2 Summary)

| Area | Status | Notes |
|------|--------|-------|
| OpenAI SDK 5 integration | ✅ | Bun runtime + retries, exponential backoff, usage tracking. |
| Tool schema (`propose_next_step`) | ✅ | Strict JSON schema with enums for fields/steps/actions. |
| System prompt | ✅ | Persona rules, constraint list, behavioral guidance. |
| User context builder | ✅ | Session snapshot, recent events, engagement scoring. |
| LLM response parsing & enhancement | ✅ | Zod-based validation + persona placeholders, defaults, option filtering. |
| Behavior analytics | ✅ | Hesitation, corrections, abandonment risk, time-on-step metrics. |
| Decision toggle & fallback UX | ✅ | Default strategy is LLM, waits for user signals, surfaces fallback banner. |
| Eval logging | ✅ | JSONL logger + `bun run push:evals` to sync with Airtable. |
| Railway deployment checklist | ✅ | See `docs/railway-checklist.md` for env vars, volume strategy, smoke tests. |
| Guided entry copy & chips | ✅ | Canvas Chat placeholder, helper text, and auto-submitting example prompts match the Plan 2 copy deck. |

---
## Getting Started (Developers)

### 1. Prerequisites
- **Bun 1.1+** – install via `curl -fsSL https://bun.sh/install | bash`
- **Node.js 18.17+** (Bun bundles its own Node-compatible runtime)
- **OpenAI API key** (optional for rules-only mode, required for LLM mode)

### 2. Clone & Install
```bash
bun install
```

### 3. Environment Variables (`.env.local`)
| Key | Description | Example |
|-----|-------------|---------|
| `OPENAI_API_KEY` | OpenAI API key for GPT-5 Mini calls. | `sk-...` |
| `OPENAI_MODEL` | Default LLM model. Keep at `gpt-5-mini` for this POC. | `gpt-5-mini` |
| `LLM_PROMPT_VERSION` | Version string stamped into eval logs. Update when prompts change. | `2025-09-19-form-orchestrator` |
| `ENABLE_LLM_ORCHESTRATION` | Turn AI orchestration on/off (`true`/`false`). | `true` |
| `LLM_ROLLOUT_PERCENTAGE` | Percentage of sessions that use the LLM when strategy = auto. | `100` |
| `ENABLE_EVAL_LOGGING` | Toggle JSONL logging (set `false` if storage-constrained). | `true` |
| `EVAL_LOG_DIR` | Directory for eval logs (use a persistent volume in hosting). | `eval/logs` |
| `AIRTABLE_API_KEY` | Airtable token for `bun run push:evals`. | `pat-...` |
| `AIRTABLE_BASE_ID` | Airtable base that hosts the `llm_decisions` table. | `appXXXXXXXXXXXXXX` |
| `AIRTABLE_TABLE_NAME` | Airtable table name (override if different). | `llm_decisions` |
| `NEXT_PUBLIC_API_URL` | Public base URL (used in debug panel). | `http://localhost:3000` |
| `NEXT_PUBLIC_LLM_STRATEGY` | Default client strategy. Defaults to LLM now. | `llm` |
| `NEXT_PUBLIC_DEBUG` | `true` forces the debug panel on (great for demos). | `true` |

> Copy `.env.example` to `.env.local` and fill in the blanks. Environment variables prefixed with `NEXT_PUBLIC_` are safe for the browser; everything else stays server-side.

### 4. Run the POC
```bash
# Standard dev build
bun run dev

# Dev build with debug panel forced on
bun run dev:debug
```
Visit [`http://localhost:3000/onboarding`](http://localhost:3000/onboarding) and open the debug panel (enabled automatically in dev). Use the “Switch to LLM/Rules” button to watch the UI adapt.

### 5. Useful Scripts
| Command | Purpose |
|---------|---------|
| `bun run lint` / `lint:fix` | ESLint checks / auto-fix. |
| `bun run typecheck` | TypeScript validation. |
| `bunx jest` or `bun run test` | Run the unit suite. |
| `bun run build` & `bun run start` | Production build + serve (used for Railway). |
| `bun run check` | Runs lint, typecheck, tests in sequence. |
| `bun run push:evals` / `push:evals:dry` | Sync eval JSONL records to Airtable (or preview). |

---
## Debug Panel & Strategy Toggle
- **Plan Source** shows `rules`, `llm`, or `fallback`.
- **LLM Strategy** displays the active strategy and provides a toggle.
- Default strategy is `LLM`, but the first screen still uses rules until we collect real user signals.
- The selected strategy is stored in `sessionStorage` (`gen_ui_llm_strategy`) so page refreshes keep your choice.
- When the AI is unavailable, the UI reverts to the rules plan and displays a warning banner in-app.

---
## Safety Net & Fallback Logic
1. `/api/plan` always computes the deterministic rules plan first.
2. If strategy is `llm` (or `auto` with rollout enabling AI), the API asks OpenAI for a new plan.
3. Parser validation ensures the AI response is well-formed; failed validation triggers a rules fallback with `source: 'fallback'`.
4. The client surfaces the fallback message but keeps the flow running.

This means the POC can demo AI-driven behavior without risking a broken experience.

---
## Evaluation & Logging Workflow
- Each LLM decision appends a JSONL record in `eval/logs/<date>.jsonl` (session context, enhanced plan, reasoning, confidence).
- Run `bun run push:evals` to push new rows to Airtable for human labeling (use `--dry-run` to preview).
- `Eval.md` documents the schema, sync state file, and roadmap for replaying decisions against future prompts.

---
## Deployment Preview (Railway)
- Build command: `bun run build`
- Start command: `bun run start`
- Health check: GET `/`
- Attach a persistent volume and set `EVAL_LOG_DIR=/data/eval/logs` so eval records survive restarts.
- Required secrets: `OPENAI_API_KEY`, `OPENAI_MODEL=gpt-5-mini`, `LLM_PROMPT_VERSION`, `ENABLE_LLM_ORCHESTRATION`, `AIRTABLE_*`.
- After deploy run the smoke test in [docs/railway-checklist.md](docs/railway-checklist.md) (LLM toggle, fallback banner, eval sync dry-run).

---
## Testing Checklist Before Demos
1. `bun run check`
2. Load `/onboarding` → complete a flow as an explorer → confirm reduced steps.
3. Toggle to LLM, repeat as a “team” persona (fill `team_size` ≥ 5) → confirm additional fields appear.
4. Force fallback (temporarily unset `OPENAI_API_KEY`) → confirm warning and rules plan.
5. Inspect debug panel for correct plan source and signal summaries.
6. Run `bun run push:evals:dry` to confirm eval logs are being collected locally.

---
## Troubleshooting & FAQs
- **“Why didn’t the flow change when I toggled LLM?”** If the AI returns `null` or fails validation, we fall back to rules. Check the debug panel—`source: fallback` indicates a safe fallback. Re-enable once the API key is valid.
- **“Where do I see what the AI decided?”** Open the debug panel and expand “Plan payload”. It shows the enhanced plan we render.
- **“Can we disable the AI in production?”** Yes. Set `ENABLE_LLM_ORCHESTRATION=false` or reduce `LLM_ROLLOUT_PERCENTAGE` to 0. Clients can also default to the rules strategy.
- **“What data leaves the browser?”** Only the fields and events needed to determine the next step. Sensitive values (emails, comments) are sanitized or truncated before logging.
- **“Can we raise the 1000-token max?”** The current cap keeps latency under ~15s and avoids higher per-call costs on GPT-5 Mini reasoning mode, which already ignores settings like `temperature`/`top_p`.citeturn1search0 Increase it only if we see signs the model lacks enough space to include instructions or reasoning.

---
## Roadmap (Post-POC)
- Eval replay harness & CI guardrails.
- Lightweight reviewer UI for browsing JSONL logs without Airtable.
- Usage insights card in the debug panel (surfacing hesitation/correction metrics live).
- A/B testing, telemetry dashboards, and production hardening once the POC is validated.

---
## License
This project is internal-only for now; no public license has been assigned.

---
Questions or ideas? Open a GitHub issue or ping the AI/UX channel—this POC is meant to evolve quickly based on your feedback.
