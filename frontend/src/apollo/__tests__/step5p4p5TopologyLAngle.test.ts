import { describe, expect, it } from "vitest";
import { createDefaultProject } from "../../data/defaultProject";
import {
  generateBridgeStructureFromInput,
  getBridgeStructureInputDraft,
  withLateralAngleSection,
} from "../bridgeStructure";
import { buildApolloVisualizationModelOrThrow } from "../visualization";
import { fillSimpleSingleBridgeStructureInput } from "../testing/bridgeStructureFixtures";
import { applyAndGenerateSimpleSingleSpanSample } from "../bridgeStructure/sampleInputs";

describe("Step 5-3 P4/P5 topology labels and L-angle", () => {
  it("labels cross beams and sway with dual JP/EN text", () => {
    const project = applyAndGenerateSimpleSingleSpanSample(createDefaultProject());
    expect(project.ok).toBe(true);
    if (!project.ok) return;
    const model = buildApolloVisualizationModelOrThrow({ project: project.project });
    const cross = model.solidGeometryParameters.find((s) => s.kind === "cross_beam");
    expect(cross?.displayLabel).toContain("横桁");
    expect(cross?.displayLabel).toContain("横桁");
    const sway = model.solidGeometryParameters.find(
      (s) => s.kind === "bracing" && s.displayLabel.includes("対傾構"),
    );
    expect(sway).toBeDefined();
    expect(model.assumptions.some((a) => a.code === "dec-s5-0005-cross-beam-sway-labels")).toBe(true);
    expect(model.assumptions.some((a) => a.code === "dec-s5-0006-sway-v-topology-development")).toBe(
      true,
    );
  });

  it("uses L-angle section dimensions when lateralAngleSection is enabled", () => {
    let project = fillSimpleSingleBridgeStructureInput(createDefaultProject());
    project = withLateralAngleSection(project, {
      enabled: true,
      legA: 0.075,
      legB: 0.075,
      thickness: 0.009,
      catalogId: "CAT-S5-LAT-UNVERIFIED",
      orientation: "LEG_A_ALONG_LOCAL_Y",
    });
    const draft = getBridgeStructureInputDraft(project);
    // enable laterals
    const generated = generateBridgeStructureFromInput(
      {
        ...project,
        apolloBridgeStructureInput: {
          ...draft,
          lateralBracingEnabled: true,
          upperLateralBracingEnabled: true,
          swayBracingInterval: 1,
        },
      },
      {
        ...draft,
        lateralBracingEnabled: true,
        upperLateralBracingEnabled: true,
        swayBracingInterval: 1,
      },
    );
    expect(generated.ok).toBe(true);
    if (!generated.ok) return;
    const model = buildApolloVisualizationModelOrThrow({ project: generated.project });
    const laterals = model.solidGeometryParameters.filter(
      (s) => s.kind === "bracing" && (s.displayLabel.includes("横構") || s.displayLabel.includes("対傾構")),
    );
    expect(laterals.length).toBeGreaterThan(0);
    expect(laterals.every((s) => s.dimensionsM.sectionType === 1)).toBe(true);
    expect(laterals.every((s) => s.dimensionsM.legA === 0.075)).toBe(true);
    expect(model.assumptions.some((a) => a.code === "dec-s5-0007-lateral-l-angle")).toBe(true);
  });

  it("keeps cylinder section when L-angle is disabled", () => {
    let project = fillSimpleSingleBridgeStructureInput(createDefaultProject());
    project = withLateralAngleSection(project, {
      enabled: false,
      legA: null,
      legB: null,
      thickness: null,
      catalogId: "CAT-S5-LAT-UNVERIFIED",
      orientation: "LEG_A_ALONG_LOCAL_Y",
    });
    const draft = getBridgeStructureInputDraft(project);
    const generated = generateBridgeStructureFromInput(
      {
        ...project,
        apolloBridgeStructureInput: {
          ...draft,
          lateralBracingEnabled: true,
          swayBracingInterval: null,
        },
      },
      { ...draft, lateralBracingEnabled: true, swayBracingInterval: null },
    );
    expect(generated.ok).toBe(true);
    if (!generated.ok) return;
    const model = buildApolloVisualizationModelOrThrow({ project: generated.project });
    const laterals = model.solidGeometryParameters.filter((s) => s.kind === "bracing");
    expect(laterals.length).toBeGreaterThan(0);
    expect(laterals.every((s) => s.dimensionsM.sectionType === 0)).toBe(true);
    expect(laterals.every((s) => typeof s.dimensionsM.diameter === "number")).toBe(true);
  });
});
