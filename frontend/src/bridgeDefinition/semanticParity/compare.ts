import type { ProjectModel } from "../../types";
import { buildGeometryMetrics } from "./geometryParity";
import { compareLoadParity } from "./loadParity";
import { matchNormalizedMembers } from "./memberMatching";
import { matchNormalizedNodes } from "./nodeMatching";
import { normalizeProjectModelForSemanticParity } from "./normalize";
import { comparePropertyParity } from "./propertyParity";
import { validateStructuralModel } from "./structuralValidation";
import { compareSupportParity } from "./supportParity";
import { buildTopologyMetrics } from "./topologyParity";
import { mergeSemanticTolerance } from "./tolerance";
import type {
  CompareSemanticParityOptions,
  NormalizedModel,
  ParityMismatch,
  ParityReport,
  SemanticParityStatus,
  UnmatchedItem,
} from "./types";

function hasBlockingMismatch(mismatches: ParityMismatch[]): boolean {
  return mismatches.some((mismatch) => mismatch.severity === "error" || mismatch.severity === "blocker");
}

function deriveStatus(
  report: Omit<ParityReport, "status" | "summary">,
  metrics: ParityReport["metrics"],
): SemanticParityStatus {
  if (report.errors.length > 0) return "invalid";
  if (report.ambiguities.length > 0 || metrics.support.ambiguousNodeCount > 0 || metrics.load.ambiguousLoadCandidateCount > 0) {
    return "indeterminate";
  }
  if (!metrics.structuralValidation.left.valid || !metrics.structuralValidation.right.valid) {
    return "invalid";
  }
  if (
    report.unmatchedLeft.length > 0
    || report.unmatchedRight.length > 0
    || hasBlockingMismatch(report.mismatches)
    || !metrics.geometry.equivalent
    || !metrics.topology.equivalent
    || metrics.support.fixityMismatchCount > 0
    || metrics.support.unmatchedLeftCount > 0
    || metrics.support.unmatchedRightCount > 0
    || metrics.property.sectionMismatchCount > 0
    || metrics.property.materialMismatchCount > 0
    || metrics.property.orientationMismatchCount > 0
    || metrics.load.unmatchedLeftLoadCaseCount > 0
    || metrics.load.unmatchedRightLoadCaseCount > 0
    || metrics.load.unmatchedLeftNodalLoadCount > 0
    || metrics.load.unmatchedRightNodalLoadCount > 0
    || metrics.load.unmatchedLeftMemberLoadCount > 0
    || metrics.load.unmatchedRightMemberLoadCount > 0
    || metrics.load.nodalLoadValueMismatchCount > 0
    || metrics.load.memberLoadValueMismatchCount > 0
    || !metrics.load.totalAppliedLoadEquivalent
  ) {
    return "different";
  }
  if (metrics.property.orientationOppositeCount > 0) {
    return "different";
  }
  return "equivalent";
}

function mismatchFromUnmatched(item: UnmatchedItem): ParityMismatch {
  return {
    category: item.path.startsWith("members/") ? "member" : "node",
    path: item.path,
    leftValue: item.side === "left" ? item.sourceId ?? item.key : undefined,
    rightValue: item.side === "right" ? item.sourceId ?? item.key : undefined,
    severity: item.reason === "ambiguous" || item.reason.includes("ambiguous") ? "warning" : "error",
    message: `${item.side} item is unmatched: ${item.reason}.`,
  };
}

export function compareNormalizedModels(
  left: NormalizedModel,
  right: NormalizedModel,
  options: CompareSemanticParityOptions = {},
): ParityReport {
  const tolerance = mergeSemanticTolerance(options.tolerance);
  const leftValidation = validateStructuralModel(left, tolerance);
  const rightValidation = validateStructuralModel(right, tolerance);

  const nodeMatch = matchNormalizedNodes(left.nodes, right.nodes, tolerance);
  const memberMatch = matchNormalizedMembers(left.members, right.members, nodeMatch.matched);
  const geometry = buildGeometryMetrics(left, right, nodeMatch.matched, memberMatch.matched, tolerance);
  const topology = buildTopologyMetrics(left, right, nodeMatch.matched);
  const support = compareSupportParity(left, right, nodeMatch.matched);
  const property = comparePropertyParity(left, right, memberMatch.matched, tolerance);
  const load = compareLoadParity(left, right, nodeMatch.matched, memberMatch.matched, tolerance);

  const unmatchedLeft = [...nodeMatch.unmatchedLeft, ...memberMatch.unmatchedLeft];
  const unmatchedRight = [...nodeMatch.unmatchedRight, ...memberMatch.unmatchedRight];
  const mismatches = [
    ...unmatchedLeft,
    ...unmatchedRight,
  ].map(mismatchFromUnmatched)
    .concat(geometry.mismatches)
    .concat(topology.mismatches)
    .concat(support.mismatches)
    .concat(property.mismatches)
    .concat(load.mismatches);

  const ambiguities = [
    ...nodeMatch.ambiguities,
    ...memberMatch.ambiguities,
    ...support.ambiguities,
    ...load.ambiguities,
  ];

  const metrics: ParityReport["metrics"] = {
    geometry: {
      left: geometry.left,
      right: geometry.right,
      equivalent: geometry.equivalent,
    },
    topology: {
      left: topology.left,
      right: topology.right,
      equivalent: topology.equivalent,
    },
    structuralValidation: {
      left: leftValidation.summary,
      right: rightValidation.summary,
    },
    support: support.summary,
    property: property.summary,
    load: load.summary,
  };

  const reportBase = {
    tolerance,
    counts: {
      left: {
        nodes: left.nodes.length,
        members: left.members.length,
        supports: left.supports.length,
        sections: left.sections.length,
        materials: left.materials?.length,
        loadCases: left.loadCases?.length,
        nodalLoads: left.nodalLoads?.length,
        memberLoads: left.memberLoads?.length,
      },
      right: {
        nodes: right.nodes.length,
        members: right.members.length,
        supports: right.supports.length,
        sections: right.sections.length,
        materials: right.materials?.length,
        loadCases: right.loadCases?.length,
        nodalLoads: right.nodalLoads?.length,
        memberLoads: right.memberLoads?.length,
      },
      matched: {
        nodes: nodeMatch.matched.length,
        members: memberMatch.matched.length,
      },
    },
    unmatchedLeft,
    unmatchedRight,
    mismatches,
    ambiguities,
    warnings: [
      ...left.warnings,
      ...right.warnings,
      ...nodeMatch.diagnostics.warnings,
      ...memberMatch.diagnostics.warnings,
      ...leftValidation.warnings,
      ...rightValidation.warnings,
      ...topology.warnings,
      ...property.warnings,
      ...load.warnings,
    ],
    errors: [
      ...left.errors,
      ...right.errors,
      ...nodeMatch.diagnostics.errors,
      ...memberMatch.diagnostics.errors,
      ...leftValidation.errors,
      ...rightValidation.errors,
    ],
    metrics,
  } satisfies Omit<ParityReport, "status" | "summary">;

  const status = deriveStatus(reportBase, metrics);
  return {
    status,
    ...reportBase,
    summary: {
      status,
      matchedNodes: reportBase.counts.matched.nodes,
      matchedMembers: reportBase.counts.matched.members,
      unmatchedLeft: reportBase.unmatchedLeft.length,
      unmatchedRight: reportBase.unmatchedRight.length,
      mismatchCount: reportBase.mismatches.length,
      ambiguityCount: reportBase.ambiguities.length,
      warningCount: reportBase.warnings.length,
      errorCount: reportBase.errors.length,
      geometryEquivalent: metrics.geometry.equivalent,
      topologyEquivalent: metrics.topology.equivalent,
      structurallyValid: metrics.structuralValidation.left.valid && metrics.structuralValidation.right.valid,
      supportEquivalent: metrics.support.fixityMismatchCount === 0
        && metrics.support.unmatchedLeftCount === 0
        && metrics.support.unmatchedRightCount === 0
        && metrics.support.ambiguousNodeCount === 0,
      propertyEquivalent: metrics.property.sectionMismatchCount === 0
        && metrics.property.materialMismatchCount === 0
        && metrics.property.orientationMismatchCount === 0
        && metrics.property.orientationOppositeCount === 0,
      loadEquivalent: metrics.load.unmatchedLeftLoadCaseCount === 0
        && metrics.load.unmatchedRightLoadCaseCount === 0
        && metrics.load.unmatchedLeftNodalLoadCount === 0
        && metrics.load.unmatchedRightNodalLoadCount === 0
        && metrics.load.unmatchedLeftMemberLoadCount === 0
        && metrics.load.unmatchedRightMemberLoadCount === 0
        && metrics.load.nodalLoadValueMismatchCount === 0
        && metrics.load.memberLoadValueMismatchCount === 0
        && metrics.load.ambiguousLoadCandidateCount === 0
        && metrics.load.totalAppliedLoadEquivalent,
    },
  };
}

export function compareSemanticParity(
  left: ProjectModel,
  right: ProjectModel,
  options: CompareSemanticParityOptions = {},
): ParityReport {
  const leftModel = normalizeProjectModelForSemanticParity(left, {
    ...options,
    source: options.leftSource ?? "unknown",
    leftLabel: options.leftLabel,
    loadsMapped: options.leftLoadsMapped,
  });
  const rightModel = normalizeProjectModelForSemanticParity(right, {
    ...options,
    source: options.rightSource ?? "unknown",
    rightLabel: options.rightLabel,
    loadsMapped: options.rightLoadsMapped,
  });
  return compareNormalizedModels(leftModel, rightModel, options);
}
