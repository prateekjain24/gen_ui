import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";

import type { CanvasRecipeId } from "@/lib/canvas/recipes";
import { scoreRecipeKnobs, type RecipePersonalizationResult } from "@/lib/personalization/scoring";
import type { PromptSignals } from "@/lib/prompt-intel/types";

interface PersonalizationFixture {
  id: string;
  recipeId: CanvasRecipeId;
  signals: PromptSignals;
}

const FIXTURES_DIR = path.join(__dirname, "..", "__fixtures__");

const loadFixtures = (): PersonalizationFixture[] => {
  const entries = readdirSync(FIXTURES_DIR).filter(filename => filename.endsWith(".json"));
  return entries
    .map(filename => {
      const filePath = path.join(FIXTURES_DIR, filename);
      const raw = readFileSync(filePath, "utf8");
      const parsed = JSON.parse(raw) as PersonalizationFixture;
      return parsed;
    })
    .sort((a, b) => a.id.localeCompare(b.id));
};

const fixtures = loadFixtures();

describe("personalization fixtures", () => {
  it("loads all expected fixtures", () => {
    expect(fixtures.length).toBeGreaterThanOrEqual(4);
  });

  it.each(fixtures.map(fixture => [fixture.id, fixture]))(
    "matches snapshot for %s",
    (_fixtureId, fixture) => {
      const result: RecipePersonalizationResult = scoreRecipeKnobs(fixture.recipeId, fixture.signals);
      expect(result).toMatchSnapshot(fixture.id);
    }
  );
});
