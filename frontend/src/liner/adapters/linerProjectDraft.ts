import type { ProjectModel } from "../../types";
import type { BuildIntermediateInput } from "../core/pipeline/pipeline";
import type { AlignmentElement } from "../core/types";
import { sourceRevisionFor } from "../core/pipeline/sourceRevision";
import {
  migrateLinerDraftToVNext,
  type MigrateLinerDraftToVNextResult,
} from "../schema/projectLinerMigration";
import type { HorizontalElementDraft, LinerDomainDraftVNext } from "../schema/types";
import { PROJECT_LINER_METADATA_SCHEMA_VERSION } from "../schema/types";
import { createDefaultLinerDraft, type LinerDraft } from "./linerUiAdapter";

export function linerDraftFromProject(project: ProjectModel): LinerDraft {
  const persistedDraft = project.liner?.draft;
  if (persistedDraft) {
    return persistedDraft;
  }

  const migration = migrateLinerDraftToVNext(project.liner);
  if (migration.ok) {
    return buildIntermediateInputFromDomainDraft(migration.domainDraft);
  }

  return createDefaultLinerDraft();
}

export function readLinerDomainDraftFromProject(
  project: ProjectModel,
): MigrateLinerDraftToVNextResult {
  return migrateLinerDraftToVNext(project.liner);
}

function toAlignmentElement(element: HorizontalElementDraft): AlignmentElement {
  if (element.type === "straight") {
    return {
      type: "straight",
      id: element.id,
      start: element.start,
      azimuth: element.azimuth,
      length: element.length,
    };
  }
  if (element.type === "arc") {
    return {
      type: "arc",
      id: element.id,
      start: element.start,
      azimuth: element.azimuth,
      radius: element.radius,
      turn: element.turn,
      length: element.length,
    };
  }
  return {
    type: "clothoid",
    id: element.id,
    start: element.start,
    azimuth: element.azimuth,
    clothoidParameter: element.clothoidParameter,
    startRadius: element.startRadius,
    endRadius: element.endRadius,
    turn: element.turn,
    length: element.length,
  };
}

/**
 * Converts a vNext domain draft into the legacy BuildIntermediateInput shape used by the current UI.
 */
export function buildIntermediateInputFromDomainDraft(
  domainDraft: LinerDomainDraftVNext,
): BuildIntermediateInput {
  const defaultTemplate = domainDraft.crossSections[0];
  const offsets = defaultTemplate?.offsetLines.map((line) => line.offset) ?? [0];
  const gradeElement = domainDraft.verticalAlignment.elements.find(
    (element) => element.type === "grade",
  );
  const z = gradeElement?.type === "grade" ? gradeElement.startElevation : 0;

  return {
    alignment: {
      id: domainDraft.alignment.id,
      linerModelId: domainDraft.linerModelId,
      coordinatePolicyId: domainDraft.coordinatePolicyId,
      elements: domainDraft.alignment.elements.map(toAlignmentElement),
    },
    stationDefinition: domainDraft.stationDefinition,
    offsets,
    sampleInterval: domainDraft.sampling.display.maxChordLength,
    z,
  };
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
