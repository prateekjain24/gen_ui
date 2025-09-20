# PropertyGuru Seeker Onboarding – Intelligence Requirements

## Product framing
**Audience:** Home seekers arriving at PropertyGuru web who need fast, confident guidance toward relevant listings.
**Problem:** Filter-driven discovery forces users to translate fuzzy life moments (“twins on the way, want parents nearby”) into rigid forms, causing drop-off.
**Approach:** Reuse Canvas’ conversation-to-plan engine, retune it with PropertyGuru signals and response formats, and let an LLM act as the orchestrator that understands nuance, narrates trade-offs, and drives the right CTAs.

## Why LLM-first, not rules
- Rule systems can detect obvious entities (price, bedrooms) but collapse when signals conflict, evolve mid-session, or require empathetic copy.
- We need one brain that interprets the entire story, chooses which trade-offs to surface, and keeps plan + copy in sync each regeneration.
- LLM output plus telemetry lets us learn what resonates and iterate by adjusting prompts/examples—no brittle decision trees to babysit.

## Experience pillars (must-haves)
- **Context capture:** Gather location, price, property type, bedrooms, move-in horizon, lifestyle cues, financing readiness within two turns.
- **Narrative plan:** Summarize intent, present 2–3 guided steps, and embed relevant actions (saved search, mortgage, neighborhood brief) with PropertyGuru voice options (reassuring, data-driven, concierge).
- **Adaptive controls:** Customize drawer exposes location radius, budget stretch, move-in urgency, tone presets; Undo/Reset keep experimentation safe.
- **Structured output:** Every plan produces a JSON payload with filters, highlights, next steps, and copy for downstream search + marketing surfaces.
- **Observable intelligence:** Log extracted signals, confidence, applied defaults, and manual overrides so ops can tune prompts and guardrails quickly.

## LLM responsibilities
- Parse messy seeker briefs into the `PropertyGuruSignals` schema and call out ambiguities for follow-up.
- Generate empathetic micro-copy that explains why certain listings or actions are suggested.
- Reconcile conflicting cues (e.g., urgent move-in but desire for new launches) by proposing trade-offs instead of returning empty results.
- Adapt the plan live when drawer knobs or new user turns arrive, keeping steps coherent and copy consistent.

## Engineering anchors
- Typed signal schema + constants shared in `src/lib` so extractors, UI, and telemetry stay aligned.
- Prompt + response templates toggled by feature flag to keep Canvas MVP stable while the PropertyGuru preset evolves.
- Mapper utility converts planner output to PropertyGuru search payloads (district codes, highlights, next steps) with graceful fallbacks and logging.
- Jest fixtures cover representative seeker briefs to freeze expected plan shapes and payloads.

## Flow playbooks to design against
1. **Urgent twins near Tampines MRT**
   - Prompt: “Expecting twins in 4 months, want a 3BR condo near Tampines MRT, budget around 1.4M but I’ll stretch for turnkey. Need good preschool options and low-renovation.”
   - Plan: Intent summary, essentials with tight radius + price stretch, lifestyle filters for childcare and move-in ready, actions highlighting MRT shortlist and preschool briefing, micro-copy reassuring caregivers.
   - Drawer moment: Move-in urgency maxed, budget stretch on → regenerated plan prioritizes ready-stock listings and nudges mortgage pre-check.
2. **Split-city remote worker**
   - Prompt: “Splitting time between Singapore and KL, need a 1BR serviced apartment near TEL, want co-working nearby and flexible lease; budget SGD 3.2K monthly.”
   - Plan: Essentials anchor TEL stations and rent cap, lifestyle filters surface co-working and serviced amenities, actions include dual-city shortlist + remote tour scheduling, copy shifts to concierge tone.
3. **Investor chasing rental yield**
   - Prompt: “Looking for a 2BR resale condo in Queenstown under 1.3M, strong rental demand, okay with minor reno, want data on yield and past transactions.”
   - Plan: Data-forward intent summary, essentials fix District 3 and bedrooms, lifestyle filters highlight rental hotspots and reno potential, actions point to yield reports + transactions export, copy leans analytical.
4. **Multi-generational accessibility**
   - Prompt: “Retiring parents moving in, need 4BR near Bishan, lift access, wheelchair friendly, near hospitals and parks; budget 2.3M; we can wait 6–9 months.”
   - Plan: Essentials capture flexible timeline, lifestyle filters emphasize accessibility, hospital proximity, nature, actions promote accessibility shortlist + renovation partner, copy reassures on long-term comfort.
5. **First-time buyer discovery**
   - Prompt: “First time buying, looking at ECs in Punggol around 1M, not pre-approved, two kids in primary school, want grants guidance and weekly listing digests.”
   - Plan: Intent summary educates on EC eligibility, essentials set EC filters + price with grants, lifestyle filters tick schools and community amenities, actions include HDB grant checklist + weekly digest enrollment, copy encourages coaching tone.

## Success metrics
- ≥60% of seekers complete the guided flow within two minutes.
- Saved-search creation rate lifts vs. control by 15% for experiment cohorts.
- Ops dashboard shows <10% manual overrides on generated copy after week one (evidence prompts are solid).

## Next steps
1. Implement the PropertyGuru signal schema + constants (Ticket 1_PG).
2. Build the prompt-aligned extractor and test suite (Ticket 2_PG).
3. Swap prompt/template assets and add golden fixtures (Ticket 3_PG).
4. Ship payload mapper + drawer knobs (Tickets 4_PG, 5_PG).
5. Instrument telemetry dashboards to monitor signal accuracy and plan adoption.

Canvas for seekers stays scrappy, but pairing rule-based guardrails with LLM intelligence is how we deliver “guided discovery” instead of another filter wizard.
