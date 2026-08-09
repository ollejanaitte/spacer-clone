import { describe, expect, it } from "vitest";
import { createBusinessProjectMigrationDryRun } from "./migrationDryRun";

describe("createBusinessProjectMigrationDryRun", () => {
  it("never overwrites the source (non-destructive)", () => {
    const dryRun = createBusinessProjectMigrationDryRun();
    expect(dryRun.isSourceOverwritten()).toBe(false);
  });

  it("previews a project-json legacy payload into a BusinessProject plan", () => {
    const dryRun = createBusinessProjectMigrationDryRun();
    const result = dryRun.preview({
      format: "project-json",
      name: "旧プロジェクト",
      raw: {
        name: "旧プロジェクト",
        projectNumber: "LEGACY-001",
        roadDesign: { id: "road-1" },
        bridges: [{ id: "bridge-1" }],
      },
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.plan.targetBusinessName).toBe("旧プロジェクト");
      expect(result.plan.plannedChildKinds).toContain("road-design");
      expect(result.plan.plannedChildKinds).toContain("bridge-project");
      expect(result.manifest.projectId).toBe(result.plan.targetBusinessId);
      expect(result.manifest.projectNumber).toBe("LEGACY-001");
      // No child refs are fabricated during dry-run (preview only).
      expect(result.manifest.roadRefs).toEqual([]);
      expect(result.manifest.bridgeProjectRefs).toEqual([]);
    }
  });

  it("rejects a non-object legacy payload", () => {
    const dryRun = createBusinessProjectMigrationDryRun();
    const result = dryRun.preview({
      format: "project-json",
      name: "x",
      raw: "not-an-object",
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toContain("not an object");
    }
  });

  it("warns when no child entities are recognized", () => {
    const dryRun = createBusinessProjectMigrationDryRun();
    const result = dryRun.preview({
      format: "project-json",
      name: "empty",
      raw: { name: "empty" },
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(
        result.warnings.some((warning) => warning.toLowerCase().includes("no recognized child")),
      ).toBe(true);
      expect(result.manifest.roadRefs).toEqual([]);
    }
  });
});
