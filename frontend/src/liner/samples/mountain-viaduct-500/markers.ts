/**
 * Mountain sample 3D markers — pier / abutment placement (MOUNTAIN-SAMPLE P11).
 *
 * Resolves pier / abutment positions from the existing solvers so the 3D
 * viewer never hand-places supports:
 *   - X / Y: evaluateAlignmentAtDistance(station) on the alignment
 *   - Z    : elevationAt(station) on the vertical profile
 *
 * The result is a marker (arrow / cone) position + orientation for the 3D view.
 */
import type { BuildIntermediateInput } from "../../core/pipeline/pipeline";
import type { PierDraft, SpanDraft } from "../../schema/types";
import { evaluateAlignmentAtDistance } from "../../core/geometry/horizontal";
import { elevationAt } from "../../core/elevationAt";
import { pierLineDirectionFromSkew } from "../../core/bridge/pierLineGeometry";

export interface SupportMarker3d {
  id: string;
  kind: "abutment" | "pier";
  station: number;
  x: number;
  y: number;
  z: number;
  /** pier-line plan direction (for the arrow / cone orientation). */
  direction: { x: number; y: number };
}

export interface SupportMarkerBundle {
  markers: SupportMarker3d[];
  /** span polylines (station pairs) for the deck outline. */
  spans: { id: string; startX: number; startY: number; endX: number; endY: number }[];
}

/** Resolve support markers + span polylines from a draft. */
export function resolveSupportMarkers(draft: BuildIntermediateInput): SupportMarkerBundle {
  const markers: SupportMarker3d[] = [];
  const spanPolylines: SupportMarkerBundle["spans"] = [];

  for (const pier of draft.piers ?? []) {
    const station = pier.physicalDistance;
    const ev = evaluateAlignmentAtDistance(draft.alignment, station);
    const z = draft.verticalAlignment ? elevationAt(station, draft.verticalAlignment) ?? 0 : 0;
    const direction = pierLineDirectionFromSkew(ev.azimuth, pier.skewAngleRad ?? Math.PI / 2);
    markers.push({
      id: pier.id,
      kind: pier.kind === "abutment" ? "abutment" : "pier",
      station,
      x: ev.point.x,
      y: ev.point.y,
      z,
      direction: { x: direction.x, y: direction.y },
    });
  }

  for (const span of draft.spans ?? []) {
    const startEv = evaluateAlignmentAtDistance(draft.alignment, span.startPhysicalDistance);
    const endEv = evaluateAlignmentAtDistance(draft.alignment, span.endPhysicalDistance);
    spanPolylines.push({
      id: span.id,
      startX: startEv.point.x,
      startY: startEv.point.y,
      endX: endEv.point.x,
      endY: endEv.point.y,
    });
  }

  return { markers, spans: spanPolylines };
}
