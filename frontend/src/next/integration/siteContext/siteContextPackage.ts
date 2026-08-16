import type {
  SiteContextExportEnvelope,
  SiteContextImportErrorCode,
  SiteContextPackage,
  SiteContextPackageFile,
} from "./adapterContract";
import { SUPPORTED_SITE_CONTEXT_EXPORT_PROFILE, SUPPORTED_SITE_CONTEXT_PACKAGE_FORMAT, SUPPORTED_SITE_CONTEXT_PACKAGE_VERSION } from "./adapterContract";
import { SUPPORTED_SOURCE_SCHEMA_VERSIONS } from "./adapterContract";
import { base64ToBytes, bytesToUtf8, canonicalHash, sha256HexBytes } from "./siteContextHash";

/**
 * `.sitecontext` envelope / package integrity validation (fail-closed).
 *
 * - Envelope format/version/exportProfile/schemaVersion → INCOMPATIBLE-VERSION
 * - Package file size / checksum mismatch, missing or unexpected entries →
 *   CORRUPT-SOURCE
 *
 * Checksums: the app-side ExportEnvelope records `files[].checksum` as the
 * site-context `canonicalHash` (canonicalize + sha256) of the file content
 * string (data-contract §3.16). Binary package content is verified with plain
 * sha256 to stay compatible with the Node-side exporter.
 */

export class SiteContextPackageError extends Error {
  readonly errorCode: SiteContextImportErrorCode;
  constructor(errorCode: SiteContextImportErrorCode, message: string) {
    super(message);
    this.name = "SiteContextPackageError";
    this.errorCode = errorCode;
  }
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function validateEnvelopeCompatibility(envelope: SiteContextExportEnvelope): void {
  if (envelope.format !== SUPPORTED_SITE_CONTEXT_PACKAGE_FORMAT) {
    throw new SiteContextPackageError(
      "SC-ERR-INCOMPATIBLE-VERSION",
      `unsupported package format: ${String(envelope.format)}`,
    );
  }
  if (envelope.version !== SUPPORTED_SITE_CONTEXT_PACKAGE_VERSION) {
    throw new SiteContextPackageError(
      "SC-ERR-INCOMPATIBLE-VERSION",
      `unsupported package version: ${String(envelope.version)}`,
    );
  }
  if (envelope.exportProfile !== SUPPORTED_SITE_CONTEXT_EXPORT_PROFILE) {
    throw new SiteContextPackageError(
      "SC-ERR-INCOMPATIBLE-VERSION",
      `unsupported export profile: ${String(envelope.exportProfile)}`,
    );
  }
  if (
    !(SUPPORTED_SOURCE_SCHEMA_VERSIONS as readonly string[]).includes(String(envelope.schemaVersion))
  ) {
    throw new SiteContextPackageError(
      "SC-ERR-INCOMPATIBLE-VERSION",
      `unsupported source schemaVersion: ${String(envelope.schemaVersion)} (supported: ${SUPPORTED_SOURCE_SCHEMA_VERSIONS.join(",")})`,
    );
  }
}

/** Returns the file content as text (string content as-is; bytes decoded utf8). */
export function fileContentText(file: SiteContextPackageFile): string {
  return typeof file.content === "string" ? file.content : bytesToUtf8(file.content);
}

/** Returns the file content as raw bytes. */
export function fileContentBytes(file: SiteContextPackageFile): Uint8Array {
  return typeof file.content === "string" ? base64ToBytes(file.content) : file.content;
}

/**
 * Verify every envelope file entry against the carried package files, plus
 * bidirectional coverage (no unexpected entries). Throws CORRUPT-SOURCE.
 */
export async function verifyPackageFileIntegrity(
  envelope: SiteContextExportEnvelope,
  files: readonly SiteContextPackageFile[],
): Promise<void> {
  const byPath = new Map(files.map((f) => [f.path, f]));
  const declared = new Set(envelope.files.map((f) => f.path));

  for (const entry of envelope.files) {
    const file = byPath.get(entry.path);
    if (!file) {
      throw new SiteContextPackageError("SC-ERR-CORRUPT-SOURCE", `missing package file: ${entry.path}`);
    }
    if (file.size !== entry.size) {
      throw new SiteContextPackageError(
        "SC-ERR-CORRUPT-SOURCE",
        `size mismatch for ${entry.path}: expected ${entry.size}, got ${file.size}`,
      );
    }
    let expected: string;
    if (entry.path === "project.json") {
      // The app-side exporter records canonicalHash(project) — the parsed
      // project object, not the raw JSON string (packageExport.ts:28).
      if (!isRecord(envelope.project)) {
        throw new SiteContextPackageError("SC-ERR-CORRUPT-SOURCE", "envelope.project must be an object");
      }
      expected = await canonicalHash(envelope.project);
    } else if (typeof file.content === "string") {
      expected = await canonicalHash(file.content);
    } else {
      expected = sha256HexBytes(file.content);
    }
    if (expected !== entry.checksum) {
      throw new SiteContextPackageError(
        "SC-ERR-CORRUPT-SOURCE",
        `checksum mismatch for ${entry.path}`,
      );
    }
  }

  for (const file of files) {
    if (file.path === "package-manifest.json" || file.path === "project.json") continue;
    if (!declared.has(file.path)) {
      throw new SiteContextPackageError(
        "SC-ERR-CORRUPT-SOURCE",
        `unexpected package file not declared in envelope: ${file.path}`,
      );
    }
  }
}

/** Parse a JSON package file; throws CORRUPT-SOURCE when malformed. */
export function parseJsonFileContent(file: SiteContextPackageFile): unknown {
  try {
    return JSON.parse(fileContentText(file));
  } catch {
    throw new SiteContextPackageError("SC-ERR-CORRUPT-SOURCE", `malformed JSON: ${file.path}`);
  }
}

/**
 * Cross-check the inline `envelope.project` against the `project.json` file
 * when present (canonicalHash equality). Throws CORRUPT-SOURCE on mismatch.
 */
export async function verifyInlineProjectMatchesFile(
  envelope: SiteContextExportEnvelope,
  files: readonly SiteContextPackageFile[],
): Promise<void> {
  if (!isRecord(envelope.project)) {
    throw new SiteContextPackageError("SC-ERR-CORRUPT-SOURCE", "envelope.project must be an object");
  }
  const projectJsonFile = files.find((f) => f.path === "project.json");
  if (!projectJsonFile) return;
  const parsed = parseJsonFileContent(projectJsonFile);
  if (!isRecord(parsed)) {
    throw new SiteContextPackageError("SC-ERR-CORRUPT-SOURCE", "project.json must be an object");
  }
  const inlineHash = await canonicalHash(envelope.project);
  const fileHash = await canonicalHash(parsed);
  if (inlineHash !== fileHash) {
    throw new SiteContextPackageError(
      "SC-ERR-CORRUPT-SOURCE",
      "envelope.project does not match project.json",
    );
  }
}

export function findPackageFile(
  files: readonly SiteContextPackageFile[],
  path: string,
): SiteContextPackageFile | undefined {
  return files.find((f) => f.path === path);
}

export interface ResolvedAsset {
  readonly file: SiteContextPackageFile;
  readonly bytes: Uint8Array;
}

export type AssetContentEncoding = "base64" | "utf8" | "binary";

export function utf8Bytes(value: string): Uint8Array {
  return new TextEncoder().encode(value);
}

/**
 * Resolve an asset reference from the package files and verify its content
 * sha256 and byte size. Missing → INVALID-TERRAIN-REF; checksum/size
 * mismatch → CORRUPT-SOURCE. String content is decoded per `encoding`:
 * elevation assets are base64 (field-mapping §3.9: the base64-decoded bytes
 * are verified against the plain sha256 stored in the asset reference),
 * existing-condition JSON assets are UTF-8.
 */
export function resolveAssetBytes(
  packageFiles: readonly SiteContextPackageFile[],
  assetRef: { readonly path: string; readonly checksum: string; readonly size: number },
  opts?: {
    readonly errorCode?: SiteContextImportErrorCode;
    readonly encoding?: AssetContentEncoding;
  },
): ResolvedAsset {
  const file = findPackageFile(packageFiles, assetRef.path);
  if (!file) {
    throw new SiteContextPackageError(
      opts?.errorCode ?? "SC-ERR-INVALID-TERRAIN-REF",
      `referenced asset missing: ${assetRef.path}`,
    );
  }
  let bytes: Uint8Array;
  if (typeof file.content === "string") {
    const encoding = opts?.encoding ?? "base64";
    bytes = encoding === "utf8" ? utf8Bytes(file.content) : base64ToBytes(file.content);
  } else {
    bytes = file.content;
  }
  const actualChecksum = sha256HexBytes(bytes);
  if (actualChecksum !== assetRef.checksum) {
    throw new SiteContextPackageError(
      "SC-ERR-CORRUPT-SOURCE",
      `asset checksum mismatch: ${assetRef.path}`,
    );
  }
  if (bytes.length !== assetRef.size) {
    throw new SiteContextPackageError(
      "SC-ERR-CORRUPT-SOURCE",
      `asset size mismatch: ${assetRef.path}`,
    );
  }
  return { file, bytes };
}
