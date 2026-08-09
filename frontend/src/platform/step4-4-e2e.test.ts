import { describe, expect, it } from "vitest";
import { createHash } from "node:crypto";
import { createInMemoryAtomicJsonStore } from "../contracts/persistence/atomicStore";
import { parseUuid, type UuidString } from "../contracts/uuid";
import { requireRevisionId } from "../contracts/revision";
import { requireSchemaVersion } from "../contracts/schemaIdentity";
import { createBusinessProjectFolderStore, resolveBusinessProjectFolderBasePath } from "./storage/businessProjectFolderStore";
import type { BusinessProjectRef } from "../contracts/businessProject";
import { createInMemoryBusinessRegistry } from "./business/businessRegistry";

const ROAD_ID = parseUuid("33333333-3333-4333-8333-333333333333")!;

function storeChecksum(payload: unknown): string {
  return createHash("sha256")
    .update(`${JSON.stringify(payload, null, 2)}\n`, "utf8")
    .digest("hex");
}

function buildManifest(
  projectId: UuidString,
  projectNumber: string,
  projectName: string,
  designStage: string,
  roadRefs: readonly BusinessProjectRef[] = [],
): any {
  return {
    schemaId: "spacer.contracts.engineering-project",
    schemaVersion: requireSchemaVersion("0.2.0"),
    documentKind: "engineering-project" as const,
    documentId: projectId,
    revisionId: requireRevisionId(1),
    contentChecksum: { algorithm: "sha256" as const, hexDigest: "a".repeat(64) },
    provenance: {
      createdAt: "2026-08-01T00:00:00.000Z",
      createdBy: { actorId: "tester", actorType: "user" as const },
      producer: { toolId: "spacer", toolVersion: "0.1.0" },
    },
    projectId,
    projectNumber,
    projectName,
    designStage,
    projectStatus: "active" as const,
    coordinateReference: null,
    roadRefs,
    bridgeProjectRefs: [],
    analysisRefs: [],
    sharedDatasetRefs: [],
    deliverableRefs: [],
    projectRevisionMetadata: {
      schemaVersion: requireSchemaVersion("0.1.0"),
      documentId: projectId,
      revisionId: requireRevisionId(1),
      createdAt: "2026-08-01T00:00:00.000Z",
      contentChecksum: { algorithm: "sha256" as const, hexDigest: "a".repeat(64) },
    },
    status: { phase: designStage, sections: { road: "COMPLETE", bridge: "PARTIAL" } },
    migrationProvenanceRef: null,
  };
}

/**
 * Step 4-4 E2E (unit-level): new business -> create -> save -> reopen -> restore.
 * Exercises the full application flow across registry + folder store without a browser.
 */
describe("Step 4-4 full business flow (unit E2E)", () => {
  it("new business -> save -> reopen restores the same project", () => {
    const registry = createInMemoryBusinessRegistry();
    const created = registry.create({
      projectNumber: "H620164A",
      projectName: "テスト道路設計業務",
      designStage: "road_design",
    });

    const store = createInMemoryAtomicJsonStore();
    const folder = createBusinessProjectFolderStore({
      store,
      basePath: resolveBusinessProjectFolderBasePath(created.businessId),
    });

    expect(folder.exists()).toBe(false);

    const manifest = buildManifest(
      created.businessId,
      created.projectNumber,
      created.projectName,
      created.designStage,
    );
    const saved = folder.save({ manifest, childDocuments: [] });
    expect(saved.ok).toBe(true);

    // Reopen (e.g. after app restart) restores the same business.
    const reopenedFolder = createBusinessProjectFolderStore({
      store,
      basePath: resolveBusinessProjectFolderBasePath(created.businessId),
    });
    const opened = reopenedFolder.open();
    expect(opened.ok).toBe(true);
    if (opened.ok) {
      expect(opened.manifest.projectId).toBe(created.businessId);
      expect(opened.manifest.projectName).toBe("テスト道路設計業務");
      expect(opened.manifest.projectNumber).toBe("H620164A");
      expect(opened.childUris).toEqual([]);
    }

    expect(registry.find(created.businessId)?.projectName).toBe("テスト道路設計業務");
  });

  it("a corrupt child document fails closed on open", () => {
    const registry = createInMemoryBusinessRegistry();
    const created = registry.create({
      projectNumber: "X",
      projectName: "Y",
      designStage: "analysis",
    });

    const store = createInMemoryAtomicJsonStore();
    const folder = createBusinessProjectFolderStore({
      store,
      basePath: resolveBusinessProjectFolderBasePath(created.businessId),
    });

    const childPayload = { name: "road-1" };
    const roadRef: BusinessProjectRef = {
      documentKind: "road-design" as const,
      documentId: ROAD_ID,
      revisionId: requireRevisionId(1),
      contentChecksum: { algorithm: "sha256" as const, hexDigest: storeChecksum(childPayload) },
      uri: "roads/road-1.road.json",
    };

    const manifest = buildManifest(
      created.businessId,
      created.projectNumber,
      created.projectName,
      created.designStage,
      [roadRef],
    );
    const saved = folder.save({
      manifest,
      childDocuments: [{ kind: "road-design", ref: roadRef, payload: childPayload }],
    });
    expect(saved.ok).toBe(true);

    // Corrupt the child after save: open must fail-closed.
    store.store(
      `${resolveBusinessProjectFolderBasePath(created.businessId)}/roads/road-1.road.json`,
      { corrupted: true },
      {},
    );
    const opened = folder.open();
    expect(opened.ok).toBe(false);
    if (!opened.ok) {
      expect(opened.reason).toBe("child-mismatch");
    }
  });
});
