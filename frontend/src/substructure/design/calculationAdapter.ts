// Phase C1 (A-01) Design Calculation Adapter 契約（Freeze）
// 将来の正式設計計算エンジンを差し込むための境界契約。
// UI・Three.js に依存しない。status は正式設計の OK/NG と誤認しない命名を使う。
// 本契約は「モデル → Adapter入力 → 計算Engine → Adapter結果 → UI → 永続化」の
// データ往復を可能にするための最小契約である。

export const ADAPTER_SCHEMA_VERSION = "0.1.0";
export const ADAPTER_ENVELOPE_SCHEMA_VERSION = "0.1.0";

/** 正式設計の OK/NG と誤認しない status 表現。 */
export type AdapterStatus = "TEST_PASS" | "TEST_FAIL" | "HOLD" | "ERROR";

export type AdapterCheckStatus = "TEST_PASS" | "TEST_FAIL" | "HOLD";

export interface AdapterDimension3 {
  width: number;
  depth: number;
  height: number;
}

export interface AdapterColumnDim extends AdapterDimension3 {
  transverseOffset?: number;
}

export interface AdapterGeometry {
  pierFormType?: string;
  abutmentFormType?: string;
  /** 単柱 / 壁式の柱 */
  column?: AdapterDimension3;
  /** 梁（キャップ） */
  cap?: AdapterDimension3;
  /** 門型の2柱 */
  columns?: AdapterColumnDim[];
  /** 門型の横梁 */
  beam?: AdapterDimension3;
  /** フーチング */
  footing?: { length: number; width: number; thickness: number };
  /** 杭グループ */
  pileGroup?: {
    pileType: string;
    diameter: number;
    length: number;
    pileCount: number;
    spacing: { x: number; y: number };
  };
  /** 橋台 backwall / wing */
  backwall?: { width: number; height: number; thickness: number };
  wingWallL?: { length: number; height: number; thickness: number };
  wingWallR?: { length: number; height: number; thickness: number };
}

export interface AdapterPlacement {
  station: number | null;
  offset: number | null;
  skewDeg: number | null;
  zOverride: number | null;
}

export interface CalculationAdapterInput {
  schemaVersion: string;
  projectId?: string;
  bridgeId?: string;
  supportId: string;
  structureType: "pier" | "abutment";
  geometry: AdapterGeometry;
  placement: AdapterPlacement;
  /** ソースモデルの revision/id（traceability・stale 検出）。 */
  modelRevision: string;
  units: { length: "m"; force: "kN"; angle: "deg" };
  bearingSeatCount: number;
  reactionCaseKinds: string[];
  source?: string;
}

export interface AdapterCheck {
  checkId: string;
  checkName: string;
  status: AdapterCheckStatus;
  /** 表示値（TEST であることを明示）。 */
  value: string;
  unit: string;
  note: string;
}

export interface AdapterTraceEntry {
  key: string;
  value: string;
  unit?: string;
  note?: string;
}

export interface CalculationAdapterResult {
  schemaVersion: string;
  calculationId: string;
  supportId: string;
  engineType: string;
  engineVersion: string;
  status: AdapterStatus;
  checks: AdapterCheck[];
  summary: { pass: number; fail: number; hold: number; total: number };
  errors: string[];
  warnings: string[];
  trace: AdapterTraceEntry[];
  generatedAt: string;
  /** 正式設計結果でないことを明示（true にはならない）。 */
  isFormalDesign: false;
  /** TEST/MOCK であることの識別ラベル。 */
  engineLabel: "TEST" | "MOCK";
}

/** Adapter 入力の検証（fail-closed）。 */
export function validateAdapterInput(
  input: unknown,
): string[] {
  const diagnostics: string[] = [];
  if (input === null || typeof input !== "object" || Array.isArray(input)) {
    return ["CalculationAdapterInput はオブジェクトが必要"];
  }
  const doc = input as Partial<CalculationAdapterInput>;
  if (doc.schemaVersion !== ADAPTER_SCHEMA_VERSION) {
    diagnostics.push(`schemaVersion=${String(doc.schemaVersion)} は非対応（期待 ${ADAPTER_SCHEMA_VERSION}）`);
  }
  if (typeof doc.supportId !== "string" || doc.supportId.trim() === "") {
    diagnostics.push("supportId は必須（非空文字列）");
  }
  if (doc.structureType !== "pier" && doc.structureType !== "abutment") {
    diagnostics.push("structureType は pier / abutment のみ対応");
  }
  if (!doc.geometry || typeof doc.geometry !== "object") {
    diagnostics.push("geometry は必須オブジェクト");
  } else {
    const g = doc.geometry;
    if (g.footing !== undefined) {
      const f = g.footing;
      if (
        !(typeof f.length === "number" && f.length > 0) ||
        !(typeof f.width === "number" && f.width > 0) ||
        !(typeof f.thickness === "number" && f.thickness > 0)
      ) {
        diagnostics.push("footing 寸法は全て 0 より大きい値が必要");
      }
    }
    if (g.column !== undefined && !isPositiveDim3(g.column)) {
      diagnostics.push("column 寸法は全て 0 より大きい値が必要");
    }
  }
  if (typeof doc.modelRevision !== "string" || doc.modelRevision.trim() === "") {
    diagnostics.push("modelRevision は必須（stale 検出に使用）");
  }
  return diagnostics;
}

function isPositiveDim3(d: { width?: number; depth?: number; height?: number }): boolean {
  return (
    typeof d.width === "number" &&
    d.width > 0 &&
    typeof d.depth === "number" &&
    d.depth > 0 &&
    typeof d.height === "number" &&
    d.height > 0
  );
}

/** Adapter 結果の検証（fail-closed）。 */
export function validateAdapterResult(
  result: unknown,
): string[] {
  const diagnostics: string[] = [];
  if (result === null || typeof result !== "object" || Array.isArray(result)) {
    return ["CalculationAdapterResult はオブジェクトが必要"];
  }
  const doc = result as Partial<CalculationAdapterResult>;
  if (doc.schemaVersion !== ADAPTER_SCHEMA_VERSION) {
    diagnostics.push(`schemaVersion=${String(doc.schemaVersion)} は非対応（期待 ${ADAPTER_SCHEMA_VERSION}）`);
  }
  if (typeof doc.calculationId !== "string" || doc.calculationId.trim() === "") {
    diagnostics.push("calculationId は必須");
  }
  if (typeof doc.supportId !== "string" || doc.supportId.trim() === "") {
    diagnostics.push("supportId は必須");
  }
  if (doc.engineType !== "test-mock") {
    diagnostics.push(`engineType=${String(doc.engineType)} は test-mock のみ対応（本物の正式Engineは未接続）`);
  }
  if (doc.status !== "TEST_PASS" && doc.status !== "TEST_FAIL" && doc.status !== "HOLD" && doc.status !== "ERROR") {
    diagnostics.push(`status=${String(doc.status)} は TEST_PASS/TEST_FAIL/HOLD/ERROR のいずれかが必要`);
  }
  if (doc.isFormalDesign !== false) {
    diagnostics.push("isFormalDesign は false である必要がある（正式設計結果として扱わない）");
  }
  if (!Array.isArray(doc.checks)) {
    diagnostics.push("checks は配列が必要");
  }
  if (!Array.isArray(doc.errors)) {
    diagnostics.push("errors は配列が必要");
  }
  return diagnostics;
}
