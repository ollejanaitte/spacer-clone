import {
  isRoundingPolicy,
  type RoundingPolicy,
} from "./types";

export function roundToPrecision(value: number, precision: number): number {
  if (!Number.isFinite(value)) return value;
  const factor = 10 ** Math.floor(Math.max(0, precision));
  const rounded = Math.round(value * factor) / factor;
  return Object.is(rounded, -0) ? 0 : rounded;
}

export function applyPolicy(
  value: number,
  policy: RoundingPolicy,
  field: "report_rounding" | "ui_display_rounding" | "serialization_precision",
): number {
  return roundToPrecision(value, policy[field]);
}

export function roundForReport(value: number, policy: RoundingPolicy): number {
  return roundToPrecision(value, policy.report_rounding);
}

export function roundForUiDisplay(value: number, policy: RoundingPolicy): number {
  return roundToPrecision(value, policy.ui_display_rounding);
}

export function roundForSerialization(value: number, policy: RoundingPolicy): number {
  return roundToPrecision(value, policy.serialization_precision);
}

export function assertValidRoundingPolicy(policy: RoundingPolicy): void {
  if (!isRoundingPolicy(policy)) {
    throw new Error("invalid rounding policy");
  }
}
