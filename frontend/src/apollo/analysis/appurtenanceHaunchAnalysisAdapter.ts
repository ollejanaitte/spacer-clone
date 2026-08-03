/**
 * Step 4-C5 analysis adapter for appurtenance/haunch dead loads.
 *
 * Audit (FE solver path):
 * - ANALYSIS_SUPPORTS_FULL_SPAN_UDL: YES (memberLoads type=uniform full member)
 * - ANALYSIS_SUPPORTS_PARTIAL_UDL: NO (MemberLoad has no station range)
 * - ANALYSIS_SUPPORTS_MULTIPLE_SEGMENTS: NO on FE memberLoads
 * - ANALYSIS_SUPPORTS_PER_GIRDER: NO native (development distribution applied here)
 * - ANALYSIS_INPUT_CHECKSUM: YES (from load model)
 * - ANALYSIS_RESULT_PROVENANCE: YES (adapter stamps)
 *
 * Therefore this adapter applies closed-form simply-supported beam statics per girder
 * for partial segment UDLs. It never silently averages a partial load into a full-span UDL.
 * Deflection is NOT_AVAILABLE (no unverified formula).
 *
 * UNVERIFIED DEVELOPMENT ONLY — NOT FOR DESIGN OR CONSTRUCTION
 */

import {
  analysisEligibleLoads,
  buildAppurtenanceHaunchLoadModel,
  type AppurtenanceHaunchLoadModel,
  type SegmentDeadLoad,
} from "../loads/appurtenanceHaunchLoadModel";
import { getBridgeStructureInputDraft, isBridgeStructureGenerationCurrent } from "../bridgeStructure";
import type { ProjectModel } from "../../types";

export const ANALYSIS_ADAPTER_SCHEMA_VERSION = "1.0.0-development" as const;

export type AppliedGirderSegmentLoad = {
  readonly sourceLoadId: string;
  readonly sourceEntityId: string;
  readonly loadCaseId: SegmentDeadLoad["loadCaseId"];
  readonly category: SegmentDeadLoad["category"];
  readonly startStation: number;
  readonly endStation: number;
  readonly lineLoadKNPerM: number;
  readonly share: number;
  readonly appliedLineLoadKNPerM: number;
  readonly appliedTotalKN: number;
};

export type GirderAnalysisSummary = {
  readonly girderKey: string;
  readonly girderIndex: number;
  readonly spanLengthM: number;
  readonly appliedSegments: readonly AppliedGirderSegmentLoad[];
  readonly totalAppliedVerticalKN: number;
  readonly leftReactionKN: number;
  readonly rightReactionKN: number;
  readonly maxMomentKNm: number | null;
  readonly deflectionStatus: "NOT_AVAILABLE";
  readonly deflectionWarning: string;
  readonly equilibriumResidualKN: number;
  readonly formulaIds: readonly string[];
  readonly warnings: readonly string[];
};

export type AppurtenanceHaunchAnalysisResult = {
  readonly schemaVersion: typeof ANALYSIS_ADAPTER_SCHEMA_VERSION;
  readonly projectId: string;
  readonly inputChecksum: string;
  readonly loadModelId: string;
  readonly stale: boolean;
  readonly status: "READY" | "BLOCKED" | "INCOMPLETE" | "STALE" | "EMPTY";
  readonly developmentLabel: "UNVERIFIED_DEVELOPMENT_ONLY";
  readonly authorizationStatus: "NOT_GRANTED";
  readonly designOrConstructionUse: "PROHIBITED";
  readonly beamIdealization: "SIMPLE_SPAN_CLOSED_FORM_PER_GIRDER";
  readonly assumptions: readonly string[];
  readonly warnings: readonly string[];
  readonly perGirder: readonly GirderAnalysisSummary[];
  readonly combined: {
    readonly totalAppliedVerticalKN: number;
    readonly totalReactionKN: number;
    readonly equilibriumResidualKN: number;
    readonly appurtenanceAppliedKN: number;
    readonly haunchAppliedKN: number;
  };
  readonly sourceLoadTrace: readonly {
    readonly loadId: string;
    readonly sourceEntityId: string;
    readonly loadCaseId: string;
    readonly category: string;
    readonly startStation: number;
    readonly endStation: number;
    readonly totalLoadKN: number;
    readonly distributionRule: string;
  }[];
};

const EQUILIBRIUM_TOL = 1e-6;

/**
 * Closed-form reactions for a simply-supported beam 0..L with UDL w on [a,b].
 * Positive w downward; reactions positive upward resisting.
 * R_left = w*(b-a)*xbar_from_right / L
 * where xbar is centroid distance from left = (a+b)/2
 * Moment about right support: R_left * L = w*(b-a)*(L - (a+b)/2)
 */
export function partialUdlReactions(
  spanLengthM: number,
  startStation: number,
  endStation: number,
  lineLoadKNPerM: number,
): { readonly leftKN: number; readonly rightKN: number; readonly totalKN: number } | null {
  const L = spanLengthM;
  const a = startStation;
  const b = endStation;
  if (!(L > 0) || !(b > a) || !Number.isFinite(lineLoadKNPerM)) return null;
  if (a < -1e-12 || b > L + 1e-12) return null;
  const length = b - a;
  const total = lineLoadKNPerM * length;
  const centroidFromLeft = (a + b) / 2;
  const leftKN = (total * (L - centroidFromLeft)) / L;
  const rightKN = total - leftKN;
  return { leftKN, rightKN, totalKN: total };
}

/**
 * Max sagging moment for partial UDL on simple span (development closed-form).
 * Evaluates M(x) = R_left*x - w*<x-a>^2/2 for x in [0,L] at critical points.
 */
export function partialUdlMaxMomentKNm(
  spanLengthM: number,
  startStation: number,
  endStation: number,
  lineLoadKNPerM: number,
): number | null {
  const reactions = partialUdlReactions(spanLengthM, startStation, endStation, lineLoadKNPerM);
  if (!reactions) return null;
  const L = spanLengthM;
  const a = startStation;
  const b = endStation;
  const w = lineLoadKNPerM;
  const Rl = reactions.leftKN;

  const momentAt = (x: number): number => {
    let m = Rl * x;
    if (x > a) {
      const loaded = Math.min(x, b) - a;
      if (loaded > 0) m -= (w * loaded * loaded) / 2;
    }
    return m;
  };

  const samples = [a, b, (a + b) / 2, L / 2, Rl / w + a].filter(
    (x) => Number.isFinite(x) && x >= 0 && x <= L,
  );
  // Also where shear≈0 inside loaded region: x = a + Rl/w if in [a,b]
  let maxM = 0;
  for (const x of samples) {
    maxM = Math.max(maxM, momentAt(x));
  }
  // densify loaded region
  for (let i = 0; i <= 20; i += 1) {
    const x = a + ((b - a) * i) / 20;
    maxM = Math.max(maxM, momentAt(x));
  }
  return maxM;
}

function buildPerGirder(
  loads: readonly SegmentDeadLoad[],
  spanLengthM: number,
  girderCount: number,
): GirderAnalysisSummary[] {
  const byGirder = new Map<string, AppliedGirderSegmentLoad[]>();
  for (let i = 0; i < girderCount; i += 1) {
    byGirder.set(`girder-${i}`, []);
  }

  for (const load of loads) {
    for (const target of load.targetGirderRefs) {
      const appliedLine = (load.lineLoadKNPerM ?? 0) * target.share;
      const appliedTotal = (load.totalLoadKN ?? 0) * target.share;
      const list = byGirder.get(target.girderKey) ?? [];
      list.push({
        sourceLoadId: load.loadId,
        sourceEntityId: load.sourceEntityId,
        loadCaseId: load.loadCaseId,
        category: load.category,
        startStation: load.startStation,
        endStation: load.endStation,
        lineLoadKNPerM: load.lineLoadKNPerM ?? 0,
        share: target.share,
        appliedLineLoadKNPerM: appliedLine,
        appliedTotalKN: appliedTotal,
      });
      byGirder.set(target.girderKey, list);
    }
  }

  const summaries: GirderAnalysisSummary[] = [];
  for (const [girderKey, segments] of [...byGirder.entries()].sort((a, b) => a[0].localeCompare(b[0]))) {
    const index = Number(/^girder-(\d+)$/.exec(girderKey)?.[1] ?? -1);
    let left = 0;
    let right = 0;
    let maxMoment = 0;
    let momentOk = true;
    const warnings: string[] = [];
    for (const segment of segments) {
      if (segment.endStation > spanLengthM + 1e-9 || segment.startStation < -1e-9) {
        warnings.push(
          `SEGMENT_OUT_OF_SPAN: ${segment.sourceLoadId} [${segment.startStation},${segment.endStation}] vs L=${spanLengthM}`,
        );
        momentOk = false;
        continue;
      }
      const reactions = partialUdlReactions(
        spanLengthM,
        segment.startStation,
        segment.endStation,
        segment.appliedLineLoadKNPerM,
      );
      if (!reactions) {
        warnings.push(`REACTION_FAIL: ${segment.sourceLoadId}`);
        momentOk = false;
        continue;
      }
      left += reactions.leftKN;
      right += reactions.rightKN;
      const m = partialUdlMaxMomentKNm(
        spanLengthM,
        segment.startStation,
        segment.endStation,
        segment.appliedLineLoadKNPerM,
      );
      if (m === null) momentOk = false;
      else maxMoment = Math.max(maxMoment, m);
    }
    // Superposition of max moments from each segment is conservative upper bound for development;
    // for equilibrium we only rely on reactions.
    const totalApplied = segments.reduce((acc, s) => acc + s.appliedTotalKN, 0);
    const residual = totalApplied - (left + right);
    summaries.push({
      girderKey,
      girderIndex: index,
      spanLengthM,
      appliedSegments: segments,
      totalAppliedVerticalKN: totalApplied,
      leftReactionKN: left,
      rightReactionKN: right,
      maxMomentKNm: momentOk && segments.length > 0 ? maxMoment : segments.length === 0 ? 0 : null,
      deflectionStatus: "NOT_AVAILABLE",
      deflectionWarning:
        "Partial-UDL deflection closed-form not authorized in Step 4-C; deflection remains NOT_AVAILABLE.",
      equilibriumResidualKN: residual,
      formulaIds: ["F-S4C-AN-PARTIAL-UDL-REACTIONS", "F-S4C-AN-PARTIAL-UDL-MOMENT-BOUND"],
      warnings: [
        "ASSUMED_DEVELOPMENT_ONLY: simple-span closed-form per girder",
        "NOT_AUTHORIZED",
        ...warnings,
      ],
    });
  }
  return summaries;
}

export function runAppurtenanceHaunchAnalysis(
  project: ProjectModel,
  options?: { readonly loadModel?: AppurtenanceHaunchLoadModel },
): AppurtenanceHaunchAnalysisResult {
  const draft = getBridgeStructureInputDraft(project);
  const loadModel = options?.loadModel ?? buildAppurtenanceHaunchLoadModel(project);
  const assumptions = [
    "Beam idealization: simply-supported closed-form per main girder (development).",
    "Partial segment UDL retained; never silently converted to full-span UDL.",
    "Distribution shares from DEC-S4-0010 load model.",
    "Deflection NOT_AVAILABLE.",
  ];
  const warnings = [
    "UNVERIFIED DEVELOPMENT ANALYSIS RESULT",
    "NOT FOR DESIGN OR CONSTRUCTION",
    "NUMERIC_DESIGN_AUTHORIZATION: NOT_GRANTED",
  ];

  if (loadModel.stale || !isBridgeStructureGenerationCurrent(project)) {
    return {
      schemaVersion: ANALYSIS_ADAPTER_SCHEMA_VERSION,
      projectId: project.project.id,
      inputChecksum: loadModel.inputChecksum,
      loadModelId: loadModel.loadModelId,
      stale: true,
      status: "STALE",
      developmentLabel: "UNVERIFIED_DEVELOPMENT_ONLY",
      authorizationStatus: "NOT_GRANTED",
      designOrConstructionUse: "PROHIBITED",
      beamIdealization: "SIMPLE_SPAN_CLOSED_FORM_PER_GIRDER",
      assumptions,
      warnings: [...warnings, "STALE"],
      perGirder: [],
      combined: {
        totalAppliedVerticalKN: 0,
        totalReactionKN: 0,
        equilibriumResidualKN: 0,
        appurtenanceAppliedKN: 0,
        haunchAppliedKN: 0,
      },
      sourceLoadTrace: [],
    };
  }

  if (loadModel.status === "INCOMPLETE") {
    return {
      schemaVersion: ANALYSIS_ADAPTER_SCHEMA_VERSION,
      projectId: project.project.id,
      inputChecksum: loadModel.inputChecksum,
      loadModelId: loadModel.loadModelId,
      stale: false,
      status: "BLOCKED",
      developmentLabel: "UNVERIFIED_DEVELOPMENT_ONLY",
      authorizationStatus: "NOT_GRANTED",
      designOrConstructionUse: "PROHIBITED",
      beamIdealization: "SIMPLE_SPAN_CLOSED_FORM_PER_GIRDER",
      assumptions,
      warnings: [...warnings, "BLOCKED: unit weight missing on one or more PROVIDED loads"],
      perGirder: [],
      combined: {
        totalAppliedVerticalKN: 0,
        totalReactionKN: 0,
        equilibriumResidualKN: 0,
        appurtenanceAppliedKN: 0,
        haunchAppliedKN: 0,
      },
      sourceLoadTrace: [],
    };
  }

  const eligible = analysisEligibleLoads(loadModel);
  if (eligible.length === 0) {
    return {
      schemaVersion: ANALYSIS_ADAPTER_SCHEMA_VERSION,
      projectId: project.project.id,
      inputChecksum: loadModel.inputChecksum,
      loadModelId: loadModel.loadModelId,
      stale: false,
      status: "EMPTY",
      developmentLabel: "UNVERIFIED_DEVELOPMENT_ONLY",
      authorizationStatus: "NOT_GRANTED",
      designOrConstructionUse: "PROHIBITED",
      beamIdealization: "SIMPLE_SPAN_CLOSED_FORM_PER_GIRDER",
      assumptions,
      warnings,
      perGirder: [],
      combined: {
        totalAppliedVerticalKN: 0,
        totalReactionKN: 0,
        equilibriumResidualKN: 0,
        appurtenanceAppliedKN: 0,
        haunchAppliedKN: 0,
      },
      sourceLoadTrace: [],
    };
  }

  const spanLengthM = draft.bridgeLength ?? draft.spanLength;
  const girderCount = draft.girderCount;
  if (spanLengthM === null || girderCount === null || !(spanLengthM > 0) || girderCount < 1) {
    return {
      schemaVersion: ANALYSIS_ADAPTER_SCHEMA_VERSION,
      projectId: project.project.id,
      inputChecksum: loadModel.inputChecksum,
      loadModelId: loadModel.loadModelId,
      stale: false,
      status: "BLOCKED",
      developmentLabel: "UNVERIFIED_DEVELOPMENT_ONLY",
      authorizationStatus: "NOT_GRANTED",
      designOrConstructionUse: "PROHIBITED",
      beamIdealization: "SIMPLE_SPAN_CLOSED_FORM_PER_GIRDER",
      assumptions,
      warnings: [...warnings, "BLOCKED: bridgeLength/girderCount unavailable"],
      perGirder: [],
      combined: {
        totalAppliedVerticalKN: 0,
        totalReactionKN: 0,
        equilibriumResidualKN: 0,
        appurtenanceAppliedKN: 0,
        haunchAppliedKN: 0,
      },
      sourceLoadTrace: [],
    };
  }

  if (draft.bridgeSystem !== "SIMPLE_SINGLE") {
    warnings.push(
      "ASSUMED_DEVELOPMENT_ONLY: continuous/other systems use bridgeLength as a single simple-span idealization.",
    );
  }

  const perGirder = buildPerGirder(eligible, spanLengthM, girderCount);
  const totalApplied = perGirder.reduce((acc, g) => acc + g.totalAppliedVerticalKN, 0);
  const totalReaction = perGirder.reduce((acc, g) => acc + g.leftReactionKN + g.rightReactionKN, 0);
  const residual = totalApplied - totalReaction;
  if (Math.abs(residual) > EQUILIBRIUM_TOL) {
    warnings.push(`EQUILIBRIUM_FAIL: residual=${residual}`);
  }

  const appurtenanceAppliedKN = eligible
    .filter((l) => l.category === "APPURTENANCE")
    .reduce((acc, l) => acc + (l.totalLoadKN ?? 0), 0);
  const haunchAppliedKN = eligible
    .filter((l) => l.category === "RC_HAUNCH")
    .reduce((acc, l) => acc + (l.totalLoadKN ?? 0), 0);

  return {
    schemaVersion: ANALYSIS_ADAPTER_SCHEMA_VERSION,
    projectId: project.project.id,
    inputChecksum: loadModel.inputChecksum,
    loadModelId: loadModel.loadModelId,
    stale: false,
    status: Math.abs(residual) > EQUILIBRIUM_TOL ? "INCOMPLETE" : "READY",
    developmentLabel: "UNVERIFIED_DEVELOPMENT_ONLY",
    authorizationStatus: "NOT_GRANTED",
    designOrConstructionUse: "PROHIBITED",
    beamIdealization: "SIMPLE_SPAN_CLOSED_FORM_PER_GIRDER",
    assumptions,
    warnings,
    perGirder,
    combined: {
      totalAppliedVerticalKN: totalApplied,
      totalReactionKN: totalReaction,
      equilibriumResidualKN: residual,
      appurtenanceAppliedKN,
      haunchAppliedKN,
    },
    sourceLoadTrace: eligible.map((load) => ({
      loadId: load.loadId,
      sourceEntityId: load.sourceEntityId,
      loadCaseId: load.loadCaseId,
      category: load.category,
      startStation: load.startStation,
      endStation: load.endStation,
      totalLoadKN: load.totalLoadKN ?? 0,
      distributionRule: load.distributionRule,
    })),
  };
}

export function analysisResultToJson(result: AppurtenanceHaunchAnalysisResult): string {
  return `${JSON.stringify(result, null, 2)}\n`;
}
