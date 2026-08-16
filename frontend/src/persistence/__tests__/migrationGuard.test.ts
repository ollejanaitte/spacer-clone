import { describe, expect, it } from "vitest";
import { createDefaultProject } from "../../data/defaultProject";
import { CURRENT_PROJECT_SCHEMA_VERSION, migrateProject } from "../../projectMigration";
import { validateLoadedProjectBeforeHydrate } from "../validationBoundary";
import {
  assertMigrationChainComplete,
  LEGACY_SCHEMA_VERSION,
  migrateProjectSafely,
  runSequentialMigrationSteps,
  type MigrationChain,
  type MigrationValidateFn,
} from "../migrationGuard";

const schemaValidator: MigrationValidateFn = () => ({ valid: true, errors: [] });

describe("A-07 Migration Guard", () => {
  it("schemaVersion 欠落は legacy 基準 v1 として確定する", () => {
    const raw = { ...createDefaultProject() } as Record<string, unknown>;
    delete raw.schemaVersion;
    const result = migrateProjectSafely(raw, { onValidate: schemaValidator });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.migratedFrom).toBe(LEGACY_SCHEMA_VERSION);
    expect(result.project.schemaVersion).toBe(CURRENT_PROJECT_SCHEMA_VERSION);
  });

  it("v1 入力は current へ migration される", () => {
    const result = migrateProjectSafely(createDefaultProject(), { onValidate: schemaValidator });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.migratedFrom).toBe(1);
    expect(result.project.schemaVersion).toBe(CURRENT_PROJECT_SCHEMA_VERSION);
    expect(result.project.project.name).toBe("5-Span Continuous Viaduct (Plan A)");
  });

  it("future schemaVersion は fail-closed で拒否される", () => {
    const raw = { ...createDefaultProject(), schemaVersion: 99 };
    const result = migrateProjectSafely(raw, { onValidate: schemaValidator });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.reason).toBe("future-version");
    expect(result.schemaVersion).toBe(99);
    expect(result.diagnostics.join(" ")).toContain("newer than the current supported version");
  });

  it("incompatible schemaVersion (非整数 / legacy 基準未満) は fail-closed で拒否される", () => {
    const fractional = migrateProjectSafely({ ...createDefaultProject(), schemaVersion: 1.5 });
    expect(fractional.ok).toBe(false);
    if (fractional.ok) return;
    expect(fractional.reason).toBe("incompatible-version");

    const belowLegacy = migrateProjectSafely({ ...createDefaultProject(), schemaVersion: 0 });
    expect(belowLegacy.ok).toBe(false);
    if (belowLegacy.ok) return;
    expect(belowLegacy.reason).toBe("incompatible-version");
  });

  it("pre-migration validation が失敗したら schema-invalid で拒否される", () => {
    const invalid = { ...createDefaultProject() } as Record<string, unknown>;
    delete invalid.nodes;
    const result = migrateProjectSafely(invalid, {
      onValidate: (project) => {
        const record = project as Record<string, unknown>;
        return {
          valid: typeof record.nodes === "object",
          errors: typeof record.nodes === "object" ? [] : [{ path: "/nodes", message: "required" }],
        };
      },
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.reason).toBe("schema-invalid");
    expect(result.diagnostics.join(" ")).toContain("Pre-migration");
  });

  it("post-migration validation が強制される", () => {
    const raw = { ...createDefaultProject() } as Record<string, unknown>;
    delete raw.schemaVersion;
    const postValidator: MigrationValidateFn = (project) => {
      const record = project as Record<string, unknown>;
      return {
        valid: record.schemaVersion === undefined,
        errors:
          record.schemaVersion === undefined
            ? []
            : [{ path: "/schemaVersion", message: "must be absent in this scenario" }],
      };
    };
    const result = migrateProjectSafely(raw, { onValidate: postValidator });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.reason).toBe("schema-invalid");
    expect(result.diagnostics.join(" ")).toContain("Post-migration");
  });

  it("sequential migration は順序どおり step を適用する (future multi-step mechanism)", () => {
    const applied: number[] = [];
    const chain: MigrationChain = {
      1: (raw) => {
        applied.push(1);
        return { ...raw, marker: "after-1" };
      },
      2: (raw) => {
        applied.push(2);
        return { ...raw, marker: `${(raw as { marker: string }).marker}+after-2` };
      },
    };
    const result = runSequentialMigrationSteps({ value: 0 }, 1, chain, 3);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(applied).toEqual([1, 2]);
    expect(result.steps).toEqual([1, 2]);
    expect(result.project.marker).toBe("after-1+after-2");
    expect(result.project.schemaVersion).toBe(3);
  });

  it("sequential migration は missing step を fail-closed で報告する", () => {
    const result = runSequentialMigrationSteps({}, 1, { 1: (raw) => raw }, 3);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.reason).toBe("migration-step-missing");
    expect(result.version).toBe(2);
  });

  it("migration chain の連続性 guard は missing step で throw する", () => {
    expect(() => assertMigrationChainComplete({ 1: (raw) => raw }, 3, 1)).toThrow(/missing/);
    expect(() => assertMigrationChainComplete({ 1: (raw) => raw, 2: (raw) => raw }, 3, 1)).not.toThrow();
  });

  it("LOAD 境界は future schemaVersion を fail-closed で拒否する", () => {
    const raw = { ...createDefaultProject(), schemaVersion: 42 };
    const result = validateLoadedProjectBeforeHydrate(raw);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.reason).toBe("future-version");
  });

  it("後方互換: migrateProject は従来の挙動を維持する (シグネチャ不変)", () => {
    const legacy = { ...createDefaultProject() } as Record<string, unknown>;
    delete legacy.schemaVersion;
    expect(migrateProject(legacy).schemaVersion).toBe(CURRENT_PROJECT_SCHEMA_VERSION);
    expect(migrateProject({ ...createDefaultProject(), schemaVersion: 7 }).schemaVersion).toBe(7);
  });
});
