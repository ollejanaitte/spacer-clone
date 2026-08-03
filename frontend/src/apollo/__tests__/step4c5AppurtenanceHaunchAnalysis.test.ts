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
import { fillSimpleSingleBridgeStructureInput } from "../testing/bridgeStructureFixtures";
import {
  partialUdlMaxMomentKNm,
  partialUdlReactions,
  runAppurtenanceHaunchAnalysis,
} from "../analysis/appurtenanceHaunchAnalysisAdapter";

function generateOrThrow(project: ReturnType<typeof createDefaultProject>) {
  const generated = generateBridgeStructureFromInput(project, getBridgeStructureInputDraft(project));
  if (!generated.ok) throw new Error(generated.diagnostics.join("; "));
  return generated.project;
}

describe("partial UDL closed-form", () => {
  it("matches statics for centered partial UDL", () => {
    const r = partialUdlReactions(40, 10, 30, 2);
    expect(r).not.toBeNull();
    expect(r!.totalKN).toBeCloseTo(40);
    expect(r!.leftKN).toBeCloseTo(20);
    expect(r!.rightKN).toBeCloseTo(20);
    const m = partialUdlMaxMomentKNm(40, 10, 30, 2);
    expect(m).not.toBeNull();
    expect(m!).toBeGreaterThan(0);
  });

  it("rejects out-of-span segments instead of silent full-span conversion", () => {
    expect(partialUdlReactions(40, 0, 50, 1)).toBeNull();
  });
});

describe("Step 4-C5 analysis hookup", () => {
  it("connects distributed loads with reaction equilibrium and source trace", () => {
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
          startStation: 5,
          endStation: 35,
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
        shapeType: "RECT",
        topWidth: 0.4,
        bottomWidth: 0.4,
        height: 0.15,
        materialRef: null,
      }),
    );
    project = generateOrThrow(project);
    const result = runAppurtenanceHaunchAnalysis(project);
    expect(result.status).toBe("READY");
    expect(Math.abs(result.combined.equilibriumResidualKN)).toBeLessThan(1e-6);
    expect(result.combined.totalReactionKN).toBeCloseTo(result.combined.totalAppliedVerticalKN);
    expect(result.sourceLoadTrace.length).toBeGreaterThan(0);
    expect(result.sourceLoadTrace.every((t) => t.endStation > t.startStation)).toBe(true);
    expect(result.perGirder.every((g) => g.deflectionStatus === "NOT_AVAILABLE")).toBe(true);
    expect(result.combined.appurtenanceAppliedKN).toBeGreaterThan(0);
    expect(result.combined.haunchAppliedKN).toBeGreaterThan(0);
  });

  it("blocks analysis when unit weight missing and invents nothing for EXPLICIT_NONE", () => {
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
    const blocked = runAppurtenanceHaunchAnalysis(project);
    expect(blocked.status).toBe("BLOCKED");
    expect(blocked.sourceLoadTrace).toHaveLength(0);

    const empty = runAppurtenanceHaunchAnalysis(
      generateOrThrow(fillSimpleSingleBridgeStructureInput(createDefaultProject())),
    );
    expect(empty.status).toBe("EMPTY");
  });
});
