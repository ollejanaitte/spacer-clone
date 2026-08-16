import { describe, expect, it } from "vitest";
import { createDefaultProject, createEmptyProject } from "../../data/defaultProject";
import { serializeApolloPhase1Unit2ForPersistence } from "../../apollo/unit2Draft";
import { validateProjectAgainstSchema } from "../projectSchemaValidator";
import {
  EXCEPTIONAL_PATHS,
  assertExceptionalPathsStayExceptional,
  getExceptionalPath,
  isExceptionalPath,
  runExceptionalPathBoundary,
  type ExceptionalPathKind,
} from "../exceptionalPaths";

const EXPECTED_KINDS: readonly ExceptionalPathKind[] = [
  "apollo-workspace",
  "artifact-bundle",
  "substructure-adapter-envelope",
  "backend-save-load",
  "next-persistence",
  "importer-storage",
  "platform-business-storage",
  "apollo-import-export-path-difference",
];

describe("A-06 Exceptional Persistence Paths", () => {
  it("各文書化例外経路が kind として認識される", () => {
    for (const kind of EXPECTED_KINDS) {
      expect(isExceptionalPath(kind)).toBe(true);
      expect(getExceptionalPath(kind)?.kind).toBe(kind);
    }
    expect(EXCEPTIONAL_PATHS.map((path) => path.kind)).toEqual(EXPECTED_KINDS);
  });

  it("例外経路は canonical 検証チェーンを利用しない (契約)", () => {
    for (const path of EXCEPTIONAL_PATHS) {
      expect(path.usesCanonicalChain).toBe(false);
      expect(path.validationPolicy).not.toBe("canonical");
    }
    expect(() => assertExceptionalPathsStayExceptional()).not.toThrow();
  });

  it("例外経路は canonical-invalid なデータも自身の policy で受理し、canonical と乖離を warning で報告する", () => {
    const emptyProject = createEmptyProject();
    expect(validateProjectAgainstSchema(emptyProject).valid).toBe(false);

    const result = runExceptionalPathBoundary(
      { kind: "apollo-workspace", validationPolicy: "unit2-roundtrip-only" },
      emptyProject,
      (payload) =>
        typeof payload === "object" && payload !== null
          ? { ok: true as const, value: payload }
          : { ok: false as const, diagnostics: ["payload is not an object."] },
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.warnings.some((entry) => entry.includes("diverges from the official project schema"))).toBe(
      true,
    );
  });

  it("例外経路を流れる不正データは構造化 failure になる (静かな素通しをしない)", () => {
    const result = runExceptionalPathBoundary(
      { kind: "apollo-workspace", validationPolicy: "unit2-roundtrip-only" },
      "not-an-object",
      (payload) =>
        typeof payload === "object" && payload !== null
          ? { ok: true as const, value: payload }
          : { ok: false as const, diagnostics: ["payload is not an object."] },
    );
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.diagnostics.length).toBeGreaterThan(0);
    expect(result.diagnostics[0]).toContain("not an object");
  });

  it("例外経路は canonical policy を宣言できない (fail-closed)", () => {
    const result = runExceptionalPathBoundary(
      { kind: "backend-save-load", validationPolicy: "canonical" },
      {},
      () => ({ ok: true as const, value: {} }),
    );
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.diagnostics.join(" ")).toContain("canonical");
  });

  it("apollo workspace は実装上 unit2 roundtrip のみで、canonical-invalid プロジェクトを受理する", () => {
    const emptyProject = createEmptyProject();
    const serialized = serializeApolloPhase1Unit2ForPersistence(emptyProject);
    expect(serialized.ok).toBe(true);
    expect(validateProjectAgainstSchema(emptyProject).valid).toBe(false);
  });

  it("artifactBundle は raw snapshot 政策であり serializer 通過を契約しない", () => {
    const artifactBundle = getExceptionalPath("artifact-bundle");
    expect(artifactBundle).toBeDefined();
    expect(artifactBundle?.validationPolicy).toBe("raw-snapshot");
    expect(artifactBundle?.wired).toBe(true);
  });

  it("backend save/load は declared-but-unwired-at-app-level として契約化されている", () => {
    const backend = getExceptionalPath("backend-save-load");
    expect(backend).toBeDefined();
    expect(backend?.wired).toBe(true);
    expect(backend?.validationPolicy).toBe("legacy-no-schema-validation");
    expect(backend?.description).toContain("AUTOSAVE_ENABLED=false");
  });

  it("createDefaultProject は canonical 適合のため乖離 warning を出さない", () => {
    const result = runExceptionalPathBoundary(
      { kind: "apollo-import-export-path-difference", validationPolicy: "handwritten-strict" },
      createDefaultProject(),
      (payload) =>
        typeof payload === "object" && payload !== null
          ? { ok: true as const, value: payload }
          : { ok: false as const, diagnostics: ["payload is not an object."] },
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.warnings).toEqual([]);
  });
});
