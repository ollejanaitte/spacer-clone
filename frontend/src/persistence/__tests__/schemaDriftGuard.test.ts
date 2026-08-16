import { describe, expect, it } from "vitest";
import {
  SCHEMA_ONLY_ALLOWLIST,
  analyzeSchemaDrift,
  projectModelTopLevelKeys,
  projectSchemaTopLevelKeys,
} from "../schemaGuard";

describe("A-02 Schema Drift Guard", () => {
  it("schema-only key は allowlist (substructure) のみ", () => {
    const report = analyzeSchemaDrift();
    expect(report.schemaOnly).toEqual([...SCHEMA_ONLY_ALLOWLIST]);
  });

  it("model-only key は 0 件 (ProjectModel 全 key が Schema に存在)", () => {
    const report = analyzeSchemaDrift();
    expect(report.modelOnly).toEqual([]);
  });

  it("allowlist 外の schema-only key (drift) は無い", () => {
    const report = analyzeSchemaDrift();
    expect(report.violation).toEqual([]);
  });

  it("allowlist 契約は substructure のみ (闇雲に増えない)", () => {
    expect(SCHEMA_ONLY_ALLOWLIST).toEqual(["substructure"]);
  });

  it("ProjectModel top-level key は空でない", () => {
    expect(projectModelTopLevelKeys().length).toBeGreaterThan(0);
  });

  it("公式 Schema top-level key は空でない", () => {
    expect(projectSchemaTopLevelKeys().length).toBeGreaterThan(0);
  });
});
