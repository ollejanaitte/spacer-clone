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

function setInputValue(input: HTMLInputElement, value: string) {
  act(() => {
    const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value")!.set!;
    setter.call(input, value);
    input.dispatchEvent(new Event("input", { bubbles: true }));
  });
}

async function setupPage() {
  const manager = getProjectManager();
  manager.importProject(createEmptyProject("PierUI業務"));
  const project = manager.listProjects()[0];
  seedSupportingModules(manager, project.projectId);
  window.history.pushState({}, "", modulePath(project.projectId, "bridgeLayout"));
  const root = await render(<NextApp />);
  return { manager, project, root };
}

beforeEach(() => {
  resetProjectManagerForTest();
});

afterEach(() => {
  document.body.innerHTML = "";
  window.history.pushState({}, "", "/app");
  resetProjectManagerForTest();
});

describe("Phase 4-03 Bridge Layout pier UI", () => {
  it("shows supports, pier editor, span list and summary", async () => {
    const { root } = await setupPage();
    expect(document.querySelector('[data-testid="bridge-layout-module-page"]')).toBeTruthy();
    expect(document.querySelector('[data-testid="bridge-pier-edit"]')).toBeTruthy();
    expect(document.querySelector('[data-testid="bridge-pier-add"]')).toBeTruthy();
    expect(document.querySelector('[data-testid="bridge-span-list"]')).toBeTruthy();
    expect(document.querySelector('[data-testid="bridge-pier-count"]')?.textContent).toBe("0");
    expect(document.querySelector('[data-testid="bridge-span-count"]')?.textContent).toBe("1");
    cleanup(root);
  });

  it("adds a pier, edits station/skew, regenerates spans", async () => {
    const { root } = await setupPage();
    const start = document.querySelector('[data-testid="bridge-start-station"]') as HTMLInputElement;
    const end = document.querySelector('[data-testid="bridge-end-station"]') as HTMLInputElement;
    setInputValue(start, "100");
    setInputValue(end, "700");

    const addBtn = document.querySelector('[data-testid="bridge-pier-add"]') as HTMLButtonElement;
    act(() => addBtn.click());
    expect(document.querySelector('[data-testid="bridge-pier-row-P1"]')).toBeTruthy();
    expect(document.querySelector('[data-testid="bridge-pier-count"]')?.textContent).toBe("1");
    // single pier -> 2 spans
    expect(document.querySelector('[data-testid="bridge-span-count"]')?.textContent).toBe("2");

    // edit station
    const stationInput = document.querySelector('[data-testid="bridge-pier-station-P1"]') as HTMLInputElement;
    setInputValue(stationInput, "300");
    // edit skew (user-specified, CCW-positive)
    const skewInput = document.querySelector('[data-testid="bridge-pier-skew-P1"]') as HTMLInputElement;
    setInputValue(skewInput, "1.5707963267948966");

    // add second pier
    act(() => addBtn.click());
    expect(document.querySelector('[data-testid="bridge-pier-row-P2"]')).toBeTruthy();
    expect(document.querySelector('[data-testid="bridge-span-count"]')?.textContent).toBe("3");
    cleanup(root);
  });

  it("removes a pier and regenerates spans", async () => {
    const { root } = await setupPage();
    const start = document.querySelector('[data-testid="bridge-start-station"]') as HTMLInputElement;
    const end = document.querySelector('[data-testid="bridge-end-station"]') as HTMLInputElement;
    setInputValue(start, "100");
    setInputValue(end, "700");

    const addBtn = document.querySelector('[data-testid="bridge-pier-add"]') as HTMLButtonElement;
    act(() => addBtn.click());
    act(() => addBtn.click());
    expect(document.querySelector('[data-testid="bridge-span-count"]')?.textContent).toBe("3");

    const removeP1 = document.querySelector('[data-testid="bridge-pier-remove-P1"]') as HTMLButtonElement;
    act(() => removeP1.click());
    expect(document.querySelector('[data-testid="bridge-pier-row-P1"]')).toBeNull();
    expect(document.querySelector('[data-testid="bridge-span-count"]')?.textContent).toBe("2");
    cleanup(root);
  });

  it("saves piers with placement, skew and spans; reads back the document", async () => {
    const { manager, project, root } = await setupPage();
    const start = document.querySelector('[data-testid="bridge-start-station"]') as HTMLInputElement;
    const end = document.querySelector('[data-testid="bridge-end-station"]') as HTMLInputElement;
    setInputValue(start, "100");
    setInputValue(end, "700");

    const addBtn = document.querySelector('[data-testid="bridge-pier-add"]') as HTMLButtonElement;
    act(() => addBtn.click());
    const stationInput = document.querySelector('[data-testid="bridge-pier-station-P1"]') as HTMLInputElement;
    setInputValue(stationInput, "300");
    const skewInput = document.querySelector('[data-testid="bridge-pier-skew-P1"]') as HTMLInputElement;
    setInputValue(skewInput, "0.5");

    const saveBtn = document.querySelector('[data-testid="bridge-layout-save-button"]') as HTMLButtonElement;
    expect(saveBtn.disabled).toBe(false);
    act(() => saveBtn.click());

    const doc = readBridgeLayoutDocument(manager, project.projectId);
    expect(doc).toBeTruthy();
    expect(doc?.piers).toHaveLength(1);
    expect(doc?.piers[0].supportId).toBe("P1");
    expect(doc?.piers[0].station).toBe(300);
    expect(doc?.piers[0].skewAngleRad).toBeCloseTo(0.5, 6);
    expect(doc?.piers[0].skewSource).toBe("user");
    expect(doc?.piers[0].placement?.domainX).toBeGreaterThan(0);
    expect(doc?.piers[0].placement?.terrainElevation).not.toBeNull();
    expect(doc?.spans).toHaveLength(2);
    expect(doc?.spans[0].length).toBeCloseTo(200, 6);
    expect(doc?.spans[1].length).toBeCloseTo(400, 6);
    await manager.flushPendingSaves();
    cleanup(root);
  });

  it("surfaces pier ordering validation in the UI", async () => {
    const { root } = await setupPage();
    const start = document.querySelector('[data-testid="bridge-start-station"]') as HTMLInputElement;
    const end = document.querySelector('[data-testid="bridge-end-station"]') as HTMLInputElement;
    setInputValue(start, "100");
    setInputValue(end, "700");

    const addBtn = document.querySelector('[data-testid="bridge-pier-add"]') as HTMLButtonElement;
    act(() => addBtn.click());
    act(() => addBtn.click());
    // set P1 later than P2 -> ordering violation
    const p1 = document.querySelector('[data-testid="bridge-pier-station-P1"]') as HTMLInputElement;
    setInputValue(p1, "600");
    const p2 = document.querySelector('[data-testid="bridge-pier-station-P2"]') as HTMLInputElement;
    setInputValue(p2, "300");

    const issues = [...document.querySelectorAll('[data-testid="bridge-layout-issue"]')];
    expect(issues.some((el) => el.textContent?.includes("station order violation"))).toBe(true);
    const saveBtn = document.querySelector('[data-testid="bridge-layout-save-button"]') as HTMLButtonElement;
    expect(saveBtn.disabled).toBe(true);
    cleanup(root);
  });

  it("3D toggle renders with pier markers", async () => {
    const { root } = await setupPage();
    const start = document.querySelector('[data-testid="bridge-start-station"]') as HTMLInputElement;
    const end = document.querySelector('[data-testid="bridge-end-station"]') as HTMLInputElement;
    setInputValue(start, "100");
    setInputValue(end, "700");
    const addBtn = document.querySelector('[data-testid="bridge-pier-add"]') as HTMLButtonElement;
    act(() => addBtn.click());
    const toggle = document.querySelector('[data-testid="bridge-layout-show-3d"]') as HTMLButtonElement;
    act(() => toggle.click());
    expect(document.querySelector('[data-testid="bridge-layout-viewer-block"]')).toBeTruthy();
    cleanup(root);
  });
});
