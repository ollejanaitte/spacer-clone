import { describe, expect, it } from "vitest";
import { createEmptyImporterProject } from "../factory";
import {
  getMigration,
  migrateProject,
  registerMigration,
} from "./migrationRegistry";

describe("migrationRegistry", () => {
  it("registers and resolves migrations", () => {
    const migration = getMigration("0.1.0", "0.1.0");
    expect(migration).toBeTypeOf("function");
  });

  it("migrates 0.1.0 projects without changing structure", () => {
    const project = createEmptyImporterProject();
    const migrated = migrateProject(project, "0.1.0");

    expect(migrated.id).toBe(project.id);
    expect(migrated.liner.importerSchemaVersion).toBe("0.1.0");
  });

  it("throws for unsupported migration paths", () => {
    expect(() => migrateProject(createEmptyImporterProject(), "9.9.9")).toThrow(
      /未対応の importer schema migration/,
    );
  });

  it("allows registering future migrations", () => {
    registerMigration("0.0.9", "0.1.0", (data) => {
      const payload = data as Record<string, unknown>;
      return {
        ...payload,
        liner: { importerSchemaVersion: "0.1.0" },
      };
    });

    const migrated = migrateProject(
      {
        liner: { importerSchemaVersion: "0.0.9" },
      },
      "0.1.0",
    );

    expect((migrated as { liner: { importerSchemaVersion: string } }).liner.importerSchemaVersion).toBe(
      "0.1.0",
    );
  });
});
