/**
 * Result / IF3 adapter (Phase 7-01 D FROZEN / Phase 7-02 WP-H /
 * Phase 9-04R3 Sol review #1).
 *
 * Consumes the IF3 FrameAnalysisResultResource produced by the backend:
 *  - row shape: {rowId, entityKind, entityId(UUID), quantity, unit, values,
 *    loadContextId?} (frameAnalysisResultResource contract)
 *  - load case: resolved from `loadContextId` via `resource.loadContext.entries`
 *    (fallback: the raw loadContextId itself)
 *  - reaction vertical is read directly from `fz` (R10; never `rz`)
 *  - member force values are FLAT keys `i.fx`..`j.mz` (canonical; the old
 *    nested `values.i.fx` shape is NOT part of the formal path)
 *
 * Missing / non-finite values are NOT promoted to 0: they stay undefined and
 * the consuming view renders them as missing (fail-closed, Sol review #2).
 */

import type { FrameAnalysisResultResource } from "../../../contracts/frameAnalysisResultResource";

export interface ReactionRow {
  readonly loadCaseId: string;
  readonly nodeId: string;
  readonly supportId: string | null;
  readonly fx: number | undefined;
  readonly fy: number | undefined;
  readonly fz: number | undefined;
  readonly mx: number | undefined;
  readonly my: number | undefined;
  readonly mz: number | undefined;
}

export interface DisplacementRow {
  readonly loadCaseId: string;
  readonly nodeId: string;
  readonly ux: number | undefined;
  readonly uy: number | undefined;
  readonly uz: number | undefined;
  readonly rx: number | undefined;
  readonly ry: number | undefined;
  readonly rz: number | undefined;
}

export interface MemberForceRow {
  readonly loadCaseId: string;
  readonly memberId: string;
  readonly i: { fx: number | undefined; fy: number | undefined; fz: number | undefined; mx: number | undefined; my: number | undefined; mz: number | undefined };
  readonly j: { fx: number | undefined; fy: number | undefined; fz: number | undefined; mx: number | undefined; my: number | undefined; mz: number | undefined };
}

export interface LinearStaticResultView {
  readonly displacements: readonly DisplacementRow[];
  readonly reactions: readonly ReactionRow[];
  readonly memberForces: readonly MemberForceRow[];
  readonly combinations: readonly { caseId: string; displacements: number; reactions: number; memberForces: number }[];
}

interface RowShape {
  readonly rowId?: unknown;
  readonly entityKind?: unknown;
  readonly entityId?: unknown;
  readonly quantity?: unknown;
  readonly unit?: unknown;
  readonly values?: unknown;
  readonly loadContextId?: unknown;
  readonly rows?: unknown;
}

/** Finite number or undefined (never coerced to 0). */
function finiteOrUndefined(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function isRow(value: unknown): value is RowShape {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

/**
 * Resolve a display label for a loadContextId using the resource loadContext.
 * Falls back to the raw id (traceability is preserved either way).
 */
function loadCaseLabelOf(resource: FrameAnalysisResultResource, loadContextId: unknown): string {
  if (typeof loadContextId === "string") {
    const entry = resource.loadContext?.entries.find((e) => e.id === loadContextId);
    return entry?.label ?? loadContextId;
  }
  return "";
}

/**
 * Extract a linear-static result view from an IF3 FrameAnalysisResultResource.
 * Each payload entry is {schemaVersion, rows[]}; rows carry canonical keys.
 */
export function extractLinearStaticResultFromIf3(
  resource: FrameAnalysisResultResource,
): LinearStaticResultView {
  const payload = (resource.payload ?? {}) as unknown as Record<string, unknown>;

  const rowsOf = (kind: string): readonly RowShape[] => {
    const entry = payload[kind];
    if (isRow(entry)) {
      const rows = entry.rows;
      if (Array.isArray(rows)) {
        return rows.filter(isRow);
      }
      return [];
    }
    return [];
  };

  const nodeRows = rowsOf("nodeDisplacement");
  const reactionRows = rowsOf("supportReaction");
  const memberRows = rowsOf("memberForce");

  const displacements: DisplacementRow[] = nodeRows.map((row) => {
    const values = (row.values ?? {}) as Record<string, unknown>;
    return {
      loadCaseId: loadCaseLabelOf(resource, row.loadContextId),
      nodeId: String(row.entityId ?? row.entityKind ?? ""),
      ux: finiteOrUndefined(values.ux),
      uy: finiteOrUndefined(values.uy),
      uz: finiteOrUndefined(values.uz),
      rx: finiteOrUndefined(values.rx),
      ry: finiteOrUndefined(values.ry),
      rz: finiteOrUndefined(values.rz),
    };
  });

  const reactions: ReactionRow[] = reactionRows.map((row) => {
    const values = (row.values ?? {}) as Record<string, unknown>;
    return {
      loadCaseId: loadCaseLabelOf(resource, row.loadContextId),
      nodeId: String(row.entityId ?? row.entityKind ?? ""),
      supportId: null,
      fx: finiteOrUndefined(values.fx),
      fy: finiteOrUndefined(values.fy),
      fz: finiteOrUndefined(values.fz),
      mx: finiteOrUndefined(values.mx),
      my: finiteOrUndefined(values.my),
      mz: finiteOrUndefined(values.mz),
    };
  });

  const memberForces: MemberForceRow[] = memberRows.map((row) => {
    const values = (row.values ?? {}) as Record<string, unknown>;
    const at = (key: string): number | undefined => finiteOrUndefined(values[key]);
    return {
      loadCaseId: loadCaseLabelOf(resource, row.loadContextId),
      memberId: String(row.entityId ?? row.entityKind ?? ""),
      i: {
        fx: at("i.fx"),
        fy: at("i.fy"),
        fz: at("i.fz"),
        mx: at("i.mx"),
        my: at("i.my"),
        mz: at("i.mz"),
      },
      j: {
        fx: at("j.fx"),
        fy: at("j.fy"),
        fz: at("j.fz"),
        mx: at("j.mx"),
        my: at("j.my"),
        mz: at("j.mz"),
      },
    };
  });

  const comboCount = (kind: string): number =>
    rowsOf(kind).filter((row) => loadCaseLabelOf(resource, row.loadContextId) === "COMBO-1").length;

  return {
    displacements,
    reactions,
    memberForces,
    combinations: [{ caseId: "COMBO-1", displacements: comboCount("nodeDisplacement"), reactions: comboCount("supportReaction"), memberForces: comboCount("memberForce") }],
  };
}
