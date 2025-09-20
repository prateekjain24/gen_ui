# PropertyGuru flow playbook QA checklist

Use this walk-through when sanity checking the preset locally (run with `CANVAS_PRESET=property_guru`).

1. Launch the Canvas UI and load the `Canvas Chat` page. Enter each prompt from `pg.md` (twins, split-city worker, investor, multi-gen, first-time buyer) and confirm the rendered plan matches the expectations below.
2. Verify extracted signals via the debug panel (enable `ENV.isDebug=true`):
   - Twins: Tampines focus, 3BR condo, childcare + MRT cues.
   - Split-city worker: TEL anchor, serviced apartment, co-working & concierge cues.
   - Investor: Queenstown, 2BR condo, rental hotspot + reno friendly.
   - Multi-gen: Bishan, 4BR, accessibility + hospital proximity.
   - First-time buyer: Punggol EC, grants guidance, school filters.
3. Open the Customize drawer after each plan and confirm the PropertyGuru knobs (radius, budget stretch, urgency, tone) reflect the scenario defaults and regenerate copy when tweaked.
4. Click the primary CTA to ensure telemetry emits (monitor `/api/events` in the network panel; you should see `property_guru_flow_event` for CTA clicks and saved-search actions when relevant).
5. Re-run with different tone or urgency settings to confirm undo/reset continues to behave.

Document any deviations directly inside the ticket before handoff.
