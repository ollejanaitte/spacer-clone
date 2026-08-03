/** WF-03 deck / bridge appurtenance canonical input types (Step 4-B). */

import type { PresenceStatus } from "./presence";

export const APPURTENANCE_SLOTS = [
  "LEFT_CURB",
  "RIGHT_CURB",
  "LEFT_WALL_RAILING",
  "RIGHT_WALL_RAILING",
  "MEDIAN",
  "OPTIONAL_BARRIER",
] as const;

export type AppurtenanceSlot = (typeof APPURTENANCE_SLOTS)[number];

export const APPURTENANCE_TYPES = ["CURB", "WALL_RAILING", "MEDIAN", "BARRIER_OPTIONAL"] as const;
export type AppurtenanceType = (typeof APPURTENANCE_TYPES)[number];

export const APPURTENANCE_SIDES = ["LEFT", "RIGHT", "CENTER", "NONE"] as const;
export type AppurtenanceSide = (typeof APPURTENANCE_SIDES)[number];

export const APPURTENANCE_CROSS_SECTION_SHAPES = ["RECT"] as const;
export type AppurtenanceCrossSectionShape = (typeof APPURTENANCE_CROSS_SECTION_SHAPES)[number];

export const APPURTENANCE_SLOT_TYPE_SIDE: Readonly<
  Record<AppurtenanceSlot, { readonly type: AppurtenanceType; readonly side: AppurtenanceSide }>
> = {
  LEFT_CURB: { type: "CURB", side: "LEFT" },
  RIGHT_CURB: { type: "CURB", side: "RIGHT" },
  LEFT_WALL_RAILING: { type: "WALL_RAILING", side: "LEFT" },
  RIGHT_WALL_RAILING: { type: "WALL_RAILING", side: "RIGHT" },
  MEDIAN: { type: "MEDIAN", side: "CENTER" },
  OPTIONAL_BARRIER: { type: "BARRIER_OPTIONAL", side: "NONE" },
};

export const APPURTENANCE_SLOT_LABELS: Readonly<Record<AppurtenanceSlot, string>> = {
  LEFT_CURB: "左地覆",
  RIGHT_CURB: "右地覆",
  LEFT_WALL_RAILING: "左壁高欄",
  RIGHT_WALL_RAILING: "右壁高欄",
  MEDIAN: "中央分離帯",
  OPTIONAL_BARRIER: "任意バリア",
};

/** Persisted item payload for a PROVIDED slot (dimensions may still be incomplete). */
export type ApolloAppurtenanceItemDraft = {
  readonly appurtenanceId: string;
  readonly startStation: number | null;
  readonly endStation: number | null;
  readonly transverseOffset: number | null;
  readonly crossSectionShape: AppurtenanceCrossSectionShape | null;
  readonly width: number | null;
  readonly height: number | null;
  readonly materialRef: string | null;
  readonly unitWeight: number | null;
};

export type ApolloAppurtenanceSlotDraft = {
  readonly slot: AppurtenanceSlot;
  readonly presence: PresenceStatus;
  /** Non-null only when presence === PROVIDED (may still have null dimensions while editing). */
  readonly item: ApolloAppurtenanceItemDraft | null;
};

export type ApolloAppurtenanceConfigurationDraft = {
  readonly slots: readonly ApolloAppurtenanceSlotDraft[];
};

export type BridgeAppurtenanceCrossSection = {
  readonly shape: AppurtenanceCrossSectionShape;
  readonly width: number;
  readonly height: number;
};

export type BridgeAppurtenanceModel = {
  readonly appurtenanceId: string;
  readonly slot: AppurtenanceSlot;
  readonly type: AppurtenanceType;
  readonly side: AppurtenanceSide;
  readonly startStation: number;
  readonly endStation: number;
  readonly transverseOffset: number;
  readonly crossSection: BridgeAppurtenanceCrossSection;
  readonly materialRef: string | null;
  readonly unitWeight: number | null;
  readonly unitWeightStatus: "NOT_PROVIDED" | "USER_PROVIDED_UNVERIFIED";
  readonly status: "UNVERIFIED_DEVELOPMENT_ONLY";
  readonly designAuthorization: "NOT_AUTHORIZED";
  readonly provenance: {
    readonly source: "user_input";
    readonly generatedBy: "buildBridgeAppurtenanceModels";
  };
};

export type AppurtenanceDiagnosticCode =
  | "APPURTENANCE_PRESENCE_NOT_PROVIDED"
  | "APPURTENANCE_PROVIDED_WITHOUT_ITEM"
  | "APPURTENANCE_EXPLICIT_NONE_WITH_ITEM"
  | "APPURTENANCE_DUPLICATE_ID"
  | "APPURTENANCE_INVALID_TYPE_SIDE"
  | "APPURTENANCE_INVALID_STATION_RANGE"
  | "APPURTENANCE_OUTSIDE_BRIDGE_LENGTH"
  | "APPURTENANCE_INVALID_OFFSET"
  | "APPURTENANCE_OUTSIDE_DECK_WIDTH"
  | "APPURTENANCE_INVALID_CROSS_SECTION"
  | "APPURTENANCE_INVALID_UNIT_WEIGHT"
  | "APPURTENANCE_INVALID_MATERIAL_REF"
  | "APPURTENANCE_LOCAL_CRS_WARNING"
  | "APPURTENANCE_MISSING_BRIDGE_LENGTH"
  | "APPURTENANCE_MISSING_DECK_WIDTH"
  | "APPURTENANCE_SLOT_INCOMPLETE";

export type AppurtenanceDiagnostic = {
  readonly code: AppurtenanceDiagnosticCode;
  readonly slot: AppurtenanceSlot | null;
  readonly blocking: boolean;
  readonly message: string;
  readonly remediation: string;
};
