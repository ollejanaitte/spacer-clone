import type {
  LinerBridge,
  GirderLineMaster,
  ImporterDiagnostic,
  JipLinerImporterProject,
  NullableNumberValue,
  Point,
  Section,
} from "../types";
import {
  IMPORTER_AZIMUTH_JUMP,
  IMPORTER_COORDINATE_SYSTEM_MISSING,
  IMPORTER_CROSS_SLOPE_INCONSISTENT,
  IMPORTER_CUM_DISTANCE_CHAIN_INVALID,
  IMPORTER_CUM_WIDTH_CHAIN_INVALID,
  IMPORTER_EXPORT_PLAN_MISSING,
  IMPORTER_LINE_MASTER_MISMATCH,
  IMPORTER_NOT_COMPUTED_FLAG_MISMATCH,
  IMPORTER_PROFILE_GRADE_MISMATCH,
  IMPORTER_SOURCE_REF_MISSING,
  IMPORTER_STATION_NOT_MONOTONIC,
  IMPORTER_SYMMETRY_WIDTH_MISMATCH,
} from "./diagnosticCodes";
import {
  IMPORTER_TOLERANCE_AZIMUTH_DEG,
  IMPORTER_TOLERANCE_DISTANCE_M,
  IMPORTER_TOLERANCE_SYMMETRY_M,
  withinTolerance,
} from "./tolerances";
import { resolvePrimaryGirderLineSet } from "../line-master/lineMasterHooks";
import { sortSectionsByPdfPage } from "../utils/importerUtils";

function createDiagnostic(
  partial: Omit<ImporterDiagnostic, "id"> & { id?: string },
): ImporterDiagnostic {
  return {
    id: partial.id ?? `${partial.code}-${partial.targetPath}`,
    level: partial.level,
    code: partial.code,
    message: partial.message,
    targetPath: partial.targetPath,
    sourceRef: partial.sourceRef,
    suggestedAction: partial.suggestedAction,
    acknowledgement: partial.acknowledgement,
  };
}

function isNotComputedNotation(notation: string | null | undefined): boolean {
  return notation != null && notation.includes("*");
}

function validateNotComputedFlag(
  fieldName: string,
  value: NullableNumberValue,
  targetPath: string,
): ImporterDiagnostic[] {
  const diagnostics: ImporterDiagnostic[] = [];
  const hasStars = isNotComputedNotation(value.notation);
  const hasNotComputedFlag = value.flags.notComputed === true;

  if (hasStars && !hasNotComputedFlag && value.value == null) {
    diagnostics.push(
      createDiagnostic({
        level: "error",
        code: IMPORTER_NOT_COMPUTED_FLAG_MISMATCH,
        message: `${fieldName} の notation が ******** ですが flags.notComputed がありません。`,
        targetPath,
        sourceRef: value.sourceRef,
      }),
    );
  }

  if (hasNotComputedFlag && value.value != null) {
    diagnostics.push(
      createDiagnostic({
        level: "info",
        code: IMPORTER_NOT_COMPUTED_FLAG_MISMATCH,
        message: `${fieldName} は notComputed ですが value が設定されています。`,
        targetPath,
        sourceRef: value.sourceRef,
      }),
    );
  }

  return diagnostics;
}

function validateSourceRef(
  targetPath: string,
  sourceRef: { enteredAt?: string; pdfPage?: number } | undefined,
): ImporterDiagnostic[] {
  if (!sourceRef || !sourceRef.enteredAt) {
    return [
      createDiagnostic({
        level: "warning",
        code: IMPORTER_SOURCE_REF_MISSING,
        message: "sourceRef が欠落しています。",
        targetPath,
      }),
    ];
  }
  return [];
}

function validatePointChains(point: Point, sectionId: string): ImporterDiagnostic[] {
  const diagnostics: ImporterDiagnostic[] = [];
  const basePath = `sections[${sectionId}].points[${point.id}]`;

  const cumWidth = point.cumulativeWidth.value;
  const unitWidth = point.unitWidth.value;
  const prevCumWidth =
    point.cumulativeWidth.value != null && point.unitWidth.value != null
      ? point.cumulativeWidth.value - point.unitWidth.value
      : null;

  if (cumWidth != null && unitWidth != null && prevCumWidth != null) {
    const expected = prevCumWidth + unitWidth;
    if (!withinTolerance(cumWidth, expected, IMPORTER_TOLERANCE_DISTANCE_M)) {
      diagnostics.push(
        createDiagnostic({
          level: "warning",
          code: IMPORTER_CUM_WIDTH_CHAIN_INVALID,
          message: `累加幅連鎖不一致: ${point.lineLabel}`,
          targetPath: `${basePath}.cumulativeWidth`,
          sourceRef: point.cumulativeWidth.sourceRef,
        }),
      );
    }
  }

  for (const [fieldName, cell] of [
    ["x", point.x],
    ["y", point.y],
    ["designElevation", point.designElevation],
    ["crossSlope", point.crossSlope],
    ["unitDistance", point.unitDistance],
    ["cumulativeDistance", point.cumulativeDistance],
    ["unitWidth", point.unitWidth],
    ["cumulativeWidth", point.cumulativeWidth],
  ] as const) {
    diagnostics.push(
      ...validateNotComputedFlag(fieldName, cell, `${basePath}.${fieldName}`),
    );
    diagnostics.push(
      ...validateSourceRef(`${basePath}.${fieldName}`, cell.sourceRef),
    );
  }

  return diagnostics;
}

function validateSectionDistanceChain(
  sections: Section[],
  section: Section,
): ImporterDiagnostic[] {
  const diagnostics: ImporterDiagnostic[] = [];
  const ordered = sortSectionsByPdfPage(sections);
  const index = ordered.findIndex((entry) => entry.id === section.id);
  if (index <= 0) {
    return diagnostics;
  }

  const previous = ordered[index - 1]!;
  const prevCum = previous.stationingRef.cumulativeDistance;
  const currCum = section.stationingRef.cumulativeDistance;
  const unitDist = section.stationingRef.cumulativeDistance;

  if (prevCum != null && currCum != null && unitDist != null) {
    const expectedDelta = currCum - prevCum;
    const sectionUnit = section.points[0]?.unitDistance.value;
    if (sectionUnit != null && !withinTolerance(expectedDelta, sectionUnit, IMPORTER_TOLERANCE_DISTANCE_M)) {
      diagnostics.push(
        createDiagnostic({
          level: "warning",
          code: IMPORTER_CUM_DISTANCE_CHAIN_INVALID,
          message: `累加距離連鎖不一致: Page ${section.pdfPage}`,
          targetPath: `sections[${section.id}].stationingRef.cumulativeDistance`,
          sourceRef: section.stationingRef.sourceRef,
        }),
      );
    }
  }

  return diagnostics;
}

function validateAzimuthJump(sections: Section[], section: Section): ImporterDiagnostic[] {
  const ordered = sortSectionsByPdfPage(sections);
  const index = ordered.findIndex((entry) => entry.id === section.id);
  if (index <= 0) {
    return [];
  }

  const previous = ordered[index - 1]!;
  const prevAz = previous.azimuth.value?.decimalDeg;
  const currAz = section.azimuth.value?.decimalDeg;
  if (prevAz == null || currAz == null) {
    return [];
  }

  const delta = Math.abs(currAz - prevAz);
  if (delta > IMPORTER_TOLERANCE_AZIMUTH_DEG && delta < 360 - IMPORTER_TOLERANCE_AZIMUTH_DEG) {
    if (delta > 1) {
      return [
        createDiagnostic({
          level: "warning",
          code: IMPORTER_AZIMUTH_JUMP,
          message: `方位角急変: Page ${previous.pdfPage} → ${section.pdfPage} (${delta.toFixed(3)}°)`,
          targetPath: `sections[${section.id}].azimuth`,
          sourceRef: section.azimuth.sourceRef,
        }),
      ];
    }
  }

  return [];
}

function validateSymmetry(section: Section): ImporterDiagnostic[] {
  const diagnostics: ImporterDiagnostic[] = [];
  const center = section.points.find(
    (point) => point.lineLabel.toUpperCase() === "HCL" || point.lineLabel.toUpperCase() === "CL",
  );
  if (!center) {
    return diagnostics;
  }

  const centerWidth = center.cumulativeWidth.value;
  if (centerWidth == null) {
    return diagnostics;
  }

  for (const point of section.points) {
    if (point.id === center.id) {
      continue;
    }
    const width = point.cumulativeWidth.value;
    if (width == null) {
      continue;
    }
    const mirrored = Math.abs(width + centerWidth);
    if (mirrored > IMPORTER_TOLERANCE_SYMMETRY_M && Math.abs(width) > IMPORTER_TOLERANCE_SYMMETRY_M) {
      const pairDiff = Math.abs(Math.abs(width) - Math.abs(centerWidth));
      if (pairDiff > IMPORTER_TOLERANCE_SYMMETRY_M) {
        diagnostics.push(
          createDiagnostic({
            level: "warning",
            code: IMPORTER_SYMMETRY_WIDTH_MISMATCH,
            message: `左右対称性不一致: ${point.lineLabel}`,
            targetPath: `sections[${section.id}].points[${point.id}].cumulativeWidth`,
            sourceRef: point.cumulativeWidth.sourceRef,
          }),
        );
      }
    }
  }

  return diagnostics;
}

function validateProfileGrade(section: Section): ImporterDiagnostic[] {
  const diagnostics: ImporterDiagnostic[] = [];
  const elevations = section.points
    .map((point) => ({
      elevation: point.designElevation.value,
      distance: point.cumulativeDistance.value,
      crossSlope: point.crossSlope.value,
      point,
    }))
    .filter((entry) => entry.elevation != null);

  for (let index = 1; index < elevations.length; index += 1) {
    const prev = elevations[index - 1]!;
    const curr = elevations[index]!;
    if (prev.distance == null || curr.distance == null) {
      continue;
    }
    const deltaDist = curr.distance - prev.distance;
    if (deltaDist <= 0) {
      continue;
    }
    const deltaElev = curr.elevation! - prev.elevation!;
    const grade = (deltaElev / deltaDist) * 100;
    if (Math.abs(grade) > 20) {
      diagnostics.push(
        createDiagnostic({
          level: "warning",
          code: IMPORTER_PROFILE_GRADE_MISMATCH,
          message: `計画高勾配が急: ${section.sectionNo ?? section.pdfPage} (${grade.toFixed(3)}%)`,
          targetPath: `sections[${section.id}].points[${curr.point.id}].designElevation`,
          sourceRef: curr.point.designElevation.sourceRef,
        }),
      );
    }
  }

  for (const entry of elevations) {
    if (entry.crossSlope != null && Math.abs(entry.crossSlope) > 15) {
      diagnostics.push(
        createDiagnostic({
          level: "warning",
          code: IMPORTER_CROSS_SLOPE_INCONSISTENT,
          message: `crossSlope が大きい: ${entry.point.lineLabel} (${entry.crossSlope}%)`,
          targetPath: `sections[${section.id}].points[${entry.point.id}].crossSlope`,
          sourceRef: entry.point.crossSlope.sourceRef,
        }),
      );
    }
  }

  return diagnostics;
}

function validateLineMasterMatch(
  section: Section,
  masterLines: GirderLineMaster[],
): ImporterDiagnostic[] {
  const diagnostics: ImporterDiagnostic[] = [];
  const masterLabels = new Set(masterLines.map((line) => line.label.trim()));
  const masterIds = new Set(masterLines.map((line) => line.id));

  for (const point of section.points) {
    if (!masterIds.has(point.girderLineId) && !masterLabels.has(point.lineLabel.trim())) {
      diagnostics.push(
        createDiagnostic({
          level: "error",
          code: IMPORTER_LINE_MASTER_MISMATCH,
          message: `行マスタ不一致: ${point.lineLabel}`,
          targetPath: `sections[${section.id}].points[${point.id}]`,
          sourceRef: point.sourceRef,
        }),
      );
    }
  }

  return diagnostics;
}

export function validateSection(
  section: Section,
  bridge: LinerBridge,
  allSections: Section[],
): ImporterDiagnostic[] {
  const girderSet = resolvePrimaryGirderLineSet(bridge);
  const masterLines = girderSet?.lines ?? [];
  const diagnostics: ImporterDiagnostic[] = [];

  for (const point of section.points) {
    diagnostics.push(...validatePointChains(point, section.id));
  }

  diagnostics.push(...validateSectionDistanceChain(allSections, section));
  diagnostics.push(...validateAzimuthJump(allSections, section));
  if (bridge.validationProfile?.expectSymmetry === true) {
    diagnostics.push(...validateSymmetry(section));
  }
  diagnostics.push(...validateProfileGrade(section));
  diagnostics.push(...validateLineMasterMatch(section, masterLines));

  diagnostics.push(...validateSourceRef(`sections[${section.id}]`, section.sourceRef));

  return diagnostics;
}

export function validateBridgeStationMonotonic(bridge: LinerBridge): ImporterDiagnostic[] {
  const ordered = sortSectionsByPdfPage(bridge.sections);
  const diagnostics: ImporterDiagnostic[] = [];

  for (let index = 1; index < ordered.length; index += 1) {
    const prev = ordered[index - 1]!.stationingRef.stationValue;
    const curr = ordered[index]!.stationingRef.stationValue;
    if (prev != null && curr != null && curr <= prev) {
      diagnostics.push(
        createDiagnostic({
          level: "error",
          code: IMPORTER_STATION_NOT_MONOTONIC,
          message: `STA 単調増加違反: Page ${ordered[index]!.pdfPage}`,
          targetPath: `sections[${ordered[index]!.id}].stationingRef.stationValue`,
          sourceRef: ordered[index]!.stationingRef.sourceRef,
        }),
      );
    }
  }

  return diagnostics;
}

export function validateBridge(bridge: LinerBridge): ImporterDiagnostic[] {
  const diagnostics: ImporterDiagnostic[] = [];
  diagnostics.push(...validateBridgeStationMonotonic(bridge));

  for (const section of bridge.sections) {
    diagnostics.push(...validateSection(section, bridge, bridge.sections));
  }

  if ((bridge.alignmentMetadata?.plan?.elements.length ?? 0) === 0) {
    diagnostics.push(
      createDiagnostic({
        level: "error",
        code: IMPORTER_EXPORT_PLAN_MISSING,
        message: "Phase 3.5 エクスポートに必要な plan alignment がありません。",
        targetPath: `bridges[${bridge.id}].alignmentMetadata.plan`,
      }),
    );
  }

  return diagnostics;
}

export function validateProject(project: JipLinerImporterProject): ImporterDiagnostic[] {
  const diagnostics: ImporterDiagnostic[] = [];

  if (!project.coordinateSystem.horizontal.datum.trim()) {
    diagnostics.push(
      createDiagnostic({
        level: "warning",
        code: IMPORTER_COORDINATE_SYSTEM_MISSING,
        message: "水平座標系 datum が未入力です。",
        targetPath: "coordinateSystem.horizontal.datum",
      }),
    );
  }

  if (!project.coordinateSystem.vertical.heightDatum.trim()) {
    diagnostics.push(
      createDiagnostic({
        level: "warning",
        code: IMPORTER_COORDINATE_SYSTEM_MISSING,
        message: "鉛直座標系 heightDatum が未入力です。",
        targetPath: "coordinateSystem.vertical.heightDatum",
      }),
    );
  }

  for (const bridge of project.bridges) {
    diagnostics.push(...validateBridge(bridge));
  }

  return diagnostics;
}

export function summarizeDiagnostics(items: ImporterDiagnostic[]): {
  errorCount: number;
  warningCount: number;
  infoCount: number;
} {
  return {
    errorCount: items.filter((item) => item.level === "error").length,
    warningCount: items.filter((item) => item.level === "warning").length,
    infoCount: items.filter((item) => item.level === "info").length,
  };
}

export function filterAcknowledgedDiagnostics(
  items: ImporterDiagnostic[],
  showAcknowledged: boolean,
): ImporterDiagnostic[] {
  if (showAcknowledged) {
    return items;
  }
  return items.filter((item) => !item.acknowledgement?.suppressUntilChange);
}
