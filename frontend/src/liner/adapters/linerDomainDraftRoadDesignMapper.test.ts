import { describe, expect, it } from "vitest";
import {
  addLinerOffset,
  createDefaultLinerDraft,
  addLinerAlignmentBundle,
  updateLinerCrossSectionTemplate,
  updateLinerCrossSlope,
  updateLinerDrawingSettings,
  updateLinerPiers,
  updateLinerSpans,
  updateLinerVerticalAlignment,
  addLdistJob,
  addHaunchDefinition,
} from "./linerUiAdapter";
import { withProjectLinerDraft } from "./linerProjectDraft";
import { createDefaultProject } from "../../data/defaultProject";
import {
  deriveLinerAlignmentEntityId,
  deriveLinerBridgeEntityId,
  deriveLinerCrossSectionEntityId,
  deriveLinerDomainDraftDocumentId,
  deriveLinerProfileEntityId,
  domainDraftToRoadDesignDocument,
  getActiveAlignmentBundle,
  LINER_DOMAIN_DRAFT_GEOMETRY_EXTENSION_KEY,
  roadDesignDocumentToDomainDraft,
} from "./linerDomainDraftRoadDesignMapper";
import type { LinerDomainDraftVNext } from "../schema/types";
import { validateRoadDesignDocument, type RoadDesignDocument } from "../../contracts/roadDesignDocument";
import type { JsonValue } from "../../contracts";
import { hasValidationErrors } from "../../contracts/validation";
import { parseUuid, type UuidString } from "../../contracts/uuid";
import {
  createDocumentPersistenceGateway,
  saveRoadDesignDocument,
} from "../../contracts/persistence";
import { createInMemoryAtomicJsonStore } from "../../contracts/persistence/atomicStore";
import { loadRoadDesignDocument } from "../../contracts/persistence/loadDocument";

const FIXED_CREATED_AT = "2026-07-16T10:00:00.000Z";

function activeBundle(domainDraft: LinerDomainDraftVNext) {
  const bundle = getActiveAlignmentBundle(domainDraft);
  if (!bundle) {
    throw new Error("missing active alignment bundle");
  }
  return bundle;
}

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

function createBridgeLayoutDraft() {
  let draft = createVerticalCrossSectionDraft();
  draft = updateLinerPiers(draft, [
    {
      id: "P1",
      physicalDistance: 20,
      kind: "abutment",
      skewAngleRad: 0.1,
      bearingOffsets: [{ transverseIndex: 0, offset: 0.5 }],
    },
    {
      id: "P2",
      physicalDistance: 80,
      kind: "pier",
    },
  ]);
  draft = updateLinerSpans(draft, [
    {
      id: "SP1",
      startPhysicalDistance: 20,
      endPhysicalDistance: 80,
      pierIdStart: "P1",
      pierIdEnd: "P2",
    },
  ]);
  return updateLinerDrawingSettings(draft, {
    version: "0.1.0",
    planPaperSize: "A1",
    profilePaperSize: "A2",
    crossSectionPaperSize: "A3",
    bandPaperSize: "A4",
    paperOrientation: "landscape",
    marginMm: 12,
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
      deriveLinerAlignmentEntityId(activeBundle(domainDraft!).id),
    );
    expect(mapped.document.profiles[0]?.entityId).toBe(
      deriveLinerProfileEntityId(activeBundle(domainDraft!).verticalAlignment.id),
    );
    expect(mapped.document.crossSections[0]?.entityId).toBe(
      deriveLinerCrossSectionEntityId(activeBundle(domainDraft!).crossSections[0]!.id),
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

    expect(restored.domainDraft.alignments).toEqual(domainDraft!.alignments);
    expect(mapped.document.documentId).toBe(deriveLinerDomainDraftDocumentId(restored.domainDraft));
    expect(mapped.document.crossSections.map((entry) => entry.entityId)).toEqual(
      activeBundle(restored.domainDraft).crossSections.map((entry) =>
        deriveLinerCrossSectionEntityId(entry.id),
      ),
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
    expect(restored.domainDraft.alignments).toEqual(domainDraft!.alignments);
  });

  it("round-trips bridge layout and drawing settings with stable bridge ids", () => {
    const project = withProjectLinerDraft(createDefaultProject(), createBridgeLayoutDraft());
    const domainDraft = project.liner?.domainDraft;
    expect(domainDraft).toBeDefined();

    const mapped = domainDraftToRoadDesignDocument(domainDraft!, { createdAt: FIXED_CREATED_AT });
    expect(mapped.ok).toBe(true);
    if (!mapped.ok) {
      return;
    }

    expect(mapped.document.bridges).toHaveLength(1);
    expect(mapped.document.bridges[0]?.entityId).toBe(deriveLinerBridgeEntityId("SP1"));
    expect(mapped.document.bridges[0]?.label).toBe("SP1");

    const restored = roadDesignDocumentToDomainDraft(mapped.document);
    expect(restored.ok).toBe(true);
    if (!restored.ok) {
      return;
    }

    expect(restored.domainDraft.alignments).toEqual(domainDraft!.alignments);
    expect(restored.domainDraft.drawingSettings).toEqual(domainDraft!.drawingSettings);
    expect(mapped.document.bridges.map((entry) => entry.entityId)).toEqual(
      activeBundle(restored.domainDraft).spans.map((entry) => deriveLinerBridgeEntityId(entry.id)),
    );
  });

  it("fails closed when bridge stable ids do not match domainDraft spans", () => {
    const mapped = domainDraftToRoadDesignDocument(
      withProjectLinerDraft(createDefaultProject(), createBridgeLayoutDraft()).liner!.domainDraft!,
      { createdAt: FIXED_CREATED_AT },
    );
    expect(mapped.ok).toBe(true);
    if (!mapped.ok) {
      return;
    }

    const wrongBridgeId = parseUuid("11111111-1111-4111-8111-111111111111") as UuidString;
    const tampered: RoadDesignDocument = {
      ...mapped.document,
      bridges: mapped.document.bridges.map((entry) => ({
        ...entry,
        entityId: wrongBridgeId,
      })),
      stableIdRegistry: mapped.document.stableIdRegistry.map((entry) =>
        entry.entityKind === "bridge" ? { ...entry, id: wrongBridgeId } : entry,
      ),
    };
    const restored = roadDesignDocumentToDomainDraft(tampered);
    expect(restored.ok).toBe(false);
    if (restored.ok) {
      return;
    }
    expect(restored.diagnostics.join(" ")).toContain("bridge stable ids");
  });

  it("fails closed when domainDraft has duplicate span ids during mapping", () => {
    const domainDraft = withProjectLinerDraft(
      createDefaultProject(),
      createBridgeLayoutDraft(),
    ).liner!.domainDraft!;
    const duplicateSpans: LinerDomainDraftVNext = {
      ...domainDraft,
      alignments: domainDraft.alignments.map((bundle, index) =>
        index === 0
          ? {
              ...bundle,
              spans: [...bundle.spans, { ...bundle.spans[0]!, id: bundle.spans[0]!.id }],
            }
          : bundle,
      ),
    };

    const mapped = domainDraftToRoadDesignDocument(duplicateSpans, { createdAt: FIXED_CREATED_AT });
    expect(mapped.ok).toBe(false);
    if (mapped.ok) {
      return;
    }
    expect(mapped.diagnostics.join(" ")).toContain("LINER_SPAN_DUPLICATE_ID");
  });

  it("fails closed when domainDraft span references a missing pier", () => {
    const domainDraft = withProjectLinerDraft(
      createDefaultProject(),
      createBridgeLayoutDraft(),
    ).liner!.domainDraft!;
    const missingRef: LinerDomainDraftVNext = {
      ...domainDraft,
      alignments: domainDraft.alignments.map((bundle, index) =>
        index === 0
          ? {
              ...bundle,
              spans: bundle.spans.map((span) => ({
                ...span,
                pierIdEnd: "missing-pier",
              })),
            }
          : bundle,
      ),
    };

    const mapped = domainDraftToRoadDesignDocument(missingRef, { createdAt: FIXED_CREATED_AT });
    expect(mapped.ok).toBe(false);
    if (mapped.ok) {
      return;
    }
    expect(mapped.diagnostics.join(" ")).toContain("LINER_SPAN_PIER_REFERENCE_MISSING");
  });

  it("fails closed when pier station exceeds alignment length", () => {
    const domainDraft = withProjectLinerDraft(
      createDefaultProject(),
      createBridgeLayoutDraft(),
    ).liner!.domainDraft!;
    const invalidStation: LinerDomainDraftVNext = {
      ...domainDraft,
      alignments: domainDraft.alignments.map((bundle, index) =>
        index === 0
          ? {
              ...bundle,
              piers: bundle.piers.map((pier) =>
                pier.id === "P1" ? { ...pier, physicalDistance: 999 } : pier,
              ),
            }
          : bundle,
      ),
    };

    const mapped = domainDraftToRoadDesignDocument(invalidStation, { createdAt: FIXED_CREATED_AT });
    expect(mapped.ok).toBe(false);
    if (mapped.ok) {
      return;
    }
    expect(mapped.diagnostics.join(" ")).toContain("LINER_STATION_OUT_OF_RANGE");
  });

  it("fails closed when geometry payload is missing spans or piers", () => {
    const mapped = domainDraftToRoadDesignDocument(
      withProjectLinerDraft(createDefaultProject(), createBridgeLayoutDraft()).liner!.domainDraft!,
      { createdAt: FIXED_CREATED_AT },
    );
    expect(mapped.ok).toBe(true);
    if (!mapped.ok) {
      return;
    }

    const extension = mapped.document.extensions?.[LINER_DOMAIN_DRAFT_GEOMETRY_EXTENSION_KEY];
    expect(extension?.json).toBeDefined();
    const payload = extension!.json as {
      payloadVersion: string;
      domainDraft: Record<string, unknown>;
    };

    const domainDraftWithoutSpans = {
      ...payload.domainDraft,
      alignments: (payload.domainDraft.alignments as LinerDomainDraftVNext["alignments"]).map(
        (bundle) => ({ ...bundle, spans: [] }),
      ),
    };

    const withoutSpans: RoadDesignDocument = {
      ...mapped.document,
      extensions: {
        [LINER_DOMAIN_DRAFT_GEOMETRY_EXTENSION_KEY]: {
          json: {
            ...payload,
            domainDraft: domainDraftWithoutSpans,
          } as unknown as JsonValue,
        },
      },
    };
    const restored = roadDesignDocumentToDomainDraft(withoutSpans);
    expect(restored.ok).toBe(false);
    if (restored.ok) {
      return;
    }
    expect(restored.diagnostics.join(" ")).toMatch(/invalid|do not match/i);
  });

  it("round-trips multi-alignment domainDraft with topologyCapability supported", () => {
    let draft = createDefaultLinerDraft();
    draft = addLinerAlignmentBundle(draft);
    const project = withProjectLinerDraft(createDefaultProject(), draft);
    const domainDraft = project.liner?.domainDraft;
    expect(domainDraft?.alignments).toHaveLength(2);

    const mapped = domainDraftToRoadDesignDocument(domainDraft!, { createdAt: FIXED_CREATED_AT });
    expect(mapped.ok).toBe(true);
    if (!mapped.ok) {
      return;
    }
    expect(mapped.document.topologyCapability).toEqual({ state: "supported" });
    expect(mapped.document.alignments).toHaveLength(2);

    const extension = mapped.document.extensions?.[LINER_DOMAIN_DRAFT_GEOMETRY_EXTENSION_KEY];
    const payload = extension?.json as unknown as {
      payloadVersion: string;
      domainDraft: LinerDomainDraftVNext;
    };
    expect(payload.payloadVersion).toBe("0.2.0");
    expect(payload.domainDraft.alignments).toHaveLength(2);
    expect(payload.domainDraft.activeAlignmentId).toBeDefined();
    expect(payload.domainDraft.activeLineId).toBeDefined();

    const restored = roadDesignDocumentToDomainDraft(mapped.document);
    expect(restored.ok).toBe(true);
    if (!restored.ok) {
      return;
    }
    expect(restored.domainDraft.alignments).toHaveLength(2);
    expect(restored.domainDraft.activeAlignmentId).toEqual(domainDraft!.activeAlignmentId);
    expect(restored.domainDraft.activeLineId).toEqual(domainDraft!.activeLineId);
  });

  it("reports absent topologyCapability for single alignment", () => {
    const domainDraft = withProjectLinerDraft(
      createDefaultProject(),
      createVerticalCrossSectionDraft(),
    ).liner?.domainDraft;
    const mapped = domainDraftToRoadDesignDocument(domainDraft!, { createdAt: FIXED_CREATED_AT });
    expect(mapped.ok).toBe(true);
    if (!mapped.ok) {
      return;
    }
    expect(mapped.document.topologyCapability).toEqual({ state: "absent" });
  });

  it("round-trips ldistJobs and sets ldistCapability supported when jobs exist", () => {
    let draft = addLinerOffset(createDefaultLinerDraft());
    draft = updateLinerCrossSectionTemplate(draft, {
      id: draft.crossSections?.[0]?.id ?? `CS-${draft.alignment.id}`,
      name: draft.crossSections?.[0]?.name ?? "Test",
      offsetLines: [
        { id: "OL-left", offset: -3, elevation: 0, role: "custom" },
        { id: "OL-right", offset: 3, elevation: 0, role: "custom" },
      ],
    });
    draft = addLdistJob(draft, {
      pairs: [{ fromLineId: "OL-left", toLineId: "OL-right" }],
    });

    const project = withProjectLinerDraft(createDefaultProject(), draft);
    const domainDraft = project.liner?.domainDraft;
    expect(domainDraft?.ldistJobs).toHaveLength(1);

    const mapped = domainDraftToRoadDesignDocument(domainDraft!, { createdAt: FIXED_CREATED_AT });
    expect(mapped.ok).toBe(true);
    if (!mapped.ok) {
      return;
    }
    expect(mapped.document.schemaVersion).toBe("0.1.0");
    expect(mapped.document.ldistCapability).toEqual({ state: "supported" });

    const extension = mapped.document.extensions?.[LINER_DOMAIN_DRAFT_GEOMETRY_EXTENSION_KEY];
    const payload = extension?.json as unknown as { domainDraft: LinerDomainDraftVNext };
    expect(payload.domainDraft.ldistJobs).toHaveLength(1);

    const restored = roadDesignDocumentToDomainDraft(mapped.document);
    expect(restored.ok).toBe(true);
    if (!restored.ok) {
      return;
    }
    expect(restored.domainDraft.ldistJobs).toEqual(domainDraft!.ldistJobs);
  });

  it("reports absent ldistCapability when no jobs are stored", () => {
    const domainDraft = withProjectLinerDraft(
      createDefaultProject(),
      createVerticalCrossSectionDraft(),
    ).liner?.domainDraft;
    const mapped = domainDraftToRoadDesignDocument(domainDraft!, { createdAt: FIXED_CREATED_AT });
    expect(mapped.ok).toBe(true);
    if (!mapped.ok) {
      return;
    }
    expect(mapped.document.ldistCapability).toEqual({ state: "absent" });
  });

  it("round-trips haunchDefinitions and sets haunchCapability supported when definitions exist", () => {
    let draft = addLinerOffset(createDefaultLinerDraft());
    draft = updateLinerCrossSectionTemplate(draft, {
      id: draft.crossSections?.[0]?.id ?? `CS-${draft.alignment.id}`,
      name: draft.crossSections?.[0]?.name ?? "Test",
      offsetLines: [
        { id: "OL-left", offset: -3, elevation: 0, role: "custom" },
        { id: "OL-right", offset: 3, elevation: 0, role: "custom" },
      ],
    });
    draft = addHaunchDefinition(draft);

    const project = withProjectLinerDraft(createDefaultProject(), draft);
    const domainDraft = project.liner?.domainDraft;
    expect(domainDraft?.haunchDefinitions).toHaveLength(1);

    const mapped = domainDraftToRoadDesignDocument(domainDraft!, { createdAt: FIXED_CREATED_AT });
    expect(mapped.ok).toBe(true);
    if (!mapped.ok) {
      return;
    }
    expect(mapped.document.schemaVersion).toBe("0.1.0");
    expect(mapped.document.haunchCapability).toEqual({ state: "supported" });

    const extension = mapped.document.extensions?.[LINER_DOMAIN_DRAFT_GEOMETRY_EXTENSION_KEY];
    const payload = extension?.json as unknown as { domainDraft: LinerDomainDraftVNext };
    expect(payload.domainDraft.haunchDefinitions).toHaveLength(1);

    const restored = roadDesignDocumentToDomainDraft(mapped.document);
    expect(restored.ok).toBe(true);
    if (!restored.ok) {
      return;
    }
    expect(restored.domainDraft.haunchDefinitions).toEqual(domainDraft!.haunchDefinitions);
  });

  it("reports absent haunchCapability when no definitions are stored", () => {
    const domainDraft = withProjectLinerDraft(
      createDefaultProject(),
      createVerticalCrossSectionDraft(),
    ).liner?.domainDraft;
    const mapped = domainDraftToRoadDesignDocument(domainDraft!, { createdAt: FIXED_CREATED_AT });
    expect(mapped.ok).toBe(true);
    if (!mapped.ok) {
      return;
    }
    expect(mapped.document.haunchCapability).toEqual({ state: "absent" });
  });
});
