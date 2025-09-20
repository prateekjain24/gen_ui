# PropertyGuru Seeker Onboarding – Minimal Canvas Flip

## Product framing
**Audience:** Home seekers arriving at PropertyGuru (web) who want help narrowing down listings quickly.
**Problem:** Today seekers face an overwhelming catalog; filters help, but they don’t feel guided. We want a lightweight conversational onboarding that captures intent in <2 minutes, then pre-fills PropertyGuru search/workspace states.
**Approach:** Reuse Canvas’ prompt-to-plan engine, but retune signals + output to drive PropertyGuru’s listing discovery instead of B2B workspace setup.

## What changes vs. Canvas MVP
| Canvas Today | PropertyGuru Flip |
| --- | --- |
| Prompt describes workspace needs | Prompt captures housing intent (“Need 2BR condo near MRT under SGD 1.2M”) |
| Signals: team size, tools, approvals | Signals: location, budget, property type, move-in timeline, financing readiness |
| Output: onboarding flow components | Output: seeker journey steps (saved search, mortgage precheck, neighborhood brief) + CTA into listings |
| Customize drawer toggles knobs | Drawer adjusts housing preferences (commute priority slider, renovation tolerance, layout needs) |

Minimal code changes: swap signal extractors, copy schema, and recipe fields; keep LLM scaffolding + telemetry as-is.

## Signal & knob mapping
- **Location focus** (primary city / neighborhood) → pre-fill map view.
- **Budget band** → sets price filters, triggers mortgage wizard if high.
- **Property type & bedrooms** → listing filters + saved search config.
- **Move-in horizon** (urgent / flexible) → suggestions (ready-to-move vs. new launches).
- **Lifestyle cues** (schools, MRT, pet-friendly) → highlight relevant PropertyGuru content sections.
- **Finance preparedness** (loan pre-approved?) → push to PropertyGuru Finance.

## Flow (LLM-generated)
1. **Intent summary** – “Let’s find a 2-bedroom condo near Tampines MRT within SGD 1.2M.”
2. **Step 1: Tune essentials** – UI fields for area radius, price band, property type.
3. **Step 2: Lifestyle filters** – toggles for schools, amenities, commute time.
4. **Step 3: Plan actions** – CTA to view matches + optional mortgage check.
5. **Micro-copy** – reassure on listing freshness, send weekly summaries.

## Customize drawer (manual override)
- **Location radius slider** (1km ↔ 10km).
- **Budget stretch toggle** (allow >10% buffer?).
- **Move-in urgency slider** (0 = browsing, 5 = ready to transact).
- **Copy tone** (reassuring, data-driven, concierge).

## Output & integration
- Generated plan hands PropertyGuru’s search page a JSON payload:
  ```json
  {
    "filters": { "district": [18], "maxPrice": 1200000, "propertyType": "condo", "bedrooms": 2 },
    "highlights": ["near MRT", "family-friendly"],
    "nextSteps": ["savedSearch", "mortgagePreCheck"],
    "copy": { "hero": "Curated condos near Tampines MRT within reach." }
  }
  ```
- Optionally surface a “Preview listings” component using PropertyGuru APIs.

## Why it matters
- Replaces a static filter sidebar with a guided conversation → higher first-session engagement.
- Gives marketing & CX a storytelling canvas (literally) for campaigns (“Relocation planner”, “First-time buyer guide”).
- Keeps engineering lift low: reuse Canvas’ LLM orchestration; main work is mapping new signals to PropertyGuru filters + copy.

## Next steps
1. Swap prompt instructions + signal extractors to PropertyGuru taxonomy.
2. Prototype the output schema → connect to PropertyGuru search URL builder.
3. User test with 5 seekers; measure “saved search created” & “listings viewed” vs. control.

Quick experiment, but promising path from messy browsing to confident discovery.
