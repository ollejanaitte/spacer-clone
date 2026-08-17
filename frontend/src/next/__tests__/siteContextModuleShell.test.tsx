// @vitest-environment jsdom
import { act, type ReactNode } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { SiteContextModuleShellPage } from "../pages/SiteContextModuleShellPage";
import { modulePath } from "../routes";
import { getProjectManager, resetProjectManagerForTest } from "../project/projectManagerInstance";
import { createEmptyProject } from "../project/projectDataCore";

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
  window.history.pushState({}, "", "/app");
  resetProjectManagerForTest();
});

describe("SiteContextModuleShellPage (/app 正式統合)", () => {
  it("renders the existing SiteContext asset without destroying other modules or project id", async () => {
    const manager = getProjectManager();
    manager.importProject(createEmptyProject("統合検証業務"));
    const project = manager.listProjects()[0];
    const projectId = project.projectId;

    const root = await render(<SiteContextModuleShellPage projectId={projectId} />);
    expect(document.querySelector('[data-testid="site-context-page"]')).toBeTruthy();
    expect(document.querySelector('[data-testid="site-context-import-panel"]')).toBeTruthy();
    expect(document.querySelector('[data-testid="site-context-dem-panel"]')).toBeTruthy();
    cleanup(root);

    const after = manager.getProject(projectId);
    expect(after).toBeDefined();
    expect(after?.projectId).toBe(projectId);
  });

  it("郡上サンプル地形読み込みでProject ID・他Moduleを保持しつつterrainへ保存する", async () => {
    const manager = getProjectManager();
    manager.importProject(createEmptyProject("統合検証業務"));
    const project = manager.listProjects()[0];
    const projectId = project.projectId;

    const root = await render(<SiteContextModuleShellPage projectId={projectId} />);
    const gujoButton = document.querySelector('[data-testid="site-context-gujo-sample"]') as HTMLButtonElement;
    expect(gujoButton).toBeTruthy();
    act(() => {
      gujoButton.click();
    });
    await new Promise((resolve) => setTimeout(resolve, 0));

    const after = manager.getProject(projectId);
    expect(after).toBeDefined();
    expect(after?.projectId).toBe(projectId);
    expect(after?.modules.terrain).toBeDefined();
    const terrainData = (after!.modules.terrain as { data?: Record<string, unknown> }).data ?? {};
    expect(terrainData.assetManifest).toBeTruthy();
    cleanup(root);
  });

  it("direct module route is reachable from the project top", async () => {
    const manager = getProjectManager();
    manager.importProject(createEmptyProject("統合検証業務"));
    const project = manager.listProjects()[0];
    window.history.pushState({}, "", modulePath(project.projectId, "terrain"));
    const root = await render(<SiteContextModuleShellPage projectId={project.projectId} />);
    expect(document.querySelector('[data-testid="site-context-module-page"]')).toBeTruthy();
    cleanup(root);
  });
});