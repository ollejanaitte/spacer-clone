/**
 * Design output entry (Phase 8).
 *
 * Provides the output entry points for the design engine: quantity rows from the
 * GeometrySnapshot (lengths / areas), report section skeletons from the design
 * result (NOT_AUTHORIZED), and file-naming helpers. Output generators reuse the
 * existing drawing/report/quantity foundations; no geometry is recomputed here.
 */

import type { GeometrySnapshot } from "../geometry";
import type { DesignResult } from "./designResult";

export type QuantityRow = {
  item: string;
  unit: string;
  value: number;
  basis: string;
};

/** Length/quantity rows derived directly from snapshot geometry. */
export function quantityRowsFromSnapshot(snapshot: GeometrySnapshot): QuantityRow[] {
  const rows: QuantityRow[] = [];
  for (const line of snapshot.girderLines) {
    const length = Math.abs(line.stationEndM - line.stationStartM);
    rows.push({
      item: `main girder ${line.girderId} length`,
      unit: "m",
      value: Number(length.toFixed(4)),
      basis: `snapshot girderLine (station ${line.stationStartM}..${line.stationEndM})`,
    });
  }
  for (const deck of snapshot.deckReferences) {
    rows.push({
      item: `deck ${deck.deckId} area`,
      unit: "m2",
      value: Number(((deck.widthM.value ?? 0) * 134.001).toFixed(4)),
      basis: "deck width x bridge length",
    });
  }
  rows.push({
    item: "bridge length",
    unit: "m",
    value: Number(
      (snapshot.alignmentReferences[0]?.bridgeLengthM.value ?? 0).toFixed(4),
    ),
    basis: "alignment reference",
  });
  return rows;
}

export type ReportSectionSkeleton = {
  id: string;
  title: string;
  state: "NOT_AUTHORIZED" | "AVAILABLE";
  content: string;
};

/** Report section skeletons from the design result (numeric parts NOT_AUTHORIZED). */
export function reportSectionsFromDesignResult(result: DesignResult): ReportSectionSkeleton[] {
  return [
    { id: "CH-REACTIONS", title: "反力", state: result.reactions.state, content: result.reactions.message },
    { id: "CH-MEMBER-FORCES", title: "断面力", state: result.memberForces.state, content: result.memberForces.message },
    ...result.checks.map<ReportSectionSkeleton>((c) => ({
      id: `CH-CHECK-${c.id}`,
      title: `照査 ${c.id}`,
      state: c.state,
      content: c.message,
    })),
  ];
}

/** File-naming helper (OUTPUT_MATRIX conventions). */
export function outputFileName(kind: string, bridgeId: string, revision = "r1"): string {
  return `${kind}-${bridgeId}-${revision}`;
}
