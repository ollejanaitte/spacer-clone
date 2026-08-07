import {
  isR1CoordinateSystem,
  type R1CoordinateSystem,
  type SignConventions,
} from "./types";

export function validateR1CoordinateSystem(value: unknown): string[] {
  if (isR1CoordinateSystem(value)) return [];
  return [`unknown coordinate system: ${String(value)}`];
}

export function validateSignConventions(conventions: SignConventions): string[] {
  const errors: string[] = [];
  if (conventions.offset !== "left_positive" && conventions.offset !== "right_positive") {
    errors.push("invalid offset sign convention");
  }
  if (
    conventions.rotation !== "clockwise_positive" &&
    conventions.rotation !== "counterclockwise_positive"
  ) {
    errors.push("invalid rotation sign convention");
  }
  if (
    conventions.crossfall !== "fall_to_right_positive" &&
    conventions.crossfall !== "rise_to_right_positive"
  ) {
    errors.push("invalid crossfall sign convention");
  }
  if (
    conventions.skew !== "positive_when_turning_right" &&
    conventions.skew !== "positive_when_turning_left"
  ) {
    errors.push("invalid skew sign convention");
  }
  if (
    conventions.station !== "forward_increasing" &&
    conventions.station !== "forward_decreasing"
  ) {
    errors.push("invalid station direction convention");
  }
  if (conventions.vertical !== "up_positive" && conventions.vertical !== "down_positive") {
    errors.push("invalid vertical positive convention");
  }
  return errors;
}

export function systemsMatch(left: R1CoordinateSystem, right: R1CoordinateSystem): boolean {
  return left === right;
}
