import { describe, expect, it } from "vitest";
import { createDefaultProject } from "../../data/defaultProject";
import {
  APPURTENANCE_SLOTS,
  APOLLO_BRIDGE_STRUCTURE_INPUT_SCHEMA_VERSION,
  APOLLO_BRIDGE_STRUCTURE_INPUT_SCHEMA_VERSION_LEGACY,
  PRESENCE_STATUS,
  applyHaunchExplicitNoneAll,
  applyHaunchToAllGirders,
  buildBridgeAppurtenanceModels,
  buildRcDeckHaunchModels,
  createDefaultAppurtenanceConfiguration,
  createDefaultHaunchConfiguration,
  createEmptyBridgeStructureInputDraft,
  generateBridgeStructureFromInput,
  getBridgeStructureInputDraft,
  parseBridgeStructureInputDraft,
  stableAppurtenanceId,
  stableHaunchId,
  validateBridgeAppurtenanceConfiguration,
  validatePresenceConsistency,
  validateRcDeckHaunchConfiguration,
  withAppurtenanceConfiguration,
  withAppurtenanceSlotItem,
  withAppurtenanceSlotPresence,
  withHaunchConfiguration,
} from "../bridgeStructure";
import { buildInputChecksum } from "../quantity/quantityModel";
import { fillSimpleSingleBridgeStructureInput } from "../testing/bridgeStructureFixtures";
import { buildWorkflowStateModel } from "../workflow";

describe("presence semantics", () => {
  it("treats empty array as NOT EXPLICIT_NONE", () => {
    const config = createDefaultHaunchConfiguration();
    expect(config.girders).toEqual([]);
    expect(config.girders.length === 0).toBe(true);
    const result = validateRcDeckHaunchConfiguration(config, {
      bridgeLength: 40,
      girderCount: 2,
      projectScopeId: "proj",
    });
    expect(result.complete).toBe(false);
    expect(result.diagnostics.some((d) => d.code === "HAUNCH_GIRDER_UNDECIDED")).toBe(true);
  });

  it("rejects PROVIDED without item and EXPLICIT_NONE with item", () => {
    expect(validatePresenceConsistency(PRESENCE_STATUS.PROVIDED, false, "x").ok).toBe(false);
    expect(validatePresenceConsistency(PRESENCE_STATUS.EXPLICIT_NONE, true, "x").ok).toBe(false);
    expect(validatePresenceConsistency(PRESENCE_STATUS.NOT_PROVIDED, false, "x").ok).toBe(true);
  });
});

describe("WF-03 appurtenance canonical model", () => {
  it("defaults all six slots to NOT_PROVIDED without items", () => {
    const config = createDefaultAppurtenanceConfiguration();
    expect(config.slots).toHaveLength(6);
    for (const slot of APPURTENANCE_SLOTS) {
      const entry = config.slots.find((s) => s.slot === slot)!;
      expect(entry.presence).toBe(PRESENCE_STATUS.NOT_PROVIDED);
      expect(entry.item).toBeNull();
    }
  });

  it("builds deterministic stable IDs and valid PROVIDED models", () => {
    const projectScopeId = "scope-app-001";
    let configuration = createDefaultAppurtenanceConfiguration();
    for (const slot of APPURTENANCE_SLOTS) {
      if (slot === "LEFT_CURB" || slot === "RIGHT_CURB") {
        configuration = withAppurtenanceSlotPresence(
          configuration,
          slot,
          PRESENCE_STATUS.PROVIDED,
          projectScopeId,
        );
        const id = stableAppurtenanceId(projectScopeId, slot);
        configuration = withAppurtenanceSlotItem(configuration, slot, {
          appurtenanceId: id,
          startStation: 0,
          endStation: 40,
          transverseOffset: slot === "LEFT_CURB" ? -5 : 5,
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
          projectScopeId,
        );
      }
    }
    const result = buildBridgeAppurtenanceModels(configuration, {
      bridgeLength: 40,
      width: 12,
      projectScopeId,
    });
    expect(result.complete).toBe(true);
    expect(result.models).toHaveLength(2);
    expect(result.models[0]!.appurtenanceId).toBe(stableAppurtenanceId(projectScopeId, "LEFT_CURB"));
    expect(result.models[0]!.designAuthorization).toBe("NOT_AUTHORIZED");
    expect(result.models[0]!.unitWeightStatus).toBe("USER_PROVIDED_UNVERIFIED");
  });

  it("blocks invalid station and type/side mismatch via presence rules", () => {
    const projectScopeId = "scope-app-002";
    let configuration = withAppurtenanceSlotPresence(
      createDefaultAppurtenanceConfiguration(),
      "LEFT_CURB",
      PRESENCE_STATUS.PROVIDED,
      projectScopeId,
    );
    configuration = withAppurtenanceSlotItem(configuration, "LEFT_CURB", {
      appurtenanceId: stableAppurtenanceId(projectScopeId, "LEFT_CURB"),
      startStation: 10,
      endStation: 5,
      transverseOffset: 0,
      crossSectionShape: "RECT",
      width: 0.5,
      height: 0.25,
      materialRef: null,
      unitWeight: null,
    });
    const result = validateBridgeAppurtenanceConfiguration(configuration, {
      bridgeLength: 40,
      width: 12,
      projectScopeId,
    });
    expect(result.blockingDiagnostics.some((d) => d.code === "APPURTENANCE_INVALID_STATION_RANGE")).toBe(
      true,
    );
  });
});

describe("WF-05 haunch canonical model", () => {
  it("supports apply-all RECT and per-girder EXPLICIT_NONE mix", () => {
    const projectScopeId = "scope-haunch-001";
    const applied = applyHaunchToAllGirders(3, projectScopeId, {
      startStation: 0,
      endStation: 40,
      shapeType: "RECT",
      topWidth: 0.4,
      bottomWidth: 0.4,
      height: 0.15,
      materialRef: null,
    });
    const mixed = {
      girders: applied.girders.map((g, index) =>
        index === 1
          ? { mainGirderKey: g.mainGirderKey, presence: PRESENCE_STATUS.EXPLICIT_NONE, item: null }
          : g,
      ),
    };
    const result = buildRcDeckHaunchModels(mixed, {
      bridgeLength: 40,
      girderCount: 3,
      projectScopeId,
    });
    expect(result.complete).toBe(true);
    expect(result.models).toHaveLength(2);
    expect(result.models.every((m) => m.shapeType === "RECT")).toBe(true);
    expect(result.models[0]!.haunchId).toBe(stableHaunchId(projectScopeId, "girder-0"));
  });

  it("validates TRAPEZOID and rejects RECT width mismatch", () => {
    const projectScopeId = "scope-haunch-002";
    const trap = applyHaunchToAllGirders(1, projectScopeId, {
      startStation: 0,
      endStation: 40,
      shapeType: "TRAPEZOID",
      topWidth: 0.3,
      bottomWidth: 0.5,
      height: 0.2,
      materialRef: null,
    });
    expect(
      validateRcDeckHaunchConfiguration(trap, {
        bridgeLength: 40,
        girderCount: 1,
        projectScopeId,
      }).complete,
    ).toBe(true);

    const badRect = applyHaunchToAllGirders(1, projectScopeId, {
      startStation: 0,
      endStation: 40,
      shapeType: "RECT",
      topWidth: 0.3,
      bottomWidth: 0.5,
      height: 0.2,
      materialRef: null,
    });
    expect(
      validateRcDeckHaunchConfiguration(badRect, {
        bridgeLength: 40,
        girderCount: 1,
        projectScopeId,
      }).blockingDiagnostics.some((d) => d.code === "HAUNCH_INVALID_RECT"),
    ).toBe(true);
  });

  it("flags dangling girder refs after girderCount change", () => {
    const projectScopeId = "scope-haunch-003";
    const config = applyHaunchExplicitNoneAll(4);
    const result = validateRcDeckHaunchConfiguration(config, {
      bridgeLength: 40,
      girderCount: 2,
      projectScopeId,
    });
    expect(result.blockingDiagnostics.some((d) => d.code === "HAUNCH_DANGLING_GIRDER_REF")).toBe(true);
  });
});

describe("migration 1.0.0 → 1.1.0-development", () => {
  it("migrates legacy projects to NOT_PROVIDED without auto entities", () => {
    const parsed = parseBridgeStructureInputDraft({
      schemaVersion: APOLLO_BRIDGE_STRUCTURE_INPUT_SCHEMA_VERSION_LEGACY,
      spanLength: 30,
      bridgeLength: 30,
      width: 10,
      girderCount: 3,
      generatedAt: "2026-01-01T00:00:00.000Z",
    });
    expect(parsed).not.toBeNull();
    expect(parsed!.schemaVersion).toBe(APOLLO_BRIDGE_STRUCTURE_INPUT_SCHEMA_VERSION);
    expect(parsed!.generatedAt).toBeNull();
    expect(parsed!.appurtenanceConfiguration.slots.every((s) => s.presence === "NOT_PROVIDED")).toBe(
      true,
    );
    expect(parsed!.appurtenanceConfiguration.slots.every((s) => s.item === null)).toBe(true);
    expect(parsed!.haunchConfiguration.girders).toEqual([]);
  });

  it("round-trips 1.1.0-development without changing IDs or presence", () => {
    let project = fillSimpleSingleBridgeStructureInput(createDefaultProject());
    const before = getBridgeStructureInputDraft(project);
    const checksum = buildInputChecksum(before);
    const roundTrip = parseBridgeStructureInputDraft(JSON.parse(JSON.stringify(before)));
    expect(roundTrip).toEqual(before);
    expect(buildInputChecksum(roundTrip!)).toBe(checksum);
  });

  it("checksum differs between NOT_PROVIDED and EXPLICIT_NONE", () => {
    const empty = createEmptyBridgeStructureInputDraft();
    const noneProject = withAppurtenanceConfiguration(
      createDefaultProject(),
      (() => {
        let configuration = createDefaultAppurtenanceConfiguration();
        for (const slot of APPURTENANCE_SLOTS) {
          configuration = withAppurtenanceSlotPresence(
            configuration,
            slot,
            PRESENCE_STATUS.EXPLICIT_NONE,
            "p",
          );
        }
        return configuration;
      })(),
    );
    const none = getBridgeStructureInputDraft(noneProject);
    expect(buildInputChecksum(empty)).not.toBe(buildInputChecksum(none));
  });
});

describe("BSSD haunch projection", () => {
  it("projects PROVIDED haunches and leaves EXPLICIT_NONE as empty array", () => {
    let project = fillSimpleSingleBridgeStructureInput(createDefaultProject());
    project = withHaunchConfiguration(
      project,
      applyHaunchToAllGirders(4, project.project.id, {
        startStation: 0,
        endStation: 40,
        shapeType: "RECT",
        topWidth: 0.4,
        bottomWidth: 0.4,
        height: 0.15,
        materialRef: null,
      }),
    );
    const generated = generateBridgeStructureFromInput(project, getBridgeStructureInputDraft(project));
    expect(generated.ok).toBe(true);
    if (!generated.ok) return;
    const haunches = generated.project.apolloBsdd?.structuralDesignModel?.haunches ?? [];
    expect(haunches).toHaveLength(4);
    expect(haunches[0]?.shapeType).toBe("RECT");
    expect(haunches[0]?.designStatus).toBe("NOT_AUTHORIZED");
    expect(haunches[0]?.mainGirderRefId).toBeTruthy();

    let noneProject = fillSimpleSingleBridgeStructureInput(createDefaultProject());
    noneProject = withHaunchConfiguration(noneProject, applyHaunchExplicitNoneAll(4));
    const noneGenerated = generateBridgeStructureFromInput(
      noneProject,
      getBridgeStructureInputDraft(noneProject),
    );
    expect(noneGenerated.ok).toBe(true);
    if (!noneGenerated.ok) return;
    expect(noneGenerated.project.apolloBsdd?.structuralDesignModel?.haunches).toEqual([]);
  });
});

describe("workflow WF-03 / WF-05 status", () => {
  it("marks NOT_PROVIDED as incomplete and EXPLICIT_NONE+generate as COMPLETE", () => {
    let project = createDefaultProject();
    project = withAppurtenanceConfiguration(project, createDefaultAppurtenanceConfiguration());
    // no structure yet → NOT_STARTED
    expect(buildWorkflowStateModel(project).steps.find((s) => s.workflowStepId === "WF-03")?.status).toBe(
      "NOT_STARTED",
    );

    project = fillSimpleSingleBridgeStructureInput(createDefaultProject());
    const generated = generateBridgeStructureFromInput(project, getBridgeStructureInputDraft(project));
    expect(generated.ok).toBe(true);
    if (!generated.ok) return;
    const model = buildWorkflowStateModel(generated.project);
    expect(model.steps.find((s) => s.workflowStepId === "WF-03")?.status).toBe("COMPLETE");
    expect(model.steps.find((s) => s.workflowStepId === "WF-05")?.status).toBe("COMPLETE");
    expect(model.steps.find((s) => s.workflowStepId === "WF-06")?.status).toBe("BLOCKED");
  });

  it("goes STALE when appurtenance presence changes after generation", () => {
    let project = fillSimpleSingleBridgeStructureInput(createDefaultProject());
    const generated = generateBridgeStructureFromInput(project, getBridgeStructureInputDraft(project));
    expect(generated.ok).toBe(true);
    if (!generated.ok) return;
    project = generated.project;
    project = withAppurtenanceConfiguration(
      project,
      withAppurtenanceSlotPresence(
        getBridgeStructureInputDraft(project).appurtenanceConfiguration,
        "MEDIAN",
        PRESENCE_STATUS.NOT_PROVIDED,
        project.project.id,
      ),
    );
    const step = buildWorkflowStateModel(project).steps.find((s) => s.workflowStepId === "WF-03");
    expect(step?.status).toBe("STALE");
  });
});
