import { describe, expect, it } from "vitest";
import {
  addLinerOffset,
  createDefaultLinerDraft,
  updateLinerCrossSectionTemplate,
  updateLinerCrossSlope,
  updateLinerVerticalAlignment,
} from "./linerUiAdapter";
import { withProjectLinerDraft } from "./linerProjectDraft";
import { createDefaultProject } from "../../data/defaultProject";
import {
  deriveLinerAlignmentEntityId,
  deriveLinerCrossSectionEntityId,
  deriveLinerDomainDraftDocumentId,
  deriveLinerProfileEntityId,
  domainDraftToRoadDesignDocument,
  LINER_DOMAIN_DRAFT_GEOMETRY_EXTENSION_KEY,
  roadDesignDocumentToDomainDraft,
} from "./linerDomainDraftRoadDesignMapper";
import { validateRoadDesignDocument } from "../../contracts/roadDesignDocument";
import { hasValidationErrors } from "../../contracts/validation";
import {
  createDocumentPersistenceGateway,
  saveRoadDesignDocument,
} from "../../contracts/persistence";
import { createInMemoryAtomicJsonStore } from "../../contracts/persistence/atomicStore";
import { loadRoadDesignDocument } from "../../contracts/persistence/loadDocument";

const FIXED_CREATED_AT = "2026-07-16T10:00:00.000Z";

function createVerticalCrossSectionDraft() {
  let draft = addLinerOffset(createDefaultLinerDraft());
  draft = updateLinerVerticalAlignment(draft, {
    id: "VA-round-trip",
    elements: [
      {
        type: "grade",
        id: "VG-round-trip",
        startStation: 0,
        endStation: 120,
        startElevation: 12,
        grade: 0.02,
        length: 120,
      },
    ],
  });
  draft = updateLinerCrossSectionTemplate(draft, {
    id: "CS-round-trip",
    name: "Round trip",
    offsetLines: [
      { id: "OL-left", offset: -3, elevation: 0.2, role: "lane" },
      { id: "OL-right", offset: 3, elevation: -0.2, role: "lane" },
    ],
  });
  return updateLinerCrossSlope(draft, {
    signConvention: "right_down_positive",
    valuePercent: 2,
  });
}

describe("linerDomainDraftRoadDesignMapper", () => {
  it("maps domainDraft to a valid RoadDesignDocument with geometry extension", () => {
    const project = withProjectLinerDraft(createDefaultProject(), createVerticalCrossSectionDraft());
    const domainDraft = project.liner?.domainDraft;
    expect(domainDraft).toBeDefined();

    const mapped = domainDraftToRoadDesignDocument(domainDraft!, { createdAt: FIXED_CREATED_AT });
    expect(mapped.ok).toBe(true);
    if (!mapped.ok) {
      return;
    }

    expect(mapped.document.schemaVersion).toBe("0.1.0");
    expect(mapped.document.documentId).toBe(deriveLinerDomainDraftDocumentId(domainDraft!));
    expect(mapped.document.alignments[0]?.entityId).toBe(
      deriveLinerAlignmentEntityId(domainDraft!.alignment.id),
    );
    expect(mapped.document.profiles[0]?.entityId).toBe(
      deriveLinerProfileEntityId(domainDraft!.verticalAlignment.id),
    );
    expect(mapped.document.crossSections[0]?.entityId).toBe(
      deriveLinerCrossSectionEntityId(domainDraft!.crossSections[0]!.id),
    );
    expect(
      mapped.document.extensions?.[LINER_DOMAIN_DRAFT_GEOMETRY_EXTENSION_KEY]?.json,
    ).toBeDefined();
    expect(hasValidationErrors(validateRoadDesignDocument(mapped.document))).toBe(false);
  });

  it("round-trips vertical, crossfall, width, and cross-section geometry with stable ids", () => {
    const draft = {
      ...createVerticalCrossSectionDraft(),
      widthChangePoints: [
        {
          id: "WCP-1",
          physicalDistance: 40,
          leftOffset: -4,
          rightOffset: 4,
        },
      ],
      crossSections: [
        {
          id: "CS-a",
          name: "A",
          station: 0,
          crossSlope: { signConvention: "right_down_positive" as const, valuePercent: 2 },
          offsetLines: [
            { id: "OL-a-l", offset: -4, elevation: 0, role: "edge" as const },
            { id: "OL-a-r", offset: 4, elevation: 0, role: "edge" as const },
          ],
        },
        {
          id: "CS-b",
          name: "B",
          station: 100,
          crossSlope: { signConvention: "right_down_positive" as const, valuePercent: 1.5 },
          offsetLines: [
            { id: "OL-b-l", offset: -6, elevation: 0, role: "edge" as const },
            { id: "OL-b-r", offset: 6, elevation: 0, role: "edge" as const },
          ],
        },
      ],
      gridDefinitions: [
        {
          id: "GRID-a",
          crossSectionTemplateId: "CS-a",
          stationRange: { startPhysicalDistance: 0, endPhysicalDistance: 50 },
          offsetLineIds: ["OL-a-l", "OL-a-r"],
        },
        {
          id: "GRID-b",
          crossSectionTemplateId: "CS-b",
          stationRange: { startPhysicalDistance: 50, endPhysicalDistance: 100 },
          offsetLineIds: ["OL-b-l", "OL-b-r"],
        },
      ],
    };
    const project = withProjectLinerDraft(createDefaultProject(), draft);
    const domainDraft = project.liner?.domainDraft;
    expect(domainDraft).toBeDefined();

    const mapped = domainDraftToRoadDesignDocument(domainDraft!, { createdAt: FIXED_CREATED_AT });
    expect(mapped.ok).toBe(true);
    if (!mapped.ok) {
      return;
    }

    const restored = roadDesignDocumentToDomainDraft(mapped.document);
    expect(restored.ok).toBe(true);
    if (!restored.ok) {
      return;
    }

    expect(restored.domainDraft.verticalAlignment).toEqual(domainDraft!.verticalAlignment);
    expect(restored.domainDraft.crossSections).toEqual(domainDraft!.crossSections);
    expect(restored.domainDraft.crossSlopeIntervals).toEqual(domainDraft!.crossSlopeIntervals);
    expect(restored.domainDraft.widthChangePoints).toEqual(domainDraft!.widthChangePoints);
    expect(restored.domainDraft.gridDefinitions).toEqual(domainDraft!.gridDefinitions);
    expect(mapped.document.documentId).toBe(deriveLinerDomainDraftDocumentId(restored.domainDraft));
    expect(mapped.document.crossSections.map((entry) => entry.entityId)).toEqual(
      restored.domainDraft.crossSections.map((entry) => deriveLinerCrossSectionEntityId(entry.id)),
    );
  });

  it("fails closed when the geometry extension is missing", () => {
    const mapped = domainDraftToRoadDesignDocument(
      withProjectLinerDraft(createDefaultProject(), createDefaultLinerDraft()).liner!.domainDraft!,
      { createdAt: FIXED_CREATED_AT },
    );
    expect(mapped.ok).toBe(true);
    if (!mapped.ok) {
      return;
    }

    const withoutExtension = {
      ...mapped.document,
      extensions: {},
    };
    const restored = roadDesignDocumentToDomainDraft(withoutExtension);
    expect(restored.ok).toBe(false);
    if (restored.ok) {
      return;
    }
    expect(restored.diagnostics.join(" ")).toContain(LINER_DOMAIN_DRAFT_GEOMETRY_EXTENSION_KEY);
  });

  it("round-trips through saveRoadDesignDocument and loadRoadDesignDocument", () => {
    const domainDraft = withProjectLinerDraft(
      createDefaultProject(),
      createVerticalCrossSectionDraft(),
    ).liner?.domainDraft;
    expect(domainDraft).toBeDefined();

    const mapped = domainDraftToRoadDesignDocument(domainDraft!, { createdAt: FIXED_CREATED_AT });
    expect(mapped.ok).toBe(true);
    if (!mapped.ok) {
      return;
    }

    const store = createInMemoryAtomicJsonStore();
    const saved = saveRoadDesignDocument(
      mapped.document,
      "documents/liner-domain-draft.json",
      store,
      { createOnly: true },
    );
    expect(saved.ok).toBe(true);

    const loaded = loadRoadDesignDocument(store.read("documents/liner-domain-draft.json"));
    expect(loaded.ok).toBe(true);
    if (!loaded.ok) {
      return;
    }

    const restored = roadDesignDocumentToDomainDraft(loaded.document);
    expect(restored.ok).toBe(true);
    if (!restored.ok) {
      return;
    }
    expect(restored.domainDraft).toEqual(domainDraft);
  });

  it("persists through the document persistence gateway repository path", () => {
    const domainDraft = withProjectLinerDraft(
      createDefaultProject(),
      createVerticalCrossSectionDraft(),
    ).liner?.domainDraft;
    expect(domainDraft).toBeDefined();

    const mapped = domainDraftToRoadDesignDocument(domainDraft!, { createdAt: FIXED_CREATED_AT });
    expect(mapped.ok).toBe(true);
    if (!mapped.ok) {
      return;
    }

    const gateway = createDocumentPersistenceGateway({ createdAt: FIXED_CREATED_AT });
    const persisted = gateway.persistRoadToRepository(mapped.document);
    expect(persisted.ok).toBe(true);
    if (!persisted.ok) {
      return;
    }

    const readBack = gateway.roadRepository.readLatest(mapped.document.documentId);
    expect(readBack.ok).toBe(true);
    if (!readBack.ok) {
      return;
    }

    const restored = roadDesignDocumentToDomainDraft(readBack.value);
    expect(restored.ok).toBe(true);
    if (!restored.ok) {
      return;
    }
    expect(restored.domainDraft.verticalAlignment).toEqual(domainDraft!.verticalAlignment);
    expect(restored.domainDraft.crossSections).toEqual(domainDraft!.crossSections);
  });
});
