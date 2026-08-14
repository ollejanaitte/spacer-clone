// @vitest-environment jsdom
import { act, type ReactNode } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { getProjectManager, resetProjectManagerForTest } from "../../../project/projectManagerInstance";
import { createEmptyProject } from "../../../project/projectDataCore";
import { applyBusinessMetadata } from "../../../project/businessMetadata";
import { SuperstructureRescuePanel } from "../../../components/SuperstructureRescuePanel";
import { readSuperstructureDocument, writeSuperstructureDocument } from "../../superstructureModuleAdapter";
import { buildSuperstructureDocument, deriveGirderOffsets } from "../superstructureDocumentDomain";

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
  const project = applyBusinessMetadata(createEmptyProject("上部工Rescue"), {
    businessNumber: "SUP-R-1",
    designStage: "bridge-detailed",
  });
  manager.importProject(project);
  const pid = manager.listProjects()[0]!.projectId;
  const built = buildSuperstructureDocument({
    projectId: pid,
    bridgeLayoutReference: { bridgeId: "BR-1", moduleId: "bridgeLayout", documentVersion: "0.1.0", layoutFingerprint: "fp" },
    roadReference: { moduleId: "road", alignmentId: "ROAD-1", stationReferenceId: null, coordinatePolicyId: null },
    structuralSystem: { spanSystem: "continuous", bridgeSystem: "CONTINUOUS" },
    girderConfiguration: {
      girderCount: 2,
      girderSpacingM: 8,
      girderLines: [],
      girderSectionModel: { depthM: 2.0, webThicknessM: 0.012, topFlange: { widthM: 0.45, thicknessM: 0.025 }, bottomFlange: { widthM: 0.55, thicknessM: 0.03 }, areaM2: null, unitWeightPerM: null },
    },
    deckConfiguration: { deckId: "DECK-1", deckKind: "rc_non_composite", thicknessM: 0.25, unitWeight: 24.5, overhangLeftM: 0.5, overhangRightM: 0.5, resolvedWidthM: 12 },
    crossBeamConfiguration: null,
    crossFrameConfiguration: null,
    bearingConfiguration: { bearingSupportRelation: [], bearingSeats: [] },
    superstructureType: "plate_girder_rc_slab_non_composite",
  });
  expect(built.ok).toBe(true);
  if (built.ok) {
    writeSuperstructureDocument(manager, pid, built.document);
  }
  return pid;
}

describe("SuperstructureRescuePanel (Phase 9-03 WP-A/C)", () => {
  it("edits girder count/spacing and commits canonically", async () => {
    const pid = setupProject();
    const manager = getProjectManager();
    const root = await render(<SuperstructureRescuePanel projectId={pid} />);

    // change 主桁本数 to 4
    const countInput = document.querySelector('[data-testid="super-field-主桁本数"]') as HTMLInputElement;
    expect(countInput).toBeTruthy();
    await act(async () => {
      const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value")?.set;
      setter?.call(countInput, "4");
      countInput.dispatchEvent(new Event("input", { bubbles: true }));
    });

    const doc = readSuperstructureDocument(manager, pid);
    expect(doc).toBeDefined();
    if (doc) {
      expect(doc.girderConfiguration.girderCount).toBe(4);
      // deriveGirderOffsets preserves the mapping
      const offsets = deriveGirderOffsets(4, doc.girderConfiguration.girderSpacingM ?? 8);
      expect(offsets?.length).toBe(4);
      expect(doc.girderConfiguration.girderLines.length).toBe(4);
      expect(doc.documentId).toBeTruthy();
    }
    cleanup(root);
  });

  it("renders the 2D cross-section preview", async () => {
    const pid = setupProject();
    const root = await render(<SuperstructureRescuePanel projectId={pid} />);
    expect(document.querySelector('[data-testid="super-cross-section-preview"]')).toBeTruthy();
    cleanup(root);
  });
});

function cleanup(root: Root) {
  act(() => {
    root.unmount();
  });
}
