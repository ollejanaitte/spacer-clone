import { describe, expect, it } from "vitest";
import { createDefaultProject } from "../../data/defaultProject";
import { addLinerOffset, createDefaultLinerDraft } from "./linerUiAdapter";
import { linerDraftFromProject, withProjectLinerDraft } from "./linerProjectDraft";

describe("liner project draft persistence", () => {
  it("stores a liner draft under project.liner", () => {
    const draft = addLinerOffset(createDefaultLinerDraft());
    const project = withProjectLinerDraft(createDefaultProject(), draft);

    expect(project.liner?.draft).toEqual(draft);
    expect(project.liner?.linerModelId).toBe(draft.alignment.linerModelId);
    expect(project.liner?.sourceRevision).toHaveLength(64);
  });

  it("returns the persisted draft when available", () => {
    const draft = addLinerOffset(createDefaultLinerDraft());
    const project = withProjectLinerDraft(createDefaultProject(), draft);

    expect(linerDraftFromProject(project)).toEqual(draft);
  });

  it("falls back to a default draft for old projects", () => {
    expect(linerDraftFromProject(createDefaultProject())).toEqual(createDefaultLinerDraft());
  });
});
