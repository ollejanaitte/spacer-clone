import {
  IMPORTER_RENDER_CROSS_SECTION_BLOCKED,
  IMPORTER_RENDER_EXPORT_BLOCKED,
  IMPORTER_RENDER_EXPORT_DEGRADED,
  IMPORTER_RENDER_PLAN_PREVIEW_BLOCKED,
} from "./diagnostics";
import type {
  Bridge,
  ImporterDiagnostic,
  JipLinerImporterProject,
  MissingFieldRef,
  NullableNumberValue,
  Point,
  Renderability,
  RenderabilityStatus,
  RenderabilityTarget,
  Section,
} from "./types";

function isNonNullNumber(value: NullableNumberValue | undefined): boolean {
  return value != null && value.value != null;
}

function isLineLabelDetermined(point: Point): boolean {
  return point.lineLabel.trim().length > 0;
}

function isCrossSectionDrawablePoint(point: Point): boolean {
  return (
    isNonNullNumber(point.cumulativeWidth) &&
    isNonNullNumber(point.designElevation) &&
    isLineLabelDetermined(point)
  );
}

function countCrossSectionDrawablePoints(section: Section): number {
  return section.points.filter(isCrossSectionDrawablePoint).length;
}

function isPlanPreviewDrawableSection(section: Section): boolean {
  const hasXyPoint = section.points.some(
    (point) => isNonNullNumber(point.x) && isNonNullNumber(point.y),
  );
  return (
    hasXyPoint &&
    section.azimuth.value != null &&
    section.stationingRef.stationValue != null
  );
}

function isPlanPreviewPartialSection(section: Section): boolean {
  const hasXyPoint = section.points.some(
    (point) => isNonNullNumber(point.x) && isNonNullNumber(point.y),
  );
  return hasXyPoint;
}

function aggregateStatuses(statuses: RenderabilityStatus[]): RenderabilityStatus {
  if (statuses.length === 0) {
    return "blocked";
  }
  if (statuses.every((status) => status === "ok")) {
    return "ok";
  }
  if (statuses.every((status) => status === "blocked")) {
    return "blocked";
  }
  return "partial";
}

function buildMissingField(
  targetPath: string,
  label: string,
  requiredFor: RenderabilityTarget,
  severity: MissingFieldRef["severity"],
  sourceRef?: MissingFieldRef["sourceRef"],
): MissingFieldRef {
  return { targetPath, label, requiredFor, severity, sourceRef };
}

export function evaluateSectionRenderability(section: Section): Renderability {
  const missingFields: MissingFieldRef[] = [];
  const drawableCount = countCrossSectionDrawablePoints(section);

  let crossSection: RenderabilityStatus;
  if (drawableCount >= 2) {
    crossSection = "ok";
  } else if (drawableCount === 1) {
    crossSection = "partial";
    missingFields.push(
      buildMissingField(
        `sections[${section.id}].points`,
        `${section.sectionNo ?? section.title ?? section.id} / 横断図描画点`,
        "crossSection",
        "blocking",
        section.sourceRef,
      ),
    );
  } else {
    crossSection = "blocked";
    missingFields.push(
      buildMissingField(
        `sections[${section.id}].points`,
        `${section.sectionNo ?? section.title ?? section.id} / 累加幅・計画高`,
        "crossSection",
        "blocking",
        section.sourceRef,
      ),
    );
  }

  return {
    crossSection,
    planPreview: "blocked",
    export: "blocked",
    missingFields,
    calculatedAt: new Date().toISOString(),
  };
}

export function evaluateBridgeRenderability(
  bridge: Bridge,
  errorDiagnostics: ImporterDiagnostic[] = [],
): Renderability {
  const missingFields: MissingFieldRef[] = [];
  const sectionCrossStatuses = bridge.sections.map(
    (section) => evaluateSectionRenderability(section).crossSection,
  );
  const crossSection = aggregateStatuses(sectionCrossStatuses);

  const drawableSections = bridge.sections.filter(isPlanPreviewDrawableSection);
  const partialSections = bridge.sections.filter(isPlanPreviewPartialSection);

  let planPreview: RenderabilityStatus;
  if (drawableSections.length >= 2) {
    planPreview = "ok";
  } else if (drawableSections.length === 1 || partialSections.length >= 1) {
    planPreview = "partial";
    missingFields.push(
      buildMissingField(
        `bridges[${bridge.id}].sections`,
        `${bridge.name} / 平面プレビュー用セクション`,
        "planPreview",
        "blocking",
      ),
    );
  } else {
    planPreview = "blocked";
    missingFields.push(
      buildMissingField(
        `bridges[${bridge.id}].sections`,
        `${bridge.name} / XY 座標`,
        "planPreview",
        "blocking",
      ),
    );
  }

  const planElements = bridge.alignmentMetadata?.plan?.elements ?? [];
  const hasPlan = planElements.length > 0;

  const stationValues = bridge.sections
    .map((section) => section.stationingRef.stationValue)
    .filter((value): value is number => value != null);
  const stationsMonotonic =
    stationValues.length <= 1 ||
    stationValues.every(
      (value, index) => index === 0 || value > stationValues[index - 1]!,
    );

  const allSectionsMeetPlanPreview =
    bridge.sections.length > 0 &&
    bridge.sections.every((section) => {
      const hasXy = section.points.some(
        (point) => isNonNullNumber(point.x) && isNonNullNumber(point.y),
      );
      return (
        hasXy &&
        section.azimuth.value != null &&
        section.stationingRef.stationValue != null
      );
    });

  const hasProfile = (bridge.alignmentMetadata?.profile?.elements.length ?? 0) > 0;
  const hasCrossSlope =
    (bridge.alignmentMetadata?.crossSlope?.definitions.length ?? 0) > 0;

  let exportStatus: RenderabilityStatus;
  if (
    bridge.sections.length === 0 ||
    !hasPlan ||
    errorDiagnostics.some((diagnostic) => diagnostic.level === "error") ||
    !allSectionsMeetPlanPreview ||
    !stationsMonotonic
  ) {
    exportStatus = "blocked";
    if (!hasPlan) {
      missingFields.push(
        buildMissingField(
          `bridges[${bridge.id}].alignmentMetadata.plan`,
          `${bridge.name} / 平面線形 (plan)`,
          "export",
          "blocking",
        ),
      );
    }
    if (!stationsMonotonic) {
      missingFields.push(
        buildMissingField(
          `bridges[${bridge.id}].sections`,
          `${bridge.name} / 測点単調増加`,
          "export",
          "blocking",
        ),
      );
    }
    if (bridge.sections.length === 0) {
      missingFields.push(
        buildMissingField(
          `bridges[${bridge.id}].sections`,
          `${bridge.name} / 横断面`,
          "export",
          "blocking",
        ),
      );
    }
  } else if (!hasProfile || !hasCrossSlope) {
    exportStatus = "partial";
    if (!hasProfile) {
      missingFields.push(
        buildMissingField(
          `bridges[${bridge.id}].alignmentMetadata.profile`,
          `${bridge.name} / 縦断 (profile)`,
          "export",
          "degrading",
        ),
      );
    }
    if (!hasCrossSlope) {
      missingFields.push(
        buildMissingField(
          `bridges[${bridge.id}].alignmentMetadata.crossSlope`,
          `${bridge.name} / 横断勾配 (crossSlope)`,
          "export",
          "degrading",
        ),
      );
    }
  } else {
    exportStatus = "ok";
  }

  return {
    crossSection,
    planPreview,
    export: exportStatus,
    missingFields,
    calculatedAt: new Date().toISOString(),
  };
}

export function evaluateProjectRenderability(
  project: JipLinerImporterProject,
  errorDiagnostics: ImporterDiagnostic[] = [],
): Renderability {
  const missingFields: MissingFieldRef[] = [];
  const bridgeRenderabilities = project.bridges.map((bridge) =>
    evaluateBridgeRenderability(bridge, errorDiagnostics),
  );

  const crossSection = aggregateStatuses(
    bridgeRenderabilities.map((renderability) => renderability.crossSection),
  );
  const planPreview = aggregateStatuses(
    bridgeRenderabilities.map((renderability) => renderability.planPreview),
  );
  let exportStatus = aggregateStatuses(
    bridgeRenderabilities.map((renderability) => renderability.export),
  );

  for (const bridgeRenderability of bridgeRenderabilities) {
    missingFields.push(...bridgeRenderability.missingFields);
  }

  const horizontalDatum = project.coordinateSystem.horizontal.datum.trim();
  if (horizontalDatum.length === 0 && exportStatus !== "blocked") {
    exportStatus = "blocked";
    missingFields.push(
      buildMissingField(
        "coordinateSystem.horizontal.datum",
        "水平座標系 datum",
        "export",
        "blocking",
      ),
    );
  }

  if (
    exportStatus === "ok" &&
    bridgeRenderabilities.some(
      (renderability) => renderability.export === "partial",
    )
  ) {
    exportStatus = "partial";
  }

  return {
    crossSection,
    planPreview,
    export: exportStatus,
    missingFields,
    calculatedAt: new Date().toISOString(),
  };
}

export function renderabilityDiagnostics(
  renderability: Renderability,
): ImporterDiagnostic[] {
  const diagnostics: ImporterDiagnostic[] = [];
  const base = {
    id: "",
    targetPath: "",
    level: "info" as const,
    message: "",
  };

  if (renderability.crossSection === "blocked") {
    diagnostics.push({
      ...base,
      id: "render-cross-section-blocked",
      code: IMPORTER_RENDER_CROSS_SECTION_BLOCKED,
      level: "info",
      message: "横断図を描画するための最小要件を満たしていません。",
      targetPath: "renderability.crossSection",
    });
  }

  if (renderability.planPreview === "blocked") {
    diagnostics.push({
      ...base,
      id: "render-plan-preview-blocked",
      code: IMPORTER_RENDER_PLAN_PREVIEW_BLOCKED,
      level: "info",
      message: "平面プレビューを描画するための最小要件を満たしていません。",
      targetPath: "renderability.planPreview",
    });
  }

  if (renderability.export === "blocked") {
    diagnostics.push({
      ...base,
      id: "render-export-blocked",
      code: IMPORTER_RENDER_EXPORT_BLOCKED,
      level: "warning",
      message: "Phase 3.5 draft へエクスポートするための最小要件を満たしていません。",
      targetPath: "renderability.export",
    });
  } else if (renderability.export === "partial") {
    diagnostics.push({
      ...base,
      id: "render-export-degraded",
      code: IMPORTER_RENDER_EXPORT_DEGRADED,
      level: "info",
      message:
        "Phase 3.5 draft へエクスポートは可能ですが、補助入力が不足しています。",
      targetPath: "renderability.export",
    });
  }

  return diagnostics;
}
