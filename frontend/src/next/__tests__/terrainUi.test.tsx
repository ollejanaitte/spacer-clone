// @vitest-environment jsdom
import { act, type ReactNode } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { NextApp } from "../NextApp";
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

describe("Phase 3 Site Context UI（既存SiteContext資産を/appへ正式統合）", () => {
  it("renders the Site Context page with existing assets (import / DEM / preview)", async () => {
    const manager = getProjectManager();
    manager.importProject(createEmptyProject("現況地理業務"));
    const project = manager.listProjects()[0];
    window.history.pushState({}, "", modulePath(project.projectId, "terrain"));
    const root = await render(<NextApp />);
    expect(document.querySelector('[data-testid="site-context-module-page"]')).toBeTruthy();
    expect(document.querySelector('[data-testid="site-context-page"]')).toBeTruthy();
    expect(document.querySelector('[data-testid="site-context-import-panel"]')).toBeTruthy();
    expect(document.querySelector('[data-testid="site-context-dem-panel"]')).toBeTruthy();
    expect(document.querySelector('[data-testid="site-context-terrain-preview"]')).toBeTruthy();
    expect(document.querySelector('[data-testid="site-context-back"]')).toBeTruthy();
    cleanup(root);
  });

  it("shows no legacy route", async () => {
    const manager = getProjectManager();
    manager.importProject(createEmptyProject("現況地理業務"));
    const project = manager.listProjects()[0];
    window.history.pushState({}, "", modulePath(project.projectId, "terrain"));
    const root = await render(<NextApp />);
    expect(document.querySelector('[data-testid="nav-legacy"]')).toBeNull();
    cleanup(root);
  });

  it("back button returns to the project top", async () => {
    const manager = getProjectManager();
    manager.importProject(createEmptyProject("現況地理業務"));
    const project = manager.listProjects()[0];
    window.history.pushState({}, "", modulePath(project.projectId, "terrain"));
    const root = await render(<NextApp />);
    act(() => {
      (document.querySelector('[data-testid="site-context-back"]') as HTMLButtonElement).click();
    });
    expect(document.querySelector('[data-testid="project-top-page"]')).toBeTruthy();
    cleanup(root);
  });

  it("next-road button navigates to the road module", async () => {
    const manager = getProjectManager();
    manager.importProject(createEmptyProject("現況地理業務"));
    const project = manager.listProjects()[0];
    window.history.pushState({}, "", modulePath(project.projectId, "terrain"));
    const root = await render(<NextApp />);
    act(() => {
      (document.querySelector('[data-testid="site-context-next-road"]') as HTMLButtonElement).click();
    });
    expect(document.querySelector('[data-testid="road-module-page"]')).toBeTruthy();
    cleanup(root);
  });
});