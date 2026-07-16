import { describe, expect, it } from "vitest";
import { createDefaultProject } from "../../data/defaultProject";
import {
  addLinerOffset,
  createDefaultLinerDraft,
  updateLinerDraftSettings,
  updateLinerCrossSectionTemplate,
  updateLinerCrossSlope,
  updateLinerVerticalAlignment,
} from "./linerUiAdapter";
import {
  linerDraftFromProject,
  tryWithProjectLinerDraft,
  validateLinerDraftForCommit,
  withProjectLinerDraft,
  withProjectLinerDomainDraft,
} from "./linerProjectDraft";
import { convertImporterToPhase35Draft } from "../importer/export/ImporterToPhase35Adapter";
import { createSampleImporterProject } from "../importer/__tests__/fixtures/sampleProject";
import {
  LINER_DRAFT_SCHEMA_VERSION,
  PROJECT_LINER_METADATA_SCHEMA_VERSION,
} from "../schema/types";

describe("liner project draft persistence", () => {
  it("keeps the previous project when a draft cannot be migrated", () => {
    const project = createDefaultProject();
    const invalidDraft = createDefaultLinerDraft();
    invalidDraft.alignment.id = "";

    expect(tryWithProjectLinerDraft(project, invalidDraft)).toBe(project);
  });

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

  it("stores domain draft directly via withProjectLinerDomainDraft", () => {
    const conversion = convertImporterToPhase35Draft(createSampleImporterProject());
    expect(conversion.draft).not.toBeNull();
    const project = withProjectLinerDomainDraft(createDefaultProject(), conversion.draft!);

    expect(project.liner?.domainDraft?.alignment.elements.length).toBeGreaterThan(0);
    expect(linerDraftFromProject(project)?.alignment.elements.length).toBeGreaterThan(0);
  });

  it("validates P2-D06 viewer E2E-like drafts for commit", () => {
    let draft = createDefaultLinerDraft();
    draft.alignment.id = "alignment-p2-d06";
    draft.alignment.linerModelId = "liner-p2-d06";
    draft.alignment.elements[0] = {
      ...draft.alignment.elements[0],
      length: 24,
    };
    draft = updateLinerDraftSettings(draft, { sampleInterval: 12 });
    draft = updateLinerVerticalAlignment(draft, {
      id: "VA-default",
      elements: [
        {
          type: "grade",
          id: "VG-default",
          startStation: 0,
          endStation: 24,
          startElevation: 10,
          grade: 0.01,
          length: 24,
        },
      ],
    });

    expect(validateLinerDraftForCommit(draft)).toBeNull();
    expect(withProjectLinerDraft(createDefaultProject(), draft).liner?.domainDraft).toMatchObject({
      verticalAlignment: {
        elements: [expect.objectContaining({ startElevation: 10, grade: 0.01, endStation: 24 })],
      },
    });
  });

  it("validates persisted domain round-trip drafts for commit", () => {
    const originalDraft = createDefaultLinerDraft();
    const persistedDraft = linerDraftFromProject(
      withProjectLinerDraft(createDefaultProject(), originalDraft),
    );
    expect(persistedDraft).toBeDefined();
    expect(persistedDraft).toEqual(originalDraft);
    expect(Object.keys(persistedDraft!).sort()).toEqual(Object.keys(originalDraft).sort());
    expect(validateLinerDraftForCommit(originalDraft)).toBeNull();
    expect(validateLinerDraftForCommit(persistedDraft!)).toBeNull();
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

  it("preserves gridDefinitions and multiple cross-sections through save and reload", () => {
    const draft = {
      ...createDefaultLinerDraft(),
      crossSections: [
        {
          id: "CS-a",
          name: "A",
          station: 0,
          offsetLines: [
            { id: "OL-a-l", offset: -4, elevation: 0, role: "edge" as const },
            { id: "OL-a-c", offset: 0, elevation: 0, role: "lane" as const },
            { id: "OL-a-r", offset: 4, elevation: 0, role: "edge" as const },
          ],
        },
        {
          id: "CS-b",
          name: "B",
          station: 100,
          offsetLines: [
            { id: "OL-b-l", offset: -6, elevation: 0, role: "edge" as const },
            { id: "OL-b-c", offset: 0, elevation: 0, role: "lane" as const },
            { id: "OL-b-r", offset: 6, elevation: 0, role: "edge" as const },
          ],
        },
      ],
      gridDefinitions: [
        {
          id: "GRID-a",
          crossSectionTemplateId: "CS-a",
          stationRange: { startPhysicalDistance: 0, endPhysicalDistance: 50 },
          offsetLineIds: ["OL-a-l", "OL-a-c", "OL-a-r"],
        },
        {
          id: "GRID-b",
          crossSectionTemplateId: "CS-b",
          stationRange: { startPhysicalDistance: 50, endPhysicalDistance: 100 },
          offsetLineIds: ["OL-b-l", "OL-b-c", "OL-b-r"],
        },
      ],
      offsets: [-4, 0, 4],
    };
    const project = withProjectLinerDraft(createDefaultProject(), draft);
    const reloaded = linerDraftFromProject(project);

    expect(project.liner?.domainDraft?.crossSections.map((entry) => entry.id)).toEqual(["CS-a", "CS-b"]);
    expect(project.liner?.domainDraft?.gridDefinitions).toEqual(draft.gridDefinitions);
    expect(reloaded?.crossSections).toEqual(draft.crossSections);
    expect(reloaded?.gridDefinitions).toEqual(draft.gridDefinitions);
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
