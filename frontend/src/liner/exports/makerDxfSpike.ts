import makerjs from "makerjs";

export function buildMakerDxfSpike(): string {
  const model: makerjs.IModel = {
    units: makerjs.unitType.Meter,
    paths: {
      baseline: {
        type: "line",
        origin: [0, 0],
        end: [10, 0],
        layer: "PLAN_CENTERLINE",
      },
    },
  };

  return withDxfHeaderVariable(makerjs.exporter.toDXF(model), "$MEASUREMENT", "70", "1");
}

export function dxfHeaderVariableValue(dxf: string, variableName: string): string | null {
  const lines = dxf.split(/\r?\n/).map((line) => line.trim());
  const variableIndex = lines.indexOf(variableName);
  if (variableIndex < 0) {
    return null;
  }

  return lines[variableIndex + 2] ?? null;
}

function withDxfHeaderVariable(dxf: string, variableName: string, groupCode: string, value: string): string {
  if (dxfHeaderVariableValue(dxf, variableName) !== null) {
    return dxf;
  }

  return dxf.replace("0\nENDSEC", `9\n${variableName}\n${groupCode}\n${value}\n0\nENDSEC`);
}
