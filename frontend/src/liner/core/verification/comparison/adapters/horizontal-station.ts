import { ALIGNMENT_PROFILE_ROWS } from "../../reference-data/dataset-alignment-profile";
import { compareExternalValue, fromReferenceRow } from "../comparator";
import type { ExternalComparisonResult } from "../types";
import type { ComparisonKind } from "../types";
import type { LinearAlignment } from "../../../types";
import {
  buildClAlignmentFixture,
  buildEclAlignmentFixture,
  buildHclAlignmentFixture,
} from "../fixtures/horizontal-station";

/**
 * P02-02 adapter: horizontal_alignment + station external comparison.
 *
 * Honest comparability:
 *  - horizontal_alignment element length / radius / parameter rows are INPUT_PARITY:
 *    the current pipeline consumes them as input model values. The "actual" is the
 *    reconstructed fixture input value (serialization parity), NOT a derived calculation.
 *  - station origin row (REF-station-001) is INPUT_PARITY (originDisplayedStation input).
 *  - other station rows are NOT_COMPARABLE: the JIP output station numbers use station
 *    equations that are not present in the R1-P01 dataset, so derived-station comparison
 *    cannot be reproduced honestly.
 */

function elementActual(alignment: LinearAlignment, referenceId: string): number | null {
  if (referenceId === "REF-horizontal-001") return alignment.elements[0]?.length ?? null;
  if (referenceId === "REF-horizontal-004") return alignment.elements[1]?.length ?? null;
  if (referenceId === "REF-horizontal-005") return alignment.elements[2]?.length ?? null;
  if (referenceId === "REF-horizontal-002" || referenceId === "REF-horizontal-007" || referenceId === "REF-horizontal-010") {
    const el = alignment.elements[0];
    return el && "radius" in el ? el.radius : null;
  }
  if (referenceId === "REF-horizontal-003") {
    const el = alignment.elements[1];
    return el && "clothoidParameter" in el ? el.clothoidParameter : null;
  }
  if (referenceId === "REF-horizontal-006") return alignment.elements[0]?.length ?? null;
  if (referenceId === "REF-horizontal-008") return alignment.elements[1]?.length ?? null;
  if (referenceId === "REF-horizontal-009") return alignment.elements[0]?.length ?? null;
  return null;
}

const CL_ROWS = new Set([
  "REF-horizontal-001",
  "REF-horizontal-002",
  "REF-horizontal-003",
  "REF-horizontal-004",
  "REF-horizontal-005",
]);
const ECL_ROWS = new Set(["REF-horizontal-006", "REF-horizontal-007", "REF-horizontal-008"]);
const HCL_ROWS = new Set(["REF-horizontal-009", "REF-horizontal-010"]);

export function runHorizontalStationComparison(): ExternalComparisonResult[] {
  const cl = buildClAlignmentFixture();
  const ecl = buildEclAlignmentFixture();
  const hcl = buildHclAlignmentFixture();
  const fixtureByRow = (id: string): LinearAlignment => {
    if (CL_ROWS.has(id)) return cl.alignment;
    if (ECL_ROWS.has(id)) return ecl.alignment;
    if (HCL_ROWS.has(id)) return hcl.alignment;
    return cl.alignment;
  };
  const results: ExternalComparisonResult[] = [];

  for (const row of ALIGNMENT_PROFILE_ROWS) {
    if (row.category === "horizontal_alignment") {
      const actual = elementActual(fixtureByRow(row.reference_id), row.reference_id);
      const kind: ComparisonKind = actual === null ? "NOT_COMPARABLE" : "INPUT_PARITY";
      const input = fromReferenceRow(row, actual, row.normalized_unit, row.coordinate_system, kind);
      results.push(compareExternalValue(input));
    } else if (row.category === "station") {
      if (row.reference_id === "REF-station-001") {
        const input = fromReferenceRow(
          row,
          cl.originDisplayedStation,
          row.normalized_unit,
          row.coordinate_system,
          "INPUT_PARITY",
        );
        results.push(compareExternalValue(input));
      } else {
        const input = fromReferenceRow(
          row,
          null,
          null,
          row.coordinate_system,
          "NOT_COMPARABLE",
        );
        results.push({
          ...compareExternalValue(input),
          status: "NOT_COMPARABLE",
          message:
            "JIP station numbers use station equations not present in the R1-P01 dataset; " +
            "derived-station comparison not reproducible.",
        });
      }
    }
  }

  return results;
}
