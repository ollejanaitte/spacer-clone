import { describe, expect, it } from "vitest";
import { createDefaultProject } from "../../data/defaultProject";
import {
  createEmptyBridgeStructureInputDraft,
  generateBridgeStructureFromInput,
  getBridgeStructureInputDraft,
  isBridgeStructureGenerationCurrent,
  parseBridgeStructureInputDraft,
  resolveSpanCount,
  stableUuidFromSeed,
  validateBridgeStructureInputDraft,
  validateBridgeStructureInputPersistence,
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

  it("rejects non-divisible bridgeLength/spanLength without silent correction", () => {
    let project = fillValidInput(createDefaultProject());
    project = withBridgeStructureField(project, "bridgeLength", 100);
    project = withBridgeStructureField(project, "spanLength", 30);
    const input = getBridgeStructureInputDraft(project);

    expect(resolveSpanCount(100, 30)).toBeNull();
    const validation = validateBridgeStructureInputDraft(input);
    expect(validation.complete).toBe(false);
    expect(validation.diagnostics.join(" ")).toContain("割り切れる");

    const result = generateBridgeStructureFromInput(project, input);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.diagnostics.join(" ")).toContain("割り切れる");
    }
  });

  it("accepts divisible bridgeLength/spanLength and derives four spans", () => {
    let project = fillValidInput(createDefaultProject());
    project = withBridgeStructureField(project, "bridgeLength", 120);
    project = withBridgeStructureField(project, "spanLength", 30);
    const input = getBridgeStructureInputDraft(project);

    expect(resolveSpanCount(120, 30)).toBe(4);
    expect(validateBridgeStructureInputDraft(input).complete).toBe(true);

    const result = generateBridgeStructureFromInput(project, input);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.project.apolloBsdd?.bridge.spans).toHaveLength(4);
  });

  it("rejects girder layout that exceeds deck width", () => {
    let project = fillValidInput(createDefaultProject());
    project = withBridgeStructureField(project, "width", 8);
    project = withBridgeStructureField(project, "girderCount", 4);
    project = withBridgeStructureField(project, "girderSpacing", 3);
    const input = getBridgeStructureInputDraft(project);

    const validation = validateBridgeStructureInputDraft(input);
    expect(validation.complete).toBe(false);
    expect(validation.diagnostics.join(" ")).toContain("主桁配置幅");
    expect(generateBridgeStructureFromInput(project, input).ok).toBe(false);
  });

  it("accepts girder layout at exact deck width equality", () => {
    let project = fillValidInput(createDefaultProject());
    project = withBridgeStructureField(project, "width", 9);
    project = withBridgeStructureField(project, "girderCount", 4);
    project = withBridgeStructureField(project, "girderSpacing", 3);
    const input = getBridgeStructureInputDraft(project);

    expect(validateBridgeStructureInputDraft(input).complete).toBe(true);
    expect(generateBridgeStructureFromInput(project, input).ok).toBe(true);
  });

  it("marks structure generation stale after post-generate input edits", () => {
    const project = fillValidInput(createDefaultProject());
    const input = getBridgeStructureInputDraft(project);
    const generated = generateBridgeStructureFromInput(project, input);
    expect(generated.ok).toBe(true);
    if (!generated.ok) return;

    expect(isBridgeStructureGenerationCurrent(generated.project)).toBe(true);
    expect(getBridgeStructureInputDraft(generated.project).generatedAt).not.toBeNull();

    const edited = withBridgeStructureField(generated.project, "girderCount", 5);
    expect(getBridgeStructureInputDraft(edited).generatedAt).toBeNull();
    expect(isBridgeStructureGenerationCurrent(edited)).toBe(false);
    expect(edited.apolloBsdd?.structuralDesignModel).toBeDefined();
  });

  it("recovers updated girder count after regeneration", () => {
    let project = fillValidInput(createDefaultProject());
    let input = getBridgeStructureInputDraft(project);
    const first = generateBridgeStructureFromInput(project, input);
    expect(first.ok).toBe(true);
    if (!first.ok) return;

    project = withBridgeStructureField(first.project, "girderCount", 2);
    project = withBridgeStructureField(project, "girderSpacing", 4);
    input = getBridgeStructureInputDraft(project);
    expect(isBridgeStructureGenerationCurrent(project)).toBe(false);

    const second = generateBridgeStructureFromInput(project, input);
    expect(second.ok).toBe(true);
    if (!second.ok) return;

    expect(second.project.apolloBsdd?.structuralDesignModel?.mainGirders).toHaveLength(2);
    expect(isBridgeStructureGenerationCurrent(second.project)).toBe(true);
    const firstIds = first.project.apolloBsdd?.structuralDesignModel?.mainGirders.map(
      (entity) => entity.mainGirderId,
    );
    const secondIds = second.project.apolloBsdd?.structuralDesignModel?.mainGirders.map(
      (entity) => entity.mainGirderId,
    );
    expect(secondIds?.[0]).toBe(firstIds?.[0]);
    expect(secondIds?.[1]).toBe(firstIds?.[1]);
  });

  it("treats optional secondary-member and unit-weight fields as nullable without failing validation", () => {
    const project = fillValidInput(createDefaultProject());
    const draft = getBridgeStructureInputDraft(project);
    expect(draft.stiffenerSpacing).toBeNull();
    expect(draft.swayBracingInterval).toBeNull();
    expect(draft.steelUnitWeight).toBeNull();
    expect(draft.rcUnitWeight).toBeNull();
    expect(validateBridgeStructureInputDraft(draft).complete).toBe(true);

    const result = generateBridgeStructureFromInput(project, draft);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const sdm = result.project.apolloBsdd?.structuralDesignModel;
    expect(sdm?.stiffeners).toHaveLength(0);
    expect(sdm?.swayBracings).toHaveLength(0);
    expect(sdm?.lateralBracings).toHaveLength(0);
    expect(sdm?.braceMembers).toHaveLength(0);
  });

  it("validates swayBracingInterval as a positive integer when provided", () => {
    let project = fillValidInput(createDefaultProject());
    project = withBridgeStructureField(project, "swayBracingInterval", 0);
    expect(validateBridgeStructureInputDraft(getBridgeStructureInputDraft(project)).complete).toBe(false);

    project = withBridgeStructureField(project, "swayBracingInterval", 1.5);
    expect(validateBridgeStructureInputDraft(getBridgeStructureInputDraft(project)).complete).toBe(false);

    project = withBridgeStructureField(project, "swayBracingInterval", 2);
    expect(validateBridgeStructureInputDraft(getBridgeStructureInputDraft(project)).complete).toBe(true);
  });

  it("generates sway and lateral entities only when their inputs are enabled", () => {
    let project = fillValidInput(createDefaultProject());
    project = withBridgeStructureField(project, "swayBracingInterval", 2);
    project = withBridgeStructureField(project, "stiffenerSpacing", 25);
    const result = generateBridgeStructureFromInput(project, getBridgeStructureInputDraft(project));
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const sdm = result.project.apolloBsdd?.structuralDesignModel;
    expect(sdm?.stiffeners.length).toBeGreaterThan(0);
    expect(sdm?.swayBracings.length).toBeGreaterThan(0);
    expect(sdm?.lateralBracings).toHaveLength(0);
    for (const member of sdm?.braceMembers ?? []) {
      expect(member.geometryRef.geometryRefId).toBeNull();
      expect(member.geometryRef.bindingStatus).toBe("unbound");
      expect(member.designStatus).toBe("NOT_AUTHORIZED");
    }
  });

  it("persistence validation accepts the new optional and boolean input fields", () => {
    const raw = {
      schemaVersion: "1.0.0",
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
      stiffenerSpacing: 25,
      swayBracingInterval: 2,
      steelUnitWeight: 77,
      rcUnitWeight: 24,
      lateralBracingEnabled: true,
      generatedAt: null,
    };
    expect(validateBridgeStructureInputPersistence(raw)).toEqual([]);

    expect(validateBridgeStructureInputPersistence({ ...raw, swayBracingInterval: "2" })).toContain(
      "apolloBridgeStructureInput.swayBracingInterval must be a finite number or null.",
    );
    expect(validateBridgeStructureInputPersistence({ ...raw, lateralBracingEnabled: "yes" })).toContain(
      "apolloBridgeStructureInput.lateralBracingEnabled must be a boolean or null.",
    );
    expect(validateBridgeStructureInputPersistence({ ...raw, unexpected: 1 })).toContain(
      "apolloBridgeStructureInput contains unsupported field: unexpected.",
    );
  });

  it("parses persisted draft defaults to false for lateralBracingEnabled when absent", () => {
    const empty = createEmptyBridgeStructureInputDraft();
    expect(empty.lateralBracingEnabled).toBe(false);
    expect(parseBridgeStructureInputDraft({ schemaVersion: "1.0.0" })?.lateralBracingEnabled).toBe(false);
    expect(parseBridgeStructureInputDraft({ schemaVersion: "1.0.0", lateralBracingEnabled: true })?.lateralBracingEnabled).toBe(
      true,
    );
  });
});
