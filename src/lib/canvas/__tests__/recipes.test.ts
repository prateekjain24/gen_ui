import { RECIPES, defaultRecipeId } from "../recipes";

import { FIELD_ID_SET, type FieldId } from "@/lib/constants/fields";

describe("canvas recipes", () => {
  it("registers four recipes", () => {
    expect(Object.keys(RECIPES)).toHaveLength(4);
  });

  it("uses whitelisted field ids", () => {
    Object.values(RECIPES).forEach(recipe => {
      recipe.fields.forEach(field => {
        expect(FIELD_ID_SET.has(field.id as FieldId)).toBe(true);

        if (field.kind === "ai_hint" && field.targetFieldId) {
          expect(FIELD_ID_SET.has(field.targetFieldId as FieldId)).toBe(true);
        }
      });
    });
  });

  it("exposes R1 as the default recipe", () => {
    expect(defaultRecipeId).toBe("R1");
  });
});
