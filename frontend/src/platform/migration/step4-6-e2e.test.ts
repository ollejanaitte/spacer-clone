import { describe, expect, it } from "vitest";
import { createHash } from "node:crypto";
import { createInMemoryAtomicJsonStore } from "../../contracts/persistence/atomicStore";
import { requireRevisionId } from "../../contracts/revision";
import {
  createBusinessProjectFolderStore,
  resolveBusinessProjectFolderBasePath,
} from "../storage/businessProjectFolderStore";
import { createBusinessProjectMigrationDryRun } from "./migrationDryRun";
import { adaptBridgeProjectToBusinessRef } from "./migrationAdapters";

const checksum = { algorithm: "sha256" as const, hexDigest: "a".repeat(64) };

const legacyBridge = {
  schemaId: "spacer.contracts.bridge-project",
  schemaVersion: "0.1.0",
  documentKind: "bridge-project",
  documentId: "11111111-1111-4111-8111-111111111111",
  revisionId: 1,
  contentChecksum: checksum,
  name: "Legacy Bridge 001",
};
const legacyUri = "bridges/b001/manifest.json";
const sourceSnapshot = JSON.stringify(legacyBridge);

function storeChecksum(payload: unknown): string {
  return createHash("sha256")
    .update(`${JSON.stringify(payload, null, 2)}\n`, "utf8")
    .digest("hex");
}

function childChecksum() {
  return { algorithm: "sha256" as const, hexDigest: storeChecksum(legacyBridge) };
}

/**
 * Step 4-6-5 Migration E2E (unit-level): dry-run -> migration -> BusinessProject
 * save -> open -> restart -> reopen, with the source left unchanged.
 */
describe("Step 4-6 migration E2E (unit)", () => {
  it("legacy bridge -> dry-run -> BusinessProject save -> restart -> reopen, source unchanged", () => {
    // 1. Legacy source data (simulated BridgeProject canonical).
    // 2. Non-destructive dry-run preview.
    const dryRun = createBusinessProjectMigrationDryRun();
    const preview = dryRun.preview({
      format: "project-json",
      name: "Legacy Bridge 001",
      raw: { projectNumber: "LEGACY-001", bridgeProject: legacyBridge },
    });
    expect(preview.ok).toBe(true);
    if (!preview.ok) return;
    expect(preview.plan.plannedChildKinds).toContain("bridge-project");

    // 3. Adapt the legacy bridge into a BusinessProject child ref (verbatim).
    const adapted = adaptBridgeProjectToBusinessRef(
      legacyBridge as never,
      legacyUri,
    );
    expect(adapted.ok).toBe(true);
    if (!adapted.ok) return;

    // The ref's checksum must match the serialized child payload stored on disk.
    const storedChildRef = { ...adapted.ref, contentChecksum: childChecksum() };

    // 4. Build the target manifest referencing the adapted child.
    const targetManifest = {
      ...preview.manifest,
      bridgeProjectRefs: [storedChildRef],
    };

    // 5. Save the BusinessProject into a folder store (child payload verbatim).
    const store = createInMemoryAtomicJsonStore();
    const folder = createBusinessProjectFolderStore({
      store,
      basePath: resolveBusinessProjectFolderBasePath(targetManifest.projectId),
    });
    const saved = folder.save({
      manifest: targetManifest,
      childDocuments: [
        {
          kind: "bridge-project",
          ref: storedChildRef,
          payload: legacyBridge,
        },
      ],
    });
    expect(saved.ok).toBe(true);

    // 6. Simulate app restart: reopen from the store.
    const reopened = createBusinessProjectFolderStore({
      store,
      basePath: resolveBusinessProjectFolderBasePath(targetManifest.projectId),
    });
    const opened = reopened.open();
    expect(opened.ok).toBe(true);
    if (opened.ok) {
      expect(opened.manifest.bridgeProjectRefs).toHaveLength(1);
      expect(opened.manifest.bridgeProjectRefs[0]!.documentId).toBe(
        "11111111-1111-4111-8111-111111111111",
      );
      expect(opened.childUris).toEqual([legacyUri]);
    }

    // 7. Save a second time (revision bump) and reopen again.
    const targetManifest2 = {
      ...targetManifest,
      revisionId: requireRevisionId(2),
      projectRevisionMetadata: {
        ...targetManifest.projectRevisionMetadata,
        revisionId: requireRevisionId(2),
        contentChecksum: checksum,
      },
      contentChecksum: checksum,
      bridgeProjectRefs: [storedChildRef],
    };
    // Second save: children unchanged (already persisted), only manifest revision bumps.
    const saved2 = folder.save({
      manifest: targetManifest2,
      childDocuments: [],
    });
    expect(saved2.ok).toBe(true);

    const opened2 = reopened.open();
    expect(opened2.ok).toBe(true);
    if (opened2.ok) {
      expect(opened2.manifest.revisionId).toBe(requireRevisionId(2));
    }

    // 8. Source must be unchanged (non-destructive migration).
    expect(JSON.stringify(legacyBridge)).toBe(sourceSnapshot);
    expect(dryRun.isSourceOverwritten()).toBe(false);
  });

  it("dry-run produces a valid BusinessProject id (uuid)", () => {
    const dryRun = createBusinessProjectMigrationDryRun();
    const preview = dryRun.preview({
      format: "project-json",
      name: "n",
      raw: { name: "n" },
    });
    expect(preview.ok).toBe(true);
    if (preview.ok) {
      expect(preview.plan.targetBusinessId).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
      );
      expect(preview.manifest.projectId).toBe(preview.plan.targetBusinessId);
    }
  });
});
