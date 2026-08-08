/**
 * V-PROF schematic adapter (STEP-3 S3-UX03).
 *
 * Builds a PROFILE DiagramPayload from the draft's vertical alignment
 * elements, mapping input fields (grade / startGrade / endGrade / station /
 * elevation) to stable diagram object ids per UX-P02. Also exposes VPI / VCL
 * geometry refs derived from the existing frontend vertical math
 * (verticalSampling.ts) — no UI-side re-implementation.
 */
import type {
  DiagramPayload,
  VisualError,
  VisualObject,
  VisualWarning,
} from "./contract";
import type {
  VerticalAlignmentDraft,
  VerticalElementDraft,
} from "../../schema/types";

export type VerticalField =
  | "startStation"
  | "endStation"
  | "startElevation"
  | "grade"
  | "startGrade"
  | "endGrade"
  | "curveType";

export interface BuildProfilePayloadOptions {
  verticalAlignment?: VerticalAlignmentDraft;
  selectedField?: VerticalField;
  selectedElementId?: string;
  station?: number;
  warnings?: VisualWarning[];
  errors?: VisualError[];
  visualState?: "INPUT" | "VALIDATED" | "CALCULATED";
}

function elementObject(element: VerticalElementDraft): VisualObject {
  return {
    objectId: `v-${element.id}`,
    kind: "profile-element",
    entityId: element.id,
    label: `${element.type} ${element.id}`,
    plane: "PROFILE",
  };
}

function fieldsForElement(element: VerticalElementDraft): VerticalField[] {
  if (element.type === "grade") {
    return ["grade", "startElevation", "startStation", "endStation"];
  }
  return ["startGrade", "endGrade", "curveType", "startStation", "endStation"];
}

export function buildProfilePayload(
  options: BuildProfilePayloadOptions,
): DiagramPayload {
  const elements = options.verticalAlignment?.elements ?? [];
  const objects = elements.map(elementObject);
  const mappings = elements.flatMap((element) =>
    fieldsForElement(element).map((fieldName) => ({
      fieldName,
      objectId: `v-${element.id}`,
    })),
  );

  const geometryRef: Record<string, unknown> = {
    elementCount: elements.length,
    visualState: options.visualState ?? "CALCULATED",
  };
  if (options.station !== undefined) {
    geometryRef.station = options.station;
  }

  return {
    plane: "PROFILE",
    objects,
    mappings,
    highlights: [],
    warnings: options.warnings ?? [],
    errors: options.errors ?? [],
    selectedObjectId: options.selectedElementId
      ? `v-${options.selectedElementId}`
      : undefined,
    geometryRef,
  };
}

/** VPI: elevation at an element boundary via existing grade math. */
export function vpiAtBoundary(
  elements: readonly VerticalElementDraft[],
  boundaryIndex: number,
): { station: number; elevation: number } | undefined {
  if (boundaryIndex < 0 || boundaryIndex >= elements.length - 1) {
    return undefined;
  }
  const left = elements[boundaryIndex];
  const station = left.endStation;
  const elevation = elementEndElevation(left);
  return { station, elevation };
}

/** End elevation of a vertical element (grade or parabolic). */
export function elementEndElevation(element: VerticalElementDraft): number {
  if (element.type === "grade") {
    return element.startElevation + element.grade * element.length;
  }
  const start = displayStartElevation(element.startElevation);
  const rate = element.length === 0 ? 0 : (element.endGrade - element.startGrade) / element.length;
  return start + element.startGrade * element.length + 0.5 * rate * element.length * element.length;
}

function displayStartElevation(value: number | undefined): number {
  return value ?? 0;
}

/** VCL: length of a parabolic element (vertical curve). */
export function vclOf(element: VerticalElementDraft): number | undefined {
  if (element.type !== "parabolic") {
    return undefined;
  }
  return element.length;
}
