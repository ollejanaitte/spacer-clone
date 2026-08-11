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
  /**
   * 橋長 = endStation - startStation の自動算出値（スナップショット）。
   * 正式な橋長は常に endStation - startStation から算出し直される。
   */
  readonly bridgeLength?: number;
}

/**
 * A1/A2配置候補（橋梁端部の配置点）の最小配置情報スナップショット。
 *
 * 橋台躯体寸法・パラペット・翼壁・基礎・杭は含まない（Phase 4-02範囲外）。
 * Road / Terrain の正本を複製するものではなく、配置時にRoad Moduleの
 * station→XYZ変換とTerrain参照から算出した「候補点」の記録であり、
 * downstream（下部工/上部工）handoff・再起動復元用の最小情報である。
 */
export interface AbutmentPlacementCandidate {
  /** domain X（道路軸方向） [m] */
  readonly domainX: number;
  /** domain Y（横断方向） [m] */
  readonly domainY: number;
  /** 道路標高（domain Z） [m] */
  readonly elevation: number;
  /** 道路接線方向（azimuth, rad） */
  readonly tangentAzimuthRad: number;
  /** A1/A2直下のTerrain標高 [m]。Terrain参照不能時は null */
  readonly terrainElevation: number | null;
  /** この候補を算出したRoad Alignment ID（参照、正本複製ではない） */
  readonly roadReferenceId: string;
  /** coordinate context ID（Road AlignmentのcoordinatePolicyId） */
  readonly coordinateContextId: string | null;
  /** 算出日時 ISO8601 */
  readonly capturedAt: string;
}

/** 橋台（A1/A2）の配置情報（躯体詳細は下部工Moduleが担当） */
export interface AbutmentPlacement {
  readonly supportId: string;
  readonly station: number;
  readonly skewAngleRad: number | null;
  /** 配置候補スナップショット（Phase 4-02）。未生成時は省略可 */
  readonly placement?: AbutmentPlacementCandidate;
}

/** 橋脚（P1..Pn）の配置情報（躯体詳細は下部工Moduleが担当） */
export interface PierPlacementCandidate extends AbutmentPlacementCandidate {}

export type SkewSource = "automatic" | "user";

/**
 * 橋脚（P1..Pn）の配置情報（Phase 4-03）。
 * - 橋脚柱詳細・梁・壁式・フーチング・杭・基礎設計は下部工Moduleが担当。
 * - placement は Road Module の station→XYZ変換から算出した配置候補スナップショット。
 * - skewSource: automatic = 道路直角の自動初期候補 / user = ユーザー指定。
 */
export interface PierPlacement {
  readonly supportId: string;
  readonly label?: string;
  readonly station: number;
  readonly skewAngleRad: number | null;
  readonly skewSource?: SkewSource;
  /** 配置候補スナップショット。未生成時は省略可 */
  readonly placement?: PierPlacementCandidate;
  readonly metadata?: Record<string, unknown>;
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
