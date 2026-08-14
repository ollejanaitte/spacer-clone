/**
 * SubstructureDocument validation (Phase 6-01 A FROZEN).
 *
 * Layer: parser/validator return `readonly SubstructureIssue[]` (no throw).
 * Fail-closed rules:
 *  - schemaVersion mismatch -> reject
 *  - bridgeLayoutReference / superstructureReference required
 *  - supports >= 1, supportId unique, station finite, skew finite
 *  - shape required (pier XOR abutment) per support (VALIDATED gate)
 *  - footing/foundation/pile dimensions > 0
 *  - DRAFT persistence allows partial/MISSING; Gate validation requires full
 */

import {
  SUBSTRUCTURE_SCHEMA_VERSION,
  type SubstructureDocument,
  type SubstructureIssue,
  type SubstructureModuleData,
} from "./substructureTypes";

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function checkFinite(record: Record<string, unknown>, key: string, path: string, issues: SubstructureIssue[]): void {
  const value = record[key];
  if (!isFiniteNumber(value)) {
    issues.push({ path: `${path}.${key}`, message: `${key} must be a finite number` });
  }
}

function checkOptionalFinite(record: Record<string, unknown>, key: string, path: string, issues: SubstructureIssue[]): void {
  const value = record[key];
  if (value === null || value === undefined) return;
  if (!isFiniteNumber(value)) {
    issues.push({ path: `${path}.${key}`, message: `${key} must be a finite number` });
  }
}

/** Validate the full SubstructureDocument (fail-closed). */
export function validateSubstructureDocument(document: SubstructureDocument): readonly SubstructureIssue[] {
  const issues: SubstructureIssue[] = [];

  if (document.schemaVersion !== SUBSTRUCTURE_SCHEMA_VERSION) {
    issues.push({ path: "substructureDocument.schemaVersion", message: `schemaVersion must be ${SUBSTRUCTURE_SCHEMA_VERSION}` });
  }
  if (document.documentKind !== "substructure-design") {
    issues.push({ path: "substructureDocument.documentKind", message: "documentKind must be substructure-design" });
  }
  if (!document.documentId || document.documentId.trim().length === 0) {
    issues.push({ path: "substructureDocument.documentId", message: "documentId is required" });
  }
  if (!document.projectId || document.projectId.trim().length === 0) {
    issues.push({ path: "substructureDocument.projectId", message: "projectId is required" });
  }
  if (!Number.isInteger(document.revisionId) || document.revisionId < 1) {
    issues.push({ path: "substructureDocument.revisionId", message: "revisionId must be a positive integer" });
  }
  if (document.bridgeLayoutReference === null) {
    issues.push({ path: "substructureDocument.bridgeLayoutReference", message: "bridgeLayoutReference is required" });
  }
  if (document.superstructureReference === null) {
    issues.push({ path: "substructureDocument.superstructureReference", message: "superstructureReference is required" });
  }
  if (document.roadReference === null) {
    issues.push({ path: "substructureDocument.roadReference", message: "roadReference is required" });
  }

  // supports
  if (document.supports.length < 1) {
    issues.push({ path: "substructureDocument.supports", message: "at least one support is required" });
  }
  const seenSupportIds = new Set<string>();
  for (const support of document.supports) {
    if (seenSupportIds.has(support.supportId)) {
      issues.push({ path: `substructureDocument.supports[${support.supportId}]`, message: "duplicate supportId" });
    }
    seenSupportIds.add(support.supportId);
    checkFinite(support as unknown as Record<string, unknown>, "skewRad", `substructureDocument.supports[${support.supportId}]`, issues);
    // placement
    const placement = support.placement;
    if (placement.source === "liner") {
      if (!isFiniteNumber(placement.station)) {
        issues.push({ path: `substructureDocument.supports[${support.supportId}].placement.station`, message: "liner placement requires a finite station" });
      }
    } else if (placement.source === "direct_xyz") {
      if (!placement.position || !isFiniteNumber(placement.position.x) || !isFiniteNumber(placement.position.y) || !isFiniteNumber(placement.position.z)) {
        issues.push({ path: `substructureDocument.supports[${support.supportId}].placement.position`, message: "direct_xyz placement requires finite position" });
      }
    } else {
      issues.push({ path: `substructureDocument.supports[${support.supportId}].placement.source`, message: "unsupported placement source" });
    }
    // shape required (Gate validation): pier XOR abutment
    const hasPier = support.pier !== undefined;
    const hasAbutment = support.abutment !== undefined;
    if (!hasPier && !hasAbutment) {
      issues.push({ path: `substructureDocument.supports[${support.supportId}]`, message: "shape required (pier or abutment)" });
    }
    if (hasPier && hasAbutment) {
      issues.push({ path: `substructureDocument.supports[${support.supportId}]`, message: "support cannot be both pier and abutment" });
    }
  }

  // footing / foundation / pile dimensions
  for (const footing of document.footingConfigurations) {
    checkFinite(footing as unknown as Record<string, unknown>, "length", `substructureDocument.footingConfigurations[${footing.id}]`, issues);
    checkFinite(footing as unknown as Record<string, unknown>, "width", `substructureDocument.footingConfigurations[${footing.id}]`, issues);
    checkFinite(footing as unknown as Record<string, unknown>, "thickness", `substructureDocument.footingConfigurations[${footing.id}]`, issues);
    checkFinite(footing as unknown as Record<string, unknown>, "topElevation", `substructureDocument.footingConfigurations[${footing.id}]`, issues);
  }
  for (const pile of document.pileConfigurations) {
    checkFinite(pile as unknown as Record<string, unknown>, "diameter", `substructureDocument.pileConfigurations[${pile.id}]`, issues);
    checkFinite(pile as unknown as Record<string, unknown>, "length", `substructureDocument.pileConfigurations[${pile.id}]`, issues);
    if (!Number.isInteger(pile.pileCount) || pile.pileCount < 1) {
      issues.push({ path: `substructureDocument.pileConfigurations[${pile.id}].pileCount`, message: "pileCount must be >= 1" });
    }
    checkFinite(pile.spacing as unknown as Record<string, unknown>, "x", `substructureDocument.pileConfigurations[${pile.id}].spacing`, issues);
    checkFinite(pile.spacing as unknown as Record<string, unknown>, "y", `substructureDocument.pileConfigurations[${pile.id}].spacing`, issues);
    const rows = pile.rows;
    const cols = pile.cols;
    if (rows !== null && cols !== null) {
      if (!Number.isInteger(rows) || rows < 1 || !Number.isInteger(cols) || cols < 1) {
        issues.push({ path: `substructureDocument.pileConfigurations[${pile.id}].grid`, message: "rows/cols must be positive integers" });
      } else if (pile.pileCount !== rows * cols) {
        issues.push({ path: `substructureDocument.pileConfigurations[${pile.id}].pileCount`, message: `pileCount ${pile.pileCount} must equal rows*cols ${rows * cols}` });
      }
      if (pile.edgeX !== null) checkOptionalFinite(pile as unknown as Record<string, unknown>, "edgeX", `substructureDocument.pileConfigurations[${pile.id}]`, issues);
      if (pile.edgeY !== null) checkOptionalFinite(pile as unknown as Record<string, unknown>, "edgeY", `substructureDocument.pileConfigurations[${pile.id}]`, issues);
    }
  }

  // pileConfigurations[] duplicate id detection
  const seenPcIds = new Set<string>();
  for (const pc of document.pileConfigurations) {
    if (seenPcIds.has(pc.id)) {
      issues.push({ path: `substructureDocument.pileConfigurations[${pc.id}]`, message: "duplicate pileConfigurations id" });
    }
    seenPcIds.add(pc.id);
  }

  // nested support pileGroup ↔ normalized pileConfigurations consistency
  // (Sol review #3/#4): both must agree on all values when both are present.
  const pileConfigById = new Map(document.pileConfigurations.map((pc) => [pc.id, pc]));
  for (const support of document.supports) {
    const pg = support.pier?.pileGroup ?? support.abutment?.pileGroup ?? null;
    if (!pg) continue;
    const normalized = pileConfigById.get(pg.id);
    if (normalized) {
      const near = (a: number | null | undefined, b: number | null | undefined) =>
        (a ?? null) === null && (b ?? null) === null ? true
        : (a ?? null) === null || (b ?? null) === null ? false
        : Math.abs((a as number) - (b as number)) < 1e-9;
      if (!near(normalized.diameter, pg.diameter)) {
        issues.push({ path: `substructureDocument.supports[${support.supportId}].pier.pileGroup.diameter`, message: `nested pileGroup diameter ${pg.diameter} differs from pileConfigurations[${pg.id}].diameter ${normalized.diameter}` });
      }
      if (!near(normalized.length, pg.length)) {
        issues.push({ path: `substructureDocument.supports[${support.supportId}].pier.pileGroup.length`, message: `nested pileGroup length ${pg.length} differs from pileConfigurations[${pg.id}].length ${normalized.length}` });
      }
      if (normalized.pileType !== pg.pileType) {
        issues.push({ path: `substructureDocument.supports[${support.supportId}].pier.pileGroup.pileType`, message: `nested pileGroup pileType ${pg.pileType} differs from pileConfigurations[${pg.id}].pileType ${normalized.pileType}` });
      }
      if (!near(normalized.spacing.x, pg.spacing.x) || !near(normalized.spacing.y, pg.spacing.y)) {
        issues.push({ path: `substructureDocument.supports[${support.supportId}].pier.pileGroup.spacing`, message: `nested pileGroup spacing differs from pileConfigurations[${pg.id}].spacing` });
      }
      if (normalized.pileCount !== pg.pileCount) {
        issues.push({ path: `substructureDocument.supports[${support.supportId}].pier.pileGroup.pileCount`, message: `nested pileGroup pileCount ${pg.pileCount} differs from pileConfigurations[${pg.id}].pileCount ${normalized.pileCount}` });
      }
      const nRows = normalized.rows ?? null;
      const nCols = normalized.cols ?? null;
      const gRows = pg.rows ?? null;
      const gCols = pg.cols ?? null;
      // rows/cols: one-sided null is a MISMATCH (Sol review #4)
      if ((nRows === null) !== (gRows === null)) {
        issues.push({ path: `substructureDocument.supports[${support.supportId}].pier.pileGroup.grid`, message: `nested pileGroup rows ${gRows} differs from pileConfigurations[${pg.id}] ${nRows}` });
      } else if (nRows !== null && nRows !== gRows) {
        issues.push({ path: `substructureDocument.supports[${support.supportId}].pier.pileGroup.grid`, message: `nested pileGroup rows ${gRows} differs from pileConfigurations[${pg.id}] ${nRows}` });
      }
      if ((nCols === null) !== (gCols === null)) {
        issues.push({ path: `substructureDocument.supports[${support.supportId}].pier.pileGroup.grid`, message: `nested pileGroup cols ${gCols} differs from pileConfigurations[${pg.id}] ${nCols}` });
      } else if (nCols !== null && nCols !== gCols) {
        issues.push({ path: `substructureDocument.supports[${support.supportId}].pier.pileGroup.grid`, message: `nested pileGroup cols ${gCols} differs from pileConfigurations[${pg.id}] ${nCols}` });
      }
      if (!near(normalized.edgeX, pg.edgeX)) {
        issues.push({ path: `substructureDocument.supports[${support.supportId}].pier.pileGroup.edgeX`, message: `nested pileGroup edgeX ${pg.edgeX} differs from pileConfigurations[${pg.id}].edgeX ${normalized.edgeX}` });
      }
      if (!near(normalized.edgeY, pg.edgeY)) {
        issues.push({ path: `substructureDocument.supports[${support.supportId}].pier.pileGroup.edgeY`, message: `nested pileGroup edgeY ${pg.edgeY} differs from pileConfigurations[${pg.id}].edgeY ${normalized.edgeY}` });
      }
    } else {
      // nested pileGroup exists but no matching pileConfigurations entry
      issues.push({ path: `substructureDocument.supports[${support.supportId}].pier.pileGroup`, message: `nested pileGroup ${pg.id} has no matching pileConfigurations entry` });
    }
  }

  // derived transient: optional at validation layer (regenerated on restore)
  return issues;
}

/** Module-data level DRAFT validation (persistence write).
 * Partial/MISSING is allowed (shapes not yet configured); reference containers
 * and support placement must be valid. Gate validation (full shapes) is the
 * strict `validateSubstructureDocument`.
 */
export function validateSubstructureData(data: Record<string, unknown>): readonly SubstructureIssue[] {
  const raw = data.substructureDocument;
  if (raw === undefined || raw === null) {
    return [];
  }
  const doc = raw as SubstructureDocument;
  const issues: SubstructureIssue[] = [];
  if (doc.schemaVersion !== SUBSTRUCTURE_SCHEMA_VERSION) {
    issues.push({ path: "substructureDocument.schemaVersion", message: `schemaVersion must be ${SUBSTRUCTURE_SCHEMA_VERSION}` });
  }
  if (doc.documentKind !== "substructure-design") {
    issues.push({ path: "substructureDocument.documentKind", message: "documentKind must be substructure-design" });
  }
  if (!doc.documentId || doc.documentId.trim().length === 0) {
    issues.push({ path: "substructureDocument.documentId", message: "documentId is required" });
  }
  if (doc.bridgeLayoutReference === null) {
    issues.push({ path: "substructureDocument.bridgeLayoutReference", message: "bridgeLayoutReference is required" });
  }
  if (doc.superstructureReference === null) {
    issues.push({ path: "substructureDocument.superstructureReference", message: "superstructureReference is required" });
  }
  if (doc.roadReference === null) {
    issues.push({ path: "substructureDocument.roadReference", message: "roadReference is required" });
  }
  if (doc.supports.length < 1) {
    issues.push({ path: "substructureDocument.supports", message: "at least one support is required" });
  }
  const seen = new Set<string>();
  for (const support of doc.supports) {
    if (seen.has(support.supportId)) {
      issues.push({ path: `substructureDocument.supports[${support.supportId}]`, message: "duplicate supportId" });
    }
    seen.add(support.supportId);
    if (support.placement.source === "liner") {
      if (!isFiniteNumber(support.placement.station)) {
        issues.push({ path: `substructureDocument.supports[${support.supportId}].placement.station`, message: "liner placement requires a finite station" });
      }
    } else if (support.placement.source !== "direct_xyz") {
      issues.push({ path: `substructureDocument.supports[${support.supportId}].placement.source`, message: "unsupported placement source" });
    }
  }

  // pileConfigurations[] grid consistency + nested ↔ normalized agreement
  // (Sol review #3/#4): enforced at the DRAFT write boundary so inconsistent
  // pile data is never persisted.
  const seenPcWrite = new Set<string>();
  for (const pile of doc.pileConfigurations) {
    if (seenPcWrite.has(pile.id)) {
      issues.push({ path: `substructureDocument.pileConfigurations[${pile.id}]`, message: "duplicate pileConfigurations id" });
    }
    seenPcWrite.add(pile.id);
    if (!Number.isInteger(pile.pileCount) || pile.pileCount < 1) {
      issues.push({ path: `substructureDocument.pileConfigurations[${pile.id}].pileCount`, message: "pileCount must be >= 1" });
    }
    const rows = pile.rows;
    const cols = pile.cols;
    if (rows !== null || cols !== null) {
      if (rows === null || cols === null) {
        issues.push({ path: `substructureDocument.pileConfigurations[${pile.id}].grid`, message: "rows and cols must both be set or both be null" });
      } else {
        if (!Number.isInteger(rows) || rows < 1 || !Number.isInteger(cols) || cols < 1) {
          issues.push({ path: `substructureDocument.pileConfigurations[${pile.id}].grid`, message: "rows/cols must be positive integers" });
        } else if (pile.pileCount !== rows * cols) {
          issues.push({ path: `substructureDocument.pileConfigurations[${pile.id}].pileCount`, message: `pileCount ${pile.pileCount} must equal rows*cols ${rows * cols}` });
        }
      }
    }
  }
  const pileConfigById = new Map(doc.pileConfigurations.map((pc) => [pc.id, pc]));
  // full value-consistency between nested pileGroup and normalized
  // pileConfigurations[] (Sol review #3/#4): diameter / length / pileType /
  // spacing / pileCount / rows / cols / edgeX / edgeY must all agree.
  for (const support of doc.supports) {
    const pg = support.pier?.pileGroup ?? support.abutment?.pileGroup ?? null;
    if (!pg) continue;
    const normalized = pileConfigById.get(pg.id);
    if (!normalized) {
      issues.push({ path: `substructureDocument.supports[${support.supportId}].pier.pileGroup`, message: `nested pileGroup ${pg.id} has no matching pileConfigurations entry` });
      continue;
    }
    const near = (a: number | null | undefined, b: number | null | undefined) =>
      (a ?? null) === null && (b ?? null) === null ? true
      : (a ?? null) === null || (b ?? null) === null ? false
      : Math.abs((a as number) - (b as number)) < 1e-9;
    if (!near(normalized.diameter, pg.diameter)) {
      issues.push({ path: `substructureDocument.supports[${support.supportId}].pier.pileGroup.diameter`, message: `nested pileGroup diameter ${pg.diameter} differs from pileConfigurations[${pg.id}].diameter ${normalized.diameter}` });
    }
    if (!near(normalized.length, pg.length)) {
      issues.push({ path: `substructureDocument.supports[${support.supportId}].pier.pileGroup.length`, message: `nested pileGroup length ${pg.length} differs from pileConfigurations[${pg.id}].length ${normalized.length}` });
    }
    if (normalized.pileType !== pg.pileType) {
      issues.push({ path: `substructureDocument.supports[${support.supportId}].pier.pileGroup.pileType`, message: `nested pileGroup pileType ${pg.pileType} differs from pileConfigurations[${pg.id}].pileType ${normalized.pileType}` });
    }
    if (!near(normalized.spacing.x, pg.spacing.x) || !near(normalized.spacing.y, pg.spacing.y)) {
      issues.push({ path: `substructureDocument.supports[${support.supportId}].pier.pileGroup.spacing`, message: `nested pileGroup spacing differs from pileConfigurations[${pg.id}].spacing` });
    }
    if (normalized.pileCount !== pg.pileCount) {
      issues.push({ path: `substructureDocument.supports[${support.supportId}].pier.pileGroup.pileCount`, message: `nested pileGroup pileCount ${pg.pileCount} differs from pileConfigurations[${pg.id}].pileCount ${normalized.pileCount}` });
    }
    const nRows = normalized.rows ?? null;
    const nCols = normalized.cols ?? null;
    const gRows = pg.rows ?? null;
    const gCols = pg.cols ?? null;
    // rows/cols: one-sided null is a MISMATCH (Sol review #4)
    if ((nRows === null) !== (gRows === null)) {
      issues.push({ path: `substructureDocument.supports[${support.supportId}].pier.pileGroup.grid`, message: `nested pileGroup rows ${gRows} differs from pileConfigurations[${pg.id}] ${nRows}` });
    } else if (nRows !== null && nRows !== gRows) {
      issues.push({ path: `substructureDocument.supports[${support.supportId}].pier.pileGroup.grid`, message: `nested pileGroup rows ${gRows} differs from pileConfigurations[${pg.id}] ${nRows}` });
    }
    if ((nCols === null) !== (gCols === null)) {
      issues.push({ path: `substructureDocument.supports[${support.supportId}].pier.pileGroup.grid`, message: `nested pileGroup cols ${gCols} differs from pileConfigurations[${pg.id}] ${nCols}` });
    } else if (nCols !== null && nCols !== gCols) {
      issues.push({ path: `substructureDocument.supports[${support.supportId}].pier.pileGroup.grid`, message: `nested pileGroup cols ${gCols} differs from pileConfigurations[${pg.id}] ${nCols}` });
    }
    if (!near(normalized.edgeX, pg.edgeX)) {
      issues.push({ path: `substructureDocument.supports[${support.supportId}].pier.pileGroup.edgeX`, message: `nested pileGroup edgeX ${pg.edgeX} differs from pileConfigurations[${pg.id}].edgeX ${normalized.edgeX}` });
    }
    if (!near(normalized.edgeY, pg.edgeY)) {
      issues.push({ path: `substructureDocument.supports[${support.supportId}].pier.pileGroup.edgeY`, message: `nested pileGroup edgeY ${pg.edgeY} differs from pileConfigurations[${pg.id}].edgeY ${normalized.edgeY}` });
    }
  }

  return issues;
}

/** Parse a raw persisted value into a SubstructureDocument (fail-closed). */
export function parseSubstructureDocument(raw: unknown):
  | { ok: true; document: SubstructureDocument }
  | { ok: false; issues: readonly SubstructureIssue[] } {
  if (!raw || typeof raw !== "object") {
    return { ok: false, issues: [{ path: "substructureDocument", message: "not an object" }] };
  }
  const candidate = raw as SubstructureDocument;
  if (candidate.schemaVersion !== SUBSTRUCTURE_SCHEMA_VERSION) {
    return { ok: false, issues: [{ path: "substructureDocument.schemaVersion", message: `unsupported schemaVersion ${candidate.schemaVersion}` }] };
  }
  const issues = validateSubstructureDocument(candidate);
  if (issues.length > 0) {
    return { ok: false, issues };
  }
  return { ok: true, document: candidate };
}

export function isSubstructureData(value: unknown): value is SubstructureModuleData {
  if (!value || typeof value !== "object") return false;
  const record = value as Record<string, unknown>;
  return record.substructureDocument === undefined || typeof record.substructureDocument === "object";
}
