/** WF-05 RC deck haunch canonical input types (Step 4-B). */

import type { PresenceStatus } from "./presence";

export const HAUNCH_SHAPE_TYPES = ["RECT", "TRAPEZOID"] as const;
export type HaunchShapeType = (typeof HAUNCH_SHAPE_TYPES)[number];

/** Persisted item for a PROVIDED girder haunch (dimensions may be incomplete while editing). */
export type ApolloHaunchItemDraft = {
  readonly haunchId: string;
  readonly startStation: number | null;
  readonly endStation: number | null;
  readonly shapeType: HaunchShapeType | null;
  readonly topWidth: number | null;
  readonly bottomWidth: number | null;
  readonly height: number | null;
  readonly materialRef: string | null;
};

/**
 * Per-main-girder presence declaration.
 * `mainGirderKey` is the stable seed key (`girder-${index}`), not a random UUID.
 */
export type ApolloHaunchGirderDraft = {
  readonly mainGirderKey: string;
  readonly presence: PresenceStatus;
  readonly item: ApolloHaunchItemDraft | null;
};

export type ApolloHaunchConfigurationDraft = {
  readonly girders: readonly ApolloHaunchGirderDraft[];
};

export type RcDeckHaunchModel = {
  readonly haunchId: string;
  readonly mainGirderKey: string;
  readonly mainGirderRefId: string;
  readonly startStation: number;
  readonly endStation: number;
  readonly shapeType: HaunchShapeType;
  readonly topWidth: number;
  readonly bottomWidth: number;
  readonly height: number;
  readonly materialRef: string | null;
  readonly status: "UNVERIFIED_DEVELOPMENT_ONLY";
  readonly designAuthorization: "NOT_AUTHORIZED";
  readonly provenance: {
    readonly source: "user_input";
    readonly generatedBy: "buildRcDeckHaunchModels";
    readonly datum: "top_flange_upper_face_to_deck_soffit";
  };
};

export type HaunchDiagnosticCode =
  | "HAUNCH_PRESENCE_NOT_PROVIDED"
  | "HAUNCH_PROVIDED_WITHOUT_ITEM"
  | "HAUNCH_EXPLICIT_NONE_WITH_ITEM"
  | "HAUNCH_DUPLICATE_ID"
  | "HAUNCH_DUPLICATE_GIRDER_REF"
  | "HAUNCH_DANGLING_GIRDER_REF"
  | "HAUNCH_GIRDER_UNDECIDED"
  | "HAUNCH_INVALID_STATION_RANGE"
  | "HAUNCH_OUTSIDE_BRIDGE_LENGTH"
  | "HAUNCH_INVALID_RECT"
  | "HAUNCH_INVALID_TRAPEZOID"
  | "HAUNCH_INVALID_DIMENSION"
  | "HAUNCH_INVALID_MATERIAL_REF"
  | "HAUNCH_MISSING_BRIDGE_LENGTH"
  | "HAUNCH_MISSING_GIRDER_COUNT"
  | "HAUNCH_GIRDER_COUNT_MISMATCH";

export type HaunchDiagnostic = {
  readonly code: HaunchDiagnosticCode;
  readonly mainGirderKey: string | null;
  readonly blocking: boolean;
  readonly message: string;
  readonly remediation: string;
};

export function mainGirderKeyFromIndex(index: number): string {
  return `girder-${index}`;
}
