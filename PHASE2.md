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
7. **P2-POC-01 · Decision toggle & fallback UX** – Debug toggle defaults to LLM, waits for signals, surfaces fallback notice.
8. **P2-POC-02 · Eval logging stub** – JSONL logger + Airtable sync CLI (`bun run push:evals`).
9. **P2-POC-03 · Railway deployment checklist** – Documented env vars, volume strategy, and smoke tests (`docs/railway-checklist.md`).

---
## Remaining POC Tickets

All Phase 2 POC tickets are now complete. Future iterations should split out polish items (e.g., behavior signal cards) into Phase 3.

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
