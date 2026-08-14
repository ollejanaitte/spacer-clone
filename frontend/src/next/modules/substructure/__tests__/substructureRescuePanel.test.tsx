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
