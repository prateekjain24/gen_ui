import { TEMPLATE_CATALOG, TEMPLATE_IDS, getTemplate, listTemplates } from "../templates";

describe("template catalog", () => {
  it("exposes the expected template ids", () => {
    expect(TEMPLATE_IDS).toEqual([
      "step_title",
      "cta_primary",
      "helper_text",
      "callout_info",
      "badge_caption",
    ]);
  });

  it("provides complete slot metadata with fallbacks", () => {
    listTemplates().forEach(template => {
      expect(template.slots.length).toBeGreaterThan(0);
      template.slots.forEach(slot => {
        expect(slot.fallback).toBeTruthy();
        expect(slot.maxLength).toBeGreaterThan(0);
      });
    });
  });

  it("returns catalog entries via getTemplate", () => {
    TEMPLATE_IDS.forEach(id => {
      expect(getTemplate(id)).toBe(TEMPLATE_CATALOG[id]);
    });
  });
});
