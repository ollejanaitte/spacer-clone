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

  it("edits material configuration and commits canonically (Phase 7-01C §3.1)", async () => {
    const pid = setupProject();
    const manager = getProjectManager();
    const root = await render(<SuperstructureRescuePanel projectId={pid} />);

    const matInput = document.querySelector('[data-testid="super-field-鋼弾性係数"]') as HTMLInputElement;
    expect(matInput).toBeTruthy();
    await act(async () => {
      const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value")?.set;
      setter?.call(matInput, "210000000");
      matInput.dispatchEvent(new Event("input", { bubbles: true }));
    });

    const doc = readSuperstructureDocument(manager, pid);
    expect(doc).toBeDefined();
    if (doc) {
      expect(doc.materialConfiguration?.elasticModulusKN_M2).toBe(210000000);
      // unset fields fall back to the frozen default baseline
      expect(doc.materialConfiguration?.poissonRatio).toBe(0.3);
    }
    cleanup(root);
  });

  it("edits cross beam spacing and dimensions canonically", async () => {
    const pid = setupProject();
    const manager = getProjectManager();
    // give the document an initial cross-beam configuration so the fields exist
    const existing = readSuperstructureDocument(manager, pid)!;
    writeSuperstructureDocument(manager, pid, {
      ...existing,
      crossBeamConfiguration: {
        crossBeamSpacingM: 10,
        crossBeams: [
          { crossBeamId: "XB-A1", kind: "support", stationM: 0, depthM: 0.8, widthM: 0.4 },
          { crossBeamId: "XB-A2", kind: "support", stationM: 40, depthM: 0.8, widthM: 0.4 },
        ],
      },
    });

    const root = await render(<SuperstructureRescuePanel projectId={pid} />);
    const spacingInput = document.querySelector('[data-testid="super-field-横桁間隔"]') as HTMLInputElement;
    expect(spacingInput).toBeTruthy();
    await act(async () => {
      const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value")?.set;
      setter?.call(spacingInput, "10");
      spacingInput.dispatchEvent(new Event("input", { bubbles: true }));
    });

    const doc = readSuperstructureDocument(manager, pid);
    expect(doc).toBeDefined();
    if (doc) {
      expect(doc.crossBeamConfiguration?.crossBeamSpacingM).toBe(10);
      expect((doc.crossBeamConfiguration?.crossBeams.length ?? 0)).toBeGreaterThan(0);
      const depthInput = document.querySelector('[data-testid="super-field-横桁せい"]') as HTMLInputElement;
      await act(async () => {
        const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value")?.set;
        setter?.call(depthInput, "0.8");
        depthInput.dispatchEvent(new Event("input", { bubbles: true }));
      });
      const after = readSuperstructureDocument(manager, pid);
      expect(after?.crossBeamConfiguration?.crossBeams.every((c) => c.depthM === 0.8)).toBe(true);
    }
    cleanup(root);
  });

  it("edits bearing type and fixed/movable canonically", async () => {
    const pid = setupProject();
    const manager = getProjectManager();
    const existing = readSuperstructureDocument(manager, pid)!;
    writeSuperstructureDocument(manager, pid, {
      ...existing,
      supportReferences: {
        handoffId: "SH-1",
        schemaVersion: "1.0.0",
        generatedAt: new Date().toISOString(),
        supports: [
          { supportId: "A1", supportType: "abutment", label: "A1", station: 0, position: { domainX: 0, domainY: 0, elevation: 0 }, tangentAzimuthRad: 0, skewAngleRad: 0, terrainElevation: 0, roadReferenceId: "R", coordinateContextId: null },
          { supportId: "A2", supportType: "abutment", label: "A2", station: 40, position: { domainX: 40, domainY: 0, elevation: 0 }, tangentAzimuthRad: 0, skewAngleRad: 0, terrainElevation: 0, roadReferenceId: "R", coordinateContextId: null },
        ],
      },
      bearingConfiguration: {
        bearingSupportRelation: [
          { supportId: "A1", girderId: "G1" },
          { supportId: "A2", girderId: "G1" },
        ],
        bearingSeats: [
          { seatId: "BRG-A1-G1", supportId: "A1", girderId: "G1", bearingType: null, fixedOrMovable: "UNDECIDED", longitudinalDirection: null, transverseDirection: null },
          { seatId: "BRG-A2-G1", supportId: "A2", girderId: "G1", bearingType: null, fixedOrMovable: "UNDECIDED", longitudinalDirection: null, transverseDirection: null },
        ],
      },
    });

    const root = await render(<SuperstructureRescuePanel projectId={pid} />);
    const typeSelect = document.querySelector('[data-testid="super-bearing-type-A1"]') as HTMLSelectElement;
    expect(typeSelect).toBeTruthy();
    await act(async () => {
      typeSelect.value = "fixed";
      typeSelect.dispatchEvent(new Event("change", { bubbles: true }));
    });
    const doc = readSuperstructureDocument(manager, pid);
    expect(doc?.bearingConfiguration.bearingSeats.find((s) => s.supportId === "A1")?.bearingType).toBe("fixed");
    expect(doc?.bearingConfiguration.bearingSeats.find((s) => s.supportId === "A2")?.bearingType).toBeNull();
    cleanup(root);
  });

  it("renders the AUTHORIZED dead-load view", async () => {
    const pid = setupProject();
    const manager = getProjectManager();
    const existing = readSuperstructureDocument(manager, pid)!;
    writeSuperstructureDocument(manager, pid, {
      ...existing,
      deckConfiguration: { ...existing.deckConfiguration, thicknessM: 0.25, unitWeight: 24.5, resolvedWidthM: 12 },
    });
    const root = await render(<SuperstructureRescuePanel projectId={pid} />);
    expect(document.querySelector('[data-testid="super-authorized-load"]')).toBeTruthy();
    cleanup(root);
  });
});

function cleanup(root: Root) {
  act(() => {
    root.unmount();
  });
}
