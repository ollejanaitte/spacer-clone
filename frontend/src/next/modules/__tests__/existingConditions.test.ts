import { afterEach, describe, expect, it } from "vitest";
import { createEmptyProject } from "../../project/projectDataCore";
import { applyBusinessMetadata } from "../../project/businessMetadata";
import { getProjectManager, resetProjectManagerForTest } from "../../project/projectManagerInstance";
import {
  createEmptyExistingConditionsDocument,
  validateExistingConditionsData,
  isExistingConditionType,
  type ExistingConditionEntity,
} from "../existingConditions";
import { readExistingConditions, writeExistingConditions, hasExistingConditions } from "../existingConditionsAdapter";

function makeProject() {
  return applyBusinessMetadata(createEmptyProject("現況構造物業務"), {
    businessNumber: "EX-001",
    designStage: "road-preliminary",
  });
}

function makeRiverEntity(): ExistingConditionEntity {
  return {
    entityId: "RIVER-1",
    type: "river",
    label: "〇〇川",
    geometry: {
      kind: "line",
      points: [
        { x: 0, y: 100, z: 0 },
        { x: 500, y: 100, z: 0 },
      ],
    },
    coordinateContextId: "COORD-1",
    metadata: { width: 30 },
    visibility: true,
    layer: "water",
    styleReference: null,
    sourceReference: "survey.csv",
  };
}

afterEach(() => {
  resetProjectManagerForTest();
});

describe("Existing Conditions Core (Phase 3-07)", () => {
  it("creates an empty existing conditions document", () => {
    const doc = createEmptyExistingConditionsDocument();
    expect(doc.entities).toEqual([]);
    expect(doc.schemaVersion).toBe("0.1.0");
  });

  it("isExistingConditionType guards types", () => {
    expect(isExistingConditionType("river")).toBe(true);
    expect(isExistingConditionType("underground")).toBe(true);
    expect(isExistingConditionType("railway")).toBe(true);
    expect(isExistingConditionType("bogus")).toBe(false);
  });

  it("validates a valid document with river entity", () => {
    const doc = { ...createEmptyExistingConditionsDocument(), entities: [makeRiverEntity()] };
    expect(validateExistingConditionsData({ existingConditionsDocument: doc })).toEqual([]);
  });

  it("rejects invalid entity (missing entityId / empty geometry)", () => {
    const doc = { ...createEmptyExistingConditionsDocument(), entities: [{ ...makeRiverEntity(), entityId: "" } as ExistingConditionEntity] };
    const issues = validateExistingConditionsData({ existingConditionsDocument: doc });
    expect(issues.some((i) => i.path.includes("entityId"))).toBe(true);
  });

  it("rejects invalid type", () => {
    const doc = { ...createEmptyExistingConditionsDocument(), entities: [{ ...makeRiverEntity(), type: "bogus" as never } as ExistingConditionEntity] };
    const issues = validateExistingConditionsData({ existingConditionsDocument: doc });
    expect(issues.some((i) => i.message.includes("invalid type"))).toBe(true);
  });

  it("writes and reads existing conditions via metadata (separate from 8 modules)", async () => {
    const manager = getProjectManager();
    const project = makeProject();
    expect(manager.importProject(project)).toBe(true);
    expect(hasExistingConditions(manager, project.projectId)).toBe(false);

    const doc = { ...createEmptyExistingConditionsDocument(), entities: [makeRiverEntity()] };
    const result = writeExistingConditions(manager, project.projectId, doc);
    expect(result.ok).toBe(true);
    await manager.flushPendingSaves();

    expect(hasExistingConditions(manager, project.projectId)).toBe(true);
    const read = readExistingConditions(manager, project.projectId);
    expect(read?.entities[0].type).toBe("river");
    expect(read?.entities[0].label).toBe("〇〇川");
    // not stored in the 8-module area
    const projectData = manager.getProject(project.projectId)!;
    expect(projectData.modules.terrain).toEqual({});
  });

  it("rejects invalid existing conditions write", () => {
    const manager = getProjectManager();
    const project = makeProject();
    manager.importProject(project);
    const badDoc = { schemaVersion: "0.1.0", entities: [{ entityId: "" }] } as never;
    const result = writeExistingConditions(manager, project.projectId, badDoc);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe("invalid-existing-data");
  });

  it("returns project-not-found for missing project", () => {
    const manager = getProjectManager();
    const result = writeExistingConditions(manager, "missing", undefined);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe("project-not-found");
  });
});
