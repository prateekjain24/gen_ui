import { validateTemplateSlots } from "@/lib/canvas/template-validator";
import { TEMPLATE_CATALOG } from "@/lib/canvas/templates";

describe("template validator", () => {
  it("returns sanitized values for valid input", () => {
    const template = TEMPLATE_CATALOG.step_title;
    const result = validateTemplateSlots(template.id, {
      title: "Team workspace essentials",
    });

    expect(result.isValid).toBe(true);
    expect(result.issues).toHaveLength(0);
    expect(result.sanitizedValues.title).toBe("Team workspace essentials");
  });

  it("falls back when required slot missing", () => {
    const template = TEMPLATE_CATALOG.helper_text;
    const result = validateTemplateSlots(template.id, {});

    expect(result.isValid).toBe(false);
    expect(result.fallbackApplied).toBe(true);
    expect(result.issues[0]).toMatchObject({
      slotId: "body",
      severity: "error",
    });
    expect(result.sanitizedValues.body).toBe(template.slots[0].fallback);
  });

  it("rejects content exceeding max length", () => {
    const template = TEMPLATE_CATALOG.badge_caption;
    const longCaption = "a".repeat(template.slots[0].maxLength + 5);
    const result = validateTemplateSlots(template.id, { caption: longCaption });

    expect(result.isValid).toBe(false);
    expect(result.issues[0].reason).toContain("exceeds_max_length");
    expect(result.sanitizedValues.caption).toBe(template.slots[0].fallback);
  });

  it("flags tone violations for compliance slots", () => {
    const template = TEMPLATE_CATALOG.callout_info;
    const result = validateTemplateSlots(template.id, {
      heading: "All good",
      body: "This is super chill and fun!",
    }, {
      toneOverrides: { body: "compliance" },
    });

    expect(result.isValid).toBe(false);
    expect(result.issues.some(issue => issue.slotId === "body")).toBe(true);
    expect(result.sanitizedValues.body).toBe(template.slots[1].fallback);
  });

  it("allows partial validation when requested", () => {
    const template = TEMPLATE_CATALOG.callout_info;
    const result = validateTemplateSlots(template.id, { body: "We'll review controls" }, { allowPartial: true });

    expect(result.isValid).toBe(true);
    expect(result.sanitizedValues.body).toBe("We'll review controls");
    expect(result.fallbackApplied).toBe(true);
  });
});
