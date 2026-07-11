import type { AnalysisResult, EigenModeResult, EigenResult } from "../../types";
import { compareScalarWithTolerance, nearlyEqual, mergeSemanticTolerance } from "./tolerance";
import { createParityReportEnvelope, serializeParityReportEnvelope } from "./serializer";
import type {
  AmbiguousMatch,
  CanonicalizeParityReportEnvelopeOptions,
  CompareSemanticParityOptions,
  JsonSafeValue,
  ParityMismatch,
  ParityReport,
  ParityReportEnvelope,
  SemanticParityDiagnostic,
  SemanticParityStatus,
  SemanticParitySource,
  SemanticTolerance,
} from "./types";

export type ResultParityKind = "static" | "eigen";

export type ResultParityReport = ParityReport & {
  kind: ResultParityKind;
  resultSummary: {
    static?: {
      displacementCount: number;
      reactionCount: number;
      memberEndForceCount: number;
    };
    eigen?: {
      modeCount: number;
      matchedModeCount: number;
      ambiguousModeCount: number;
    };
  };
};

function finiteOrNull(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function valueLabel(value: unknown): JsonSafeValue {
  if (value === undefined) return null;
  if (value === null) return null;
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (typeof value === "string" || typeof value === "boolean") return value;
  if (Array.isArray(value)) return value.map((item) => valueLabel(item));
  if (typeof value === "object") {
    const record = value as Record<string, unknown>;
    const out: Record<string, JsonSafeValue> = {};
    for (const key of Object.keys(record).sort()) {
      const entry = record[key];
      if (entry !== undefined) out[key] = valueLabel(entry);
    }
    return out;
  }
  return null;
}

function identityKey(kind: string, id: string, loadCaseId = ""): string {
  return [kind, loadCaseId, id].join("|");
}

function compareVectors(
  left: Record<string, number>,
  right: Record<string, number>,
  tolerance: SemanticTolerance["scalar"],
) {
  for (const key of Object.keys(left).sort()) {
    const leftValue = left[key];
    const rightValue = right[key];
    if (!nearlyEqual(leftValue, rightValue, tolerance)) {
      return { equal: false, delta: Math.abs(leftValue - rightValue) };
    }
  }
  return { equal: true };
}

function resultStatus(report: {
  errors: SemanticParityDiagnostic[];
  ambiguities: AmbiguousMatch[];
  mismatches: ParityMismatch[];
}): SemanticParityStatus {
  if (report.errors.length > 0) return "invalid";
  if (report.ambiguities.length > 0) return "indeterminate";
  return report.mismatches.length > 0 ? "different" : "equivalent";
}

function emptyReport(tolerance: SemanticTolerance, kind: ResultParityKind): ResultParityReport {
  return {
    kind,
    status: "equivalent",
    tolerance,
    counts: { left: { nodes: 0, members: 0, supports: 0, sections: 0 }, right: { nodes: 0, members: 0, supports: 0, sections: 0 }, matched: { nodes: 0, members: 0 } },
    unmatchedLeft: [],
    unmatchedRight: [],
    mismatches: [],
    ambiguities: [],
    warnings: [],
    errors: [],
    metrics: {
      geometry: { left: { nodeCount: 0, memberCount: 0, boundingBox: { min: { x: 0, y: 0, z: 0 }, max: { x: 0, y: 0, z: 0 } }, centroid: { x: 0, y: 0, z: 0 }, memberLengths: { min: 0, max: 0, mean: 0, total: 0, count: 0 } }, right: { nodeCount: 0, memberCount: 0, boundingBox: { min: { x: 0, y: 0, z: 0 }, max: { x: 0, y: 0, z: 0 } }, centroid: { x: 0, y: 0, z: 0 }, memberLengths: { min: 0, max: 0, mean: 0, total: 0, count: 0 } }, equivalent: true },
      topology: { left: { degreeHistogram: {}, isolatedNodeCount: 0, connectedComponentCount: 1, connectedComponentSizes: [0], parallelEdgeCandidateCount: 0, selfLoopCandidateCount: 0 }, right: { degreeHistogram: {}, isolatedNodeCount: 0, connectedComponentCount: 1, connectedComponentSizes: [0], parallelEdgeCandidateCount: 0, selfLoopCandidateCount: 0 }, equivalent: true },
      structuralValidation: { left: { valid: true, isolatedNodeCount: 0, disconnectedComponentCount: 0, zeroLengthMemberCount: 0, selfLoopCount: 0, missingEndpointCount: 0, nonFiniteGeometryCount: 0 }, right: { valid: true, isolatedNodeCount: 0, disconnectedComponentCount: 0, zeroLengthMemberCount: 0, selfLoopCount: 0, missingEndpointCount: 0, nonFiniteGeometryCount: 0 } },
      support: { matchedSupportCount: 0, unmatchedLeftCount: 0, unmatchedRightCount: 0, fixityMismatchCount: 0, ambiguousNodeCount: 0 },
      property: { comparedMemberCount: 0, sectionMismatchCount: 0, materialMismatchCount: 0, orientationMismatchCount: 0, orientationOppositeCount: 0, skippedUndefinedCount: 0 },
      load: { matchedLoadCaseCount: 0, unmatchedLeftLoadCaseCount: 0, unmatchedRightLoadCaseCount: 0, matchedNodalLoadCount: 0, unmatchedLeftNodalLoadCount: 0, unmatchedRightNodalLoadCount: 0, nodalLoadValueMismatchCount: 0, matchedMemberLoadCount: 0, unmatchedLeftMemberLoadCount: 0, unmatchedRightMemberLoadCount: 0, memberLoadValueMismatchCount: 0, ambiguousLoadCandidateCount: 0, totalAppliedLoadLeft: 0, totalAppliedLoadRight: 0, totalAppliedLoadEquivalent: true },
    },
    summary: { status: "equivalent", matchedNodes: 0, matchedMembers: 0, unmatchedLeft: 0, unmatchedRight: 0, mismatchCount: 0, ambiguityCount: 0, warningCount: 0, errorCount: 0 },
    resultSummary: kind === "static" ? { static: { displacementCount: 0, reactionCount: 0, memberEndForceCount: 0 } } : { eigen: { modeCount: 0, matchedModeCount: 0, ambiguousModeCount: 0 } },
  };
}

function compareStaticResults(left: AnalysisResult, right: AnalysisResult, tolerance: SemanticTolerance): ResultParityReport {
  const report = emptyReport(tolerance, "static");
  const mismatches: ParityMismatch[] = [];
  const ambiguities: AmbiguousMatch[] = [];
  const diagnostics: SemanticParityDiagnostic[] = [];
  const leftDisp = new Map(left.displacements.map((item) => [identityKey("disp", item.nodeId, item.loadCaseId), item]));
  const rightDisp = new Map(right.displacements.map((item) => [identityKey("disp", item.nodeId, item.loadCaseId), item]));
  for (const [key, l] of leftDisp) {
    const r = rightDisp.get(key);
    if (!r) continue;
    const cmp = compareVectors(
      { ux: l.ux, uy: l.uy, uz: l.uz, rx: l.rx, ry: l.ry, rz: l.rz },
      { ux: r.ux, uy: r.uy, uz: r.uz, rx: r.rx, ry: r.ry, rz: r.rz },
      tolerance.scalar,
    );
    if (!cmp.equal) mismatches.push({ category: "node", path: `displacements/${l.loadCaseId}/${l.nodeId}`, leftValue: valueLabel(l), rightValue: valueLabel(r), delta: cmp.delta, severity: "error", message: "Displacement parity mismatch." });
  }
  const leftReac = new Map(left.reactions.map((item) => [identityKey("react", item.nodeId, item.loadCaseId), item]));
  const rightReac = new Map(right.reactions.map((item) => [identityKey("react", item.nodeId, item.loadCaseId), item]));
  for (const [key, l] of leftReac) {
    const r = rightReac.get(key);
    if (!r) continue;
    const cmp = compareVectors(
      { fx: l.fx, fy: l.fy, fz: l.fz, mx: l.mx, my: l.my, mz: l.mz },
      { fx: r.fx, fy: r.fy, fz: r.fz, mx: r.mx, my: r.my, mz: r.mz },
      tolerance.scalar,
    );
    if (!cmp.equal) mismatches.push({ category: "node", path: `reactions/${l.loadCaseId}/${l.nodeId}`, leftValue: valueLabel(l), rightValue: valueLabel(r), delta: cmp.delta, severity: "error", message: "Reaction parity mismatch." });
  }
  const leftEndForces = new Map(left.memberEndForces.map((item) => [identityKey("member", item.memberId, item.loadCaseId), item]));
  const rightEndForces = new Map(right.memberEndForces.map((item) => [identityKey("member", item.memberId, item.loadCaseId), item]));
  for (const [key, l] of leftEndForces) {
    const r = rightEndForces.get(key);
    if (!r) continue;
    const direct = compareVectors(l.i, r.i, tolerance.scalar).equal && compareVectors(l.j, r.j, tolerance.scalar).equal;
    const reversed = compareVectors(l.i, r.j, tolerance.scalar).equal && compareVectors(l.j, r.i, tolerance.scalar).equal;
    if (direct) continue;
    if (reversed) {
      ambiguities.push({
        category: "member",
        leftKeys: [l.memberId],
        rightKeys: [r.memberId],
        message: "Member end force I/J reversal was detected but not proven deterministically.",
      });
      continue;
    }
    mismatches.push({
      category: "member",
      path: `memberEndForces/${l.loadCaseId}/${l.memberId}`,
      leftValue: valueLabel(l),
      rightValue: valueLabel(r),
      severity: "error",
      message: "Member end force parity mismatch.",
    });
  }
  report.status = resultStatus({ errors: diagnostics, ambiguities, mismatches });
  report.mismatches = mismatches;
  report.ambiguities = ambiguities;
  report.errors = diagnostics;
  report.resultSummary.static = { displacementCount: left.displacements.length, reactionCount: left.reactions.length, memberEndForceCount: left.memberEndForces.length };
  return report;
}

function modeShapeSignature(mode: EigenModeResult): string {
  return mode.shape.map((sample) => [sample.nodeId, sample.ux, sample.uy, sample.uz, sample.rx, sample.ry, sample.rz].join(":")).join("|");
}

function mac(left: EigenModeResult, right: EigenModeResult): number | null {
  if (left.shape.length === 0 || right.shape.length === 0 || left.shape.length !== right.shape.length) return null;
  let dot = 0; let leftNorm = 0; let rightNorm = 0;
  for (let i = 0; i < left.shape.length; i += 1) {
    const l = left.shape[i]; const r = right.shape[i];
    const lv = [l.ux, l.uy, l.uz, l.rx, l.ry, l.rz];
    const rv = [r.ux, r.uy, r.uz, r.rx, r.ry, r.rz];
    for (let j = 0; j < lv.length; j += 1) { dot += lv[j] * rv[j]; leftNorm += lv[j] * lv[j]; rightNorm += rv[j] * rv[j]; }
  }
  if (leftNorm === 0 || rightNorm === 0) return null;
  return (dot * dot) / (leftNorm * rightNorm);
}

function compareEigenResults(left: EigenResult, right: EigenResult, tolerance: SemanticTolerance): ResultParityReport {
  const report = emptyReport(tolerance, "eigen");
  const mismatches: ParityMismatch[] = [];
  const ambiguities: AmbiguousMatch[] = [];
  const leftModes = [...left.modes].sort((a, b) => a.modeNo - b.modeNo);
  const rightModes = [...right.modes].sort((a, b) => a.modeNo - b.modeNo);
  const matchedRight = new Set<number>();
  for (const lm of leftModes) {
    const candidates = rightModes.filter((rm) => !matchedRight.has(rm.modeNo));
    const scalarFiltered = candidates.filter((rm) => {
      const eigenvalueMatch = compareScalarWithTolerance(lm.eigenvalue, rm.eigenvalue, tolerance.scalar).equal;
      const frequencyMatch = compareScalarWithTolerance(lm.frequency, rm.frequency, tolerance.scalar).equal;
      const periodMatch = compareScalarWithTolerance(lm.period, rm.period, tolerance.scalar).equal;
      return eigenvalueMatch || frequencyMatch || periodMatch;
    });
    const pool = scalarFiltered.length > 0 ? scalarFiltered : candidates;
    const scored = pool.map((rm) => ({ rm, score: mac(lm, rm) }));
    scored.sort((a, b) => (b.score ?? -1) - (a.score ?? -1));
    const best = scored[0];
    if (!best || best.score == null) continue;
    const tied = scored.filter((item) => item.score === best.score);
    if (tied.length > 1) {
      ambiguities.push({ category: "member", leftKeys: [String(lm.modeNo)], rightKeys: tied.map((item) => String(item.rm.modeNo)), message: "Ambiguous eigen mode candidate match." });
      continue;
    }
    matchedRight.add(best.rm.modeNo);
    const scalarFields: Array<keyof EigenModeResult> = ["eigenvalue", "circularFrequency", "frequency", "period", "modalMass"];
    for (const field of scalarFields) {
      const leftValue = finiteOrNull(lm[field]);
      const rightValue = finiteOrNull(best.rm[field]);
      if (leftValue == null || rightValue == null) continue;
      const cmp = compareScalarWithTolerance(leftValue, rightValue, tolerance.scalar);
      if (!cmp.equal) mismatches.push({ category: "member", path: `eigenResult/modes/${lm.modeNo}/${String(field)}`, leftValue: lm[field], rightValue: best.rm[field], delta: cmp.delta, severity: "error", message: `Eigen ${String(field)} mismatch.` });
    }
    report.summary.matchedMembers += 1;
  }
  report.status = resultStatus({ errors: [], ambiguities, mismatches });
  report.mismatches = mismatches;
  report.ambiguities = ambiguities;
  report.resultSummary.eigen = { modeCount: leftModes.length, matchedModeCount: report.summary.matchedMembers, ambiguousModeCount: ambiguities.length };
  return report;
}

export function compareAnalysisResults(
  left: AnalysisResult,
  right: AnalysisResult,
  options: CompareSemanticParityOptions = {},
): ResultParityReport {
  const tolerance = mergeSemanticTolerance(options.tolerance);
  if (left.analysisSummary.status === "failed" || right.analysisSummary.status === "failed" || left.errors.length > 0 || right.errors.length > 0) {
    return { ...emptyReport(tolerance, left.analysisSummary.analysisType === "eigen" ? "eigen" : "static"), status: "invalid" };
  }
  if (left.analysisSummary.analysisType === "eigen" || right.analysisSummary.analysisType === "eigen") {
    if (!left.eigenResult || !right.eigenResult) {
      return { ...emptyReport(tolerance, "eigen"), status: "indeterminate" };
    }
    return compareEigenResults(left.eigenResult, right.eigenResult, tolerance);
  }
  return compareStaticResults(left, right, tolerance);
}

export function createAnalysisResultParityEnvelope(
  left: AnalysisResult,
  right: AnalysisResult,
  options: {
    sources: { left: { source: SemanticParitySource; label?: string }; right: { source: SemanticParitySource; label?: string } };
    tolerance?: SemanticTolerance;
    schemaVersion?: string;
    generatedAt?: string;
    toolVersion?: string;
  },
): ParityReportEnvelope {
  const report = compareAnalysisResults(left, right, { tolerance: options.tolerance });
  return createParityReportEnvelope(report, options);
}

export function serializeAnalysisResultParityEnvelope(
  envelope: ParityReportEnvelope,
  options: CanonicalizeParityReportEnvelopeOptions = {},
): string {
  return serializeParityReportEnvelope(envelope, options);
}
