import makerjs from "makerjs";
import type { LinerDraft } from "../adapters/linerUiAdapter";
import type { Vec2 } from "../core/types";
import { buildIntermediateResult } from "../core/pipeline/pipeline";
import { dxfHeaderVariableValue } from "./makerDxfSpike";

const PLAN_CENTERLINE_LAYER = "PLAN_CENTERLINE";
const PLAN_OFFSET_LAYER = "PLAN_OFFSET";

export function buildLinerPlanDxf(draft: LinerDraft): string {
  const intermediate = buildIntermediateResult(draft);
  const paths: Record<string, makerjs.IPathLine> = {};
  let index = 0;
  const gridPointById = new Map(intermediate.grid.points.map((point) => [point.id, point]));

  index = addPolylineSegments(paths, "center", intermediate.horizontal.sampledPoints, PLAN_CENTERLINE_LAYER, index);
  for (const line of intermediate.grid.lines.filter((entry) => entry.direction === "longitudinal")) {
    const points = line.pointIds
      .map((pointId) => gridPointById.get(pointId))
      .filter((point): point is NonNullable<typeof point> => Boolean(point));
    index = addPolylineSegments(paths, line.id, points, PLAN_OFFSET_LAYER, index);
  }

  const model: makerjs.IModel = {
    units: makerjs.unitType.Meter,
    paths,
  };

  return withDxfHeaderVariable(makerjs.exporter.toDXF(model), "$MEASUREMENT", "70", "1");
}

function addPolylineSegments(
  paths: Record<string, makerjs.IPathLine>,
  prefix: string,
  points: Vec2[],
  layer: string,
  startIndex: number,
): number {
  let index = startIndex;
  for (let pointIndex = 1; pointIndex < points.length; pointIndex += 1) {
    const start = points[pointIndex - 1];
    const end = points[pointIndex];
    paths[`${prefix}_${index}`] = {
      type: "line",
      origin: [start.x, start.y],
      end: [end.x, end.y],
      layer,
    };
    index += 1;
  }
  return index;
}

function withDxfHeaderVariable(dxf: string, variableName: string, groupCode: string, value: string): string {
  if (dxfHeaderVariableValue(dxf, variableName) !== null) {
    return dxf;
  }

  return dxf.replace("0\nENDSEC", `9\n${variableName}\n${groupCode}\n${value}\n0\nENDSEC`);
}
