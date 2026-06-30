import type { VerticalAlignmentDraft } from "../schema/types";
import { createIssue, LINER_DIAGNOSTIC_CODES } from "./diagnostics";
import { DEFAULT_TOLERANCES } from "./tolerances";
import type { ValidationIssue } from "./types";

function verticalProfileEndStation(verticalAlignment: VerticalAlignmentDraft): number {
  let maxEnd = 0;
  for (const element of verticalAlignment.elements) {
    maxEnd = Math.max(maxEnd, element.endStation);
  }
  return maxEnd;
}

export function checkVerticalProfileEndCoverage(
  verticalAlignment: VerticalAlignmentDraft | undefined,
  horizontalTotalLength: number,
): ValidationIssue[] {
  if (verticalAlignment === undefined) {
    return [];
  }

  if (verticalAlignment.elements.length === 0) {
    return [
      createIssue("error", LINER_DIAGNOSTIC_CODES.profileCoverageGap, {
        entityType: "verticalAlignment",
        detail: "No vertical alignment elements; profile does not cover horizontal alignment.",
      }),
    ];
  }

  const profileEnd = verticalProfileEndStation(verticalAlignment);
  const gap = horizontalTotalLength - profileEnd;

  if (gap > DEFAULT_TOLERANCES.station) {
    return [
      createIssue("error", LINER_DIAGNOSTIC_CODES.profileCoverageGap, {
        entityType: "verticalAlignment",
        entityId: verticalAlignment.id,
        station: profileEnd,
        detail: `Vertical profile ends at ${profileEnd} m but horizontal alignment ends at ${horizontalTotalLength} m (gap ${gap} m).`,
      }),
    ];
  }

  return [];
}
