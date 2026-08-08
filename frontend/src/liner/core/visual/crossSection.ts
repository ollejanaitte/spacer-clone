/**
 * X-SECT schematic adapter (STEP-3 S3-UX04).
 *
 * Builds a SECTION DiagramPayload from the draft's cross-section template /
 * offset lines, mapping input fields (width / crossfall / pivot / crown /
 * edge) to stable diagram object ids per UX-P03. Rule warnings (widening /
 * curve-length / clearance) attach to the relevant object ids so the SECTION
 * schematic can highlight affected elements.
 *
 * No geometry is computed here; object ids derive from existing draft
 * entities (offset line ids / template ids).
 */
import type {
  DiagramPayload,
  VisualError,
  VisualObject,
  VisualWarning,
} from "./contract";
import type {
  CrossSectionOffsetLineDraft,
  CrossSectionTemplateDraft,
} from "../../schema/types";

export type CrossSectionField =
  | "width"
  | "crossfall"
  | "pivotOffset"
  | "crown"
  | "edge";

export interface BuildSectionPayloadOptions {
  template?: CrossSectionTemplateDraft;
  offsetLines?: readonly CrossSectionOffsetLineDraft[];
  selectedField?: CrossSectionField;
  selectedLineId?: string;
  warnings?: VisualWarning[];
  errors?: VisualError[];
  visualState?: "INPUT" | "VALIDATED" | "CALCULATED";
}

export function buildSectionPayload(
  options: BuildSectionPayloadOptions,
): DiagramPayload {
  const offsetLines = options.offsetLines ?? options.template?.offsetLines ?? [];
  const objects: VisualObject[] = offsetLines.map((line) => ({
    objectId: `s-${line.id}`,
    kind: "section-element",
    entityId: line.id,
    label: `section ${line.id}`,
    plane: "SECTION",
  }));

  const mappings = offsetLines.flatMap((line) =>
    (["width", "crossfall"] as const).map((fieldName) => ({
      fieldName,
      objectId: `s-${line.id}`,
    })),
  );

  return {
    plane: "SECTION",
    objects,
    mappings,
    highlights: [],
    warnings: options.warnings ?? [],
    errors: options.errors ?? [],
    selectedObjectId: options.selectedLineId
      ? `s-${options.selectedLineId}`
      : undefined,
    geometryRef: {
      offsetLineCount: offsetLines.length,
      visualState: options.visualState ?? "CALCULATED",
    },
  };
}

/** Rule warning targeting a section line id (e.g. widening / clearance). */
export function sectionWarning(
  lineId: string,
  ruleId: string,
  message: string,
  diagnosticCode?: string,
): VisualWarning {
  return { objectId: `s-${lineId}`, ruleId, message, diagnosticCode };
}

/** Rule error targeting a section line id (e.g. width < 0). */
export function sectionError(
  lineId: string,
  message: string,
  errorType: "FIELD_ERROR" | "GEOMETRY_ERROR" = "FIELD_ERROR",
  diagnosticCode?: string,
): VisualError {
  return { objectId: `s-${lineId}`, errorType, message, diagnosticCode };
}
