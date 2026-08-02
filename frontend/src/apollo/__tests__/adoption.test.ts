import { describe, expect, it } from "vitest";
import { createDefaultProject } from "../../data/defaultProject";
import type { ProjectModel } from "../../types";
import {
  generateBridgeStructureFromInput,
  getBridgeStructureInputDraft,
  getBridgeStructureUnitWeightAdoption,
  withAdoptedBridgeStructureUnitWeight,
  withBridgeStructureField,
  withBridgeStructureUnitWeightReset,
} from "../bridgeStructure";
import { SELECTED_NUMERIC_CONTEXT } from "../testing/numericFixtures";
import { fillContinuousBridgeStructureInput } from "../testing/bridgeStructureFixtures";

function fillValidInput(project: ProjectModel): ProjectModel {
  return fillContinuousBridgeStructureInput(project);
}

function generateStructure(project: ProjectModel): ProjectModel {
  const result = generateBridgeStructureFromInput(project, getBridgeStructureInputDraft(project));
  expect(result.ok).toBe(true);
  if (!result.ok) {
    throw new Error("generation failed");
  }
  return result.project;
}

describe("bridge structure unit weight adoption", () => {
  it("reports UNKNOWN adoption before generation", () => {
    expect(getBridgeStructureUnitWeightAdoption(createDefaultProject(), "steel")).toBe("UNKNOWN");
    expect(getBridgeStructureUnitWeightAdoption(createDefaultProject(), "rc")).toBe("UNKNOWN");
  });

  it("records PENDING unit weights when user values are present after generation", () => {
    let project = fillValidInput(createDefaultProject());
    project = withBridgeStructureField(project, "steelUnitWeight", 77);
    project = withBridgeStructureField(project, "rcUnitWeight", 24);
    const generated = generateStructure(project);

    const document = generated.apolloBsdd;
    expect(document?.materialDefinitions[0]?.unitWeight.adoptionStatus).toBe("PENDING");
    expect(document?.bridge.deck.unitWeight.adoptionStatus).toBe("PENDING");
    expect(getBridgeStructureUnitWeightAdoption(generated, "steel")).toBe("PENDING");
    expect(getBridgeStructureUnitWeightAdoption(generated, "rc")).toBe("PENDING");
  });

  it("records UNKNOWN unit weights when user values are absent after generation", () => {
    const generated = generateStructure(fillValidInput(createDefaultProject()));
    expect(generated.apolloBsdd?.materialDefinitions[0]?.unitWeight.adoptionStatus).toBe("UNKNOWN");
    expect(generated.apolloBsdd?.bridge.deck.unitWeight.adoptionStatus).toBe("UNKNOWN");
  });

  it("rejects ADOPTED under the default NOT_SELECTED numeric authority (fail-closed)", () => {
    let project = fillValidInput(createDefaultProject());
    project = withBridgeStructureField(project, "steelUnitWeight", 77);
    const generated = generateStructure(project);

    const result = withAdoptedBridgeStructureUnitWeight(generated, "steel");
    expect(result.ok).toBe(false);
    if (result.ok) return;

    expect(result.diagnostics.join(" / ")).toContain("数値設計権限");
    expect(getBridgeStructureUnitWeightAdoption(generated, "steel")).toBe("PENDING");
  });

  it("permits ADOPTED under an explicit granted numeric context", () => {
    let project = fillValidInput(createDefaultProject());
    project = withBridgeStructureField(project, "steelUnitWeight", 77);
    project = withBridgeStructureField(project, "rcUnitWeight", 24);
    const generated = generateStructure(project);

    const steel = withAdoptedBridgeStructureUnitWeight(generated, "steel", SELECTED_NUMERIC_CONTEXT);
    expect(steel.ok).toBe(true);
    if (!steel.ok) return;
    expect(getBridgeStructureUnitWeightAdoption(steel.project, "steel")).toBe("ADOPTED");
    expect(steel.project.apolloBsdd?.materialDefinitions[0]?.unitWeight.sourceLocator).toMatch(
      /^user:apollo:vvs02:steel-unit-weight$/,
    );
    expect(steel.project.apolloBsdd?.materialDefinitions[0]?.unitWeight.decisionId).toBeDefined();

    const rc = withAdoptedBridgeStructureUnitWeight(steel.project, "rc", SELECTED_NUMERIC_CONTEXT);
    expect(rc.ok).toBe(true);
    if (!rc.ok) return;
    expect(getBridgeStructureUnitWeightAdoption(rc.project, "rc")).toBe("ADOPTED");
  });

  it("rejects adoption when the unit weight is not entered", () => {
    const generated = generateStructure(fillValidInput(createDefaultProject()));
    const result = withAdoptedBridgeStructureUnitWeight(generated, "rc", SELECTED_NUMERIC_CONTEXT);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.diagnostics.join(" / ")).toContain("入力されていません");
  });

  it("rejects adoption when no structure has been generated", () => {
    const project = fillValidInput(createDefaultProject());
    const result = withAdoptedBridgeStructureUnitWeight(project, "steel", SELECTED_NUMERIC_CONTEXT);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.diagnostics.join(" / ")).toContain("構造が生成されていないため");
  });

  it("resets ADOPTED unit weights back to PENDING and clears trace fields", () => {
    let project = fillValidInput(createDefaultProject());
    project = withBridgeStructureField(project, "steelUnitWeight", 77);
    const generated = generateStructure(project);
    const adopted = withAdoptedBridgeStructureUnitWeight(generated, "steel", SELECTED_NUMERIC_CONTEXT);
    expect(adopted.ok).toBe(true);
    if (!adopted.ok) return;
    expect(getBridgeStructureUnitWeightAdoption(adopted.project, "steel")).toBe("ADOPTED");

    const reset = withBridgeStructureUnitWeightReset(adopted.project, "steel");
    expect(getBridgeStructureUnitWeightAdoption(reset, "steel")).toBe("PENDING");
    expect(reset.apolloBsdd?.materialDefinitions[0]?.unitWeight.sourceLocator).toBeNull();
    expect(reset.apolloBsdd?.materialDefinitions[0]?.unitWeight.decisionId).toBeNull();
  });

  it("resets to UNKNOWN when the unit weight value is null", () => {
    const generated = generateStructure(fillValidInput(createDefaultProject()));
    const reset = withBridgeStructureUnitWeightReset(generated, "rc");
    expect(getBridgeStructureUnitWeightAdoption(reset, "rc")).toBe("UNKNOWN");
  });
});
