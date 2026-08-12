// @vitest-environment jsdom
import { act, type ReactNode } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { NextApp } from "../NextApp";
import { modulePath } from "../routes";
import { getProjectManager, resetProjectManagerForTest } from "../project/projectManagerInstance";
import { createEmptyProject } from "../project/projectDataCore";
import { writeRoadInputs } from "../modules/roadModuleAdapter";
import { writeTerrainDocument } from "../modules/terrainModuleAdapter";
import { createEmptyTerrainDocument } from "../modules/terrainModule";
import { writeExistingConditions } from "../modules/existingConditionsAdapter";
import { createReferenceMountain } from "../modules/terrain/referenceMountain";
import { readBridgeLayoutDocument } from "../modules/bridgeLayoutModuleAdapter";

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

function seedSupportingModules(manager = getProjectManager(), projectId: string) {
  const mountain = createReferenceMountain();
  const roadOk = writeRoadInputs(manager, projectId, {
    label: "山岳道路",
    horizontal: mountain.roadHorizontal,
    vertical: mountain.roadVertical,
    crossSections: [mountain.roadCrossSection],
  });
  expect(roadOk.ok).toBe(true);
  writeTerrainDocument(manager, projectId, {
    ...createEmptyTerrainDocument(),
    source: { sourceType: "csv" as const, sourceName: "mtn.csv", importedAt: null },
    surfaceReference: "assets/terrain/reference.bin",
  });
  writeExistingConditions(manager, projectId, { schemaVersion: "0.1.0", entities: [...mountain.existing] });
}

function setInputValue(input: HTMLInputElement, value: string) {
  act(() => {
    const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value")!.set!;
    setter.call(input, value);
    input.dispatchEvent(new Event("input", { bubbles: true }));
  });
}

async function setupPage() {
  const manager = getProjectManager();
  manager.importProject(createEmptyProject("CompletionGateUI"));
  const project = manager.listProjects()[0];
  seedSupportingModules(manager, project.projectId);
  window.history.pushState({}, "", modulePath(project.projectId, "bridgeLayout"));
  const root = await render(<NextApp />);
  return { manager, project, root };
}

function configureValidBridge() {
  const start = document.querySelector('[data-testid="bridge-start-station"]') as HTMLInputElement;
  const end = document.querySelector('[data-testid="bridge-end-station"]') as HTMLInputElement;
  setInputValue(start, "100");
  setInputValue(end, "700");
  const add = document.querySelector('[data-testid="bridge-pier-add"]') as HTMLButtonElement;
  act(() => add.click());
  const p1 = document.querySelector('[data-testid="bridge-pier-station-P1"]') as HTMLInputElement;
  setInputValue(p1, "300");
  act(() => add.click());
  const p2 = document.querySelector('[data-testid="bridge-pier-station-P2"]') as HTMLInputElement;
  setInputValue(p2, "500");
}

beforeEach(() => {
  resetProjectManagerForTest();
});

afterEach(() => {
  document.body.innerHTML = "";
  window.history.pushState({}, "", "/app");
  resetProjectManagerForTest();
});

describe("Phase 4-04 Completion Gate UI", () => {
  it("shows Support/Span Handoff READY and Final Validation OK after save", async () => {
    const { root } = await setupPage();
    configureValidBridge();
    // 未保存時は fail-closed（bridgeId未設定）で Final NG / 保存後に OK
    const save = document.querySelector('[data-testid="bridge-layout-save-button"]') as HTMLButtonElement;
    expect(save.disabled).toBe(false);
    act(() => save.click());
    const supportReady = document.querySelector('[data-testid="bridge-support-handoff-ready"]')?.textContent;
    const spanReady = document.querySelector('[data-testid="bridge-span-handoff-ready"]')?.textContent;
    expect(supportReady).toBe("READY");
    expect(spanReady).toBe("READY");
    const finalOk = document.querySelector('[data-testid="bridge-final-validation-ok"]')?.textContent;
    expect(finalOk).toBe("OK");
    const pageText = document.querySelector('[data-testid="bridge-final-validation"]')?.textContent;
    expect(pageText).toContain("Phase 5 readiness: READY");
    expect(pageText).toContain("Phase 6 readiness: READY");
    cleanup(root);
  });

  it("shows ERROR when the range is invalid (no road data)", async () => {
    const manager = getProjectManager();
    manager.importProject(createEmptyProject("CompletionGateNG"));
    const project = manager.listProjects()[0];
    // no road seeded
    window.history.pushState({}, "", modulePath(project.projectId, "bridgeLayout"));
    const root = await render(<NextApp />);
    const supportReady = document.querySelector('[data-testid="bridge-support-handoff-ready"]')?.textContent;
    expect(supportReady).toBe("ERROR");
    const finalOk = document.querySelector('[data-testid="bridge-final-validation-ok"]')?.textContent;
    expect(finalOk).toBe("NG");
    cleanup(root);
  });

  it("saves and the Completion Gate remains READY after save", async () => {
    const { manager, project, root } = await setupPage();
    configureValidBridge();
    const save = document.querySelector('[data-testid="bridge-layout-save-button"]') as HTMLButtonElement;
    expect(save.disabled).toBe(false);
    act(() => save.click());
    const doc = readBridgeLayoutDocument(manager, project.projectId);
    expect(doc).toBeTruthy();
    expect(doc?.piers).toHaveLength(2);
    const supportReady = document.querySelector('[data-testid="bridge-support-handoff-ready"]')?.textContent;
    const spanReady = document.querySelector('[data-testid="bridge-span-handoff-ready"]')?.textContent;
    expect(supportReady).toBe("READY");
    expect(spanReady).toBe("READY");
    await manager.flushPendingSaves();
    cleanup(root);
  });

  it("3D toggle still renders with piers and spans", async () => {
    const { root } = await setupPage();
    configureValidBridge();
    const toggle = document.querySelector('[data-testid="bridge-layout-show-3d"]') as HTMLButtonElement;
    act(() => toggle.click());
    expect(document.querySelector('[data-testid="bridge-layout-viewer-block"]')).toBeTruthy();
    cleanup(root);
  });
});
