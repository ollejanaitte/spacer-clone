import {
  createDefaultLateralAngleSection,
  LATERAL_ANGLE_CATALOG_DEFAULTS,
  LATERAL_ANGLE_CATALOG_ID,
  type ApolloLateralAngleSectionDraft,
} from "./lateralAngleTypes";
import type { LAngleOrientation } from "./lAnglePolygon";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

const ORIENTATIONS: readonly LAngleOrientation[] = [
  "LEG_A_ALONG_LOCAL_Y",
  "LEG_A_ALONG_LOCAL_NEG_Y",
  "LEG_A_ALONG_LOCAL_Z",
  "LEG_A_ALONG_LOCAL_NEG_Z",
];

function parseOrientation(raw: unknown): LAngleOrientation {
  if (typeof raw === "string" && (ORIENTATIONS as readonly string[]).includes(raw)) {
    return raw as LAngleOrientation;
  }
  return LATERAL_ANGLE_CATALOG_DEFAULTS.orientation;
}

export function parseLateralAngleSection(raw: unknown): ApolloLateralAngleSectionDraft | null {
  if (raw === undefined || raw === null) {
    // Migration: invent nothing new for old projects — keep cylinder (enabled false).
    return {
      enabled: false,
      legA: null,
      legB: null,
      thickness: null,
      catalogId: LATERAL_ANGLE_CATALOG_ID,
      orientation: LATERAL_ANGLE_CATALOG_DEFAULTS.orientation,
    };
  }
  if (!isRecord(raw) || typeof raw.enabled !== "boolean") return null;
  const legA = raw.legA;
  const legB = raw.legB;
  const thickness = raw.thickness;
  if (legA !== null && (typeof legA !== "number" || !Number.isFinite(legA))) return null;
  if (legB !== null && (typeof legB !== "number" || !Number.isFinite(legB))) return null;
  if (thickness !== null && (typeof thickness !== "number" || !Number.isFinite(thickness))) return null;
  return {
    enabled: raw.enabled,
    legA: legA === undefined ? null : legA,
    legB: legB === undefined ? null : legB,
    thickness: thickness === undefined ? null : thickness,
    catalogId: typeof raw.catalogId === "string" ? raw.catalogId : LATERAL_ANGLE_CATALOG_ID,
    orientation: parseOrientation(raw.orientation),
  };
}

export function validateLateralAngleSectionPersistence(raw: unknown): readonly string[] {
  if (raw === undefined || raw === null) return [];
  if (parseLateralAngleSection(raw) === null) {
    return ["apolloBridgeStructureInput.lateralAngleSection is invalid."];
  }
  return [];
}

export { createDefaultLateralAngleSection };
