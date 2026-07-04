import type {
  Angle,
  AngleValue,
  Bridge,
  Flags,
  GirderLineMaster,
  NullableNumberValue,
  NullableStationValue,
  Point,
  Section,
  SourceRef,
} from "../types";

export function createUniqueId(prefix: string): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return `${prefix}-${crypto.randomUUID()}`;
  }
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
}

export function createSourceRef(pdfPage: number, partial?: Partial<SourceRef>): SourceRef {
  return {
    pdfPage,
    row: partial?.row ?? null,
    col: partial?.col ?? null,
    field: partial?.field,
    enteredAt: partial?.enteredAt ?? new Date().toISOString(),
    enteredBy: partial?.enteredBy ?? null,
  };
}

export function createEmptyFlags(): Flags {
  return {};
}

export function createEmptyNullableNumber(
  pdfPage: number,
  unit: NullableNumberValue["unit"] = "m",
): NullableNumberValue {
  return {
    value: null,
    notation: null,
    unit,
    flags: createEmptyFlags(),
    sourceRef: createSourceRef(pdfPage),
  };
}

export function createNotComputedNullableNumber(
  pdfPage: number,
  unit: NullableNumberValue["unit"] = "m",
): NullableNumberValue {
  return {
    value: null,
    notation: "********",
    unit,
    flags: { notComputed: true },
    sourceRef: createSourceRef(pdfPage),
  };
}

export function createEmptyStationValue(pdfPage: number): NullableStationValue {
  return {
    value: null,
    label: null,
    notation: null,
    flags: createEmptyFlags(),
    sourceRef: createSourceRef(pdfPage),
  };
}

export function createEmptyAngleValue(pdfPage: number): AngleValue {
  return {
    value: null,
    flags: createEmptyFlags(),
    sourceRef: createSourceRef(pdfPage),
  };
}

export function createPointFromGirderLine(
  line: GirderLineMaster,
  pdfPage: number,
): Point {
  return {
    id: createUniqueId("point"),
    girderLineId: line.id,
    lineLabel: line.label,
    x: createEmptyNullableNumber(pdfPage),
    y: createEmptyNullableNumber(pdfPage),
    designElevation: createEmptyNullableNumber(pdfPage),
    crossSlope: createEmptyNullableNumber(pdfPage, "%"),
    unitDistance: createNotComputedNullableNumber(pdfPage),
    cumulativeDistance: createNotComputedNullableNumber(pdfPage),
    unitWidth: createEmptyNullableNumber(pdfPage),
    cumulativeWidth: createEmptyNullableNumber(pdfPage),
    intersectionAngle: createEmptyAngleValue(pdfPage),
    station: createEmptyStationValue(pdfPage),
    flags: createEmptyFlags(),
    sourceRef: createSourceRef(pdfPage, { row: line.displayOrder + 1 }),
  };
}

export function createEmptySection(
  bridgeId: string,
  pdfPage: number,
  girderLines: GirderLineMaster[],
): Section {
  return {
    id: createUniqueId("section"),
    bridgeId,
    spanId: null,
    pdfPage,
    sectionNo: `Page ${pdfPage}`,
    title: undefined,
    azimuth: createEmptyAngleValue(pdfPage),
    stationingRef: {
      stationLabel: null,
      stationValue: null,
      cumulativeDistance: null,
      notation: null,
      sourceRef: createSourceRef(pdfPage),
    },
    points: girderLines.map((line) => createPointFromGirderLine(line, pdfPage)),
    sourceRef: createSourceRef(pdfPage),
  };
}

export function cloneSection(section: Section, newPdfPage?: number): Section {
  const pdfPage = newPdfPage ?? section.pdfPage;
  const idMap = new Map<string, string>();

  const points = section.points.map((point) => {
    const newId = createUniqueId("point");
    idMap.set(point.id, newId);
    return {
      ...point,
      id: newId,
      x: { ...point.x, sourceRef: { ...point.x.sourceRef, pdfPage } },
      y: { ...point.y, sourceRef: { ...point.y.sourceRef, pdfPage } },
      designElevation: {
        ...point.designElevation,
        sourceRef: { ...point.designElevation.sourceRef, pdfPage },
      },
      crossSlope: {
        ...point.crossSlope,
        sourceRef: { ...point.crossSlope.sourceRef, pdfPage },
      },
      unitDistance: {
        ...point.unitDistance,
        sourceRef: { ...point.unitDistance.sourceRef, pdfPage },
      },
      cumulativeDistance: {
        ...point.cumulativeDistance,
        sourceRef: { ...point.cumulativeDistance.sourceRef, pdfPage },
      },
      unitWidth: {
        ...point.unitWidth,
        sourceRef: { ...point.unitWidth.sourceRef, pdfPage },
      },
      cumulativeWidth: {
        ...point.cumulativeWidth,
        sourceRef: { ...point.cumulativeWidth.sourceRef, pdfPage },
      },
      intersectionAngle: point.intersectionAngle
        ? {
            ...point.intersectionAngle,
            sourceRef: { ...point.intersectionAngle.sourceRef, pdfPage },
          }
        : createEmptyAngleValue(pdfPage),
      station: point.station
        ? { ...point.station, sourceRef: { ...point.station.sourceRef, pdfPage } }
        : createEmptyStationValue(pdfPage),
      sourceRef: { ...point.sourceRef, pdfPage },
    };
  });

  return {
    ...section,
    id: createUniqueId("section"),
    pdfPage,
    sectionNo: section.sectionNo ? `${section.sectionNo} (copy)` : `Page ${pdfPage}`,
    azimuth: {
      ...section.azimuth,
      sourceRef: { ...section.azimuth.sourceRef, pdfPage },
    },
    stationingRef: {
      ...section.stationingRef,
      sourceRef: section.stationingRef.sourceRef
        ? { ...section.stationingRef.sourceRef, pdfPage }
        : createSourceRef(pdfPage),
    },
    points,
    diagnostics: undefined,
    renderability: undefined,
    sourceRef: { ...section.sourceRef, pdfPage },
  };
}

export function isCellDetermined(
  value: { value: unknown; flags?: Flags; notation?: string | null } | null | undefined,
): boolean {
  if (!value) {
    return false;
  }
  if (value.value != null) {
    return true;
  }
  const flags = value.flags ?? {};
  return Boolean(flags.notComputed || flags.notApplicable || flags.outOfRange);
}

const POINT_REQUIRED_FIELDS = [
  "x",
  "y",
  "designElevation",
  "crossSlope",
  "unitDistance",
  "cumulativeDistance",
  "unitWidth",
  "cumulativeWidth",
] as const;

export function calculateSectionInputRate(section: Section): number {
  let total = 0;
  let filled = 0;

  if (isCellDetermined(section.azimuth)) {
    filled += 1;
  }
  total += 1;

  if (section.stationingRef.stationValue != null || section.stationingRef.stationLabel) {
    filled += 1;
  }
  total += 1;

  for (const point of section.points) {
    for (const field of POINT_REQUIRED_FIELDS) {
      total += 1;
      const cell = point[field];
      if (isCellDetermined(cell)) {
        filled += 1;
      }
    }
  }

  if (total === 0) {
    return 0;
  }
  return Math.round((filled / total) * 100);
}

export function calculateBridgeInputRate(bridge: Bridge): number {
  if (bridge.sections.length === 0) {
    return 0;
  }
  const sum = bridge.sections.reduce(
    (acc, section) => acc + calculateSectionInputRate(section),
    0,
  );
  return Math.round(sum / bridge.sections.length);
}

export function parseNumericInput(text: string): NullableNumberValue | null {
  const trimmed = text.trim();
  if (trimmed.length === 0) {
    return null;
  }
  if (trimmed.includes("*")) {
    return {
      value: null,
      notation: trimmed,
      unit: "m",
      flags: { notComputed: true },
      sourceRef: createSourceRef(0),
    };
  }
  const parsed = Number(trimmed);
  if (!Number.isFinite(parsed)) {
    return null;
  }
  return {
    value: parsed,
    notation: trimmed,
    unit: "m",
    flags: {},
    sourceRef: createSourceRef(0),
  };
}

export function parseAngleNotation(text: string): Angle | null {
  const trimmed = text.trim();
  if (trimmed.length === 0 || trimmed.includes("*")) {
    return null;
  }

  const dmsMatch = trimmed.match(/^(-?\d+)[-°](\d+)[-'](\d+(?:\.\d+)?)$/);
  if (dmsMatch) {
    const deg = Number(dmsMatch[1]);
    const min = Number(dmsMatch[2]);
    const sec = Number(dmsMatch[3]);
    const sign = deg < 0 ? -1 : 1;
    const decimalDeg = sign * (Math.abs(deg) + min / 60 + sec / 3600);
    return { deg, min, sec, decimalDeg, notation: trimmed };
  }

  const decimal = Number(trimmed);
  if (!Number.isFinite(decimal)) {
    return null;
  }
  const abs = Math.abs(decimal);
  const deg = Math.trunc(decimal);
  const minFloat = (abs - Math.abs(deg)) * 60;
  const min = Math.trunc(minFloat);
  const sec = (minFloat - min) * 60;
  return {
    deg,
    min,
    sec,
    decimalDeg: decimal,
    notation: trimmed,
  };
}

export function sortSectionsByPdfPage(sections: Section[]): Section[] {
  return [...sections].sort((left, right) => left.pdfPage - right.pdfPage);
}
