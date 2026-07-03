import { migrateProject } from "../migration/migrationRegistry";
import type { ImporterDiagnostic, JipLinerImporterProject } from "../types";
import {
  IMPORTER_SCHEMA_VERSION,
  getImporterSchemaVersion,
  isSupportedImporterVersion,
} from "../version";
import { validateImporterProjectSchema } from "./validateImporterProject";

export type ImportProjectJsonResult = {
  ok: boolean;
  project?: JipLinerImporterProject;
  diagnostics: ImporterDiagnostic[];
};

function parseJsonPayload(jsonText: string): { data?: unknown; diagnostics: ImporterDiagnostic[] } {
  try {
    return { data: JSON.parse(jsonText) as unknown, diagnostics: [] };
  } catch (error) {
    return {
      diagnostics: [
        {
          id: "import-json-parse",
          level: "error",
          code: "IMPORTER_JSON_PARSE",
          message:
            error instanceof Error ? error.message : "Importer project JSON の解析に失敗しました。",
          targetPath: "/",
        },
      ],
    };
  }
}

export function importProjectJson(jsonText: string): ImportProjectJsonResult {
  const parsed = parseJsonPayload(jsonText);
  if (parsed.data === undefined) {
    return { ok: false, diagnostics: parsed.diagnostics };
  }

  const diagnostics: ImporterDiagnostic[] = [...parsed.diagnostics];
  const version = getImporterSchemaVersion(parsed.data as JipLinerImporterProject);
  if (!version) {
    diagnostics.push({
      id: "import-schema-version-missing",
      level: "error",
      code: "IMPORTER_SCHEMA_VERSION_MISSING",
      message: "liner.importerSchemaVersion が見つかりません。",
      targetPath: "liner.importerSchemaVersion",
    });
    return { ok: false, diagnostics };
  }

  if (!isSupportedImporterVersion(version)) {
    diagnostics.push({
      id: "import-schema-version-unsupported",
      level: "error",
      code: "IMPORTER_SCHEMA_VERSION_UNSUPPORTED",
      message: `未対応の importer schema version です: ${version}`,
      targetPath: "liner.importerSchemaVersion",
    });
    return { ok: false, diagnostics };
  }

  let migrated: JipLinerImporterProject;
  try {
    migrated = migrateProject(parsed.data, IMPORTER_SCHEMA_VERSION);
  } catch (error) {
    diagnostics.push({
      id: "import-migration-failed",
      level: "error",
      code: "IMPORTER_MIGRATION_FAILED",
      message:
        error instanceof Error ? error.message : "Importer project migration に失敗しました。",
      targetPath: "liner.importerSchemaVersion",
    });
    return { ok: false, diagnostics };
  }

  diagnostics.push(...validateImporterProjectSchema(migrated));
  if (diagnostics.some((entry) => entry.level === "error")) {
    return { ok: false, project: migrated, diagnostics };
  }

  return { ok: true, project: migrated, diagnostics };
}

export function exportProjectJson(project: JipLinerImporterProject): string {
  const schemaDiagnostics = validateImporterProjectSchema(project);
  if (schemaDiagnostics.some((entry) => entry.level === "error")) {
    throw new Error("Exporter project JSON schema validation failed.");
  }

  return `${JSON.stringify(project, null, 2)}\n`;
}
