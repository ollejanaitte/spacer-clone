/**
 * Grillage model generation from GeometrySnapshot (Phase 7).
 *
 * Converts the snapshot's bridge geometry into a backend-compatible grillage
 * analysis model (nodes / members / supports / materials / sections). Node
 * positions come from the snapshot (LINER authority); member/support topology is
 * declared modeling derived from the snapshot supports + girder lines.
 *
 * Authorization: the generated model is a framework artefact; analysis results
 * and design checks remain NOT_AUTHORIZED (Phase A gates).
 */

import type { GeometrySnapshot } from "../geometry";
import { RB001_DESIGN_CONDITIONS, type DesignConditions } from "./designConditions";

export type GrillageNode = { id: string; x: number; y: number; z: number };
export type GrillageMember = {
  id: string;
  nodeI: string;
  nodeJ: string;
  materialId: string;
  sectionId: string;
  kind: "mainGirder" | "crossGirder";
};
export type GrillageSupport = { nodeId: string; ux: boolean; uy: boolean; uz: boolean };
export type GrillageModel = {
  bridgeId: string;
  nodes: GrillageNode[];
  members: GrillageMember[];
  supports: GrillageSupport[];
  materials: { id: string; name: string }[];
  sections: string[];
  loadCases: string[];
  authorization: "NOT_GRANTED";
  traceability: { entityId: string; source: string }[];
};

/** Declared steel material reference (E=205 GPa; declared modelling input). */
export const GRILLAGE_STEEL_MATERIAL = { id: "MAT-STEEL", name: "steel (declared)" };

/**
 * Build a grillage model: main-girder nodes at (support station x girder offset),
 * longitudinal main-girder members per span, transverse cross-girder members at
 * each support, vertical supports at all girder nodes.
 */
export function buildGrillageModel(
  snapshot: GeometrySnapshot,
  conditions: DesignConditions = RB001_DESIGN_CONDITIONS,
): GrillageModel {
  const nodes: GrillageNode[] = [];
  const supports: GrillageSupport[] = [];
  const traceability: { entityId: string; source: string }[] = [];
  const nodeIdAt = new Map<string, string>();

  for (const sp of snapshot.supportPoints) {
    const nodeId = `N-${sp.supportId}-${sp.girderId}`;
    nodes.push({ id: nodeId, x: sp.position.x, y: sp.position.y, z: sp.position.z });
    nodeIdAt.set(`${sp.supportId}|${sp.girderId}`, nodeId);
    traceability.push({ entityId: nodeId, source: `snapshot supportPoint ${sp.id}` });
  }

  // main girder members per span
  const members: GrillageMember[] = [];
  const stations = snapshot.supportLines.map((l) => l.supportId);
  const sectionId = snapshot.crossSectionFrames[0]?.sectionId ?? "SECTION-GIRDER";
  for (const line of snapshot.girderLines) {
    for (let i = 0; i < stations.length - 1; i += 1) {
      const nodeI = nodeIdAt.get(`${stations[i]}|${line.girderId}`);
      const nodeJ = nodeIdAt.get(`${stations[i + 1]}|${line.girderId}`);
      if (!nodeI || !nodeJ) continue;
      members.push({
        id: `M-L-${line.girderId}-S${i + 1}`,
        nodeI,
        nodeJ,
        materialId: GRILLAGE_STEEL_MATERIAL.id,
        sectionId,
        kind: "mainGirder",
      });
    }
  }

  // transverse cross-girder members at each support
  for (const station of stations) {
    const girderIds = snapshot.girderLines.map((l) => l.girderId);
    for (let i = 0; i < girderIds.length - 1; i += 1) {
      const nodeI = nodeIdAt.get(`${station}|${girderIds[i]}`);
      const nodeJ = nodeIdAt.get(`${station}|${girderIds[i + 1]}`);
      if (!nodeI || !nodeJ) continue;
      members.push({
        id: `M-T-${station}-${i}`,
        nodeI,
        nodeJ,
        materialId: GRILLAGE_STEEL_MATERIAL.id,
        sectionId,
        kind: "crossGirder",
      });
    }
  }

  // supports: vertical restraint at every girder node (declared modelling);
  // abutment nodes also restrain transverse/horizontal.
  const firstStation = stations[0];
  const lastStation = stations[stations.length - 1];
  for (const sp of snapshot.supportPoints) {
    const nodeId = nodeIdAt.get(`${sp.supportId}|${sp.girderId}`);
    if (!nodeId) continue;
    const abutment = sp.supportId === firstStation || sp.supportId === lastStation;
    supports.push({
      nodeId,
      ux: abutment,
      uy: abutment,
      uz: true,
    });
  }

  return {
    bridgeId: snapshot.bridgeId,
    nodes,
    members,
    supports,
    materials: [GRILLAGE_STEEL_MATERIAL],
    sections: [...new Set(members.map((m) => m.sectionId))],
    loadCases: [],
    authorization: "NOT_GRANTED",
    traceability,
  };
}
