/**
 * Substructure geometry (Phase 6-01 C FROZEN / Phase 6-02 WP-E).
 *
 * Reuses the existing KEEP solid generators (SubstructureSolidGenerator /
 * PierSolidGenerator / FoundationSolidGenerator) to build abutment/pier/footing/
 * foundation/pile solids from the SubstructureDocument supports + placement
 * snapshots. Dimensions are never invented: MISSING stays MISSING.
 */

import { buildAllSupportSolids } from "../../../substructure/SubstructureSolidGenerator";
import type { SolidGroup } from "../../../substructure/geometryBase";
import type { Support, SupportPlacementSnapshot } from "../../../substructure/model";
import type { SubstructureDocument, SubstructureIssue } from "./substructureTypes";

/** Validate pier/abutment shape dimensions (fail-closed; positive/finite). */
export function validateSubstructureShapes(document: SubstructureDocument): readonly SubstructureIssue[] {
  const issues: SubstructureIssue[] = [];
  for (const support of document.supports) {
    const path = `substructureDocument.supports[${support.supportId}]`;
    if (support.pier) {
      const pier = support.pier;
      if (pier.column) {
        for (const key of ["width", "depth", "height"] as const) {
          const v = pier.column[key];
          if (!(typeof v === "number" && Number.isFinite(v) && v > 0)) {
            issues.push({ path: `${path}.pier.column.${key}`, message: `${key} must be > 0` });
          }
        }
      }
      if (pier.footing) {
        for (const key of ["length", "width", "thickness"] as const) {
          const v = pier.footing[key];
          if (!(typeof v === "number" && Number.isFinite(v) && v > 0)) {
            issues.push({ path: `${path}.pier.footing.${key}`, message: `${key} must be > 0` });
          }
        }
      }
    }
    if (support.abutment) {
      const abutment = support.abutment;
      const bw = abutment.backwall;
      for (const key of ["height", "thickness", "width"] as const) {
        const v = bw[key];
        if (!(typeof v === "number" && Number.isFinite(v) && v > 0)) {
          issues.push({ path: `${path}.abutment.backwall.${key}`, message: `${key} must be > 0` });
        }
      }
      if (abutment.footing) {
        for (const key of ["length", "width", "thickness"] as const) {
          const v = abutment.footing[key];
          if (!(typeof v === "number" && Number.isFinite(v) && v > 0)) {
            issues.push({ path: `${path}.abutment.footing.${key}`, message: `${key} must be > 0` });
          }
        }
      }
    }
  }
  return issues;
}

/** Build the placement supports + snapshots for the solid generators. */
export function buildGeometrySupports(document: SubstructureDocument): {
  readonly supports: Support[];
  readonly snapshots: Map<string, SupportPlacementSnapshot>;
} {
  const snapshots = new Map<string, SupportPlacementSnapshot>();
  const supports: Support[] = document.supports.map((s) => {
    if (s.placementSnapshot) {
      snapshots.set(s.supportId, s.placementSnapshot);
    }
    return {
      supportId: s.supportId,
      supportType: s.supportType,
      placement: { ...s.placement },
      skewRad: s.skewRad,
      placementSnapshot: s.placementSnapshot,
      bearingSeats: s.bearingSeats,
      pier: s.pier,
      abutment: s.abutment,
    };
  });
  return { supports, snapshots };
}

/** Build solid groups for the document (reuses existing KEEP generators). */
export function buildSubstructureSolids(document: SubstructureDocument): SolidGroup[] {
  const { supports, snapshots } = buildGeometrySupports(document);
  return buildAllSupportSolids(supports, snapshots);
}
