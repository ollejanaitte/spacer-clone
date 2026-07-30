import { migrateProject } from "../projectMigration";
import {
  hydrateProjectLinerFromPersistence,
  serializeProjectForPersistence,
} from "../liner/adapters/linerProjectDraft";
import type { ProjectModel } from "../types";
import {
  APOLLO_PHASE1_UNIT2_SCHEMA_VERSION,
  hydrateApolloPhase1Unit2FromPersistence,
  serializeApolloPhase1Unit2ForPersistence,
  validateApolloPhase1Unit2Draft,
  getApolloPhase1Unit2Draft,
} from "./unit2Draft";

export const APOLLO_IMPORT_EXPORT_CONTENT_TYPE = "application/json;charset=utf-8";

export type ApolloImportDecodeResult =
  | { readonly ok: true; readonly text: string }
  | { readonly ok: false; readonly diagnostics: readonly string[] };

export type ApolloProjectImportResult =
  | { readonly ok: true; readonly project: ProjectModel }
  | { readonly ok: false; readonly diagnostics: readonly string[] };

export type ApolloProjectExportResult =
  | { readonly ok: true; readonly content: string; readonly project: ProjectModel }
  | { readonly ok: false; readonly diagnostics: readonly string[] };

const APOLLO_DRAFT_KEYS = new Set([
  "schemaVersion",
  "metadata",
  "nodes",
  "materialReferences",
  "members",
  "supports",
  "audit",
]);

const APOLLO_METADATA_KEYS = new Set([
  "projectId",
  "name",
  "description",
  "createdAt",
  "updatedAt",
  "provisionalStatus",
  "localDraftStatus",
]);

const REQUIRED_PROJECT_ARRAY_KEYS = [
  "nodes",
  "materials",
  "sections",
  "members",
  "supports",
  "loadCases",
  "nodalLoads",
  "memberLoads",
] as const;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function unknownKeys(record: Record<string, unknown>, allowed: ReadonlySet<string>): string[] {
  return Object.keys(record).filter((key) => !allowed.has(key));
}

function stripUtf8Bom(text: string): string {
  return text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;
}

export function decodeApolloImportText(input: string | Uint8Array): ApolloImportDecodeResult {
  if (typeof input === "string") {
    return { ok: true, text: stripUtf8Bom(input) };
  }
  if (input.length >= 2 && input[0] === 0xff && input[1] === 0xfe) {
    return { ok: false, diagnostics: ["UTF-16 encoding is not supported for Apollo import."] };
  }
  if (input.length >= 2 && input[0] === 0xfe && input[1] === 0xff) {
    return { ok: false, diagnostics: ["UTF-16 encoding is not supported for Apollo import."] };
  }
  let offset = 0;
  if (input.length >= 3 && input[0] === 0xef && input[1] === 0xbb && input[2] === 0xbf) {
    offset = 3;
  }
  try {
    const text = new TextDecoder("utf-8", { fatal: true }).decode(input.subarray(offset));
    return { ok: true, text: stripUtf8Bom(text) };
  } catch {
    return { ok: false, diagnostics: ["Apollo import requires valid UTF-8 text."] };
  }
}

function validateProjectEnvelope(raw: unknown): readonly string[] {
  if (!isRecord(raw)) {
    return ["Project import payload must be a JSON object."];
  }
  if (typeof raw.schemaVersion !== "number") {
    return ["Project import payload is missing schemaVersion."];
  }
  if (!isRecord(raw.project) || typeof raw.project.id !== "string") {
    return ["Project import payload is missing project.id."];
  }
  if (!isRecord(raw.units)) {
    return ["Project import payload is missing units."];
  }
  if (!isRecord(raw.analysisSettings)) {
    return ["Project import payload is missing analysisSettings."];
  }
  const diagnostics: string[] = [];
  for (const key of REQUIRED_PROJECT_ARRAY_KEYS) {
    if (!Array.isArray(raw[key])) {
      diagnostics.push(`Project import payload is missing ${key}.`);
    }
  }
  return diagnostics;
}

function validateApolloSidecarStrict(raw: unknown): readonly string[] {
  if (!isRecord(raw)) {
    return ["Apollo sidecar must be an object."];
  }
  const diagnostics = unknownKeys(raw, APOLLO_DRAFT_KEYS).map(
    (key) => `Apollo sidecar contains unsupported field: ${key}.`,
  );
  if (raw.schemaVersion !== APOLLO_PHASE1_UNIT2_SCHEMA_VERSION) {
    diagnostics.push(
      `Apollo sidecar schemaVersion must be ${APOLLO_PHASE1_UNIT2_SCHEMA_VERSION}.`,
    );
  }
  if (!isRecord(raw.metadata)) {
    diagnostics.push("Apollo sidecar metadata is required.");
  } else {
    diagnostics.push(
      ...unknownKeys(raw.metadata, APOLLO_METADATA_KEYS).map(
        (key) => `Apollo metadata contains unsupported field: ${key}.`,
      ),
    );
  }
  return diagnostics;
}

export function importApolloProjectFromText(text: string): ApolloProjectImportResult {
  const decoded = decodeApolloImportText(text);
  if (!decoded.ok) {
    return decoded;
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(decoded.text);
  } catch {
    return { ok: false, diagnostics: ["Project import payload is not valid JSON."] };
  }

  const envelopeDiagnostics = validateProjectEnvelope(parsed);
  if (envelopeDiagnostics.length > 0) {
    return { ok: false, diagnostics: envelopeDiagnostics };
  }

  const record = parsed as Record<string, unknown>;
  if (record.apolloPhase1Unit2 === undefined) {
    return { ok: false, diagnostics: ["Apollo sidecar apolloPhase1Unit2 is required for import."] };
  }

  const sidecarDiagnostics = validateApolloSidecarStrict(record.apolloPhase1Unit2);
  if (sidecarDiagnostics.length > 0) {
    return { ok: false, diagnostics: sidecarDiagnostics };
  }

  const migrated = migrateProject(parsed);
  const linerHydration = hydrateProjectLinerFromPersistence(migrated);
  if (!linerHydration.ok) {
    return { ok: false, diagnostics: linerHydration.diagnostics };
  }

  const apolloHydration = hydrateApolloPhase1Unit2FromPersistence(linerHydration.project);
  if (!apolloHydration.ok) {
    return { ok: false, diagnostics: apolloHydration.diagnostics };
  }

  const validation = validateApolloPhase1Unit2Draft(getApolloPhase1Unit2Draft(apolloHydration.project));
  if (validation.errors.length > 0) {
    return {
      ok: false,
      diagnostics: validation.errors.map((entry) => entry.message),
    };
  }

  return { ok: true, project: apolloHydration.project };
}

export function exportApolloProjectToText(project: ProjectModel): ApolloProjectExportResult {
  const apolloSerialized = serializeApolloPhase1Unit2ForPersistence(project);
  if (!apolloSerialized.ok) {
    return { ok: false, diagnostics: apolloSerialized.diagnostics };
  }
  const serialized = serializeProjectForPersistence(apolloSerialized.project);
  if (!serialized.ok) {
    return { ok: false, diagnostics: serialized.diagnostics };
  }
  return {
    ok: true,
    project: serialized.project,
    content: `${JSON.stringify(serialized.project, null, 2)}\n`,
  };
}
