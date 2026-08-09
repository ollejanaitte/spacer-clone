import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import {
  BUSINESS_PROJECT_SCHEMA_VERSION,
  createEmptyBusinessProjectRefs,
  type BusinessProjectManifest,
} from "../../contracts/businessProject";
import { REVISION_METADATA_SCHEMA_VERSION } from "../../contracts/revision";
import { parseUuid, type UuidString } from "../../contracts/uuid";
import { requireRevisionId } from "../../contracts/revision";
import { createInMemoryAtomicJsonStore } from "../../contracts/persistence/atomicStore";
import {
  createBusinessProjectFolderStore,
  resolveBusinessProjectFolderBasePath,
} from "./businessProjectFolderStore";

const PROJECT_ID = parseUuid("11111111-1111-4111-8111-111111111111")!;
const ROAD_ID = parseUuid("33333333-3333-4333-8333-333333333333")!;

function createChecksum(hexDigest = "a".repeat(64)) {
  return { algorithm: "sha256" as const, hexDigest };
}

function createProvenance() {
  return {
    createdAt: "2026-08-01T00:00:00.000Z",
    createdBy: { actorId: "tester", actorType: "user" as const },
    producer: { toolId: "spacer", toolVersion: "0.1.0" },
  };
}

function createRevisionMetadata(documentId: UuidString, revisionId: number) {
  return {
    schemaVersion: REVISION_METADATA_SCHEMA_VERSION,
    documentId,
    revisionId: requireRevisionId(revisionId),
    createdAt: "2026-08-01T00:00:00.000Z",
    contentChecksum: createChecksum(),
  };
}

function buildManifest(revisionId = 1, roadRefs = emptyRoadRefs()): BusinessProjectManifest {
  return {
    schemaId: "spacer.contracts.engineering-project" as BusinessProjectManifest["schemaId"],
    schemaVersion: BUSINESS_PROJECT_SCHEMA_VERSION,
    documentKind: "engineering-project" as const,
    documentId: PROJECT_ID,
    revisionId: requireRevisionId(revisionId),
    contentChecksum: createChecksum(),
    provenance: createProvenance(),
    projectId: PROJECT_ID,
    projectNumber: "H620164A",
    projectName: "テスト道路設計業務",
    designStage: "road_design" as const,
    projectStatus: "active" as const,
    coordinateReference: null,
    roadRefs,
    bridgeProjectRefs: [],
    analysisRefs: [],
    sharedDatasetRefs: [],
    deliverableRefs: [],
    projectRevisionMetadata: createRevisionMetadata(PROJECT_ID, revisionId),
    status: { phase: "road_design", sections: { road: "COMPLETE", bridge: "PARTIAL" } },
    migrationProvenanceRef: null,
  };
}

function emptyRoadRefs() {
  return createEmptyBusinessProjectRefs().roadRefs;
}

function storeChecksum(payload: unknown): string {
  return createHash("sha256")
    .update(`${JSON.stringify(payload, null, 2)}\n`, "utf8")
    .digest("hex");
}

function roadRefForPayload(uri: string, payload: unknown) {
  return {
    documentKind: "road-design" as const,
    documentId: ROAD_ID,
    revisionId: requireRevisionId(1),
    contentChecksum: { algorithm: "sha256" as const, hexDigest: storeChecksum(payload) },
    uri,
  };
}

function roadRef(uri: string) {
  return {
    documentKind: "road-design" as const,
    documentId: ROAD_ID,
    revisionId: requireRevisionId(1),
    contentChecksum: createChecksum("b".repeat(64)),
    uri,
  };
}

describe("createBusinessProjectFolderStore", () => {
  it("returns missing when the folder has no manifest", () => {
    const store = createInMemoryAtomicJsonStore();
    const folder = createBusinessProjectFolderStore({
      store,
      basePath: resolveBusinessProjectFolderBasePath(PROJECT_ID),
    });
    const outcome = folder.open();
    expect(outcome.ok).toBe(false);
    if (!outcome.ok) {
      expect(outcome.reason).toBe("missing");
    }
    expect(folder.exists()).toBe(false);
  });

  it("saves children + manifest and opens them back", () => {
    const store = createInMemoryAtomicJsonStore();
    const folder = createBusinessProjectFolderStore({
      store,
      basePath: resolveBusinessProjectFolderBasePath(PROJECT_ID),
    });
    const childPayload = { roadId: ROAD_ID, name: "Road 3333" };
    const manifest = buildManifest(1, [roadRefForPayload("roads/road-3333.road.json", childPayload)]);
    const result = folder.save({
      manifest,
      childDocuments: [
        {
          kind: "road-design",
          ref: roadRefForPayload("roads/road-3333.road.json", childPayload),
          payload: childPayload,
        },
      ],
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.manifestRevision).toBe(1);
      expect(result.manifestChecksum.algorithm).toBe("sha256");
    }

    const opened = folder.open();
    expect(opened.ok).toBe(true);
    if (opened.ok) {
      expect(opened.manifest.projectId).toBe(PROJECT_ID);
      expect(opened.childUris).toEqual(["roads/road-3333.road.json"]);
    }
    expect(folder.exists()).toBe(true);
  });

  it("fails closed on an invalid manifest", () => {
    const store = createInMemoryAtomicJsonStore();
    const folder = createBusinessProjectFolderStore({
      store,
      basePath: resolveBusinessProjectFolderBasePath(PROJECT_ID),
    });
    const manifest = buildManifest(1, [roadRef("roads/x.road.json")]);
    const result = folder.save({
      manifest: { ...manifest, projectNumber: "  " },
      childDocuments: [
        { kind: "road-design", ref: roadRef("roads/x.road.json"), payload: {} },
      ],
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toBe("validation");
    }
  });

  it("detects child checksum readback mismatch", () => {
    const store = createInMemoryAtomicJsonStore();
    const folder = createBusinessProjectFolderStore({
      store,
      basePath: resolveBusinessProjectFolderBasePath(PROJECT_ID),
    });
    const manifest = buildManifest(1, [roadRef("roads/x.road.json")]);
    // Provide a payload but a ref checksum that does not match the payload.
    const result = folder.save({
      manifest,
      childDocuments: [
        { kind: "road-design", ref: roadRef("roads/x.road.json"), payload: { corrupted: true } },
      ],
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toBe("readback-mismatch");
    }
  });

  it("rejects a manifest revision conflict on second save", () => {
    const store = createInMemoryAtomicJsonStore();
    const folder = createBusinessProjectFolderStore({
      store,
      basePath: resolveBusinessProjectFolderBasePath(PROJECT_ID),
    });
    const first = folder.save({
      manifest: buildManifest(1),
      childDocuments: [],
    });
    expect(first.ok).toBe(true);

    // Optimistic concurrency at the store layer: writing with a stale expectedChecksum
    // must be rejected (manifest-last commit protects against lost updates).
    const manifestPath = `${resolveBusinessProjectFolderBasePath(PROJECT_ID)}/business-project.json`;
    const storedChecksum = store.checksumForPath(manifestPath);
    expect(() =>
      store.store(manifestPath, buildManifest(2), { expectedChecksum: "stale-checksum" }),
    ).toThrow(/CHECKSUM_MISMATCH/);
    // The manifest is unchanged; the folder still opens the original revision.
    const reopened = folder.open();
    expect(reopened.ok).toBe(true);
    if (reopened.ok) {
      expect(reopened.manifest.revisionId).toBe(requireRevisionId(1));
    }
    expect(store.checksumForPath(manifestPath)).toBe(storedChecksum);
  });

  it("rejects a non-UUID base path resolution", () => {
    expect(() => resolveBusinessProjectFolderBasePath("not-a-uuid")).toThrow();
  });
});
