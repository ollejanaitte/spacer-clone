import { describe, expect, it } from "vitest";
import { createDefaultProject } from "../../data/defaultProject";
import {
  createEmptyBridgeStructureInputDraft,
  generateBridgeStructureFromInput,
  getBridgeStructureInputDraft,
  withBridgeStructureField,
  withBridgeStructureInputDraft,
} from "../bridgeStructure";
import { fillSimpleSingleBridgeStructureInput } from "../testing/bridgeStructureFixtures";
import {
  assertQuantityModelExportable,
  buildQuantityModel,
  findQuantityValue,
  quantityModelToCsv,
  quantityModelToJson,
} from "../quantity/quantityModel";

function generateOrThrow(project: ReturnType<typeof createDefaultProject>) {
  const generated = generateBridgeStructureFromInput(project, getBridgeStructureInputDraft(project));
  if (!generated.ok) throw new Error(generated.diagnostics.join("; "));
  return generated.project;
}

function projectWithGoldQty001() {
  let project = fillSimpleSingleBridgeStructureInput(createDefaultProject());
  project = withBridgeStructureField(project, "spanLength", 40);
  project = withBridgeStructureField(project, "bridgeLength", 40);
  project = withBridgeStructureField(project, "width", 10.5);
  project = withBridgeStructureField(project, "girderCount", 4);
  project = withBridgeStructureField(project, "girderSpacing", 3);
  project = withBridgeStructureField(project, "girderDepth", 2.5);
  project = withBridgeStructureField(project, "topFlangeWidth", 0.5);
  project = withBridgeStructureField(project, "topFlangeThickness", 0.03);
  project = withBridgeStructureField(project, "bottomFlangeWidth", 0.5);
  project = withBridgeStructureField(project, "bottomFlangeThickness", 0.03);
  project = withBridgeStructureField(project, "webThickness", 0.012);
  project = withBridgeStructureField(project, "deckThickness", 0.22);
  project = withBridgeStructureField(project, "crossBeamSpacing", 5);
  project = withBridgeStructureField(project, "steelUnitWeight", 77);
  project = withBridgeStructureField(project, "rcUnitWeight", 24.5);
  return generateOrThrow(project);
}

function projectWithGoldQty002() {
  let project = fillSimpleSingleBridgeStructureInput(createDefaultProject());
  project = withBridgeStructureField(project, "spanLength", 200);
  project = withBridgeStructureField(project, "bridgeLength", 200);
  project = withBridgeStructureField(project, "width", 12);
  project = withBridgeStructureField(project, "girderCount", 5);
  project = withBridgeStructureField(project, "girderSpacing", 2.5);
  project = withBridgeStructureField(project, "girderDepth", 2.5);
  project = withBridgeStructureField(project, "topFlangeWidth", 0.5);
  project = withBridgeStructureField(project, "topFlangeThickness", 0.02);
  project = withBridgeStructureField(project, "bottomFlangeWidth", 0.6);
  project = withBridgeStructureField(project, "bottomFlangeThickness", 0.025);
  project = withBridgeStructureField(project, "webThickness", 0.012);
  project = withBridgeStructureField(project, "deckThickness", 0.25);
  project = withBridgeStructureField(project, "crossBeamSpacing", 5);
  project = withBridgeStructureField(project, "steelUnitWeight", null);
  project = withBridgeStructureField(project, "rcUnitWeight", null);
  return generateOrThrow(project);
}

const A = 1e-9;
const R = 1e-12;

function near(actual: number | null, expected: number) {
  expect(actual).not.toBeNull();
  const abs = Math.abs(actual! - expected);
  expect(abs).toBeLessThanOrEqual(Math.max(A, R * Math.abs(expected)));
}

describe("quantityModel development", () => {
  it("GOLD-QTY-001 exact volumes and user weights", () => {
    const model = buildQuantityModel(projectWithGoldQty001());
    expect(model.stale).toBe(false);
    expect(model.authorizationStatus).toBe("NOT_GRANTED");
    expect(model.developmentLabel).toBe("UNVERIFIED_DEVELOPMENT_ONLY");
    near(findQuantityValue(model, "QTY-MG-ATF"), 0.015);
    near(findQuantityValue(model, "QTY-MG-ABF"), 0.015);
    near(findQuantityValue(model, "QTY-MG-AW"), 0.02928);
    near(findQuantityValue(model, "QTY-MG-V1"), 0.05928 * 40);
    near(findQuantityValue(model, "QTY-MG-VALL"), 0.05928 * 40 * 4);
    near(findQuantityValue(model, "QTY-DK-VOL"), 10.5 * 40 * 0.22);
    near(findQuantityValue(model, "QTY-MG-W"), 0.05928 * 40 * 4 * 77);
    near(findQuantityValue(model, "QTY-DK-W"), 10.5 * 40 * 0.22 * 24.5);
    expect(findQuantityValue(model, "QTY-PV-VOL")).toBeNull();
    expect(model.items.find((i) => i.quantityId === "QTY-PV-VOL")?.status).toBe("NOT_AVAILABLE");
    expect(model.items.find((i) => i.quantityId === "QTY-MG-W")?.calculationBasis).toBe(
      "USER_PROVIDED_UNVERIFIED",
    );
    expect(model.items.find((i) => i.quantityId === "QTY-PAINT-GEOM")?.calculationBasis).toBe(
      "DEVELOPMENT_GEOMETRIC_SURFACE_ESTIMATE",
    );
  });

  it("GOLD-QTY-002 asymmetric multi-girder without unit weights", () => {
    const model = buildQuantityModel(projectWithGoldQty002());
    const webH = 2.5 - 0.02 - 0.025;
    const aTot = 0.5 * 0.02 + 0.6 * 0.025 + 0.012 * webH;
    near(findQuantityValue(model, "QTY-MG-VALL"), aTot * 200 * 5);
    near(findQuantityValue(model, "QTY-DK-VOL"), 12 * 200 * 0.25);
    expect(findQuantityValue(model, "QTY-MG-W")).toBeNull();
    expect(findQuantityValue(model, "QTY-DK-W")).toBeNull();
    expect(findQuantityValue(model, "QTY-SUM-GIRDER-N")).toBe(5);
  });

  it("marks STALE and rejects export after input edit", () => {
    const generated = projectWithGoldQty001();
    const staleProject = withBridgeStructureField(generated, "girderCount", 5);
    const model = buildQuantityModel(staleProject);
    expect(model.stale).toBe(true);
    expect(model.items.some((i) => i.status === "STALE")).toBe(true);
    expect(() => assertQuantityModelExportable(model)).toThrow(/STALE/);
  });

  it("CSV/JSON share values and include BOM + checksum fields", () => {
    const model = buildQuantityModel(projectWithGoldQty001());
    const json = quantityModelToJson(model);
    const csv = quantityModelToCsv(model);
    expect(csv.charCodeAt(0)).toBe(0xfeff);
    expect(csv).toContain(
      "quantityId,category,label,value,unit,status,basis,warnings,inputRevision,inputChecksum",
    );
    expect(csv).toContain(model.inputChecksum);
    const parsed = JSON.parse(json) as typeof model;
    expect(parsed.inputChecksum).toBe(model.inputChecksum);
    expect(parsed.items.find((i) => i.quantityId === "QTY-MG-VALL")?.value).toBe(
      findQuantityValue(model, "QTY-MG-VALL"),
    );
  });

  it("separates approximate secondary volume from exact main girder volume", () => {
    let project = projectWithGoldQty001();
    project = withBridgeStructureField(project, "stiffenerSpacing", 2);
    const regenerated = generateOrThrow(project);
    const model = buildQuantityModel(regenerated);
    const exact = model.items.find((i) => i.quantityId === "QTY-MG-VALL");
    const approx = model.items.find((i) => i.quantityId === "QTY-ST-V-APPROX");
    expect(exact?.calculationBasis).toBe("EXACT_GEOMETRY_DEVELOPMENT");
    expect(approx?.calculationBasis).toBe("APPROXIMATE_VISUALIZATION_ASSUMPTION");
    expect(exact?.warnings.join(" ")).toMatch(/補剛材・対傾構・横構・横桁は含まない/);
  });

  it("does not invent empty draft quantities as detailed steel", () => {
    const empty = withBridgeStructureInputDraft(createDefaultProject(), () =>
      createEmptyBridgeStructureInputDraft(),
    );
    const model = buildQuantityModel(empty, { forceStale: true });
    expect(model.items.some((i) => i.quantityId === "QTY-BLOCKED" || i.status === "INCOMPLETE")).toBe(
      true,
    );
  });
});
