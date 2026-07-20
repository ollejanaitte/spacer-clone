import type { HaunchDefinitionDraft } from "../../schema/types";
import type { StationTableEntry } from "../types";
import { createHaunchDiagnostic, LINER_HAUNCH_DIAGNOSTIC_CODES } from "./diagnostics";
import {
  areCollinear,
  emitHaunchRow,
  filterLineIdsBySide,
  planPointForAnchor,
  resolveLineIdsForDefinition,
  resolveTopElevationAtAnchorStation,
  sectionForStation,
  solvePlaneCoefficients,
  solveQuadraticCoefficients,
  type HaunchComputeContext,
} from "./computeContext";
import type { HaunchResultRow } from "./types";
import { intersectGirderAtSection } from "./anchorResolution";

type ThreePointDefinition = Extract<
  HaunchDefinitionDraft,
  { family: "three_point" }
>;

export function computeThreePoint(
  definition: ThreePointDefinition,
  stations: readonly StationTableEntry[],
  ctx: HaunchComputeContext,
  rows: HaunchResultRow[],
): void {
  const lineIds = filterLineIdsBySide(
    resolveLineIdsForDefinition(definition, ctx.alignments),
    definition.side,
    ctx.lineOffsetMap,
  );
  const defaultLineId = lineIds[0] ?? definition.anchors[0]?.lineId ?? "";

  if (definition.variant === "affine_plane_three_points") {
    const anchorData: { x: number; y: number; z: number }[] = [];
    const planPoints: { x: number; y: number }[] = [];
    for (const anchor of definition.anchors) {
      const planPoint = planPointForAnchor(ctx, definition.id, anchor, defaultLineId);
      if (!planPoint) {
        return;
      }
      const zTop = resolveTopElevationAtAnchorStation(ctx, definition.id, anchor);
      if (zTop === null) {
        return;
      }
      anchorData.push({ x: planPoint.x, y: planPoint.y, z: zTop });
      planPoints.push(planPoint);
    }
    if (areCollinear(planPoints)) {
      ctx.diagnostics.push(
        createHaunchDiagnostic("error", LINER_HAUNCH_DIAGNOSTIC_CODES.degenerateGeometry, {
          entityId: definition.id,
        }),
      );
      return;
    }
    const coeffs = solvePlaneCoefficients(anchorData);
    if (!coeffs) {
      ctx.diagnostics.push(
        createHaunchDiagnostic("error", LINER_HAUNCH_DIAGNOSTIC_CODES.degenerateGeometry, {
          entityId: definition.id,
        }),
      );
      return;
    }
    for (const station of stations) {
      const section = sectionForStation(ctx, station.physicalDistance);
      if (!section) {
        continue;
      }
      for (const lineId of lineIds) {
        const point = intersectGirderAtSection(lineId, section, ctx.lineOffsetMap);
        if (!point) {
          ctx.diagnostics.push(
            createHaunchDiagnostic("error", LINER_HAUNCH_DIAGNOSTIC_CODES.degenerateGeometry, {
              entityId: definition.id,
              physicalDistance: station.physicalDistance,
              entityPath: lineId,
            }),
          );
          continue;
        }
        const zTop = coeffs.a * point.x + coeffs.b * point.y + coeffs.c;
        emitHaunchRow(ctx, definition, station, lineId, zTop, rows);
      }
    }
    return;
  }

  const parabolaPoints: { u: number; z: number }[] = [];
  for (const anchor of definition.anchors) {
    const zTop = resolveTopElevationAtAnchorStation(ctx, definition.id, anchor);
    if (zTop === null) {
      return;
    }
    parabolaPoints.push({
      u: anchor.stationPhysicalDistanceM,
      z: zTop,
    });
  }
  const coeffs = solveQuadraticCoefficients(parabolaPoints);
  if (!coeffs) {
    ctx.diagnostics.push(
      createHaunchDiagnostic("error", LINER_HAUNCH_DIAGNOSTIC_CODES.degenerateGeometry, {
        entityId: definition.id,
      }),
    );
    return;
  }

  for (const station of stations) {
    const u = station.physicalDistance;
    const zTop = coeffs.a * u * u + coeffs.b * u + coeffs.c;
    emitHaunchRow(ctx, definition, station, definition.girderLineId, zTop, rows);
  }
}
