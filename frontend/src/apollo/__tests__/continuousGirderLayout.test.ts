import { describe, expect, it } from "vitest";
import { createDefaultProject } from "../../data/defaultProject";
import {
  applySimpleSingleSpanSampleInput,
  BridgeSystem,
  buildContinuousLayout,
  buildSupportsFromSpans,
  generateBridgeStructureFromInput,
  getBridgeStructureInputDraft,
  parseBridgeStructureInputDraft,
  SupportLayoutRole,
  validateBridgeLayoutContract,
  validateBridgeStructureInputDraft,
  validateBridgeStructureInputPersistence,
} from "../bridgeStructure";
import {
  exportApolloProjectToText,
  importApolloProjectFromText,
} from "../importExport";
import type { ApolloBridgeStructureInputDraft } from "../bridgeStructure/types";

function baseContinuousFields(): Omit<
  ApolloBridgeStructureInputDraft,
  "schemaVersion" | "bridgeSystem" | "spans" | "supports" | "bridgeLength" | "spanLength" | "generatedAt"
> {
  return {
    width: 10.5,
    girderCount: 4,
    girderSpacing: 3.0,
    girderDepth: 2.0,
    topFlangeWidth: 0.45,
    topFlangeThickness: 0.025,
    bottomFlangeWidth: 0.55,
    bottomFlangeThickness: 0.03,
    webThickness: 0.012,
    deckThickness: 0.22,
    crossBeamSpacing: 5.0,
    stiffenerSpacing: null,
    swayBracingInterval: null,
    steelUnitWeight: null,
    rcUnitWeight: null,
    lateralBracingEnabled: false,
  };
}

function buildContinuousInput(spanLengths: readonly number[]): ApolloBridgeStructureInputDraft {
  const layout = buildContinuousLayout(spanLengths);
  const bridgeLength = spanLengths.reduce((sum, length) => sum + length, 0);
  return {
    schemaVersion: "1.0.0",
    ...baseContinuousFields(),
    bridgeSystem: BridgeSystem.CONTINUOUS,
    bridgeLength,
    spanLength: null,
    spans: layout.spans,
    supports: layout.supports,
    generatedAt: null,
  };
}

describe("continuous girder layout contracts (C1)", () => {
  it.each([
    { label: "2 spans", spans: [30, 30] as const },
    { label: "3 spans (C2 sample)", spans: [30, 35, 30] as const },
    { label: "5 spans", spans: [20, 25, 30, 25, 20] as const },
  ])("validates CONTINUOUS layout for $label", ({ spans }) => {
    const draft = buildContinuousInput(spans);
    const validation = validateBridgeStructureInputDraft(draft);
    expect(validation.complete).toBe(true);
    expect(validateBridgeLayoutContract({
      bridgeSystem: draft.bridgeSystem,
      bridgeLength: draft.bridgeLength,
      spanLength: draft.spanLength,
      spans: draft.spans,
      supports: draft.supports,
    })).toEqual([]);
  });

  it("keeps SIMPLE_SINGLE regression for the sample workflow", () => {
    const project = applySimpleSingleSpanSampleInput(createDefaultProject());
    const draft = getBridgeStructureInputDraft(project);
    expect(draft.bridgeSystem).toBe(BridgeSystem.SIMPLE_SINGLE);
    expect(validateBridgeStructureInputDraft(draft).complete).toBe(true);
  });

  it("fail-closes SIMPLE_MULTIPLE", () => {
    const draft = buildContinuousInput([30, 30]);
    const rejected = { ...draft, bridgeSystem: BridgeSystem.SIMPLE_MULTIPLE };
    const diagnostics = validateBridgeLayoutContract({
      bridgeSystem: rejected.bridgeSystem,
      bridgeLength: rejected.bridgeLength,
      spanLength: rejected.spanLength,
      spans: rejected.spans,
      supports: rejected.supports,
    });
    expect(diagnostics.join(" ")).toContain("SIMPLE_MULTIPLE");
    expect(validateBridgeStructureInputDraft(rejected).complete).toBe(false);
  });

  it("round-trips CONTINUOUS layout through save/reload", () => {
    const project = createDefaultProject();
    const draft = buildContinuousInput([30, 35, 30]);
    const generated = generateBridgeStructureFromInput(
      { ...project, apolloBridgeStructureInput: draft },
      draft,
    );
    expect(generated.ok).toBe(true);
    if (!generated.ok) return;

    const exported = exportApolloProjectToText(generated.project);
    expect(exported.ok).toBe(true);
    if (!exported.ok) return;

    const imported = importApolloProjectFromText(exported.content);
    expect(imported.ok).toBe(true);
    if (!imported.ok) return;

    const reloaded = imported.project.apolloBridgeStructureInput;
    expect(reloaded?.bridgeSystem).toBe(BridgeSystem.CONTINUOUS);
    expect(reloaded?.spans.map((span) => span.length)).toEqual([30, 35, 30]);
    expect(reloaded?.supports).toHaveLength(4);
    expect(reloaded?.bridgeLength).toBe(95);
  });

  it("uses cumulative stations and abutment/pier roles", () => {
    const spans = buildContinuousLayout([30, 35, 30]);
    const supports = buildSupportsFromSpans(spans.spans);
    expect(supports.map((support) => support.station)).toEqual([0, 30, 65, 95]);
    expect(supports[0]?.role).toBe(SupportLayoutRole.ABUTMENT);
    expect(supports[1]?.role).toBe(SupportLayoutRole.PIER);
    expect(supports[2]?.role).toBe(SupportLayoutRole.PIER);
    expect(supports[3]?.role).toBe(SupportLayoutRole.ABUTMENT);
  });

  it("generates BSDD with continuous spanSystem and pier supports", () => {
    const project = createDefaultProject();
    const draft = buildContinuousInput([30, 35, 30]);
    const generated = generateBridgeStructureFromInput(
      { ...project, apolloBridgeStructureInput: draft },
      draft,
    );
    expect(generated.ok).toBe(true);
    if (!generated.ok) return;

    const bsdd = generated.project.apolloBsdd;
    expect(bsdd?.phase1ScopeAssertion?.spanSystem).toBe("continuous");
    expect(bsdd?.bridge.spans).toHaveLength(3);
    expect(bsdd?.bridge.supports).toHaveLength(4);
    expect(bsdd?.bridge.supports.map((support) => support.station.value)).toEqual([0, 30, 65, 95]);
    expect(bsdd?.bridge.supports[1]?.role).toBe("pier");
    for (const girder of bsdd?.structuralDesignModel?.mainGirders ?? []) {
      expect(girder.designStatus).toBe("NOT_AUTHORIZED");
    }
  });

  it("defaults legacy persisted JSON to SIMPLE_SINGLE", () => {
    const parsed = parseBridgeStructureInputDraft({
      schemaVersion: "1.0.0",
      spanLength: 30,
      bridgeLength: 30,
    });
    expect(parsed?.bridgeSystem).toBe(BridgeSystem.SIMPLE_SINGLE);
    expect(parsed?.spans).toEqual([]);
    expect(parsed?.supports).toEqual([]);
    expect(validateBridgeStructureInputPersistence({
      schemaVersion: "1.0.0",
      spanLength: 30,
      bridgeLength: 30,
      generatedAt: null,
    })).toEqual([]);
  });

  it("rejects duplicate span IDs", () => {
    const layout = buildContinuousLayout([30, 30]);
    const draft = buildContinuousInput([30, 30]);
    const invalid = {
      ...draft,
      spans: [
        { id: "span-0", length: 30 },
        { id: "span-0", length: 30 },
      ],
      supports: layout.supports,
    };
    expect(validateBridgeStructureInputDraft(invalid).complete).toBe(false);
  });
});
