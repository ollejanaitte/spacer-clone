/**
 * SuperstructureDocument validation (Phase 5-01 A-01 §5 FROZEN).
 *
 * Layer: parser/validator return `readonly SuperstructureIssue[]` (no throw).
 * Fail-closed rules:
 *  - schemaVersion mismatch -> reject
 *  - bridgeLayoutReference missing -> invalid
 *  - girderCount>=1 / offsets finite / unique girderId / spacing>0
 *  - deck thickness>0 / overhang>=0 / resolvedWidth>0 when present
 *  - structuralSystem vs spanReferences span count consistency
 *  - bearing relation unique / dangling reject
 *  - composite action forbidden (rc_non_composite fixed)
 *  - NOT_AUTHORIZED auto-promotion forbidden (state rule, enforced by writers)
 */

import {
  SUPERSTRUCTURE_SCHEMA_VERSION,
  SUPERSTRUCTURE_TYPE_PLATE_GIRDER_RC_SLAB_NON_COMPOSITE,
  type SuperstructureDocument,
  type SuperstructureIssue,
  type SuperstructureModuleData,
} from "./superstructureTypes";

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function checkFinite(record: Record<string, unknown>, key: string, path: string, issues: SuperstructureIssue[]): void {
  const value = record[key];
  if (!isFiniteNumber(value)) {
    issues.push({ path: `${path}.${key}`, message: `${key} must be a finite number` });
  }
}

function checkOptionalFinite(record: Record<string, unknown>, key: string, path: string, issues: SuperstructureIssue[]): void {
  const value = record[key];
  if (value === null || value === undefined) return;
  if (!isFiniteNumber(value)) {
    issues.push({ path: `${path}.${key}`, message: `${key} must be a finite number` });
  }
}

/** Validate the full SuperstructureDocument (fail-closed). */
export function validateSuperstructureDocument(document: SuperstructureDocument): readonly SuperstructureIssue[] {
  const issues: SuperstructureIssue[] = [];

  if (document.schemaVersion !== SUPERSTRUCTURE_SCHEMA_VERSION) {
    issues.push({
      path: "superstructureDocument.schemaVersion",
      message: `schemaVersion must be ${SUPERSTRUCTURE_SCHEMA_VERSION} (got ${document.schemaVersion})`,
    });
  }
  if (document.documentKind !== "superstructure-design") {
    issues.push({ path: "superstructureDocument.documentKind", message: "documentKind must be superstructure-design" });
  }
  if (!document.documentId || document.documentId.trim().length === 0) {
    issues.push({ path: "superstructureDocument.documentId", message: "documentId is required" });
  }
  if (!document.projectId || document.projectId.trim().length === 0) {
    issues.push({ path: "superstructureDocument.projectId", message: "projectId is required" });
  }
  if (!Number.isInteger(document.revisionId) || document.revisionId < 1) {
    issues.push({ path: "superstructureDocument.revisionId", message: "revisionId must be a positive integer" });
  }
  if (document.bridgeLayoutReference === null) {
    issues.push({ path: "superstructureDocument.bridgeLayoutReference", message: "bridgeLayoutReference is required (Bridge Layout must be set)" });
  } else {
    if (!document.bridgeLayoutReference.bridgeId || document.bridgeLayoutReference.bridgeId.trim().length === 0) {
      issues.push({ path: "superstructureDocument.bridgeLayoutReference.bridgeId", message: "bridgeId is required" });
    }
    if (!document.bridgeLayoutReference.layoutFingerprint) {
      issues.push({ path: "superstructureDocument.bridgeLayoutReference.layoutFingerprint", message: "layoutFingerprint is required" });
    }
  }
  if (document.roadReference === null) {
    issues.push({ path: "superstructureDocument.roadReference", message: "roadReference is required" });
  }

  if (document.superstructureType !== SUPERSTRUCTURE_TYPE_PLATE_GIRDER_RC_SLAB_NON_COMPOSITE) {
    issues.push({
      path: "superstructureDocument.superstructureType",
      message: `unsupported superstructureType ${document.superstructureType}`,
    });
  }

  // structuralSystem consistency with spanReferences (when derived data present)
  const spanCount = document.spanReferences?.spans.length ?? 0;
  if (spanCount > 0) {
    const expectedSystem = spanCount >= 2 ? "CONTINUOUS" : "SIMPLE_SINGLE";
    if (document.structuralSystem.bridgeSystem !== expectedSystem) {
      issues.push({
        path: "superstructureDocument.structuralSystem.bridgeSystem",
        message: `bridgeSystem ${document.structuralSystem.bridgeSystem} is inconsistent with ${spanCount} spans (expected ${expectedSystem})`,
      });
    }
    if (document.structuralSystem.spanSystem === "simple" && spanCount > 1) {
      issues.push({
        path: "superstructureDocument.structuralSystem.spanSystem",
        message: `spanSystem simple is inconsistent with ${spanCount} spans`,
      });
    }
  }

  // girderConfiguration
  const gcfg = document.girderConfiguration;
  if (!Number.isInteger(gcfg.girderCount) || gcfg.girderCount < 1) {
    issues.push({ path: "superstructureDocument.girderConfiguration.girderCount", message: "girderCount must be >= 1" });
  }
  if (gcfg.girderSpacingM !== null && !(isFiniteNumber(gcfg.girderSpacingM) && gcfg.girderSpacingM > 0)) {
    issues.push({ path: "superstructureDocument.girderConfiguration.girderSpacingM", message: "girderSpacingM must be > 0 when present" });
  }
  const seenGirderIds = new Set<string>();
  const seenOffsets = new Set<number>();
  for (const line of gcfg.girderLines) {
    checkFinite(line as unknown as Record<string, unknown>, "offsetFromCenterline", "superstructureDocument.girderConfiguration.girderLines", issues);
    if (line.offsetEndFromCenterline !== null) {
      checkFinite(line as unknown as Record<string, unknown>, "offsetEndFromCenterline", "superstructureDocument.girderConfiguration.girderLines", issues);
    }
    if (seenGirderIds.has(line.girderId)) {
      issues.push({ path: `superstructureDocument.girderConfiguration.girderLines[${line.girderId}]`, message: "duplicate girderId" });
    }
    seenGirderIds.add(line.girderId);
    if (isFiniteNumber(line.offsetFromCenterline)) {
      if (seenOffsets.has(line.offsetFromCenterline)) {
        issues.push({ path: `superstructureDocument.girderConfiguration.girderLines[${line.girderId}]`, message: "duplicate girder offset (zero spacing is rejected)" });
      }
      seenOffsets.add(line.offsetFromCenterline);
    }
  }
  if (gcfg.girderLines.length !== gcfg.girderCount) {
    issues.push({
      path: "superstructureDocument.girderConfiguration.girderLines",
      message: `girderLines count ${gcfg.girderLines.length} != girderCount ${gcfg.girderCount}`,
    });
  }

  // girderSectionModel: declared values must be finite
  const section = gcfg.girderSectionModel;
  checkOptionalFinite(section as unknown as Record<string, unknown>, "depthM", "superstructureDocument.girderConfiguration.girderSectionModel", issues);
  checkOptionalFinite(section as unknown as Record<string, unknown>, "webThicknessM", "superstructureDocument.girderConfiguration.girderSectionModel", issues);
  checkOptionalFinite(section as unknown as Record<string, unknown>, "areaM2", "superstructureDocument.girderConfiguration.girderSectionModel", issues);
  checkOptionalFinite(section as unknown as Record<string, unknown>, "unitWeightPerM", "superstructureDocument.girderConfiguration.girderSectionModel", issues);
  if (section.topFlange !== null) {
    checkOptionalFinite(section.topFlange as unknown as Record<string, unknown>, "widthM", "superstructureDocument.girderConfiguration.girderSectionModel.topFlange", issues);
    checkOptionalFinite(section.topFlange as unknown as Record<string, unknown>, "thicknessM", "superstructureDocument.girderConfiguration.girderSectionModel.topFlange", issues);
  }
  if (section.bottomFlange !== null) {
    checkOptionalFinite(section.bottomFlange as unknown as Record<string, unknown>, "widthM", "superstructureDocument.girderConfiguration.girderSectionModel.bottomFlange", issues);
    checkOptionalFinite(section.bottomFlange as unknown as Record<string, unknown>, "thicknessM", "superstructureDocument.girderConfiguration.girderSectionModel.bottomFlange", issues);
  }

  // materialConfiguration (Phase 7-01C §3.1): declared values must be finite
  // and consistent (E/G/nu). Unset (null/undefined) uses the frozen default steel.
  const mat = document.materialConfiguration;
  if (mat != null) {
    checkOptionalFinite(mat as unknown as Record<string, unknown>, "elasticModulusKN_M2", "superstructureDocument.materialConfiguration", issues);
    checkOptionalFinite(mat as unknown as Record<string, unknown>, "shearModulusKN_M2", "superstructureDocument.materialConfiguration", issues);
    checkOptionalFinite(mat as unknown as Record<string, unknown>, "poissonRatio", "superstructureDocument.materialConfiguration", issues);
    checkOptionalFinite(mat as unknown as Record<string, unknown>, "densityKN_M3", "superstructureDocument.materialConfiguration", issues);
    if (mat.elasticModulusKN_M2 !== null && !(mat.elasticModulusKN_M2 > 0)) {
      issues.push({ path: "superstructureDocument.materialConfiguration.elasticModulusKN_M2", message: "elasticModulusKN_M2 must be > 0 when present" });
    }
    if (mat.shearModulusKN_M2 !== null && !(mat.shearModulusKN_M2 > 0)) {
      issues.push({ path: "superstructureDocument.materialConfiguration.shearModulusKN_M2", message: "shearModulusKN_M2 must be > 0 when present" });
    }
    if (mat.poissonRatio !== null && !(Math.abs(mat.poissonRatio) < 0.5)) {
      issues.push({ path: "superstructureDocument.materialConfiguration.poissonRatio", message: "poissonRatio must satisfy |nu| < 0.5" });
    }
    if (mat.densityKN_M3 !== null && !(mat.densityKN_M3 > 0)) {
      issues.push({ path: "superstructureDocument.materialConfiguration.densityKN_M3", message: "densityKN_M3 must be > 0 when present" });
    }
  }

  // deckConfiguration
  const dcfg = document.deckConfiguration;
  if (dcfg.deckKind !== "rc_non_composite") {
    issues.push({ path: "superstructureDocument.deckConfiguration.deckKind", message: "composite action forbidden (deckKind must be rc_non_composite)" });
  }
  if (dcfg.thicknessM !== null && !(isFiniteNumber(dcfg.thicknessM) && dcfg.thicknessM > 0)) {
    issues.push({ path: "superstructureDocument.deckConfiguration.thicknessM", message: "thicknessM must be > 0 when present" });
  }
  if (dcfg.unitWeight !== null && !(isFiniteNumber(dcfg.unitWeight) && dcfg.unitWeight > 0)) {
    issues.push({ path: "superstructureDocument.deckConfiguration.unitWeight", message: "unitWeight must be > 0 when present" });
  }
  if (dcfg.overhangLeftM !== null && !(isFiniteNumber(dcfg.overhangLeftM) && dcfg.overhangLeftM >= 0)) {
    issues.push({ path: "superstructureDocument.deckConfiguration.overhangLeftM", message: "overhangLeftM must be >= 0 when present" });
  }
  if (dcfg.overhangRightM !== null && !(isFiniteNumber(dcfg.overhangRightM) && dcfg.overhangRightM >= 0)) {
    issues.push({ path: "superstructureDocument.deckConfiguration.overhangRightM", message: "overhangRightM must be >= 0 when present" });
  }
  if (dcfg.resolvedWidthM !== null && !(isFiniteNumber(dcfg.resolvedWidthM) && dcfg.resolvedWidthM > 0)) {
    issues.push({ path: "superstructureDocument.deckConfiguration.resolvedWidthM", message: "resolvedWidthM must be > 0 when present" });
  }

  // crossBeamConfiguration
  if (document.crossBeamConfiguration != null) {
    const cb = document.crossBeamConfiguration;
    if (!(isFiniteNumber(cb.crossBeamSpacingM) && cb.crossBeamSpacingM > 0)) {
      issues.push({ path: "superstructureDocument.crossBeamConfiguration.crossBeamSpacingM", message: "crossBeamSpacingM must be > 0" });
    }
    const seenXb = new Set<string>();
    const seenStations = new Set<number>();
    for (const beam of cb.crossBeams) {
      if (seenXb.has(beam.crossBeamId)) {
        issues.push({ path: `superstructureDocument.crossBeamConfiguration.crossBeams[${beam.crossBeamId}]`, message: "duplicate crossBeamId" });
      }
      seenXb.add(beam.crossBeamId);
      if (!isFiniteNumber(beam.stationM)) {
        issues.push({ path: `superstructureDocument.crossBeamConfiguration.crossBeams[${beam.crossBeamId}]`, message: "stationM must be finite" });
      } else if (seenStations.has(beam.stationM)) {
        issues.push({ path: `superstructureDocument.crossBeamConfiguration.crossBeams[${beam.crossBeamId}]`, message: "duplicate cross beam station" });
      }
      seenStations.add(beam.stationM);
    }
  }

  // crossFrameConfiguration
  if (document.crossFrameConfiguration != null) {
    const cf = document.crossFrameConfiguration;
    if (!(isFiniteNumber(cf.crossFrameSpacingM) && cf.crossFrameSpacingM > 0)) {
      issues.push({ path: "superstructureDocument.crossFrameConfiguration.crossFrameSpacingM", message: "crossFrameSpacingM must be > 0" });
    }
    if (!(isFiniteNumber(cf.swayBracing.intervalM) && cf.swayBracing.intervalM > 0)) {
      issues.push({ path: "superstructureDocument.crossFrameConfiguration.swayBracing.intervalM", message: "sway intervalM must be > 0" });
    }
    if (!(isFiniteNumber(cf.lateralBracing.intervalM) && cf.lateralBracing.intervalM > 0)) {
      issues.push({ path: "superstructureDocument.crossFrameConfiguration.lateralBracing.intervalM", message: "lateral intervalM must be > 0" });
    }
  }

  // bearingConfiguration
  const bcfg = document.bearingConfiguration;
  const seenRelation = new Set<string>();
  const knownGirders = new Set<string>(gcfg.girderLines.map((l) => l.girderId));
  const knownSupports = new Set<string>(document.supportReferences?.supports.map((s) => s.supportId) ?? []);
  for (const rel of bcfg.bearingSupportRelation) {
    const key = `${rel.supportId}:${rel.girderId}`;
    if (seenRelation.has(key)) {
      issues.push({ path: `superstructureDocument.bearingConfiguration.bearingSupportRelation`, message: `duplicate relation ${key}` });
    }
    seenRelation.add(key);
    if (knownGirders.size > 0 && !knownGirders.has(rel.girderId)) {
      issues.push({ path: `superstructureDocument.bearingConfiguration.bearingSupportRelation`, message: `dangling girderId ${rel.girderId}` });
    }
    if (knownSupports.size > 0 && !knownSupports.has(rel.supportId)) {
      issues.push({ path: `superstructureDocument.bearingConfiguration.bearingSupportRelation`, message: `dangling supportId ${rel.supportId}` });
    }
  }
  const seenSeatIds = new Set<string>();
  for (const seat of bcfg.bearingSeats) {
    if (seenSeatIds.has(seat.seatId)) {
      issues.push({ path: `superstructureDocument.bearingConfiguration.bearingSeats[${seat.seatId}]`, message: "duplicate seatId" });
    }
    seenSeatIds.add(seat.seatId);
    if (!["FIXED", "MOVABLE", "UNDECIDED"].includes(seat.fixedOrMovable)) {
      issues.push({ path: `superstructureDocument.bearingConfiguration.bearingSeats[${seat.seatId}]`, message: "invalid fixedOrMovable" });
    }
  }

  return issues;
}

/** Module-data level validation: superstructureDocument must be a valid document or absent. */
export function validateSuperstructureData(data: Record<string, unknown>): readonly SuperstructureIssue[] {
  const doc = data.superstructureDocument;
  if (doc === undefined || doc === null) {
    return [];
  }
  return validateSuperstructureDocument(doc as SuperstructureDocument);
}

/** Parse a raw persisted value into a SuperstructureDocument (fail-closed). */
export function parseSuperstructureDocument(raw: unknown):
  | { ok: true; document: SuperstructureDocument }
  | { ok: false; issues: readonly SuperstructureIssue[] } {
  if (!raw || typeof raw !== "object") {
    return { ok: false, issues: [{ path: "superstructureDocument", message: "not an object" }] };
  }
  const candidate = raw as SuperstructureDocument;
  if (candidate.schemaVersion !== SUPERSTRUCTURE_SCHEMA_VERSION) {
    return {
      ok: false,
      issues: [{ path: "superstructureDocument.schemaVersion", message: `unsupported schemaVersion ${candidate.schemaVersion}` }],
    };
  }
  const issues = validateSuperstructureDocument(candidate);
  if (issues.length > 0) {
    return { ok: false, issues };
  }
  return { ok: true, document: candidate };
}

export function isSuperstructureData(value: unknown): value is SuperstructureModuleData {
  if (!value || typeof value !== "object") return false;
  const record = value as Record<string, unknown>;
  return record.superstructureDocument === undefined || typeof record.superstructureDocument === "object";
}
