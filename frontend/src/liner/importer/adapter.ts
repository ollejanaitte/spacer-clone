import {
  evaluateProjectRenderability,
  renderabilityDiagnostics,
} from "./renderability";
import type {
  AdapterDiagnostic,
  JipLinerImporterProject,
  Renderability,
} from "./types";
import {
  getImporterSchemaVersion,
  isSupportedImporterVersion,
} from "./version";
import { convertImporterToPhase35Draft } from "./export/ImporterToPhase35Adapter";

export interface AdapterResult {
  draft: unknown | null;
  diagnostics: AdapterDiagnostic[];
  renderability: Renderability;
}

export interface ImporterAdapter {
  convertProject(project: JipLinerImporterProject): AdapterResult;
}

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

function validateSchemaVersion(project: JipLinerImporterProject): AdapterDiagnostic[] {
  const version = getImporterSchemaVersion(project);
  if (version == null) {
    return [
      createDiagnostic({
        level: "error",
        code: "IMPORTER_SCHEMA_VERSION_MISSING",
        message: "liner.importerSchemaVersion が見つかりません。",
        targetPath: "liner.importerSchemaVersion",
      }),
    ];
  }

  if (!isSupportedImporterVersion(version)) {
    return [
      createDiagnostic({
        level: "error",
        code: "IMPORTER_SCHEMA_VERSION_UNSUPPORTED",
        message: `未対応の importer schema version です: ${version}`,
        targetPath: "liner.importerSchemaVersion",
      }),
    ];
  }

  return [];
}

function validateRequiredMetadata(
  project: JipLinerImporterProject,
): AdapterDiagnostic[] {
  const diagnostics: AdapterDiagnostic[] = [];

  if (project.bridges.length === 0) {
    diagnostics.push(
      createDiagnostic({
        level: "error",
        code: "IMPORTER_BRIDGE_MISSING",
        message: "橋梁が 1 件も登録されていません。",
        targetPath: "bridges",
      }),
    );
  }

  if (!project.coordinateSystem.horizontal.datum.trim()) {
    diagnostics.push(
      createDiagnostic({
        level: "warning",
        code: "IMPORTER_COORDINATE_DATUM_MISSING",
        message: "水平座標系 datum が未入力です。",
        targetPath: "coordinateSystem.horizontal.datum",
      }),
    );
  }

  if (project.coordinateSystem.horizontal.epoch == null) {
    diagnostics.push(
      createDiagnostic({
        level: "warning",
        code: "IMPORTER_COORDINATE_EPOCH_MISSING",
        message: "水平座標系 epoch が未入力です。",
        targetPath: "coordinateSystem.horizontal.epoch",
      }),
    );
  }

  if (project.coordinateSystem.vertical.geoidModel == null) {
    diagnostics.push(
      createDiagnostic({
        level: "warning",
        code: "IMPORTER_GEOID_MODEL_MISSING",
        message: "鉛直座標系 geoidModel が未入力です。",
        targetPath: "coordinateSystem.vertical.geoidModel",
      }),
    );
  }

  for (const bridge of project.bridges) {
    if (bridge.sections.length === 0) {
      diagnostics.push(
        createDiagnostic({
          level: "error",
          code: "IMPORTER_SECTION_MISSING",
          message: `橋梁 ${bridge.name} に横断面がありません。`,
          targetPath: `bridges[${bridge.id}].sections`,
        }),
      );
    }
  }

  return diagnostics;
}

function validateRenderability(
  project: JipLinerImporterProject,
  errorDiagnostics: AdapterDiagnostic[],
): { renderability: Renderability; diagnostics: AdapterDiagnostic[] } {
  const renderability = evaluateProjectRenderability(project, errorDiagnostics);
  const diagnostics = renderabilityDiagnostics(renderability).map((item) =>
    createDiagnostic(item),
  );
  return { renderability, diagnostics };
}

export class ImporterAdapterSkeleton implements ImporterAdapter {
  convertProject(project: JipLinerImporterProject): AdapterResult {
    const result = convertImporterToPhase35Draft(project);
    return {
      draft: result.draft,
      diagnostics: result.diagnostics,
      renderability: result.renderability,
    };
  }
}

export const defaultImporterAdapter: ImporterAdapter =
  new ImporterAdapterSkeleton();

export function convertImporterProject(
  project: JipLinerImporterProject,
): AdapterResult {
  return defaultImporterAdapter.convertProject(project);
}

export {
  validateSchemaVersion,
  validateRequiredMetadata,
  validateRenderability,
};
