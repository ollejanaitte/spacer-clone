import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { createSampleImporterProject } from "../../../liner/importer/__tests__/fixtures/sampleProject";
import { convertImporterToPhase35Draft } from "../../../liner/importer/export/ImporterToPhase35Adapter";
import { createDefaultLinerDraft } from "../../../liner/adapters/linerUiAdapter";
import {
  updateLinerDrawingSettings,
  updateLinerPiers,
  updateLinerSpans,
} from "../../../liner/adapters/linerUiAdapter";
import { withProjectLinerDraft } from "../../../liner/adapters/linerProjectDraft";
import { createDefaultProject } from "../../../data/defaultProject";
import { roadDesignDocumentToDomainDraft } from "../../../liner/adapters/linerDomainDraftRoadDesignMapper";
import { createValidBridgeFrameAnalysisDocument, createValidRoadDesignDocument } from "../../repository/__tests__/fixtures";
import {
  createDocumentPersistenceGateway,
  createInMemoryAtomicJsonStore,
  loadBridgeFrameAnalysisDocument,
  loadRoadDesignDocument,
  projectLinerDomainDraftToRoadDesignDocument,
  saveBridgeFrameAnalysisDocument,
  saveRoadDesignDocument,
} from "../index";

const FIXED_CLOCK_PATH = "documents/test";

const FIXED_CLOCK = {
  now: () => "2026-07-16T04:00:00.000Z",
};

function loadExampleProject(): Record<string, unknown> {
  const path = resolve(process.cwd(), "../examples/simple_beam_verification.json");
  const parsed: unknown = JSON.parse(readFileSync(path, "utf8"));
  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
    throw new Error("Expected object project JSON.");
  }
  return {
    ...(parsed as Record<string, unknown>),
    schemaVersion: 1,
  };
}

describe("phase 0 D03 migration integration", () => {
  it("loads legacy road into canonical target", () => {
    const result = loadRoadDesignDocument(createSampleImporterProject());
    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }
    expect(result.sourceKind).toBe("legacy");
    expect(result.document.documentKind).toBe("road-design");
    expect(result.document.schemaVersion).toBe("0.1.0");
  });

  it("loads legacy frame into canonical target", () => {
    const result = loadBridgeFrameAnalysisDocument(loadExampleProject());
    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }
    expect(result.sourceKind).toBe("legacy");
    expect(result.document.documentKind).toBe("bridge-frame-analysis");
    expect(result.document.schemaVersion).toBe("0.1.0");
  });

  it("loads current target documents", () => {
    const road = loadRoadDesignDocument(createValidRoadDesignDocument());
    const frame = loadBridgeFrameAnalysisDocument(createValidBridgeFrameAnalysisDocument());
    expect(road.ok && frame.ok).toBe(true);
    if (!road.ok || !frame.ok) {
      return;
    }
    expect(road.sourceKind).toBe("target");
    expect(frame.sourceKind).toBe("target");
  });

  it("rejects missing versions on legacy and target paths", () => {
    const legacyRoad = createSampleImporterProject() as unknown as {
      liner: { importerSchemaVersion?: string };
    };
    delete legacyRoad.liner.importerSchemaVersion;
    expect(loadRoadDesignDocument(legacyRoad).ok).toBe(false);

    const legacyFrame = loadExampleProject();
    delete legacyFrame.schemaVersion;
    expect(loadBridgeFrameAnalysisDocument(legacyFrame).ok).toBe(false);

    const target = createValidRoadDesignDocument() as unknown as Record<string, unknown>;
    delete target.schemaVersion;
    expect(loadRoadDesignDocument(target).ok).toBe(false);
  });

  it("rejects unsupported future versions", () => {
    const target = {
      ...createValidRoadDesignDocument(),
      schemaVersion: "9.0.0",
    };
    const result = loadRoadDesignDocument(target);
    expect(result.ok).toBe(false);
    if (result.ok) {
      return;
    }
    expect(result.error.code).toBe("unsupported-version");
  });

  it("rejects malformed JSON strings", () => {
    const result = loadRoadDesignDocument("{not-json");
    expect(result.ok).toBe(false);
    if (result.ok) {
      return;
    }
    expect(result.error.code).toBe("malformed-json");
  });

  it("rejects invalid legacy and ambiguous data", () => {
    const ambiguousUnits = {
      ...loadExampleProject(),
      units: {
        ...(loadExampleProject().units as Record<string, unknown>),
        moment: "mystery",
      },
    };
    const result = loadBridgeFrameAnalysisDocument(ambiguousUnits);
    expect(result.ok).toBe(false);
    if (result.ok) {
      return;
    }
    expect(result.error.code).toBe("adapter-failed");
  });

  it("rejects broken id references", () => {
    const project = loadExampleProject();
    const members = structuredClone(project.members) as Array<Record<string, unknown>>;
    members[0] = { ...members[0]!, nodeJ: "MISSING" };
    const result = loadBridgeFrameAnalysisDocument({ ...project, members });
    expect(result.ok).toBe(false);
    if (result.ok) {
      return;
    }
    expect(result.error.code).toBe("adapter-failed");
  });

  it("round-trips legacy road: load old → save target → reload target", () => {
    const gateway = createDocumentPersistenceGateway({
      clock: FIXED_CLOCK,
      createdAt: "2026-07-16T04:00:00.000Z",
    });
    const loaded = gateway.loadRoad(createSampleImporterProject());
    expect(loaded.ok).toBe(true);
    if (!loaded.ok) {
      return;
    }

    const path = `${FIXED_CLOCK_PATH}/road.json`;
    const saved = gateway.saveRoad(loaded.document, path, { createOnly: true });
    expect(saved.ok).toBe(true);
    if (!saved.ok) {
      return;
    }

    const reloaded = gateway.readRoadFromStore(path);
    expect(reloaded.ok).toBe(true);
    if (!reloaded.ok) {
      return;
    }
    expect(reloaded.sourceKind).toBe("target");
    expect(reloaded.document.schemaVersion).toBe("0.1.0");
    expect(reloaded.document.documentId).toBe(loaded.document.documentId);
    expect(reloaded.document.bridges.map((entry) => entry.entityId)).toEqual(
      loaded.document.bridges.map((entry) => entry.entityId),
    );
    expect(
      Object.prototype.hasOwnProperty.call(reloaded.document, "girderLineSets"),
    ).toBe(false);
    expect(
      Object.prototype.hasOwnProperty.call(reloaded.document, "coordinateSystem"),
    ).toBe(false);
    expect(reloaded.document.extensions?.["spacer.legacy/jip-liner-importer-geometry"]).toBeDefined();
  });

  it("round-trips legacy frame with repository compatibility", () => {
    const gateway = createDocumentPersistenceGateway({
      clock: FIXED_CLOCK,
      createdAt: "2026-07-16T04:00:00.000Z",
    });
    const loaded = gateway.loadFrame(loadExampleProject());
    expect(loaded.ok).toBe(true);
    if (!loaded.ok) {
      return;
    }

    const persisted = gateway.persistFrameToRepository(loaded.document);
    expect(persisted.ok).toBe(true);
    if (!persisted.ok) {
      return;
    }

    const readBack = gateway.frameRepository.readLatest(loaded.document.documentId);
    expect(readBack.ok).toBe(true);
    if (!readBack.ok) {
      return;
    }
    expect(readBack.value.schemaVersion).toBe("0.1.0");
    expect(readBack.value.structuralModel.nodes[0]?.entityId).toBe(
      loaded.document.structuralModel.nodes[0]?.entityId,
    );

    const path = `${FIXED_CLOCK_PATH}/frame.json`;
    const saved = gateway.saveFrame(loaded.document, path, { createOnly: true });
    expect(saved.ok).toBe(true);
    const reloaded = gateway.readFrameFromStore(path);
    expect(reloaded.ok).toBe(true);
    if (!reloaded.ok) {
      return;
    }
    expect(reloaded.document).toEqual(loaded.document);
  });

  it("keeps repeated load/save stable and non-mutating", () => {
    const gateway = createDocumentPersistenceGateway({
      clock: FIXED_CLOCK,
      createdAt: "2026-07-16T04:00:00.000Z",
    });
    const sample = createSampleImporterProject();
    const before = structuredClone(sample);
    const first = gateway.loadRoad(sample);
    const second = gateway.loadRoad(sample);
    expect(sample).toEqual(before);
    expect(first.ok && second.ok).toBe(true);
    if (!first.ok || !second.ok) {
      return;
    }
    expect(first.document).toEqual(second.document);

    const path = `${FIXED_CLOCK_PATH}/road-stable.json`;
    expect(gateway.saveRoad(first.document, path, { createOnly: true }).ok).toBe(true);
    const reloadA = gateway.readRoadFromStore(path);
    const reloadB = gateway.readRoadFromStore(path);
    expect(reloadA.ok && reloadB.ok).toBe(true);
    if (!reloadA.ok || !reloadB.ok) {
      return;
    }
    expect(reloadA.document).toEqual(reloadB.document);
  });

  it("forbids dual-write of legacy payloads", () => {
    const store = createInMemoryAtomicJsonStore();
    const legacy = createSampleImporterProject();
    const result = saveRoadDesignDocument(
      legacy as unknown as ReturnType<typeof createValidRoadDesignDocument>,
      "documents/legacy-forbidden.json",
      store,
    );
    expect(result.ok).toBe(false);
    if (result.ok) {
      return;
    }
    expect(result.error.code).toBe("legacy-write-forbidden");
  });

  it("preserves road/frame separation on load", () => {
    const road = loadRoadDesignDocument(createSampleImporterProject());
    const frame = loadBridgeFrameAnalysisDocument(loadExampleProject());
    expect(road.ok && frame.ok).toBe(true);
    if (!road.ok || !frame.ok) {
      return;
    }
    expect("structuralModel" in road.document).toBe(false);
    expect("alignments" in frame.document).toBe(false);
  });

  it("saves target and reloads target without legacy leakage", () => {
    const store = createInMemoryAtomicJsonStore();
    const document = createValidRoadDesignDocument();
    const saved = saveRoadDesignDocument(document, "documents/target-road.json", store, {
      createOnly: true,
    });
    expect(saved.ok).toBe(true);
    const reloaded = loadRoadDesignDocument(store.read("documents/target-road.json"));
    expect(reloaded.ok).toBe(true);
    if (!reloaded.ok) {
      return;
    }
    expect(reloaded.sourceKind).toBe("target");
    expect(reloaded.document.documentId).toBe(document.documentId);
  });

  it("propagates migration path failures for unsupported target versions", () => {
    const frame = {
      ...createValidBridgeFrameAnalysisDocument(),
      schemaVersion: "2.0.0",
    };
    const result = loadBridgeFrameAnalysisDocument(frame);
    expect(result.ok).toBe(false);
    if (result.ok) {
      return;
    }
    expect(result.error.code).toBe("unsupported-version");
  });

  it("rejects saving frame legacy project model directly", () => {
    const store = createInMemoryAtomicJsonStore();
    const result = saveBridgeFrameAnalysisDocument(
      loadExampleProject() as unknown as ReturnType<typeof createValidBridgeFrameAnalysisDocument>,
      "documents/legacy-frame.json",
      store,
    );
    expect(result.ok).toBe(false);
    if (result.ok) {
      return;
    }
    expect(result.error.code).toBe("legacy-write-forbidden");
  });

  it("projects liner domainDraft to RoadDesignDocument and round-trips through persistence", () => {
    const domainDraft = withProjectLinerDraft(createDefaultProject(), createDefaultLinerDraft()).liner
      ?.domainDraft;
    expect(domainDraft).toBeDefined();

    const projected = projectLinerDomainDraftToRoadDesignDocument(domainDraft!, {
      createdAt: "2026-07-16T04:00:00.000Z",
    });
    expect(projected.ok).toBe(true);
    if (!projected.ok) {
      return;
    }
    expect(projected.sourceFormatId).toBe("liner-domain-draft-vnext");

    const gateway = createDocumentPersistenceGateway({
      createdAt: "2026-07-16T04:00:00.000Z",
    });
    const path = `${FIXED_CLOCK_PATH}/liner-domain-draft-road.json`;
    const saved = gateway.saveRoad(projected.document, path, { createOnly: true });
    expect(saved.ok).toBe(true);

    const reloaded = gateway.readRoadFromStore(path);
    expect(reloaded.ok).toBe(true);
    if (!reloaded.ok) {
      return;
    }

    const restored = roadDesignDocumentToDomainDraft(reloaded.document);
    expect(restored.ok).toBe(true);
    if (!restored.ok) {
      return;
    }
    expect(restored.domainDraft).toEqual(domainDraft);
  });

  it("projects bridge layout domainDraft to RoadDesignDocument and preserves spans/piers", () => {
    let draft = createDefaultLinerDraft();
    draft = updateLinerPiers(draft, [
      { id: "P1", physicalDistance: 10, kind: "abutment" },
      { id: "P2", physicalDistance: 90, kind: "pier" },
    ]);
    draft = updateLinerSpans(draft, [
      {
        id: "SP1",
        startPhysicalDistance: 10,
        endPhysicalDistance: 90,
        pierIdStart: "P1",
        pierIdEnd: "P2",
      },
    ]);
    draft = updateLinerDrawingSettings(draft, {
      version: "0.1.0",
      planPaperSize: "A2",
      marginMm: 10,
    });

    const domainDraft = withProjectLinerDraft(createDefaultProject(), draft).liner?.domainDraft;
    expect(domainDraft).toBeDefined();

    const projected = projectLinerDomainDraftToRoadDesignDocument(domainDraft!, {
      createdAt: "2026-07-16T04:00:00.000Z",
    });
    expect(projected.ok).toBe(true);
    if (!projected.ok) {
      return;
    }
    expect(projected.document.bridges).toHaveLength(1);

    const store = createInMemoryAtomicJsonStore();
    const path = `${FIXED_CLOCK_PATH}/liner-bridge-layout.json`;
    const saved = saveRoadDesignDocument(projected.document, path, store, { createOnly: true });
    expect(saved.ok).toBe(true);

    const reloaded = loadRoadDesignDocument(store.read(path));
    expect(reloaded.ok).toBe(true);
    if (!reloaded.ok) {
      return;
    }

    const restored = roadDesignDocumentToDomainDraft(reloaded.document);
    expect(restored.ok).toBe(true);
    if (!restored.ok) {
      return;
    }
    expect(restored.domainDraft.spans).toEqual(domainDraft!.spans);
    expect(restored.domainDraft.piers).toEqual(domainDraft!.piers);
    expect(restored.domainDraft.drawingSettings).toEqual(domainDraft!.drawingSettings);
  });

  it("round-trips importer-derived bridge layout through domainDraft projection", () => {
    const conversion = convertImporterToPhase35Draft(createSampleImporterProject());
    expect(conversion.draft).not.toBeNull();
    expect(conversion.draft!.spans.length).toBeGreaterThan(0);

    const projected = projectLinerDomainDraftToRoadDesignDocument(conversion.draft!, {
      createdAt: "2026-07-16T04:00:00.000Z",
    });
    expect(projected.ok).toBe(true);
    if (!projected.ok) {
      return;
    }
    expect(projected.document.bridges.length).toBe(conversion.draft!.spans.length);

    const restored = roadDesignDocumentToDomainDraft(projected.document);
    expect(restored.ok).toBe(true);
    if (!restored.ok) {
      return;
    }
    expect(restored.domainDraft.spans).toEqual(conversion.draft!.spans);
    expect(restored.domainDraft.piers).toEqual(conversion.draft!.piers);
  });
});
