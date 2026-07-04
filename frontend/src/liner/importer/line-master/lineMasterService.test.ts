/**
 * @vitest-environment jsdom
 */
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { defaultImporterProjectService } from "../ImporterProjectService";
import { clearImporterStorageForTests } from "../storage/importerStorage";
import { clearRecoveryStateForTests, getRecoveryInfo } from "../storage/recoveryManager";

describe("ImporterProjectService line master save", () => {
  beforeEach(() => {
    clearImporterStorageForTests();
    clearRecoveryStateForTests();
  });

  afterEach(() => {
    clearImporterStorageForTests();
    clearRecoveryStateForTests();
  });

  it("persists girder line sets and updates recovery metadata", () => {
    const service = defaultImporterProjectService;
    const project = service.createEmptyProject("Service Save Test");
    const withBridge = service.createBridge(project.id, "橋1");
    const bridgeId = withBridge.bridges[0]!.id;

    const saved = service.saveBridgeGirderLineSet(project.id, bridgeId, {
      id: "gls-1",
      name: "CL",
      referenceMode: "pdf-row-master",
      appliesToSpanIds: [],
      lines: [{ id: "line-1", label: "CL", role: "center", displayOrder: 0 }],
    });

    expect(saved.bridges[0]?.girderLineSets[0]?.lines).toHaveLength(1);
    expect(saved.renderability).toBeDefined();
    expect(getRecoveryInfo()).toMatchObject({
      projectId: saved.id,
      lastEditedStep: "lineMaster",
      lastEditedRef: { bridgeId },
    });
  });
});
