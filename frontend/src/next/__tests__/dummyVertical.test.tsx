// @vitest-environment jsdom
import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import { act, type ReactNode } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextApp } from "../NextApp";
import { modulePath } from "../routes";
import { NodeFileSystemGateway } from "../persistence/nodeFileSystemGateway";
import { FilesystemProjectPersistence } from "../persistence/filesystemProjectPersistence";
import { setPersistenceForTest, resetProjectManagerForTest, getProjectManager } from "../project/projectManagerInstance";
import { applyBusinessMetadata } from "../project/businessMetadata";
import { createEmptyProject } from "../project/projectDataCore";
import { buildProjectPackage } from "../persistence/package/projectPackageBuilder";
import { inspectPackageContent, extractProjectFromPackage } from "../persistence/package/projectPackageImporter";

let tempDir: string;

beforeEach(async () => {
  tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "phase1-dummy-"));
  resetProjectManagerForTest();
});

afterEach(async () => {
  resetProjectManagerForTest();
  await fs.rm(tempDir, { recursive: true, force: true });
  vi.restoreAllMocks();
});

function createPersistence() {
  return new FilesystemProjectPersistence(new NodeFileSystemGateway(), {
    rootDir: path.join(tempDir, "projects"),
  });
}

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

function changeValue(testId: string, value: string) {
  const el = document.querySelector(`[data-testid="${testId}"]`) as HTMLInputElement;
  const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value")!.set;
  act(() => {
    setter!.call(el, value);
    el.dispatchEvent(new Event("input", { bubbles: true }));
  });
}

function click(testId: string) {
  act(() => {
    (document.querySelector(`[data-testid="${testId}"]`) as HTMLElement).click();
  });
}

describe("Phase 1-07 Dummy Module vertical slice (real filesystem)", () => {
  it("open dummy -> change -> validate -> auto-save -> restart -> restore -> export/import", async () => {
    const persistence = createPersistence();
    setPersistenceForTest(persistence);
    const manager = getProjectManager();

    // create project
    const project = applyBusinessMetadata(createEmptyProject("Dummy縦断業務"), {
      businessNumber: "DUMMY-001",
      designStage: "road-preliminary",
    });
    expect(manager.importProject(project)).toBe(true);
    await manager.flushPendingSaves();

    // open Dummy module, change values, save
    window.history.pushState({}, "", modulePath(project.projectId, "road"));
    let root = await render(<NextApp />);
    expect(document.querySelector('[data-testid="dummy-module-page"]')).toBeTruthy();
    changeValue("dummy-length-input", "120");
    changeValue("dummy-label-input", "道路延長120m");
    click("dummy-save-button");
    await manager.flushPendingSaves();
    cleanup(root);

    // verify in-memory module data
    const stored = manager.getProject(project.projectId)?.modules?.road as {
      data?: { length?: number; label?: string };
      state?: { status?: string };
    };
    expect(stored?.data?.length).toBe(120);
    expect(stored?.data?.label).toBe("道路延長120m");

    // app restart: fresh manager on same filesystem
    resetProjectManagerForTest();
    const persistence2 = createPersistence();
    setPersistenceForTest(persistence2);
    const manager2 = getProjectManager();
    const restore = await manager2.restoreFromPersistence();
    expect(restore.restored).toBe(1);

    // module data restored
    const restoredModule = manager2.getProject(project.projectId)?.modules?.road as {
      data?: { length?: number; label?: string };
    };
    expect(restoredModule?.data?.length).toBe(120);
    expect(restoredModule?.data?.label).toBe("道路延長120m");

    // export .spacerproj
    const built = buildProjectPackage(manager2.getProject(project.projectId)!);
    if (!built.ok) throw new Error("build failed");

    // import into a third environment (PC-B equivalent)
    resetProjectManagerForTest();
    const persistence3 = createPersistence();
    setPersistenceForTest(persistence3);
    const manager3 = getProjectManager();
    const inspected = inspectPackageContent("pcb.spacerproj", built.json);
    expect(inspected.ok).toBe(true);
    if (!inspected.ok) return;
    const imported = extractProjectFromPackage(inspected.pkg!);
    if (!imported) throw new Error("extract failed");
    expect(manager3.importProject(imported)).toBe(true);
    await manager3.flushPendingSaves();

    const importedModule = manager3.getProject(project.projectId)?.modules?.road as {
      data?: { length?: number; label?: string };
    };
    expect(importedModule?.data?.length).toBe(120);
    expect(importedModule?.data?.label).toBe("道路延長120m");

    // open Project top in the imported environment and verify module entry
    window.history.pushState({}, "", `/app/projects/${project.projectId}`);
    root = await render(<NextApp />);
    expect(document.querySelector('[data-testid="project-modules"]')).toBeTruthy();
    expect(document.querySelector('[data-testid="module-entry-road"]')).toBeTruthy();
    cleanup(root);
  });
});
