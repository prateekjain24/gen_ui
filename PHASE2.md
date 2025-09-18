# Phase 2 – AI Proof of Concept

## Purpose
Demonstrate an adaptive onboarding flow powered by OpenAI while keeping the scope intentionally light. Phase 2 is complete when a reviewer can flip between the rules engine and the LLM, see meaningful field adjustments, and deploy the POC to Railway.

---
## Completed Work
1. **P2-001 · OpenAI SDK integration** – AI SDK 5 client, retries, error mapping, usage tracking.
2. **P2-002 · `propose_next_step` schema** – Strict JSON schema + tests.
3. **P2-003 · Form orchestrator prompt** – Persona rules, constraints, behavioral guidance.
4. **P2-004 · Context builder** – Session serialization, recent events, engagement score.
5. **P2-005/006 · Decision post-processing** – Response validation and context-aware field enhancer.
6. **P2-007 · Behavior analysis** – Hesitation detection, correction loops, abandonment risk, time-on-step metrics.

---
## Remaining POC Tickets
| ID | Title | Goal | Acceptance Criteria |
|----|-------|------|---------------------|
| **P2-POC-01** | Decision toggle & fallback UX | Wire the rules+LLM switch with graceful failure states. | - Config flag to enable/disable LLM per session<br>- `generatePlanWithLLM` errors surface a fallback plan + toast<br>- Decision source logged (`rules`, `llm`, `fallback`). |
| **P2-POC-02** | Eval logging stub | Persist each LLM decision for later labeling. | - JSON Lines written per decision (context + output)<br>- CLI script pushes rows to Airtable (no UI work yet)<br>- Docs in `Eval.md` updated with run instructions. |
| **P2-POC-03** | Railway deployment checklist | Ship the app on Railway with bun runtime. | - Build/start commands set (`bun run build`, `bun run start`)<br>- Env vars (`OPENAI_*`, `NEXT_PUBLIC_API_URL`) documented<br>- Health check & smoke test notes recorded. |

> Optional polish (only if time permits): add a minimal Usage card in the dev debug panel showing behavior signals from P2-007.

- ✅ **P2-POC-01** – Toggle available in the debug panel, API respects strategy, rules fallback surfaced when LLM unavailable.
- ⏳ **P2-POC-02** – Pending.
- ⏳ **P2-POC-03** – Pending.

---
## Deferred / Backlog (Post-POC)
- **LLM cascade orchestration & A/B testing** (old P2-008/009).
- **Telemetry dashboards & analytics pipeline** (old P2-010–012).
- **Realtime analytics, metrics dashboard, performance hardening** (old P2-013+).
- **Security, load testing, production playbooks** (old P2-014 onwards).

These can be broken out later if the POC proves value.

---
## Definition of Done
- LLM decisions can be toggled on/off and recover gracefully.
- Eval logs capture every AI decision for future labeling.
- Railway deployment instructions verified by a teammate.

Delivering the three remaining tickets is enough to demo the end-to-end flow and gather feedback before investing in the heavier backlog items.
