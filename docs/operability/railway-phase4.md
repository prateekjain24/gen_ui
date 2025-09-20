# Phase 4 Railway Runbook

_Last reviewed: 2024-10-01 by Product Lead_

## Deployment
- **Env vars:** set `OPENAI_API_KEY`, `ENABLE_PROMPT_INTEL`, `ENABLE_PERSONALIZATION`, `ENABLE_LABELING_REVIEW`, `PERSONALIZATION_TIMEOUT_MS` (default 15000), and `EVAL_LOG_DIR`. Railway dashboard should mirror `.env.example` defaults.
- **Build & ship:** `railway up --service web`. The container boots with Bun and Next.js (Node runtime).
- **Health check:** `railway status` confirms the web service is running. Logs stream via `railway logs --service web`.
- **Toggles on demand:** flip any `ENABLE_*` variable in Railway; restart the service (`railway redeploy`) to apply. Setting `ENABLE_PERSONALIZATION=false` reverts to Phase 3 heuristics.

## Monitoring & Runtime Guardrails
- **Timeouts:** all OpenAI/personalization calls route through `withTimeout` (default `PERSONALIZATION_TIMEOUT_MS=15000`). Increase/decrease via env or set to `0` to disable the timer.
- **Soft disable:** three personalization failures within two minutes trigger an automatic `ENABLE_PERSONALIZATION=false` flip. Watch for a single `console.warn` line tagged `personalization-soft-disabled` in Railway logs.
- **Per-session rate limit:** each `sessionId` may request personalization five times per minute. Exceeding the limit returns HTTP 429 with `Retry-After` seconds.
- **Telemetry:** post-plan edits land in `data/plan-edits.jsonl` plus console. Tail locally with `bun scripts/tail-plan-edits.ts` or remotely via `railway run cat data/plan-edits.jsonl`.

## Incident Response Checklist
1. **Identify:** inspect `railway logs` for `personalization-soft-disabled`, repeated 429s, or LLM timeouts.
2. **Stabilise:** toggle `ENABLE_PERSONALIZATION=false` (if not already) and redeploy. This forces heuristics-only responses.
3. **Collect:** download `data/plan-edits.jsonl` and note labeling queue state (`bun scripts/labeling/print-current.ts --endpoint=<deployment-url>`).
4. **Recover:** once stable, re-enable personalization and redeploy. Consider increasing `PERSONALIZATION_TIMEOUT_MS` or lowering traffic.

## Red-Team Notes
- **Regulated finance prompt:** if the brief references SOX/SOC2 + investor data, confirm compliance tags in the log and ensure defaults remain. If signal confidence <0.5, fallback kicks in automatically—document the session and escalate before re-enabling.
- **Conflicting persona signals:** prompts mixing “solo founder” + “enterprise controls” should trigger fallback. Verify the `personalization.fallback.reasons` array and capture plan edits via the queue.
- **Malicious jab (prompt tries to break JSON):** look for parse failures in logs (`Template fill failed`). The timeout and fallback guardrails should preserve defaults. If repeated, temporarily disable personalization and file an issue with the prompt payload.

## Escalation
- **Primary contact:** Product Lead (Slack `#canvas-phase4`) within next business day.
- **Secondary:** Phase 4 engineer on-call (tag in same channel).
- **Rollback:** set `ENABLE_PROMPT_INTEL=false` and `ENABLE_PERSONALIZATION=false`, redeploy, and optionally revert to `master` tag prior to Phase 4 features.
- **Audit export:** attach the accepted labels file `config/labeling/accepted.json` and the JSONL log to the escalation ticket.

---

Reviewed by: Product Lead — 2024-10-01
