// @vitest-environment jsdom
import { act, type ReactNode } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { getProjectManager, resetProjectManagerForTest } from "../../../project/projectManagerInstance";
import { createEmptyProject } from "../../../project/projectDataCore";
import { RoadEditorPanel } from "../../../components/RoadEditorPanel";
import { readRoadData } from "../../roadModuleAdapter";

async function render(node: ReactNode): Promise<Root> {
  await getProjectManager().restoreFromPersistence();
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);
  await act(async () => {
    root.render(node);
  });
  return root;
}

function cleanup(root: Root) {
  act(() => {
    root.unmount();
  });
}

beforeEach(() => {
  resetProjectManagerForTest();
});

afterEach(() => {
  document.body.innerHTML = "";
  resetProjectManagerForTest();
});

function setupProject(): string {
  const manager = getProjectManager();
  manager.importProject(createEmptyProject("道路業務"));
  return manager.listProjects()[0]!.projectId;
}

describe("RoadEditorPanel (Phase 7.3 WP-G)", () => {
  it("renders the rescued editors when enabled", async () => {
    const projectId = setupProject();
    const root = await render(<RoadEditorPanel projectId={projectId} featureFlagEnabled />);
    expect(document.querySelector('[data-testid="road-editors"]')).toBeTruthy();
    expect(document.querySelector('[data-testid="road-editor-horizontal"]')).toBeTruthy();
    expect(document.querySelector('[data-testid="road-editor-vertical"]')).toBeTruthy();
    expect(document.querySelector('[data-testid="road-editor-cross-section"]')).toBeTruthy();
    cleanup(root);
  });

  it("renders the Phase 7.4 rescued editors when enabled", async () => {
    const projectId = setupProject();
    const root = await render(<RoadEditorPanel projectId={projectId} featureFlagEnabled />);
    expect(document.querySelector('[data-testid="road-editor-line-management"]')).toBeTruthy();
    expect(document.querySelector('[data-testid="road-editor-stationing"]')).toBeTruthy();
    expect(document.querySelector('[data-testid="road-editor-crossfall"]')).toBeTruthy();
    expect(document.querySelector('[data-testid="road-editor-width"]')).toBeTruthy();
    expect(document.querySelector('[data-testid="road-editor-superelevation"]')).toBeTruthy();
    expect(document.querySelector('[data-testid="road-editor-3d"]')).toBeTruthy();
    cleanup(root);
  });

  it("returns null when feature flag is disabled (rollback)", async () => {
    const projectId = setupProject();
    const root = await render(<RoadEditorPanel projectId={projectId} featureFlagEnabled={false} />);
    expect(document.querySelector('[data-testid="road-editors"]')).toBeNull();
    cleanup(root);
  });

  it("writes canonical roadData on editor change", async () => {
    const projectId = setupProject();
    const manager = getProjectManager();
    const root = await render(<RoadEditorPanel projectId={projectId} featureFlagEnabled />);

    // Add a straight element through the rescued horizontal editor.
    const addButton = document.querySelector('[data-testid="add-liner-straight-element"]');
    expect(addButton).toBeTruthy();
    await act(async () => {
      (addButton as HTMLButtonElement).click();
    });

    const roadData = readRoadData(manager, projectId);
    expect(roadData).toBeDefined();
    if (roadData) {
      expect(roadData.domainDraft.alignments.length).toBeGreaterThanOrEqual(1);
      expect(roadData.contentChecksum).toMatch(/^[0-9a-f]{64}$/);
    }
    cleanup(root);
  });

  it("writes canonical roadData on width change point add (Phase 7.4)", async () => {
    const projectId = setupProject();
    const manager = getProjectManager();
    const root = await render(<RoadEditorPanel projectId={projectId} featureFlagEnabled />);

    const addButton = document.querySelector('[data-testid="add-width-change-point"]');
    expect(addButton).toBeTruthy();
    await act(async () => {
      (addButton as HTMLButtonElement).click();
    });

    const roadData = readRoadData(manager, projectId);
    expect(roadData).toBeDefined();
    if (roadData) {
      const widthPoints = roadData.domainDraft.alignments[0]?.widthChangePoints ?? [];
      expect(widthPoints.length).toBeGreaterThanOrEqual(1);
      expect(roadData.contentChecksum).toMatch(/^[0-9a-f]{64}$/);
    }
    cleanup(root);
  });

  it("writes canonical roadData on crossfall interval add (Phase 7.4)", async () => {
    const projectId = setupProject();
    const manager = getProjectManager();
    const root = await render(<RoadEditorPanel projectId={projectId} featureFlagEnabled />);

    const addButton = document.querySelector('[data-testid="add-crossfall-interval"]');
    expect(addButton).toBeTruthy();
    await act(async () => {
      (addButton as HTMLButtonElement).click();
    });

    const roadData = readRoadData(manager, projectId);
    expect(roadData).toBeDefined();
    if (roadData) {
      const intervals = roadData.domainDraft.alignments[0]?.crossSlopeIntervals ?? [];
      expect(intervals.length).toBeGreaterThanOrEqual(1);
      expect(roadData.contentChecksum).toMatch(/^[0-9a-f]{64}$/);
    }
    cleanup(root);
  });
});
