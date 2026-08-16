import { describe, expect, it } from "vitest";
import { createDefaultProject, createEmptyProject } from "../../data/defaultProject";
import { validateProjectAgainstSchema } from "../projectSchemaValidator";

describe("A-03 Default Project Conformance", () => {
  it("createDefaultProject は公式 JSON Schema に適合する", () => {
    const project = createDefaultProject();
    const result = validateProjectAgainstSchema(project);
    expect(result.errors).toEqual([]);
    expect(result.valid).toBe(true);
  });

  it("createEmptyProject は非保存対象の runtime transient (conscious exception)", () => {
    const project = createEmptyProject();
    const result = validateProjectAgainstSchema(project);
    expect(result.valid).toBe(false);

    const paths = new Set(result.errors.map((error) => error.path));
    expect(paths).toEqual(
      new Set(["/nodes", "/materials", "/sections", "/loadCases", "/analysisSettings"]),
    );
  });

  it("createDefaultProject の analysisSettings.solver は scipy_sparse (schema 必須)", () => {
    const project = createDefaultProject();
    expect(project.analysisSettings.solver).toBe("scipy_sparse");
  });
});
