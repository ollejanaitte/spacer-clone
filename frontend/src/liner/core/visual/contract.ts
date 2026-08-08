/**
 * Diagram Data Contract (STEP-3 S3-UX01).
 *
 * TS mirror of the Step2 backend contract
 * (backend/rule_engine/visual/contract.py) so the UI and backend share one
 * source of truth for field <-> diagram mapping, visual states, highlight,
 * warning and error payloads.
 *
 * - VisualObject: a diagram element with a stable ID tied 1:1 to a real
 *   computation entity (alignment element id, profile element id, section
 *   element id, pier id, girder id, node id, rule diagnostic id).
 * - VisualState: INPUT | VALIDATED | CALCULATED (UX-P06 FROZEN).
 * - FieldToDiagramMapping: unique bidirectional mapping input field <-> diagram
 *   object (used for field focus -> highlight and diagram click -> field).
 * - DiagramPayload: per-plane immutable payload consumed by the schematic UI.
 */

export const VISUAL_STATES = ["INPUT", "VALIDATED", "CALCULATED"] as const;
export type VisualState = (typeof VISUAL_STATES)[number];

export type VisualObjectKind =
  | "alignment-element"
  | "profile-element"
  | "section-element"
  | "pier"
  | "girder"
  | "node"
  | "rule-diagnostic";

export type DiagramPlane = "PLAN" | "PROFILE" | "SECTION" | "MIXED";

export interface VisualObject {
  objectId: string;
  kind: VisualObjectKind;
  entityId: string;
  label?: string;
  plane?: DiagramPlane;
}

export interface FieldToDiagramMapping {
  fieldName: string;
  objectId: string;
  direction?: "FIELD_TO_DIAGRAM" | "DIAGRAM_TO_FIELD" | "BOTH";
}

export interface VisualHighlight {
  objectId: string;
  state?: VisualState;
  reason?: string;
}

export interface VisualWarning {
  objectId: string;
  ruleId: string;
  message: string;
  diagnosticCode?: string;
}

export interface VisualError {
  objectId: string;
  errorType?: "FIELD_ERROR" | "GEOMETRY_ERROR";
  message?: string;
  diagnosticCode?: string;
}

export interface DiagramPayload {
  plane: DiagramPlane;
  objects: VisualObject[];
  mappings: FieldToDiagramMapping[];
  highlights: VisualHighlight[];
  warnings: VisualWarning[];
  errors: VisualError[];
  selectedObjectId?: string;
  geometryRef: Record<string, unknown>;
}

/** Resolve the object that maps to a given input field (or undefined). */
export function objectIdForField(
  payload: DiagramPayload,
  fieldName: string,
): string | undefined {
  const mapping = payload.mappings.find((m) => m.fieldName === fieldName);
  return mapping?.objectId;
}

/** True when the field's diagram object is the current selection. */
export function isFieldSelected(
  payload: DiagramPayload,
  fieldName: string,
): boolean {
  const objectId = objectIdForField(payload, fieldName);
  return objectId !== undefined && payload.selectedObjectId === objectId;
}

/** Collect errors affecting a given diagram object. */
export function errorsForObject(
  payload: DiagramPayload,
  objectId: string,
): VisualError[] {
  return payload.errors.filter((e) => e.objectId === objectId);
}

/** Collect warnings affecting a given diagram object. */
export function warningsForObject(
  payload: DiagramPayload,
  objectId: string,
): VisualWarning[] {
  return payload.warnings.filter((w) => w.objectId === objectId);
}
