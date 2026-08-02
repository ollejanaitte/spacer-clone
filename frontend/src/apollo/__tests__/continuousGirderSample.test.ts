import { describe, expect, it } from "vitest";
import { createDefaultProject } from "../../data/defaultProject";
import {
  CONTINUOUS_GIRDER_SAMPLE_SPANS,
  applyContinuousGirderSampleInput,
  BridgeSystem,
  generateBridgeStructureFromInput,
  getBridgeStructureInputDraft,
  validateBridgeStructureInputDraft,
} from "../bridgeStructure";

describe("continuous girder sample input (C2)", () => {
  it("fills [30,35,30] spans and marks STALE without auto-generating", () => {
    const project = applyContinuousGirderSampleInput(createDefaultProject());
    const draft = getBridgeStructureInputDraft(project);
    expect(draft.bridgeSystem).toBe(BridgeSystem.CONTINUOUS);
    expect(draft.spans.map((span) => span.length)).toEqual([...CONTINUOUS_GIRDER_SAMPLE_SPANS]);
    expect(draft.bridgeLength).toBe(95);
    expect(draft.spanLength).toBeNull();
    expect(draft.generatedAt).toBeNull();
    expect(project.apolloBsdd?.structuralDesignModel).toBeUndefined();
  });

  it("validates and generates from the continuous sample", () => {
    const project = applyContinuousGirderSampleInput(createDefaultProject());
    const draft = getBridgeStructureInputDraft(project);
    const validation = validateBridgeStructureInputDraft(draft);
    const generated = generateBridgeStructureFromInput(project, draft);
    expect(validation.complete).toBe(true);
    expect(generated.ok).toBe(true);
    if (!generated.ok) return;
    expect(generated.project.apolloBsdd?.phase1ScopeAssertion?.spanSystem).toBe("continuous");
    for (const girder of generated.project.apolloBsdd?.structuralDesignModel?.mainGirders ?? []) {
      expect(girder.designStatus).toBe("NOT_AUTHORIZED");
    }
  });
});
