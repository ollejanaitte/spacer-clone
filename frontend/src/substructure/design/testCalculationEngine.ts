// Phase C1 (A-03) Test / Mock Calculation Engine
// Adapter 境界の実動確認専用。正式な道路橋設計式は実装しない。
// 概算数量（幾何）のみ実計算し、それらを TEST チェックとして返す。
// 結果は常に TEST / MOCK として識別され、正式な構造安全性判定にはならない。

import {
  ADAPTER_SCHEMA_VERSION,
  type AdapterCheck,
  type AdapterCheckStatus,
  type AdapterTraceEntry,
  type CalculationAdapterInput,
  type CalculationAdapterResult,
} from "./calculationAdapter";
import { fnv1a } from "./adapterMapper";

export const TEST_ENGINE_TYPE = "test-mock";
export const TEST_ENGINE_VERSION = "0.1.0";

export interface TestEngineOptions {
  /** Engine が使えない状況をシミュレートする（異常系E2E用）。 */
  simulateUnavailable?: boolean;
}

interface GeometricFigures {
  columnVolume: number;
  capVolume: number;
  beamVolume: number;
  footingVolume: number;
  backwallVolume: number;
  wingVolume: number;
  pileVolume: number;
  pileLength: number;
}

function computeGeometricFigures(input: CalculationAdapterInput): GeometricFigures {
  const g = input.geometry;
  const vol = (a: number, b: number, c: number) => a * b * c;
  let column = 0;
  let cap = 0;
  let beam = 0;
  let backwall = 0;
  let wing = 0;
  let footing = 0;
  let pileVolume = 0;
  let pileLength = 0;

  if (g.column) column = vol(g.column.width, g.column.depth, g.column.height);
  if (g.columns) {
    for (const c of g.columns) column += vol(c.width, c.depth, c.height);
  }
  if (g.cap) cap = vol(g.cap.width, g.cap.depth, g.cap.height);
  if (g.beam) beam = vol(g.beam.width, g.beam.depth, g.beam.height);
  if (g.backwall) backwall = vol(g.backwall.width, g.backwall.thickness, g.backwall.height);
  if (g.wingWallL) wing += vol(g.wingWallL.length, g.wingWallL.thickness, g.wingWallL.height);
  if (g.wingWallR) wing += vol(g.wingWallR.length, g.wingWallR.thickness, g.wingWallR.height);
  if (g.footing) footing = vol(g.footing.length, g.footing.width, g.footing.thickness);
  if (g.pileGroup) {
    const r = g.pileGroup.diameter / 2;
    const perPile = Math.PI * r * r * g.pileGroup.length;
    pileVolume = perPile * g.pileGroup.pileCount;
    pileLength = g.pileGroup.length * g.pileGroup.pileCount;
  }
  return { columnVolume: column, capVolume: cap, beamVolume: beam, footingVolume: footing, backwallVolume: backwall, wingVolume: wing, pileVolume, pileLength };
}

function quantityCheck(
  checkId: string,
  checkName: string,
  value: number,
  unit: string,
  options?: { applicable?: boolean },
): AdapterCheck {
  const applicable = options?.applicable ?? true;
  if (!applicable) {
    return {
      checkId,
      checkName,
      status: "HOLD",
      value: "N/A",
      unit,
      note: "対象外（適用条件なし）。TEST/MOCK 結果。正式設計判定ではない。",
    };
  }
  let status: AdapterCheckStatus = "HOLD";
  if (Number.isFinite(value)) {
    status = value > 0 ? "TEST_PASS" : "TEST_FAIL";
  }
  return {
    checkId,
    checkName,
    status,
    value: Number.isFinite(value) ? value.toFixed(3) : "N/A",
    unit,
    note: "TEST/MOCK 結果（幾何概算）。正式設計判定ではない。",
  };
}

/** Adapter 入力から calculationId を導出（deterministic）。 */
export function buildCalculationId(input: CalculationAdapterInput): string {
  const payload = JSON.stringify({
    schemaVersion: input.schemaVersion,
    supportId: input.supportId,
    structureType: input.structureType,
    geometry: input.geometry,
    placement: input.placement,
    modelRevision: input.modelRevision,
  });
  return `calc-${fnv1a(payload)}-${TEST_ENGINE_VERSION.replace(/\./g, "")}`;
}

function buildTrace(input: CalculationAdapterInput, figs: GeometricFigures): AdapterTraceEntry[] {
  return [
    { key: "input.supportId", value: input.supportId },
    { key: "input.structureType", value: input.structureType },
    { key: "input.geometry", value: JSON.stringify(input.geometry) },
    { key: "input.placement", value: JSON.stringify(input.placement) },
    { key: "input.modelRevision", value: input.modelRevision },
    { key: "figures.columnVolume", value: figs.columnVolume.toFixed(3), unit: "m³" },
    { key: "figures.footingVolume", value: figs.footingVolume.toFixed(3), unit: "m³" },
    { key: "figures.pileLength", value: figs.pileLength.toFixed(3), unit: "m" },
    { key: "engine", value: `${TEST_ENGINE_TYPE}@${TEST_ENGINE_VERSION}` },
    { key: "formalDesign", value: "false" },
  ];
}

/**
 * Test Calculation Engine 実行。
 * same input → same result（deterministic）。invalid input → ERROR。unavailable → ERROR。
 */
export function calculateTest(
  input: CalculationAdapterInput,
  options?: TestEngineOptions,
): CalculationAdapterResult {
  const generatedAt = new Date().toISOString();
  const calculationId = buildCalculationId(input);

  const base = {
    schemaVersion: ADAPTER_SCHEMA_VERSION,
    calculationId,
    supportId: input.supportId,
    engineType: TEST_ENGINE_TYPE,
    engineVersion: TEST_ENGINE_VERSION,
    generatedAt,
    isFormalDesign: false as const,
    engineLabel: "TEST" as const,
  };

  if (options?.simulateUnavailable) {
    return {
      ...base,
      status: "ERROR",
      checks: [],
      summary: { pass: 0, fail: 0, hold: 0, total: 0 },
      errors: ["Test Calculation Engine が利用できません（simulateUnavailable）"],
      warnings: [],
      trace: [{ key: "engine", value: "unavailable" }],
    };
  }

  const validation = validateInput(input);
  if (validation.length > 0) {
    return {
      ...base,
      status: "ERROR",
      checks: [],
      summary: { pass: 0, fail: 0, hold: 0, total: 0 },
      errors: validation,
      warnings: ["入力検証エラーのため計算を実行しません（fail-closed）"],
      trace: [{ key: "input.modelRevision", value: input.modelRevision }],
    };
  }

  const figs = computeGeometricFigures(input);
  const isPier = input.structureType === "pier";
  const isAbutment = input.structureType === "abutment";
  const hasPiles = input.geometry.pileGroup != null;
  const checks: AdapterCheck[] = [
    quantityCheck("TEST-COLUMN-VOLUME", "TEST 柱体積", figs.columnVolume, "m³", { applicable: isPier }),
    quantityCheck("TEST-CAP-VOLUME", "TEST 梁体積", figs.capVolume + figs.beamVolume, "m³", { applicable: isPier }),
    quantityCheck("TEST-BACKWALL-VOLUME", "TEST 背壁体積", figs.backwallVolume, "m³", { applicable: isAbutment }),
    quantityCheck("TEST-FOOTING-VOLUME", "TEST フーチング体積", figs.footingVolume, "m³"),
    quantityCheck("TEST-PILE-LENGTH", "TEST 杭総延長", figs.pileLength, "m", { applicable: hasPiles }),
    {
      checkId: "MOCK-FIXTURE-CHECK",
      checkName: "MOCK 固定チェック（fixture）",
      status: "TEST_PASS",
      value: "0.5",
      unit: "ratio",
      note: "固定 fixture 値。正式設計判定ではない。",
    },
  ];

  const pass = checks.filter((c) => c.status === "TEST_PASS").length;
  const fail = checks.filter((c) => c.status === "TEST_FAIL").length;
  const hold = checks.filter((c) => c.status === "HOLD").length;
  const status =
    fail > 0 ? "TEST_FAIL" : pass > 0 ? "TEST_PASS" : "HOLD";

  return {
    ...base,
    status,
    checks,
    summary: { pass, fail, hold, total: checks.length },
    errors: [],
    warnings: ["TEST/MOCK 結果であり正式な設計判定ではない"],
    trace: buildTrace(input, figs),
  };
}

function validateInput(input: CalculationAdapterInput): string[] {
  const diagnostics: string[] = [];
  if (!input || typeof input !== "object") {
    return ["CalculationAdapterInput が無効"];
  }
  if (input.schemaVersion !== ADAPTER_SCHEMA_VERSION) {
    diagnostics.push(`schemaVersion=${String(input.schemaVersion)} は非対応`);
  }
  if (typeof input.supportId !== "string" || input.supportId.trim() === "") {
    diagnostics.push("supportId は必須");
  }
  if (input.structureType !== "pier" && input.structureType !== "abutment") {
    diagnostics.push("structureType は pier / abutment のみ対応");
  }
  if (input.geometry.footing !== undefined) {
    const f = input.geometry.footing;
    if (f.length <= 0 || f.width <= 0 || f.thickness <= 0) {
      diagnostics.push("footing 寸法が 0 以下");
    }
  }
  return diagnostics;
}
