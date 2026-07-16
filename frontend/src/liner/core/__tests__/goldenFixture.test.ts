import { describe, expect, it } from "vitest";
import { readFileSync } from "fs";
import { join } from "path";
import { buildIntermediateResult } from "../pipeline/pipeline";
import type { BuildIntermediateInput } from "../pipeline/pipeline";

const FIXTURE_DIR = join(import.meta.dirname, "../../../../../examples/liner");
const FIXED_COMPUTED_AT = "2026-01-01T00:00:00.000Z";
const NUMERIC_TOLERANCE = 1e-6;

function loadFixture(name: string): Record<string, unknown> {
  const raw = readFileSync(join(FIXTURE_DIR, name), "utf-8");
  return JSON.parse(raw);
}

function buildFromFixture(name: string) {
  const domain = loadFixture(name);
  const input: BuildIntermediateInput = {
    alignment: domain.alignment as BuildIntermediateInput["alignment"],
    stationDefinition: domain.stationDefinition as BuildIntermediateInput["stationDefinition"],
    offsets: domain.offsets as number[],
    z: domain.z as number,
    verticalAlignment: domain.verticalAlignment as BuildIntermediateInput["verticalAlignment"],
    computedAt: FIXED_COMPUTED_AT,
  };
  return buildIntermediateResult(input);
}

function dropUndefinedObjectProperties(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map((item) => dropUndefinedObjectProperties(item));
  }

  if (value !== null && typeof value === "object") {
    const canonical: Record<string, unknown> = {};
    for (const [key, child] of Object.entries(value)) {
      if (child !== undefined) {
        canonical[key] = dropUndefinedObjectProperties(child);
      }
    }
    return canonical;
  }

  return value;
}

function expectCloseToExpected(actual: unknown, expected: unknown, path = "$"): void {
  if (typeof expected === "number") {
    expect(typeof actual, `${path} should be a number`).toBe("number");
    expect(actual as number, path).toBeCloseTo(expected, Math.ceil(-Math.log10(NUMERIC_TOLERANCE)));
    return;
  }

  if (Array.isArray(expected)) {
    expect(Array.isArray(actual), `${path} should be an array`).toBe(true);
    expect(actual as unknown[], `${path} length`).toHaveLength(expected.length);
    expected.forEach((expectedItem, index) => {
      expectCloseToExpected((actual as unknown[])[index], expectedItem, `${path}[${index}]`);
    });
    return;
  }

  if (expected !== null && typeof expected === "object") {
    expect(actual !== null && typeof actual === "object" && !Array.isArray(actual), `${path} should be an object`).toBe(
      true,
    );
    const actualObject = actual as Record<string, unknown>;
    const expectedObject = expected as Record<string, unknown>;
    expect(Object.keys(actualObject).sort(), `${path} keys`).toEqual(Object.keys(expectedObject).sort());
    for (const key of Object.keys(expectedObject)) {
      expectCloseToExpected(actualObject[key], expectedObject[key], `${path}.${key}`);
    }
    return;
  }

  expect(actual, path).toEqual(expected);
}

function expectGoldenFixture(caseId: string) {
  const actual = dropUndefinedObjectProperties(buildFromFixture(`${caseId}-domain.json`));
  const expected = dropUndefinedObjectProperties(loadFixture(`${caseId}-intermediate.expected.json`));
  expectCloseToExpected(actual, expected);
}

describe("golden fixture regression tests", () => {
  const cases = [
    ["gc-01", "straight segment"],
    ["gc-02", "circular arc"],
    ["gc-03", "line-arc compound"],
    ["gc-04", "station equation"],
    ["gc-05", "vertical parabolic curve"],
    ["gc-06", "3x3 grid on straight alignment"],
    ["gc-07", "45-degree offset"],
  ] as const;

  it.each(cases)("%s: %s matches committed canonical intermediate", (caseId) => {
    expectGoldenFixture(caseId);
  });
});
