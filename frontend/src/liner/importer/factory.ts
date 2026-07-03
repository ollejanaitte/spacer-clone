import { evaluateProjectRenderability } from "./renderability";
import type { JipLinerImporterProject } from "./types";
import { IMPORTER_SCHEMA_VERSION } from "./version";

function createUniqueId(prefix: string): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return `${prefix}-${crypto.randomUUID()}`;
  }
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
}

export function createEmptyImporterProject(name = "新規プロジェクト"): JipLinerImporterProject {
  const now = new Date().toISOString();
  const project: JipLinerImporterProject = {
    liner: {
      importerSchemaVersion: IMPORTER_SCHEMA_VERSION,
    },
    id: createUniqueId("importer-project"),
    name,
    createdAt: now,
    updatedAt: now,
    coordinateSystem: {
      horizontal: {
        datum: "JGD2011",
        epoch: null,
        zone: null,
        unit: "m",
      },
      vertical: {
        heightDatum: "T.P.",
        geoidModel: null,
        unit: "m",
      },
    },
    sourcePdfRefs: [],
    savedSnapshots: [],
    bridges: [],
  };

  project.renderability = evaluateProjectRenderability(project);
  return project;
}
