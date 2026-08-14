// @vitest-environment jsdom
import { act, type ReactNode } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { getProjectManager, resetProjectManagerForTest } from "../../../project/projectManagerInstance";
import { createEmptyProject } from "../../../project/projectDataCore";
import { applyBusinessMetadata } from "../../../project/businessMetadata";
import { SubstructureRescuePanel } from "../../../components/SubstructureRescuePanel";
import { readSubstructureDocument, writeSubstructureDocument } from "../../substructureModuleAdapter";
import { buildSubstructureDocument } from "../substructureDocumentDomain";

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

beforeEach(() => {
  resetProjectManagerForTest();
});

afterEach(() => {
  document.body.innerHTML = "";
  resetProjectManagerForTest();
});

function setupProject(): string {
  const manager = getProjectManager();
  const project = applyBusinessMetadata(createEmptyProject("下部工Rescue"), {
    businessNumber: "SUB-R-1",
    designStage: "bridge-detailed",
  });
  manager.importProject(project);
  const pid = manager.listProjects()[0]!.projectId;
  const built = buildSubstructureDocument({
    projectId: pid,
    bridgeLayoutReference: { bridgeId: "BR-1", moduleId: "bridgeLayout", documentVersion: "0.1.0", layoutFingerprint: "fp" },
    superstructureReference: { bridgeId: "BR-1", moduleId: "superstructure", documentVersion: "0.1.0", superstructureDocumentId: "SS-1", handoffSchemaVersion: "1.0.0" },
    roadReference: { moduleId: "road", alignmentId: "ROAD-1", stationReferenceId: null, coordinatePolicyId: null },
    supports: [
      {
        supportId: "P1",
        supportType: "pier",
        placement: { source: "liner", alignmentId: "ROAD-1", station: 30, offset: 0 },
        skewRad: 0,
        bearingSeats: [],
        pier: {
          id: "p1",
          formType: "single_column_rect",
          column: { id: "c1", width: 2.0, depth: 2.0, height: 8.0 },
          footing: { id: "ft-p1", length: 6.0, width: 6.0, thickness: 2.0, topElevation: 99.0 },
          pileGroup: { id: "pg1", pileType: "bored_pile", diameter: 1.2, length: 18, pileCount: 4, spacing: { x: 3.6, y: 3.6 } },
        },
      },
    ],
  });
  expect(built.ok).toBe(true);
  if (built.ok) {
    writeSubstructureDocument(manager, pid, built.document);
  }
  return pid;
}

describe("SubstructureRescuePanel (Phase 9-03 WP-E/F/G)", () => {
  it("lists supports and edits a pier column dimension canonically", async () => {
    const pid = setupProject();
    const manager = getProjectManager();
    const root = await render(<SubstructureRescuePanel projectId={pid} />);

    // select P1
    const radio = document.querySelector('[data-testid="sub-support-P1"]') as HTMLInputElement;
    expect(radio).toBeTruthy();
    await act(async () => {
      radio.click();
    });

    // change 柱幅 to 3
    const widthInput = document.querySelector('[data-testid="sub-field-柱幅"]') as HTMLInputElement;
    expect(widthInput).toBeTruthy();
    await act(async () => {
      const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value")?.set;
      setter?.call(widthInput, "3");
      widthInput.dispatchEvent(new Event("input", { bubbles: true }));
    });

    const doc = readSubstructureDocument(manager, pid);
    expect(doc).toBeDefined();
    if (doc) {
      expect(doc.supports[0]?.pier?.column?.width).toBe(3);
    }
    cleanup(root);
  });

  it("renders HOLD_NOT_AVAILABLE notice (NOT_AUTHORIZED)", async () => {
    const pid = setupProject();
    const root = await render(<SubstructureRescuePanel projectId={pid} />);
    const hold = document.querySelector('[data-testid="sub-rescue-hold"]');
    expect(hold?.textContent).toContain("HOLD_NOT_AVAILABLE");
    cleanup(root);
  });
});

function cleanup(root: Root) {
  act(() => {
    root.unmount();
  });
}

describe("SubstructureRescuePanel outputs (Phase 9-04 B-02/07/08/09)", () => {
  it("renders coordinate table, quantity and plan view", async () => {
    const pid = setupProject();
    const root = await render(<SubstructureRescuePanel projectId={pid} />);
    expect(document.querySelector('[data-testid="sub-coordinate-table"]')).toBeTruthy();
    expect(document.querySelector('[data-testid="sub-coord-P1"]')?.textContent).toContain("P1");
    expect(document.querySelector('[data-testid="sub-quantity"]')).toBeTruthy();
    expect(document.querySelector('[data-testid="sub-plan-view"]')).toBeTruthy();
    cleanup(root);
  });

  it("renders the 3D preview canvas", async () => {
    const pid = setupProject();
    const root = await render(<SubstructureRescuePanel projectId={pid} />);
    // the WebGL renderer may not create a canvas in jsdom; the container must exist
    expect(document.querySelector('[data-testid="sub-3d-preview"]')).toBeTruthy();
    cleanup(root);
  });
});

describe("SubstructureRescuePanel 3-pane CAD + pile grid (Phase 9-04R3 B-01/B-06)", () => {
  it("renders the 3-pane layout with shared selection", async () => {
    const pid = setupProject();
    const root = await render(<SubstructureRescuePanel projectId={pid} />);
    expect(document.querySelector('[data-testid="sub-3pane-layout"]')).toBeTruthy();
    expect(document.querySelector('[data-testid="sub-pane-tree"]')).toBeTruthy();
    expect(document.querySelector('[data-testid="sub-pane-viewport"]')).toBeTruthy();
    expect(document.querySelector('[data-testid="sub-pane-properties"]')).toBeTruthy();

    // select P1 -> the plan view highlights it
    const radio = document.querySelector('[data-testid="sub-support-P1"]') as HTMLInputElement;
    await act(async () => {
      radio.click();
    });
    const planSupport = document.querySelector('[data-testid="sub-plan-support-P1"]');
    expect(planSupport).toBeTruthy();
    expect(planSupport?.getAttribute("fill")).toBe("#f59e0b");
    cleanup(root);
  });

  it("edits the pile grid rows/cols canonically and derives coordinates (B-06)", async () => {
    const pid = setupProject();
    const manager = getProjectManager();
    const root = await render(<SubstructureRescuePanel projectId={pid} />);
    const radio = document.querySelector('[data-testid="sub-support-P1"]') as HTMLInputElement;
    await act(async () => {
      radio.click();
    });

    expect(document.querySelector('[data-testid="pile-grid-editor"]')).toBeTruthy();
    expect(document.querySelector('[data-testid="pile-coordinate-table"]')).toBeTruthy();

    // change rows to 3 -> pileCount 3*2 = 6
    const rowsInput = document.querySelector('[data-testid="sub-field-X方向本数（rows）"]') as HTMLInputElement;
    expect(rowsInput).toBeTruthy();
    await act(async () => {
      const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value")?.set;
      setter?.call(rowsInput, "3");
      rowsInput.dispatchEvent(new Event("input", { bubbles: true }));
    });

    const doc = readSubstructureDocument(manager, pid);
    const pileGroup = doc?.supports[0]?.pier?.pileGroup;
    expect(pileGroup?.rows).toBe(3);
    expect(pileGroup?.pileCount).toBe(6);
    // the document-level pileConfigurations entry is synced (Sol review #3)
    const pc = doc?.pileConfigurations.find((p) => p.id === pileGroup?.id);
    expect(pc).toBeDefined();
    expect(pc?.rows).toBe(3);
    expect(pc?.cols).toBe(2);
    expect(pc?.pileCount).toBe(6);
    cleanup(root);
  });

  it("preserves edge distances when editing rows/spacing (Sol review #3)", async () => {
    const pid = setupProject();
    const manager = getProjectManager();
    const existing = readSubstructureDocument(manager, pid)!;
    // give the support pileGroup explicit edge values
    writeSubstructureDocument(manager, pid, {
      ...existing,
      supports: existing.supports.map((s) => s.supportId === "P1"
        ? { ...s, pier: { ...s.pier!, pileGroup: { ...s.pier!.pileGroup!, edgeX: 0.5, edgeY: 0.4 } } }
        : s),
    });
    const root = await render(<SubstructureRescuePanel projectId={pid} />);
    const radio = document.querySelector('[data-testid="sub-support-P1"]') as HTMLInputElement;
    await act(async () => {
      radio.click();
    });
    // edit spacing X -> edgeX must be preserved
    const spacingX = document.querySelector('[data-testid="sub-field-X間隔"]') as HTMLInputElement;
    await act(async () => {
      const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value")?.set;
      setter?.call(spacingX, "4.0");
      spacingX.dispatchEvent(new Event("input", { bubbles: true }));
    });
    const doc = readSubstructureDocument(manager, pid);
    expect(doc?.supports[0]?.pier?.pileGroup?.edgeX).toBe(0.5);
    expect(doc?.supports[0]?.pier?.pileGroup?.edgeY).toBe(0.4);
    cleanup(root);
  });

  it("keeps pileCount === rows*cols when editing 杭本数 (Sol review #3)", async () => {
    const pid = setupProject();
    const manager = getProjectManager();
    const root = await render(<SubstructureRescuePanel projectId={pid} />);
    const radio = document.querySelector('[data-testid="sub-support-P1"]') as HTMLInputElement;
    await act(async () => {
      radio.click();
    });
    const countInput = document.querySelector('[data-testid="sub-field-杭本数"]') as HTMLInputElement;
    await act(async () => {
      const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value")?.set;
      setter?.call(countInput, "6");
      countInput.dispatchEvent(new Event("input", { bubbles: true }));
    });
    const doc = readSubstructureDocument(manager, pid);
    const pg = doc?.supports[0]?.pier?.pileGroup;
    expect(pg?.pileCount).toBe(pg!.rows! * pg!.cols!);
    cleanup(root);
  });
});
