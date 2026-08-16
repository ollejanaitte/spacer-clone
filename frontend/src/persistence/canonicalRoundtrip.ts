import type { ProjectModel } from "../types";
import { serializeProjectForPersistence, hydrateProjectLinerFromPersistence } from "../liner/adapters/linerProjectDraft";
import { serializeApolloPhase1Unit2ForPersistence, hydrateApolloPhase1Unit2FromPersistence } from "../apollo/unit2Draft";
import { validatePersistedProjectForSave, validateLoadedProjectBeforeHydrate } from "./validationBoundary";

/**
 * A-04 Generic Persistence Roundtrip — 主経路チェーン
 * (serialize → JSON → migrate → hydrate) を純関数として表現する。
 *
 * canonical chain (project.json 主経路):
 *   runtime ProjectModel
 *     → serializeApolloPhase1Unit2ForPersistence
 *     → serializeProjectForPersistence
 *     → [A-05 save validation: 公式 Schema, fail-closed]
 *     → JSON.stringify → project.json
 *     → JSON.parse → migrateProject → [A-05 load validation: 公式 Schema, fail-closed]
 *     → hydrateProjectLinerFromPersistence → hydrateApolloPhase1Unit2FromPersistence
 *     → runtime ProjectModel
 *
 * 全フィールド同値は保証しない (意図的 non-identity)。
 */

export type CanonicalRoundtripResult = {
  readonly ok: boolean;
  readonly project: ProjectModel;
  readonly persisted: unknown;
  readonly diagnostics: readonly string[];
};

export function runCanonicalRoundtrip(source: ProjectModel): CanonicalRoundtripResult {
  const apolloSerialized = serializeApolloPhase1Unit2ForPersistence(source);
  if (!apolloSerialized.ok) {
    return { ok: false, project: source, persisted: null, diagnostics: apolloSerialized.diagnostics };
  }
  const serialized = serializeProjectForPersistence(apolloSerialized.project);
  if (!serialized.ok) {
    return { ok: false, project: source, persisted: null, diagnostics: serialized.diagnostics };
  }

  const persisted = JSON.parse(JSON.stringify(serialized.project));

  // A-05 save boundary: persisted 表現を書込み前に公式 Schema で検証 (fail-closed)。
  const saveValidation = validatePersistedProjectForSave(persisted);
  if (!saveValidation.ok) {
    return { ok: false, project: source, persisted, diagnostics: saveValidation.diagnostics };
  }

  // A-05 load boundary: migrate 後・hydration 前に公式 Schema で検証 (fail-closed)。
  const loadValidation = validateLoadedProjectBeforeHydrate(persisted);
  if (!loadValidation.ok) {
    return { ok: false, project: source, persisted, diagnostics: loadValidation.diagnostics };
  }
  const migrated = loadValidation.project;

  const linerHydrated = hydrateProjectLinerFromPersistence(migrated);
  if (!linerHydrated.ok) {
    return { ok: false, project: source, persisted, diagnostics: linerHydrated.diagnostics };
  }
  const apolloHydrated = hydrateApolloPhase1Unit2FromPersistence(linerHydrated.project);
  if (!apolloHydrated.ok) {
    return { ok: false, project: source, persisted, diagnostics: apolloHydrated.diagnostics };
  }

  return { ok: true, project: apolloHydrated.project, persisted, diagnostics: [] };
}
