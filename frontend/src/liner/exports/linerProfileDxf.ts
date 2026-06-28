import makerjs from "makerjs";
import type { LinerDraft } from "../adapters/linerUiAdapter";
import type { Vec2 } from "../core/types";
import { buildIntermediateResult } from "../core/pipeline/pipeline";
import { dxfHeaderVariableValue } from "./makerDxfSpike";

const PROFILE_GROUND_LAYER = "PROFILE_GROUND";
const PROFILE_DESIGN_LAYER = "PROFILE_DESIGN";

export function buildLinerProfileDxf(draft: LinerDraft): string {
  const intermediate = buildIntermediateResult(draft);
  const paths: Record<string, makerjs.IPathLine> = {};
  let index = 0;
  const designPoints = intermediate.vertical.sampledPoints.map((point) => ({
    x: point.physicalDistance,
    y: point.profileElevation,
  }));
  const first = designPoints[0]?.x ?? 0;
  const last = designPoints[designPoints.length - 1]?.x ?? first;

  index = addPolylineSegments(paths, "design", designPoints, PROFILE_DESIGN_LAYER, index);
  addPolylineSegments(paths, "ground", [{ x: first, y: 0 }, { x: last, y: 0 }], PROFILE_GROUND_LAYER, index);

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
