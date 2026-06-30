import { describe, expect, it } from "vitest";
import { createDefaultProject } from "../../data/defaultProject";
import {
  addLinerOffset,
  createDefaultLinerDraft,
  updateLinerCrossSectionTemplate,
  updateLinerCrossSlope,
  updateLinerVerticalAlignment,
} from "./linerUiAdapter";
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

  it("preserves vertical and cross-section draft edits through vNext save and load", () => {
    const draft = createDefaultLinerDraft();
    const verticalDraft = updateLinerVerticalAlignment(draft, {
      id: "VA-edited",
      elements: [
        {
          type: "grade",
          id: "VG-edited",
          startStation: 0,
          endStation: 120,
          startElevation: 12,
          grade: 0.02,
          length: 120,
        },
      ],
    });
    const crossSectionDraft = updateLinerCrossSectionTemplate(verticalDraft, {
      id: "CS-edited",
      name: "Edited",
      offsetLines: [
        { id: "OL-left", offset: -3, elevation: 0.2, role: "lane" },
        { id: "OL-right", offset: 3, elevation: -0.2, role: "lane" },
      ],
    });
    const edited = updateLinerCrossSlope(crossSectionDraft, {
      signConvention: "right_down_positive",
      valuePercent: 2,
    });
    const project = withProjectLinerDraft(createDefaultProject(), edited);

    expect(project.liner?.domainDraft?.verticalAlignment.id).toBe("VA-edited");
    expect(project.liner?.domainDraft?.crossSections[0]?.id).toBe("CS-edited");
    expect(project.liner?.domainDraft?.crossSections[0]?.crossSlope?.valuePercent).toBe(2);
    expect(linerDraftFromProject(project)).toEqual(edited);
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

  it("returns undefined when the project has no LINER metadata", () => {
    expect(linerDraftFromProject(createDefaultProject())).toBeUndefined();
  });
});
