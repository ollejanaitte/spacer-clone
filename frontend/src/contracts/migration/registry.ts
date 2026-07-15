import { generateUuid, type UuidString } from "../uuid";
import {
  createValidationIssue,
  createValidationResult,
  hasValidationErrors,
  type ValidationIssue,
  type ValidationResult,
} from "../validation";
import { cloneMigrationValue } from "./clone";
import {
  createMigrationDuplicateStepError,
  createMigrationPathNotFoundError,
  createMigrationStepFailedError,
  createMigrationValidationFailedError,
  type MigrationValidationFailedError,
} from "./errors";
import { resolveMigrationPath, type MigrationGraphEdge } from "./pathResolver";
import type {
  AppliedMigrationStep,
  MigrationClock,
  MigrationDependencies,
  MigrationIdGenerator,
  MigrationProvenanceNote,
  MigrationRegisterResult,
  MigrationReport,
  MigrationRequest,
  MigrationResult,
  MigrationStepFn,
  MigrationStepId,
  MigrationStepOutcome,
  MigrationStepRegistration,
  MigrationUnknownFieldNote,
} from "./types";
import type { MappingDisposition, MigrationIdMapping } from "../migrationRecord";
import type { SchemaId, SchemaIdentity, SchemaVersion } from "../schemaIdentity";

interface RegisteredMigrationStep {
  readonly stepId: MigrationStepId;
  readonly schemaId: SchemaId;
  readonly fromVersion: SchemaVersion;
  readonly toVersion: SchemaVersion;
  readonly migrate: MigrationStepFn;
}

/**
 * Erases heterogeneous step generics for internal registry storage.
 * Callers register typed steps; the map stores a uniform MigrationStepFn boundary.
 */
function eraseRegisteredStep<TInput, TOutput>(
  registration: MigrationStepRegistration<TInput, TOutput>,
): RegisteredMigrationStep {
  return {
    stepId: registration.stepId,
    schemaId: registration.schemaId,
    fromVersion: registration.fromVersion,
    toVersion: registration.toVersion,
    migrate: registration.migrate as MigrationStepFn,
  };
}

function makeEdgeKey(
  schemaId: SchemaId,
  fromVersion: SchemaVersion,
  toVersion: SchemaVersion,
): string {
  return `${schemaId}|${fromVersion}|${toVersion}`;
}

function defaultClock(): MigrationClock {
  return {
    now: () => new Date().toISOString(),
  };
}

function defaultIdGenerator(): MigrationIdGenerator {
  return {
    generateMigrationId: () => generateUuid(),
  };
}

function extractErrorMessage(cause: unknown): string {
  if (cause instanceof Error) {
    return cause.message;
  }
  return String(cause);
}

function stepOutcomeHasErrors(outcome: MigrationStepOutcome): boolean {
  return (outcome.diagnostics ?? []).some((issue) => issue.severity === "error");
}

type TargetValidationResult =
  | { readonly ok: true }
  | {
      readonly ok: false;
      readonly error: MigrationValidationFailedError;
    };

function runTargetValidation<TValue>(
  validateTarget: (value: TValue) => ValidationResult,
  value: unknown,
  diagnostics: ValidationIssue[],
): TargetValidationResult {
  const validationInput = cloneMigrationValue(value);
  let validation: ValidationResult;

  try {
    validation = validateTarget(validationInput as TValue);
  } catch (cause) {
    const causeMessage = extractErrorMessage(cause);
    validation = createValidationResult([
      createValidationIssue({
        code: "MIGRATION_TARGET_VALIDATOR_FAILED",
        severity: "error",
        message: causeMessage,
        path: "/target",
      }),
    ]);
  }

  diagnostics.push(...validation.issues);
  if (hasValidationErrors(validation)) {
    return {
      ok: false,
      error: createMigrationValidationFailedError(validation),
    };
  }

  return { ok: true };
}

function aggregateDiagnostics(
  collected: ValidationIssue[],
  stepDiagnostics: readonly ValidationIssue[] | undefined,
  stepId: MigrationStepId,
): void {
  if (stepDiagnostics === undefined) {
    return;
  }

  for (const issue of stepDiagnostics) {
    collected.push({
      ...issue,
      path: issue.path.length > 0 ? `/steps/${stepId}${issue.path}` : `/steps/${stepId}`,
    });
  }
}

function aggregateIdMappings(
  collected: MigrationIdMapping[],
  stepMappings: readonly MigrationIdMapping[] | undefined,
): void {
  if (stepMappings === undefined) {
    return;
  }
  collected.push(...stepMappings);
}

function aggregateUnknownFieldNotes(
  collected: MigrationUnknownFieldNote[],
  notes: readonly MigrationUnknownFieldNote[] | undefined,
  stepId: MigrationStepId,
): void {
  if (notes === undefined) {
    return;
  }

  for (const note of notes) {
    collected.push({
      ...note,
      jsonPointer:
        note.jsonPointer.length > 0
          ? `/steps/${stepId}${note.jsonPointer}`
          : `/steps/${stepId}`,
    });
  }
}

function aggregateProvenanceNotes(
  collected: MigrationProvenanceNote[],
  notes: readonly MigrationProvenanceNote[] | undefined,
  stepId: MigrationStepId,
): void {
  if (notes === undefined) {
    return;
  }

  for (const note of notes) {
    collected.push({
      ...note,
      path: note.path.length > 0 ? `/steps/${stepId}${note.path}` : `/steps/${stepId}`,
    });
  }
}

function createFailureReport(
  migrationId: UuidString,
  sourceSchema: SchemaIdentity,
  targetSchema: SchemaIdentity,
  dryRun: boolean,
  startedAt: string,
  completedAt: string,
  appliedSteps: readonly AppliedMigrationStep[],
  diagnostics: readonly ValidationIssue[],
  idMappings: readonly MigrationIdMapping[],
  unknownFieldNotes: readonly MigrationUnknownFieldNote[],
  provenanceNotes: readonly MigrationProvenanceNote[],
  sourceChecksum: MigrationRequest["sourceChecksum"],
  targetChecksum: MigrationRequest["targetChecksum"],
  status: MigrationReport["status"],
): MigrationReport<never> {
  return {
    migrationId,
    sourceSchema,
    targetSchema,
    dryRun,
    status,
    appliedSteps,
    idMappings,
    diagnostics,
    unknownFieldNotes,
    provenanceNotes,
    startedAt,
    completedAt,
    ...(sourceChecksum !== undefined ? { sourceChecksum } : {}),
    ...(targetChecksum !== undefined ? { targetChecksum } : {}),
    outputWritten: false,
  };
}

export class MigrationRegistry {
  private readonly stepsByEdge = new Map<string, RegisteredMigrationStep>();
  private readonly stepIds = new Set<MigrationStepId>();
  private readonly clock: MigrationClock;
  private readonly idGenerator: MigrationIdGenerator;

  constructor(dependencies: MigrationDependencies = {}) {
    this.clock = dependencies.clock ?? defaultClock();
    this.idGenerator = dependencies.idGenerator ?? defaultIdGenerator();
  }

  registerStep<TInput, TOutput>(
    registration: MigrationStepRegistration<TInput, TOutput>,
  ): MigrationRegisterResult {
    const edgeKey = makeEdgeKey(
      registration.schemaId,
      registration.fromVersion,
      registration.toVersion,
    );

    const existing = this.stepsByEdge.get(edgeKey);
    if (existing !== undefined) {
      return {
        ok: false,
        error: createMigrationDuplicateStepError(
          registration.schemaId,
          registration.fromVersion,
          registration.toVersion,
          existing.stepId,
        ),
      };
    }

    if (this.stepIds.has(registration.stepId)) {
      return {
        ok: false,
        error: createMigrationDuplicateStepError(
          registration.schemaId,
          registration.fromVersion,
          registration.toVersion,
          registration.stepId,
        ),
      };
    }

    const registered = eraseRegisteredStep(registration);

    this.stepsByEdge.set(edgeKey, registered);
    this.stepIds.add(registration.stepId);
    return { ok: true };
  }

  resolvePath(
    schemaId: SchemaId,
    sourceVersion: SchemaVersion,
    targetVersion: SchemaVersion,
  ): ReturnType<typeof resolveMigrationPath> {
    return resolveMigrationPath(
      schemaId,
      sourceVersion,
      targetVersion,
      this.listEdgesForSchema(schemaId),
    );
  }

  migrate<TSource = unknown, TTarget = TSource>(
    request: MigrationRequest<TSource, TTarget>,
  ): MigrationResult<TTarget> {
    const dryRun = request.dryRun ?? false;
    const migrationId = this.idGenerator.generateMigrationId();
    const startedAt = this.clock.now();

    if (request.sourceSchema.schemaId !== request.targetSchema.schemaId) {
      const completedAt = this.clock.now();
      const diagnostics = [
        createValidationIssue({
          code: "MIGRATION_SCHEMA_ID_MISMATCH",
          severity: "error",
          message: "Source and target schemaId must match for migration.",
          path: "/targetSchema/schemaId",
        }),
      ];
      const report = createFailureReport(
        migrationId,
        request.sourceSchema,
        request.targetSchema,
        dryRun,
        startedAt,
        completedAt,
        [],
        diagnostics,
        [],
        [],
        [],
        request.sourceChecksum,
        request.targetChecksum,
        "failed",
      );
      return {
        ok: false,
        report,
        error: {
          code: "path-not-found",
          schemaId: request.sourceSchema.schemaId,
          sourceVersion: request.sourceSchema.schemaVersion,
          targetVersion: request.targetSchema.schemaVersion,
          message: "Source and target schemaId must match for migration.",
        },
      };
    }

    const schemaId = request.sourceSchema.schemaId;
    const sourceVersion = request.sourceSchema.schemaVersion;
    const targetVersion = request.targetSchema.schemaVersion;

    if (sourceVersion === targetVersion) {
      const appliedSteps: AppliedMigrationStep[] = [];
      const diagnostics: ValidationIssue[] = [];
      const idMappings: MigrationIdMapping[] = [];
      const unknownFieldNotes: MigrationUnknownFieldNote[] = [];
      const provenanceNotes: MigrationProvenanceNote[] = [];
      const currentValue = cloneMigrationValue(request.source);

      if (request.validateTarget !== undefined) {
        const validationResult = runTargetValidation(
          request.validateTarget,
          currentValue,
          diagnostics,
        );
        if (!validationResult.ok) {
          const completedAt = this.clock.now();
          const report = createFailureReport(
            migrationId,
            request.sourceSchema,
            request.targetSchema,
            dryRun,
            startedAt,
            completedAt,
            appliedSteps,
            diagnostics,
            idMappings,
            unknownFieldNotes,
            provenanceNotes,
            request.sourceChecksum,
            request.targetChecksum,
            "validation_failed",
          );
          return { ok: false, report, error: validationResult.error };
        }
      }

      const completedAt = this.clock.now();
      const value = currentValue as unknown as TTarget;
      const report: MigrationReport<TTarget> = {
        migrationId,
        sourceSchema: request.sourceSchema,
        targetSchema: request.targetSchema,
        dryRun,
        status: "success",
        appliedSteps,
        idMappings,
        diagnostics,
        unknownFieldNotes,
        provenanceNotes,
        startedAt,
        completedAt,
        ...(request.sourceChecksum !== undefined ? { sourceChecksum: request.sourceChecksum } : {}),
        ...(request.targetChecksum !== undefined ? { targetChecksum: request.targetChecksum } : {}),
        outputWritten: false,
        value,
      };
      return { ok: true, value, report };
    }

    const pathResolution = this.resolvePath(schemaId, sourceVersion, targetVersion);
    if (!pathResolution.ok) {
      const completedAt = this.clock.now();
      const report = createFailureReport(
        migrationId,
        request.sourceSchema,
        request.targetSchema,
        dryRun,
        startedAt,
        completedAt,
        [],
        [
          createValidationIssue({
            code: `MIGRATION_${pathResolution.error.code.toUpperCase().replace(/-/g, "_")}`,
            severity: "error",
            message: pathResolution.error.message,
            path: "/targetSchema/schemaVersion",
          }),
        ],
        [],
        [],
        [],
        request.sourceChecksum,
        request.targetChecksum,
        "failed",
      );
      return { ok: false, report, error: pathResolution.error };
    }

    const appliedSteps: AppliedMigrationStep[] = [];
    const diagnostics: ValidationIssue[] = [];
    const idMappings: MigrationIdMapping[] = [];
    const unknownFieldNotes: MigrationUnknownFieldNote[] = [];
    const provenanceNotes: MigrationProvenanceNote[] = [];

    let currentValue: unknown = cloneMigrationValue(request.source);

    for (const edge of pathResolution.path) {
      const step = this.stepsByEdge.get(
        makeEdgeKey(schemaId, edge.fromVersion, edge.toVersion),
      );
      if (step === undefined) {
        const completedAt = this.clock.now();
        const error = createMigrationPathNotFoundError(schemaId, sourceVersion, targetVersion);
        const report = createFailureReport(
          migrationId,
          request.sourceSchema,
          request.targetSchema,
          dryRun,
          startedAt,
          completedAt,
          appliedSteps,
          diagnostics,
          idMappings,
          unknownFieldNotes,
          provenanceNotes,
          request.sourceChecksum,
          request.targetChecksum,
          "failed",
        );
        return { ok: false, report, error };
      }

      const stepInput = cloneMigrationValue(currentValue);
      let outcome: MigrationStepOutcome;

      try {
        outcome = step.migrate(stepInput, {
          dryRun,
          schemaId,
          fromVersion: edge.fromVersion,
          toVersion: edge.toVersion,
        });
      } catch (cause) {
        const completedAt = this.clock.now();
        const stepError = createMigrationStepFailedError(
          step.stepId,
          edge.fromVersion,
          edge.toVersion,
          extractErrorMessage(cause),
        );
        diagnostics.push(
          createValidationIssue({
            code: "MIGRATION_STEP_FAILED",
            severity: "error",
            message: stepError.message,
            path: `/steps/${step.stepId}`,
          }),
        );
        const report = createFailureReport(
          migrationId,
          request.sourceSchema,
          request.targetSchema,
          dryRun,
          startedAt,
          completedAt,
          appliedSteps,
          diagnostics,
          idMappings,
          unknownFieldNotes,
          provenanceNotes,
          request.sourceChecksum,
          request.targetChecksum,
          "failed",
        );
        return { ok: false, report, error: stepError };
      }

      currentValue = cloneMigrationValue(outcome.value);
      appliedSteps.push({
        stepId: step.stepId,
        fromVersion: edge.fromVersion,
        toVersion: edge.toVersion,
      });
      aggregateDiagnostics(diagnostics, outcome.diagnostics, step.stepId);
      aggregateIdMappings(idMappings, outcome.idMappings);
      aggregateUnknownFieldNotes(unknownFieldNotes, outcome.unknownFieldNotes, step.stepId);
      aggregateProvenanceNotes(provenanceNotes, outcome.provenanceNotes, step.stepId);

      if (stepOutcomeHasErrors(outcome)) {
        const completedAt = this.clock.now();
        const validationError = createMigrationValidationFailedError(
          createValidationResult(outcome.diagnostics ?? []),
        );
        const report = createFailureReport(
          migrationId,
          request.sourceSchema,
          request.targetSchema,
          dryRun,
          startedAt,
          completedAt,
          appliedSteps,
          diagnostics,
          idMappings,
          unknownFieldNotes,
          provenanceNotes,
          request.sourceChecksum,
          request.targetChecksum,
          "validation_failed",
        );
        return { ok: false, report, error: validationError };
      }
    }

    if (request.validateTarget !== undefined) {
      const validationResult = runTargetValidation(
        request.validateTarget,
        currentValue,
        diagnostics,
      );
      if (!validationResult.ok) {
        const completedAt = this.clock.now();
        const report = createFailureReport(
          migrationId,
          request.sourceSchema,
          request.targetSchema,
          dryRun,
          startedAt,
          completedAt,
          appliedSteps,
          diagnostics,
          idMappings,
          unknownFieldNotes,
          provenanceNotes,
          request.sourceChecksum,
          request.targetChecksum,
          "validation_failed",
        );
        return { ok: false, report, error: validationResult.error };
      }
    }

    const completedAt = this.clock.now();
    const value = currentValue as unknown as TTarget;
    const report: MigrationReport<TTarget> = {
      migrationId,
      sourceSchema: request.sourceSchema,
      targetSchema: request.targetSchema,
      dryRun,
      status: "success",
      appliedSteps,
      idMappings,
      diagnostics,
      unknownFieldNotes,
      provenanceNotes,
      startedAt,
      completedAt,
      ...(request.sourceChecksum !== undefined ? { sourceChecksum: request.sourceChecksum } : {}),
      ...(request.targetChecksum !== undefined ? { targetChecksum: request.targetChecksum } : {}),
      outputWritten: false,
      value,
    };
    return { ok: true, value, report };
  }

  dryRunMigrate<TSource = unknown, TTarget = TSource>(
    request: Omit<MigrationRequest<TSource, TTarget>, "dryRun">,
  ): MigrationResult<TTarget> {
    return this.migrate<TSource, TTarget>({ ...request, dryRun: true });
  }

  private listEdgesForSchema(schemaId: SchemaId): MigrationGraphEdge[] {
    const edges: MigrationGraphEdge[] = [];
    for (const step of this.stepsByEdge.values()) {
      if (step.schemaId === schemaId) {
        edges.push({
          stepId: step.stepId,
          fromVersion: step.fromVersion,
          toVersion: step.toVersion,
        });
      }
    }
    return edges;
  }
}

export function createMigrationRegistry(dependencies?: MigrationDependencies): MigrationRegistry {
  return new MigrationRegistry(dependencies);
}

export function asMigrationStepId(value: string): MigrationStepId {
  if (value.trim().length === 0) {
    throw new Error("Migration stepId must be a non-empty string.");
  }
  return value as MigrationStepId;
}

export type { MappingDisposition };
