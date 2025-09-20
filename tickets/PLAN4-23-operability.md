# Ticket PLAN4-23 — Operability & red-team documentation

- **Story Points:** 1
- **Depends on:** PLAN4-21, PLAN4-22

## Goal
Produce a concise Railway-first runbook so anyone can deploy, monitor, and pause Phase 4 personalization without extra tooling.

## Context
We do not have dedicated SRE coverage for MVP. Documentation must lean on built-in Railway logs, the new toggles, and the JSONL telemetry file—leaving anything heavier to a future phase.

## Requirements
1. Create `docs/operability/railway-phase4.md` covering: required env vars, deploy command (`railway up`), how to check container health, and how to disable personalization via env variables.
2. Include a “Quick Triage” checklist using the runtime policies from PLAN4-22 (what to do when rate limits hit or the soft-disable triggers).
3. Capture three red-team prompts relevant to MVP (regulated finance request, conflicting persona signals, malicious jab) and outline how to respond using existing toggles/logs.
4. Add a short section on exporting the JSONL log (download via Railway or `railway run cat data/plan-edits.jsonl`) for audit.
5. End with escalation guidance: who to ping, expected response window during MVP (e.g. “within next business day”), and how to roll back to Phase 3 behavior.

## Implementation Steps
1. Draft the markdown with headings: Deployment, Monitoring, Incident Response, Red-Team Notes, Escalation.
2. Pull in details from PLAN4-18 to PLAN4-22 so instructions reference real filenames and toggles.
3. Share the doc with the product lead for a quick acknowledgment and record the date in a “Reviewed by” footer.

## Definition of Done
- The Railway runbook exists and links directly to toggles, telemetry, and queue scripts.
- Red-team scenarios reference actual MVP safeguards (no hypothetical tooling).
- Escalation notes set expectations for MVP support.
- Future engineers can follow the doc to deploy or pause personalization without guessing.
