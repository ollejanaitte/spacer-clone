/**
 * B-BRIDGE schematic adapter (STEP-3 S3-UX05).
 *
 * Builds a BRIDGE (MIXED) DiagramPayload from pier / span drafts, mapping
 * input fields (station / skew / bearingOffset / transverseOffset) to stable
 * object ids per UX-P04. Node objects are emitted when girder lines are
 * supplied.
 *
 * No geometry is computed here; ids derive from existing draft entities.
 */
import type {
  DiagramPayload,
  VisualError,
  VisualObject,
  VisualWarning,
} from "./contract";
import type { PierDraft, SpanDraft } from "../../schema/types";

export type BridgeField = "station" | "skew" | "bearingOffset" | "transverseOffset";

export interface BuildBridgePayloadOptions {
  piers?: readonly PierDraft[];
  spans?: readonly SpanDraft[];
  selectedPierId?: string;
  selectedSpanId?: string;
  selectedField?: BridgeField;
  girderLines?: readonly { girderId: string; transverseOffset: number }[];
  warnings?: VisualWarning[];
  errors?: VisualError[];
  visualState?: "INPUT" | "VALIDATED" | "CALCULATED";
}

export function buildBridgePayload(
  options: BuildBridgePayloadOptions,
): DiagramPayload {
  const piers = options.piers ?? [];
  const spans = options.spans ?? [];
  const objects: VisualObject[] = [
    ...piers.map((pier) => ({
      objectId: `pier-${pier.id}`,
      kind: "pier" as const,
      entityId: pier.id,
      label: `pier ${pier.id}`,
      plane: "MIXED" as const,
    })),
    ...spans.map((span) => ({
      objectId: `span-${span.id}`,
      kind: "section-element" as const,
      entityId: span.id,
      label: `span ${span.id}`,
      plane: "MIXED" as const,
    })),
  ];

  for (const girder of options.girderLines ?? []) {
    objects.push({
      objectId: `girder-${girder.girderId}`,
      kind: "girder",
      entityId: girder.girderId,
      label: `girder ${girder.girderId}`,
      plane: "MIXED",
    });
  }

  const mappings = [
    ...piers.flatMap((pier) =>
      (["station", "skew", "bearingOffset"] as const).map((fieldName) => ({
        fieldName,
        objectId: `pier-${pier.id}`,
      })),
    ),
    ...(options.girderLines ?? []).map((girder) => ({
      fieldName: "transverseOffset" as const,
      objectId: `girder-${girder.girderId}`,
    })),
  ];

  let selectedObjectId: string | undefined;
  if (options.selectedPierId) {
    selectedObjectId = `pier-${options.selectedPierId}`;
  } else if (options.selectedSpanId) {
    selectedObjectId = `span-${options.selectedSpanId}`;
  }

  return {
    plane: "MIXED",
    objects,
    mappings,
    highlights: [],
    warnings: options.warnings ?? [],
    errors: options.errors ?? [],
    selectedObjectId,
    geometryRef: {
      pierCount: piers.length,
      spanCount: spans.length,
      visualState: options.visualState ?? "CALCULATED",
    },
  };
}

/** Rule warning targeting a pier (e.g. pier out of alignment / clearance). */
export function pierWarning(
  pierId: string,
  ruleId: string,
  message: string,
  diagnosticCode?: string,
): VisualWarning {
  return { objectId: `pier-${pierId}`, ruleId, message, diagnosticCode };
}

/** Geometry error targeting a pier (e.g. skew out of range). */
export function pierError(
  pierId: string,
  message: string,
  diagnosticCode?: string,
): VisualError {
  return {
    objectId: `pier-${pierId}`,
    errorType: "GEOMETRY_ERROR",
    message,
    diagnosticCode,
  };
}
