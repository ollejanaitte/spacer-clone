import { parseProject } from "../../project/projectDataCore";
import {
  PACKAGE_FORMAT_VERSION,
  PROJECT_JSON_ENTRY,
  type PackageManifest,
  type SpacerProjPackage,
} from "./projectPackage";
import { computeSha256Hex } from "./packageChecksum";
import { utf8ByteLength } from "./utf8Length";

export type IntegrityStatus = "ok" | "ng";

export interface IntegrityReport {
  readonly fileName: string;
  readonly businessName: string;
  readonly businessNumber: string;
  readonly projectId: string;
  readonly schemaVersion: string;
  readonly packageFormatVersion: string;
  readonly packageSizeBytes: number;
  readonly fileIntegrity: IntegrityStatus;
  readonly projectSchema: IntegrityStatus;
  readonly requiredData: IntegrityStatus;
  readonly checksum: IntegrityStatus;
  readonly capacity: IntegrityStatus;
  readonly verdict: "loadable" | "not-loadable";
  readonly reasons: readonly string[];
}

export interface InspectPackageInput {
  readonly fileName: string;
  readonly rawJson: string;
  readonly availableBytes?: number;
}

export type InspectPackageResult =
  | { ok: true; report: IntegrityReport; pkg: SpacerProjPackage }
  | { ok: false; report: IntegrityReport; reason: string };

function parseRawJson(rawJson: string): { ok: true; pkg: SpacerProjPackage } | { ok: false; reason: string } {
  try {
    const parsed = JSON.parse(rawJson);
    if (!parsed || typeof parsed !== "object") {
      return { ok: false, reason: "invalid-package-root" };
    }
    if (typeof parsed.manifest !== "object" || parsed.manifest === null) {
      return { ok: false, reason: "missing-manifest" };
    }
    if (!Array.isArray(parsed.files)) {
      return { ok: false, reason: "missing-files" };
    }
    return { ok: true, pkg: parsed as SpacerProjPackage };
  } catch {
    return { ok: false, reason: "invalid-json" };
  }
}

function readManifestValue(manifest: PackageManifest, key: keyof PackageManifest): unknown {
  return manifest?.[key];
}

export function inspectProjectPackage(input: InspectPackageInput): InspectPackageResult {
  const reasons: string[] = [];
  const raw = parseRawJson(input.rawJson);
  if (!raw.ok) {
    const report: IntegrityReport = {
      fileName: input.fileName,
      businessName: "",
      businessNumber: "",
      projectId: "",
      schemaVersion: "",
      packageFormatVersion: "",
      packageSizeBytes: utf8ByteLength(input.rawJson),
      fileIntegrity: "ng",
      projectSchema: "ng",
      requiredData: "ng",
      checksum: "ng",
      capacity: "ng",
      verdict: "not-loadable",
      reasons: [raw.reason],
    };
    return { ok: false, report, reason: raw.reason };
  }
  const pkg = raw.pkg;
  const manifest = pkg.manifest;

  // package format version
  let fileIntegrity: IntegrityStatus = "ok";
  if (manifest.packageFormatVersion !== PACKAGE_FORMAT_VERSION) {
    reasons.push(`unsupported-package-format-version: ${String(readManifestValue(manifest, "packageFormatVersion"))}`);
    fileIntegrity = "ng";
  }
  if (typeof manifest.containerFormat !== "string" || !manifest.containerFormat.startsWith("spacerproj-")) {
    reasons.push("invalid-container-format");
    fileIntegrity = "ng";
  }
  if (!Array.isArray(manifest.files)) {
    reasons.push("missing-file-list");
    fileIntegrity = "ng";
  } else {
    for (const entry of manifest.files) {
      if (!entry || typeof entry.path !== "string") {
        reasons.push("invalid-file-entry");
        fileIntegrity = "ng";
        continue;
      }
      const file = pkg.files.find((f) => f.path === entry.path);
      if (!file) {
        reasons.push(`missing-file: ${entry.path}`);
        fileIntegrity = "ng";
        continue;
      }
      if (utf8ByteLength(file.content) !== entry.size) {
        reasons.push(`size-mismatch: ${entry.path}`);
        fileIntegrity = "ng";
      }
      if (computeSha256Hex(file.content) !== entry.checksum) {
        reasons.push(`checksum-mismatch: ${entry.path}`);
        fileIntegrity = "ng";
      }
    }
  }

  // project schema + required data
  const projectJsonEntry = pkg.files.find((f) => f.path === PROJECT_JSON_ENTRY);
  let projectSchema: IntegrityStatus = "ng";
  let requiredData: IntegrityStatus = "ng";
  let projectId = "";
  let schemaVersion = "";
  let businessName = "";
  let businessNumber = "";
  if (!projectJsonEntry) {
    reasons.push("missing-project.json");
  } else {
    let projectRaw: unknown;
    try {
      projectRaw = JSON.parse(projectJsonEntry.content);
    } catch {
      reasons.push("invalid-project-json");
    }
    const parsed = parseProject(projectRaw);
    if (!parsed.ok) {
      reasons.push(`invalid-project-schema: ${parsed.issues.join("; ")}`);
    } else {
      projectSchema = "ok";
      projectId = parsed.project.projectId;
      schemaVersion = parsed.project.schemaVersion;
      businessName = parsed.project.name;
      const bn = parsed.project.metadata?.businessNumber;
      businessNumber = typeof bn === "string" ? bn : "";
      if (!parsed.project.name || parsed.project.name.length === 0) {
        reasons.push("missing-business-name");
      } else {
        requiredData = "ok";
      }
      if (manifest.projectId !== parsed.project.projectId) {
        reasons.push("projectId-mismatch");
        projectSchema = "ng";
      }
      if (manifest.projectSchemaVersion !== parsed.project.schemaVersion) {
        reasons.push("schemaVersion-mismatch");
        projectSchema = "ng";
      }
    }
  }

  // capacity
  let capacity: IntegrityStatus = "ok";
  if (input.availableBytes !== undefined) {
    const total = pkg.files.reduce((sum, f) => sum + utf8ByteLength(f.content), 0);
    if (total > input.availableBytes) {
      reasons.push("insufficient-capacity");
      capacity = "ng";
    }
  }

  const verdict: IntegrityReport["verdict"] =
    fileIntegrity === "ok" && projectSchema === "ok" && requiredData === "ok" &&
    checksumStatus(pkg, reasons) === "ok" && capacity === "ok"
      ? "loadable"
      : "not-loadable";

  const report: IntegrityReport = {
    fileName: input.fileName,
    businessName,
    businessNumber,
    projectId,
    schemaVersion,
    packageFormatVersion: String(manifest.packageFormatVersion ?? ""),
    packageSizeBytes: utf8ByteLength(input.rawJson),
    fileIntegrity,
    projectSchema,
    requiredData,
    checksum: checksumStatus(pkg, reasons),
    capacity,
    verdict,
    reasons: Array.from(new Set(reasons)),
  };

  if (verdict === "loadable") {
    return { ok: true, report, pkg };
  }
  return { ok: false, report, reason: report.reasons.join("; ") };
}

function checksumStatus(pkg: SpacerProjPackage, reasons: string[]): IntegrityStatus {
  for (const entry of pkg.manifest.files ?? []) {
    const file = pkg.files.find((f) => f.path === entry.path);
    if (file && computeSha256Hex(file.content) !== entry.checksum) {
      reasons.push(`checksum-mismatch: ${entry.path}`);
      return "ng";
    }
  }
  return "ok";
}
