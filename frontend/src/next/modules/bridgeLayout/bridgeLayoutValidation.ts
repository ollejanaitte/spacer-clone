import type {
  BridgeLayoutDocument,
  BridgeLayoutIssue,
  BridgeLayoutValidationState,
  SkewSignConvention,
} from "./bridgeLayoutTypes";
import { BRIDGE_LAYOUT_SCHEMA_VERSION } from "./bridgeLayoutTypes";

export type { BridgeLayoutIssue } from "./bridgeLayoutTypes";

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function checkOptionalFiniteNumber(record: Record<string, unknown>, key: string, path: string, issues: BridgeLayoutIssue[]): void {
  const value = record[key];
  if (value === null || value === undefined) return;
  if (!isFiniteNumber(value)) {
    issues.push({ path: `${path}.${key}`, message: `${key} must be a finite number` });
  }
}

function checkString(record: Record<string, unknown>, key: string, path: string, issues: BridgeLayoutIssue[], required: boolean): void {
  const value = record[key];
  if (typeof value === "string") return;
  if (!required && (value === null || value === undefined)) return;
  issues.push({ path: `${path}.${key}`, message: `${key} must be a string` });
}

/**
 * Runtime validation of a BridgeLayoutDocument.
 * Phase 4-01 contract checks:
 *   - bridgeId required / schemaVersion valid
 *   - roadReference present
 *   - startStation < endStation
 *   - A1/A2 identification
 *   - pier id uniqueness / station order
 *   - span length > 0 / span consistency
 *   - NaN / Infinity rejection
 *   - skew angle finite
 */
export function validateBridgeLayoutDocument(document: BridgeLayoutDocument): readonly BridgeLayoutIssue[] {
  const issues: BridgeLayoutIssue[] = [];
  const path = "bridgeLayoutDocument";

  if (typeof document.bridgeId !== "string" || document.bridgeId.trim().length === 0) {
    issues.push({ path: `${path}.bridgeId`, message: "bridgeId is required" });
  }
  if (typeof document.name !== "string") {
    issues.push({ path: `${path}.name`, message: "name must be a string" });
  }
  if (document.schemaVersion !== BRIDGE_LAYOUT_SCHEMA_VERSION) {
    issues.push({ path: `${path}.schemaVersion`, message: `schemaVersion must be ${BRIDGE_LAYOUT_SCHEMA_VERSION}` });
  }

  const roadRef = document.roadReference;
  if (!roadRef || roadRef.moduleId !== "road") {
    issues.push({ path: `${path}.roadReference`, message: "roadReference (moduleId: road) is required" });
  } else {
    if (roadRef.alignmentId === null) {
      issues.push({ path: `${path}.roadReference.alignmentId`, message: "roadReference.alignmentId is required (road reference must not be empty)" });
    }
  }

  const range = document.bridgeRange;
  if (!range) {
    issues.push({ path: `${path}.bridgeRange`, message: "bridgeRange is required" });
  } else {
    if (!isFiniteNumber(range.startStation) || !isFiniteNumber(range.endStation)) {
      issues.push({ path: `${path}.bridgeRange`, message: "bridgeRange stations must be finite numbers" });
    } else if (range.startStation >= range.endStation) {
      issues.push({ path: `${path}.bridgeRange`, message: "startStation must be less than endStation" });
    }
    if (range.bridgeLength !== undefined && range.bridgeLength !== null) {
      if (!isFiniteNumber(range.bridgeLength)) {
        issues.push({ path: `${path}.bridgeRange.bridgeLength`, message: "bridgeLength must be a finite number when present" });
      } else if (isFiniteNumber(range.startStation) && isFiniteNumber(range.endStation)
        && Math.abs(range.bridgeLength - (range.endStation - range.startStation)) > 1e-6) {
        issues.push({ path: `${path}.bridgeRange.bridgeLength`, message: "bridgeLength must equal endStation - startStation" });
      }
    }
  }

  const abutments = document.abutments;
  if (!abutments || typeof abutments !== "object") {
    issues.push({ path: `${path}.abutments`, message: "abutments (A1/A2) are required" });
  } else {
    for (const role of ["A1", "A2"] as const) {
      const abutment = abutments[role];
      if (!abutment || typeof abutment !== "object") {
        issues.push({ path: `${path}.abutments.${role}`, message: `${role} is required` });
        continue;
      }
      if (abutment.supportId !== role) {
        issues.push({ path: `${path}.abutments.${role}.supportId`, message: `${role}.supportId must identify ${role}` });
      }
      if (!isFiniteNumber(abutment.station)) {
        issues.push({ path: `${path}.abutments.${role}.station`, message: `${role}.station must be a finite number` });
      }
      if (abutment.skewAngleRad !== null && !isFiniteNumber(abutment.skewAngleRad)) {
        issues.push({ path: `${path}.abutments.${role}.skewAngleRad`, message: `${role}.skewAngleRad must be finite or null` });
      }
      const placement = abutment.placement;
      if (placement !== undefined && placement !== null) {
        if (typeof placement !== "object") {
          issues.push({ path: `${path}.abutments.${role}.placement`, message: `${role}.placement must be an object when present` });
        } else {
          for (const key of ["domainX", "domainY", "elevation", "tangentAzimuthRad"] as const) {
            if (!isFiniteNumber(placement[key])) {
              issues.push({ path: `${path}.abutments.${role}.placement.${key}`, message: `${role}.placement.${key} must be a finite number` });
            }
          }
          if (placement.terrainElevation !== null && !isFiniteNumber(placement.terrainElevation)) {
            issues.push({ path: `${path}.abutments.${role}.placement.terrainElevation`, message: `${role}.placement.terrainElevation must be finite or null` });
          }
          if (typeof placement.roadReferenceId !== "string" || placement.roadReferenceId.length === 0) {
            issues.push({ path: `${path}.abutments.${role}.placement.roadReferenceId`, message: `${role}.placement.roadReferenceId is required` });
          }
          if (placement.coordinateContextId !== null && placement.coordinateContextId !== undefined && typeof placement.coordinateContextId !== "string") {
            issues.push({ path: `${path}.abutments.${role}.placement.coordinateContextId`, message: `${role}.placement.coordinateContextId must be a string or null` });
          }
          if (typeof placement.capturedAt !== "string" || placement.capturedAt.length === 0) {
            issues.push({ path: `${path}.abutments.${role}.placement.capturedAt`, message: `${role}.placement.capturedAt is required` });
          }
        }
      }
    }
  }

  const piers = document.piers;
  if (!Array.isArray(piers)) {
    issues.push({ path: `${path}.piers`, message: "piers must be an array" });
  } else {
    const seen = new Set<string>();
    piers.forEach((pier, i) => {
      const p = pier as Record<string, unknown>;
      if (!pier || typeof pier !== "object") {
        issues.push({ path: `${path}.piers[${i}]`, message: "pier entry must be an object" });
        return;
      }
      if (typeof pier.supportId !== "string" || pier.supportId.length === 0) {
        issues.push({ path: `${path}.piers[${i}].supportId`, message: "pier supportId is required" });
      } else if (seen.has(pier.supportId)) {
        issues.push({ path: `${path}.piers[${i}].supportId`, message: `duplicate pier supportId: ${pier.supportId}` });
      } else {
        seen.add(pier.supportId);
      }
      if (pier.label !== undefined && typeof pier.label !== "string") {
        issues.push({ path: `${path}.piers[${i}].label`, message: "pier label must be a string when present" });
      }
      if (!isFiniteNumber(pier.station)) {
        issues.push({ path: `${path}.piers[${i}].station`, message: "pier station must be a finite number" });
      }
      if (pier.skewAngleRad !== null && !isFiniteNumber(pier.skewAngleRad)) {
        issues.push({ path: `${path}.piers[${i}].skewAngleRad`, message: "pier skewAngleRad must be finite or null" });
      }
      if (pier.skewSource !== undefined && pier.skewSource !== "automatic" && pier.skewSource !== "user") {
        issues.push({ path: `${path}.piers[${i}].skewSource`, message: "pier skewSource must be automatic or user" });
      }
      if (pier.metadata !== undefined && (pier.metadata === null || typeof pier.metadata !== "object" || Array.isArray(pier.metadata))) {
        issues.push({ path: `${path}.piers[${i}].metadata`, message: "pier metadata must be an object when present" });
      }
      const pierPlacement = pier.placement;
      if (pierPlacement !== undefined && pierPlacement !== null) {
        if (typeof pierPlacement !== "object") {
          issues.push({ path: `${path}.piers[${i}].placement`, message: "pier placement must be an object when present" });
        } else {
          for (const key of ["domainX", "domainY", "elevation", "tangentAzimuthRad"] as const) {
            if (!isFiniteNumber(pierPlacement[key])) {
              issues.push({ path: `${path}.piers[${i}].placement.${key}`, message: `pier placement.${key} must be a finite number` });
            }
          }
          if (pierPlacement.terrainElevation !== null && !isFiniteNumber(pierPlacement.terrainElevation)) {
            issues.push({ path: `${path}.piers[${i}].placement.terrainElevation`, message: "pier placement.terrainElevation must be finite or null" });
          }
          if (typeof pierPlacement.roadReferenceId !== "string" || pierPlacement.roadReferenceId.length === 0) {
            issues.push({ path: `${path}.piers[${i}].placement.roadReferenceId`, message: "pier placement.roadReferenceId is required" });
          }
          if (typeof pierPlacement.capturedAt !== "string" || pierPlacement.capturedAt.length === 0) {
            issues.push({ path: `${path}.piers[${i}].placement.capturedAt`, message: "pier placement.capturedAt is required" });
          }
        }
      }
      void p;
    });
  }

  // pier station must be strictly inside the A1..A2 bridge range
  const a1StationDoc = abutments?.A1?.station;
  const a2StationDoc = abutments?.A2?.station;
  if (Array.isArray(piers) && isFiniteNumber(a1StationDoc) && isFiniteNumber(a2StationDoc)) {
    piers.forEach((pier, i) => {
      if (!pier || typeof pier !== "object") return;
      const station = (pier as { station?: unknown }).station;
      if (!isFiniteNumber(station)) return;
      if (station <= a1StationDoc || station >= a2StationDoc) {
        issues.push({
          path: `${path}.piers[${i}].station`,
          message: `pier station ${station} is outside the bridge range (A1=${a1StationDoc}, A2=${a2StationDoc})`,
        });
      }
    });
  }

  // station ordering across A1, piers, A2
  const supports: { id: string; station: number }[] = [];
  const a1Station = abutments?.A1?.station;
  const a2Station = abutments?.A2?.station;
  if (isFiniteNumber(a1Station)) supports.push({ id: "A1", station: a1Station });
  if (Array.isArray(piers)) {
    for (const pier of piers) {
      if (pier && isFiniteNumber(pier.station)) supports.push({ id: pier.supportId, station: pier.station });
    }
  }
  if (isFiniteNumber(a2Station)) supports.push({ id: "A2", station: a2Station });
  for (let i = 1; i < supports.length; i += 1) {
    if (supports[i].station <= supports[i - 1].station) {
      issues.push({
        path: `${path}.piers`,
        message: `station order violation: ${supports[i - 1].id}@${supports[i - 1].station} >= ${supports[i].id}@${supports[i].station}`,
      });
    }
  }

  // spans
  const spans = document.spans;
  if (!Array.isArray(spans)) {
    issues.push({ path: `${path}.spans`, message: "spans must be an array" });
  } else {
    const supportIds = new Set(supports.map((s) => s.id));
    spans.forEach((span, i) => {
      if (!span || typeof span !== "object") {
        issues.push({ path: `${path}.spans[${i}]`, message: "span entry must be an object" });
        return;
      }
      if (!isFiniteNumber(span.length) || span.length <= 0) {
        issues.push({ path: `${path}.spans[${i}].length`, message: "span length must be greater than 0" });
      }
      if (!isFiniteNumber(span.startStation) || !isFiniteNumber(span.endStation)) {
        issues.push({ path: `${path}.spans[${i}]`, message: "span stations must be finite numbers" });
      } else if (span.startStation >= span.endStation) {
        issues.push({ path: `${path}.spans[${i}]`, message: "span startStation must be less than endStation" });
      }
      if (typeof span.startSupportId !== "string" || typeof span.endSupportId !== "string") {
        issues.push({ path: `${path}.spans[${i}]`, message: "span support references are required" });
      } else {
        if (!supportIds.has(span.startSupportId)) {
          issues.push({ path: `${path}.spans[${i}].startSupportId`, message: `broken span reference: ${span.startSupportId}` });
        }
        if (!supportIds.has(span.endSupportId)) {
          issues.push({ path: `${path}.spans[${i}].endSupportId`, message: `broken span reference: ${span.endSupportId}` });
        }
      }
    });
  }

  // skew
  const skew = document.skew;
  if (!skew || typeof skew !== "object") {
    issues.push({ path: `${path}.skew`, message: "skew is required" });
  } else if (!isSkewSignConvention(skew.signConvention)) {
    issues.push({ path: `${path}.skew.signConvention`, message: "skew.signConvention must be counterclockwise-positive or clockwise-positive" });
  } else if (skew.angleRad !== null && !isFiniteNumber(skew.angleRad)) {
    issues.push({ path: `${path}.skew.angleRad`, message: "skew.angleRad must be finite or null" });
  }

  // references
  const terrainRef = document.terrainReference;
  if (!terrainRef || terrainRef.moduleId !== "terrain") {
    issues.push({ path: `${path}.terrainReference`, message: "terrainReference (moduleId: terrain) is required" });
  }
  const existingRef = document.existingConditionsReference;
  if (!existingRef || existingRef.moduleId !== "terrain") {
    issues.push({ path: `${path}.existingConditionsReference`, message: "existingConditionsReference (moduleId: terrain) is required" });
  }

  return issues;
}

function isSkewSignConvention(value: unknown): value is SkewSignConvention {
  return value === "counterclockwise-positive" || value === "clockwise-positive";
}

/** Structural-typed document validator used by the module record validation. */
export function validateBridgeLayoutData(data: Record<string, unknown>): readonly BridgeLayoutIssue[] {
  const doc = (data as { bridgeLayoutDocument?: unknown }).bridgeLayoutDocument;
  if (doc === undefined) return [];
  if (doc === null || typeof doc !== "object" || Array.isArray(doc)) {
    return [{ path: "bridgeLayoutDocument", message: "bridgeLayoutDocument must be an object" }];
  }
  return validateBridgeLayoutDocument(doc as BridgeLayoutDocument);
}

/**
 * Fail-closed parser: unknown input -> BridgeLayoutDocument.
 * Rejects NaN/Infinity, wrong types, missing sections. Never returns a
 * partially trusted document on structural errors.
 */
export function parseBridgeLayoutDocument(raw: unknown): { ok: true; document: BridgeLayoutDocument } | { ok: false; issues: readonly BridgeLayoutIssue[] } {
  if (raw === null || typeof raw !== "object" || Array.isArray(raw)) {
    return { ok: false, issues: [{ path: "(bridgeLayoutDocument)", message: "must be an object" }] };
  }
  const record = raw as Record<string, unknown>;

  if (typeof record.bridgeId !== "string" || typeof record.schemaVersion !== "string") {
    return { ok: false, issues: [{ path: "(bridgeLayoutDocument)", message: "bridgeId/schemaVersion must be strings" }] };
  }

  const metadata = record.metadata && typeof record.metadata === "object"
    ? record.metadata as Record<string, unknown> : {};
  const roadReference = record.roadReference && typeof record.roadReference === "object"
    ? record.roadReference as Record<string, unknown> : {};
  const range = record.bridgeRange && typeof record.bridgeRange === "object"
    ? record.bridgeRange as Record<string, unknown> : {};
  const abutments = record.abutments && typeof record.abutments === "object"
    ? record.abutments as Record<string, unknown> : {};
  const piers = Array.isArray(record.piers) ? record.piers : [];
  const spans = Array.isArray(record.spans) ? record.spans : [];
  const skew = record.skew && typeof record.skew === "object" ? record.skew as Record<string, unknown> : {};
  const terrainReference = record.terrainReference && typeof record.terrainReference === "object"
    ? record.terrainReference as Record<string, unknown> : {};
  const existingReference = record.existingConditionsReference && typeof record.existingConditionsReference === "object"
    ? record.existingConditionsReference as Record<string, unknown> : {};

  const document: BridgeLayoutDocument = {
    bridgeId: record.bridgeId,
    name: typeof record.name === "string" ? record.name : "",
    schemaVersion: record.schemaVersion,
    metadata: {
      createdBy: typeof metadata.createdBy === "string" ? metadata.createdBy : undefined,
      createdAt: typeof metadata.createdAt === "string" || metadata.createdAt === null ? metadata.createdAt ?? null : null,
      updatedAt: typeof metadata.updatedAt === "string" || metadata.updatedAt === null ? metadata.updatedAt ?? null : null,
      note: typeof metadata.note === "string" ? metadata.note : undefined,
    },
    roadReference: {
      moduleId: "road",
      alignmentId: typeof roadReference.alignmentId === "string" ? roadReference.alignmentId : null,
      stationReferenceId: typeof roadReference.stationReferenceId === "string" ? roadReference.stationReferenceId : null,
      coordinatePolicyId: typeof roadReference.coordinatePolicyId === "string" ? roadReference.coordinatePolicyId : null,
    },
    bridgeRange: {
      startStation: parseStation(range.startStation),
      endStation: parseStation(range.endStation),
      bridgeLength: parseOptionalNumber(range.bridgeLength),
    },
    abutments: {
      A1: parseAbutment(abutments.A1, "A1"),
      A2: parseAbutment(abutments.A2, "A2"),
    },
    piers: piers.map((p, i) => parsePier(p, i)),
    spans: spans.map((s, i) => parseSpan(s, i)),
    skew: {
      signConvention: (skew.signConvention === "clockwise-positive" ? "clockwise-positive" : "counterclockwise-positive"),
      angleRad: parseNullableNumber(skew.angleRad),
    },
    terrainReference: {
      moduleId: "terrain",
      surfaceReference: typeof terrainReference.surfaceReference === "string" ? terrainReference.surfaceReference : null,
      coordinateContextId: typeof terrainReference.coordinateContextId === "string" ? terrainReference.coordinateContextId : null,
    },
    existingConditionsReference: {
      moduleId: "terrain",
      documentReferenceId: typeof existingReference.documentReferenceId === "string" ? existingReference.documentReferenceId : null,
    },
    validation: {
      schemaVersion: BRIDGE_LAYOUT_SCHEMA_VERSION,
      validatedAt: null,
      ok: false,
      issues: [],
    },
  };

  const issues = validateBridgeLayoutDocument(document);
  if (issues.length > 0) {
    return { ok: false, issues };
  }
  return { ok: true, document };
}

function parseStation(value: unknown): number {
  return isFiniteNumber(value) ? value : Number.NaN;
}

function parseOptionalNumber(value: unknown): number | undefined {
  if (value === undefined) return undefined;
  return isFiniteNumber(value) ? value : Number.NaN;
}

function parseNullableNumber(value: unknown): number | null {
  if (value === null || value === undefined) return null;
  return isFiniteNumber(value) ? value : Number.NaN;
}

function parseAbutment(value: unknown, role: string): BridgeLayoutDocument["abutments"]["A1"] {
  if (!value || typeof value !== "object") {
    return { supportId: role, station: Number.NaN, skewAngleRad: Number.NaN };
  }
  const record = value as Record<string, unknown>;
  const placementRaw = record.placement;
  const placement = placementRaw && typeof placementRaw === "object"
    ? parsePlacement(placementRaw as Record<string, unknown>)
    : undefined;
  return {
    supportId: typeof record.supportId === "string" ? record.supportId : role,
    station: parseStation(record.station),
    skewAngleRad: parseNullableNumber(record.skewAngleRad),
    placement,
  };
}

function parsePlacement(record: Record<string, unknown>): BridgeLayoutDocument["abutments"]["A1"]["placement"] {
  return {
    domainX: parseStation(record.domainX),
    domainY: parseStation(record.domainY),
    elevation: parseStation(record.elevation),
    tangentAzimuthRad: parseStation(record.tangentAzimuthRad),
    terrainElevation: record.terrainElevation === null ? null : parseNullableNumber(record.terrainElevation),
    roadReferenceId: typeof record.roadReferenceId === "string" ? record.roadReferenceId : "",
    coordinateContextId: typeof record.coordinateContextId === "string" ? record.coordinateContextId : null,
    capturedAt: typeof record.capturedAt === "string" ? record.capturedAt : "",
  };
}

function parsePier(value: unknown, index: number): BridgeLayoutDocument["piers"][number] {
  if (!value || typeof value !== "object") {
    return { supportId: `P${index + 1}`, station: Number.NaN, skewAngleRad: Number.NaN };
  }
  const record = value as Record<string, unknown>;
  const placementRaw = record.placement;
  const placement = placementRaw && typeof placementRaw === "object"
    ? parsePlacement(placementRaw as Record<string, unknown>)
    : undefined;
  return {
    supportId: typeof record.supportId === "string" ? record.supportId : `P${index + 1}`,
    label: typeof record.label === "string" ? record.label : undefined,
    station: parseStation(record.station),
    skewAngleRad: parseNullableNumber(record.skewAngleRad),
    skewSource: record.skewSource === "automatic" || record.skewSource === "user" ? record.skewSource : undefined,
    placement,
    metadata: record.metadata && typeof record.metadata === "object" && !Array.isArray(record.metadata)
      ? (record.metadata as Record<string, unknown>)
      : undefined,
  };
}

function parseSpan(value: unknown, index: number): BridgeLayoutDocument["spans"][number] {
  if (!value || typeof value !== "object") {
    return { spanId: `S${index + 1}`, index: index + 1, startSupportId: "", endSupportId: "", startStation: Number.NaN, endStation: Number.NaN, length: Number.NaN };
  }
  const record = value as Record<string, unknown>;
  const startStation = parseStation(record.startStation);
  const endStation = parseStation(record.endStation);
  const length = isFiniteNumber(record.length)
    ? record.length
    : (isFiniteNumber(startStation) && isFiniteNumber(endStation) ? endStation - startStation : Number.NaN);
  return {
    spanId: typeof record.spanId === "string" ? record.spanId : `S${index + 1}`,
    index: isFiniteNumber(record.index) ? record.index : index + 1,
    startSupportId: typeof record.startSupportId === "string" ? record.startSupportId : "",
    endSupportId: typeof record.endSupportId === "string" ? record.endSupportId : "",
    startStation,
    endStation,
    length,
  };
}

/** Create a fresh validation state. */
export function createValidationState(ok: boolean, issues: readonly BridgeLayoutIssue[], now: string): BridgeLayoutValidationState {
  return {
    schemaVersion: BRIDGE_LAYOUT_SCHEMA_VERSION,
    validatedAt: now,
    ok,
    issues,
  };
}
