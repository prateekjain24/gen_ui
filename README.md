# Canvas Personalization Sandbox

Canvas is a Next.js + Bun playground for hyper-personalised onboarding flows. It combines:

- **Prompt intelligence** – deterministic and LLM-derived signals describing the user’s brief.
- **Recipe knobs** – parameterised defaults for each persona.
- **Template catalog + validator** – slot definitions with tone and length guardrails.
- **Template fill pipeline** – single LLM call that populates copy, validates it, and records telemetry.

This README is written for engineers and PM/UX partners who want to understand how Phase 4 hangs together.

---
## 1. System Overview

```
User Prompt ──► Prompt Intelligence ──► Signals
                                    │
                                    ▼
                            Recipe Scoring (knobs)
                                    │
                                    ▼
                     Template Fill Pipeline (LLM + validator)
                                    │
                                    ▼
                          Canvas Plan Assembly (UI)
```

1. **Prompt intelligence** (`src/lib/prompt-intel`) merges keyword heuristics and an LLM parser into typed `PromptSignals`.
2. **Personalization scoring** (`src/lib/personalization/scoring.ts`) turns signals into knob overrides and fallbacks.
3. **Template schema** (`src/lib/canvas/templates.ts`) declares every adjustable slot with tone, limits, and defaults.
4. **Template validator** (`src/lib/canvas/template-validator.ts`) enforces those constraints.
5. **Template fill pipeline** (`src/lib/canvas/template-fill.ts`) calls OpenAI once, merges prior values, validates output, and hashes copy for telemetry.
6. **Canvas plan API** (`src/app/api/canvas/plan/route.ts`) wires everything together and returns fields + personalised copy to the UI.
7. **Canvas Chat UI** (`src/components/canvas/CanvasChat.tsx`) renders the form, highlights personalized copy, and surfaces fallback reasons.

---
## 2. Key Concepts

| Concept | Location | Purpose |
|---------|----------|---------|
| `PromptSignals` | `src/lib/prompt-intel/types.ts` | Structured prompt metadata (team size, compliance tags, tone, etc.). |
| Recipe knobs | `src/lib/canvas/recipes.ts` | Parameter defaults (integration mode, approval chain length, etc.). |
| Fixtures | `src/lib/personalization/__fixtures__` | Snapshot inputs ensuring scoring heuristics stay stable. |
| Template catalog | `src/lib/canvas/templates.ts` | Declarative slots with fallbacks and tone hints. |
| Slot validator | `src/lib/canvas/template-validator.ts` | Enforces max length, forbidden phrases, tone heuristics. |
| Template fill pipeline | `src/lib/canvas/template-fill.ts` | Generates copy, validates, hashes, and records telemetry. |
| Plan API | `src/app/api/canvas/plan/route.ts` | Produces recipes, personalization metadata, and template copy. |

---
## 3. Workflow Details

### 3.1 Template Validation

`validateTemplateSlots(templateId, values, options)` returns:

```ts
{
  templateId,
  isValid,
  sanitizedValues,   // trimmed + defaulted text
  issues: [{ slotId, reason, severity }],
  fallbackApplied,
}
```

Checks include:
- Required slots present (unless `allowPartial`).
- Character limits.
- Forbidden content (e.g. “lorem ipsum”, `<script>`).
- Tone heuristics (negative language, slang vs. compliance tone keywords).

### 3.2 Template Fill Pipeline

`renderTemplateCopy(context)` accepts recipe/persona/signals/knobs and a list of templates to populate. Behaviour:

1. Batches templates and builds a JSON prompt describing slots, tone, existing values, and signal/knob summaries.
2. Calls OpenAI with GPT‑5 Mini (30 s timeout, single retry).
3. Parses JSON output; if parsing fails the validator falls back to defaults and records an `invalid_template_json` issue.
4. Validates all slot values and returns:
   - `templates`: validated values + issue metadata.
   - `telemetry`: hashed slot values (SHA‑256 truncated) and validation issues.
   - `rawResponse`: original LLM text (for debug logging).

### 3.3 Plan Assembly

`POST /api/canvas/plan` now returns:

- `promptSignals` – merged signal payload for debug H
- `personalization` – knob overrides + fallback reasons.
- `templateCopy` – validated strings for step title, helper text, CTA, callout, badge, plus issue list.

Log records (`src/lib/llm/eval-logger.ts`) include `templateTelemetry` so eval reviewers can inspect hashed copy and validation outcomes without raw text.

The client (`CanvasChat`) uses `templateCopy` to override headings, helper text, CTAs, and badges, while showing a warning when validator issues occur.

---
## 4. Running the Project

### Prerequisites
- Bun ≥ 1.1 (`curl -fsSL https://bun.sh/install | bash`)
- Node.js 18.17+ (Bun bundles a compatible runtime)
- Optional: OpenAI API key (set `OPENAI_API_KEY`) for LLM features

### Install & Dev Server
```bash
bun install
bun run dev
```
- Dev server: http://localhost:3000 (Turbopack)

### Environment Variables (`.env.local`)
| Key | Description | Example |
|-----|-------------|---------|
| `OPENAI_API_KEY` | Required to enable template fill + personalization LLM calls | `sk-...` |
| `OPENAI_MODEL` | LLM model ID | `gpt-5-mini` |
| `LLM_PROMPT_VERSION` | Prompt version string for eval logging | `phase4-alpha` |
| `ENABLE_LLM_ORCHESTRATION` | “false” to force heuristics | `true` |
| `ENABLE_PROMPT_INTEL` | Toggle keyword/LLM signal extraction | `true` |
| `ENABLE_PERSONALIZATION` | Toggle knob scoring + customize drawer | `true` |
| `ENABLE_LABELING_REVIEW` | Enable in-memory labeling queue + CLI tools | `false` |
| `EVAL_LOG_DIR` | Directory for JSONL eval logs | `eval/logs` |

### Useful Scripts
| Command | Description |
|---------|-------------|
| `bun run lint` | ESLint over TS/TSX |
| `bun run typecheck` | `tsc --noEmit` |
| `bunx jest` | Jest unit + integration suites |
| `bun run push:evals` | Sync eval logs (see `Eval.md`) |

---
## 5. Testing Strategy

1. **Unit tests**
   - Personalization fixtures (`src/lib/personalization/__tests__/fixtures.test.ts`) snapshot knob overrides + fallback reasons.
   - Template validator & fill tests cover happy path, invalid JSON, partial updates.
   - Plan API tests assert personalization and template copy payloads under LLM success/failure.

2. **Manual sanity checks**
   - Launch Canvas Chat, submit a prompt for explorer vs. team persona, confirm copy adjusts.
   - Temporarily unset `OPENAI_API_KEY` to exercise fallback flow and ensure warnings surface.
   - Inspect dev console for `Canvas:TemplateFill` debug messages when testing new templates.

3. **Eval logging**
   - JSONL files in `eval/logs` capture raw LLM responses, validated templates, and hash telemetry.
   - Use `bun run push:evals:dry` before pushing to Airtable.

---
## 6. Telemetry & Safety

- **Telemetry queue** (`src/lib/telemetry/events.ts`) batches UX events; template fill telemetry is recorded via plan API logging.
- **Fallback reasons** distinguish between personalization guardrails (`insufficient_confidence`, `conflict_governance_vs_fast`, etc.) and template validation issues (`invalid_template_json`, `required_slot_missing`).
- **Logging** retains hashed slot values, preserving ability to audit without storing raw copy.
- **UI feedback** warns when defaults were used due to slot validation failures.

---
## 7. Roadmap

- Adaptive tone classifier (beyond keyword heuristics).
- Incremental template re-render pipeline (per-slot retries instead of whole template).
- Telemetry dashboard summarising validation issue rates.
- Experiment harness to compare template copy variants against baseline CTR.

---
## 8. Troubleshooting

| Symptom | Likely Cause | Fix |
|---------|--------------|-----|
| `Template fill failed – falling back to defaults` in logs | LLM returned invalid JSON or network error | Check raw response in logs; pipeline auto-falls back. |
| UI shows “personalization fallback triggered” despite LLM call | Aggregate signal confidence < 0.5 or conflict heuristics fired | Review `personalization.fallback.reasons` in devtools. |
| Template copy unchanged after rerun | Request marked `partial` and all required slots already filled | Clear `existingValues` for slots you want regenerated. |
| Jest warns about active timers | Ensure mocks for `retryWithExponentialBackoff` resolve async operations (see template-fill tests). |

---
## 9. Contributing

1. Fork or branch from `master`.
2. Add/adjust fixtures when changing personalization heuristics.
3. Update template snapshots and catalog docs when adding new slots.
4. Run lint, typecheck, and Jest before pushing (`bun run lint && bun run typecheck && bunx jest`).
5. Provide a short rationale in PRs (scenario, signal tweaks, validation impacts).

Feedback and feature ideas are welcome—open a GitHub issue or drop a note in the #canvas-personalization channel.
