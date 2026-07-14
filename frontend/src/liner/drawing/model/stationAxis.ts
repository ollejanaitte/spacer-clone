import type { DrawingDiagnostic } from "./diagnostics";

export type StationAxisLabelKind = "start" | "end" | "interval" | "explicit" | "equation";

export type StationAxisLabel = {
  id: string;
  physicalDistance: number;
  displayedStation: number;
  label: string;
  kind: StationAxisLabelKind;
};

export type StationAxis = {
  id: string;
  startPhysicalDistance: number;
  endPhysicalDistance: number;
  startModelX: number;
  endModelX: number;
  stationLabels: StationAxisLabel[];
};

export function physicalDistanceToStationAxisX(
  axis: StationAxis,
  physicalDistance: number,
): number {
  const span = axis.endPhysicalDistance - axis.startPhysicalDistance;
  if (span === 0) {
    return axis.startModelX;
  }

  const ratio = (physicalDistance - axis.startPhysicalDistance) / span;
  return axis.startModelX + (axis.endModelX - axis.startModelX) * ratio;
}

export function isValidStationAxis(axis: StationAxis): boolean {
  return (
    Number.isFinite(axis.startPhysicalDistance)
    && Number.isFinite(axis.endPhysicalDistance)
    && Number.isFinite(axis.startModelX)
    && Number.isFinite(axis.endModelX)
    && axis.startPhysicalDistance <= axis.endPhysicalDistance
    && axis.stationLabels.every((label) => (
      Number.isFinite(label.physicalDistance)
      && Number.isFinite(label.displayedStation)
      && typeof label.label === "string"
      && label.label.length > 0
    ))
  );
}

export function validateStationAxis(axis: StationAxis): DrawingDiagnostic[] {
  if (isValidStationAxis(axis)) {
    return [];
  }

  return [
    {
      severity: "error",
      code: "DRAWING_STATION_AXIS_INVALID",
      message: "Station axis is invalid.",
      source: axis.id,
    },
  ];
}
