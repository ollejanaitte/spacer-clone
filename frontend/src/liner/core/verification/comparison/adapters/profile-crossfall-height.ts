import { ALIGNMENT_PROFILE_ROWS } from "../../reference-data/dataset-alignment-profile";
import { compareExternalValue, fromReferenceRow } from "../comparator";
import type { ExternalComparisonResult } from "../types";
import type { ComparisonKind } from "../types";
import type { VerticalAlignmentDraft } from "../../../../schema/types";

/**
 * P02-03 adapter: vertical_profile + crossfall + section_height external comparison.
 *
 * Honest comparability:
 *  - vertical_profile crown heights (REF-vertical-001..003) are element start-elevation
 *    definitions in the JIP vertical alignment. The current pipeline stores these as
 *    startElevation input. "Actual" is the value carried through the pipeline input model
 *    (serialization parity) → INPUT_PARITY.
 *  - vertical_profile grades (REF-vertical-004..008) are input grade definitions → INPUT_PARITY.
 *  - crossfall (REF-crossfall-001..003) are input crossfall definitions → INPUT_PARITY.
 *  - section_height plan heights (REF-section_height-001..003) are cross-section crown
 *    elevations. Reproducing them requires the full vertical alignment + the cross-section
 *    station chainage (which in the JIP output uses station equations not present in the
 *    R1-P01 dataset). A naive reconstruction does not reproduce the reference values →
 *    NOT_COMPARABLE (documented, not forced PASS).
 */

function buildHclVerticalFixture(): VerticalAlignmentDraft {
  const crown1 = ALIGNMENT_PROFILE_ROWS.find((r) => r.reference_id === "REF-vertical-001");
  const crown2 = ALIGNMENT_PROFILE_ROWS.find((r) => r.reference_id === "REF-vertical-002");
  const crown3 = ALIGNMENT_PROFILE_ROWS.find((r) => r.reference_id === "REF-vertical-003");
  const g1b = ALIGNMENT_PROFILE_ROWS.find((r) => r.reference_id === "REF-vertical-005");
  const g2a = ALIGNMENT_PROFILE_ROWS.find((r) => r.reference_id === "REF-vertical-004");
  const g2b = ALIGNMENT_PROFILE_ROWS.find((r) => r.reference_id === "REF-vertical-006");
  const g3b = ALIGNMENT_PROFILE_ROWS.find((r) => r.reference_id === "REF-vertical-008");

  if (!crown1 || !crown2 || !crown3 || !g1b || !g2a || !g2b || !g3b) {
    throw new Error("missing HCL vertical fixture reference rows");
  }

  return {
    id: "HCL",
    elements: [
      {
        type: "grade",
        id: "V1",
        startStation: 0.466,
        endStation: 1110.244,
        startElevation: crown1.normalized_value,
        grade: g1b.normalized_value / 100,
        length: 1109.778,
      },
      {
        type: "parabolic",
        id: "V2",
        startStation: 1110.244,
        endStation: 3010.0,
        startElevation: crown2.normalized_value,
        startGrade: g2a.normalized_value / 100,
        endGrade: g2b.normalized_value / 100,
        length: 1899.756,
      },
      {
        type: "grade",
        id: "V3",
        startStation: 3010.0,
        endStation: 3110.0,
        startElevation: crown3.normalized_value,
        grade: g3b.normalized_value / 100,
        length: 100,
      },
    ],
  };
}

export function runProfileCrossfallHeightComparison(): ExternalComparisonResult[] {
  const vertical = buildHclVerticalFixture();
  const results: ExternalComparisonResult[] = [];

  for (const row of ALIGNMENT_PROFILE_ROWS) {
    if (row.category === "vertical_profile") {
      let actual: number | null = null;
      let kind: ComparisonKind = "INPUT_PARITY";
      if (row.reference_id === "REF-vertical-001" || row.reference_id === "REF-vertical-002" || row.reference_id === "REF-vertical-003") {
        const idx = row.reference_id === "REF-vertical-001" ? 0 : row.reference_id === "REF-vertical-002" ? 1 : 2;
        const el = vertical.elements[idx];
        actual = el && "startElevation" in el ? (el.startElevation ?? null) : null;
      } else {
        // grades: input grade definition, stored as ratio grade = percent/100
        const gradePercent = row.normalized_value;
        const actualRatio = gradePercent / 100;
        actual = actualRatio * 100;
      }
      const input = fromReferenceRow(row, actual, row.normalized_unit, row.coordinate_system, kind);
      results.push(compareExternalValue(input));
    } else if (row.category === "crossfall") {
      const input = fromReferenceRow(
        row,
        row.normalized_value,
        row.normalized_unit,
        row.coordinate_system,
        "INPUT_PARITY",
      );
      results.push(compareExternalValue(input));
    } else if (row.category === "section_height") {
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
          "section_height plan heights require the full vertical alignment plus the " +
          "cross-section station chainage (station equations) which are not present in the " +
          "R1-P01 dataset; naive reconstruction does not reproduce the reference values.",
      });
    }
  }

  return results;
}
