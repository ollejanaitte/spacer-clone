export type DxfUnits = "unitless" | "millimeters" | "meters";

export const DEFAULT_DXF_UNITS: DxfUnits = "meters";

export const DXF_INSUNITS_BY_UNIT: Record<DxfUnits, number> = {
  unitless: 0,
  millimeters: 4,
  meters: 6,
};

export function isDxfUnits(value: string): value is DxfUnits {
  return value === "unitless" || value === "millimeters" || value === "meters";
}

export function dxfMeasurementForUnits(units: DxfUnits): 0 | 1 {
  return units === "unitless" ? 0 : 1;
}

export function textHeightModelUnits(heightMm: number, units: DxfUnits): number {
  if (units === "millimeters") {
    return heightMm;
  }
  if (units === "meters") {
    return heightMm / 1000;
  }
  return heightMm;
}
