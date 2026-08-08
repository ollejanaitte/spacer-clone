// Phase C1 (A-01) Adapter 契約 テスト
import { describe, it, expect } from "vitest";
import {
  ADAPTER_SCHEMA_VERSION,
  validateAdapterInput,
  validateAdapterResult,
  type CalculationAdapterInput,
  type CalculationAdapterResult,
} from "../design/calculationAdapter";

const INPUT: CalculationAdapterInput = {
  schemaVersion: ADAPTER_SCHEMA_VERSION,
  projectId: "p1",
  supportId: "P1",
  structureType: "pier",
  geometry: {
    pierFormType: "portal_frame",
    columns: [
      { width: 1.4, depth: 1.8, height: 8, transverseOffset: -3.5 },
      { width: 1.4, depth: 1.8, height: 8, transverseOffset: 3.5 },
    ],
    beam: { width: 1.6, depth: 9, height: 1.5 },
    footing: { length: 10, width: 7, thickness: 1.8 },
  },
  placement: { station: 30, offset: 0, skewDeg: 0, zOverride: null },
  modelRevision: "model-rev-001",
  units: { length: "m", force: "kN", angle: "deg" },
  bearingSeatCount: 2,
  reactionCaseKinds: ["permanent", "liveLoad"],
  source: "spacer-clone",
};

const RESULT: CalculationAdapterResult = {
  schemaVersion: ADAPTER_SCHEMA_VERSION,
  calculationId: "calc-001",
  supportId: "P1",
  engineType: "test-mock",
  engineVersion: "0.1.0",
  status: "TEST_PASS",
  checks: [],
  summary: { pass: 1, fail: 0, hold: 0, total: 1 },
  errors: [],
  warnings: [],
  trace: [],
  generatedAt: "2026-08-08T00:00:00.000Z",
  isFormalDesign: false,
  engineLabel: "TEST",
};

describe("validateAdapterInput", () => {
  it("passes a well-formed input", () => {
    expect(validateAdapterInput(INPUT)).toEqual([]);
  });

  it("rejects missing supportId", () => {
    expect(validateAdapterInput({ ...INPUT, supportId: "" }).join("")).toContain(
      "supportId は必須",
    );
  });

  it("rejects wrong schemaVersion", () => {
    expect(
      validateAdapterInput({ ...INPUT, schemaVersion: "9.9.9" }).join(""),
    ).toContain("schemaVersion");
  });

  it("rejects invalid geometry (zero footing)", () => {
    expect(
      validateAdapterInput({
        ...INPUT,
        geometry: { ...INPUT.geometry, footing: { length: 0, width: 7, thickness: 1.8 } },
      }),
    ).toContain("footing 寸法は全て 0 より大きい値が必要");
  });

  it("rejects missing modelRevision", () => {
    expect(validateAdapterInput({ ...INPUT, modelRevision: "" }).join("")).toContain(
      "modelRevision は必須",
    );
  });

  it("rejects non-object", () => {
    expect(validateAdapterInput(null)).toHaveLength(1);
  });
});

describe("validateAdapterResult", () => {
  it("passes a well-formed TEST result", () => {
    expect(validateAdapterResult(RESULT)).toEqual([]);
  });

  it("rejects missing calculationId", () => {
    expect(validateAdapterResult({ ...RESULT, calculationId: "" }).join("")).toContain(
      "calculationId は必須",
    );
  });

  it("rejects non-test engineType", () => {
    expect(
      validateAdapterResult({ ...RESULT, engineType: "formal" }).join(""),
    ).toContain("test-mock のみ対応");
  });

  it("rejects OK/NG-like status (must be TEST_*)", () => {
    expect(validateAdapterResult({ ...RESULT, status: "ok" }).join("")).toContain("status");
  });

  it("rejects isFormalDesign=true", () => {
    expect(
      validateAdapterResult({ ...RESULT, isFormalDesign: true as never }).join(""),
    ).toContain("isFormalDesign は false");
  });
});
