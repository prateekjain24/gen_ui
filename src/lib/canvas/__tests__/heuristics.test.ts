import { classifyByHeuristics, extractKeywords } from "../heuristics";

describe("classifyByHeuristics", () => {
  it("classifies team keywords and numbers as R2", () => {
    const result = classifyByHeuristics("Need workspace for 10 engineers with Slack");

    expect(result.recipeId).toBe("R2");
    expect(result.persona).toBe("team");
    expect(result.intentTags).toEqual(["integrations", "invites"]);
    expect(result.confidence).toBe(0.8);
    expect(result.reasoning.length).toBeLessThanOrEqual(120);
  });

  it("classifies governance keywords as R4", () => {
    const result = classifyByHeuristics("Secure approvals and audit logs for our workspace");

    expect(result.recipeId).toBe("R4");
    expect(result.persona).toBe("power");
    expect(result.intentTags).toEqual(["governance"]);
    expect(result.confidence).toBe(0.8);
    expect(result.reasoning).toContain("audit");
  });

  it("classifies client signals as R3", () => {
    const result = classifyByHeuristics("Client onboarding workspace for agency stakeholders");

    expect(result.recipeId).toBe("R3");
    expect(result.persona).toBe("team");
    expect(result.intentTags).toEqual(["client"]);
    expect(result.confidence).toBe(0.8);
  });

  it("falls back to explorer when no signals found", () => {
    const result = classifyByHeuristics("Just exploring what this canvas chat can do");

    expect(result.recipeId).toBe("R1");
    expect(result.persona).toBe("explorer");
    expect(result.intentTags).toEqual(["solo"]);
    expect(result.confidence).toBe(0.5);
    expect(result.reasoning).toBe("Defaulted to explorer path");
  });
});

describe("extractKeywords", () => {
  it("returns unique lowercase tokens", () => {
    expect(extractKeywords("Team team! Let's GO")).toEqual(["team", "let", "s", "go"]);
  });

  it("handles empty input", () => {
    expect(extractKeywords("")).toEqual([]);
  });
});
