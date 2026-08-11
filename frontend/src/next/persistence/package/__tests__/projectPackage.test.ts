import { describe, expect, it } from "vitest";
import { createEmptyProject } from "../../../project/projectDataCore";
import { applyBusinessMetadata } from "../../../project/businessMetadata";
import { buildProjectPackage, selfCheckPackage } from "../projectPackageBuilder";
import { inspectProjectPackage } from "../projectPackageInspector";
import { PACKAGE_FORMAT_VERSION, PROJECT_JSON_ENTRY } from "../projectPackage";
import { computeSha256Hex } from "../packageChecksum";
import { isUnsafeRelativePath, hasUnsafePathInPackage } from "../packagePathSafety";

function makeProject(name = "テスト業務") {
  return applyBusinessMetadata(createEmptyProject(name), {
    businessNumber: "B-2026-001",
    designStage: "road-detailed",
  });
}

describe("buildProjectPackage", () => {
  it("builds a valid package with manifest, project.json, and checksum", () => {
    const project = makeProject();
    const result = buildProjectPackage(project);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.pkg.manifest.packageFormatVersion).toBe(PACKAGE_FORMAT_VERSION);
    expect(result.pkg.manifest.containerFormat).toBe("spacerproj-json-v1");
    expect(result.pkg.manifest.projectId).toBe(project.projectId);
    expect(result.pkg.manifest.projectSchemaVersion).toBe(project.schemaVersion);
    expect(result.pkg.manifest.files).toHaveLength(1);
    expect(result.pkg.manifest.files[0].path).toBe(PROJECT_JSON_ENTRY);
    expect(result.pkg.manifest.files[0].size).toBeGreaterThan(0);
    expect(result.pkg.manifest.files[0].checksum).toMatch(/^[0-9a-f]{64}$/);
    expect(result.pkg.files[0].content).toContain(project.projectId);
  });

  it("rejects invalid project", () => {
    const invalid = { ...makeProject(), name: "" } as never;
    const result = buildProjectPackage(invalid);
    expect(result.ok).toBe(false);
  });

  it("self-check passes on a built package", () => {
    const result = buildProjectPackage(makeProject());
    if (!result.ok) return;
    expect(selfCheckPackage(result.pkg)).toEqual({ ok: true });
  });
});

describe("inspectProjectPackage (valid)", () => {
  it("reports loadable with all ok on a valid package", () => {
    const project = makeProject();
    const built = buildProjectPackage(project);
    if (!built.ok) return;
    const result = inspectProjectPackage({
      fileName: "test.spacerproj",
      rawJson: built.json,
      availableBytes: 1024 * 1024,
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.report.fileIntegrity).toBe("ok");
    expect(result.report.projectSchema).toBe("ok");
    expect(result.report.requiredData).toBe("ok");
    expect(result.report.checksum).toBe("ok");
    expect(result.report.capacity).toBe("ok");
    expect(result.report.verdict).toBe("loadable");
    expect(result.report.businessName).toBe("テスト業務");
    expect(result.report.businessNumber).toBe("B-2026-001");
    expect(result.report.projectId).toBe(project.projectId);
    expect(result.report.schemaVersion).toBe(project.schemaVersion);
    expect(result.report.packageFormatVersion).toBe(PACKAGE_FORMAT_VERSION);
  });

  it("rejects invalid JSON (corrupted package)", () => {
    const result = inspectProjectPackage({ fileName: "bad.spacerproj", rawJson: "{ broken" });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.report.verdict).toBe("not-loadable");
      expect(result.report.reasons).toContain("invalid-json");
    }
  });

  it("rejects missing manifest", () => {
    const result = inspectProjectPackage({ fileName: "x.spacerproj", rawJson: JSON.stringify({ files: [] }) });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.report.reasons).toContain("missing-manifest");
  });
});

describe("corrupted package rejection (R1-05 required cases)", () => {
  it("CASE B: corrupted project.json -> checksum mismatch -> reject", () => {
    const built = buildProjectPackage(makeProject());
    if (!built.ok) return;
    const tampered = {
      ...built.pkg,
      files: [{ path: PROJECT_JSON_ENTRY, content: built.pkg.files[0].content.replace('"name"', '"nAme"') }],
    };
    const result = inspectProjectPackage({
      fileName: "corrupt.spacerproj",
      rawJson: JSON.stringify(tampered),
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.report.verdict).toBe("not-loadable");
  });

  it("CASE C: invalid schemaVersion -> reject", () => {
    const built = buildProjectPackage(makeProject());
    if (!built.ok) return;
    const tampered = {
      ...built.pkg,
      manifest: { ...built.pkg.manifest, projectSchemaVersion: "not-a-version" },
    };
    const result = inspectProjectPackage({ fileName: "v.spacerproj", rawJson: JSON.stringify(tampered) });
    expect(result.ok).toBe(false);
  });

  it("CASE D: missing required file (project.json absent) -> reject", () => {
    const built = buildProjectPackage(makeProject());
    if (!built.ok) return;
    const tampered = {
      ...built.pkg,
      manifest: { ...built.pkg.manifest, files: [] },
      files: [],
    };
    const result = inspectProjectPackage({ fileName: "missing.spacerproj", rawJson: JSON.stringify(tampered) });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.report.reasons).toContain("missing-project.json");
  });

  it("CASE E: checksum mismatch -> reject", () => {
    const built = buildProjectPackage(makeProject());
    if (!built.ok) return;
    const tampered = {
      ...built.pkg,
      manifest: {
        ...built.pkg.manifest,
        files: [{ ...built.pkg.manifest.files[0], checksum: "0".repeat(64) }],
      },
    };
    const result = inspectProjectPackage({ fileName: "cs.spacerproj", rawJson: JSON.stringify(tampered) });
    expect(result.ok).toBe(false);
  });

  it("CASE F: invalid manifest (bad package format version) -> reject", () => {
    const built = buildProjectPackage(makeProject());
    if (!built.ok) return;
    const tampered = {
      ...built.pkg,
      manifest: { ...built.pkg.manifest, packageFormatVersion: "999" },
    };
    const result = inspectProjectPackage({ fileName: "m.spacerproj", rawJson: JSON.stringify(tampered) });
    expect(result.ok).toBe(false);
  });

  it("CASE G: insufficient capacity -> reject", () => {
    const built = buildProjectPackage(makeProject());
    if (!built.ok) return;
    const result = inspectProjectPackage({
      fileName: "cap.spacerproj",
      rawJson: built.json,
      availableBytes: 10,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.report.reasons).toContain("insufficient-capacity");
  });
});

describe("packagePathSafety", () => {
  it("flags path traversal and absolute paths as unsafe", () => {
    expect(isUnsafeRelativePath("../escape.txt")).toBe(true);
    expect(isUnsafeRelativePath("a/../../escape.txt")).toBe(true);
    expect(isUnsafeRelativePath("/etc/passwd")).toBe(true);
    expect(isUnsafeRelativePath("C:\\windows\\file.txt")).toBe(true);
    expect(isUnsafeRelativePath("")).toBe(true);
    expect(isUnsafeRelativePath("project.json")).toBe(false);
    expect(isUnsafeRelativePath("road/data.json")).toBe(false);
  });

  it("detects unsafe paths inside a package", () => {
    const built = buildProjectPackage(makeProject());
    if (!built.ok) return;
    const unsafePkg = {
      ...built.pkg,
      files: [{ path: "../escape.txt", content: "x" }],
    };
    expect(hasUnsafePathInPackage(unsafePkg)).toBe(true);
    expect(hasUnsafePathInPackage(built.pkg)).toBe(false);
  });
});

describe("computeSha256Hex", () => {
  it("produces a stable 64-char sha256 hex", () => {
    expect(computeSha256Hex("hello")).toBe(computeSha256Hex("hello"));
    expect(computeSha256Hex("hello")).toHaveLength(64);
    expect(computeSha256Hex("hello")).not.toBe(computeSha256Hex("world"));
  });
});
