import { describe, expect, it } from "vitest";
import {
  addLinerAlignmentBundle,
  createDefaultLinerDraft,
  switchActiveAlignment,
  updateLinerAlignmentElement,
} from "../../adapters/linerUiAdapter";
import {
  deriveLinerAlignmentEntityId,
  deriveLinerBridgeEntityId,
  deriveLinerCenterlineId,
  deriveLinerCrossSectionEntityId,
  domainDraftToRoadDesignDocument,
  normalizeLinerDomainDraft,
} from "../../adapters/linerDomainDraftRoadDesignMapper";
import { withProjectLinerDraft } from "../../adapters/linerProjectDraft";
import { createDefaultProject } from "../../../data/defaultProject";
import { buildIntermediateResult } from "../pipeline/pipeline";

const FIXED_CREATED_AT = "2026-07-16T12:00:00.000Z";

function createTwoAlignmentDraft() {
  let draft = createDefaultLinerDraft();
  const firstId = draft.activeAlignmentId ?? draft.alignment.id;
  draft = updateLinerAlignmentElement(draft, "S1", { length: 150 });
  draft = addLinerAlignmentBundle(draft);
  const secondId = draft.activeAlignmentId!;
  draft = updateLinerAlignmentElement(draft, "S1", { length: 60 });
  return { draft: switchActiveAlignment(draft, firstId), firstId, secondId };
}

describe("multi-alignment isolation (R8-09)", () => {
  it("maps two alignments with distinct RDD entity ids and supported topologyCapability", () => {
    const { draft, firstId, secondId } = createTwoAlignmentDraft();
    const project = withProjectLinerDraft(createDefaultProject(), draft);
    const domainDraft = project.liner?.domainDraft;
    expect(domainDraft).toBeDefined();
    expect(domainDraft!.alignments.map((bundle) => bundle.verticalAlignment.id).sort()).toEqual(
      ["VA-alignment-1", "VA-alignment-2"].sort(),
    );

    const mapped = domainDraftToRoadDesignDocument(domainDraft!, { createdAt: FIXED_CREATED_AT });
    if (!mapped.ok) {
      expect(mapped.diagnostics).toEqual([]);
    }
    expect(mapped.ok).toBe(true);
    if (!mapped.ok) {
      return;
    }

    expect(mapped.document.topologyCapability).toEqual({ state: "supported" });
    expect(mapped.document.alignments).toHaveLength(2);

    const firstEntityId = deriveLinerAlignmentEntityId(firstId);
    const secondEntityId = deriveLinerAlignmentEntityId(secondId);
    expect(mapped.document.alignments.map((entry) => entry.entityId).sort()).toEqual(
      [firstEntityId, secondEntityId].sort(),
    );

    const crossSectionEntityIds = mapped.document.crossSections.map((entry) => entry.entityId);
    expect(new Set(crossSectionEntityIds).size).toBe(2);
    expect(crossSectionEntityIds).toContain(deriveLinerCrossSectionEntityId(`CS-${firstId}`));
    expect(crossSectionEntityIds).toContain(deriveLinerCrossSectionEntityId(`CS-${secondId}`));

    const centerlineIds = mapped.document.stableIdRegistry
      ?.filter((entry) => entry.entityKind === "centerline")
      .map((entry) => entry.id);
    expect(centerlineIds).toContain(deriveLinerCenterlineId(firstId));
    expect(centerlineIds).toContain(deriveLinerCenterlineId(secondId));
  });

  it("computes pipeline geometry from the active alignment only", () => {
    const { draft, firstId, secondId } = createTwoAlignmentDraft();
    const activeFirst = switchActiveAlignment(draft, firstId);
    const activeSecond = switchActiveAlignment(draft, secondId);

    const firstResult = buildIntermediateResult(activeFirst);
    const secondResult = buildIntermediateResult(activeSecond);

    expect(firstResult.horizontal.totalLength).toBeCloseTo(150, 6);
    expect(secondResult.horizontal.totalLength).toBeCloseTo(60, 6);
  });

  it("fails closed when span ids collide across alignments", () => {
    const { draft, firstId } = createTwoAlignmentDraft();
    const withCollision = {
      ...withProjectLinerDraft(createDefaultProject(), draft).liner!.domainDraft!,
      alignments: withProjectLinerDraft(createDefaultProject(), draft).liner!.domainDraft!.alignments.map(
        (bundle) =>
          bundle.id === firstId
            ? {
                ...bundle,
                spans: [
                  {
                    id: "SP-shared",
                    startPhysicalDistance: 10,
                    endPhysicalDistance: 40,
                    pierIdStart: "P1",
                    pierIdEnd: "P2",
                  },
                ],
                piers: [
                  { id: "P1", physicalDistance: 10, kind: "abutment" as const },
                  { id: "P2", physicalDistance: 40, kind: "pier" as const },
                ],
              }
            : {
                ...bundle,
                spans: [
                  {
                    id: "SP-shared",
                    startPhysicalDistance: 5,
                    endPhysicalDistance: 30,
                    pierIdStart: "P1",
                    pierIdEnd: "P2",
                  },
                ],
                piers: [
                  { id: "P1", physicalDistance: 5, kind: "abutment" as const },
                  { id: "P2", physicalDistance: 30, kind: "pier" as const },
                ],
              },
      ),
    };

    const mapped = domainDraftToRoadDesignDocument(withCollision, { createdAt: FIXED_CREATED_AT });
    expect(mapped.ok).toBe(false);
    if (mapped.ok) {
      return;
    }
    expect(mapped.diagnostics.join(" ")).toContain("LINER_CROSS_ALIGNMENT_ID_COLLISION");
    expect(deriveLinerBridgeEntityId("SP-shared")).toBeDefined();
  });

  it("hydrates legacy flat domain draft into multi-alignment shape", () => {
    const project = withProjectLinerDraft(createDefaultProject(), createDefaultLinerDraft());
    const legacyFlat = {
      ...project.liner!.domainDraft!,
      alignment: project.liner!.domainDraft!.alignments[0]!.alignment,
      stationDefinition: project.liner!.domainDraft!.alignments[0]!.stationDefinition,
      verticalAlignment: project.liner!.domainDraft!.alignments[0]!.verticalAlignment,
      crossSections: project.liner!.domainDraft!.alignments[0]!.crossSections,
      gridDefinitions: project.liner!.domainDraft!.alignments[0]!.gridDefinitions,
      spans: project.liner!.domainDraft!.alignments[0]!.spans,
      piers: project.liner!.domainDraft!.alignments[0]!.piers,
    } as Record<string, unknown>;
    delete legacyFlat.alignments;
    delete legacyFlat.activeAlignmentId;
    delete legacyFlat.activeLineId;

    const normalized = normalizeLinerDomainDraft(legacyFlat);
    expect(normalized).not.toBeNull();
    expect(normalized!.alignments).toHaveLength(1);
    expect(normalized!.activeAlignmentId).toBe("alignment-1");
    expect(normalized!.activeLineId).toBe(deriveLinerCenterlineId("alignment-1"));
  });
});
