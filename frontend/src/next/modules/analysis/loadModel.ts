/**
 * Load model / load combination (Phase 7-01 C FROZEN / Phase 7-02 WP-F).
 *
 * Dead-load distribution rule (FROZEN §3.1 / Sol review #19):
 *   q = caseTotalKN / SUM(memberLength over loaded main-girder members)
 * applied as member distributed loads (global z, negative = gravity).
 * Support-node-only loading is NOT a valid specification.
 *
 * COMBO-1 = 1.0 * DL-STRUCTURAL + 1.0 * DL-DECK (executable declaration; the
 * linear synthesis of per-case results happens in the result layer, WP-H).
 */

import { buildDeadLoads } from "../superstructure/superstructureLoadModel";
import type { SuperstructureDocument } from "../superstructure/superstructureTypes";
import type {
  AnalysisDocument,
  AnalysisLoadCase,
  AnalysisLoadCombination,
  AnalysisMember,
  AnalysisMemberLoad,
} from "./analysisDocumentTypes";

export const LC_STRUCTURAL = "DL-STRUCTURAL";
export const LC_DECK = "DL-DECK";
export const LC_PAVEMENT = "DL-PAVEMENT";
export const LC_APPURTENANCE = "DL-APPURTENANCE";
export const LC_LIVE = "LL";
export const COMBO_1 = "COMBO-1";

export interface AnalysisLoadsResult {
  readonly loadCases: readonly AnalysisLoadCase[];
  readonly memberLoads: readonly AnalysisMemberLoad[];
  readonly loadCombinations: readonly AnalysisLoadCombination[];
  readonly issues: readonly { path: string; message: string }[];
}

function memberLength(member: AnalysisMember, nodeMap: Map<string, { x: number; y: number; z: number }>): number {
  const a = nodeMap.get(member.nodeIId);
  const b = nodeMap.get(member.nodeJId);
  if (!a || !b) {
    return 0;
  }
  return Math.hypot(b.x - a.x, b.y - a.y, b.z - a.z);
}

/** Total length of the loaded members (main girders) in metres. */
function loadedMemberLength(
  members: readonly AnalysisMember[],
  nodeMap: Map<string, { x: number; y: number; z: number }>,
): number {
  return members
    .filter((m) => m.memberKind === "mainGirder")
    .reduce((sum, m) => sum + memberLength(m, nodeMap), 0);
}

/**
 * Build load cases + member distributed loads + COMBO-1 from the
 * SuperstructureDocument dead-load model. Never fabricates values: MISSING
 * components stay MISSING (input boundary) and are not loaded.
 */
export function buildAnalysisLoads(
  document: SuperstructureDocument,
  analysisModel: AnalysisDocument,
): AnalysisLoadsResult {
  const issues: { path: string; message: string }[] = [];
  const loadCases: AnalysisLoadCase[] = [];
  const memberLoads: AnalysisMemberLoad[] = [];
  const loadCombinations: AnalysisLoadCombination[] = [];

  const nodeMap = new Map<string, { x: number; y: number; z: number }>();
  for (const node of analysisModel.nodes) {
    nodeMap.set(node.entityId, { x: node.x, y: node.y, z: node.z });
  }
  const mainGirderMembers = analysisModel.members.filter((m) => m.memberKind === "mainGirder");
  const totalLength = loadedMemberLength(analysisModel.members, nodeMap);
  if (totalLength <= 0) {
    issues.push({ path: "analysisModel.members", message: "no main girder length for load distribution." });
    return { loadCases, memberLoads, loadCombinations, issues };
  }

  const deadLoads = buildDeadLoads(document);

  // DL-STRUCTURAL: main girder + (MISSING secondary included in main girder per FROZEN partition).
  const structuralTotal = deadLoads.structuralGirder.valueKN;
  if (structuralTotal !== null && structuralTotal > 0) {
    const q = structuralTotal / totalLength;
    loadCases.push({
      caseId: LC_STRUCTURAL,
      kind: "dead",
      state: deadLoads.structuralGirder.state,
      source: "SuperstructureDocument.loadModel.deadLoads.structuralGirder",
      totalKN: structuralTotal,
    });
    for (const member of mainGirderMembers) {
      memberLoads.push({
        id: `${LC_STRUCTURAL}-${member.sourceEntityId}`,
        loadCaseId: LC_STRUCTURAL,
        memberId: member.entityId,
        type: "distributed",
        direction: "z",
        coordinateSystem: "global",
        magnitude: -q,
        positionM: null,
        unit: "kN_per_m",
      });
    }
  } else {
    loadCases.push({
      caseId: LC_STRUCTURAL,
      kind: "dead",
      state: "MISSING",
      source: "SuperstructureDocument.loadModel.deadLoads.structuralGirder",
      totalKN: null,
    });
  }

  // DL-DECK: RC deck self-weight distributed equally over main girders.
  const deckTotal = deadLoads.deck.valueKN;
  if (deckTotal !== null && deckTotal > 0) {
    const q = deckTotal / totalLength;
    loadCases.push({
      caseId: LC_DECK,
      kind: "dead",
      state: deadLoads.deck.state,
      source: "SuperstructureDocument.loadModel.deadLoads.deck",
      totalKN: deckTotal,
    });
    for (const member of mainGirderMembers) {
      memberLoads.push({
        id: `${LC_DECK}-${member.sourceEntityId}`,
        loadCaseId: LC_DECK,
        memberId: member.entityId,
        type: "distributed",
        direction: "z",
        coordinateSystem: "global",
        magnitude: -q,
        positionM: null,
        unit: "kN_per_m",
      });
    }
  } else {
    loadCases.push({
      caseId: LC_DECK,
      kind: "dead",
      state: "MISSING",
      source: "SuperstructureDocument.loadModel.deadLoads.deck",
      totalKN: null,
    });
  }

  // Input-boundary cases (declaration only; no loads).
  loadCases.push({
    caseId: LC_PAVEMENT,
    kind: "dead",
    state: "MISSING",
    source: "SuperstructureDocument.loadModel.deadLoads.pavement",
    totalKN: null,
  });
  loadCases.push({
    caseId: LC_APPURTENANCE,
    kind: "dead",
    state: "MISSING",
    source: "SuperstructureDocument.loadModel.deadLoads.appurtenances",
    totalKN: null,
  });
  loadCases.push({
    caseId: LC_LIVE,
    kind: "live",
    state: "MISSING",
    source: "SuperstructureDocument.loadModel.liveLoadReference",
    totalKN: null,
  });

  // COMBO-1 (executable: per-case solve + linear synthesis in WP-H).
  loadCombinations.push({
    combinationId: COMBO_1,
    expression: "COMBO-1 = 1.0 * DL-STRUCTURAL + 1.0 * DL-DECK",
    factors: [
      { caseId: LC_STRUCTURAL, factor: 1.0 },
      { caseId: LC_DECK, factor: 1.0 },
    ],
    resultCaseId: COMBO_1,
    executable: true,
  });

  return { loadCases, memberLoads, loadCombinations, issues };
}
