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

describe("Project top module entries (Phase 1-06)", () => {
  it("renders 8 module entries with status from the registry", async () => {
    const manager = getProjectManager();
    manager.importProject(createEmptyProject("モジュール業務"));
    const project = manager.listProjects()[0];
    window.history.pushState({}, "", `/app/projects/${project.projectId}`);
    const root = await render(<NextApp />);
    expect(document.querySelector('[data-testid="project-modules"]')).toBeTruthy();
    expect(document.querySelectorAll('[data-testid^="module-entry-"]').length).toBe(8);
    for (const id of ["road", "terrain", "bridgeLayout", "substructure", "superstructure", "analysis", "cim", "deliverables"]) {
      expect(document.querySelector(`[data-testid="module-entry-${id}"]`)).toBeTruthy();
      expect(document.querySelector(`[data-testid="module-status-${id}"]`)?.textContent).toBe("未着手");
    }
    cleanup(root);
  });

  it("opens a module shell from the project top", async () => {
    const manager = getProjectManager();
    manager.importProject(createEmptyProject("モジュール業務"));
    const project = manager.listProjects()[0];
    window.history.pushState({}, "", `/app/projects/${project.projectId}`);
    const root = await render(<NextApp />);
    act(() => {
      (document.querySelector('[data-testid="module-open-cim"]') as HTMLElement).click();
    });
    expect(document.querySelector('[data-testid="module-shell-page"]')).toBeTruthy();
    expect(document.querySelector('[data-testid="module-shell-title"]')?.textContent).toBe("CIM / 統合3D");
    expect(document.querySelector('[data-testid="module-shell-status"]')?.textContent).toBe("未着手");
    cleanup(root);
  });

  it("direct module path renders the shell", async () => {
    const manager = getProjectManager();
    manager.importProject(createEmptyProject("モジュール業務"));
    const project = manager.listProjects()[0];
    window.history.pushState({}, "", modulePath(project.projectId, "cim"));
    const root = await render(<NextApp />);
    expect(document.querySelector('[data-testid="module-shell-page"]')).toBeTruthy();
    expect(document.querySelector('[data-testid="module-shell-title"]')?.textContent).toBe("CIM / 統合3D");
    cleanup(root);
  });

  it("road module opens the Road Module page (Phase 2-A)", async () => {
    const manager = getProjectManager();
    manager.importProject(createEmptyProject("モジュール業務"));
    const project = manager.listProjects()[0];
    window.history.pushState({}, "", modulePath(project.projectId, "road"));
    const root = await render(<NextApp />);
    expect(document.querySelector('[data-testid="road-module-page"]')).toBeTruthy();
    cleanup(root);
  });

  it("unknown module id renders an unknown-module message", async () => {
    const manager = getProjectManager();
    manager.importProject(createEmptyProject("モジュール業務"));
    const project = manager.listProjects()[0];
    window.history.pushState({}, "", modulePath(project.projectId, "bogus"));
    const root = await render(<NextApp />);
    expect(document.querySelector('[data-testid="module-unknown"]')).toBeTruthy();
    cleanup(root);
  });
});
