import { describe, expect, it } from "vitest";
import { createDefaultProject } from "../../data/defaultProject";
import { addLinerOffset, createDefaultLinerDraft } from "./linerUiAdapter";
import { linerDraftFromProject, withProjectLinerDraft } from "./linerProjectDraft";
import {
  LINER_DRAFT_SCHEMA_VERSION,
  PROJECT_LINER_METADATA_SCHEMA_VERSION,
} from "../schema/types";

describe("liner project draft persistence", () => {
  it("stores vNext domainDraft under project.liner without persisting legacy draft", () => {
    const draft = addLinerOffset(createDefaultLinerDraft());
    const project = withProjectLinerDraft(createDefaultProject(), draft);

    expect(project.liner?.draft).toBeUndefined();
    expect(project.liner?.draftSchemaVersion).toBe(LINER_DRAFT_SCHEMA_VERSION);
    expect(project.liner?.domainDraft).toBeDefined();
    expect(project.liner?.schemaVersion).toBe(PROJECT_LINER_METADATA_SCHEMA_VERSION);
    expect(project.liner?.linerModelId).toBe(draft.alignment.linerModelId);
    expect(project.liner?.coordinatePolicyId).toBe(draft.alignment.coordinatePolicyId);
    expect(project.liner?.intermediateSchemaVersion).toBe("0.2.0");
    expect(project.liner?.sourceRevision).toHaveLength(64);
  });

  it("returns an equivalent UI draft after vNext save and load", () => {
    const draft = addLinerOffset(createDefaultLinerDraft());
    const project = withProjectLinerDraft(createDefaultProject(), draft);

    expect(linerDraftFromProject(project)).toEqual(draft);
  });

  it("reads legacy project.liner.draft as a read-only fallback", () => {
    const draft = addLinerOffset(createDefaultLinerDraft());
    const legacyProject = {
      ...createDefaultProject(),
      liner: {
        schemaVersion: PROJECT_LINER_METADATA_SCHEMA_VERSION,
        sourceRevision: "legacy-revision",
        linerModelId: draft.alignment.linerModelId,
        coordinatePolicyId: draft.alignment.coordinatePolicyId,
        intermediateSchemaVersion: "0.2.0" as const,
        draft,
      },
    };

    expect(linerDraftFromProject(legacyProject)).toEqual(draft);
  });

  it("falls back to a default draft for old projects", () => {
    expect(linerDraftFromProject(createDefaultProject())).toEqual(createDefaultLinerDraft());
  });
});
