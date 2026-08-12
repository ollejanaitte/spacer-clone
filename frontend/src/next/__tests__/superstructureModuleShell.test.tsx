// @vitest-environment jsdom
import { act, type ReactNode } from "react";
import { createRoot, type Root } from "react-dom/client";
import { describe, expect, it } from "vitest";
import { createEmptyProject } from "../project/projectDataCore";
import { applyBusinessMetadata } from "../project/businessMetadata";
import { getProjectManager, resetProjectManagerForTest } from "../project/projectManagerInstance";
import { writeRoadInputs } from "../modules/roadModuleAdapter";
import { writeTerrainDocument } from "../modules/terrainModuleAdapter";
import { createEmptyTerrainDocument } from "../modules/terrainModule";
import { writeExistingConditions } from "../modules/existingConditionsAdapter";
import { buildBridgeLayoutFromRange, addPier, generateSpans } from "../modules/bridgeLayoutModule";
import { writeBridgeLayoutDocument } from "../modules/bridgeLayoutModuleAdapter";
import { createReferenceMountain } from "../modules/terrain/referenceMountain";
import { SuperstructureModuleShellPage } from "../pages/SuperstructureModuleShellPage";
import { writeSuperstructureDocument } from "../modules/superstructureModuleAdapter";
import { buildSuperstructureDocument, attachSuperstructureHandoffs } from "../modules/superstructure/superstructureDocumentDomain";

async function render(node: ReactNode): Promise<Root> {
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

function seedProject(manager: ReturnType<typeof getProjectManager>, projectId: string) {
  const mountain = createReferenceMountain();
  writeRoadInputs(manager, projectId, {
    label: "山岳道路",
    horizontal: mountain.roadHorizontal,
    vertical: mountain.roadVertical,
    crossSections: [mountain.roadCrossSection],
  });
  writeTerrainDocument(manager, projectId, {
    ...createEmptyTerrainDocument(),
    source: { sourceType: "csv" as const, sourceName: "mtn.csv", importedAt: null },
    surfaceReference: "assets/terrain/reference.bin",
  });
  writeExistingConditions(manager, projectId, { schemaVersion: "0.1.0", entities: [...mountain.existing] });
}

describe("SuperstructureModuleShellPage (WP-J UI)", () => {
  it("shows document summary and gate status", async () => {
    resetProjectManagerForTest();
    const manager = getProjectManager();
    manager.importProject(applyBusinessMetadata(createEmptyProject("上部工UI"), {
      businessNumber: "SUP-UI-1",
      designStage: "bridge-detailed",
    }));
    const projectId = manager.listProjects()[0].projectId;
    seedProject(manager, projectId);

    const built = buildBridgeLayoutFromRange(manager, projectId, {
      bridgeId: "BR-900",
      name: "谷川橋",
      startStation: 100,
      endStation: 450,
    });
    expect(built.ok).toBe(true);
    let layout = built.document!;
    layout = addPier(layout, { supportId: "P1", station: 300 });
    layout = { ...layout, spans: generateSpans(layout) };
    writeBridgeLayoutDocument(manager, projectId, layout);

    const docBuild = buildSuperstructureDocument({
      projectId,
      bridgeLayoutReference: { bridgeId: "BR-900", moduleId: "bridgeLayout", documentVersion: "0.1.0", layoutFingerprint: "fp" },
      roadReference: { moduleId: "road", alignmentId: "ROAD-MTN-1", stationReferenceId: null, coordinatePolicyId: null },
      girderConfiguration: {
        girderCount: 2,
        girderSpacingM: 8,
        girderLines: [] as never[],
        girderSectionModel: { depthM: null, webThicknessM: null, topFlange: null, bottomFlange: null, areaM2: null, unitWeightPerM: null },
      },
      deckConfiguration: {
        deckId: "DECK-1",
        deckKind: "rc_non_composite",
        thicknessM: 0.24,
        unitWeight: 24.5,
        overhangLeftM: 0.5,
        overhangRightM: 0.5,
        resolvedWidthM: 12.0,
      },
    });
    if (!docBuild.ok) throw new Error("doc build failed");
    const doc = attachSuperstructureHandoffs(docBuild.document, {
      handoffId: "SH-1",
      schemaVersion: "1.0.0",
      generatedAt: "2026-08-12T00:00:00.000Z",
      spans: layout.spans.map((s, i) => ({
        spanId: s.spanId,
        index: i,
        startSupportId: s.startSupportId,
        endSupportId: s.endSupportId,
        startStation: s.startStation,
        endStation: s.endStation,
        spanLength: s.length,
        startSupportSkew: null,
        endSupportSkew: null,
      })),
    }, {
      handoffId: "SH-2",
      schemaVersion: "1.0.0",
      generatedAt: "2026-08-12T00:00:00.000Z",
      supports: [
        { supportId: "A1", supportType: "abutment", label: "A1", station: 100, position: { domainX: 100, domainY: 0, elevation: 100 }, tangentAzimuthRad: 0, skewAngleRad: null, terrainElevation: 95, roadReferenceId: "r", coordinateContextId: null },
        { supportId: "P1", supportType: "pier", label: "P1", station: 300, position: { domainX: 300, domainY: 0, elevation: 100 }, tangentAzimuthRad: 0, skewAngleRad: null, terrainElevation: 92, roadReferenceId: "r", coordinateContextId: null },
        { supportId: "A2", supportType: "abutment", label: "A2", station: 450, position: { domainX: 450, domainY: 0, elevation: 100 }, tangentAzimuthRad: 0, skewAngleRad: null, terrainElevation: 96, roadReferenceId: "r", coordinateContextId: null },
      ],
    });
    expect(writeSuperstructureDocument(manager, projectId, doc).ok).toBe(true);

    window.history.pushState({}, "", `/app/projects/${projectId}/modules/superstructure`);
    const root = await render(<SuperstructureModuleShellPage projectId={projectId} moduleId="superstructure" />);
    expect(document.querySelector('[data-testid="module-shell-title"]')?.textContent).toContain("上部工");
    expect(document.querySelector('[data-testid="super-document"]')?.textContent).toBe("あり");
    expect(document.querySelector('[data-testid="super-bridge"]')?.textContent).toBe("BR-900");
    expect(document.querySelector('[data-testid="super-phase6-ready"]')?.textContent).toContain("READY");
    expect(document.querySelector('[data-testid="super-handoff-ready"]')).toBeTruthy();
    cleanup(root);
  });

  it("shows NOT_READY when no superstructure document exists", async () => {
    resetProjectManagerForTest();
    const manager = getProjectManager();
    manager.importProject(applyBusinessMetadata(createEmptyProject("上部工NG"), {
      businessNumber: "SUP-UI-2",
      designStage: "bridge-detailed",
    }));
    const projectId = manager.listProjects()[0].projectId;
    window.history.pushState({}, "", `/app/projects/${projectId}/modules/superstructure`);
    const root = await render(<SuperstructureModuleShellPage projectId={projectId} moduleId="superstructure" />);
    expect(document.querySelector('[data-testid="super-document"]')?.textContent).toBe("なし");
    expect(document.querySelector('[data-testid="super-gate-ng"]')).toBeTruthy();
    cleanup(root);
  });
});
