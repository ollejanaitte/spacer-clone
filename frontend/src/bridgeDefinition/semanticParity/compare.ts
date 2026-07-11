import type { ProjectModel } from "../../types";
import { matchNormalizedMembers } from "./memberMatching";
import { matchNormalizedNodes } from "./nodeMatching";
import { normalizeProjectModelForSemanticParity } from "./normalize";
import { mergeSemanticTolerance } from "./tolerance";
import type {
  CompareSemanticParityOptions,
  NormalizedModel,
  ParityMismatch,
  ParityReport,
  SemanticParityStatus,
  UnmatchedItem,
} from "./types";

function deriveStatus(report: Omit<ParityReport, "status" | "summary">): SemanticParityStatus {
  if (report.errors.length > 0) return "invalid";
  if (report.ambiguities.length > 0) return "indeterminate";
  if (report.unmatchedLeft.length > 0 || report.unmatchedRight.length > 0 || report.mismatches.length > 0) {
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
  const nodeMatch = matchNormalizedNodes(left.nodes, right.nodes, tolerance);
  const memberMatch = matchNormalizedMembers(left.members, right.members, nodeMatch.matched);
  const unmatchedLeft = [...nodeMatch.unmatchedLeft, ...memberMatch.unmatchedLeft];
  const unmatchedRight = [...nodeMatch.unmatchedRight, ...memberMatch.unmatchedRight];

  const reportBase = {
    tolerance,
    counts: {
      left: {
        nodes: left.nodes.length,
        members: left.members.length,
        supports: left.supports.length,
        sections: left.sections.length,
      },
      right: {
        nodes: right.nodes.length,
        members: right.members.length,
        supports: right.supports.length,
        sections: right.sections.length,
      },
      matched: {
        nodes: nodeMatch.matched.length,
        members: memberMatch.matched.length,
      },
    },
    unmatchedLeft,
    unmatchedRight,
    mismatches: [...unmatchedLeft, ...unmatchedRight].map(mismatchFromUnmatched),
    ambiguities: [...nodeMatch.ambiguities, ...memberMatch.ambiguities],
    warnings: [
      ...left.warnings,
      ...right.warnings,
      ...nodeMatch.diagnostics.warnings,
      ...memberMatch.diagnostics.warnings,
    ],
    errors: [
      ...left.errors,
      ...right.errors,
      ...nodeMatch.diagnostics.errors,
      ...memberMatch.diagnostics.errors,
    ],
  } satisfies Omit<ParityReport, "status" | "summary">;

  const status = deriveStatus(reportBase);
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
  });
  const rightModel = normalizeProjectModelForSemanticParity(right, {
    ...options,
    source: options.rightSource ?? "unknown",
    rightLabel: options.rightLabel,
  });
  return compareNormalizedModels(leftModel, rightModel, options);
}
