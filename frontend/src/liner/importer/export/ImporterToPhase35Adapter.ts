import { LINER_DRAFT_SCHEMA_VERSION } from "../../schema/version";
import type { LinerDomainDraftVNext } from "../../schema/types";
import {
  evaluateProjectRenderability,
  renderabilityDiagnostics,
} from "../renderability";
import type {
  AdapterDiagnostic,
  Bridge,
  ImporterConversionLog,
  JipLinerImporterProject,
  Renderability,
  SourceRef,
} from "../types";
import { IMPORTER_SCHEMA_VERSION } from "../version";
import { validateProject } from "../diagnostics/validateImporter";
import {
  validateRequiredMetadata,
  validateSchemaVersion,
} from "../adapter";
import { createUniqueId } from "../utils/importerUtils";
import {
  AggregateNormalizationError,
  buildNormalizationContext,
} from "./normalize/normalizationContext";
import { runPostConditions } from "./normalize/postConditions";
import { normalizeStationDefinition } from "./normalize/normalizeStationDefinition";
import { normalizeSpans } from "./normalize/normalizeSpans";
import { normalizeGridDefinitions } from "./normalize/normalizeGridDefinitions";
import { normalizeVerticalAlignment } from "./normalize/normalizeVerticalAlignment";
import { normalizeCrossSections } from "./normalize/normalizeCrossSections";
import {
  normalizeCrossBeams,
  normalizeSupports,
  normalizeWidthPoints,
} from "./normalize/normalizeSubstructure";

function createDiagnostic(
  partial: Omit<AdapterDiagnostic, "id"> & { id?: string },
): AdapterDiagnostic {
  return {
    id: partial.id ?? `${partial.code}-${partial.targetPath}`,
    level: partial.level,
    code: partial.code,
    message: partial.message,
    targetPath: partial.targetPath,
    sourceRef: partial.sourceRef,
    suggestedAction: partial.suggestedAction,
  };
}

function collectSourceRefs(project: JipLinerImporterProject): SourceRef[] {
  const refs: SourceRef[] = [];
  for (const bridge of project.bridges) {
    for (const section of bridge.sections) {
      refs.push(section.sourceRef);
      refs.push(section.azimuth.sourceRef);
      if (section.stationingRef.sourceRef) {
        refs.push(section.stationingRef.sourceRef);
      }
      for (const point of section.points) {
        refs.push(point.sourceRef);
        refs.push(point.x.sourceRef);
        refs.push(point.y.sourceRef);
        refs.push(point.designElevation.sourceRef);
      }
    }
  }
  return refs;
}

function pushNormalizationDiagnostics(
  diagnostics: AdapterDiagnostic[],
  ctx: ReturnType<typeof buildNormalizationContext>,
): void {
  for (const item of ctx.diagnostics) {
    diagnostics.push(
      createDiagnostic({
        id: `norm-${item.code}-${item.candidateValues.join("-")}`,
        level: item.level,
        code: item.code,
        message: item.detail,
        targetPath: "normalizationContext",
      }),
    );
  }
}

function applyPostConditionResults(
  diagnostics: AdapterDiagnostic[],
  draft: LinerDomainDraftVNext,
  ctx: ReturnType<typeof buildNormalizationContext>,
): void {
  const postResults = runPostConditions(ctx, draft);
  const errors = postResults.filter((result) => result.severity === "error");
  const warnings = postResults.filter((result) => result.severity === "warning");

  for (const warning of warnings) {
    diagnostics.push(
      createDiagnostic({
        id: `pc-${warning.code}-${warning.label}`,
        level: "warning",
        code: warning.code,
        message: warning.message,
        targetPath: warning.label,
      }),
    );
    console.warn(`[normalize] ${warning.code}: ${warning.message}`);
  }

  if (errors.length > 0) {
    throw new AggregateNormalizationError(
      errors.map((error) => ({ code: error.code, message: error.message })),
    );
  }
}

function buildDomainDraft(
  project: JipLinerImporterProject,
  bridge: Bridge,
  diagnostics: AdapterDiagnostic[],
): LinerDomainDraftVNext {
  const linerModelId = createUniqueId("liner-model");
  const planElements = bridge.alignmentMetadata?.plan?.elements ?? [];

  const sectionStations = bridge.sections
    .map((section) => {
      const ref = section.stationingRef;
      if (ref.cumulativeDistance != null) {
        return ref.cumulativeDistance;
      }
      return ref.stationValue;
    })
    .filter((value): value is number => value != null);
  const spanStartStations = bridge.spans.map((span) => span.startStation);
  const spanEndStations = bridge.spans.map((span) => span.endStation);
  const planLength = planElements.reduce((sum, element) => sum + element.length, 0);

  const ctx = buildNormalizationContext({
    sectionStations,
    spanStartStations,
    spanEndStations,
    planLength,
    stationEquations: [],
  });

  pushNormalizationDiagnostics(diagnostics, ctx);

  const draft: LinerDomainDraftVNext = {
    id: createUniqueId("domain-draft"),
    linerModelId,
    coordinatePolicyId: project.coordinateSystem.horizontal.datum || "default",
    alignment: {
      id: createUniqueId("alignment"),
      elements: planElements.map((element) => ({ ...element })),
    },
    stationDefinition: normalizeStationDefinition(sectionStations, ctx),
    verticalAlignment: normalizeVerticalAlignment(bridge, ctx),
    crossSections: normalizeCrossSections(bridge, ctx),
    gridDefinitions: normalizeGridDefinitions(bridge, ctx),
    spans: normalizeSpans(bridge, ctx),
    piers: normalizeSupports(bridge, ctx),
    crossBeams: normalizeCrossBeams(bridge, ctx),
    widthChangePoints: normalizeWidthPoints(bridge, ctx),
    generationSettings: {
      connectivityMode: "grid_full",
    },
    sampling: {
      display: { maxChordLength: 1, maxSagitta: 0.01, minSegmentsPerElement: 8 },
      dxf: { maxChordLength: 0.5, maxSagitta: 0.005, minSegmentsPerElement: 12 },
      frame: { maxMemberLength: 2, maxSagitta: 0.01, stationIntervalFallback: 1 },
    },
  };

  applyPostConditionResults(diagnostics, draft, ctx);
  return draft;
}

export type AdapterConversionResult = {
  draft: LinerDomainDraftVNext | null;
  diagnostics: AdapterDiagnostic[];
  renderability: Renderability;
  conversionLog: ImporterConversionLog | null;
};

export class ImporterToPhase35Adapter {
  convertProject(
    project: JipLinerImporterProject,
    bridgeId?: string,
  ): AdapterConversionResult {
    const diagnostics: AdapterDiagnostic[] = [];
    diagnostics.push(...validateSchemaVersion(project).map((item) => createDiagnostic(item)));
    diagnostics.push(...validateRequiredMetadata(project).map((item) => createDiagnostic(item)));

    const importerDiagnostics = validateProject(project);
    for (const item of importerDiagnostics) {
      diagnostics.push(createDiagnostic(item));
    }

    const renderability = evaluateProjectRenderability(
      project,
      importerDiagnostics.filter((item) => item.level === "error"),
    );
    diagnostics.push(...renderabilityDiagnostics(renderability).map((item) => createDiagnostic(item)));

    const bridge =
      project.bridges.find((entry) => entry.id === bridgeId) ?? project.bridges[0];

    if (!bridge) {
      return { draft: null, diagnostics, renderability, conversionLog: null };
    }

    if (renderability.export === "blocked") {
      return { draft: null, diagnostics, renderability, conversionLog: null };
    }

    if (diagnostics.some((item) => item.level === "error")) {
      return { draft: null, diagnostics, renderability, conversionLog: null };
    }

    let draft: LinerDomainDraftVNext | null = null;
    try {
      draft = buildDomainDraft(project, bridge, diagnostics);
    } catch (error) {
      if (error instanceof AggregateNormalizationError) {
        for (const result of error.results) {
          diagnostics.push(
            createDiagnostic({
              id: `pc-${result.code}`,
              level: "error",
              code: result.code,
              message: result.message,
              targetPath: "normalization.postConditions",
            }),
          );
        }
        return { draft: null, diagnostics, renderability, conversionLog: null };
      }
      throw error;
    }

    const conversionLog: ImporterConversionLog = {
      id: createUniqueId("conversion-log"),
      importerProjectId: project.id,
      bridgeId: bridge.id,
      sourceImporterSchemaVersion: IMPORTER_SCHEMA_VERSION,
      targetDraftSchemaVersion: LINER_DRAFT_SCHEMA_VERSION,
      convertedAt: new Date().toISOString(),
      diagnostics: diagnostics.filter((item) => item.level !== "info"),
      sourceRefs: collectSourceRefs(project),
      inferredValues: [],
    };

    if (renderability.export === "partial") {
      diagnostics.push(
        createDiagnostic({
          level: "warning",
          code: "IMPORTER_EXPORT_PARTIAL",
          message: "補助入力不足のため partial エクスポートです。",
          targetPath: "renderability.export",
        }),
      );
    }

    return { draft, diagnostics, renderability, conversionLog };
  }
}

export const defaultImporterToPhase35Adapter = new ImporterToPhase35Adapter();

export function convertImporterToPhase35Draft(
  project: JipLinerImporterProject,
  bridgeId?: string,
): AdapterConversionResult {
  return defaultImporterToPhase35Adapter.convertProject(project, bridgeId);
}
