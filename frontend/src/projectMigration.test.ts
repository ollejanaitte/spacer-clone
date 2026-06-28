import { describe, expect, it } from "vitest";
import { createDefaultProject } from "./data/defaultProject";
import { CURRENT_PROJECT_SCHEMA_VERSION, migrateProject } from "./projectMigration";

describe("migrateProject", () => {
  it("adds schemaVersion to old project fixtures", () => {
    const oldProject = createDefaultProject();
    const { schemaVersion: _schemaVersion, ...legacyProject } = oldProject;

    expect(() => migrateProject(legacyProject)).not.toThrow();
    expect(migrateProject(legacyProject).schemaVersion).toBe(CURRENT_PROJECT_SCHEMA_VERSION);
  });

  it("preserves an existing schemaVersion", () => {
    expect(migrateProject({ ...createDefaultProject(), schemaVersion: 7 }).schemaVersion).toBe(7);
  });
});
