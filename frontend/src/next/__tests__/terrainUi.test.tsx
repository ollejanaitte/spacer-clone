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

describe("Phase 3 Terrain UI", () => {
  it("renders terrain module page with reference mountain viewer toggle", async () => {
    const manager = getProjectManager();
    manager.importProject(createEmptyProject("地形UI業務"));
    const project = manager.listProjects()[0];
    window.history.pushState({}, "", modulePath(project.projectId, "terrain"));
    const root = await render(<NextApp />);
    expect(document.querySelector('[data-testid="terrain-module-page"]')).toBeTruthy();
    expect(document.querySelector('[data-testid="terrain-show-sample"]')).toBeTruthy();
    expect(document.querySelector('[data-testid="terrain-module-status"]')).toBeTruthy();
    cleanup(root);
  });

  it("shows no legacy route", async () => {
    const manager = getProjectManager();
    manager.importProject(createEmptyProject("地形UI業務"));
    const project = manager.listProjects()[0];
    window.history.pushState({}, "", modulePath(project.projectId, "terrain"));
    const root = await render(<NextApp />);
    expect(document.querySelector('[data-testid="nav-legacy"]')).toBeNull();
    cleanup(root);
  });

  it("toggles the large reference mountain viewer block", async () => {
    const manager = getProjectManager();
    manager.importProject(createEmptyProject("地形UI業務"));
    const project = manager.listProjects()[0];
    window.history.pushState({}, "", modulePath(project.projectId, "terrain"));
    const root = await render(<NextApp />);
    expect(document.querySelector('[data-testid="terrain-viewer-block"]')).toBeNull();
    const toggle = document.querySelector('[data-testid="terrain-show-sample"]') as HTMLButtonElement;
    act(() => toggle.click());
    expect(document.querySelector('[data-testid="terrain-viewer-block"]')).toBeTruthy();
    act(() => toggle.click());
    expect(document.querySelector('[data-testid="terrain-viewer-block"]')).toBeNull();
    cleanup(root);
  });

  it("toggles the integrated terrain+road+existing viewer block", async () => {
    const manager = getProjectManager();
    manager.importProject(createEmptyProject("地形UI業務"));
    const project = manager.listProjects()[0];
    window.history.pushState({}, "", modulePath(project.projectId, "terrain"));
    const root = await render(<NextApp />);
    expect(document.querySelector('[data-testid="integrated-viewer-block"]')).toBeNull();
    const toggle = document.querySelector('[data-testid="terrain-show-integrated"]') as HTMLButtonElement;
    act(() => toggle.click());
    expect(document.querySelector('[data-testid="integrated-viewer-block"]')).toBeTruthy();
    act(() => toggle.click());
    expect(document.querySelector('[data-testid="integrated-viewer-block"]')).toBeNull();
    cleanup(root);
  });
});
