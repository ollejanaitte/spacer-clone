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
  analysisEligibleLoads,
  assertShareSumOne,
  buildAppurtenanceHaunchLoadModel,
  resolveEqualGirderShares,
  resolveNearestGirderShares,
  resolveOwnGirderShare,
} from "../loads/appurtenanceHaunchLoadModel";

function generateOrThrow(project: ReturnType<typeof createDefaultProject>) {
  const generated = generateBridgeStructureFromInput(project, getBridgeStructureInputDraft(project));
  if (!generated.ok) throw new Error(generated.diagnostics.join("; "));
  return generated.project;
}

function near(actual: number | null | undefined, expected: number) {
  expect(actual).not.toBeNull();
  expect(actual).not.toBeUndefined();
  expect(Math.abs(actual! - expected)).toBeLessThanOrEqual(Math.max(1e-9, 1e-12 * Math.abs(expected)));
}

describe("load distribution rules", () => {
  it("resolves nearest girder with lower-index tie break", () => {
    const offsets = [-4.5, -1.5, 1.5, 4.5];
    expect(resolveNearestGirderShares(-1.5, offsets)[0]!.girderKey).toBe("girder-1");
    // Exact midpoint between girder-1 (-1.5) and girder-2 (1.5) → distance equal → lower index wins
    expect(resolveNearestGirderShares(0, offsets)[0]!.girderKey).toBe("girder-1");
    expect(assertShareSumOne(resolveNearestGirderShares(5, offsets))).toBe(true);
  });

  it("resolves equal shares and own girder", () => {
    const equal = resolveEqualGirderShares([-3, 0, 3]);
    expect(equal).toHaveLength(3);
    expect(assertShareSumOne(equal)).toBe(true);
    expect(equal.every((e) => Math.abs(e.share - 1 / 3) < 1e-12)).toBe(true);
    const own = resolveOwnGirderShare("girder-2", [-3, 0, 3]);
    expect(own).toEqual([{ girderKey: "girder-2", girderIndex: 2, girderOffsetY: 3, share: 1 }]);
  });
});

describe("Step 4-C4 appurtenance/haunch load model", () => {
  it("builds curb nearest-girder and haunch own-girder loads with total parity", () => {
    let project = fillSimpleSingleBridgeStructureInput(createDefaultProject());
    project = withBridgeStructureField(project, "rcUnitWeight", 24.5);
    const scopeId = project.project.id;
    let configuration = getBridgeStructureInputDraft(project).appurtenanceConfiguration;
    for (const slot of APPURTENANCE_SLOTS) {
      if (slot === "LEFT_CURB" || slot === "MEDIAN") {
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
          transverseOffset: slot === "LEFT_CURB" ? -5 : 0,
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
        startStation: 10,
        endStation: 30,
        shapeType: "RECT",
        topWidth: 0.4,
        bottomWidth: 0.4,
        height: 0.15,
        materialRef: null,
      }),
    );
    project = generateOrThrow(project);
    const model = buildAppurtenanceHaunchLoadModel(project);
    expect(model.status).toBe("READY");
    const curb = model.loads.find((l) => l.slotOrGirderKey === "LEFT_CURB");
    const median = model.loads.find((l) => l.slotOrGirderKey === "MEDIAN");
    expect(curb?.distributionRule).toBe("NEAREST_GIRDER");
    expect(curb?.targetGirderRefs).toHaveLength(1);
    expect(median?.distributionRule).toBe("EQUAL_ALL_GIRDERS");
    expect(median?.targetGirderRefs).toHaveLength(4);
    expect(assertShareSumOne(median!.targetGirderRefs)).toBe(true);
    // A=0.125, L=40, W=122.5, w=0.125*24.5=3.0625
    near(curb!.lineLoadKNPerM, 3.0625);
    near(curb!.totalLoadKN, 122.5);
    expect(curb!.startStation).toBe(0);
    expect(curb!.endStation).toBe(40);
    const haunches = model.loads.filter((l) => l.category === "RC_HAUNCH");
    expect(haunches).toHaveLength(4);
    expect(haunches.every((h) => h.distributionRule === "OWN_GIRDER")).toBe(true);
    expect(haunches.every((h) => h.startStation === 10 && h.endStation === 30)).toBe(true);
    expect(analysisEligibleLoads(model)).toHaveLength(model.loads.length);
  });

  it("marks missing unit weight NOT_AVAILABLE and excludes from analysis", () => {
    let project = fillSimpleSingleBridgeStructureInput(createDefaultProject());
    project = withBridgeStructureField(project, "rcUnitWeight", null);
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
    const model = buildAppurtenanceHaunchLoadModel(project);
    expect(model.status).toBe("INCOMPLETE");
    expect(model.loads[0]!.status).toBe("NOT_AVAILABLE");
    expect(model.loads[0]!.totalLoadKN).toBeNull();
    expect(analysisEligibleLoads(model)).toHaveLength(0);
  });

  it("does not invent loads for EXPLICIT_NONE", () => {
    const project = generateOrThrow(fillSimpleSingleBridgeStructureInput(createDefaultProject()));
    const model = buildAppurtenanceHaunchLoadModel(project);
    expect(model.status).toBe("EMPTY");
    expect(model.loads).toHaveLength(0);
  });
});
