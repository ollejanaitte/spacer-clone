import type { ContentChecksum } from "../contentChecksum";
import type { MappingDisposition, MigrationIdMapping } from "../migrationRecord";
import type { SchemaId, SchemaIdentity, SchemaVersion } from "../schemaIdentity";
import type { UuidString } from "../uuid";
import type { ValidationIssue, ValidationResult } from "../validation";

export type MigrationStepId = string & { readonly __brand: "MigrationStepId" };

export type MigrationReportStatus = "success" | "failed" | "validation_failed";

export interface MigrationUnknownFieldNote {
  readonly jsonPointer: string;
  readonly message: string;
  readonly criticality?: "critical" | "optional" | "informational";
}

export interface MigrationProvenanceNote {
  readonly path: string;
  readonly message: string;
  readonly code?: string;
}

export interface MigrationStepExecutionContext {
  readonly dryRun: boolean;
  readonly schemaId: SchemaId;
  readonly fromVersion: SchemaVersion;
  readonly toVersion: SchemaVersion;
}

export interface MigrationStepOutcome<TValue = unknown> {
  readonly value: TValue;
  readonly diagnostics?: readonly ValidationIssue[];
  readonly idMappings?: readonly MigrationIdMapping[];
  readonly unknownFieldNotes?: readonly MigrationUnknownFieldNote[];
  readonly provenanceNotes?: readonly MigrationProvenanceNote[];
}

export type MigrationStepFn<TInput = unknown, TOutput = unknown> = (
  input: TInput,
  context: MigrationStepExecutionContext,
) => MigrationStepOutcome<TOutput>;

export interface MigrationStepRegistration<TInput = unknown, TOutput = unknown> {
  readonly stepId: MigrationStepId;
  readonly schemaId: SchemaId;
  readonly fromVersion: SchemaVersion;
  readonly toVersion: SchemaVersion;
  readonly migrate: MigrationStepFn<TInput, TOutput>;
}

export interface AppliedMigrationStep {
  readonly stepId: MigrationStepId;
  readonly fromVersion: SchemaVersion;
  readonly toVersion: SchemaVersion;
}

export interface MigrationReport<TValue = unknown> {
  readonly migrationId: UuidString;
  readonly sourceSchema: SchemaIdentity;
  readonly targetSchema: SchemaIdentity;
  readonly dryRun: boolean;
  readonly status: MigrationReportStatus;
  readonly appliedSteps: readonly AppliedMigrationStep[];
  readonly idMappings: readonly MigrationIdMapping[];
  readonly diagnostics: readonly ValidationIssue[];
  readonly unknownFieldNotes: readonly MigrationUnknownFieldNote[];
  readonly provenanceNotes: readonly MigrationProvenanceNote[];
  readonly startedAt: string;
  readonly completedAt: string;
  readonly sourceChecksum?: ContentChecksum;
  readonly targetChecksum?: ContentChecksum;
  readonly outputWritten: false;
  readonly value?: TValue;
}

export interface MigrationClock {
  now(): string;
}

export interface MigrationIdGenerator {
  generateMigrationId(): UuidString;
}

export interface MigrationDependencies {
  readonly clock?: MigrationClock;
  readonly idGenerator?: MigrationIdGenerator;
}

export type TargetValidator<TValue = unknown> = (value: TValue) => ValidationResult;

export interface MigrationRequest<TSource = unknown, TTarget = TSource> {
  readonly source: TSource;
  readonly sourceSchema: SchemaIdentity;
  readonly targetSchema: SchemaIdentity;
  readonly dryRun?: boolean;
  readonly validateTarget?: TargetValidator<TTarget>;
  readonly sourceChecksum?: ContentChecksum;
  readonly targetChecksum?: ContentChecksum;
}

export type MigrationRegisterResult =
  | { readonly ok: true }
  | { readonly ok: false; readonly error: import("./errors").MigrationDuplicateStepError };

export type MigrationResult<TValue = unknown> =
  | { readonly ok: true; readonly value: TValue; readonly report: MigrationReport<TValue> }
  | {
      readonly ok: false;
      readonly report: MigrationReport<never>;
      readonly error: import("./errors").MigrationError;
    };

export type MappingDispositionExport = MappingDisposition;
