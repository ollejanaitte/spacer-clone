/**
 * BridgeProject.Superstructure sidecar persistence (Phase 3-4).
 *
 * The shared superstructure facts produced by `buildBridgeProjectSuperstructure`
 * are persisted on the ProjectModel as `apolloBridgeProjectSuperstructure`.
 * Hydration re-parses + validates the record (round-trip safe); serialization
 * validates before writing. No sample/mock fallback.
 */

import type { ProjectModel } from "../types";
import {
  BRIDGE_PROJECT_SUPERSTRUCTURE_SCHEMA_VERSION,
  type BridgeProjectSuperstructure,
} from "./types";
import {
  parseBridgeProjectSuperstructure,
} from "./superstructureAdapter";

export function getApolloBridgeProjectSuperstructure(
  project: ProjectModel,
): BridgeProjectSuperstructure | undefined {
  return project.apolloBridgeProjectSuperstructure;
}

export function withApolloBridgeProjectSuperstructure(
  project: ProjectModel,
  record: BridgeProjectSuperstructure,
): ProjectModel {
  return { ...project, apolloBridgeProjectSuperstructure: record };
}

export type SidecarResult = { ok: true; project: ProjectModel } | { ok: false; diagnostics: string[] };

/** Hydrate (parse + validate) the sidecar from a loaded project. */
export function hydrateApolloBridgeProjectSuperstructureFromPersistence(
  project: ProjectModel,
): SidecarResult {
  const raw = project.apolloBridgeProjectSuperstructure;
  if (raw === undefined) {
    return { ok: true, project };
  }
  try {
    const parsed = parseBridgeProjectSuperstructure(
      typeof raw === "string" ? raw : JSON.stringify(raw),
    );
    return { ok: true, project: withApolloBridgeProjectSuperstructure(project, parsed) };
  } catch (error) {
    return {
      ok: false,
      diagnostics: [`apolloBridgeProjectSuperstructure is invalid: ${(error as Error).message}`],
    };
  }
}

/** Validate the sidecar before persistence (fail-closed). */
export function serializeApolloBridgeProjectSuperstructureForPersistence(
  project: ProjectModel,
): SidecarResult {
  const raw = project.apolloBridgeProjectSuperstructure;
  if (raw === undefined) {
    return { ok: true, project };
  }
  if (raw.schemaVersion !== BRIDGE_PROJECT_SUPERSTRUCTURE_SCHEMA_VERSION) {
    return {
      ok: false,
      diagnostics: [
        `apolloBridgeProjectSuperstructure schemaVersion must be ${BRIDGE_PROJECT_SUPERSTRUCTURE_SCHEMA_VERSION} (got ${raw.schemaVersion}).`,
      ],
    };
  }
  return { ok: true, project };
}
