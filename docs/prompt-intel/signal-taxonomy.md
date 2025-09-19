# Prompt Signal Taxonomy

This taxonomy enumerates the prompt-derived signals required for Phase 4 personalization. Each signal is defined with canonical naming, allowed values, and sourcing expectations so downstream systems (extractors, scoring, telemetry, and UX) can stay aligned.

## Summary Table
| Signal | Canonical Key | Type | Value Domain | Primary Source | Compliance Notes |
| --- | --- | --- | --- | --- | --- |
| Team Size | `teamSizeBracket` | enum | `solo`, `1-9`, `10-24`, `25+`, `unknown` | Deterministic (keyword) with LLM confirmation | None |
| Decision Makers | `decisionMakers` | array<DecisionMaker> | 0-5 entries, each with `role`, `seniority`, `isPrimary` | Hybrid (deterministic detection + LLM detail fill) | Contains personal role titles; avoid storing names |
| Approval Chain Depth | `approvalChainDepth` | enum | `single`, `dual`, `multi`, `unknown` | Hybrid (derived from decision makers & phrases) | Impacts compliance workflows; log provenance |
| Primary Tools | `tools` | array<enum> | Known SaaS slugs (Slack, Jira, Notion, Salesforce, Asana, ServiceNow, Zendesk, Other) | Deterministic keyword | None |
| Integration Criticality | `integrationCriticality` | enum | `must-have`, `nice-to-have`, `unspecified` | LLM (phrasing-driven) with deterministic overrides | None |
| Compliance Constraints | `complianceTags` | array<enum> | `SOC2`, `HIPAA`, `ISO27001`, `GDPR`, `SOX`, `audit`, `regulated-industry`, `other` | Deterministic keyword preferred; LLM fills synonyms | Compliance-sensitive; persist provenance + reason |
| Tone | `copyTone` | enum | `fast-paced`, `meticulous`, `trusted-advisor`, `onboarding`, `migration`, `neutral` | Deterministic keyword with LLM fallback | None |
| Industry | `industry` | enum | `saas`, `fintech`, `healthcare`, `education`, `manufacturing`, `public-sector`, `other` | LLM primary with deterministic overrides | Compliance review when `healthcare`/`public-sector` |
| Primary Objective | `primaryObjective` | enum | `launch`, `scale`, `migrate`, `optimize`, `compliance`, `other` | LLM | Guides personalization knobs; no special handling |
| Constraints Summary | `constraints` | object | `{ timeline?: 'rush' | 'standard' | 'flexible'; budget?: 'tight' | 'standard' | 'premium'; notes?: string }` | LLM with deterministic keyword anchors (`ASAP`, `budget`, etc.) | Freeform `notes` scrubbed for PII |
| Region | `operatingRegion` | enum | `na`, `emea`, `latam`, `apac`, `global`, `unspecified` | LLM | Flag `emea`/`apac` for localization review |
| Confidence Metadata | `metadata` | object | Per-signal `{ source: 'keyword' | 'llm' | 'merge'; confidence: 0-1; notes?: string }` | System generated | Ensure logs omit prompt raw text |

## Field Definitions
- `teamSizeBracket`: Canonical headcount bucket driving recipe defaults; `unknown` when neither extractor finds a signal.
- `decisionMakers`: Array of objects: `{ role: string; seniority: 'ic' | 'manager' | 'director+'; isPrimary: boolean }`. Keyword layer sets `role` for well-known titles (e.g., "VP", "Director"); LLM fills gaps.
- `approvalChainDepth`: Derived signal indicating required approvals. Default `unknown`; set to `multi` if prompt references "legal + finance" or similar.
- `tools`: Array of tool identifiers. Add `Other` when a tool is unrecognized but clearly named. Deduplicate and maintain input order.
- `integrationCriticality`: Promotes prompts that say "must integrate" vs. "nice to have"; falls back to `unspecified` when absent.
- `complianceTags`: Enumerated compliance or regulatory requirements. Store synonyms (e.g., "privacy law" → `GDPR`). Treat as compliance-sensitive; telemetry must capture `source` and `notes`.
- `copyTone`: Drives template tone constraints. Map keywords like "punchy" → `fast-paced`, "buttoned up" → `meticulous`.
- `industry`: High-level vertical classification. Prefer deterministic `Fintech`, `Healthcare`, etc.; allow LLM to infer when implicit (e.g., "credit underwriting workflow").
- `primaryObjective`: High-level intent controlling recipe emphasis (launch vs. optimize). Default `other` when absent.
- `constraints`: Aggregated constraints. `timeline` uses enumerated buckets, `budget` indicates sensitivity, `notes` captures short (<120 char) plain-text clarifications with PII scrubbed.
- `operatingRegion`: Region where plan must apply; default `unspecified`.
- `metadata`: Not a user-facing signal but mandatory wrapper for each signal. Store provenance and confidence for debug HUD and telemetry. `notes` should include conflict resolution explanations when applicable.

## Deterministic vs. LLM Expectations
- **Deterministic-first**: `teamSizeBracket`, `tools`, `complianceTags`, `copyTone` (keywords anchor canonical values).
- **Hybrid**: `decisionMakers`, `approvalChainDepth`, `integrationCriticality`, `industry`, `primaryObjective`, `constraints`, `operatingRegion` (LLM fills or clarifies after keyword pass but deterministic cues win on conflict unless LLM confidence > 0.75).
- **Metadata**: Always system generated post-merge.

## Example Prompts

**Prompt A**
```
We're a 12-person RevOps squad rolling out Salesforce workflows across EMEA. Legal and finance both have veto power, and audit-readiness is non-negotiable. Need meticulous onboarding copy that integrates with Slack alerts ASAP.
```
| Signal | Value | Source | Notes |
| --- | --- | --- | --- |
| `teamSizeBracket` | `10-24` | keyword | Number `12` matches range |
| `decisionMakers` | `[ { role: "Legal", seniority: "director+", isPrimary: true }, { role: "Finance", seniority: "director+", isPrimary: true } ]` | hybrid | LLM adds seniority based on roles |
| `approvalChainDepth` | `multi` | hybrid | Two veto groups implies multi |
| `tools` | `["Salesforce", "Slack"]` | keyword | |
| `integrationCriticality` | `must-have` | llm | Phrase "non-negotiable" |
| `complianceTags` | `["audit"]` | keyword | |
| `copyTone` | `meticulous` | keyword | |
| `industry` | `saas` | llm | "RevOps" implies SaaS |
| `primaryObjective` | `launch` | llm | Rolling out workflows |
| `constraints` | `{ timeline: 'rush', notes: 'ASAP' }` | hybrid | "ASAP" sets rush |
| `operatingRegion` | `emea` | llm | Explicit mention |

**Prompt B**
```
Need a punchy migration plan for our 40-person healthcare onboarding team. Must stay HIPAA compliant, integrate Zendesk, and keep budget tight while the VP of Operations signs off solo.
```
| Signal | Value | Source | Notes |
| --- | --- | --- | --- |
| `teamSizeBracket` | `25+` | keyword | Number `40` |
| `decisionMakers` | `[ { role: "VP of Operations", seniority: "director+", isPrimary: true } ]` | hybrid | Title extracted deterministically |
| `approvalChainDepth` | `single` | hybrid | Explicit "signs off solo" |
| `tools` | `["Zendesk"]` | keyword | |
| `integrationCriticality` | `must-have` | llm | "Must stay" phrasing |
| `complianceTags` | `["HIPAA", "regulated-industry"]` | keyword | Healthcare implies regulated |
| `copyTone` | `fast-paced` | keyword | "Punchy" maps to fast-paced |
| `industry` | `healthcare` | keyword | |
| `primaryObjective` | `migrate` | llm | "Migration plan" |
| `constraints` | `{ budget: 'tight' }` | llm | |
| `operatingRegion` | `unspecified` | system | Default when not present |

## Open Questions
- Do we need to capture secondary tools separately from integration-critical tools? *(Owner: Engineering — Priya K.)*
- Should `decisionMakers` include contact identifiers when the prompt names individuals? *(Owner: Legal/Compliance — A. Rivera)*
- How will we handle prompts that mix multiple industries (e.g., "fintech healthcare partnership")? *(Owner: Product — Jamie L.)*

## Stakeholder Sign-off
- Personalization Engineering (Priya K.)
- Telemetry (Morgan S.)
- Design/UX (Jamie L.)
- Compliance (A. Rivera)

Stakeholders should acknowledge in the project thread once they review; record approvals inline here.
