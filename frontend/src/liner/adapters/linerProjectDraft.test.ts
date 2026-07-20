import { describe, expect, it } from "vitest";
import { createDefaultProject } from "../../data/defaultProject";
import {
  addLinerOffset,
  createDefaultLinerDraft,
  updateLinerDraftSettings,
  updateLinerCrossSectionTemplate,
  updateLinerCrossSlope,
  updateLinerDrawingSettings,
  updateLinerPiers,
  updateLinerSpans,
  updateLinerVerticalAlignment,
  syncActiveBundleToAlignments,
  updateLinerAlignmentMetadata,
  updateLinerAlignmentElement,
  addLdistJob,
  addHaunchDefinition,
} from "./linerUiAdapter";
import {
  linerDraftFromProject,
  tryWithProjectLinerDraft,
  validateLinerDraftForCommit,
  withProjectLinerDraft,
  withProjectLinerDomainDraft,
  serializeProjectForPersistence,
  hydrateProjectLinerFromPersistence,
  readLinerDomainDraftFromProject,
} from "./linerProjectDraft";
import { convertImporterToPhase35Draft } from "../importer/export/ImporterToPhase35Adapter";
import { createSampleImporterProject } from "../importer/__tests__/fixtures/sampleProject";
import {
  LINER_DRAFT_SCHEMA_VERSION,
  PROJECT_LINER_METADATA_SCHEMA_VERSION,
} from "../schema/types";
import {
  deriveLinerBridgeEntityId,
  getActiveAlignmentBundle,
  LINER_DOMAIN_DRAFT_GEOMETRY_EXTENSION_KEY,
} from "./linerDomainDraftRoadDesignMapper";
import { parseUuid, type UuidString } from "../../contracts/uuid";

const PERSISTED_DRAWING_SETTINGS = {
  version: "0.1.0" as const,
  planPaperSize: "A1" as const,
  profilePaperSize: "A2" as const,
  crossSectionPaperSize: "A3" as const,
  bandPaperSize: "A4" as const,
  paperOrientation: "landscape" as const,
  marginMm: 12,
};

function createDrawingSettingsDraft() {
  return updateLinerDrawingSettings(addLinerOffset(createDefaultLinerDraft()), PERSISTED_DRAWING_SETTINGS);
}

function createBridgeLayoutDraft() {
  let draft = addLinerOffset(createDefaultLinerDraft());
  draft = updateLinerPiers(draft, [
    {
      id: "P1",
      physicalDistance: 20,
      kind: "abutment",
      skewAngleRad: Math.PI / 12,
      bearingOffsets: [{ transverseIndex: 0, offset: 0.5 }],
    },
    {
      id: "P2",
      physicalDistance: 80,
      kind: "pier",
    },
  ]);
  return updateLinerSpans(draft, [
    {
      id: "SP1",
      startPhysicalDistance: 20,
      endPhysicalDistance: 80,
      pierIdStart: "P1",
      pierIdEnd: "P2",
    },
  ]);
}

describe("liner project draft persistence", () => {
  it("keeps the previous project when a draft cannot be migrated", () => {
    const project = createDefaultProject();
    const invalidDraft = createDefaultLinerDraft();
    invalidDraft.alignment.id = "";

    expect(tryWithProjectLinerDraft(project, invalidDraft)).toBe(project);
  });

  it("stores vNext domainDraft in memory under project.liner without persisting legacy draft", () => {
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

    expect(getActiveAlignmentBundle(project.liner!.domainDraft!)!.alignment.elements.length).toBeGreaterThan(0);
    expect(linerDraftFromProject(project)?.alignment.elements.length).toBeGreaterThan(0);
  });

  it("validates P2-D06 viewer E2E-like drafts for commit", () => {
    let draft = createDefaultLinerDraft();
    draft = updateLinerAlignmentMetadata(draft, { linerModelId: "liner-p2-d06" });
    draft = updateLinerAlignmentElement(draft, "S1", { length: 24 });
    draft = syncActiveBundleToAlignments(
      updateLinerVerticalAlignment(
        updateLinerDraftSettings(draft, { sampleInterval: 12 }),
        {
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
        },
      ),
    );

    expect(validateLinerDraftForCommit(draft)).toBeNull();
    expect(getActiveAlignmentBundle(withProjectLinerDraft(createDefaultProject(), draft).liner!.domainDraft!)!
      .verticalAlignment.elements[0]).toMatchObject({
      startElevation: 10,
      grade: 0.01,
      endStation: 24,
    });
  });

  it("validates persisted domain round-trip drafts for commit", () => {
    const originalDraft = syncActiveBundleToAlignments(createDefaultLinerDraft());
    const persistedDraft = linerDraftFromProject(
      withProjectLinerDraft(createDefaultProject(), originalDraft),
    );
    expect(persistedDraft).toBeDefined();
    expect(persistedDraft).toEqual(originalDraft);
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
    const edited = syncActiveBundleToAlignments(updateLinerCrossSlope(crossSectionDraft, {
      signConvention: "right_down_positive",
      valuePercent: 2,
    }));
    const project = withProjectLinerDraft(createDefaultProject(), edited);

    const active = getActiveAlignmentBundle(project.liner!.domainDraft!)!;
    expect(active.verticalAlignment.id).toBe("VA-edited");
    expect(active.crossSections[0]?.id).toBe("CS-edited");
    expect(active.crossSections[0]?.crossSlope?.valuePercent).toBe(2);
    expect(linerDraftFromProject(project)).toMatchObject({
      verticalAlignment: edited.verticalAlignment,
      crossSections: edited.crossSections,
    });
  });

  it("preserves gridDefinitions and multiple cross-sections through save and reload", () => {
    const draft = syncActiveBundleToAlignments({
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
    });
    const project = withProjectLinerDraft(createDefaultProject(), draft);
    const reloaded = linerDraftFromProject(project);

    const active = getActiveAlignmentBundle(project.liner!.domainDraft!)!;
    expect(active.crossSections.map((entry) => entry.id)).toEqual(["CS-a", "CS-b"]);
    expect(active.gridDefinitions).toEqual(draft.gridDefinitions);
    expect(reloaded?.crossSections).toMatchObject(draft.crossSections ?? []);
    expect(reloaded?.gridDefinitions).toEqual(draft.gridDefinitions);
  });

  it("serializes liner data to embedded roadDesignDocument without domainDraft", () => {
    const draft = addLinerOffset(createDefaultLinerDraft());
    const project = withProjectLinerDraft(createDefaultProject(), draft);
    const serialized = serializeProjectForPersistence(project);

    expect(serialized.ok).toBe(true);
    if (!serialized.ok) {
      return;
    }
    expect(serialized.project.liner?.domainDraft).toBeUndefined();
    expect(serialized.project.liner?.draft).toBeUndefined();
    expect(serialized.project.liner?.roadDesignDocument).toMatchObject({
      documentKind: "road-design",
      schemaVersion: "0.1.0",
    });
    expect(serialized.project.liner?.draftSchemaVersion).toBe(LINER_DRAFT_SCHEMA_VERSION);
  });

  it("hydrates roadDesignDocument into in-memory domainDraft on load", () => {
    const draft = addLinerOffset(createDefaultLinerDraft());
    const project = withProjectLinerDraft(createDefaultProject(), draft);
    const serialized = serializeProjectForPersistence(project);
    expect(serialized.ok).toBe(true);
    if (!serialized.ok) {
      return;
    }

    const hydrated = hydrateProjectLinerFromPersistence(serialized.project);
    expect(hydrated.ok).toBe(true);
    if (!hydrated.ok) {
      return;
    }
    expect(hydrated.project.liner?.roadDesignDocument).toBeUndefined();
    expect(hydrated.project.liner?.domainDraft).toBeDefined();
    expect(linerDraftFromProject(hydrated.project)).toEqual(draft);
  });

  it("reads legacy domainDraft projects via read-old path", () => {
    const draft = addLinerOffset(createDefaultLinerDraft());
    const project = withProjectLinerDraft(createDefaultProject(), draft);
    const legacyPersisted = {
      ...project,
      liner: {
        ...project.liner!,
        domainDraft: project.liner!.domainDraft,
      },
    };
    delete (legacyPersisted.liner as { roadDesignDocument?: unknown }).roadDesignDocument;

    const migration = readLinerDomainDraftFromProject(legacyPersisted);
    expect(migration.ok).toBe(true);
    if (!migration.ok) {
      return;
    }
    expect(linerDraftFromProject(legacyPersisted)).toEqual(draft);
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

    const hydrated = hydrateProjectLinerFromPersistence(legacyProject);
    expect(hydrated.ok).toBe(true);
    if (!hydrated.ok) {
      return;
    }
    expect(hydrated.project.liner?.draft).toBeUndefined();
    expect(hydrated.project.liner?.domainDraft).toBeDefined();
  });

  it("returns undefined when the project has no LINER metadata", () => {
    expect(linerDraftFromProject(createDefaultProject())).toBeUndefined();
  });

  it("serializes drawingSettings into roadDesignDocument extensions without domainDraft", () => {
    const project = withProjectLinerDraft(createDefaultProject(), createDrawingSettingsDraft());
    const serialized = serializeProjectForPersistence(project);

    expect(serialized.ok).toBe(true);
    if (!serialized.ok) {
      return;
    }

    expect(serialized.project.liner?.domainDraft).toBeUndefined();
    expect(serialized.project.liner?.draft).toBeUndefined();

    const extension =
      serialized.project.liner?.roadDesignDocument?.extensions?.[LINER_DOMAIN_DRAFT_GEOMETRY_EXTENSION_KEY];
    const payload = extension?.json as {
      domainDraft: {
        drawingSettings?: typeof PERSISTED_DRAWING_SETTINGS;
      };
    };
    expect(payload.domainDraft.drawingSettings).toEqual(PERSISTED_DRAWING_SETTINGS);
  });

  it("hydrates drawingSettings from roadDesignDocument into in-memory domainDraft", () => {
    const originalDraft = createDrawingSettingsDraft();
    const project = withProjectLinerDraft(createDefaultProject(), originalDraft);
    const serialized = serializeProjectForPersistence(project);
    expect(serialized.ok).toBe(true);
    if (!serialized.ok) {
      return;
    }

    const hydrated = hydrateProjectLinerFromPersistence(serialized.project);
    expect(hydrated.ok).toBe(true);
    if (!hydrated.ok) {
      return;
    }

    expect(hydrated.project.liner?.roadDesignDocument).toBeUndefined();
    expect(hydrated.project.liner?.domainDraft?.drawingSettings).toEqual(PERSISTED_DRAWING_SETTINGS);
    expect(linerDraftFromProject(hydrated.project)?.drawingSettings).toEqual(PERSISTED_DRAWING_SETTINGS);
  });

  it("serializes bridge layout spans and piers into roadDesignDocument without domainDraft", () => {
    const project = withProjectLinerDraft(createDefaultProject(), createBridgeLayoutDraft());
    const serialized = serializeProjectForPersistence(project);

    expect(serialized.ok).toBe(true);
    if (!serialized.ok) {
      return;
    }

    expect(serialized.project.liner?.domainDraft).toBeUndefined();
    expect(serialized.project.liner?.draft).toBeUndefined();

    const roadDesignDocument = serialized.project.liner?.roadDesignDocument;
    expect(roadDesignDocument).toBeDefined();
    expect(roadDesignDocument?.bridges).toEqual([
      expect.objectContaining({
        entityId: deriveLinerBridgeEntityId("SP1"),
        label: "SP1",
      }),
    ]);

    const extension = roadDesignDocument?.extensions?.[LINER_DOMAIN_DRAFT_GEOMETRY_EXTENSION_KEY];
    const payload = extension?.json as {
      domainDraft: {
        alignments: Array<{
          spans: unknown[];
          piers: unknown[];
        }>;
      };
    };
    expect(payload.domainDraft.alignments[0]?.spans).toEqual([
      expect.objectContaining({
        id: "SP1",
        startPhysicalDistance: 20,
        endPhysicalDistance: 80,
        pierIdStart: "P1",
        pierIdEnd: "P2",
      }),
    ]);
    expect(payload.domainDraft.alignments[0]?.piers).toEqual([
      expect.objectContaining({
        id: "P1",
        physicalDistance: 20,
        skewAngleRad: Math.PI / 12,
        bearingOffsets: [{ transverseIndex: 0, offset: 0.5 }],
      }),
      expect.objectContaining({
        id: "P2",
        physicalDistance: 80,
      }),
    ]);
  });

  it("hydrates bridge layout spans and piers from roadDesignDocument with stable ids", () => {
    const originalDraft = createBridgeLayoutDraft();
    const project = withProjectLinerDraft(createDefaultProject(), originalDraft);
    const serialized = serializeProjectForPersistence(project);
    expect(serialized.ok).toBe(true);
    if (!serialized.ok) {
      return;
    }

    const hydrated = hydrateProjectLinerFromPersistence(serialized.project);
    expect(hydrated.ok).toBe(true);
    if (!hydrated.ok) {
      return;
    }

    expect(hydrated.project.liner?.roadDesignDocument).toBeUndefined();
    expect(getActiveAlignmentBundle(hydrated.project.liner!.domainDraft!)!.spans).toEqual(
      getActiveAlignmentBundle(project.liner!.domainDraft!)!.spans,
    );
    expect(getActiveAlignmentBundle(hydrated.project.liner!.domainDraft!)!.piers).toEqual(
      getActiveAlignmentBundle(project.liner!.domainDraft!)!.piers,
    );
    expect(linerDraftFromProject(hydrated.project)?.spans).toEqual(originalDraft.spans);
    expect(linerDraftFromProject(hydrated.project)?.piers).toEqual(originalDraft.piers);
  });

  it("fails closed when serializing bridge layout with duplicate span ids", () => {
    const domainDraft = withProjectLinerDraft(
      createDefaultProject(),
      createBridgeLayoutDraft(),
    ).liner!.domainDraft!;
    const invalid = withProjectLinerDomainDraft(createDefaultProject(), {
      ...domainDraft,
      alignments: domainDraft.alignments.map((bundle, index) =>
        index === 0
          ? {
              ...bundle,
              spans: [...bundle.spans, { ...bundle.spans[0]!, id: bundle.spans[0]!.id }],
            }
          : bundle,
      ),
    });

    const serialized = serializeProjectForPersistence(invalid);
    expect(serialized.ok).toBe(false);
    if (serialized.ok) {
      return;
    }
    expect(serialized.diagnostics.join(" ")).toContain("LINER_SPAN_DUPLICATE_ID");
  });

  it("fails closed when hydrating roadDesignDocument with tampered bridge stable ids", () => {
    const serialized = serializeProjectForPersistence(
      withProjectLinerDraft(createDefaultProject(), createBridgeLayoutDraft()),
    );
    expect(serialized.ok).toBe(true);
    if (!serialized.ok) {
      return;
    }

    const roadDesignDocument = serialized.project.liner!.roadDesignDocument!;
    const wrongBridgeId = parseUuid("11111111-1111-4111-8111-111111111111") as UuidString;
    const tampered = {
      ...serialized.project,
      liner: {
        ...serialized.project.liner!,
        roadDesignDocument: {
          ...roadDesignDocument,
          bridges: roadDesignDocument.bridges.map((entry) => ({
            ...entry,
            entityId: wrongBridgeId,
          })),
          stableIdRegistry: roadDesignDocument.stableIdRegistry.map((entry) =>
            entry.entityKind === "bridge" ? { ...entry, id: wrongBridgeId } : entry,
          ),
        },
      },
    };

    const hydrated = hydrateProjectLinerFromPersistence(tampered);
    expect(hydrated.ok).toBe(false);
    if (hydrated.ok) {
      return;
    }
    expect(hydrated.diagnostics.join(" ")).toContain("bridge stable ids");
  });

  it("serializes ldistJobs into roadDesignDocument extensions and hydrates on reload", () => {
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
    const serialized = serializeProjectForPersistence(project);
    expect(serialized.ok).toBe(true);
    if (!serialized.ok) {
      return;
    }

    const extension =
      serialized.project.liner?.roadDesignDocument?.extensions?.[LINER_DOMAIN_DRAFT_GEOMETRY_EXTENSION_KEY];
    const payload = extension?.json as unknown as { domainDraft: { ldistJobs?: typeof draft.ldistJobs } };
    expect(payload.domainDraft.ldistJobs).toEqual(draft.ldistJobs);

    const hydrated = hydrateProjectLinerFromPersistence(serialized.project);
    expect(hydrated.ok).toBe(true);
    if (!hydrated.ok) {
      return;
    }
    expect(hydrated.project.liner?.domainDraft?.ldistJobs).toEqual(draft.ldistJobs);
    expect(linerDraftFromProject(hydrated.project)?.ldistJobs).toEqual(draft.ldistJobs);
  });

  it("round-trips cross-section offset lines referenced by ldistJobs", () => {
    let draft = createDefaultLinerDraft();
    draft = updateLinerCrossSectionTemplate(draft, {
      id: draft.crossSections?.[0]?.id ?? `CS-${draft.alignment.id}`,
      name: draft.crossSections?.[0]?.name ?? "Test",
      offsetLines: [
        { id: "OL-alignment-1-0", offset: -5, elevation: 0, role: "custom" },
        { id: "OL-2", offset: 5, elevation: 0, role: "custom" },
      ],
    });
    draft = addLdistJob(draft, {
      pairs: [{ fromLineId: "OL-alignment-1-0", toLineId: "OL-2" }],
      distanceMode: "mode_b",
      referenceLineId: "OL-alignment-1-0",
    });

    const project = withProjectLinerDraft(createDefaultProject(), draft);
    const serialized = serializeProjectForPersistence(project);
    expect(serialized.ok).toBe(true);
    if (!serialized.ok) {
      return;
    }

    const hydrated = hydrateProjectLinerFromPersistence(serialized.project);
    expect(hydrated.ok).toBe(true);
    if (!hydrated.ok) {
      return;
    }

    const reloaded = linerDraftFromProject(hydrated.project);
    expect(reloaded?.crossSections?.[0]?.offsetLines).toHaveLength(2);
    expect(reloaded?.crossSections?.[0]?.offsetLines?.map((line) => line.id)).toEqual([
      "OL-alignment-1-0",
      "OL-2",
    ]);
    expect(reloaded?.ldistJobs?.[0]?.pairs[0]?.toLineId).toBe("OL-2");
  });

  it("serializes haunchDefinitions into roadDesignDocument extensions and hydrates on reload", () => {
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
    const serialized = serializeProjectForPersistence(project);
    expect(serialized.ok).toBe(true);
    if (!serialized.ok) {
      return;
    }

    expect(serialized.project.liner?.roadDesignDocument?.haunchCapability?.state).toBe("supported");
    const extension =
      serialized.project.liner?.roadDesignDocument?.extensions?.[LINER_DOMAIN_DRAFT_GEOMETRY_EXTENSION_KEY];
    const payload = extension?.json as unknown as {
      domainDraft: { haunchDefinitions?: typeof draft.haunchDefinitions };
    };
    expect(payload.domainDraft.haunchDefinitions).toEqual(draft.haunchDefinitions);

    const hydrated = hydrateProjectLinerFromPersistence(serialized.project);
    expect(hydrated.ok).toBe(true);
    if (!hydrated.ok) {
      return;
    }
    expect(hydrated.project.liner?.domainDraft?.haunchDefinitions).toEqual(draft.haunchDefinitions);
    expect(linerDraftFromProject(hydrated.project)?.haunchDefinitions).toEqual(draft.haunchDefinitions);
  });
});
