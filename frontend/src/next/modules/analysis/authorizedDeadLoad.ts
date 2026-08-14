/**
 * Authorized dead-load case (Phase 9-04R2 WP-R2D).
 *
 * Builds a single static dead-load case for the AnalysisDocument using only
 * the FROZEN load model values (Phase 5-01/5-02): DL-STRUCTURAL (main girder
 * self weight) + DL-DECK (deck self weight). No value is invented: the load
 * totals come from the derived load model and the distribution is uniform
 * along each girder line (tributary length weighting of the girder nodes).
 *
 * Loads are only produced when a finite positive total exists; otherwise the
 * result is null (fail-closed: no load case -> solver reports no result).
 */

import type { SuperstructureDocument } from "../superstructure/superstructureTypes";
import { buildDeadLoads, bridgeLengthMFromSpans } from "../superstructure/superstructureLoadModel";
import type {
  AnalysisDocument,
  AnalysisLoadCase,
  AnalysisNodalLoad,
  AnalysisNode,
} from "./analysisDocumentTypes";

export interface AuthorizedDeadLoadResult {
  readonly loadCase: AnalysisLoadCase;
  readonly nodalLoads: readonly AnalysisNodalLoad[];
}

function finitePositive(value: number | null | undefined): number | null {
  return typeof value === "number" && Number.isFinite(value) && value > 0 ? value : null;
}

/** Total DL (structural girder + deck) from the FROZEN load model. */
export function authorizedDeadLoadTotalKN(document: SuperstructureDocument): number | null {
  const dead = buildDeadLoads(document);
  const values: number[] = [];
  const girder = finitePositive(dead.structuralGirder.valueKN);
  const deck = finitePositive(dead.deck.valueKN);
  if (girder !== null) values.push(girder);
  if (deck !== null) values.push(deck);
  if (values.length === 0) return null;
  const total = values.reduce((sum, v) => sum + v, 0);
  return Number.isFinite(total) && total > 0 ? total : null;
}

/** Girder line id extracted from the FEM node sourceEntityId. */
function girderIdOfNode(node: AnalysisNode): string | null {
  // sourceEntityId shapes: "supportPoint:<supportId>:<girderId>" /
  // "girderPanel:<girderId>:<stationM>" / "crossBeamPoint:<crossGirderId>:<girderId>"
  const parts = node.sourceEntityId.split(":");
  if (node.sourceKind === "girderPanel") return parts[1] ?? null;
  if (node.sourceKind === "supportPoint") return parts[2] ?? null;
  return null;
}

/**
 * Distribute the total DL along each girder line as uniform nodal loads
 * (weighted by tributary length). Only support/girder panel nodes are loaded.
 */
export function buildAuthorizedDeadLoad(
  document: SuperstructureDocument,
  analysis: AnalysisDocument,
): AuthorizedDeadLoadResult | null {
  const totalKN = authorizedDeadLoadTotalKN(document);
  const girderCount = document.girderConfiguration.girderCount;
  if (totalKN === null || girderCount < 1) return null;

  const girderNodes = analysis.nodes.filter(
    (n) => (n.sourceKind === "supportPoint" || n.sourceKind === "girderPanel") && Number.isFinite(n.stationM),
  );
  if (girderNodes.length === 0) return null;

  const byGirder = new Map<string, AnalysisNode[]>();
  for (const node of girderNodes) {
    const girderId = girderIdOfNode(node);
    if (girderId === null) continue;
    const list = byGirder.get(girderId) ?? [];
    list.push(node);
    byGirder.set(girderId, list);
  }
  if (byGirder.size === 0) return null;
  // Fail-closed conservation (Sol review #7): the number of resolved girder
  // lines must match the declared girderCount, otherwise the distributed total
  // would not equal the original load (silent under-distribution).
  if (byGirder.size !== girderCount) {
    return null;
  }

  const girderShareKN = totalKN / girderCount;
  const nodalLoads: AnalysisNodalLoad[] = [];
  for (const [, nodes] of byGirder) {
    const sorted = [...nodes].sort((a, b) => (a.stationM ?? 0) - (b.stationM ?? 0));
    const tributary = new Map<string, number>();
    sorted.forEach((node, index) => {
      const prev = index > 0 ? sorted[index - 1] : null;
      const next = index < sorted.length - 1 ? sorted[index + 1] : null;
      const prevM = prev !== null ? ((node.stationM ?? 0) + (prev.stationM ?? 0)) / 2 : node.stationM ?? 0;
      const nextM = next !== null ? ((node.stationM ?? 0) + (next.stationM ?? 0)) / 2 : node.stationM ?? 0;
      const length = Math.max(0, nextM - prevM);
      tributary.set(node.entityId, length);
    });
    const totalTributary = [...tributary.values()].reduce((sum, v) => sum + v, 0);
    // Fail-closed conservation (Sol review #7): a girder group with no
    // tributary length would drop its share and break sum(-Fz) == totalKN.
    if (!(totalTributary > 0)) {
      return null;
    }
    for (const node of sorted) {
      const length = tributary.get(node.entityId) ?? 0;
      if (length <= 0) continue;
      const forceKN = (girderShareKN * length) / totalTributary;
      if (forceKN <= 1e-9) continue;
      nodalLoads.push({
        id: `nodal-load:${node.entityId}`,
        loadCaseId: "LC1",
        nodeId: node.entityId,
        fx: 0,
        fy: 0,
        fz: -forceKN,
        mx: 0,
        my: 0,
        mz: 0,
      });
    }
  }
  if (nodalLoads.length === 0) return null;

  const loadCase: AnalysisLoadCase = {
    caseId: "LC1",
    kind: "dead",
    state: totalKN !== null && Number.isFinite(totalKN) ? "DERIVED" : "MISSING",
    source: `superstructureLoadModel (DL) total=${totalKN.toFixed(1)}kN bridgeLength=${bridgeLengthMFromSpans(document)?.toFixed(1)}m`,
    totalKN,
  };

  return { loadCase, nodalLoads };
}
