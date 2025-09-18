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
| Decision toggle & fallback UX | ✅ | Rules/LLM switch, graceful fallback, debug panel control. |
| Eval logging (coming) | ⏳ | Will capture each AI decision for future labeling. |
| Railway deployment checklist (coming) | ⏳ | Documented build commands, env vars, smoke tests pending. |

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
| `OPENAI_MODEL` | Default LLM model (already set to `gpt-5-mini`). | `gpt-5-mini` |
| `ENABLE_LLM_ORCHESTRATION` | Turn AI orchestration on/off (`true`/`false`). | `true` |
| `LLM_ROLLOUT_PERCENTAGE` | Percentage of sessions that use the LLM when strategy = auto. | `100` |
| `NEXT_PUBLIC_API_URL` | Public base URL (used in debug panel). | `http://localhost:3000` |
| `NEXT_PUBLIC_LLM_STRATEGY` | Default client strategy (`llm` or `rules`). | `rules` |

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

---
## Debug Panel & Strategy Toggle
- **Plan Source** shows `rules`, `llm`, or `fallback`.
- **LLM Strategy** displays the active strategy and provides a toggle.
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
## Evaluation & Logging Plan (Upcoming)
- Every time the AI returns a plan we will store a JSONL record containing: session context, AI metadata, enhanced plan, and decision source.
- A Bun script will sync these records to Airtable so non-technical reviewers can label them (`pass`/`fail` with notes).
- The labeled set will drive regression checks when we tweak prompts or models (see `Eval.md` for the evolving playbook).

---
## Deployment Preview (Railway)
- Build command: `bun run build`
- Start command: `bun run start`
- Ensure `ENABLE_LLM_ORCHESTRATION` and `OPENAI_API_KEY` are set in Railway variables.
- Health check: GET `/` returns the Next.js landing page.
- After deploy, run a smoke test: load `/onboarding`, toggle LLM on, confirm fallback message appears if the model key is missing.

A dedicated “Railway deployment checklist” ticket tracks the full validation steps.

---
## Testing Checklist Before Demos
1. `bun run check`
2. Load `/onboarding` → complete a flow as an explorer → confirm reduced steps.
3. Toggle to LLM, repeat as a “team” persona (fill `team_size` ≥ 5) → confirm additional fields appear.
4. Force fallback (temporarily unset `OPENAI_API_KEY`) → confirm warning and rules plan.
5. Inspect debug panel for correct plan source and signal summaries.

---
## Troubleshooting & FAQs
- **“Why didn’t the flow change when I toggled LLM?”** If the AI returns `null` or fails validation, we fall back to rules. Check the debug panel—`source: fallback` indicates a safe fallback. Re-enable once the API key is valid.
- **“Where do I see what the AI decided?”** Open the debug panel and expand “Plan payload”. It shows the enhanced plan we render.
- **“Can we disable the AI in production?”** Yes. Set `ENABLE_LLM_ORCHESTRATION=false` or reduce `LLM_ROLLOUT_PERCENTAGE` to 0. Clients can also default to the rules strategy.
- **“What data leaves the browser?”** Only the fields and events needed to determine the next step. Sensitive values (emails, comments) are sanitized or truncated before logging.

---
## Roadmap (Post-POC)
- Automated eval logging & Airtable sync (P2-POC-02).
- Railway deployment & smoke test documentation (P2-POC-03).
- A/B testing, telemetry dashboards, and production hardening once the POC is validated.

---
## License
This project is internal-only for now; no public license has been assigned.

---
Questions or ideas? Open a GitHub issue or ping the AI/UX channel—this POC is meant to evolve quickly based on your feedback.
