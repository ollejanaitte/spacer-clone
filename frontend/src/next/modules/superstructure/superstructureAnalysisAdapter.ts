/**
 * Superstructure analysis adapter (Phase 5-01 D-01 FROZEN / Phase 5-02 WP-F).
 *
 * Turns the SuperstructureDocument (+ frozen GeometrySnapshot) into a grillage
 * analysis input (reusing the KEEP `buildGrillageModel` + backend grillage/
 * solver), runs the analysis through an injectable runner, and maps the gated
 * results back into the document's analysisModel / reactionResults.
 *
 * Gates (D-01):
 *  - dead loads only (DL-STRUCTURAL / DL-DECK) distributed equally to girder
 *    support nodes; live load is input boundary
 *  - results stay NOT_AUTHORIZED while authorization is NOT_GRANTED
 *  - reactions: +z up-positive; nodal gravity loads applied as -z
 */

import type { GeometrySnapshot } from "../../../apollo/geometry/types";
import { buildGrillageModel, type GrillageModel } from "../../../apollo/design/grillageModel";
import { apiClient } from "../../../api/client";
import type { SuperstructureDocument } from "./superstructureTypes";
import { buildDeadLoads, comboOneTotalKN } from "./superstructureLoadModel";

export const LC_STRUCTURAL = "DL-STRUCTURAL";
export const LC_DECK = "DL-DECK";

export interface SuperstructureNodalLoad {
  readonly id: string;
  readonly loadCaseId: string;
  readonly nodeId: string;
  readonly fx: number;
  readonly fy: number;
  readonly fz: number;
  readonly mx: number;
  readonly my: number;
  readonly mz: number;
}

export interface SuperstructureAnalysisInput {
  readonly bridgeId: string;
  readonly nodes: GrillageModel["nodes"];
  readonly members: GrillageModel["members"];
  readonly supports: GrillageModel["supports"];
  readonly materials: GrillageModel["materials"];
  readonly sections: GrillageModel["sections"];
  readonly loadCases: readonly { id: string; name: string; type: string }[];
  readonly nodalLoads: readonly SuperstructureNodalLoad[];
  readonly authorization: "NOT_GRANTED";
}

export type AnalysisRunner = (input: SuperstructureAnalysisInput) => Promise<Record<string, unknown>>;

/** Default runner: POST to the existing grillage backend endpoint. */
export const defaultAnalysisRunner: AnalysisRunner = async (input) => {
  const result = await apiClient.analyzeGrillage(input as unknown as never);
  return result as unknown as Record<string, unknown>;
};

/**
 * Build the grillage analysis input from the document + snapshot.
 * Dead loads are distributed equally across girder lines and their support
 * nodes (D-01 §2.4 simple equal distribution). Fail-closed: if no dead load is
 * computable, the input still carries the empty load cases (analysis runs, but
 * with declared zero load) and the caller decides.
 */
export function buildSuperstructureAnalysisInput(
  document: SuperstructureDocument,
  snapshot: GeometrySnapshot,
): SuperstructureAnalysisInput {
  const base = buildGrillageModel(snapshot);
  const deadLoads = buildDeadLoads(document);
  const structuralTotal = deadLoads.structuralGirder.valueKN ?? null;
  const deckTotal = deadLoads.deck.valueKN ?? null;

  const loadCases: { id: string; name: string; type: string }[] = [];
  const nodalLoads: SuperstructureNodalLoad[] = [];
  const girderIds = snapshot.girderLines.map((g) => g.girderId);

  // distribution: per girder = total / girderCount; per support node = perGirder / supportsPerGirder
  function distribute(caseId: string, total: number): void {
    const perGirder = total / Math.max(girderIds.length, 1);
    for (const girderId of girderIds) {
      const nodes = snapshot.supportPoints.filter((p) => p.girderId === girderId);
      const perNode = nodes.length > 0 ? perGirder / nodes.length : 0;
      for (const sp of nodes) {
        const nodeId = `N-${sp.supportId}-${sp.girderId}`;
        nodalLoads.push({
          id: `${caseId}-${nodeId}`,
          loadCaseId: caseId,
          nodeId,
          fx: 0,
          fy: 0,
          fz: -perNode, // gravity downward (-z)
          mx: 0,
          my: 0,
          mz: 0,
        });
      }
    }
  }

  if (structuralTotal !== null) {
    loadCases.push({ id: LC_STRUCTURAL, name: "DL-STRUCTURAL（構造体自重）", type: "dead" });
    distribute(LC_STRUCTURAL, structuralTotal);
  }
  if (deckTotal !== null) {
    loadCases.push({ id: LC_DECK, name: "DL-DECK（床版自重）", type: "dead" });
    distribute(LC_DECK, deckTotal);
  }

  return {
    bridgeId: base.bridgeId,
    nodes: base.nodes,
    members: base.members,
    supports: base.supports,
    materials: base.materials,
    sections: base.sections,
    loadCases,
    nodalLoads,
    authorization: "NOT_GRANTED",
  };
}

export interface ReactionSnapshot {
  readonly seatId: string;
  readonly supportId: string;
  readonly girderId: string;
  readonly combinationId: string;
  readonly Fz: number;
}

/**
 * Map a gated backend result into per-seat reaction snapshots.
 * Reaction for node `N-{support}-{girder}` -> seat `BRG-{support}-{girder}`.
 * Reactions from the backend are forces at constrained DOFs; Rz (vertical) maps
 * to Fz with the +z up-positive convention (backend already resolves sign).
 */
export function reactionsFromResult(
  result: Record<string, unknown>,
  girderIds: readonly string[],
): ReactionSnapshot[] {
  const reactions = Array.isArray(result.reactions) ? (result.reactions as Record<string, unknown>[]) : [];
  const out: ReactionSnapshot[] = [];
  for (const r of reactions) {
    const nodeId = typeof r.nodeId === "string" ? r.nodeId : "";
    const match = /^N-([^-]+)-(.+)$/.exec(nodeId);
    if (!match) continue;
    const supportId = match[1];
    const girderId = match[2];
    if (!girderIds.includes(girderId)) continue;
    const fz = typeof r.rz === "number" ? r.rz : (typeof r.fz === "number" ? r.fz : 0);
    const combinationId = typeof r.loadCaseId === "string" ? r.loadCaseId : LC_STRUCTURAL;
    out.push({
      seatId: `BRG-${supportId}-${girderId}`,
      supportId,
      girderId,
      combinationId,
      Fz: fz,
    });
  }
  return out;
}

/**
 * Apply gated analysis results to the SuperstructureDocument.
 * Returns the updated document (analysisModel NOT_AUTHORIZED, reactionResults
 * NOT_AUTHORIZED) when authorization is NOT_GRANTED; otherwise unchanged.
 */
export function applySuperstructureAnalysisResult(
  document: SuperstructureDocument,
  result: Record<string, unknown>,
  now: string = new Date().toISOString(),
): SuperstructureDocument {
  const authorization = result.authorization;
  const numericAuthorization = result.numericDesignAuthorization;
  const granted = authorization === "NOT_GRANTED" || numericAuthorization === "NOT_GRANTED";
  if (!granted && authorization !== undefined) {
    return document;
  }
  const girderIds = document.girderConfiguration.girderLines.map((l) => l.girderId);
  const reactions = reactionsFromResult(result, girderIds);
  const reactionCases = reactions.map((r) => ({
    caseId: `RC-${r.combinationId}-${r.seatId}`,
    combinationId: r.combinationId,
    seatId: r.seatId,
    supportId: r.supportId,
    girderId: r.girderId,
    Fx: 0,
    Fy: 0,
    Fz: r.Fz,
    Mx: 0,
    My: 0,
    Mz: 0,
    unit: "kN" as const,
    momentUnit: "kNm" as const,
    signConvention: { force: "up-positive" as const, moment: "right-hand-rule" as const },
  }));

  return {
    ...document,
    analysisModel: {
      analysisStatus: "NOT_AUTHORIZED",
      modelReference: { grillageModelDigest: typeof result.modelDigest === "string" ? result.modelDigest : null },
      authorization: {
        numericDesignAuthorization: "NOT_GRANTED",
        stateReason: "NUMERIC_DESIGN_AUTHORIZATION: NOT_GRANTED; analysis results are not authorized.",
      },
    },
    reactionResults: {
      reactionStatus: "NOT_AUTHORIZED",
      reactionCases,
    },
    designResults: {
      ...document.designResults,
      designStatus: document.designResults.checks.length > 0 ? document.designResults.designStatus : "NOT_AUTHORIZED",
      reactionResultsReference: { reactionDigest: null },
    },
    timestamps: { ...document.timestamps, derivedAt: now },
  };
}

/** COMBO-1 total used by downstream (analysis verification). */
export function comboOneTotal(document: SuperstructureDocument): number | null {
  return comboOneTotalKN(buildDeadLoads(document));
}
