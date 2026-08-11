/**
 * Bridge Layout Contract - 唯一の正本（single source of truth）.
 *
 * Phase 4-01: Bridge Layout は「どのRoad Alignment上の橋か・橋梁区間・
 * A1/A2・P1..Pn・支間構成・配置上必要なskew/交角」を保持する。
 * 橋脚/橋台の躯体詳細・基礎・耐震・上部工断面設計・FEM解析は責任範囲外
 * （後続Substructure/Superstructure Moduleへhandoff）。
 *
 * 参照方針（Road/Terrain/Existingの正本を複製しない）:
 * - Road / Terrain / Existing は ID/reference で接続する。
 * - 配置計算（station→座標）は Road Module（liner core）へ委譲し再実装しない。
 *
 * 座標規約: domain XYZ = X:道路軸 / Y:横断 / Z:標高（metric）。
 * 測点（station）は Road Alignment上の physical distance [m]。
 * skewは rad、反時計回り正（counterclockwise-positive）を正とする。
 */

export const BRIDGE_LAYOUT_MODULE_ID = "bridgeLayout" as const;
export const BRIDGE_LAYOUT_SCHEMA_VERSION = "0.1.0" as const;
export const BRIDGE_LAYOUT_DATA_VERSION = "1.0.0" as const;

export type SkewSignConvention = "counterclockwise-positive" | "clockwise-positive";

export interface BridgeLayoutIssue {
  readonly path: string;
  readonly message: string;
}

export interface BridgeLayoutMetadata {
  readonly createdBy?: string;
  readonly createdAt?: string | null;
  readonly updatedAt?: string | null;
  readonly note?: string;
}

/** Road Module への参照（Road正本を複製しない） */
export interface RoadReference {
  readonly moduleId: "road";
  readonly alignmentId: string | null;
  readonly stationReferenceId: string | null;
  readonly coordinatePolicyId: string | null;
}

/** Terrain Module への参照 */
export interface TerrainReference {
  readonly moduleId: "terrain";
  readonly surfaceReference: string | null;
  readonly coordinateContextId: string | null;
}

/** Existing Conditions（地形・現況）への参照 */
export interface ExistingConditionsReference {
  readonly moduleId: "terrain";
  readonly documentReferenceId: string | null;
}

export interface BridgeRange {
  readonly startStation: number;
  readonly endStation: number;
}

/** 橋台（A1/A2）の配置情報（躯体詳細は下部工Moduleが担当） */
export interface AbutmentPlacement {
  readonly supportId: string;
  readonly station: number;
  readonly skewAngleRad: number | null;
}

/** 橋脚（P1..Pn）の配置情報 */
export interface PierPlacement {
  readonly supportId: string;
  readonly station: number;
  readonly skewAngleRad: number | null;
}

export interface BridgeSpan {
  readonly spanId: string;
  readonly index: number;
  readonly startSupportId: string;
  readonly endSupportId: string;
  readonly startStation: number;
  readonly endStation: number;
  readonly length: number;
}

export interface SkewConfig {
  readonly signConvention: SkewSignConvention;
  readonly angleRad: number | null;
}

export interface BridgeLayoutValidationState {
  readonly schemaVersion: string;
  readonly validatedAt: string | null;
  readonly ok: boolean;
  readonly issues: readonly { readonly path: string; readonly message: string }[];
}

export interface BridgeLayoutDocument {
  readonly bridgeId: string;
  readonly name: string;
  readonly schemaVersion: string;
  readonly metadata: BridgeLayoutMetadata;
  readonly roadReference: RoadReference;
  readonly bridgeRange: BridgeRange;
  readonly abutments: {
    readonly A1: AbutmentPlacement;
    readonly A2: AbutmentPlacement;
  };
  readonly piers: readonly PierPlacement[];
  readonly spans: readonly BridgeSpan[];
  readonly skew: SkewConfig;
  readonly terrainReference: TerrainReference;
  readonly existingConditionsReference: ExistingConditionsReference;
  readonly validation: BridgeLayoutValidationState;
}

export interface BridgeLayoutModuleData {
  readonly bridgeLayoutDocument?: BridgeLayoutDocument;
}

export function createEmptyBridgeLayoutDocument(): BridgeLayoutDocument {
  return {
    bridgeId: "",
    name: "",
    schemaVersion: BRIDGE_LAYOUT_SCHEMA_VERSION,
    metadata: { createdBy: undefined, createdAt: null, updatedAt: null, note: undefined },
    roadReference: {
      moduleId: "road",
      alignmentId: null,
      stationReferenceId: null,
      coordinatePolicyId: null,
    },
    bridgeRange: { startStation: 0, endStation: 0 },
    abutments: {
      A1: { supportId: "A1", station: 0, skewAngleRad: null },
      A2: { supportId: "A2", station: 0, skewAngleRad: null },
    },
    piers: [],
    spans: [],
    skew: { signConvention: "counterclockwise-positive", angleRad: null },
    terrainReference: { moduleId: "terrain", surfaceReference: null, coordinateContextId: null },
    existingConditionsReference: { moduleId: "terrain", documentReferenceId: null },
    validation: { schemaVersion: BRIDGE_LAYOUT_SCHEMA_VERSION, validatedAt: null, ok: false, issues: [] },
  };
}

export function createBridgeLayoutData(): BridgeLayoutModuleData {
  return { bridgeLayoutDocument: undefined };
}

export function isBridgeLayoutData(value: unknown): value is BridgeLayoutModuleData {
  if (!value || typeof value !== "object") return false;
  const record = value as Record<string, unknown>;
  return record.bridgeLayoutDocument === undefined || typeof record.bridgeLayoutDocument === "object";
}
