import { describe, expect, it } from "vitest";
import { createDefaultProject, createEmptyProject } from "../../data/defaultProject";
import { createApolloPhase1Unit2DraftFromProject } from "../../apollo/unit2Draft";
import { createApollo200mContinuousBridgeSample } from "../../apollo/sampleProjects";
import { runCanonicalRoundtrip } from "../canonicalRoundtrip";
import {
  validateCanonicalProjectForSave,
  validateLoadedProjectBeforeHydrate,
  validateLoadedProjectJsonBeforeHydrate,
  validatePersistedProjectForSave,
} from "../validationBoundary";

describe("A-05 Validation Boundary", () => {
  describe("SAVE boundary", () => {
    it("valid ordinary project passes save validation", () => {
      const result = validateCanonicalProjectForSave(createDefaultProject());
      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.project.schemaVersion).toBe(1);
      expect(result.project.nodes.length).toBeGreaterThan(0);
    });

    it("valid Apollo project passes save validation", () => {
      const source = {
        ...createDefaultProject(),
        apolloPhase1Unit2: createApolloPhase1Unit2DraftFromProject(createDefaultProject()),
      };
      const result = validateCanonicalProjectForSave(source);
      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.project.apolloPhase1Unit2).toBeDefined();
    });

    it("Apollo 200m サンプルは公式 Schema に適合する (A-9 Apollo 是正)", () => {
      const sample = createApollo200mContinuousBridgeSample();
      expect(sample.supports.every((support) => !("label" in support))).toBe(true);
      expect(sample.materials[0]!.elasticModulus).toBeGreaterThan(0);
      expect(sample.materials[0]!.shearModulus).toBeGreaterThan(0);
      expect(sample.sections[0]!.area).toBeGreaterThan(0);

      const result = runCanonicalRoundtrip(sample);
      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.persisted).toBeDefined();
    });

    it("invalid persisted object (missing required field) fails save validation fail-closed", () => {
      const persisted = { ...createDefaultProject() } as Record<string, unknown>;
      delete persisted.nodes;
      const result = validatePersistedProjectForSave(persisted);
      expect(result.ok).toBe(false);
      if (result.ok) return;
      expect(result.reason).toBe("schema-invalid");
      expect(result.violations.length).toBeGreaterThan(0);
      expect(result.violations.some((entry) => entry.path === "/")).toBe(true);
      expect(result.diagnostics.join("; ")).toContain("nodes");
    });

    it("invalid persisted object (wrong type) fails save validation fail-closed", () => {
      const persisted = { ...createDefaultProject(), nodes: "not-an-array" } as unknown;
      const result = validatePersistedProjectForSave(persisted);
      expect(result.ok).toBe(false);
      if (result.ok) return;
      expect(result.reason).toBe("schema-invalid");
      expect(result.violations.some((entry) => entry.path.startsWith("/nodes"))).toBe(true);
    });

    it("empty runtime-transient project is refused for save (conscious exception)", () => {
      const result = validateCanonicalProjectForSave(createEmptyProject());
      expect(result.ok).toBe(false);
      if (result.ok) return;
      expect(result.reason).toBe("schema-invalid");
      const paths = new Set(result.violations.map((entry) => entry.path));
      expect(paths).toContain("/nodes");
      expect(paths).toContain("/materials");
      expect(paths).toContain("/sections");
      expect(paths).toContain("/analysisSettings");
    });
  });

  describe("LOAD boundary", () => {
    it("valid persisted object passes load validation after migration", () => {
      const roundtrip = runCanonicalRoundtrip(createDefaultProject());
      expect(roundtrip.ok).toBe(true);
      if (!roundtrip.ok) return;

      const result = validateLoadedProjectBeforeHydrate(roundtrip.persisted);
      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.project.schemaVersion).toBe(1);
    });

    it("legacy object without schemaVersion is treated as legacy v1 and passes load validation", () => {
      const persisted = { ...createDefaultProject() } as Record<string, unknown>;
      delete persisted.schemaVersion;
      const result = validateLoadedProjectBeforeHydrate(persisted);
      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.project.schemaVersion).toBe(1);
    });

    it("invalid persisted object fails load validation fail-closed", () => {
      const persisted = { ...createDefaultProject() } as Record<string, unknown>;
      delete persisted.supports;
      const result = validateLoadedProjectBeforeHydrate(persisted);
      expect(result.ok).toBe(false);
      if (result.ok) return;
      expect(result.reason).toBe("schema-invalid");
      expect(result.violations.length).toBeGreaterThan(0);
      expect(result.diagnostics.join("; ")).toContain("supports");
    });

    it("invalid persisted JSON text fails load validation with structured invalid-json failure", () => {
      const result = validateLoadedProjectJsonBeforeHydrate("{not valid json");
      expect(result.ok).toBe(false);
      if (result.ok) return;
      expect(result.reason).toBe("invalid-json");
      expect(result.diagnostics.length).toBeGreaterThan(0);
    });

    it("valid persisted JSON text passes load validation", () => {
      const roundtrip = runCanonicalRoundtrip(createDefaultProject());
      expect(roundtrip.ok).toBe(true);
      if (!roundtrip.ok) return;

      const result = validateLoadedProjectJsonBeforeHydrate(
        `${JSON.stringify(roundtrip.persisted, null, 2)}\n`,
      );
      expect(result.ok).toBe(true);
    });
  });

  describe("canonical chain integration", () => {
    it("runCanonicalRoundtrip remains ok for conformant projects", () => {
      const result = runCanonicalRoundtrip(createDefaultProject());
      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.project.project.name).toBe("5-Span Continuous Viaduct (Plan A)");
      expect(result.project.nodes.length).toBeGreaterThan(0);
    });

    it("runCanonicalRoundtrip with apollo sidecar remains ok", () => {
      const source = {
        ...createDefaultProject(),
        apolloPhase1Unit2: createApolloPhase1Unit2DraftFromProject(createDefaultProject()),
      };
      const result = runCanonicalRoundtrip(source);
      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.project.apolloPhase1Unit2).toBeDefined();
    });
  });
});
