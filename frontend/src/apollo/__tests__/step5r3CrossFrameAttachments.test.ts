import { describe, expect, it } from "vitest";
import { createDefaultProject } from "../../data/defaultProject";
import {
  applyAndGenerateSimpleSingleSpanSample,
  attachmentDepthToZ,
  createDefaultCrossFrameAttachment,
  generateBridgeStructureFromInput,
  getBridgeStructureInputDraft,
  parseBridgeStructureInputDraft,
  validateCrossFrameAttachment,
  withCrossFrameAttachment,
} from "../bridgeStructure";
import { buildApolloVisualizationModelOrThrow } from "../visualization";

describe("Step 5-R R3 cross-frame attachment topology", () => {
  it("validates V depths and rejects upper >= lower", () => {
    const ok = createDefaultCrossFrameAttachment(2.0, 0.025, 0.03);
    expect(validateCrossFrameAttachment(ok, 2.0)).toEqual([]);
    expect(
      validateCrossFrameAttachment(
        { ...ok, upperAttachmentDepthFromGirderTop: 1.5, lowerAttachmentDepthFromGirderTop: 1.0 },
        2.0,
      ).some((m) => m.includes("less than")),
    ).toBe(true);
  });

  it("marks non-V patterns as unavailable", () => {
    const config = { ...createDefaultCrossFrameAttachment(), pattern: "X" as const };
    expect(validateCrossFrameAttachment(config, 2.0).some((m) => m.includes("UNAVAILABLE"))).toBe(true);
  });

  it("converts depth-from-top to absolute Z without mesh", () => {
    const girderCenterZ = -1.0;
    const girderDepth = 2.0;
    // top flange upper Z = -1 + 1 = 0; depth 0.5 → z = -0.5
    const z = attachmentDepthToZ(girderCenterZ, girderDepth, 0.5);
    expect(z).toBeCloseTo(-0.5, 9);
  });

  it("migrates 1.4 drafts without inventing attachment depths beyond mid-flange defaults", () => {
    const sample = applyAndGenerateSimpleSingleSpanSample(createDefaultProject());
    expect(sample.ok).toBe(true);
    if (!sample.ok) return;
    const draft = getBridgeStructureInputDraft(sample.project);
    const legacy = {
      ...draft,
      schemaVersion: "1.4.0-development",
      crossFrameAttachment: undefined,
    };
    const parsed = parseBridgeStructureInputDraft(legacy);
    expect(parsed?.schemaVersion).toBe("1.5.0-development");
    expect(parsed?.crossFrameAttachment.provenance).toBe("UNVERIFIED_MIGRATED_DEVELOPMENT");
    expect(parsed?.crossFrameAttachment.pattern).toBe("V");
    expect(parsed?.crossFrameAttachment.upperAttachmentDepthFromGirderTop).toBeCloseTo(
      (draft.topFlangeThickness ?? 0) / 2,
      9,
    );
  });

  it("regenerates sway Z from edited attachment depths and marks STALE until generate", () => {
    const generated = applyAndGenerateSimpleSingleSpanSample(createDefaultProject());
    expect(generated.ok).toBe(true);
    if (!generated.ok) return;

    const draft = getBridgeStructureInputDraft(generated.project);
    const edited = withCrossFrameAttachment(generated.project, {
      ...draft.crossFrameAttachment,
      upperAttachmentDepthFromGirderTop: 0.2,
      lowerAttachmentDepthFromGirderTop: 1.6,
      centerNodeDepthFromGirderTop: 1.6,
      provenance: "USER_PROVIDED_UNVERIFIED",
    });
    expect(getBridgeStructureInputDraft(edited).generatedAt).toBeNull();

    const regen = generateBridgeStructureFromInput(edited, getBridgeStructureInputDraft(edited));
    expect(regen.ok).toBe(true);
    if (!regen.ok) return;

    const model = buildApolloVisualizationModelOrThrow({ project: regen.project });
    const sway = model.solidGeometryParameters.filter(
      (s) =>
        s.kind === "bracing" &&
        (s.displayLabel.includes("対傾構") || s.displayLabel.includes("Sway")),
    );
    expect(sway.length).toBeGreaterThan(0);
    const girderCenterZ = -(draft.girderDepth ?? 2) / 2;
    const expectedUpperZ = attachmentDepthToZ(girderCenterZ, draft.girderDepth!, 0.2);
    const expectedLowerZ = attachmentDepthToZ(girderCenterZ, draft.girderDepth!, 1.6);
    for (const solid of sway) {
      const zs = [solid.path![0]![2]!, solid.path![1]![2]!].sort((a, b) => a - b);
      expect(zs[0]).toBeCloseTo(expectedLowerZ, 6);
      expect(zs[1]).toBeCloseTo(expectedUpperZ, 6);
    }
  });

  it("keeps cross-beam solids distinct from sway bracing", () => {
    const generated = applyAndGenerateSimpleSingleSpanSample(createDefaultProject());
    expect(generated.ok).toBe(true);
    if (!generated.ok) return;
    const model = buildApolloVisualizationModelOrThrow({ project: generated.project });
    const cross = model.solidGeometryParameters.filter((s) => s.kind === "cross_beam");
    const sway = model.solidGeometryParameters.filter(
      (s) =>
        s.kind === "bracing" &&
        (s.displayLabel.includes("対傾構") || s.displayLabel.includes("Sway")),
    );
    expect(cross.length).toBeGreaterThan(0);
    expect(sway.length).toBeGreaterThan(0);
    expect(cross.every((s) => !s.displayLabel.includes("対傾構"))).toBe(true);
  });
});
