import type { ProjectModel } from "../types";
import { migrateProject } from "../projectMigration";
import { serializeProjectForPersistence, hydrateProjectLinerFromPersistence } from "../liner/adapters/linerProjectDraft";
import { serializeApolloPhase1Unit2ForPersistence, hydrateApolloPhase1Unit2FromPersistence } from "../apollo/unit2Draft";

/**
 * A-04 Generic Persistence Roundtrip — 主経路チェーン
 * (serialize → JSON → migrate → hydrate) を純関数として表現する。
 *
 * canonical chain (project.json 主経路):
 *   runtime ProjectModel
 *     → serializeApolloPhase1Unit2ForPersistence
 *     → serializeProjectForPersistence
 *     → JSON.stringify → project.json
 *     → JSON.parse → migrateProject
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
  const migrated = migrateProject(persisted);

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
