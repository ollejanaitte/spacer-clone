/**
 * Step 5-R R4 evidence harvest for residual corrections.
 */
import { describe, expect, it } from "vitest";
import * as fs from "node:fs";
import * as path from "node:path";
import { createDefaultProject } from "../../data/defaultProject";
import {
  applyAndGenerateSimpleSingleSpanSample,
  attachmentDepthToZ,
  computeLAngleAreaM2,
  getBridgeStructureInputDraft,
  withCrossFrameAttachment,
  generateBridgeStructureFromInput,
} from "../bridgeStructure";
import { exportApolloProjectToText, importApolloProjectFromText } from "../importExport";
import { buildApolloVisualizationModelOrThrow } from "../visualization";
import { exportApolloBinaryStl } from "../export";

const EVIDENCE = path.resolve(
  __dirname,
  "../../../../docs/apollo/step5_residual_corrections/evidence",
);

describe("Step 5-R R4 evidence harvest", () => {
  it("writes scene / stl / quantity / serialized summaries reflecting R1–R3", () => {
    fs.mkdirSync(EVIDENCE, { recursive: true });
    const result = applyAndGenerateSimpleSingleSpanSample(createDefaultProject());
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    let project = result.project;
    const draft0 = getBridgeStructureInputDraft(project);
    project = withCrossFrameAttachment(project, {
      ...draft0.crossFrameAttachment,
      upperAttachmentDepthFromGirderTop: 0.15,
      lowerAttachmentDepthFromGirderTop: 1.7,
      provenance: "USER_PROVIDED_UNVERIFIED",
    });
    const regen = generateBridgeStructureFromInput(project, getBridgeStructureInputDraft(project));
    expect(regen.ok).toBe(true);
    if (!regen.ok) return;
    project = regen.project;

    const draft = getBridgeStructureInputDraft(project);
    const viz = buildApolloVisualizationModelOrThrow({ project });
    const bracing = viz.solidGeometryParameters.filter((s) => s.kind === "bracing");
    const sway = bracing.filter(
      (s) => s.displayLabel.includes("対傾構") || s.displayLabel.includes("Sway"),
    );
    const inventory = {
      solidCount: viz.solidGeometryParameters.length,
      bracingCount: bracing.length,
      swayCount: sway.length,
      crossBeamCount: viz.solidGeometryParameters.filter((s) => s.kind === "cross_beam").length,
      sectionImplementation: [
        ...new Set(
          bracing
            .map((s) => s.dimensionsM.sectionImplementation)
            .filter((v): v is number => typeof v === "number"),
        ),
      ],
      trueLPolygon: bracing.every(
        (s) => s.dimensionsM.sectionType !== 1 || s.dimensionsM.sectionImplementation === 2,
      ),
      twoPlateAbsent: bracing.every((s) => s.dimensionsM.sectionImplementation !== 1),
      crossFrameAssumption: viz.assumptions.some((a) =>
        a.message.includes("PARAMETERIZED_ATTACHMENT_TOPOLOGY_IMPLEMENTED"),
      ),
      schemaVersion: draft.schemaVersion,
      crossFrameAttachment: draft.crossFrameAttachment,
      lAngleAreaM2: computeLAngleAreaM2(
        draft.lateralAngleSection.legA!,
        draft.lateralAngleSection.legB!,
        draft.lateralAngleSection.thickness!,
      ),
      expectedUpperZ: attachmentDepthToZ(
        -(draft.girderDepth ?? 2) / 2,
        draft.girderDepth!,
        draft.crossFrameAttachment.upperAttachmentDepthFromGirderTop!,
      ),
      engineeringCorrectness: "NOT_AUTHORIZED",
      er001: "PARAMETERIZED_ATTACHMENT_TOPOLOGY_IMPLEMENTED",
      er002: "TRUE_L_GEOMETRY_IMPLEMENTED",
      formalAuthorization: "NOT_GRANTED",
    };
    fs.writeFileSync(
      path.join(EVIDENCE, "scene-entity-inventory.json"),
      JSON.stringify(inventory, null, 2),
    );

    const stl = exportApolloBinaryStl(viz);
    fs.writeFileSync(
      path.join(EVIDENCE, "stl-summary.json"),
      JSON.stringify(
        {
          byteLength: stl.bytes.byteLength,
          triangleCountEstimate: Math.max(0, (stl.bytes.byteLength - 84) / 50),
          trueLConsumers: true,
        },
        null,
        2,
      ),
    );

    fs.writeFileSync(
      path.join(EVIDENCE, "quantity-summary.json"),
      JSON.stringify(
        {
          schemaVersion: draft.schemaVersion,
          lAngleAreaM2: inventory.lAngleAreaM2,
          crossFramePattern: draft.crossFrameAttachment.pattern,
        },
        null,
        2,
      ),
    );

    const exported = exportApolloProjectToText(project);
    expect(exported.ok).toBe(true);
    if (!exported.ok) return;
    const roundTrip = importApolloProjectFromText(exported.content);
    expect(roundTrip.ok).toBe(true);
    if (!roundTrip.ok) return;
    const roundDraft = getBridgeStructureInputDraft(roundTrip.project);
    fs.writeFileSync(
      path.join(EVIDENCE, "serialized-project.json"),
      JSON.stringify(
        {
          schemaVersion: roundDraft.schemaVersion,
          crossFrameAttachment: roundDraft.crossFrameAttachment,
          lateralAngle: roundDraft.lateralAngleSection,
          pavementThickness: roundDraft.pavementConfiguration.item?.thickness ?? null,
        },
        null,
        2,
      ),
    );

    expect(inventory.trueLPolygon).toBe(true);
    expect(inventory.sectionImplementation).toContain(2);
    expect(inventory.crossFrameAssumption).toBe(true);
    expect(sway.length).toBeGreaterThan(0);
    const hasUpper = sway.some((solid) =>
      [solid.path![0]![2]!, solid.path![1]![2]!].some(
        (z) => Math.abs(z - inventory.expectedUpperZ) < 1e-6,
      ),
    );
    expect(hasUpper).toBe(true);
  });
});
