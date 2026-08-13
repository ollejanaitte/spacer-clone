import type { Project } from "../../project/schema";
import { serializeProject } from "../../project/projectDataCore";
import { parseProject } from "../../project/projectDataCore";
import {
  PACKAGE_FORMAT_VERSION,
  PROJECT_JSON_ENTRY,
  type PackageFileEntry,
  type PackageManifest,
  type SpacerProjPackage,
} from "./projectPackage";
import { computeSha256Hex } from "./packageChecksum";
import { utf8ByteLength } from "./utf8Length";

export type BuildPackageResult =
  | { ok: true; pkg: SpacerProjPackage; json: string }
  | { ok: false; reason: string };

export function buildProjectPackage(project: Project): BuildPackageResult {
  const parsed = parseProject(project);
  if (!parsed.ok) {
    return { ok: false, reason: `invalid-project: ${parsed.issues.join("; ")}` };
  }
  const projectJson = serializeProject(parsed.project);
  const fileEntry: PackageFileEntry = {
    path: PROJECT_JSON_ENTRY,
    size: utf8ByteLength(projectJson),
    checksum: computeSha256Hex(projectJson),
  };
  const manifest: PackageManifest = {
    packageFormatVersion: PACKAGE_FORMAT_VERSION,
    containerFormat: "spacerproj-json-v1",
    projectId: parsed.project.projectId,
    projectSchemaVersion: parsed.project.schemaVersion,
    createdAt: new Date().toISOString(),
    files: [fileEntry],
  };
  const pkg: SpacerProjPackage = {
    manifest,
    files: [{ path: PROJECT_JSON_ENTRY, content: projectJson }],
  };
  return { ok: true, pkg, json: JSON.stringify(pkg, null, 2) };
}

export function selfCheckPackage(pkg: SpacerProjPackage): { ok: true } | { ok: false; reason: string } {
  if (pkg.manifest.packageFormatVersion !== PACKAGE_FORMAT_VERSION) {
    return { ok: false, reason: "unsupported-package-format-version" };
  }
  if (pkg.manifest.files.length !== pkg.files.length) {
    return { ok: false, reason: "file-count-mismatch" };
  }
  for (const entry of pkg.manifest.files) {
    const file = pkg.files.find((f) => f.path === entry.path);
    if (!file) {
      return { ok: false, reason: `missing-file: ${entry.path}` };
    }
    if (utf8ByteLength(file.content) !== entry.size) {
      return { ok: false, reason: `size-mismatch: ${entry.path}` };
    }
    if (computeSha256Hex(file.content) !== entry.checksum) {
      return { ok: false, reason: `checksum-mismatch: ${entry.path}` };
    }
  }
  return { ok: true };
}
