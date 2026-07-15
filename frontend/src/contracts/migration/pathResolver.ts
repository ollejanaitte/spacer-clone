import {
  createMigrationAmbiguousPathError,
  createMigrationPathNotFoundError,
  createMigrationUnknownSourceVersionError,
  createMigrationUnknownTargetVersionError,
  type MigrationPathError,
} from "./errors";
import type { MigrationStepId } from "./types";
import type { SchemaId, SchemaVersion } from "../schemaIdentity";

export interface ResolvedMigrationEdge {
  readonly stepId: MigrationStepId;
  readonly fromVersion: SchemaVersion;
  readonly toVersion: SchemaVersion;
}

export interface MigrationPathResolutionSuccess {
  readonly ok: true;
  readonly path: readonly ResolvedMigrationEdge[];
}

export interface MigrationPathResolutionFailure {
  readonly ok: false;
  readonly error: MigrationPathError;
}

export type MigrationPathResolutionResult =
  | MigrationPathResolutionSuccess
  | MigrationPathResolutionFailure;

export interface MigrationGraphEdge {
  readonly stepId: MigrationStepId;
  readonly fromVersion: SchemaVersion;
  readonly toVersion: SchemaVersion;
}

function compareVersions(left: SchemaVersion, right: SchemaVersion): number {
  return left.localeCompare(right);
}

function compareEdges(left: MigrationGraphEdge, right: MigrationGraphEdge): number {
  const versionOrder = compareVersions(left.toVersion, right.toVersion);
  if (versionOrder !== 0) {
    return versionOrder;
  }
  return left.stepId.localeCompare(right.stepId);
}

function collectKnownVersions(edges: readonly MigrationGraphEdge[]): SchemaVersion[] {
  const versions = new Set<SchemaVersion>();
  for (const edge of edges) {
    versions.add(edge.fromVersion);
    versions.add(edge.toVersion);
  }
  return [...versions].sort(compareVersions);
}

function buildAdjacency(
  edges: readonly MigrationGraphEdge[],
): Map<SchemaVersion, MigrationGraphEdge[]> {
  const adjacency = new Map<SchemaVersion, MigrationGraphEdge[]>();

  for (const edge of edges) {
    const neighbors = adjacency.get(edge.fromVersion) ?? [];
    neighbors.push(edge);
    adjacency.set(edge.fromVersion, neighbors);
  }

  for (const neighbors of adjacency.values()) {
    neighbors.sort(compareEdges);
  }

  return adjacency;
}

/**
 * Resolves the unique shortest migration path deterministically.
 * Registration order does not affect the outcome; ties are broken lexicographically.
 */
export function resolveMigrationPath(
  schemaId: SchemaId,
  sourceVersion: SchemaVersion,
  targetVersion: SchemaVersion,
  edges: readonly MigrationGraphEdge[],
): MigrationPathResolutionResult {
  if (sourceVersion === targetVersion) {
    return { ok: true, path: [] };
  }

  const knownVersions = collectKnownVersions(edges);
  const knownVersionSet = new Set(knownVersions);

  if (!knownVersionSet.has(sourceVersion)) {
    return {
      ok: false,
      error: createMigrationUnknownSourceVersionError(schemaId, sourceVersion, knownVersions),
    };
  }

  if (!knownVersionSet.has(targetVersion)) {
    return {
      ok: false,
      error: createMigrationUnknownTargetVersionError(schemaId, targetVersion, knownVersions),
    };
  }

  const adjacency = buildAdjacency(edges);
  const distances = new Map<SchemaVersion, number>([[sourceVersion, 0]]);
  const paths = new Map<SchemaVersion, ResolvedMigrationEdge[][]>([[sourceVersion, [[]]]]);
  const queue: SchemaVersion[] = [sourceVersion];
  let targetDistance: number | undefined;

  while (queue.length > 0) {
    const current = queue.shift();
    if (current === undefined) {
      break;
    }

    const currentDistance = distances.get(current);
    if (currentDistance === undefined) {
      continue;
    }

    if (targetDistance !== undefined && currentDistance > targetDistance) {
      break;
    }

    if (current === targetVersion) {
      targetDistance = currentDistance;
      continue;
    }

    const neighbors = adjacency.get(current) ?? [];
    for (const edge of neighbors) {
      const nextDistance = currentDistance + 1;
      const existingDistance = distances.get(edge.toVersion);
      const currentPaths = paths.get(current) ?? [[]];
      const extendedPaths = currentPaths.map((path) => [
        ...path,
        {
          stepId: edge.stepId,
          fromVersion: edge.fromVersion,
          toVersion: edge.toVersion,
        },
      ]);

      if (existingDistance === undefined || nextDistance < existingDistance) {
        distances.set(edge.toVersion, nextDistance);
        paths.set(edge.toVersion, extendedPaths);
        queue.push(edge.toVersion);
        continue;
      }

      if (nextDistance === existingDistance) {
        const merged = paths.get(edge.toVersion) ?? [];
        paths.set(edge.toVersion, [...merged, ...extendedPaths]);
      }
    }

    queue.sort(compareVersions);
  }

  const resolvedPaths = paths.get(targetVersion);
  if (resolvedPaths === undefined || resolvedPaths.length === 0) {
    return {
      ok: false,
      error: createMigrationPathNotFoundError(schemaId, sourceVersion, targetVersion),
    };
  }

  if (resolvedPaths.length > 1) {
    return {
      ok: false,
      error: createMigrationAmbiguousPathError(
        schemaId,
        sourceVersion,
        targetVersion,
        resolvedPaths.length,
      ),
    };
  }

  return { ok: true, path: resolvedPaths[0] ?? [] };
}
