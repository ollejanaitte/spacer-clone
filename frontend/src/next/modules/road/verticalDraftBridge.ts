/**
 * Vertical alignment draft <-> core element bridge (Phase 7.4).
 *
 * The rescued LINER editors operate on the schema draft format
 * (`VerticalElementDraft`, startStation/endStation), while the Road Module
 * intermediate/preview pipeline operates on the core format
 * (`VerticalElement`, startPhysicalDistance). These converters let the Road
 * Module shell derive previews from the canonical editor draft.
 */

import type {
  VerticalAlignmentDraft,
  VerticalElementDraft,
} from "../../../liner/schema/types";
import type { VerticalElement } from "../../../liner/core/geometry/vertical";

/** Schema draft elements -> core elements (for preview / intermediate). */
export function verticalDraftToElements(
  elements: readonly VerticalElementDraft[],
): VerticalElement[] {
  return elements.map((el) => {
    if (el.type === "grade") {
      return {
        type: "grade" as const,
        id: el.id,
        startPhysicalDistance: el.startStation,
        startElevation: el.startElevation,
        grade: el.grade,
        length: el.length,
      };
    }
    return {
      type: "parabolic" as const,
      id: el.id,
      startPhysicalDistance: el.startStation,
      startElevation: el.startElevation ?? 0,
      gradeIn: el.startGrade,
      gradeOut: el.endGrade,
      length: el.length,
    };
  });
}

/** Core elements -> schema draft elements (for the editor / canonical draft). */
export function verticalElementsToDraft(
  elements: readonly VerticalElement[],
): VerticalElementDraft[] {
  return elements.map((el) => {
    if (el.type === "grade") {
      return {
        type: "grade" as const,
        id: el.id,
        startStation: el.startPhysicalDistance,
        endStation: el.startPhysicalDistance + el.length,
        startElevation: el.startElevation,
        grade: el.grade,
        length: el.length,
      };
    }
    return {
      type: "parabolic" as const,
      id: el.id,
      startStation: el.startPhysicalDistance,
      endStation: el.startPhysicalDistance + el.length,
      startGrade: el.gradeIn,
      endGrade: el.gradeOut,
      startElevation: el.startElevation,
      length: el.length,
    };
  });
}

/** Derive the core vertical elements from a draft's verticalAlignment. */
export function verticalDraftAlignmentToElements(
  verticalAlignment: VerticalAlignmentDraft | undefined,
): VerticalElement[] {
  if (!verticalAlignment) {
    return [];
  }
  return verticalDraftToElements(verticalAlignment.elements);
}
