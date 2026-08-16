import { describe, expect, it } from "vitest";
import { createDefaultProject } from "../../data/defaultProject";
import { runCanonicalRoundtrip } from "../canonicalRoundtrip";
import { validateProjectAgainstSchema } from "../projectSchemaValidator";
import { createApolloPhase1Unit2DraftFromProject } from "../../apollo/unit2Draft";

describe("A-04 Generic Persistence Roundtrip", () => {
  it("createDefaultProject が serialize → JSON → migrate → hydrate の主経路で成立する", () => {
    const result = runCanonicalRoundtrip(createDefaultProject());
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.project.project.name).toBe("5-Span Continuous Viaduct (Plan A)");
    expect(result.project.nodes.length).toBeGreaterThan(0);
    expect(result.project.members.length).toBeGreaterThan(0);
    expect(result.project.supports.length).toBeGreaterThan(0);
  });

  it("persisted 表現が公式 JSON Schema に適合する", () => {
    const result = runCanonicalRoundtrip(createDefaultProject());
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const persisted = result.persisted;
    expect(persisted).toBeDefined();
    const validation = validateProjectAgainstSchema(persisted);
    expect(validation.errors).toEqual([]);
    expect(validation.valid).toBe(true);
  });

  it("hydrate 後 Project が app 上成立する (migrate + hydrate 成功、構造健全)", () => {
    const result = runCanonicalRoundtrip(createDefaultProject());
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const hydrated = result.project;
    expect(hydrated.schemaVersion).toBeDefined();
    expect(hydrated.units.length).toBe("m");
    expect(hydrated.materials.length).toBeGreaterThan(0);
    expect(hydrated.sections.length).toBeGreaterThan(0);
    expect(hydrated.loadCases.length).toBeGreaterThan(0);
    expect(hydrated.analysisSettings.analysisType).toBe("linear_static");
  });

  it("apolloPhase1Unit2 sidecar 付き Project でも roundtrip が成立する", () => {
    const withSidecar = createApolloPhase1Unit2DraftFromProject(createDefaultProject());
    const source = { ...createDefaultProject(), apolloPhase1Unit2: withSidecar };

    const result = runCanonicalRoundtrip(source);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.persisted).toBeDefined();
    const validation = validateProjectAgainstSchema(result.persisted);
    expect(validation.errors).toEqual([]);
    expect(validation.valid).toBe(true);
    expect(result.project.apolloPhase1Unit2).toBeDefined();
  });
});
