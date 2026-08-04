import { describe, expect, it } from "vitest";
import { createDefaultProject } from "../../data/defaultProject";
import {
  generateBridgeStructureFromInput,
  getBridgeStructureInputDraft,
  withBridgeStructureField,
} from "../bridgeStructure";
import { fillSimpleSingleBridgeStructureInput } from "../testing/bridgeStructureFixtures";
import { SIMPLE_SINGLE_SPAN_SAMPLE_INPUT } from "../bridgeStructure/sampleInputs";
import { withBridgeStructureInputDraft } from "../bridgeStructure/generateBsdd";
import {
  assertDrawingSetExportable,
  buildGeneralArrangementDrawingSet,
  DRAWING_SET_SCHEMA_VERSION,
} from "../drawing/drawingSetModel";
import { renderSheetDxf, renderSheetSvg } from "../drawing/drawingSetExport";
import { buildStandardSectionDrawingModel, drawingModelChecksum } from "../drawing/drawingModel";
import {
  assertMemberScheduleExportable,
  buildMemberScheduleModel,
  memberScheduleToCsv,
  memberScheduleToJson,
} from "../drawing/memberScheduleModel";
import { buildQuantityModel, findQuantityValue } from "../quantity/quantityModel";
import {
  computeDeckOverhang,
  generateSimpleSupportStations,
  generateSpacingStations,
  generateSwayBracingStations,
  girderCenterOffsetsY,
} from "../drawing/stationGenerator";

function generated(overrides: Record<string, number | boolean> = {}) {
  let project = fillSimpleSingleBridgeStructureInput(createDefaultProject());
  // Align with GOLD-GA-001 defaults where useful; fixture is 40m/width12.
  project = withBridgeStructureField(project, "stiffenerSpacing", 2.5);
  project = withBridgeStructureField(project, "swayBracingInterval", 1);
  for (const [k, v] of Object.entries(overrides)) {
    project = withBridgeStructureField(project, k as never, v as never);
  }
  const g = generateBridgeStructureFromInput(project, getBridgeStructureInputDraft(project));
  if (!g.ok) throw new Error(g.diagnostics.join("; "));
  return g.project;
}

function generatedGoldGa001() {
  let project = createDefaultProject();
  project = withBridgeStructureInputDraft(project, () => ({
    ...SIMPLE_SINGLE_SPAN_SAMPLE_INPUT,
    generatedAt: null,
  }));
  const g = generateBridgeStructureFromInput(project, getBridgeStructureInputDraft(project));
  if (!g.ok) throw new Error(g.diagnostics.join("; "));
  return g.project;
}

describe("stationGenerator", () => {
  it("spacing stations match floor(L/s)+1 including ends", () => {
    const r = generateSpacingStations(30, 5);
    expect(r.ok).toBe(true);
    expect(r.count).toBe(7);
    expect(r.stations).toEqual([0, 5, 10, 15, 20, 25, 30]);
  });

  it("non-integer L/spacing", () => {
    const r = generateSpacingStations(31, 5);
    expect(r.count).toBe(7);
    expect(r.stations[6]).toBe(30);
  });

  it("zero/negative fail-closed", () => {
    expect(generateSpacingStations(30, 0).ok).toBe(false);
    expect(generateSpacingStations(30, -1).ok).toBe(false);
    expect(generateSpacingStations(30, null).ok).toBe(false);
  });

  it("sway stations skip ends", () => {
    const cb = generateSpacingStations(30, 5).stations;
    const sway = generateSwayBracingStations(cb, 1);
    expect(sway.stations).toEqual([5, 10, 15, 20, 25]);
  });

  it("support stations 0 and L", () => {
    expect(generateSimpleSupportStations(30).stations).toEqual([0, 30]);
  });
});

describe("drawingSetModel general arrangement", () => {
  it("schema and deterministic sheet/view order", () => {
    const model = buildGeneralArrangementDrawingSet(generated());
    expect(model.schemaVersion).toBe(DRAWING_SET_SCHEMA_VERSION);
    expect(model.sheets).toHaveLength(7);
    expect(model.sheets.map((s) => s.drawingNumber)).toEqual([
      "G-01",
      "G-02",
      "G-03",
      "G-04",
      "G-05",
      "G-06",
      "G-07",
    ]);
    expect(model.sheets[0]!.views.map((v) => v.viewType)).toEqual([
      "GENERAL_PLAN",
      "GENERAL_ELEVATION",
      "STANDARD_SECTION",
    ]);
    expect(model.sheets[1]!.views[0]!.viewType).toBe("FLOOR_SYSTEM_PLAN");
    expect(model.sheets[2]!.views[0]!.viewType).toBe("BRACING_LAYOUT");
    expect(model.sheets[3]!.views[0]!.viewType).toBe("STIFFENER_LAYOUT");
    expect(model.sheets[4]!.views[0]!.viewType).toBe("SUPPORT_BEARING_PLAN");
    expect(model.sheets[5]!.views[0]!.viewType).toBe("GIRDER_ELEVATION");
    expect(model.sheets[6]!.views[0]!.viewType).toBe("MEMBER_SCHEDULE");
    expect(model.authorizationStatus).toBe("NOT_GRANTED");
    expect(model.fabricationDrawing).toBe(false);
    expect(model.coordinateSystem.datumNote).toContain("LOCAL DATUM");
  });

  it("GOLD-GA-001 parity with sample inputs", () => {
    const project = generatedGoldGa001();
    const model = buildGeneralArrangementDrawingSet(project);
    expect(model.layout.bridgeLength).toBe(30);
    expect(model.layout.width).toBe(10.5);
    expect(model.layout.girderCount).toBe(4);
    expect(model.layout.girderSpacing).toBe(3);
    expect(model.layout.overhang).toBeCloseTo(0.75, 12);
    expect(model.layout.girderCentersY).toEqual([-4.5, -1.5, 1.5, 4.5]);
    expect(model.layout.supportStations).toEqual([0, 30]);
    expect(model.layout.crossBeamStations).toEqual([0, 5, 10, 15, 20, 25, 30]);
    expect(model.layout.stiffenerStations[0]).toBe(0);
    expect(model.layout.stiffenerStations.at(-1)).toBe(30);
    expect(model.layout.swayStations.length).toBe(5);
    const plan = model.sheets[0]!.views.find((v) => v.viewType === "GENERAL_PLAN")!;
    expect(plan.bounds.minX).toBeLessThan(0);
    expect(plan.bounds.maxX).toBeGreaterThan(30);
    const elev = model.sheets[0]!.views.find((v) => v.viewType === "GENERAL_ELEVATION")!;
    expect(elev.labels.some((l) => String(l.geometry.text).includes("LOCAL DATUM"))).toBe(true);
    expect(model.sheets[0]!.views).toHaveLength(3);
  });

  it("even and odd girder counts stay centered", () => {
    const even = girderCenterOffsetsY(4, 3);
    expect(even).toEqual([-4.5, -1.5, 1.5, 4.5]);
    const odd = girderCenterOffsetsY(5, 2.5);
    expect(odd[2]).toBeCloseTo(0, 12);
  });

  it("standard section reuse shares checksum and entity IDs", () => {
    const project = generated();
    const generatedAt = "2026-08-03T00:00:00.000Z";
    const section = buildStandardSectionDrawingModel(project, { generatedAt });
    const set = buildGeneralArrangementDrawingSet(project, { generatedAt });
    expect(set.standardSectionChecksum).toBe(drawingModelChecksum(section));
    const secView = set.sheets[0]!.views.find((v) => v.viewType === "STANDARD_SECTION")!;
    expect(secView.entities.map((e) => e.entityId)).toEqual(section.entities.map((e) => e.entityId));
  });

  it("negative overhang / missing inputs fail-closed", () => {
    expect(computeDeckOverhang(5, 4, 3).ok).toBe(false);
    const incomplete = createDefaultProject();
    const model = buildGeneralArrangementDrawingSet(incomplete);
    expect(model.sheets).toHaveLength(0);
    expect(model.warnings.some((w) => w.includes("入力不足") || w.includes("対象外") || w.includes("単純桁"))).toBe(
      true,
    );
  });

  it("stable IDs and dimension values present", () => {
    const model = buildGeneralArrangementDrawingSet(generated());
    const plan = model.sheets[0]!.views[0]!;
    expect(plan.entities.some((e) => e.entityId.startsWith("plan-girder-"))).toBe(true);
    expect(plan.dimensions.some((d) => String(d.geometry.text).includes("L_span="))).toBe(true);
    expect(plan.sourceEntityIds).toContain("G1");
  });

  it("SVG/DXF parse markers and STALE rejected", () => {
    const project = generated();
    const model = buildGeneralArrangementDrawingSet(project);
    const sheet = model.sheets[0]!;
    const svg = renderSheetSvg(model, sheet);
    expect(svg).toContain("<svg");
    expect(svg).not.toContain("<script");
    expect(svg).toContain("GENERAL_PLAN");
    expect(svg).toContain("APOLLO_GIRDER");
    const dxf = renderSheetDxf(model, sheet);
    expect(dxf).toContain("$INSUNITS");
    expect(dxf).toContain("ENTITIES");
    expect(dxf).toContain("EOF");

    const stale = withBridgeStructureField(project, "width", 11);
    const staleModel = buildGeneralArrangementDrawingSet(stale);
    expect(staleModel.stale).toBe(true);
    expect(() => assertDrawingSetExportable(staleModel)).toThrow(/STALE/);
  });

  it("quantity station parity for cross beams", () => {
    const project = generatedGoldGa001();
    const model = buildGeneralArrangementDrawingSet(project);
    // QuantityModel: floor(30/5)+1 = 7
    expect(model.layout.crossBeamStations).toHaveLength(7);
  });

  it("Step 3-B member arrangement disclosures and lateral states", () => {
    let project = withBridgeStructureInputDraft(createDefaultProject(), () => ({
      ...SIMPLE_SINGLE_SPAN_SAMPLE_INPUT,
      lateralBracingEnabled: true,
      upperLateralBracingEnabled: true,
      generatedAt: null,
    }));
    const g = generateBridgeStructureFromInput(project, getBridgeStructureInputDraft(project));
    if (!g.ok) throw new Error(g.diagnostics.join("; "));
    project = g.project;
    const model = buildGeneralArrangementDrawingSet(project);
    const g02 = model.sheets.find((s) => s.drawingNumber === "G-02")!;
    expect(g02.notes.some((n) => n.includes("CROSS BEAM SECTION NOT DEFINED"))).toBe(true);
    expect(g02.views[0]!.labels.some((l) => String(l.geometry.text).includes("CROSS BEAM SECTION NOT DEFINED"))).toBe(
      true,
    );
    const g03 = model.sheets.find((s) => s.drawingNumber === "G-03")!;
    expect(model.layout.upperLateralBracingEnabled).toBe(true);
    expect(model.layout.lowerLateralBracingEnabled).toBe(true);
    expect(g03.views[0]!.entities.some((e) => e.metadata?.kind === "UPPER_LATERAL")).toBe(true);
    expect(g03.views[0]!.entities.some((e) => e.metadata?.kind === "LOWER_LATERAL")).toBe(true);
    expect(g03.views[0]!.entities.some((e) => e.entityId.startsWith("g03-sway-v"))).toBe(true);
    const g04 = model.sheets.find((s) => s.drawingNumber === "G-04")!;
    expect(g04.views[0]!.labels.some((l) => String(l.geometry.text).includes("STIFFENER PLATE SIZE NOT DEFINED"))).toBe(
      true,
    );
    expect(g04.views[0]!.labels.some((l) => String(l.geometry.text).includes("NOT_DEFINED"))).toBe(true);
    expect(model.layout.stiffenerStations.length).toBeGreaterThan(0);
  });

  it("Step 3-C bearing count, no fabricated splice/camber, member schedule parity", () => {
    const project = generatedGoldGa001();
    const model = buildGeneralArrangementDrawingSet(project);
    expect(model.layout.bearingCount).toBe(4 * 2);
    const g05 = model.sheets.find((s) => s.drawingNumber === "G-05")!;
    expect(g05.views[0]!.entities.filter((e) => e.layerId === "APOLLO_BEARING")).toHaveLength(8);
    expect(g05.views[0]!.labels.some((l) => String(l.geometry.text).includes("NOT_SPECIFIED"))).toBe(true);
    const g06 = model.sheets.find((s) => s.drawingNumber === "G-06")!;
    expect(g06.views[0]!.labels.some((l) => String(l.geometry.text).includes("SPLICE LOCATIONS NOT PROVIDED"))).toBe(
      true,
    );
    expect(g06.views[0]!.labels.some((l) => String(l.geometry.text).includes("CAMBER NOT PROVIDED"))).toBe(true);
    expect(g06.notes.some((n) => n.includes("SPLICE"))).toBe(true);

    const schedule = buildMemberScheduleModel(project);
    const qty = buildQuantityModel(project);
    expect(schedule.rows.find((r) => r.category === "CROSS_BEAM")!.count).toBe(findQuantityValue(qty, "QTY-XB-N"));
    expect(schedule.rows.find((r) => r.category === "BEARING")!.count).toBe(8);
    expect(schedule.rows.find((r) => r.category === "CROSS_BEAM")!.volume).toBe("NOT_AVAILABLE");
    expect(schedule.rows.find((r) => r.category === "PAVEMENT_OPTIONAL")!.count).toBe("NOT_AVAILABLE");
    const csv = memberScheduleToCsv(schedule);
    expect(csv).toContain("memberId,category");
    expect(csv).not.toMatch(/,0,0,0,/); // no zero-fill for unavailable length/volume/weight on XB
    expect(memberScheduleToJson(schedule)).toContain("MEMBER_SCHEDULE_SCHEMA_VERSION".slice(0, 0) + "MS-MG");
    expect(() => assertMemberScheduleExportable(schedule)).not.toThrow();
    const stale = withBridgeStructureField(project, "width", 11);
    expect(() => assertMemberScheduleExportable(buildMemberScheduleModel(stale))).toThrow(/STALE/);
  });
});
