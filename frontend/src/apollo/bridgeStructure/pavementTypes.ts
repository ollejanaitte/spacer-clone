/** Step 5 pavement + road marking canonical types (DEC-S5-0003 / 0004). */

import type { PresenceStatus } from "./presence";

export const ROAD_MARKING_KINDS = [
  "CENTER_LINE",
  "LANE_BOUNDARY",
  "EDGE_LINE_LEFT",
  "EDGE_LINE_RIGHT",
] as const;
export type RoadMarkingKind = (typeof ROAD_MARKING_KINDS)[number];

export const ROAD_MARKING_DASH_PATTERNS = ["SOLID", "DASHED"] as const;
export type RoadMarkingDashPattern = (typeof ROAD_MARKING_DASH_PATTERNS)[number];

export type ApolloPavementItemDraft = {
  readonly thickness: number | null;
  readonly unitWeight: number | null;
  readonly startStation: number | null;
  readonly endStation: number | null;
};

export type ApolloPavementConfigurationDraft = {
  readonly presence: PresenceStatus;
  readonly item: ApolloPavementItemDraft | null;
};

export type ApolloRoadMarkingDraft = {
  readonly markingId: string;
  readonly kind: RoadMarkingKind;
  readonly enabled: boolean;
  readonly width: number | null;
  readonly offsetFromCenter: number | null;
  readonly dashPattern: RoadMarkingDashPattern;
};

export type ApolloRoadMarkingsConfigurationDraft = {
  /** Master viz toggle; false → invent no marking solids. */
  readonly enabled: boolean;
  readonly markings: readonly ApolloRoadMarkingDraft[];
};

export type PavementDiagnosticCode =
  | "PAVEMENT_PRESENCE_INCONSISTENT"
  | "PAVEMENT_INVALID_THICKNESS"
  | "PAVEMENT_INVALID_UNIT_WEIGHT"
  | "PAVEMENT_INVALID_STATION_RANGE"
  | "PAVEMENT_MISSING_BRIDGE_LENGTH"
  | "ROAD_MARKING_INVALID_WIDTH"
  | "ROAD_MARKING_INVALID_OFFSET";

export type PavementDiagnostic = {
  readonly code: PavementDiagnosticCode;
  readonly blocking: boolean;
  readonly message: string;
  readonly remediation: string;
};

export const DEFAULT_PAVEMENT_UNIT_WEIGHT_KN_M3 = 22.5;
