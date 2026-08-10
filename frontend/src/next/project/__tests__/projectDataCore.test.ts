import { describe, expect, it } from "vitest";
import { PROJECT_MODULE_KEYS, PROJECT_SCHEMA_VERSION } from "../schema";
import {
  createEmptyProject,
  deserializeProject,
  generateProjectId,
  getCurrentProjectSchemaVersion,
  migrateProject,
  parseProject,
  serializeProject,
} from "../projectDataCore";

describe("createEmptyProject", () => {
  it("default project is created with current schema version", () => {
    const project = createEmptyProject("テスト業務");
    expect(project.schemaVersion).toBe(PROJECT_SCHEMA_VERSION);
    expect(project.schemaVersion).toBe(getCurrentProjectSchemaVersion());
  });

  it("project has unique projectId and matches UUID form", () => {
    const a = createEmptyProject("業務A");
    const b = createEmptyProject("業務B");
    expect(a.projectId).not.toBe(b.projectId);
    const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
    expect(a.projectId).toMatch(uuidPattern);
    expect(generateProjectId()).toMatch(uuidPattern);
  });

  it("supports Japanese project name", () => {
    const project = createEmptyProject("道路橋梁設計業務（令和8年度）");
    expect(project.name).toBe("道路橋梁設計業務（令和8年度）");
  });

  it("createdAt/updatedAt are set as ISO UTC timestamps", () => {
    const project = createEmptyProject("業務");
    expect(project.createdAt).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{1,3})?Z$/);
    expect(project.updatedAt).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{1,3})?Z$/);
  });

  it("all modules start in their initial (empty) state", () => {
    const project = createEmptyProject("業務");
    for (const key of PROJECT_MODULE_KEYS) {
      expect(project.modules[key]).toEqual({});
    }
    expect(Object.keys(project.modules)).toHaveLength(PROJECT_MODULE_KEYS.length);
  });
});

describe("parseProject validation", () => {
  it("accepts a valid default project", () => {
    const project = createEmptyProject("業務");
    const result = parseProject(project);
    expect(result.ok).toBe(true);
  });

  it("rejects a project missing required fields", () => {
    const project = createEmptyProject("業務") as unknown as Record<string, unknown>;
    const { projectId, ...withoutId } = project;
    void projectId;
    const result = parseProject(withoutId);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.issues.join(";")).toContain("projectId");
    }
  });

  it("rejects a project with empty name", () => {
    const project = { ...createEmptyProject("業務"), name: "" };
    const result = parseProject(project);
    expect(result.ok).toBe(false);
  });

  it("rejects a project with invalid schemaVersion", () => {
    const project = { ...createEmptyProject("業務"), schemaVersion: "not-a-version" };
    const result = parseProject(project);
    expect(result.ok).toBe(false);
  });

  it("rejects a project with unknown top-level fields", () => {
    const project = { ...createEmptyProject("業務"), unexpectedField: true };
    const result = parseProject(project);
    expect(result.ok).toBe(false);
  });

  it("rejects a project missing a module key", () => {
    const project = createEmptyProject("業務");
    const { modules } = project;
    const { road, ...modulesWithoutRoad } = modules;
    void road;
    const result = parseProject({ ...project, modules: modulesWithoutRoad });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.issues.join(";")).toContain("modules");
    }
  });

  it("rejects non-object input", () => {
    expect(parseProject(null).ok).toBe(false);
    expect(parseProject(undefined).ok).toBe(false);
    expect(parseProject("not an object").ok).toBe(false);
    expect(parseProject(42).ok).toBe(false);
  });
});

describe("serialization", () => {
  it("serialize then deserialize preserves equality", () => {
    const project = createEmptyProject("保存検証業務");
    const json = serializeProject(project);
    const result = deserializeProject(json);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.project).toEqual(project);
    }
  });

  it("deserialize rejects malformed JSON", () => {
    const result = deserializeProject("{ not valid json");
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.issues.join(";")).toContain("JSON");
    }
  });

  it("deserialize rejects valid JSON that is not a valid project", () => {
    const result = deserializeProject('{"hello": "world"}');
    expect(result.ok).toBe(false);
  });
});

describe("schema version boundary", () => {
  it("schemaVersion must be required and present", () => {
    const project = createEmptyProject("業務");
    expect(project.schemaVersion).toBeDefined();
    expect(typeof project.schemaVersion).toBe("string");
  });

  it("migration boundary returns current project when no migration applies", () => {
    const project = createEmptyProject("業務");
    const result = migrateProject(project, PROJECT_SCHEMA_VERSION);
    expect(result.ok).toBe(true);
  });
});
