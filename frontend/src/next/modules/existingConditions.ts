export const EXISTING_CONDITIONS_MODULE_ID = "existingConditions" as const;
export const EXISTING_CONDITIONS_SCHEMA_VERSION = "0.1.0" as const;

export type ExistingConditionType =
  | "road"
  | "river"
  | "railway"
  | "existingBridge"
  | "building"
  | "seawall"
  | "pond"
  | "underground"
  | "pipe"
  | "tunnel"
  | "utility"
  | "other";

export type ExistingConditionLayer =
  | "surface"
  | "underground"
  | "water";

export interface ExistingConditionGeometry {
  readonly kind: "point" | "line" | "polygon" | "pipe";
  readonly points: readonly { readonly x: number; readonly y: number; readonly z: number }[];
  readonly diameter?: number;
  readonly height?: number;
}

export interface ExistingConditionEntity {
  readonly entityId: string;
  readonly type: ExistingConditionType;
  readonly label: string;
  readonly geometry: ExistingConditionGeometry;
  readonly coordinateContextId: string;
  readonly metadata: Record<string, unknown>;
  readonly visibility: boolean;
  readonly layer: ExistingConditionLayer;
  readonly styleReference: string | null;
  readonly sourceReference: string | null;
}

export interface ExistingConditionsDocument {
  readonly schemaVersion: string;
  readonly entities: readonly ExistingConditionEntity[];
}

export interface ExistingConditionsModuleData {
  readonly existingConditionsDocument?: ExistingConditionsDocument;
}

export function createEmptyExistingConditionsDocument(): ExistingConditionsDocument {
  return {
    schemaVersion: EXISTING_CONDITIONS_SCHEMA_VERSION,
    entities: [],
  };
}

export function createExistingConditionsData(): ExistingConditionsModuleData {
  return { existingConditionsDocument: undefined };
}

export function isExistingConditionType(value: unknown): value is ExistingConditionType {
  return typeof value === "string" && [
    "road", "river", "railway", "existingBridge", "building", "seawall",
    "pond", "underground", "pipe", "tunnel", "utility", "other",
  ].includes(value);
}

export function validateExistingConditionsData(
  data: Record<string, unknown>,
): readonly { path: string; message: string }[] {
  const issues: { path: string; message: string }[] = [];
  const doc = (data as ExistingConditionsModuleData).existingConditionsDocument;
  if (doc === undefined) return [];
  if (doc === null || typeof doc !== "object" || Array.isArray(doc)) {
    issues.push({ path: "existingConditionsDocument", message: "must be an object" });
    return issues;
  }
  if (typeof doc.schemaVersion !== "string" || doc.schemaVersion.length === 0) {
    issues.push({ path: "existingConditionsDocument.schemaVersion", message: "schemaVersion required" });
  }
  if (!Array.isArray(doc.entities)) {
    issues.push({ path: "existingConditionsDocument.entities", message: "entities must be an array" });
    return issues;
  }
  for (const entity of doc.entities) {
    const e = entity as ExistingConditionEntity;
    if (typeof e.entityId !== "string" || e.entityId.length === 0) {
      issues.push({ path: "entity.entityId", message: "entityId required" });
    }
    if (!isExistingConditionType(e.type)) {
      issues.push({ path: `entity:${String(e.entityId)}.type`, message: "invalid type" });
    }
    if (typeof e.label !== "string") {
      issues.push({ path: `entity:${String(e.entityId)}.label`, message: "label required" });
    }
    if (!e.geometry || typeof e.geometry !== "object") {
      issues.push({ path: `entity:${String(e.entityId)}.geometry`, message: "geometry required" });
    } else if (e.geometry.points.length === 0) {
      issues.push({ path: `entity:${String(e.entityId)}.geometry.points`, message: "points required" });
    }
  }
  return issues;
}
