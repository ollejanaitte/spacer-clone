/**
 * H-ALIGN schematic adapter (STEP-3 S3-UX02).
 *
 * Builds a PLAN DiagramPayload from the draft's horizontal alignment elements
 * so the LinerGridPreview axis can highlight the element that corresponds to a
 * focused input field (radius / A / L / azimuth), per UX-P01.
 *
 * No geometry is computed here: element metadata comes from the draft
 * (LinerDraft alignment elements) and stable IDs map 1:1 to backend
 * alignment element ids.
 */
import type {
  DiagramPayload,
  VisualError,
  VisualObject,
  VisualWarning,
} from "./contract";
import type { LinerDraftAlignmentElement } from "../../adapters/linerUiAdapter";

export type HorizontalAlignmentField =
  | "startX"
  | "startY"
  | "azimuth"
  | "length"
  | "radius"
  | "clothoidParameter"
  | "startRadius"
  | "endRadius";

export interface BuildPlanPayloadOptions {
  elements: readonly LinerDraftAlignmentElement[];
  selectedField?: HorizontalAlignmentField;
  selectedElementIndex?: number;
  warnings?: VisualWarning[];
  errors?: VisualError[];
  visualState?: "INPUT" | "VALIDATED" | "CALCULATED";
}

function elementObject(
  element: LinerDraftAlignmentElement,
  index: number,
): VisualObject {
  return {
    objectId: `align-${element.id}`,
    kind: "alignment-element",
    entityId: element.id,
    label: `${element.type} ${element.id}`,
    plane: "PLAN",
  };
}

function fieldForElement(
  element: LinerDraftAlignmentElement,
): HorizontalAlignmentField | undefined {
  if (element.type === "arc") return "radius";
  if (element.type === "clothoid") return "clothoidParameter";
  return "length";
}

export function buildPlanPayload(
  options: BuildPlanPayloadOptions,
): DiagramPayload {
  const { elements } = options;
  const objects = elements.map(elementObject);
  const mappings = elements.flatMap((element) => {
    const field = fieldForElement(element);
    return field
      ? [{ fieldName: field, objectId: `align-${element.id}` }]
      : [];
  });

  let selectedObjectId: string | undefined;
  if (options.selectedElementIndex !== undefined && elements[options.selectedElementIndex]) {
    selectedObjectId = `align-${elements[options.selectedElementIndex].id}`;
  }

  return {
    plane: "PLAN",
    objects,
    mappings,
    highlights: [],
    warnings: options.warnings ?? [],
    errors: options.errors ?? [],
    selectedObjectId,
    geometryRef: {
      elementCount: elements.length,
      visualState: options.visualState ?? "CALCULATED",
    },
  };
}

/** True when the given element is the one highlighted by the selected field. */
export function isElementSelectedByField(
  payload: DiagramPayload,
  element: LinerDraftAlignmentElement,
  field: HorizontalAlignmentField,
): boolean {
  return (
    payload.selectedObjectId === `align-${element.id}` &&
    payload.mappings.some(
      (m) => m.fieldName === field && m.objectId === `align-${element.id}`,
    )
  );
}
