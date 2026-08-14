/**
 * Substructure footing / foundation / pile (Phase 6-01 C FROZEN / Phase 6-02 WP-F).
 *
 * Reuses the existing KEEP FoundationSolidGenerator (derivePileLayout /
 * buildPileGrid) and computes FROZEN derived elevations:
 *  - embedment = groundElevation - footingBottomElevation (positive m)
 *  - pile head = footing bottom (derived only)
 *  - pile tip = pile head - pileLength
 * Missing inputs stay NOT_AVAILABLE (never invented; SOURCE_NOT_AVAILABLE not
 * completed).
 */

import { derivePileLayout, buildPileGrid, type PileLayout, type PilePosition } from "../../../substructure/FoundationSolidGenerator";
import type { FootingConfiguration, PileConfiguration, SubstructureIssue } from "./substructureTypes";

export interface DerivedFoundationElevations {
  readonly footingBottomElevation: number | null;
  readonly embedmentM: number | null;
  readonly pileHeadElevation: number | null;
  readonly pileTipElevation: number | null;
}

/** FROZEN: embedment = groundElevation - footingBottomElevation. */
export function computeFoundationElevations(
  footing: FootingConfiguration,
  groundElevation: number | null,
): DerivedFoundationElevations {
  const footingBottom = footing.topElevation - footing.thickness;
  if (groundElevation === null || !Number.isFinite(groundElevation)) {
    return {
      footingBottomElevation: footingBottom,
      embedmentM: null, // NOT_AVAILABLE (no terrain)
      pileHeadElevation: null,
      pileTipElevation: null,
    };
  }
  const embedment = groundElevation - footingBottom;
  return {
    footingBottomElevation: footingBottom,
    embedmentM: embedment,
    pileHeadElevation: footingBottom, // derived only
    pileTipElevation: null, // set when pileLength declared
  };
}

/** FROZEN: pile tip = pile head - pileLength (when declared). */
export function computePileTip(
  pileHeadElevation: number,
  pile: PileConfiguration,
): number | null {
  if (!(pile.length > 0 && Number.isFinite(pile.length))) return null;
  return pileHeadElevation - pile.length;
}

/** Reuse KEEP derivePileLayout / buildPileGrid for the pile arrangement.
 * When rows/cols/edge are declared (B-06) they are canonical; otherwise the
 * layout is derived from pileCount+spacing (legacy fallback). */
export function buildPileArrangement(
  pile: PileConfiguration,
  footing: FootingConfiguration,
  supportId: string,
): { layout: PileLayout; positions: PilePosition[] } {
  let layout: PileLayout;
  if (pile.rows !== null && pile.cols !== null && pile.rows >= 1 && pile.cols >= 1) {
    const spanX = (pile.rows - 1) * pile.spacing.x;
    const spanY = (pile.cols - 1) * pile.spacing.y;
    const edgeX = pile.edgeX ?? Math.max(0, (footing.length - spanX) / 2);
    const edgeY = pile.edgeY ?? Math.max(0, (footing.width - spanY) / 2);
    layout = { rows: pile.rows, cols: pile.cols, spacingX: pile.spacing.x, spacingY: pile.spacing.y, edgeX, edgeY };
  } else {
    layout = derivePileLayout(footing.length, footing.width, {
      pileCount: pile.pileCount,
      spacing: pile.spacing,
    });
  }
  const positions = buildPileGrid(layout, footing.length, footing.width, supportId);
  return { layout, positions };
}

/** Validate footing/foundation/pile dimensions (fail-closed). */
export function validateFoundationData(
  document: {
    readonly footingConfigurations: readonly FootingConfiguration[];
    readonly pileConfigurations: readonly PileConfiguration[];
  },
): readonly SubstructureIssue[] {
  const issues: SubstructureIssue[] = [];
  for (const footing of document.footingConfigurations) {
    for (const key of ["length", "width", "thickness"] as const) {
      const v = footing[key];
      if (!(typeof v === "number" && Number.isFinite(v) && v > 0)) {
        issues.push({ path: `footingConfigurations[${footing.id}].${key}`, message: `${key} must be > 0` });
      }
    }
    if (!(typeof footing.topElevation === "number" && Number.isFinite(footing.topElevation))) {
      issues.push({ path: `footingConfigurations[${footing.id}].topElevation`, message: "topElevation must be finite" });
    }
  }
  for (const pile of document.pileConfigurations) {
    for (const key of ["diameter", "length"] as const) {
      const v = pile[key];
      if (!(typeof v === "number" && Number.isFinite(v) && v > 0)) {
        issues.push({ path: `pileConfigurations[${pile.id}].${key}`, message: `${key} must be > 0` });
      }
    }
    if (!Number.isInteger(pile.pileCount) || pile.pileCount < 1) {
      issues.push({ path: `pileConfigurations[${pile.id}].pileCount`, message: "pileCount must be >= 1" });
    }
    for (const axis of ["x", "y"] as const) {
      const v = pile.spacing[axis];
      if (!(typeof v === "number" && Number.isFinite(v) && v > 0)) {
        issues.push({ path: `pileConfigurations[${pile.id}].spacing.${axis}`, message: `spacing.${axis} must be > 0` });
      }
    }
    // B-06 grid consistency: when rows/cols declared, pileCount === rows*cols
    const rows = pile.rows;
    const cols = pile.cols;
    if (rows !== null && cols !== null) {
      if (!Number.isInteger(rows) || rows < 1 || !Number.isInteger(cols) || cols < 1) {
        issues.push({ path: `pileConfigurations[${pile.id}].grid`, message: "rows/cols must be positive integers" });
      } else if (pile.pileCount !== rows * cols) {
        issues.push({ path: `pileConfigurations[${pile.id}].pileCount`, message: `pileCount ${pile.pileCount} must equal rows*cols ${rows * cols}` });
      }
    }
    for (const axis of ["edgeX", "edgeY"] as const) {
      const v = pile[axis];
      if (v !== null && !(typeof v === "number" && Number.isFinite(v) && v >= 0)) {
        issues.push({ path: `pileConfigurations[${pile.id}].${axis}`, message: `${axis} must be >= 0 when present` });
      }
    }
  }
  return issues;
}
