import { describe, expect, it } from "vitest";
import { createDefaultProject } from "./data/defaultProject";
import { buildLinerViewerReviewFromDraft } from "./liner/adapters/linerViewerAdapter";
import {
  addLinerOffset,
  createDefaultLinerDraft,
  updateLinerStraightElement,
} from "./liner/adapters/linerUiAdapter";
import { linerDraftFromProject, withProjectLinerDraft } from "./liner/adapters/linerProjectDraft";
import { resetProjectModelContents, resetProjectModelContentsIfConfirmed } from "./modelReset";
import type { ProjectModel } from "./types";

function projectWithEditedLiner(): ProjectModel {
  const draft = updateLinerStraightElement(addLinerOffset(createDefaultLinerDraft()), "S1", {
    length: 140,
  });
  const project = withProjectLinerDraft(createDefaultProject(), draft);
  const sourceRevision = project.liner?.sourceRevision ?? "source-revision";

  return {
    ...project,
    nodes: [
      ...project.nodes,
      { id: "N_LINER_liner-model-1_001_001", x: 1, y: 2, z: 3 },
    ],
    members: [
      ...project.members,
      {
        id: "M_LINER_liner-model-1_L_001_001",
        nodeI: "N_LINER_liner-model-1_001_001",
        nodeJ: "G0",
        materialId: "MAT_DECK",
        sectionId: "SEC_DECK",
      },
    ],
    linerTrace: [
      {
        frameEntityId: "N_LINER_liner-model-1_001_001",
        frameEntityType: "node" as const,
        linerModelId: "liner-model-1",
        coordinatePolicyId: "global",
        sourceRevision,
        gridPointId: "GP-liner-model-1-001-001",
      },
    ],
  };
}

describe("resetProjectModelContents", () => {
  it("keeps a valid LINER initial state after clearing model contents", () => {
    const reset = resetProjectModelContents(projectWithEditedLiner());

    expect(reset.nodes).toEqual([]);
    expect(reset.members).toEqual([]);
    expect(reset.materials).toEqual([]);
    expect(reset.sections).toEqual([]);
    expect(reset.linerTrace).toEqual([]);
    expect(linerDraftFromProject(reset)).toEqual(createDefaultLinerDraft());
    expect(reset.liner?.linerModelId).toBe("liner-model-1");
    expect(reset.liner?.sourceRevision).toHaveLength(64);
  });

  it("allows LINER draft editing after reset", () => {
    const reset = resetProjectModelContents(projectWithEditedLiner());
    const edited = updateLinerStraightElement(linerDraftFromProject(reset), "S1", { length: 75 });
    const nextProject = withProjectLinerDraft(reset, edited);

    const draft = linerDraftFromProject(nextProject);
    expect(draft.alignment.elements[0].length).toBe(75);
    expect(nextProject.liner?.sourceRevision).not.toBe(reset.liner?.sourceRevision);
  });

  it("can build and commit a 3D model from LINER after reset without stale mapping entities", () => {
    const reset = resetProjectModelContents(projectWithEditedLiner());
    const edited = updateLinerStraightElement(linerDraftFromProject(reset), "S1", { length: 30 });
    const review = buildLinerViewerReviewFromDraft(edited, reset, { generatedAt: "2026-06-29T00:00:00Z" });

    expect(review.viewerProject).not.toBeNull();
    expect(review.summary.validationReady).toBe(true);
    expect(review.summary.nodeCount).toBeGreaterThan(0);
    expect(review.summary.memberCount).toBeGreaterThan(0);
    expect(review.viewerProject?.nodes.some((node) => node.id === "N_LINER_liner-model-1_001_001")).toBe(false);
    expect(review.viewerProject?.linerTrace?.length).toBe(review.summary.traceCount);
  });

  it("returns the original project when reset confirmation is cancelled", () => {
    const project = projectWithEditedLiner();
    const reset = resetProjectModelContentsIfConfirmed(project, () => false);

    expect(reset).toBe(project);
    const originalDraft = linerDraftFromProject(reset);
    expect(originalDraft.alignment.elements[0].length).toBe(140);
    expect(reset.nodes.length).toBeGreaterThan(0);
    expect(reset.linerTrace).toHaveLength(1);
  });
});
