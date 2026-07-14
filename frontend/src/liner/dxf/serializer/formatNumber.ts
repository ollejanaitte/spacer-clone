import type { DxfPrecisionPolicy } from "../model/precision";

export function formatDxfNumber(value: number, decimals: number): string {
  if (!Number.isFinite(value)) {
    throw new Error(`Non-finite DXF number: ${String(value)}`);
  }
  return value.toFixed(decimals);
}

export function roundDxfNumber(value: number, decimals: number): number {
  if (!Number.isFinite(value)) {
    return value;
  }
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

export function formatDxfCoordinate(value: number, precision: DxfPrecisionPolicy): string {
  return formatDxfNumber(roundDxfNumber(value, precision.coordinateDecimals), precision.coordinateDecimals);
}

export function formatDxfAngleDeg(value: number, precision: DxfPrecisionPolicy): string {
  return formatDxfNumber(roundDxfNumber(value, precision.angleDecimals), precision.angleDecimals);
}

export function formatDxfTextHeight(value: number, precision: DxfPrecisionPolicy): string {
  return formatDxfNumber(roundDxfNumber(value, precision.textHeightDecimals), precision.textHeightDecimals);
}

export function isFiniteDxfNumber(value: number): boolean {
  return Number.isFinite(value);
}
