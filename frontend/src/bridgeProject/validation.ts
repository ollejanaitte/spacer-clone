/**
 * Fail-closed validation for the BridgeProject Alignment / BridgeGeometry adapters.
 *
 * Error codes are stable and intentionally do not silently substitute placeholder
 * values: a missing required input, an unknown unit/coordinate system, a
 * non-finite number, or an internal inconsistency (station order, span sum,
 * support mismatch) always throws.
 */

export class BridgeProjectAdapterError extends Error {
  readonly code: string;

  constructor(code: string, message: string) {
    super(message);
    this.name = "BridgeProjectAdapterError";
    this.code = code;
  }
}

export const BP_CODES = {
  NON_FINITE: "BP_NON_FINITE",
  BRIDGE_EXTENT_MISSING: "BP_BRIDGE_EXTENT_MISSING",
  STATION_ORDER_INVALID: "BP_STATION_ORDER_INVALID",
  STATION_OUT_OF_RANGE: "BP_STATION_OUT_OF_RANGE",
  SPAN_SUM_MISMATCH: "BP_SPAN_SUM_MISMATCH",
  SUPPORT_MISMATCH: "BP_SUPPORT_MISMATCH",
  UNIT_INVALID: "BP_UNIT_INVALID",
  COORDINATE_UNKNOWN: "BP_COORDINATE_UNKNOWN",
  VALUE_STATUS_INVALID: "BP_VALUE_STATUS_INVALID",
  SOURCE_INVALID: "BP_SOURCE_INVALID",
} as const;

export function assertFinite(value: number, path: string): void {
  if (!Number.isFinite(value)) {
    throw new BridgeProjectAdapterError(
      BP_CODES.NON_FINITE,
      `${path} must be a finite number (got ${value}).`,
    );
  }
}

/** A value with a status that requires a finite number must have one; MISSING/DEFERRED must not. */
export function assertBpValueShape(
  value: { readonly value?: number; readonly status: string; readonly unit: string; readonly stateReason?: string },
  path: string,
): void {
  if (typeof value.unit !== "string" || value.unit.trim().length === 0) {
    throw new BridgeProjectAdapterError(
      BP_CODES.UNIT_INVALID,
      `${path}.unit must be a non-empty canonical unit string.`,
    );
  }
  const requiresValue = ["CONFIRMED", "DERIVED", "INFERRED", "NOT_AUTHORIZED"];
  if (requiresValue.includes(value.status)) {
    if (typeof value.value !== "number" || !Number.isFinite(value.value)) {
      throw new BridgeProjectAdapterError(
        BP_CODES.NON_FINITE,
        `${path} has status ${value.status} but no finite value.`,
      );
    }
  } else if (value.status === "MISSING" || value.status === "DEFERRED") {
    if (value.value !== undefined) {
      throw new BridgeProjectAdapterError(
        BP_CODES.VALUE_STATUS_INVALID,
        `${path} has status ${value.status} but carries a value; MISSING/DEFERRED must not invent values.`,
      );
    }
    if (typeof value.stateReason !== "string" || value.stateReason.trim().length === 0) {
      throw new BridgeProjectAdapterError(
        BP_CODES.VALUE_STATUS_INVALID,
        `${path} has status ${value.status} but no stateReason.`,
      );
    }
  } else {
    throw new BridgeProjectAdapterError(
      BP_CODES.VALUE_STATUS_INVALID,
      `${path} has unknown status "${value.status}".`,
    );
  }
}

export function assertAscendingStations(stations: readonly number[], path: string): void {
  for (const station of stations) {
    assertFinite(station, path);
  }
  for (let i = 1; i < stations.length; i += 1) {
    if (stations[i]! <= stations[i - 1]!) {
      throw new BridgeProjectAdapterError(
        BP_CODES.STATION_ORDER_INVALID,
        `${path} must be strictly ascending (index ${i - 1}=${stations[i - 1]}, index ${i}=${stations[i]}).`,
      );
    }
  }
}

export function assertStationInRange(
  station: number,
  alignmentStart: number,
  alignmentEnd: number,
  path: string,
  tolerance = 1e-6,
): void {
  if (station < alignmentStart - tolerance || station > alignmentEnd + tolerance) {
    throw new BridgeProjectAdapterError(
      BP_CODES.STATION_OUT_OF_RANGE,
      `${path} station ${station} is outside alignment range [${alignmentStart}, ${alignmentEnd}].`,
    );
  }
}

export function assertSpanSumEqualsLength(
  spanLengths: readonly number[],
  bridgeLength: number,
  path: string,
  tolerance = 1e-6,
): void {
  const sum = spanLengths.reduce((acc, length) => acc + length, 0);
  if (Math.abs(sum - bridgeLength) > tolerance) {
    throw new BridgeProjectAdapterError(
      BP_CODES.SPAN_SUM_MISMATCH,
      `${path} span sum ${sum} does not equal bridge length ${bridgeLength}.`,
    );
  }
}

export function assertCoordinateSystemKnown(
  coordinateSystem: { readonly name: string; readonly handedness: string; readonly verticalAxis: string },
  path: string,
): void {
  if (coordinateSystem.handedness !== "right" || coordinateSystem.verticalAxis !== "z") {
    throw new BridgeProjectAdapterError(
      BP_CODES.COORDINATE_UNKNOWN,
      `${path} coordinate system must be right-handed with vertical z.`,
    );
  }
}
