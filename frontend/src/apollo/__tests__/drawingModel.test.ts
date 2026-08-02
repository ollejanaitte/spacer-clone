import { describe, expect, it } from "vitest";
import { createDefaultProject } from "../../data/defaultProject";
import {
  generateBridgeStructureFromInput,
  getBridgeStructureInputDraft,
  withBridgeStructureField,
} from "../bridgeStructure";
import { fillSimpleSingleBridgeStructureInput } from "../testing/bridgeStructureFixtures";
import {
  assertDrawingExportable,
  buildStandardSectionDrawingModel,
  computeStandardSectionLayout,
} from "../drawing/drawingModel";
import { renderDrawingDxf, renderDrawingSvg } from "../drawing/drawingExport";

function generated(overrides: Record<string, number> = {}) {
  let project = fillSimpleSingleBridgeStructureInput(createDefaultProject());
  for (const [k, v] of Object.entries(overrides)) {
    project = withBridgeStructureField(project, k as never, v);
  }
  const g = generateBridgeStructureFromInput(project, getBridgeStructureInputDraft(project));
  if (!g.ok) throw new Error(g.diagnostics.join("; "));
  return g.project;
}

describe("drawingModel standard section", () => {
  it("GOLD-DRW-001 centered layout and overhang", () => {
    // width=12, n=4, s=3 → overhang=(12-9)/2=1.5; centers -4.5,-1.5,1.5,4.5
    const layout = computeStandardSectionLayout({
      width: 12,
      girderCount: 4,
      girderSpacing: 3,
      deckThickness: 0.25,
      girderDepth: 2.5,
      topFlangeWidth: 0.5,
      topFlangeThickness: 0.02,
      bottomFlangeWidth: 0.6,
      bottomFlangeThickness: 0.025,
      webThickness: 0.012,
    });
    expect(layout.ok).toBe(true);
    expect(layout.overhang).toBeCloseTo(1.5, 12);
    expect(layout.girderCentersX).toEqual([-4.5, -1.5, 1.5, 4.5]);
  });

  it("odd girder count remains centered", () => {
    const layout = computeStandardSectionLayout({
      width: 12,
      girderCount: 5,
      girderSpacing: 2.5,
      deckThickness: 0.25,
      girderDepth: 2.5,
      topFlangeWidth: 0.5,
      topFlangeThickness: 0.02,
      bottomFlangeWidth: 0.6,
      bottomFlangeThickness: 0.025,
      webThickness: 0.012,
    });
    expect(layout.girderCentersX[2]).toBeCloseTo(0, 12);
  });

  it("negative overhang fail-closed", () => {
    const layout = computeStandardSectionLayout({
      width: 5,
      girderCount: 4,
      girderSpacing: 3,
      deckThickness: 0.25,
      girderDepth: 2.5,
      topFlangeWidth: 0.5,
      topFlangeThickness: 0.02,
      bottomFlangeWidth: 0.6,
      bottomFlangeThickness: 0.025,
      webThickness: 0.012,
    });
    expect(layout.ok).toBe(false);
  });

  it("SVG/DXF export deterministic and STALE rejected", () => {
    const project = generated();
    const model = buildStandardSectionDrawingModel(project);
    expect(model.fabricationDrawing).toBe(false);
    expect(model.authorizationStatus).toBe("NOT_GRANTED");
    const svg = renderDrawingSvg(model);
    expect(svg).toContain("<svg");
    expect(svg).not.toContain("<script");
    expect(svg).toContain("APOLLO_GIRDER");
    const dxf = renderDrawingDxf(model);
    expect(dxf).toContain("SECTION");
    expect(dxf).toContain("ENTITIES");
    expect(dxf).toContain("EOF");
    expect(dxf).toContain("$INSUNITS");

    const stale = withBridgeStructureField(project, "width", 11);
    const staleModel = buildStandardSectionDrawingModel(stale);
    expect(staleModel.stale).toBe(true);
    expect(() => assertDrawingExportable(staleModel)).toThrow(/STALE/);
  });
});
