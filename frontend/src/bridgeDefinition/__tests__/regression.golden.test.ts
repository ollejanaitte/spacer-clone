import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { bridgeRegressionFixtures } from "../__fixtures__/bridgeRegressionFixtures";
import { generateStructuralModel } from "../generator/facade";
import { compareStructuralModels, generateLegacyStructuralModel } from "./regressionHelpers";

const TEST_DIR = dirname(fileURLToPath(import.meta.url));
const GOLDEN_DIR = resolve(TEST_DIR, "../__golden__");

describe("BridgeDefinition pipeline regression", () => {
  for (const fixture of bridgeRegressionFixtures) {
    it(`matches legacy output for ${fixture.name}`, () => {
      const legacy = generateLegacyStructuralModel(fixture.project);
      const bridgeDefinition = generateStructuralModel(fixture.project, { legacyResult: legacy });
      const diff = compareStructuralModels(legacy, bridgeDefinition);
      const goldenPath = resolve(GOLDEN_DIR, `${fixture.name}.json`);
      const actual = normalizePayload({
        name: fixture.name,
        legacy: legacy.summary,
        bridgeDefinition: bridgeDefinition.summary,
        diff,
      });
      const golden = normalizePayload(JSON.parse(readFileSync(goldenPath, "utf8")));

      expect(actual).toEqual(golden);
    });
  }
});

function normalizePayload<T>(value: T): T {
  return JSON.parse(
    JSON.stringify(value, (key, item) => {
      if (key === "generatedAt") return "<generated>";
      if (typeof item === "number" && Object.is(item, -0)) return 0;
      return item;
    }),
  ) as T;
}
