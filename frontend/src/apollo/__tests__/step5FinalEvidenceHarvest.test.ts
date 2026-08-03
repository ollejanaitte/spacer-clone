/**
 * Harvest Step 5 scene / STL / quantity / load / analysis summaries for final_audit evidence.
 * Run: npx vitest run src/apollo/__tests__/step5FinalEvidenceHarvest.test.ts
 */
import { describe, expect, it } from "vitest";
import * as fs from "node:fs";
import * as path from "node:path";
import { createDefaultProject } from "../../data/defaultProject";
import {
  applyAndGenerateSimpleSingleSpanSample,
  getBridgeStructureInputDraft,
} from "../bridgeStructure";
import { exportApolloProjectToText, importApolloProjectFromText } from "../importExport";
import { buildApolloVisualizationModelOrThrow } from "../visualization";
import { computePavementQuantity } from "../quantity/pavementQuantity";
import { exportApolloBinaryStl } from "../export";

const EVIDENCE = path.resolve(
  __dirname,
  "../../../../docs/apollo/step5_implementation/final_audit/evidence",
);

describe("Step 5 final evidence harvest", () => {
  it("writes scene / stl / quantity / serialized summaries", () => {
    fs.mkdirSync(EVIDENCE, { recursive: true });
    const result = applyAndGenerateSimpleSingleSpanSample(createDefaultProject());
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const draft = getBridgeStructureInputDraft(result.project);
    const viz = buildApolloVisualizationModelOrThrow({ project: result.project });
    const byKind: Record<string, number> = {};
    for (const s of viz.solidGeometryParameters) {
      byKind[s.kind] = (byKind[s.kind] ?? 0) + 1;
    }
    const inventory = {
      solidCount: viz.solidGeometryParameters.length,
      byKind,
      exportableFalse: viz.solidGeometryParameters
        .filter((s) => s.exportable === false)
        .map((s) => s.kind),
      bracingSectionTypes: [
        ...new Set(
          viz.solidGeometryParameters
            .filter((s) => s.kind === "bracing")
            .map((s) => s.dimensionsM.sectionType),
        ),
      ],
      dualLabels: {
        crossBeam: viz.solidGeometryParameters.some(
          (s) => s.kind === "cross_beam" && s.displayLabel.includes("横桁"),
        ),
        sway: viz.solidGeometryParameters.some((s) => s.displayLabel.includes("対傾構")),
        upper: viz.solidGeometryParameters.some((s) => s.displayLabel.includes("上横構")),
        lower: viz.solidGeometryParameters.some((s) => s.displayLabel.includes("下横構")),
      },
      assumptions: viz.assumptions.map((a) => a.code),
      engineeringCorrectness: "NOT_AUTHORIZED",
      crossFrameTopology: "LABEL_ONLY_V_SWAY_DEVELOPMENT_PENDING_ER001",
      lAngleRender: "TWO_PLATE_APPROXIMATION_PENDING_ER002",
    };
    fs.writeFileSync(path.join(EVIDENCE, "scene-entity-inventory.json"), JSON.stringify(inventory, null, 2));

    const stl = exportApolloBinaryStl(viz);
    const stlSummary = {
      byteLength: stl.bytes.byteLength,
      triangleCountEstimate: Math.max(0, (stl.bytes.byteLength - 84) / 50),
      markingsExcluded: inventory.exportableFalse.includes("road_marking"),
      exportableFalseKinds: [...new Set(inventory.exportableFalse)],
    };
    fs.writeFileSync(path.join(EVIDENCE, "stl-summary.json"), JSON.stringify(stlSummary, null, 2));

    const qty = computePavementQuantity(draft);
    fs.writeFileSync(
      path.join(EVIDENCE, "quantity-summary.json"),
      JSON.stringify({ pavement: qty, schemaVersion: draft.schemaVersion }, null, 2),
    );
    fs.writeFileSync(
      path.join(EVIDENCE, "load-summary.json"),
      JSON.stringify(
        {
          note: "Pavement dead load connected when PROVIDED (DEC-S5-0012); formal live loads not seeded (DEC-S5-0011)",
          pavementPresence: draft.pavementConfiguration.presence,
          unitWeight: draft.pavementConfiguration.item?.unitWeight ?? null,
        },
        null,
        2,
      ),
    );
    fs.writeFileSync(
      path.join(EVIDENCE, "analysis-summary.json"),
      JSON.stringify(
        {
          status: "UNVERIFIED_DEVELOPMENT_ONLY",
          numericDesignAuthorization: "NOT_GRANTED",
          designOrConstructionUse: "PROHIBITED",
        },
        null,
        2,
      ),
    );

    const exported = exportApolloProjectToText(result.project);
    expect(exported.ok).toBe(true);
    if (!exported.ok) return;
    const imported = importApolloProjectFromText(exported.content);
    expect(imported.ok).toBe(true);
    if (!imported.ok) return;
    const roundTripDraft = getBridgeStructureInputDraft(imported.project);
    fs.writeFileSync(
      path.join(EVIDENCE, "serialized-project.json"),
      JSON.stringify(
        {
          schemaVersion: roundTripDraft.schemaVersion,
          pavementPresence: roundTripDraft.pavementConfiguration.presence,
          pavementThickness: roundTripDraft.pavementConfiguration.item?.thickness ?? null,
          markingsEnabled: roundTripDraft.roadMarkingsConfiguration.enabled,
          lateralAngle: roundTripDraft.lateralAngleSection,
          haunchGirderCount: roundTripDraft.haunchConfiguration.girders.length,
          appurtenanceProvided: roundTripDraft.appurtenanceConfiguration.slots.filter(
            (s) => s.presence === "PROVIDED",
          ).length,
        },
        null,
        2,
      ),
    );
  });
});
