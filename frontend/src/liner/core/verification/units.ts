import type { DxfUnits } from "../../dxf/model/units";
import {
  isR1Unit,
  unitGroupOf,
  type R1LengthUnit,
  type R1Unit,
} from "./types";

export const METERS_TO_MILLIMETERS = 1000;

export function convertLength(value: number, from: R1LengthUnit, to: R1LengthUnit): number {
  if (from === to) return value;
  if (from === "m" && to === "mm") return value * METERS_TO_MILLIMETERS;
  if (from === "mm" && to === "m") return value / METERS_TO_MILLIMETERS;
  throw new Error(`unsupported length conversion: ${from} -> ${to}`);
}

export function dxfUnitsToR1Unit(units: DxfUnits): R1Unit {
  switch (units) {
    case "millimeters":
      return "mm";
    case "meters":
      return "m";
    case "unitless":
      return "dxf_unit";
  }
}

export function r1UnitToDxfUnits(unit: R1Unit): DxfUnits | null {
  if (unit === "mm") return "millimeters";
  if (unit === "m") return "meters";
  if (unit === "dxf_unit") return "unitless";
  return null;
}

export function areUnitsComparable(expected: R1Unit, actual: R1Unit): boolean {
  if (!isR1Unit(expected) || !isR1Unit(actual)) return false;
  const expectedGroup = unitGroupOf(expected);
  const actualGroup = unitGroupOf(actual);
  if (expectedGroup === "length" && actualGroup === "length") return true;
  if (expectedGroup === "angle" && actualGroup === "angle") return true;
  if (expectedGroup === "ratio" && actualGroup === "ratio") return true;
  return expected === actual;
}
