/**
 * Substructure terrain / existing integration (Phase 6-01 C FROZEN / Phase 6-02 WP-G).
 *
 * Terrain / Existing are REFERENCE-connected (never duplicated into the
 * SubstructureDocument). Ground elevation / embedment / interference are derived
 * via the existing Phase 4 KEEP assets (getProjectTerrainGrid /
 * lookupTerrainElevation / collectExistingNearRange). Missing/stale are warnings
 * (geometry still generates; embedment stays NOT_AVAILABLE).
 */

import type { ProjectManager } from "../../project/projectManager";
import { getProjectTerrainGrid, lookupTerrainElevation, collectExistingNearRange } from "../bridgeLayout/bridgeLayoutPlacement";
import { readExistingConditions } from "../existingConditionsAdapter";
import type { ExistingConditionEntity } from "../existingConditions";
import type { SubstructureDocument, SubstructureIssue } from "./substructureTypes";
import { computeFoundationElevations, computePileTip } from "./substructureFoundation";

export interface TerrainResolution {
  readonly groundElevationBySupport: Record<string, number | null>;
  readonly issues: readonly SubstructureIssue[];
}

export interface ExistingResolution {
  readonly nearbyEntities: readonly ExistingConditionEntity[];
  readonly issues: readonly SubstructureIssue[];
}

/** Resolve ground elevation per support from the Terrain Module (reference). */
export function resolveTerrainElevations(
  manager: ProjectManager,
  projectId: string,
  document: SubstructureDocument,
): TerrainResolution {
  const issues: SubstructureIssue[] = [];
  const grid = getProjectTerrainGrid(manager, projectId);
  if (!grid) {
    issues.push({ path: "terrainReferences", message: "terrain module has no resolvable surface (warning); embedment stays NOT_AVAILABLE" });
  }
  const groundElevationBySupport: Record<string, number | null> = {};
  for (const support of document.supports) {
    const snapshot = support.placementSnapshot;
    if (snapshot) {
      groundElevationBySupport[support.supportId] = grid
        ? lookupTerrainElevation(grid, snapshot.position.x, snapshot.position.y)
        : null;
    } else {
      groundElevationBySupport[support.supportId] = null;
    }
  }
  return { groundElevationBySupport, issues };
}

/** Resolve Existing Conditions reference + nearby entities (reference, no copy). */
export function resolveExistingInterference(
  manager: ProjectManager,
  projectId: string,
  document: SubstructureDocument,
): ExistingResolution {
  const issues: SubstructureIssue[] = [];
  const existingDoc = readExistingConditions(manager, projectId);
  if (!existingDoc) {
    issues.push({ path: "existingReferences", message: "existing conditions document is missing (warning); interference stays empty" });
    return { nearbyEntities: [], issues };
  }
  // Bounding box from support positions (reference to geometry, not canonical).
  const xs = document.supports.map((s) => s.placementSnapshot?.position.x ?? 0);
  const ys = document.supports.map((s) => s.placementSnapshot?.position.y ?? 0);
  if (xs.length === 0) {
    return { nearbyEntities: [], issues };
  }
  const bbox = {
    minX: Math.min(...xs),
    maxX: Math.max(...xs),
    minY: Math.min(...ys),
    maxY: Math.max(...ys),
  };
  const nearby = collectExistingNearRange(existingDoc.entities, bbox);
  return { nearbyEntities: nearby, issues };
}

/** Compute embedment / pile tip for a support using the resolved ground elevation. */
export function computeSupportEmbedment(
  document: SubstructureDocument,
  supportId: string,
  groundElevation: number | null,
): { embedmentM: number | null; pileTipElevation: number | null } {
  const support = document.supports.find((s) => s.supportId === supportId);
  if (!support) return { embedmentM: null, pileTipElevation: null };
  const footing = support.pier?.footing ?? support.abutment?.footing;
  if (!footing) return { embedmentM: null, pileTipElevation: null };
  const elev = computeFoundationElevations(
    { id: footing.id, length: footing.length, width: footing.width, thickness: footing.thickness, topElevation: footing.topElevation },
    groundElevation,
  );
  const pileGroup = support.pier?.pileGroup ?? support.abutment?.pileGroup;
  const pileTip = pileGroup
    ? computePileTip(elev.pileHeadElevation ?? 0, { id: pileGroup.id, pileType: pileGroup.pileType, diameter: pileGroup.diameter, length: pileGroup.length, pileCount: pileGroup.pileCount, spacing: pileGroup.spacing })
    : null;
  return { embedmentM: elev.embedmentM, pileTipElevation: pileTip };
}
