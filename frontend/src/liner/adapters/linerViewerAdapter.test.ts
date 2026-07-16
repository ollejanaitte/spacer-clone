import { describe, expect, it } from "vitest";
import { createDefaultProject } from "../../data/defaultProject";
import {
  LINER_HEADLESS_FIXTURE_MATERIAL_IDS,
  LINER_HEADLESS_FIXTURE_SECTION_IDS,
} from "../headless";
import { isLinerDerivedProject, resolveInitialSpacerAxisSwap } from "../../viewer/coordinateTransform";
import {
  buildLinerViewerReviewFromDraft,
  collectViewerNodeCoordinateMismatches,
  collectViewerNodeGridMismatches,
} from "./linerViewerAdapter";
import {
  createDefaultCrossSectionTemplate,
  createDefaultLinerDraft,
  updateLinerCrossSectionTemplate,
  updateLinerDraftSettings,
  updateLinerVerticalAlignment,
} from "./linerUiAdapter";
import {
  buildIntermediateInputFromDomainDraft,
  linerDraftFromProject,
  withProjectLinerDraft,
} from "./linerProjectDraft";
import type { BuildIntermediateInput } from "../core/pipeline/pipeline";
import type { LinearAlignment } from "../core/types";
import type { CrossSectionTemplateDraft, VerticalAlignmentDraft } from "../schema/types";

function createPhase2ViewerDraft(): BuildIntermediateInput {
  const alignment: LinearAlignment = {
    id: "alignment-p2-d06",
    linerModelId: "viewer-z-model",
    coordinatePolicyId: "global",
    elements: [
      {
        type: "straight",
        id: "L1",
        start: { x: 0, y: 0 },
        azimuth: 0,
        length: 20,
      },
    ],
  };
  const verticalAlignment: VerticalAlignmentDraft = {
    id: "VA-p2-d06",
    elements: [
      {
        type: "grade",
        id: "VG-p2-d06",
        startStation: 0,
        endStation: 20,
        startElevation: 10,
        grade: 0.05,
        length: 20,
      },
    ],
  };
  const crossSectionTemplate: CrossSectionTemplateDraft = {
    id: "CS-p2-d06",
    name: "Viewer Z",
    crossSlope: {
      signConvention: "right_down_positive",
      valuePercent: 2,
    },
    offsetLines: [
      { id: "left", offset: -5, elevation: 0.1, role: "edge" },
      { id: "center", offset: 0, elevation: 0, role: "lane" },
      { id: "right", offset: 5, elevation: -0.1, role: "edge" },
    ],
  };

  return {
    alignment,
    stationDefinition: {
      originDisplayedStation: 0,
      interval: 10,
    },
    verticalAlignment,
    crossSections: [crossSectionTemplate],
    crossSlopeIntervals: [
      {
        id: "CF-p2-d06",
        startPhysicalDistance: 0,
        endPhysicalDistance: 20,
        mode: "one_way_right",
        leftSlopePercent: 0,
        rightSlopePercent: 2,
        pivotDistance: 0,
      },
    ],
    offsets: [-5, 0, 5],
    sampleInterval: 10,
    z: 10,
    selectedCrossSectionStation: 0,
  };
}

describe("linerViewerAdapter", () => {
  it("builds a Viewer3D-ready project through the headless path", () => {
    const result = buildLinerViewerReviewFromDraft(createDefaultLinerDraft(), createDefaultProject(), {
      generatedAt: "2026-01-01T00:00:00.000Z",
    });

    expect(result.viewerProject).not.toBeNull();
    expect(result.summary.validationReady).toBe(true);
    expect(result.summary.nodeCount).toBeGreaterThan(0);
    expect(result.summary.memberCount).toBeGreaterThan(0);
    expect(result.summary.traceCount).toBe(result.mappingResult.linerTrace.length);
    expect(result.viewerProject?.liner?.linerModelId).toBe("liner-model-1");
    expect(result.viewerProject?.analysisSettings.solver).toBe("scipy_sparse");
    expect(result.viewerProject?.materials).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: LINER_HEADLESS_FIXTURE_MATERIAL_IDS.deck }),
      ]),
    );
    expect(result.viewerProject?.sections).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: LINER_HEADLESS_FIXTURE_SECTION_IDS.deck }),
      ]),
    );
  });

  it("blocks viewer project output for unsafe draft inputs before pipeline execution", () => {
    const draft = updateLinerDraftSettings(createDefaultLinerDraft(), { sampleInterval: 0 });
    const result = buildLinerViewerReviewFromDraft(draft, createDefaultProject());

    expect(result.viewerProject).toBeNull();
    expect(result.summary.validationReady).toBe(false);
    expect(result.diagnostics[0]).toMatchObject({
      level: "error",
      code: "LINER_GRID_SPACING_INVALID",
    });
  });

  it("marks mapping review viewer projects as liner-derived for axis swap defaults", () => {
    const result = buildLinerViewerReviewFromDraft(createDefaultLinerDraft(), createDefaultProject());

    expect(result.viewerProject).not.toBeNull();
    expect(isLinerDerivedProject(result.viewerProject!)).toBe(true);
    expect(resolveInitialSpacerAxisSwap(true)).toBe("on");
  });

  it("reflects vertical profile, crossfall, and template elevation in viewer node Z", () => {
    const draft = createPhase2ViewerDraft();
    const review = buildLinerViewerReviewFromDraft(draft, createDefaultProject(), {
      generatedAt: "2026-01-01T00:00:00.000Z",
    });

    expect(review.viewerProject).not.toBeNull();
    const centerNode = review.viewerProject?.nodes.find((node) => node.id === "N_LINER_viewer-z-model_002_001");
    const rightNode = review.viewerProject?.nodes.find((node) => node.id === "N_LINER_viewer-z-model_002_002");

    expect(centerNode?.x).toBeCloseTo(20, 6);
    expect(centerNode?.y).toBeCloseTo(0, 6);
    expect(centerNode?.z).toBeCloseTo(11, 6);
    expect(rightNode?.z).toBeCloseTo(10.8, 6);
  });

  it("keeps viewer nodes aligned with coordinate3d and intermediate grid", () => {
    const draft = createPhase2ViewerDraft();
    const review = buildLinerViewerReviewFromDraft(draft, createDefaultProject(), {
      generatedAt: "2026-01-01T00:00:00.000Z",
    });

    expect(collectViewerNodeCoordinateMismatches(draft, review)).toEqual([]);
    expect(collectViewerNodeGridMismatches(review)).toEqual([]);
  });

  it("applies width change points to viewer node plan coordinates", () => {
    const draft = {
      ...createPhase2ViewerDraft(),
      crossSections: [
        {
          id: "CS-width",
          name: "Width",
          offsetLines: [
            { id: "OL-l", offset: -2, elevation: 0, role: "lane" as const },
            { id: "OL-c", offset: 0, elevation: 0, role: "lane" as const },
            { id: "OL-r", offset: 4, elevation: 0, role: "lane" as const },
          ],
        },
      ],
      offsets: [-2, 0, 4],
      widthChangePoints: [
        {
          id: "WP-p2-d06",
          physicalDistance: 0,
          leftOffset: 4,
          rightOffset: 8,
        },
      ],
    };
    const review = buildLinerViewerReviewFromDraft(draft, createDefaultProject());
    const startRightGridPoint = review.intermediate.grid.points.find(
      (point) => point.physicalDistance === 0 && point.labels.transverseIndex === 2,
    );
    const startRightNode = review.viewerProject?.nodes.find(
      (node) => node.id === "N_LINER_viewer-z-model_000_002",
    );

    expect(startRightGridPoint?.offset).toBeCloseTo(8, 6);
    expect(startRightNode?.y).toBeCloseTo(startRightGridPoint?.y ?? Number.NaN, 6);
    expect(collectViewerNodeCoordinateMismatches(draft, review)).toEqual([]);
  });

  it("builds mapping review for persisted E2E-like drafts with graded Z", () => {
    let draft = linerDraftFromProject(
      withProjectLinerDraft(createDefaultProject(), createDefaultLinerDraft()),
    )!;
    draft.alignment.id = "alignment-p2-d06";
    draft.alignment.linerModelId = "liner-p2-d06";
    draft = updateLinerDraftSettings(draft, { sampleInterval: 50 });
    draft = updateLinerVerticalAlignment(draft, {
      id: "VA-default",
      elements: [
        {
          type: "grade",
          id: "VG-default",
          startStation: 0,
          endStation: 100,
          startElevation: 10,
          grade: 0.01,
          length: 100,
        },
      ],
    });

    const review = buildLinerViewerReviewFromDraft(draft, createDefaultProject());
    expect(review.diagnostics.map((diagnostic) => diagnostic.code)).toEqual([]);
    expect(review.summary.validationReady).toBe(true);
    expect(review.viewerProject).not.toBeNull();
    const endNode = review.viewerProject?.nodes.find((node) => node.x === 100);
    expect(endNode?.z).toBeCloseTo(11, 6);
    expect(collectViewerNodeCoordinateMismatches(draft, review)).toEqual([]);
  });

  it("reloads domainDraft and reproduces viewer node coordinates", () => {
    const draft = createPhase2ViewerDraft();
    const project = withProjectLinerDraft(createDefaultProject(), draft);
    const reloadedDraft = linerDraftFromProject(project);
    expect(reloadedDraft).toBeDefined();

    const before = buildLinerViewerReviewFromDraft(draft, createDefaultProject());
    const after = buildLinerViewerReviewFromDraft(reloadedDraft!, createDefaultProject());

    expect(collectViewerNodeCoordinateMismatches(reloadedDraft!, after)).toEqual([]);
    expect(collectViewerNodeGridMismatches(after)).toEqual([]);

    const beforeNodes = before.viewerProject?.nodes
      .map((node) => ({ id: node.id, x: node.x, y: node.y, z: node.z }))
      .sort((left, right) => left.id.localeCompare(right.id));
    const afterNodes = after.viewerProject?.nodes
      .map((node) => ({ id: node.id, x: node.x, y: node.y, z: node.z }))
      .sort((left, right) => left.id.localeCompare(right.id));

    expect(afterNodes).toEqual(beforeNodes);
  });

  it("round-trips vertical alignment through domainDraft without changing viewer Z", () => {
    const draft = updateLinerVerticalAlignment(createDefaultLinerDraft(), {
      id: "VA-reload",
      elements: [
        {
          type: "grade",
          id: "VG-reload",
          startStation: 0,
          endStation: 100,
          startElevation: 12.5,
          grade: 0.02,
          length: 100,
        },
      ],
    });
    const domainDraft = withProjectLinerDraft(createDefaultProject(), draft).liner?.domainDraft;
    expect(domainDraft).toBeDefined();

    const reloaded = buildIntermediateInputFromDomainDraft(domainDraft!);
    const review = buildLinerViewerReviewFromDraft(reloaded, createDefaultProject());
    const endNode = review.viewerProject?.nodes.find(
      (node) => node.id === "N_LINER_liner-model-1_010_000",
    );

    expect(endNode?.z).toBeCloseTo(14.5, 6);
    expect(collectViewerNodeCoordinateMismatches(reloaded, review)).toEqual([]);
  });

  it("reflects cross-section offset edits in viewer node coordinates", () => {
    const draft = updateLinerDraftSettings(createDefaultLinerDraft(), {
      offsets: [-4, 0, 4],
      sampleInterval: 20,
    });
    const withTemplate = updateLinerCrossSectionTemplate(
      draft,
      createDefaultCrossSectionTemplate([-4, 0, 4]),
    );
    const review = buildLinerViewerReviewFromDraft(withTemplate, createDefaultProject());
    const leftNode = review.viewerProject?.nodes.find(
      (node) => node.id === "N_LINER_liner-model-1_000_000",
    );
    const rightNode = review.viewerProject?.nodes.find(
      (node) => node.id === "N_LINER_liner-model-1_000_002",
    );

    expect(leftNode?.y).toBeCloseTo(-4, 6);
    expect(rightNode?.y).toBeCloseTo(4, 6);
    expect(collectViewerNodeCoordinateMismatches(withTemplate, review)).toEqual([]);
  });
});
