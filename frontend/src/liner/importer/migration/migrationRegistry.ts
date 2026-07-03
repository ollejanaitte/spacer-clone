import type { JipLinerImporterProject } from "../types";
import { IMPORTER_SCHEMA_VERSION, getImporterSchemaVersion } from "../version";

export type MigrationFn = (data: unknown) => unknown;

export type MigrationKey = `${string}->${string}`;

const migrations = new Map<MigrationKey, MigrationFn>();

function toMigrationKey(fromVersion: string, toVersion: string): MigrationKey {
  return `${fromVersion}->${toVersion}`;
}

export function registerMigration(
  fromVersion: string,
  toVersion: string,
  migrate: MigrationFn,
): void {
  migrations.set(toMigrationKey(fromVersion, toVersion), migrate);
}

export function getMigration(
  fromVersion: string,
  toVersion: string,
): MigrationFn | undefined {
  return migrations.get(toMigrationKey(fromVersion, toVersion));
}

function identityMigration(data: unknown): unknown {
  return data;
}

registerMigration("0.1.0", "0.1.0", identityMigration);

export function migrateProject(
  data: unknown,
  targetVersion: string = IMPORTER_SCHEMA_VERSION,
): JipLinerImporterProject {
  if (data == null || typeof data !== "object") {
    throw new Error("Importer project migration requires an object payload.");
  }

  const currentVersion = getImporterSchemaVersion(data as JipLinerImporterProject);
  if (!currentVersion) {
    throw new Error("liner.importerSchemaVersion が見つかりません。");
  }

  if (currentVersion === targetVersion) {
    const migration = getMigration(currentVersion, targetVersion);
    return (migration ? migration(structuredClone(data)) : data) as JipLinerImporterProject;
  }

  const directMigration = getMigration(currentVersion, targetVersion);
  if (!directMigration) {
    throw new Error(
      `未対応の importer schema migration です: ${currentVersion} -> ${targetVersion}`,
    );
  }

  return directMigration(structuredClone(data)) as JipLinerImporterProject;
}
