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

function mapCrossSections(bridge: Bridge): LinerDomainDraftVNext["crossSections"] {
  const crossSlopeDefs = bridge.alignmentMetadata?.crossSlope?.definitions ?? [];
  const girderLines = bridge.girderLineSets[0]?.lines ?? [];

  if (crossSlopeDefs.length > 0) {
    return crossSlopeDefs.map((definition, index) => ({
      id: definition.id || createUniqueId("cross-section-template"),
      name: `CrossSlope @ ${definition.station}`,
      offsetLines: girderLines.map((line, lineIndex) => ({
        id: createUniqueId("offset-line"),
        offset: line.nominalOffset ?? lineIndex,
        elevation: 0,
        role: line.role === "edge" ? "edge" : line.role === "girder" ? "lane" : "custom",
        label: line.label,
      })),
      crossSlope: {
        signConvention: "right_down_positive" as const,
        valuePercent: definition.crossSlope,
      },
    }));
  }

  return [
    {
      id: createUniqueId("cross-section-template"),
      name: `${bridge.name} default`,
      offsetLines: girderLines.map((line, index) => ({
        id: createUniqueId("offset-line"),
        offset: line.nominalOffset ?? index,
        elevation: 0,
        label: line.label,
      })),
    },
  ];
}

function mapGridDefinitions(bridge: Bridge): LinerDomainDraftVNext["gridDefinitions"] {
  const templateId = createUniqueId("grid-template");
  const stations = bridge.sections
    .map((section) => section.stationingRef.stationValue)
    .filter((value): value is number => value != null);

  if (stations.length < 2) {
    return [];
  }

  return [
    {
      id: createUniqueId("grid-definition"),
      crossSectionTemplateId: templateId,
      stationRange: {
        startPhysicalDistance: Math.min(...stations),
        endPhysicalDistance: Math.max(...stations),
      },
      stationInterval: undefined,
    },
  ];
}

function mapSpans(bridge: Bridge): LinerDomainDraftVNext["spans"] {
  return bridge.spans.map((span) => ({
    id: span.id,
    startPhysicalDistance: span.startStation ?? 0,
    endPhysicalDistance: span.endStation ?? 0,
  }));
}

function buildDomainDraft(
  project: JipLinerImporterProject,
  bridge: Bridge,
): LinerDomainDraftVNext {
  const linerModelId = createUniqueId("liner-model");
  const planElements = bridge.alignmentMetadata?.plan?.elements ?? [];
  const profileElements = bridge.alignmentMetadata?.profile?.elements ?? [];

  return {
    id: createUniqueId("domain-draft"),
    linerModelId,
    coordinatePolicyId: project.coordinateSystem.horizontal.datum || "default",
    alignment: {
      id: createUniqueId("alignment"),
      elements: planElements.map((element) => ({ ...element })),
    },
    stationDefinition: {
      originDisplayedStation: bridge.sections[0]?.stationingRef.stationValue ?? 0,
      explicitStations: bridge.sections
        .map((section) => section.stationingRef.stationValue)
        .filter((value): value is number => value != null),
    },
    verticalAlignment: {
      id: createUniqueId("vertical-alignment"),
      elements: profileElements.map((element) => {
        if (element.type === "grade") {
          return {
            ...element,
            length: element.endStation - element.startStation,
          };
        }
        return element;
      }),
    },
    crossSections: mapCrossSections(bridge),
    gridDefinitions: mapGridDefinitions(bridge),
    spans: mapSpans(bridge),
    piers: [],
    generationSettings: {
      connectivityMode: "grid_full",
    },
    sampling: {
      display: { maxChordLength: 1, maxSagitta: 0.01, minSegmentsPerElement: 8 },
      dxf: { maxChordLength: 0.5, maxSagitta: 0.005, minSegmentsPerElement: 12 },
      frame: { maxMemberLength: 2, maxSagitta: 0.01, stationIntervalFallback: 1 },
    },
  };
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

    const draft = buildDomainDraft(project, bridge);
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
