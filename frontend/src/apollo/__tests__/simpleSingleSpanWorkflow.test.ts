import { describe, expect, it } from "vitest";
import { createDefaultProject } from "../../data/defaultProject";
import {
  applySimpleSingleSpanSampleInput,
  clearBridgeStructureInput,
  generateBridgeStructureFromInput,
  getBridgeStructureInputDraft,
  isBridgeStructureGenerationCurrent,
  validateBridgeStructureInputDraft,
} from "../bridgeStructure";
import {
  exportApolloProjectToText,
  importApolloProjectFromText,
} from "../importExport";

describe("simple single-span sample workflow (S2 verification)", () => {
  it("runs the full sample workflow: fill, validate, generate, quantify", () => {
    const project = applySimpleSingleSpanSampleInput(createDefaultProject());
    const draft = getBridgeStructureInputDraft(project);

    const validation = validateBridgeStructureInputDraft(draft);
    expect(validation.complete).toBe(true);

    const generated = generateBridgeStructureFromInput(project, draft);
    expect(generated.ok).toBe(true);
    if (!generated.ok) return;

    const sdm = generated.project.apolloBsdd?.structuralDesignModel;
    expect(sdm?.mainGirders).toHaveLength(4);
    // spanSystem lives on BSDD phase1ScopeAssertion (not SDM) — single source of truth
    expect(generated.project.apolloBsdd?.phase1ScopeAssertion?.spanSystem).toBe(
      "simple",
    );
    expect(generated.project.apolloBsdd?.bridge.spans).toHaveLength(1);
    expect(generated.project.apolloBsdd?.bridge.supports).toHaveLength(2);

    for (const member of [...(sdm?.mainGirders ?? [])]) {
      expect(member.designStatus).toBe("NOT_AUTHORIZED");
    }
    for (const support of generated.project.apolloBsdd?.bridge.supports ?? []) {
      expect(support.fixity).toBe("pinned");
    }

    expect(isBridgeStructureGenerationCurrent(generated.project)).toBe(true);
  });

  it("stays STALE after applying the sample until the user generates", () => {
    const project = applySimpleSingleSpanSampleInput(createDefaultProject());
    expect(isBridgeStructureGenerationCurrent(project)).toBe(false);
    expect(project.apolloBsdd?.structuralDesignModel).toBeUndefined();
  });

  it("becomes STALE again after clearing the sample", () => {
    let project = applySimpleSingleSpanSampleInput(createDefaultProject());
    const generated = generateBridgeStructureFromInput(
      project,
      getBridgeStructureInputDraft(project),
    );
    expect(generated.ok).toBe(true);
    if (!generated.ok) return;
    expect(isBridgeStructureGenerationCurrent(generated.project)).toBe(true);

    project = clearBridgeStructureInput(generated.project);
    expect(isBridgeStructureGenerationCurrent(project)).toBe(false);
    expect(getBridgeStructureInputDraft(project).generatedAt).toBeNull();
  });

  it("round-trips the sample values and generated model through save/reload", () => {
    const project = applySimpleSingleSpanSampleInput(createDefaultProject());
    const generated = generateBridgeStructureFromInput(
      project,
      getBridgeStructureInputDraft(project),
    );
    expect(generated.ok).toBe(true);
    if (!generated.ok) return;

    const exported = exportApolloProjectToText(generated.project);
    expect(exported.ok).toBe(true);
    if (!exported.ok) return;

    const imported = importApolloProjectFromText(exported.content);
    expect(imported.ok).toBe(true);
    if (!imported.ok) return;

    const draft = imported.project.apolloBridgeStructureInput;
    expect(draft?.spanLength).toBe(30);
    expect(draft?.bridgeLength).toBe(30);
    expect(draft?.girderCount).toBe(4);
    expect(draft?.steelUnitWeight).toBe(77);
    expect(draft?.rcUnitWeight).toBe(24.5);
    expect(isBridgeStructureGenerationCurrent(imported.project)).toBe(true);

    const sdm = imported.project.apolloBsdd?.structuralDesignModel;
    expect(sdm?.mainGirders).toHaveLength(4);
    expect(imported.project.apolloBsdd?.bridge.supports).toHaveLength(2);
  });

  it("keeps unit weights as USER_PROVIDED_UNVERIFIED through the workflow", () => {
    const project = applySimpleSingleSpanSampleInput(createDefaultProject());
    const generated = generateBridgeStructureFromInput(
      project,
      getBridgeStructureInputDraft(project),
    );
    expect(generated.ok).toBe(true);
    if (!generated.ok) return;

    const sdm = generated.project.apolloBsdd?.structuralDesignModel;
    for (const member of sdm?.mainGirders ?? []) {
      expect(member.designStatus).toBe("NOT_AUTHORIZED");
    }
    const bsdd = generated.project.apolloBsdd;
    expect(bsdd?.materialDefinitions[0]?.unitWeight.value).toBe(77);
    expect(bsdd?.bridge.deck.unitWeight.value).toBe(24.5);
    expect(bsdd?.materialDefinitions[0]?.unitWeight.adoptionStatus).toBe("PENDING");
    expect(bsdd?.bridge.deck.unitWeight.adoptionStatus).toBe("PENDING");
  });
});
