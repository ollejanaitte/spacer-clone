import type { ProjectModel } from "../../../types";
import {
  linerDraftFromProject,
  withProjectLinerDomainDraft,
} from "../../adapters/linerProjectDraft";
import type { LinerDraft } from "../../adapters/linerUiAdapter";
import type { LinerDomainDraftVNext } from "../../schema/types";
import type { JipLinerImporterProject } from "../types";
import {
  convertImporterToPhase35Draft,
  type AdapterConversionResult,
} from "./ImporterToPhase35Adapter";

export type ImporterPhase35BridgeResult = {
  project: ProjectModel;
  draft: LinerDraft;
  domainDraft: LinerDomainDraftVNext;
};

export function storeImporterDomainDraftInProject(
  project: ProjectModel,
  domainDraft: LinerDomainDraftVNext,
): ImporterPhase35BridgeResult {
  const nextProject = withProjectLinerDomainDraft(project, domainDraft);
  const draft = linerDraftFromProject(nextProject);
  if (!draft) {
    throw new Error("Failed to load liner draft after storing importer domain draft.");
  }

  return {
    project: nextProject,
    draft,
    domainDraft,
  };
}

export type ConvertAndStoreImporterDraftResult =
  | { ok: true; bridge: ImporterPhase35BridgeResult; conversion: AdapterConversionResult }
  | { ok: false; conversion: AdapterConversionResult };

export function convertAndStoreImporterDraft(
  project: ProjectModel,
  importerProject: JipLinerImporterProject,
  bridgeId: string,
): ConvertAndStoreImporterDraftResult {
  const conversion = convertImporterToPhase35Draft(importerProject, bridgeId);
  if (conversion.renderability.export === "blocked" || conversion.draft == null) {
    return { ok: false, conversion };
  }

  const bridge = storeImporterDomainDraftInProject(project, conversion.draft);
  return { ok: true, bridge, conversion };
}

export function domainDraftToDownloadJson(domainDraft: LinerDomainDraftVNext): string {
  return JSON.stringify(domainDraft, null, 2);
}
