import { describe, expect, it } from "vitest";
import { createDefaultProject } from "../../data/defaultProject";
import {
  computeBridgeStructureApproximateQuantities,
  generateBridgeStructureFromInput,
  getBridgeStructureInputDraft,
  getBridgeStructureQuantities,
  withBridgeStructureField,
} from "../bridgeStructure";

function fillValidInput(project: ReturnType<typeof createDefaultProject>) {
  let next = project;
  const values: Record<string, number> = {
    spanLength: 40,
    bridgeLength: 200,
    width: 12,
    girderCount: 4,
    girderSpacing: 3,
    girderDepth: 2.5,
    topFlangeWidth: 0.5,
    topFlangeThickness: 0.02,
    bottomFlangeWidth: 0.6,
    bottomFlangeThickness: 0.025,
    webThickness: 0.012,
    deckThickness: 0.25,
    crossBeamSpacing: 5,
  };
  for (const [key, value] of Object.entries(values)) {
    next = withBridgeStructureField(
      next,
      key as keyof ReturnType<typeof getBridgeStructureInputDraft>,
      value,
    );
  }
  return next;
}

describe("bridge structure approximate quantities", () => {
  it("returns INCOMPLETE when required fields are missing", () => {
    const draft = getBridgeStructureInputDraft(createDefaultProject());
    const quantities = computeBridgeStructureApproximateQuantities(draft, false);
    expect(quantities).toHaveLength(1);
    expect(quantities[0]?.label).toBe("概算数量");
    expect(quantities[0]?.status).toBe("INCOMPLETE");
    expect(quantities[0]?.value).toBeNull();
  });

  it("computes geometry-only volumes with NOT_AUTHORIZED status when input is complete", () => {
    const project = fillValidInput(createDefaultProject());
    const draft = getBridgeStructureInputDraft(project);
    const quantities = computeBridgeStructureApproximateQuantities(draft, true);

    const byLabel = new Map(quantities.map((entry) => [entry.label, entry]));
    expect(byLabel.get("支間数（概算）")).toMatchObject({ value: 5, status: "NOT_AUTHORIZED" });
    expect(byLabel.get("横桁本数（概算）")).toMatchObject({ value: 41, status: "NOT_AUTHORIZED" });
    expect(byLabel.get("床版体積（概算）")).toMatchObject({
      value: 600,
      units: "m³",
      status: "NOT_AUTHORIZED",
    });

    const sectionArea = byLabel.get("主桁断面積（概算）");
    expect(sectionArea?.status).toBe("NOT_AUTHORIZED");
    expect(sectionArea?.value).toBeCloseTo(0.05446, 4);

    const girderVolume = byLabel.get("主桁鋼体積（概算）");
    expect(girderVolume?.status).toBe("NOT_AUTHORIZED");
    expect(girderVolume?.value).toBeCloseTo(43.568, 2);

    const crossBeamVolume = byLabel.get("横桁鋼体積（概算）");
    expect(crossBeamVolume?.status).toBe("NOT_AUTHORIZED");
    expect(crossBeamVolume?.value).toBeCloseTo(11.07, 2);
  });

  it("surfaces INCOMPLETE girder volume when section dimensions are inconsistent", () => {
    const project = fillValidInput(createDefaultProject());
    const invalid = withBridgeStructureField(project, "girderDepth", 0.03);
    const draft = getBridgeStructureInputDraft(invalid);
    const quantities = computeBridgeStructureApproximateQuantities(draft, true);
    const girderVolume = quantities.find((entry) => entry.label === "主桁鋼体積（概算）");
    expect(girderVolume?.status).toBe("INCOMPLETE");
    expect(girderVolume?.value).toBeNull();
  });

  it("returns INCOMPLETE summary when SDM exists but input is stale", () => {
    const project = fillValidInput(createDefaultProject());
    const generated = generateBridgeStructureFromInput(project, getBridgeStructureInputDraft(project));
    expect(generated.ok).toBe(true);
    if (!generated.ok) return;

    const stale = withBridgeStructureField(generated.project, "bridgeLength", 180);
    const quantities = getBridgeStructureQuantities(stale);
    expect(quantities).toHaveLength(1);
    expect(quantities[0]).toMatchObject({
      label: "概算数量",
      status: "INCOMPLETE",
      value: null,
    });
    expect(quantities[0]?.note).toContain("再生成");
  });

  it("returns INCOMPLETE for non-divisible span ratio instead of rounding", () => {
    let project = fillValidInput(createDefaultProject());
    project = withBridgeStructureField(project, "bridgeLength", 100);
    project = withBridgeStructureField(project, "spanLength", 30);
    const draft = getBridgeStructureInputDraft(project);
    const quantities = computeBridgeStructureApproximateQuantities(draft, true);

    expect(quantities).toHaveLength(1);
    expect(quantities[0]?.status).toBe("INCOMPLETE");
    expect(quantities[0]?.value).toBeNull();
    expect(quantities[0]?.note).toContain("割り切れる");
  });
});
