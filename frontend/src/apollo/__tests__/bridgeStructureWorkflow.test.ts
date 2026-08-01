import { describe, expect, it } from "vitest";
import { createDefaultProject } from "../../data/defaultProject";
import {
  generateBridgeStructureFromInput,
  getBridgeStructureInputDraft,
  stableUuidFromSeed,
  validateBridgeStructureInputDraft,
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

describe("bridgeStructure workflow", () => {
  it("generates StructuralDesignModel with NOT_AUTHORIZED entities and compositeAction false", () => {
    const project = fillValidInput(createDefaultProject());
    const input = getBridgeStructureInputDraft(project);
    const validation = validateBridgeStructureInputDraft(input);
    expect(validation.complete).toBe(true);

    const result = generateBridgeStructureFromInput(project, input);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const sdm = result.project.apolloBsdd?.structuralDesignModel;
    expect(sdm).toBeDefined();
    expect(sdm!.nonCompositeAssertion.compositeAction).toBe(false);
    expect(sdm!.mainGirders.length).toBe(4);
    expect(sdm!.rcDecks.length).toBe(1);
    expect(sdm!.crossBeams.length).toBeGreaterThan(0);

    for (const girder of sdm!.mainGirders) {
      expect(girder.designStatus).toBe("NOT_AUTHORIZED");
      expect(girder.compositeAction).toBe(false);
    }
    for (const deck of sdm!.rcDecks) {
      expect(deck.designStatus).toBe("NOT_AUTHORIZED");
      expect(deck.compositeAction).toBe(false);
    }
    for (const crossBeam of sdm!.crossBeams) {
      expect(crossBeam.designStatus).toBe("NOT_AUTHORIZED");
    }

    expect(result.quantities.some((entry) => entry.status === "NOT_AUTHORIZED")).toBe(true);
    expect(
      result.quantities.every(
        (entry) => entry.status === "NOT_AUTHORIZED" || entry.status === "INCOMPLETE",
      ),
    ).toBe(true);
  });

  it("preserves stable entity IDs across regeneration", () => {
    const project = fillValidInput(createDefaultProject());
    const input = getBridgeStructureInputDraft(project);
    const first = generateBridgeStructureFromInput(project, input);
    expect(first.ok).toBe(true);
    if (!first.ok) return;

    const second = generateBridgeStructureFromInput(first.project, getBridgeStructureInputDraft(first.project));
    expect(second.ok).toBe(true);
    if (!second.ok) return;

    const firstIds = first.project.apolloBsdd?.structuralDesignModel?.mainGirders.map(
      (entity) => entity.mainGirderId,
    );
    const secondIds = second.project.apolloBsdd?.structuralDesignModel?.mainGirders.map(
      (entity) => entity.mainGirderId,
    );
    expect(secondIds).toEqual(firstIds);
  });

  it("rejects generation when required fields are missing", () => {
    const project = createDefaultProject();
    const input = getBridgeStructureInputDraft(project);
    const result = generateBridgeStructureFromInput(project, input);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.diagnostics.length).toBeGreaterThan(0);
  });

  it("derives deterministic UUIDs from stable seeds", () => {
    const left = stableUuidFromSeed("project-a:MainGirder:girder-0");
    const right = stableUuidFromSeed("project-a:MainGirder:girder-0");
    const other = stableUuidFromSeed("project-a:MainGirder:girder-1");
    expect(left).toBe(right);
    expect(left).not.toBe(other);
  });
});
