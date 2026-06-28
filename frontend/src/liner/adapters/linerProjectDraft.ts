import type { ProjectModel } from "../../types";
import { sourceRevisionFor } from "../core/pipeline/sourceRevision";
import { PROJECT_LINER_METADATA_SCHEMA_VERSION } from "../schema/types";
import { createDefaultLinerDraft, type LinerDraft } from "./linerUiAdapter";

export function linerDraftFromProject(project: ProjectModel): LinerDraft {
  return project.liner?.draft ?? createDefaultLinerDraft();
}

export function withProjectLinerDraft(project: ProjectModel, draft: LinerDraft): ProjectModel {
  return {
    ...project,
    liner: {
      ...project.liner,
      schemaVersion: PROJECT_LINER_METADATA_SCHEMA_VERSION,
      sourceRevision: sourceRevisionFor(draft),
      linerModelId: draft.alignment.linerModelId,
      coordinatePolicyId: draft.alignment.coordinatePolicyId,
      intermediateSchemaVersion: "0.2.0",
      draft,
    },
  };
}
