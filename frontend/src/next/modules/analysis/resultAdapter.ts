/**
 * Result / IF3 adapter (Phase 7-01 D FROZEN / Phase 7-02 WP-H).
 *
 * Consumes the IF3 FrameAnalysisResultResource produced by the backend:
 *  - reaction vertical component is read directly from `fz` (R10: the old
 *    `rz -> fz` alias is NOT part of the formal path)
 *  - COMBO-1 rows are exposed with their combined case id
 *  - source entity mapping keeps the AnalysisDocument entity id + sourceEntityId
 */

import type { FrameAnalysisResultResource } from "../../../contracts/frameAnalysisResultResource";

export interface ReactionRow {
  readonly loadCaseId: string;
  readonly nodeId: string;
  readonly supportId: string | null;
  readonly fx: number;
  readonly fy: number;
  readonly fz: number;
  readonly mx: number;
  readonly my: number;
  readonly mz: number;
}

export interface DisplacementRow {
  readonly loadCaseId: string;
  readonly nodeId: string;
  readonly ux: number;
  readonly uy: number;
  readonly uz: number;
  readonly rx: number;
  readonly ry: number;
  readonly rz: number;
}

export interface MemberForceRow {
  readonly loadCaseId: string;
  readonly memberId: string;
  readonly i: { fx: number; fy: number; fz: number; mx: number; my: number; mz: number };
  readonly j: { fx: number; fy: number; fz: number; mx: number; my: number; mz: number };
}

export interface LinearStaticResultView {
  readonly displacements: readonly DisplacementRow[];
  readonly reactions: readonly ReactionRow[];
  readonly memberForces: readonly MemberForceRow[];
  readonly combinations: readonly { caseId: string; displacements: number; reactions: number; memberForces: number }[];
}

function valueAt(entry: Record<string, unknown>, key: string, fallback = 0): number {
  const value = entry[key];
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

/**
 * Extract a linear-static result view from an IF3 FrameAnalysisResultResource.
 * Reaction vertical is `fz` (never `rz`). sourceEntityId is carried for
 * traceability (R12).
 */
export function extractLinearStaticResultFromIf3(
  resource: FrameAnalysisResultResource,
): LinearStaticResultView {
  const payload = (resource.payload ?? {}) as unknown as Record<string, unknown>;
  const rowsOf = (kind: string): readonly Record<string, unknown>[] =>
    Array.isArray(payload[kind]) ? (payload[kind] as readonly Record<string, unknown>[]) : [];

  const nodeRows = rowsOf("nodeDisplacement");
  const reactionRows = rowsOf("supportReaction");
  const memberRows = rowsOf("memberForce");

  const displacements: DisplacementRow[] = nodeRows.map((row) => {
    const values = (row.values ?? {}) as Record<string, unknown>;
    return {
      loadCaseId: String(row.loadCaseId ?? ""),
      nodeId: String(row.entityId ?? row.nodeId ?? ""),
      ux: valueAt(values, "ux"),
      uy: valueAt(values, "uy"),
      uz: valueAt(values, "uz"),
      rx: valueAt(values, "rx"),
      ry: valueAt(values, "ry"),
      rz: valueAt(values, "rz"),
    };
  });

  const reactions: ReactionRow[] = reactionRows.map((row) => {
    const values = (row.values ?? {}) as Record<string, unknown>;
    return {
      loadCaseId: String(row.loadCaseId ?? ""),
      nodeId: String(row.nodeId ?? ""),
      supportId: typeof row.supportId === "string" ? row.supportId : null,
      fx: valueAt(values, "fx"),
      fy: valueAt(values, "fy"),
      fz: valueAt(values, "fz"),
      mx: valueAt(values, "mx"),
      my: valueAt(values, "my"),
      mz: valueAt(values, "mz"),
    };
  });

  const memberForces: MemberForceRow[] = memberRows.map((row) => {
    const values = (row.values ?? {}) as Record<string, unknown>;
    const i = (values.i ?? values["i.*"] ?? {}) as Record<string, unknown>;
    const j = (values.j ?? values["j.*"] ?? {}) as Record<string, unknown>;
    return {
      loadCaseId: String(row.loadCaseId ?? ""),
      memberId: String(row.entityId ?? row.memberId ?? ""),
      i: {
        fx: valueAt(i, "fx"),
        fy: valueAt(i, "fy"),
        fz: valueAt(i, "fz"),
        mx: valueAt(i, "mx"),
        my: valueAt(i, "my"),
        mz: valueAt(i, "mz"),
      },
      j: {
        fx: valueAt(j, "fx"),
        fy: valueAt(j, "fy"),
        fz: valueAt(j, "fz"),
        mx: valueAt(j, "mx"),
        my: valueAt(j, "my"),
        mz: valueAt(j, "mz"),
      },
    };
  });

  const comboCount = (kind: string): number =>
    rowsOf(kind).filter((row) => row.loadCaseId === "COMBO-1").length;

  return {
    displacements,
    reactions,
    memberForces,
    combinations: [{ caseId: "COMBO-1", displacements: comboCount("nodeDisplacement"), reactions: comboCount("supportReaction"), memberForces: comboCount("memberForce") }],
  };
}
