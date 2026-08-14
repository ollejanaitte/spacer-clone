/**
 * Superstructure geometry (Phase 5-01 C-01 FROZEN / Phase 5-02 WP-C1).
 *
 * Produces the GeometrySnapshot for the superstructure by feeding the
 * SuperstructureDocument through the geometry binding (WP-B) into the frozen
 * DefaultGeometryEngine. Road geometry is NOT reimplemented: the LINER
 * BuildIntermediateInput is assembled from the Road Module's official data
 * (RoadInputs), keeping LINER as the single alignment authority.
 */

import type { GeometrySnapshot } from "../../../apollo/geometry/types";
import { DefaultGeometryEngine } from "../../../apollo/geometry/engine";
import { createDefaultStationDefinition } from "../road/stationing";
import type { BuildIntermediateInput } from "../../../liner/core/pipeline/pipeline";
import type { VerticalElement } from "../../../liner/core/geometry/vertical";
import type { VerticalAlignmentDraft, VerticalElementDraft } from "../../../liner/schema/types";
import type { SuperstructureDocument } from "./superstructureTypes";
import { buildSuperstructureGeometryInput } from "./superstructureBindingNew";

/** Map a LINER core vertical element (startPhysicalDistance) to the draft (startStation). */
export function toVerticalElementDraft(element: VerticalElement): VerticalElementDraft {
  if (element.type === "grade") {
    return {
      type: "grade",
      id: element.id,
      startStation: element.startPhysicalDistance,
      endStation: element.startPhysicalDistance + element.length,
      startElevation: element.startElevation,
      grade: element.grade,
      length: element.length,
    };
  }
  return {
    type: "parabolic",
    id: element.id,
    startStation: element.startPhysicalDistance,
    endStation: element.startPhysicalDistance + element.length,
    startGrade: element.gradeIn,
    endGrade: element.gradeOut,
    startElevation: element.startElevation,
    length: element.length,
  };
}

export function toVerticalAlignmentDraft(vertical: readonly VerticalElement[]): VerticalAlignmentDraft {
  return {
    id: "road-vertical",
    elements: vertical.map(toVerticalElementDraft),
  };
}

export interface RoadModuleInputs {
  readonly horizontal?: unknown;
  readonly vertical?: readonly unknown[];
  readonly crossSections?: readonly unknown[];
}

/**
 * Assemble a LINER BuildIntermediateInput from the Road Module's official data.
 * Fail-closed: horizontal alignment is required. Returns undefined when absent.
 *
 * Vertical profile is passed to LINER only when the road declares one; when the
 * road has no vertical elements, the LINER z-fallback (first grade start
 * elevation) is used so sampling remains valid (no PROFILE_COVERAGE_GAP).
 */
export function buildLinerIntermediateFromRoad(inputs: RoadModuleInputs): BuildIntermediateInput | undefined {
  const horizontal = inputs.horizontal;
  if (!horizontal || typeof horizontal !== "object") {
    return undefined;
  }
  const vertical = (inputs.vertical ?? []) as readonly VerticalElement[];
  const crossSections = (inputs.crossSections ?? []) as BuildIntermediateInput["crossSections"];
  const z = vertical[0] && "startElevation" in vertical[0]
    ? (vertical[0] as { startElevation: number }).startElevation
    : 0;

  return {
    alignment: horizontal as BuildIntermediateInput["alignment"],
    stationDefinition: createDefaultStationDefinition(),
    ...(vertical.length > 0 ? { verticalAlignment: toVerticalAlignmentDraft(vertical) } : {}),
    crossSections: crossSections as BuildIntermediateInput["crossSections"],
    offsets: [0],
    sampleInterval: 10,
    z,
  };
}

export type GenerateSnapshotResult =
  | { ok: true; snapshot: GeometrySnapshot; fingerprint: string }
  | { ok: false; issues: readonly { path: string; message: string }[] };

/** Generate the GeometrySnapshot (binding → frozen engine). Fail-closed. */
export function generateSuperstructureSnapshot(
  intermediate: BuildIntermediateInput,
  document: SuperstructureDocument,
): GenerateSnapshotResult {
  let input;
  try {
    input = buildSuperstructureGeometryInput(document);
  } catch (error) {
    return { ok: false, issues: [{ path: "superstructureBinding", message: (error as Error).message }] };
  }
  try {
    const engine = new DefaultGeometryEngine(intermediate);
    const snapshot = engine.generateSnapshot(input);
    return { ok: true, snapshot, fingerprint: snapshot.fingerprint };
  } catch (error) {
    return { ok: false, issues: [{ path: "geometryEngine", message: (error as Error).message }] };
  }
}

/** Update the document's geometryReference from a generated snapshot (derived). */
export function withGeometryReference(
  document: SuperstructureDocument,
  snapshot: GeometrySnapshot,
  now: string = new Date().toISOString(),
): SuperstructureDocument {
  return {
    ...document,
    geometryReference: {
      snapshotFingerprint: snapshot.fingerprint,
      snapshotVersion: snapshot.snapshotVersion,
      generatedAt: now,
      model3DReference: { solidsDigest: null },
    },
    timestamps: { ...document.timestamps, derivedAt: now },
  };
}
