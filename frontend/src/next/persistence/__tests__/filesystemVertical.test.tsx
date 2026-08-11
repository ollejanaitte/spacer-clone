// @vitest-environment jsdom
import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import { act, type ReactNode } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { NextApp } from "../../NextApp";
import { NEXT_HOME_PATH, NEXT_BUSINESS_LIST_PATH } from "../../routes";
import { NodeFileSystemGateway } from "../nodeFileSystemGateway";
import { FilesystemProjectPersistence } from "../filesystemProjectPersistence";
import { setPersistenceForTest, resetProjectManagerForTest, getProjectManager } from "../../project/projectManagerInstance";

let tempDir: string;

beforeEach(async () => {
  tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "r1-04-e2e-"));
  resetProjectManagerForTest();
});

afterEach(async () => {
  resetProjectManagerForTest();
  await fs.rm(tempDir, { recursive: true, force: true });
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

function click(testId: string) {
  const el = document.querySelector(`[data-testid="${testId}"]`) as HTMLElement;
  act(() => {
    el.click();
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

describe("R1-04 filesystem vertical: create -> save -> restart -> restore -> open", () => {
  it("end-to-end persistence through the UI with a real filesystem", async () => {
    const persistence = createPersistence();
    setPersistenceForTest(persistence);

    // 1. Home -> business list
    window.history.pushState({}, "", NEXT_HOME_PATH);
    let root = await render(<NextApp />);
    expect(document.querySelector('[data-testid="home-page"]')).toBeTruthy();
    click("home-go-business");
    expect(document.querySelector('[data-testid="business-list-empty"]')).toBeTruthy();
    cleanup(root);

    // 2. New project
    window.history.pushState({}, "", "/app/business/new");
    root = await render(<NextApp />);
    changeValue("form-business-number", "E2E-001");
    changeValue("form-name", "縦断永続化業務");
    click("form-submit");
    expect(document.querySelector('[data-testid="business-table"]')).toBeTruthy();
    await getProjectManager().flushPendingSaves();
    cleanup(root);

    // 3. Edit the project
    const project = getProjectManager().listProjects()[0];
    window.history.pushState({}, "", `/app/business/${project.projectId}/edit`);
    root = await render(<NextApp />);
    changeValue("form-name", "縦断永続化業務（改訂）");
    click("form-submit");
    await getProjectManager().flushPendingSaves();
    cleanup(root);

    // 4. Verify persisted files on disk
    const projectJson = path.join(tempDir, "projects", project.projectId, "project.json");
    const jsonContent = JSON.parse(await fs.readFile(projectJson, "utf8"));
    expect(jsonContent.name).toBe("縦断永続化業務（改訂）");
    expect(jsonContent.metadata.businessNumber).toBe("E2E-001");
    const backupDir = path.join(tempDir, "projects", project.projectId, ".backup");
    const backups = await fs.readdir(backupDir);
    expect(backups.length).toBeGreaterThanOrEqual(1);

    // 5. App restart (fresh manager + persistence on same root)
    resetProjectManagerForTest();
    const persistence2 = createPersistence();
    setPersistenceForTest(persistence2);
    const restore = await getProjectManager().restoreFromPersistence();
    expect(restore.restored).toBe(1);

    // 6. Business list rebuilt after restart
    window.history.pushState({}, "", NEXT_BUSINESS_LIST_PATH);
    root = await render(<NextApp />);
    expect(document.querySelector('[data-testid="business-table"]')).toBeTruthy();
    expect(document.querySelector('[data-testid="business-name"]')?.textContent).toBe("縦断永続化業務（改訂）");
    expect(document.querySelector('[data-testid="business-number"]')?.textContent).toBe("E2E-001");
    cleanup(root);

    // 7. Open project top, verify restored content + backups listed
    window.history.pushState({}, "", `/app/projects/${project.projectId}`);
    root = await render(<NextApp />);
    expect(document.querySelector('[data-testid="project-top-page"]')).toBeTruthy();
    expect(document.querySelector('[data-testid="project-top-name"]')?.textContent).toBe("縦断永続化業務（改訂）");
    expect(document.querySelector('[data-testid="project-top-number"]')?.textContent).toBe("E2E-001");
    expect(document.querySelector('[data-testid="project-top-sections"]')).toBeTruthy();
    cleanup(root);
  });
});
