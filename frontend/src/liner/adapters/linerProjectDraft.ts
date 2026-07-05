import type { ProjectModel } from "../../types";
import type { BuildIntermediateInput } from "../core/pipeline/pipeline";
import type { AlignmentElement } from "../core/types";
import { sourceRevisionFor } from "../core/pipeline/sourceRevision";
import {
  migrateLinerDraftToVNext,
  type MigrateLinerDraftToVNextResult,
} from "../schema/projectLinerMigration";
import type { HorizontalElementDraft, LinerDomainDraftVNext } from "../schema/types";
import {
  LINER_DRAFT_SCHEMA_VERSION,
  PROJECT_LINER_METADATA_SCHEMA_VERSION,
} from "../schema/types";
import type { LinerDraft } from "./linerUiAdapter";

export function linerDraftFromProject(project: ProjectModel): LinerDraft | undefined {
  if (!project.liner) {
    return undefined;
  }

  const persistedDraft = project.liner?.draft;
  if (persistedDraft) {
    return persistedDraft;
  }

  const migration = migrateLinerDraftToVNext(project.liner);
  if (migration.ok) {
    return buildIntermediateInputFromDomainDraft(migration.domainDraft);
  }

  return undefined;
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
    verticalAlignment: domainDraft.verticalAlignment,
    crossSections: domainDraft.crossSections,
    measuredGrid: domainDraft.measuredGrid,
    offsets,
    sampleInterval: domainDraft.sampling.display.maxChordLength,
    z,
  };
}

function domainDraftFromLinerDraft(draft: LinerDraft): LinerDomainDraftVNext {
  const migration = migrateLinerDraftToVNext({ draft });
  if (!migration.ok) {
    const messages = migration.diagnostics.map((diagnostic) => diagnostic.message).join("; ");
    throw new Error(`Cannot convert liner draft to vNext domain draft: ${messages}`);
  }
  return migration.domainDraft;
}

export function withProjectLinerDraft(project: ProjectModel, draft: LinerDraft): ProjectModel {
  const domainDraft = domainDraftFromLinerDraft(draft);
  return withProjectLinerDomainDraft(project, domainDraft);
}

export function withProjectLinerDomainDraft(
  project: ProjectModel,
  domainDraft: LinerDomainDraftVNext,
): ProjectModel {
  const linerDraft = buildIntermediateInputFromDomainDraft(domainDraft);
  const { draft: _legacyDraft, ...existingLiner } = project.liner ?? {};

  return {
    ...project,
    liner: {
      ...existingLiner,
      schemaVersion: PROJECT_LINER_METADATA_SCHEMA_VERSION,
      draftSchemaVersion: LINER_DRAFT_SCHEMA_VERSION,
      sourceRevision: sourceRevisionFor(linerDraft),
      linerModelId: domainDraft.linerModelId,
      coordinatePolicyId: domainDraft.coordinatePolicyId,
      intermediateSchemaVersion: "0.2.0",
      domainDraft: structuredClone(domainDraft),
    },
  };
}
