import {
  createDefaultLateralAngleSection,
  LATERAL_ANGLE_CATALOG_ID,
  type ApolloLateralAngleSectionDraft,
} from "./lateralAngleTypes";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
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
