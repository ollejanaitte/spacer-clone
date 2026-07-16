import type { MigrationIdMapping } from "../migrationRecord";
import type { ValidationIssue } from "../validation";
import type { LegacyAdapterError } from "./errors";

export const LEGACY_ROAD_ADAPTER_ID = "legacy-road-jip-liner-importer" as const;
export const LEGACY_FRAME_ADAPTER_ID = "legacy-frame-project-model" as const;
export const LEGACY_ADAPTER_VERSION = "0.1.0" as const;

export const LEGACY_ROAD_FORMAT_ID = "jip-liner-importer" as const;
export const LEGACY_FRAME_FORMAT_ID = "project-model" as const;

export type LegacyRoadFormatId = typeof LEGACY_ROAD_FORMAT_ID;
export type LegacyFrameFormatId = typeof LEGACY_FRAME_FORMAT_ID;

export type LegacyFormatId = LegacyRoadFormatId | LegacyFrameFormatId | "unknown";

export interface LegacyFormatClassification {
  readonly formatId: LegacyFormatId;
  readonly sourceVersion: string | undefined;
  readonly hints: readonly string[];
}

export interface LegacyAdapterClock {
  now(): string;
}

export interface LegacyAdapterOptions {
  readonly clock?: LegacyAdapterClock;
  readonly createdAt?: string;
}

export interface LegacyAdapterSuccess<TDocument> {
  readonly ok: true;
  readonly document: TDocument;
  readonly formatId: LegacyFormatId;
  readonly sourceVersion: string;
  readonly adapterId: string;
  readonly adapterVersion: string;
  readonly idMappings: readonly MigrationIdMapping[];
  readonly diagnostics: readonly ValidationIssue[];
  readonly unknownFieldNotes: readonly {
    readonly jsonPointer: string;
    readonly message: string;
    readonly criticality?: "critical" | "optional" | "informational";
  }[];
  readonly provenanceNotes: readonly {
    readonly path: string;
    readonly message: string;
    readonly code?: string;
  }[];
}

export interface LegacyAdapterFailure {
  readonly ok: false;
  readonly error: LegacyAdapterError;
  readonly diagnostics: readonly ValidationIssue[];
}

export type LegacyAdapterResult<TDocument> =
  | LegacyAdapterSuccess<TDocument>
  | LegacyAdapterFailure;

export function defaultLegacyAdapterClock(): LegacyAdapterClock {
  return {
    now: () => new Date().toISOString(),
  };
}
