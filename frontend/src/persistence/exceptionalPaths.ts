import { validateProjectAgainstSchema } from "./projectSchemaValidator";

/**
 * A-06 Exceptional Persistence Paths — 例外経路の境界契約。
 *
 * canonical chain (serialize → JSON → migrate → hydrate + 公式 Schema validation) 以外の
 * 実存する Persistence 経路を「正式な例外」として契約化する。各例外経路は:
 *
 * - 固有の kind で識別される
 * - 固有の (非 canonical) validation policy を持つ
 * - 決して canonical セマンティクスへ静かに昇格しない (usesCanonicalChain === false)
 *
 * 本モジュールは例外経路の実装を変更しない。契約の宣言 + 例外経路が自身の
 * validation を実行するための typed helper を提供する。helper は payload が
 * 公式 Schema と乖離 (diverge) する場合に warning を返す (例外経路の受理を妨げない)。
 *
 * 参照: docs/development/phase-a-persistence-automation-plan.md §4.1 / §5
 */

export type ExceptionalPathKind =
  | "apollo-workspace"
  | "artifact-bundle"
  | "substructure-adapter-envelope"
  | "backend-save-load"
  | "next-persistence"
  | "importer-storage"
  | "platform-business-storage"
  | "apollo-import-export-path-difference";

export type ExceptionalValidationPolicy =
  | "unit2-roundtrip-only"
  | "raw-snapshot"
  | "independent-adapter-envelope"
  | "legacy-no-schema-validation"
  | "zod-strict-schema"
  | "manifest-schema"
  | "handwritten-strict";

export interface ExceptionalPathContract {
  readonly kind: ExceptionalPathKind;
  readonly label: string;
  /** 実装の所在 (ソースパス)。declared-but-unwired でも実装が存在すれば記載する。 */
  readonly location: string;
  readonly validationPolicy: ExceptionalValidationPolicy;
  /** 例外経路は canonical 検証チェーンを利用してはならない (契約)。 */
  readonly usesCanonicalChain: false;
  /** 現行コードに実装が存在するか。存在しない経路は宣言のみ (declared-but-unwired)。 */
  readonly wired: boolean;
  readonly description: string;
}

export const EXCEPTIONAL_PATHS: readonly ExceptionalPathContract[] = [
  {
    kind: "apollo-workspace",
    label: "Apollo workspace (localStorage snapshot)",
    location: "frontend/src/apollo/workspace.ts",
    validationPolicy: "unit2-roundtrip-only",
    usesCanonicalChain: false,
    wired: true,
    description:
      "localStorage の一時スナップショット。serializeApolloPhase1Unit2ForPersistence / " +
      "hydrateApolloPhase1Unit2FromPersistence のみで unit2 roundtrip を保証。migrateProject・" +
      "公式 Schema・canonical chain を通さない (一時キャッシュであり canonical persistence は project.json)。",
  },
  {
    kind: "artifact-bundle",
    label: "artifactBundle (ZIP 内 raw project 埋め込み)",
    location: "frontend/src/apollo/drawing/artifactBundle.ts",
    validationPolicy: "raw-snapshot",
    usesCanonicalChain: false,
    wired: true,
    description:
      "ZIP 内 02_input/project.json へ runtime Project をそのまま埋め込む (serializer 非通過)。" +
      "load-back 経路ではない「現状スナップショット」。Schema 適合は要求しない。",
  },
  {
    kind: "substructure-adapter-envelope",
    label: "substructure 単独 AdapterEnvelope (substructure-project.json)",
    location:
      "frontend/src/substructure/planning/persistence.ts + frontend/src/substructure/design/adapterPersistence.ts",
    validationPolicy: "independent-adapter-envelope",
    usesCanonicalChain: false,
    wired: true,
    description:
      "公式 Schema の optional projectSubstructure とは別の独立形式 (SUBSTRUCTURE_SCHEMA_VERSION 0.2.0)。" +
      "独自 validateSubstructureProject / validateAdapterInput / validateAdapterResult で fail-closed。",
  },
  {
    kind: "backend-save-load",
    label: "backend /api/projects/save|load|autosave (legacy project JSON)",
    location: "backend/app/main.py + frontend/src/api/client.ts",
    validationPolicy: "legacy-no-schema-validation",
    usesCanonicalChain: false,
    wired: true,
    description:
      "backend/data/projects/ へ legacy project JSON を保存/復元。現行は find_non_finite のみで" +
      "公式 Schema validation なし (Phase A 後へ延期)。AUTOSAVE_ENABLED=false で autosave は無効。" +
      "API client メソッドは存在するが App からの呼び出し元は無い (unwired-at-app-level)。",
  },
  {
    kind: "next-persistence",
    label: "next/persistence (filesystem Project persistence)",
    location: "frontend/src/next/persistence/filesystemProjectPersistence.ts",
    validationPolicy: "zod-strict-schema",
    usesCanonicalChain: false,
    wired: true,
    description:
      "next/project の zod Project (PROJECT_SCHEMA_VERSION 1.0.0) を正本とする並列層。" +
      "parseProject / serializeProject (zod) で独立 validation。ProjectModel とは別系統で" +
      "canonical chain を利用しない。",
  },
  {
    kind: "importer-storage",
    label: "liner importer storage (JIP importer project JSON)",
    location: "frontend/src/liner/importer/storage/jsonImportExport.ts + importerStorage.ts",
    validationPolicy: "independent-adapter-envelope",
    usesCanonicalChain: false,
    wired: true,
    description:
      "importer 固有 schema (IMPORTER_SCHEMA_VERSION) + migrationRegistry + " +
      "validateImporterProjectSchema で独立 fail-closed。canonical ProjectModel とは別形式。",
  },
  {
    kind: "platform-business-storage",
    label: "platform business localStorage (engineering-project manifest)",
    location: "frontend/src/platform/storage/businessProjectPersistence.ts",
    validationPolicy: "manifest-schema",
    usesCanonicalChain: false,
    wired: true,
    description:
      "BusinessProject manifest (engineering-project 0.2.0) を localStorage に保存。独自の" +
      "validateBusinessProjectManifest で fail-closed。ProjectModel とは無関係の契約群。",
  },
  {
    kind: "apollo-import-export-path-difference",
    label: "apollo import/export (独立 strict validation + version 事前必須の経路差)",
    location: "frontend/src/apollo/importExport.ts",
    validationPolicy: "handwritten-strict",
    usesCanonicalChain: false,
    wired: true,
    description:
      "envelope / apollo sidecar の手書き strict validation を維持し、migrate 前に top-level " +
      "schemaVersion を必須検証する経路差を持つ (canonical と同一化しない)。A-05 で App 境界が" +
      "公式 Schema validation を前置する (置換ではなく補強)。",
  },
];

export function isExceptionalPath(kind: string): kind is ExceptionalPathKind {
  return EXCEPTIONAL_PATHS.some((path) => path.kind === kind);
}

export function getExceptionalPath(kind: ExceptionalPathKind): ExceptionalPathContract | undefined {
  return EXCEPTIONAL_PATHS.find((path) => path.kind === kind);
}

/**
 * 例外経路契約の不変条件 guard。canonical セマンティクスへの静かな昇格を拒否する。
 * 例外経路が canonical 検証チェーンを利用すると宣言された場合に throw する。
 */
export function assertExceptionalPathsStayExceptional(): void {
  for (const path of EXCEPTIONAL_PATHS) {
    if (path.usesCanonicalChain) {
      throw new Error(
        `Exceptional path ${path.kind} must not declare canonical chain usage (usesCanonicalChain).`,
      );
    }
  }
}

export type ExceptionalPathValidator<T> = (
  payload: unknown,
) => { ok: true; value: T } | { ok: false; diagnostics: readonly string[] };

export type ExceptionalPathBoundaryResult<T> =
  | { readonly ok: true; readonly value: T; readonly warnings: readonly string[] }
  | { readonly ok: false; readonly diagnostics: readonly string[] };

/**
 * 例外経路が自身の validation を実行するための typed helper。
 * - 例外経路の契約 policy を検証する (canonical は許可しない)。
 * - path 自身の validator で構造化 fail-closed を保証する (静かな素通しを防ぐ)。
 * - payload が公式 Schema と乖離する場合に warning を返す (例外として受理は妨げない)。
 *
 * canonical chain の validation は実行しない (例外経路を canonical に昇格させない)。
 */
export function runExceptionalPathBoundary<T>(
  path: { kind: ExceptionalPathKind; validationPolicy: string },
  payload: unknown,
  validate: ExceptionalPathValidator<T>,
): ExceptionalPathBoundaryResult<T> {
  if (path.validationPolicy === "canonical") {
    return {
      ok: false,
      diagnostics: [
        `Exceptional path ${path.kind} must not declare the canonical validation policy.`,
      ],
    };
  }
  const outcome = validate(payload);
  if (!outcome.ok) {
    return { ok: false, diagnostics: outcome.diagnostics };
  }
  const canonicalConformance = validateProjectAgainstSchema(payload);
  const warnings = canonicalConformance.valid
    ? []
    : [
        `Exceptional path ${path.kind} accepted payload that diverges from the official project schema (declared exception).`,
      ];
  return { ok: true, value: outcome.value, warnings };
}
