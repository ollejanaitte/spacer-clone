import { describe, expect, it } from "vitest";
import { createDefaultProject } from "../../data/defaultProject";
import {
  APPURTENANCE_SLOTS,
  PRESENCE_STATUS,
  applyHaunchToAllGirders,
  generateBridgeStructureFromInput,
  getBridgeStructureInputDraft,
  stableAppurtenanceId,
  withAppurtenanceConfiguration,
  withAppurtenanceSlotItem,
  withAppurtenanceSlotPresence,
  withBridgeStructureField,
  withHaunchConfiguration,
} from "../bridgeStructure";
import { buildApolloVisualizationModelOrThrow } from "../visualization";
import { exportApolloBinaryStl, validateApolloBinaryStlTriangles, parseBinaryStl } from "../export";
import { buildQuantityModel } from "../quantity/quantityModel";
import { buildAppurtenanceHaunchLoadModel } from "../loads/appurtenanceHaunchLoadModel";
import { runAppurtenanceHaunchAnalysis } from "../analysis/appurtenanceHaunchAnalysisAdapter";
import { buildWorkflowStateModel } from "../workflow";
import { fillSimpleSingleBridgeStructureInput } from "../testing/bridgeStructureFixtures";
import * as fs from "node:fs";
import * as path from "node:path";

const EVIDENCE = path.resolve(__dirname, "../../../../docs/apollo/step4c_appurtenance_haunch/evidence");

function generateOrThrow(project: ReturnType<typeof createDefaultProject>) {
  const generated = generateBridgeStructureFromInput(project, getBridgeStructureInputDraft(project));
  if (!generated.ok) throw new Error(generated.diagnostics.join("; "));
  return generated.project;
}

function projectWithProvided() {
  let project = fillSimpleSingleBridgeStructureInput(createDefaultProject());
  project = withBridgeStructureField(project, "rcUnitWeight", 24.5);
  const scopeId = project.project.id;
  let configuration = getBridgeStructureInputDraft(project).appurtenanceConfiguration;
  for (const slot of APPURTENANCE_SLOTS) {
    if (slot === "LEFT_CURB") {
      configuration = withAppurtenanceSlotPresence(
        configuration,
        slot,
        PRESENCE_STATUS.PROVIDED,
        scopeId,
      );
      configuration = withAppurtenanceSlotItem(configuration, slot, {
        appurtenanceId: stableAppurtenanceId(scopeId, slot),
        startStation: 0,
        endStation: 40,
        transverseOffset: -5,
        crossSectionShape: "RECT",
        width: 0.5,
        height: 0.25,
        materialRef: null,
        unitWeight: 24.5,
      });
    } else {
      configuration = withAppurtenanceSlotPresence(
        configuration,
        slot,
        PRESENCE_STATUS.EXPLICIT_NONE,
        scopeId,
      );
    }
  }
  project = withAppurtenanceConfiguration(project, configuration);
  project = withHaunchConfiguration(
    project,
    applyHaunchToAllGirders(4, scopeId, {
      startStation: 0,
      endStation: 40,
      shapeType: "TRAPEZOID",
      topWidth: 0.3,
      bottomWidth: 0.5,
      height: 0.2,
      materialRef: null,
    }),
  );
  return generateOrThrow(project);
}

describe("Step 4-C6 integration / scope / evidence", () => {
  it("E2E-S4C-001..006: solids/STL/quantity/load/analysis/distribution parity", () => {
    fs.mkdirSync(EVIDENCE, { recursive: true });
    const project = projectWithProvided();
    const viz = buildApolloVisualizationModelOrThrow({ project });
    expect(viz.solidGeometryParameters.some((s) => s.kind === "appurtenance")).toBe(true);
    expect(viz.solidGeometryParameters.some((s) => s.kind === "haunch")).toBe(true);

    const stl = exportApolloBinaryStl(viz);
    const parsed = parseBinaryStl(stl.bytes);
    expect(validateApolloBinaryStlTriangles(parsed.triangles).invalidCoordinateCount).toBe(0);
    expect(stl.manifest.entityCounts.appurtenances).toBeGreaterThan(0);
    expect(stl.manifest.entityCounts.haunches).toBeGreaterThan(0);

    const qty = buildQuantityModel(project);
    expect(qty.schemaVersion).toBe("1.1.0-development");
    expect(qty.items.some((i) => i.category === "APPURTENANCE")).toBe(true);
    expect(qty.items.some((i) => i.category === "RC_HAUNCH")).toBe(true);
    fs.writeFileSync(path.join(EVIDENCE, "quantity.json"), JSON.stringify(qty, null, 2));

    const loads = buildAppurtenanceHaunchLoadModel(project);
    expect(loads.status).toBe("READY");
    expect(loads.loads.some((l) => l.distributionRule === "NEAREST_GIRDER")).toBe(true);
    expect(loads.loads.some((l) => l.distributionRule === "OWN_GIRDER")).toBe(true);
    fs.writeFileSync(path.join(EVIDENCE, "load.json"), JSON.stringify(loads, null, 2));

    const analysis = runAppurtenanceHaunchAnalysis(project);
    expect(analysis.status).toBe("READY");
    expect(Math.abs(analysis.combined.equilibriumResidualKN)).toBeLessThan(1e-6);
    fs.writeFileSync(path.join(EVIDENCE, "analysis.json"), JSON.stringify(analysis, null, 2));
    fs.writeFileSync(
      path.join(EVIDENCE, "stl-metadata.json"),
      JSON.stringify(
        {
          triangleCount: parsed.triangleCount,
          entityCounts: stl.manifest.entityCounts,
          digest: stl.manifest.digest,
        },
        null,
        2,
      ),
    );
  });

  it("E2E-S4C-004/008: missing weight + EXPLICIT_NONE invent nothing", () => {
    let project = fillSimpleSingleBridgeStructureInput(createDefaultProject());
    const scopeId = project.project.id;
    let configuration = getBridgeStructureInputDraft(project).appurtenanceConfiguration;
    for (const slot of APPURTENANCE_SLOTS) {
      if (slot === "LEFT_CURB") {
        configuration = withAppurtenanceSlotPresence(
          configuration,
          slot,
          PRESENCE_STATUS.PROVIDED,
          scopeId,
        );
        configuration = withAppurtenanceSlotItem(configuration, slot, {
          appurtenanceId: stableAppurtenanceId(scopeId, slot),
          startStation: 0,
          endStation: 40,
          transverseOffset: -5,
          crossSectionShape: "RECT",
          width: 0.5,
          height: 0.25,
          materialRef: null,
          unitWeight: null,
        });
      } else {
        configuration = withAppurtenanceSlotPresence(
          configuration,
          slot,
          PRESENCE_STATUS.EXPLICIT_NONE,
          scopeId,
        );
      }
    }
    project = withAppurtenanceConfiguration(project, configuration);
    project = generateOrThrow(project);
    expect(buildAppurtenanceHaunchLoadModel(project).status).toBe("INCOMPLETE");
    expect(runAppurtenanceHaunchAnalysis(project).status).toBe("BLOCKED");

    const none = generateOrThrow(fillSimpleSingleBridgeStructureInput(createDefaultProject()));
    expect(buildAppurtenanceHaunchLoadModel(none).loads).toHaveLength(0);
    expect(
      buildApolloVisualizationModelOrThrow({ project: none }).solidGeometryParameters.filter(
        (s) => s.kind === "appurtenance" || s.kind === "haunch",
      ),
    ).toHaveLength(0);
  });

  it("E2E-S4C-007/009/010: STALE + scope guard 4-G pending + checksum", () => {
    const project = projectWithProvided();
    const qty = buildQuantityModel(project);
    const checksum = qty.inputChecksum;
    const staleProject = withBridgeStructureField(project, "width", 13);
    expect(buildQuantityModel(staleProject).stale).toBe(true);
    expect(buildAppurtenanceHaunchLoadModel(staleProject).stale).toBe(true);
    expect(runAppurtenanceHaunchAnalysis(staleProject).status).toBe("STALE");

    const wf = buildWorkflowStateModel(project);
    const wf03 = wf.steps.find((s) => s.workflowStepId === "WF-03")!;
    expect(wf03.status).toBe("COMPLETE");
    expect(wf03.diagnostics.concat(wf03.warnings).some((d) => d.code === "WF_STEP_4_G_REINTEGRATION_PENDING")).toBe(
      true,
    );
    const wf12 = wf.steps.find((s) => s.workflowStepId === "WF-12")!;
    expect(wf12.warnings.some((d) => d.code === "WF_STEP_4_G_REINTEGRATION_PENDING")).toBe(true);
    const wf06 = wf.steps.find((s) => s.workflowStepId === "WF-06")!;
    expect(wf06.status).toBe("BLOCKED");
    expect(checksum).toMatch(/^[a-f0-9]+$/i);
    fs.mkdirSync(EVIDENCE, { recursive: true });
    fs.writeFileSync(
      path.join(EVIDENCE, "workflow-scope.json"),
      JSON.stringify(
        {
          checksum,
          wf03: wf03.status,
          wf06: wf06.status,
          wf12Warnings: wf12.warnings.map((w) => w.code),
        },
        null,
        2,
      ),
    );
  });
});
