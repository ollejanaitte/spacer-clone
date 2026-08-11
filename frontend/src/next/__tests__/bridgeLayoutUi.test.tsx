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
  const terrainDoc = {
    ...createEmptyTerrainDocument(),
    source: { sourceType: "csv" as const, sourceName: "mtn.csv", importedAt: null },
    surfaceReference: "assets/terrain/reference.bin",
  };
  writeTerrainDocument(manager, projectId, terrainDoc);
  writeExistingConditions(manager, projectId, { schemaVersion: "0.1.0", entities: [...mountain.existing] });
}

beforeEach(() => {
  resetProjectManagerForTest();
});

afterEach(() => {
  document.body.innerHTML = "";
  window.history.pushState({}, "", "/app");
  resetProjectManagerForTest();
});

describe("Phase 4-02 Bridge Layout UI", () => {
  it("renders the bridge layout module page", async () => {
    const manager = getProjectManager();
    manager.importProject(createEmptyProject("橋梁UI業務"));
    const project = manager.listProjects()[0];
    seedSupportingModules(manager, project.projectId);
    window.history.pushState({}, "", modulePath(project.projectId, "bridgeLayout"));
    const root = await render(<NextApp />);
    expect(document.querySelector('[data-testid="bridge-layout-module-page"]')).toBeTruthy();
    expect(document.querySelector('[data-testid="bridge-layout-module-title"]')).toBeTruthy();
    expect(document.querySelector('[data-testid="bridge-start-station"]')).toBeTruthy();
    expect(document.querySelector('[data-testid="bridge-end-station"]')).toBeTruthy();
    expect(document.querySelector('[data-testid="bridge-length"]')).toBeTruthy();
    expect(document.querySelector('[data-testid="bridge-layout-show-3d"]')).toBeTruthy();
    cleanup(root);
  });

  it("auto-computes bridgeLength and generates A1/A2 candidates when stations are typed", async () => {
    const manager = getProjectManager();
    manager.importProject(createEmptyProject("橋梁UI業務"));
    const project = manager.listProjects()[0];
    seedSupportingModules(manager, project.projectId);
    window.history.pushState({}, "", modulePath(project.projectId, "bridgeLayout"));
    const root = await render(<NextApp />);

    const start = document.querySelector('[data-testid="bridge-start-station"]') as HTMLInputElement;
    const end = document.querySelector('[data-testid="bridge-end-station"]') as HTMLInputElement;
    act(() => {
      const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value")!.set!;
      setter.call(start, "100");
      start.dispatchEvent(new Event("input", { bubbles: true }));
    });
    act(() => {
      const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value")!.set!;
      setter.call(end, "450");
      end.dispatchEvent(new Event("input", { bubbles: true }));
    });

    const length = document.querySelector('[data-testid="bridge-length"]') as HTMLInputElement;
    expect(length.value).toBe("350.000");
    expect(document.querySelector('[data-testid="bridge-A1-candidate"]')).toBeTruthy();
    expect(document.querySelector('[data-testid="bridge-A2-candidate"]')).toBeTruthy();
    cleanup(root);
  });

  it("saves the bridge range and A1/A2 placement via Auto Save and reads it back", async () => {
    const manager = getProjectManager();
    manager.importProject(createEmptyProject("橋梁UI業務"));
    const project = manager.listProjects()[0];
    seedSupportingModules(manager, project.projectId);
    window.history.pushState({}, "", modulePath(project.projectId, "bridgeLayout"));
    const root = await render(<NextApp />);

    const nameInput = document.querySelector('[data-testid="bridge-name-input"]') as HTMLInputElement;
    act(() => {
      const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value")!.set!;
      setter.call(nameInput, "旭高架橋");
      nameInput.dispatchEvent(new Event("input", { bubbles: true }));
    });
    const start = document.querySelector('[data-testid="bridge-start-station"]') as HTMLInputElement;
    const end = document.querySelector('[data-testid="bridge-end-station"]') as HTMLInputElement;
    act(() => {
      const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value")!.set!;
      setter.call(start, "100");
      start.dispatchEvent(new Event("input", { bubbles: true }));
    });
    act(() => {
      const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value")!.set!;
      setter.call(end, "450");
      end.dispatchEvent(new Event("input", { bubbles: true }));
    });

    const save = document.querySelector('[data-testid="bridge-layout-save-button"]') as HTMLButtonElement;
    expect(save.disabled).toBe(false);
    act(() => save.click());

    const doc = readBridgeLayoutDocument(manager, project.projectId);
    expect(doc).toBeTruthy();
    expect(doc?.name).toBe("旭高架橋");
    expect(doc?.bridgeRange.startStation).toBe(100);
    expect(doc?.bridgeRange.endStation).toBe(450);
    expect(doc?.bridgeRange.bridgeLength).toBe(350);
    expect(doc?.abutments.A1.station).toBe(100);
    expect(doc?.abutments.A2.station).toBe(450);
    expect(doc?.abutments.A1.placement).toBeTruthy();
    expect(doc?.abutments.A1.placement?.domainX).toBeGreaterThan(99);
    expect(doc?.abutments.A1.placement?.terrainElevation).not.toBeNull();
    await manager.flushPendingSaves();
    cleanup(root);
  });

  it("fails closed when the road module has no alignment (save disabled + warning)", async () => {
    const manager = getProjectManager();
    manager.importProject(createEmptyProject("橋梁UI業務"));
    const project = manager.listProjects()[0];
    window.history.pushState({}, "", modulePath(project.projectId, "bridgeLayout"));
    const root = await render(<NextApp />);
    expect(document.querySelector('[data-testid="bridge-layout-road-warning"]')).toBeTruthy();
    const start = document.querySelector('[data-testid="bridge-start-station"]') as HTMLInputElement;
    const end = document.querySelector('[data-testid="bridge-end-station"]') as HTMLInputElement;
    act(() => {
      const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value")!.set!;
      setter.call(start, "100");
      start.dispatchEvent(new Event("input", { bubbles: true }));
    });
    act(() => {
      const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value")!.set!;
      setter.call(end, "450");
      end.dispatchEvent(new Event("input", { bubbles: true }));
    });
    const save = document.querySelector('[data-testid="bridge-layout-save-button"]') as HTMLButtonElement;
    expect(save.disabled).toBe(true);
    expect(readBridgeLayoutDocument(manager, project.projectId)).toBeUndefined();
    cleanup(root);
  });

  it("toggles the 3D viewer block", async () => {
    const manager = getProjectManager();
    manager.importProject(createEmptyProject("橋梁UI業務"));
    const project = manager.listProjects()[0];
    seedSupportingModules(manager, project.projectId);
    window.history.pushState({}, "", modulePath(project.projectId, "bridgeLayout"));
    const root = await render(<NextApp />);
    expect(document.querySelector('[data-testid="bridge-layout-viewer-block"]')).toBeNull();
    const toggle = document.querySelector('[data-testid="bridge-layout-show-3d"]') as HTMLButtonElement;
    act(() => toggle.click());
    expect(document.querySelector('[data-testid="bridge-layout-viewer-block"]')).toBeTruthy();
    act(() => toggle.click());
    expect(document.querySelector('[data-testid="bridge-layout-viewer-block"]')).toBeNull();
    cleanup(root);
  });
});
