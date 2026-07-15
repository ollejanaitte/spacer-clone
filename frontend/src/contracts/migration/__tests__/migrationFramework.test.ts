import { describe, expect, expectTypeOf, it } from "vitest";
import {
  createValidationIssue,
  createValidationResult,
  requireSchemaId,
  requireSchemaVersion,
  type RoadDesignDocument,
  type SchemaVersion,
  type UuidString,
} from "../../index";
import {
  asMigrationStepId,
  createMigrationRegistry,
  isMigrationAmbiguousPathError,
  isMigrationDuplicateStepError,
  isMigrationPathNotFoundError,
  isMigrationStepFailedError,
  isMigrationValidationFailedError,
  type MigrationRegistry,
  type MigrationReport,
  type MigrationRequest,
  type MigrationResult,
  type MigrationStepRegistration,
  type TargetValidator,
} from "../index";

const SCHEMA_ID = requireSchemaId("test.contract.example");
const V1 = requireSchemaVersion("1.0.0");
const V2 = requireSchemaVersion("1.1.0");
const V3 = requireSchemaVersion("2.0.0");
const V_UNKNOWN = requireSchemaVersion("9.9.9");

const FIXED_MIGRATION_ID = "aaaaaaaa-bbbb-4ccc-dddd-eeeeeeeeeeee" as UuidString;

interface TestPayload {
  version: string;
  value: number;
  marker?: string;
}

function bumpValue(input: TestPayload): TestPayload {
  return input;
}

function createRegistryWithClock(
  migrationId: UuidString = FIXED_MIGRATION_ID,
): MigrationRegistry {
  let tick = 0;
  return createMigrationRegistry({
    clock: {
      now: () => `2026-07-16T00:00:0${tick++}.000Z`,
    },
    idGenerator: {
      generateMigrationId: () => migrationId,
    },
  });
}

function registerDirectStep(
  registry: MigrationRegistry,
  stepId: string,
  fromVersion: SchemaVersion,
  toVersion: SchemaVersion,
  transform: (input: TestPayload) => TestPayload,
): void {
  const registration: MigrationStepRegistration<TestPayload, TestPayload> = {
    stepId: asMigrationStepId(stepId),
    schemaId: SCHEMA_ID,
    fromVersion,
    toVersion,
    migrate: (input) => ({ value: transform(input) }),
  };
  const result = registry.registerStep(registration);
  expect(result.ok).toBe(true);
}

describe("migration framework", () => {
  it("migrates with a direct step", () => {
    const registry = createRegistryWithClock();
    registerDirectStep(registry, "v1-to-v2", V1, V2, (input) => ({
      ...input,
      value: input.value + 10,
    }));

    const source: TestPayload = { version: V1, value: 1 };
    const result = registry.migrate({
      source: source,
      sourceSchema: { schemaId: SCHEMA_ID, schemaVersion: V1 },
      targetSchema: { schemaId: SCHEMA_ID, schemaVersion: V2 },
    });

    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }

    expect(result.value).toEqual({ version: V1, value: 11 });
    expect(result.report.status).toBe("success");
    expect(result.report.appliedSteps).toEqual([
      { stepId: asMigrationStepId("v1-to-v2"), fromVersion: V1, toVersion: V2 },
    ]);
    expect(result.report.outputWritten).toBe(false);
    expect(result.report.migrationId).toBe(FIXED_MIGRATION_ID);
  });

  it("migrates through a multi-step chain", () => {
    const registry = createRegistryWithClock();
    registerDirectStep(registry, "v1-to-v2", V1, V2, (input) => ({
      ...input,
      value: input.value + 1,
    }));
    registerDirectStep(registry, "v2-to-v3", V2, V3, (input) => ({
      ...input,
      value: input.value * 2,
    }));

    const source: TestPayload = { version: V1, value: 3 };
    const result = registry.migrate({
      source: source,
      sourceSchema: { schemaId: SCHEMA_ID, schemaVersion: V1 },
      targetSchema: { schemaId: SCHEMA_ID, schemaVersion: V3 },
    });

    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }

    expect(result.value).toEqual({ version: V1, value: 8 });
    expect(result.report.appliedSteps).toEqual([
      { stepId: asMigrationStepId("v1-to-v2"), fromVersion: V1, toVersion: V2 },
      { stepId: asMigrationStepId("v2-to-v3"), fromVersion: V2, toVersion: V3 },
    ]);
  });

  it("resolves the same unique path regardless of registration order", () => {
    const register = (registry: MigrationRegistry) => {
      registerDirectStep(registry, "v1-to-v2", V1, V2, (input) => ({
        ...input,
        marker: "a",
      }));
      registerDirectStep(registry, "v2-to-v3", V2, V3, (input) => ({
        ...input,
        marker: `${input.marker ?? ""}b`,
      }));
    };

    const forward = createRegistryWithClock();
    register(forward);

    const reverse = createRegistryWithClock();
    registerDirectStep(reverse, "v2-to-v3", V2, V3, (input) => ({
      ...input,
      marker: `${input.marker ?? ""}b`,
    }));
    registerDirectStep(reverse, "v1-to-v2", V1, V2, (input) => ({
      ...input,
      marker: "a",
    }));

    const source: TestPayload = { version: V1, value: 1 };
    const forwardResult = forward.migrate({
      source: source,
      sourceSchema: { schemaId: SCHEMA_ID, schemaVersion: V1 },
      targetSchema: { schemaId: SCHEMA_ID, schemaVersion: V3 },
    });
    const reverseResult = reverse.migrate({
      source: source,
      sourceSchema: { schemaId: SCHEMA_ID, schemaVersion: V1 },
      targetSchema: { schemaId: SCHEMA_ID, schemaVersion: V3 },
    });

    expect(forwardResult.ok).toBe(true);
    expect(reverseResult.ok).toBe(true);
    if (!forwardResult.ok || !reverseResult.ok) {
      return;
    }

    expect(forwardResult.report.appliedSteps).toEqual(reverseResult.report.appliedSteps);
    expect(forwardResult.value).toEqual(reverseResult.value);
  });

  it("rejects duplicate step registration", () => {
    const registry = createRegistryWithClock();
    const registration: MigrationStepRegistration<TestPayload, TestPayload> = {
      stepId: asMigrationStepId("dup"),
      schemaId: SCHEMA_ID,
      fromVersion: V1,
      toVersion: V2,
      migrate: (input) => ({ value: input }),
    };

    expect(registry.registerStep(registration).ok).toBe(true);
    const duplicate = registry.registerStep({
      ...registration,
      stepId: asMigrationStepId("dup-2"),
    });

    expect(duplicate.ok).toBe(false);
    if (duplicate.ok) {
      return;
    }
    expect(isMigrationDuplicateStepError(duplicate.error)).toBe(true);
  });

  it("rejects missing and unknown migration paths", () => {
    const registry = createRegistryWithClock();
    registerDirectStep(registry, "v1-to-v2", V1, V2, bumpValue);
    registerDirectStep(registry, "v3-to-v2", V3, V2, bumpValue);

    const missing = registry.migrate({
      source: { version: V1, value: 1 },
      sourceSchema: { schemaId: SCHEMA_ID, schemaVersion: V1 },
      targetSchema: { schemaId: SCHEMA_ID, schemaVersion: V3 },
    });
    expect(missing.ok).toBe(false);
    if (!missing.ok) {
      expect(isMigrationPathNotFoundError(missing.error)).toBe(true);
    }

    const unknownSource = registry.migrate({
      source: { version: V_UNKNOWN, value: 1 },
      sourceSchema: { schemaId: SCHEMA_ID, schemaVersion: V_UNKNOWN },
      targetSchema: { schemaId: SCHEMA_ID, schemaVersion: V2 },
    });
    expect(unknownSource.ok).toBe(false);
    if (!unknownSource.ok) {
      expect(unknownSource.error.code).toBe("unknown-source-version");
    }

    const unknownTarget = registry.migrate({
      source: { version: V1, value: 1 },
      sourceSchema: { schemaId: SCHEMA_ID, schemaVersion: V1 },
      targetSchema: { schemaId: SCHEMA_ID, schemaVersion: V_UNKNOWN },
    });
    expect(unknownTarget.ok).toBe(false);
    if (!unknownTarget.ok) {
      expect(unknownTarget.error.code).toBe("unknown-target-version");
    }
  });

  it("rejects ambiguous shortest paths", () => {
    const registry = createRegistryWithClock();
    registerDirectStep(registry, "v1-to-v2a", V1, V2, (input) => ({ ...input, marker: "a" }));
    registerDirectStep(registry, "v1-to-v2b", V1, requireSchemaVersion("1.2.0"), (input) => ({
      ...input,
      marker: "b",
    }));
    registerDirectStep(registry, "v2a-to-v3", V2, V3, (input) => ({ ...input, marker: "a3" }));
    registerDirectStep(
      registry,
      "v2b-to-v3",
      requireSchemaVersion("1.2.0"),
      V3,
      (input) => ({ ...input, marker: "b3" }),
    );

    const result = registry.migrate({
      source: { version: V1, value: 1 },
      sourceSchema: { schemaId: SCHEMA_ID, schemaVersion: V1 },
      targetSchema: { schemaId: SCHEMA_ID, schemaVersion: V3 },
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(isMigrationAmbiguousPathError(result.error)).toBe(true);
      if (isMigrationAmbiguousPathError(result.error)) {
        expect(result.error.pathCount).toBe(2);
      }
    }
  });

  it("treats same-version migration as an explicit no-op clone", () => {
    const registry = createRegistryWithClock();
    const source: TestPayload = { version: V2, value: 42 };
    const result = registry.migrate({
      source: source,
      sourceSchema: { schemaId: SCHEMA_ID, schemaVersion: V2 },
      targetSchema: { schemaId: SCHEMA_ID, schemaVersion: V2 },
    });

    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }

    expect(result.value).toEqual(source);
    expect(result.value).not.toBe(source);
    expect(result.report.appliedSteps).toEqual([]);
    expect(result.report.status).toBe("success");
  });

  it("isolates source input and returned output from step mutation", () => {
    const registry = createRegistryWithClock();
    const registration: MigrationStepRegistration<TestPayload, TestPayload> = {
      stepId: asMigrationStepId("mutator"),
      schemaId: SCHEMA_ID,
      fromVersion: V1,
      toVersion: V2,
      migrate: (input) => {
        const mutable = { ...input, extra: "mutated", value: 999 };
        return { value: mutable };
      },
    };
    expect(registry.registerStep(registration).ok).toBe(true);

    const source: TestPayload = { version: V1, value: 1 };
    const sourceSnapshot = structuredClone(source);
    const result = registry.migrate({
      source: source,
      sourceSchema: { schemaId: SCHEMA_ID, schemaVersion: V1 },
      targetSchema: { schemaId: SCHEMA_ID, schemaVersion: V2 },
    });

    expect(source).toEqual(sourceSnapshot);
    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }

    const output = result.value;
    output.value = -1;
    expect(source.value).toBe(1);
  });

  it("aggregates diagnostics and ID mappings in step order", () => {
    const registry = createRegistryWithClock();
    registry.registerStep({
      stepId: asMigrationStepId("first"),
      schemaId: SCHEMA_ID,
      fromVersion: V1,
      toVersion: V2,
      migrate: (input) => ({
        value: input,
        diagnostics: [
          createValidationIssue({
            code: "STEP_ONE",
            severity: "warning",
            message: "first",
            path: "/a",
          }),
        ],
        idMappings: [{ sourceId: "s1", disposition: "committed", targetId: FIXED_MIGRATION_ID }],
      }),
    });
    registry.registerStep({
      stepId: asMigrationStepId("second"),
      schemaId: SCHEMA_ID,
      fromVersion: V2,
      toVersion: V3,
      migrate: (input) => ({
        value: input,
        diagnostics: [
          createValidationIssue({
            code: "STEP_TWO",
            severity: "info",
            message: "second",
            path: "/b",
          }),
        ],
        idMappings: [{ sourceId: "s2", disposition: "unmapped" }],
        unknownFieldNotes: [{ jsonPointer: "/x", message: "unknown" }],
        provenanceNotes: [{ path: "/p", message: "note", code: "PROV" }],
      }),
    });

    const result = registry.migrate({
      source: { version: V1, value: 1 },
      sourceSchema: { schemaId: SCHEMA_ID, schemaVersion: V1 },
      targetSchema: { schemaId: SCHEMA_ID, schemaVersion: V3 },
    });

    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }

    expect(result.report.diagnostics.map((issue) => issue.code)).toEqual(["STEP_ONE", "STEP_TWO"]);
    expect(result.report.diagnostics[0]?.path).toBe("/steps/first/a");
    expect(result.report.idMappings.map((mapping) => mapping.sourceId)).toEqual(["s1", "s2"]);
    expect(result.report.unknownFieldNotes[0]?.jsonPointer).toBe("/steps/second/x");
    expect(result.report.provenanceNotes[0]?.path).toBe("/steps/second/p");
  });

  it("fails closed when a step reports error diagnostics and skips later steps", () => {
    const registry = createRegistryWithClock();
    registerDirectStep(registry, "v1-to-v2", V1, V2, (input) => input);
    registry.registerStep({
      stepId: asMigrationStepId("v2-to-v3"),
      schemaId: SCHEMA_ID,
      fromVersion: V2,
      toVersion: V3,
      migrate: (input) => ({
        value: input,
        diagnostics: [
          createValidationIssue({
            code: "STEP_ERROR",
            severity: "error",
            message: "step rejected",
            path: "/value",
          }),
        ],
      }),
    });
    registry.registerStep({
      stepId: asMigrationStepId("never-run"),
      schemaId: SCHEMA_ID,
      fromVersion: V3,
      toVersion: requireSchemaVersion("3.0.0"),
      migrate: () => {
        throw new Error("must not run");
      },
    });

    const result = registry.migrate({
      source: { version: V1, value: 1 },
      sourceSchema: { schemaId: SCHEMA_ID, schemaVersion: V1 },
      targetSchema: { schemaId: SCHEMA_ID, schemaVersion: V3 },
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(isMigrationValidationFailedError(result.error)).toBe(true);
      expect(result.report.status).toBe("validation_failed");
      expect(result.report.appliedSteps).toEqual([
        { stepId: asMigrationStepId("v1-to-v2"), fromVersion: V1, toVersion: V2 },
        { stepId: asMigrationStepId("v2-to-v3"), fromVersion: V2, toVersion: V3 },
      ]);
      expect(result.report.diagnostics.some((issue) => issue.code === "STEP_ERROR")).toBe(true);
      expect("value" in result.report).toBe(false);
    }
  });

  it("continues migration when step diagnostics are warning or info only", () => {
    const registry = createRegistryWithClock();
    registry.registerStep<TestPayload, TestPayload>({
      stepId: asMigrationStepId("warn-step"),
      schemaId: SCHEMA_ID,
      fromVersion: V1,
      toVersion: V2,
      migrate: (input) => ({
        value: { ...input, value: input.value + 1 },
        diagnostics: [
          createValidationIssue({
            code: "STEP_WARN",
            severity: "warning",
            message: "non-blocking",
            path: "/value",
          }),
        ],
      }),
    });
    registry.registerStep<TestPayload, TestPayload>({
      stepId: asMigrationStepId("info-step"),
      schemaId: SCHEMA_ID,
      fromVersion: V2,
      toVersion: V3,
      migrate: (input) => ({
        value: { ...input, value: input.value + 1 },
        diagnostics: [
          createValidationIssue({
            code: "STEP_INFO",
            severity: "info",
            message: "informational",
            path: "/value",
          }),
        ],
      }),
    });

    const result = registry.migrate({
      source: { version: V1, value: 1 },
      sourceSchema: { schemaId: SCHEMA_ID, schemaVersion: V1 },
      targetSchema: { schemaId: SCHEMA_ID, schemaVersion: V3 },
    });

    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }

    expect(result.value).toEqual({ version: V1, value: 3 });
    expect(result.report.diagnostics.map((issue) => issue.code)).toEqual(["STEP_WARN", "STEP_INFO"]);
  });

  it("runs target validation on same-version no-op migrations", () => {
    const registry = createRegistryWithClock();
    const source: TestPayload = { version: V2, value: 42 };

    const rejected = registry.migrate({
      source: source,
      sourceSchema: { schemaId: SCHEMA_ID, schemaVersion: V2 },
      targetSchema: { schemaId: SCHEMA_ID, schemaVersion: V2 },
      validateTarget: () =>
        createValidationResult([
          createValidationIssue({
            code: "NOOP_INVALID",
            severity: "error",
            message: "no-op rejected",
            path: "/value",
          }),
        ]),
    });
    expect(rejected.ok).toBe(false);
    if (!rejected.ok) {
      expect(isMigrationValidationFailedError(rejected.error)).toBe(true);
      expect(rejected.report.status).toBe("validation_failed");
      expect(rejected.report.diagnostics.some((issue) => issue.code === "NOOP_INVALID")).toBe(true);
      expect("value" in rejected.report).toBe(false);
    }

    const warned = registry.migrate({
      source: source,
      sourceSchema: { schemaId: SCHEMA_ID, schemaVersion: V2 },
      targetSchema: { schemaId: SCHEMA_ID, schemaVersion: V2 },
      validateTarget: () =>
        createValidationResult([
          createValidationIssue({
            code: "NOOP_WARN",
            severity: "warning",
            message: "no-op warning",
            path: "/value",
          }),
        ]),
    });
    expect(warned.ok).toBe(true);
    if (!warned.ok) {
      return;
    }

    expect(warned.report.diagnostics.some((issue) => issue.code === "NOOP_WARN")).toBe(true);
    expect(warned.value).toEqual(source);
    expect(warned.value).not.toBe(source);
  });

  it("converts target validator throws into typed validation failures", () => {
    const registry = createRegistryWithClock();
    registerDirectStep(registry, "v1-to-v2", V1, V2, (input) => input);

    const result = registry.migrate({
      source: { version: V1, value: 1 },
      sourceSchema: { schemaId: SCHEMA_ID, schemaVersion: V1 },
      targetSchema: { schemaId: SCHEMA_ID, schemaVersion: V2 },
      validateTarget: () => {
        throw new Error("validator exploded");
      },
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(isMigrationValidationFailedError(result.error)).toBe(true);
      expect(result.report.status).toBe("validation_failed");
      const diagnostic = result.report.diagnostics.find(
        (issue) => issue.code === "MIGRATION_TARGET_VALIDATOR_FAILED",
      );
      expect(diagnostic?.message).toBe("validator exploded");
      expect("value" in result.report).toBe(false);
    }
  });

  it("isolates source and result from target validator input mutation", () => {
    const registry = createRegistryWithClock();
    registerDirectStep(registry, "v1-to-v2", V1, V2, (input) => ({ ...input, value: input.value + 5 }));

    const source: TestPayload = { version: V1, value: 1 };
    const sourceSnapshot = structuredClone(source);
    const result = registry.migrate({
      source: source,
      sourceSchema: { schemaId: SCHEMA_ID, schemaVersion: V1 },
      targetSchema: { schemaId: SCHEMA_ID, schemaVersion: V2 },
      validateTarget: (value) => {
        const mutable = value as TestPayload & { injected?: string };
        mutable.value = -999;
        mutable.injected = "mutated";
        return createValidationResult([]);
      },
    });

    expect(source).toEqual(sourceSnapshot);
    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }

    expect(result.value).toEqual({ version: V1, value: 6 });
    const output = result.value;
    output.value = -1;
    expect(source.value).toBe(1);
  });

  it("fails closed when target validation fails", () => {
    const registry = createRegistryWithClock();
    registerDirectStep(registry, "v1-to-v2", V1, V2, (input) => input);

    const result = registry.migrate({
      source: { version: V1, value: 1 },
      sourceSchema: { schemaId: SCHEMA_ID, schemaVersion: V1 },
      targetSchema: { schemaId: SCHEMA_ID, schemaVersion: V2 },
      validateTarget: () =>
        createValidationResult([
          createValidationIssue({
            code: "TARGET_INVALID",
            severity: "error",
            message: "invalid target",
            path: "/value",
          }),
        ]),
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(isMigrationValidationFailedError(result.error)).toBe(true);
      expect(result.report.status).toBe("validation_failed");
      expect(result.report.diagnostics.some((issue) => issue.code === "TARGET_INVALID")).toBe(true);
    }
  });

  it("converts step throws into typed failure reports", () => {
    const registry = createRegistryWithClock();
    registry.registerStep({
      stepId: asMigrationStepId("boom"),
      schemaId: SCHEMA_ID,
      fromVersion: V1,
      toVersion: V2,
      migrate: () => {
        throw new Error("step exploded");
      },
    });

    const result = registry.migrate({
      source: { version: V1, value: 1 },
      sourceSchema: { schemaId: SCHEMA_ID, schemaVersion: V1 },
      targetSchema: { schemaId: SCHEMA_ID, schemaVersion: V2 },
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(isMigrationStepFailedError(result.error)).toBe(true);
      if (isMigrationStepFailedError(result.error)) {
        expect(result.error.causeMessage).toBe("step exploded");
      }
      expect(result.report.status).toBe("failed");
      expect(result.report.diagnostics[0]?.code).toBe("MIGRATION_STEP_FAILED");
    }
  });

  it("marks dry-run and normal reports with outputWritten=false", () => {
    const registry = createRegistryWithClock();
    registerDirectStep(registry, "v1-to-v2", V1, V2, (input) => ({ ...input, value: 2 }));

    const source = { version: V1, value: 1 };
    const dryRun = registry.dryRunMigrate({
      source: source,
      sourceSchema: { schemaId: SCHEMA_ID, schemaVersion: V1 },
      targetSchema: { schemaId: SCHEMA_ID, schemaVersion: V2 },
    });
    const normal = registry.migrate({
      source: source,
      sourceSchema: { schemaId: SCHEMA_ID, schemaVersion: V1 },
      targetSchema: { schemaId: SCHEMA_ID, schemaVersion: V2 },
    });

    expect(dryRun.ok).toBe(true);
    expect(normal.ok).toBe(true);
    if (!dryRun.ok || !normal.ok) {
      return;
    }

    expect(dryRun.report.dryRun).toBe(true);
    expect(dryRun.report.outputWritten).toBe(false);
    expect(normal.report.dryRun).toBe(false);
    expect(normal.report.outputWritten).toBe(false);
    expect(dryRun.value).toEqual(normal.value);
  });

  it("uses injected clock and migration id deterministically", () => {
    const registry = createRegistryWithClock("11111111-2222-4333-8444-555555555555" as UuidString);
    registerDirectStep(registry, "v1-to-v2", V1, V2, (input) => input);

    const result = registry.migrate({
      source: { version: V1, value: 1 },
      sourceSchema: { schemaId: SCHEMA_ID, schemaVersion: V1 },
      targetSchema: { schemaId: SCHEMA_ID, schemaVersion: V2 },
    });

    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }

    expect(result.report.migrationId).toBe("11111111-2222-4333-8444-555555555555");
    expect(result.report.startedAt).toBe("2026-07-16T00:00:00.000Z");
    expect(result.report.completedAt).toBe("2026-07-16T00:00:01.000Z");
  });

  it("does not loop infinitely when the migration graph contains a cycle", () => {
    const registry = createRegistryWithClock();
    registerDirectStep(registry, "v1-to-v2", V1, V2, (input) => ({ ...input, value: input.value + 1 }));
    registerDirectStep(registry, "v2-to-v1", V2, V1, (input) => ({ ...input, value: input.value + 1 }));
    registerDirectStep(registry, "v3-to-v2", V3, V2, (input) => ({ ...input, value: input.value + 1 }));

    const reachable = registry.migrate({
      source: { version: V1, value: 1 },
      sourceSchema: { schemaId: SCHEMA_ID, schemaVersion: V1 },
      targetSchema: { schemaId: SCHEMA_ID, schemaVersion: V2 },
    });
    expect(reachable.ok).toBe(true);

    const unreachable = registry.migrate({
      source: { version: V1, value: 1 },
      sourceSchema: { schemaId: SCHEMA_ID, schemaVersion: V1 },
      targetSchema: { schemaId: SCHEMA_ID, schemaVersion: V3 },
    });
    expect(unreachable.ok).toBe(false);
    if (!unreachable.ok) {
      expect(isMigrationPathNotFoundError(unreachable.error)).toBe(true);
    }
  });

  it("creates independent registry instances without shared mutable state", () => {
    const left = createRegistryWithClock();
    const right = createRegistryWithClock();
    registerDirectStep(left, "only-left", V1, V2, (input) => ({ ...input, value: 1 }));

    const leftResult = left.migrate({
      source: { version: V1, value: 0 },
      sourceSchema: { schemaId: SCHEMA_ID, schemaVersion: V1 },
      targetSchema: { schemaId: SCHEMA_ID, schemaVersion: V2 },
    });
    const rightResult = right.migrate({
      source: { version: V1, value: 0 },
      sourceSchema: { schemaId: SCHEMA_ID, schemaVersion: V1 },
      targetSchema: { schemaId: SCHEMA_ID, schemaVersion: V2 },
    });

    expect(leftResult.ok).toBe(true);
    expect(rightResult.ok).toBe(false);
  });
});

function typeOnlyMigrate<TSource, TTarget>(
  registry: MigrationRegistry,
  request: MigrationRequest<TSource, TTarget>,
): MigrationResult<TTarget> {
  return registry.migrate(request);
}

function typeOnlyDryRunMigrate<TSource, TTarget>(
  registry: MigrationRegistry,
  request: Omit<MigrationRequest<TSource, TTarget>, "dryRun">,
): MigrationResult<TTarget> {
  return registry.dryRunMigrate(request);
}

describe("migration framework contract type usability", () => {
  it("accepts RoadDesignDocument in migration API type positions without assertions", () => {
    type RoadMigrationRequest = MigrationRequest<RoadDesignDocument>;
    type RoadMigrationResult = MigrationResult<RoadDesignDocument>;
    type RoadMigrationReport = MigrationReport<RoadDesignDocument>;
    type RoadTargetValidator = TargetValidator<RoadDesignDocument>;
    type RoadMigrationStep = MigrationStepRegistration<RoadDesignDocument, RoadDesignDocument>;

    expectTypeOf<RoadMigrationRequest["source"]>().toEqualTypeOf<RoadDesignDocument>();
    expectTypeOf<RoadTargetValidator>().parameters.toEqualTypeOf<[RoadDesignDocument]>();
    expectTypeOf<RoadMigrationRequest["validateTarget"]>().toEqualTypeOf<
      TargetValidator<RoadDesignDocument> | undefined
    >();
    expectTypeOf<RoadMigrationResult>().toMatchTypeOf<
      { ok: true; value: RoadDesignDocument; report: RoadMigrationReport } | { ok: false }
    >();
    expectTypeOf<RoadMigrationStep["migrate"]>().parameters.toEqualTypeOf<
      [RoadDesignDocument, import("../types").MigrationStepExecutionContext]
    >();
  });

  it("types heterogeneous LegacyRoadShape to RoadDesignDocument migration without assertions", () => {
    interface LegacyRoadShape {
      readonly legacyId: string;
      readonly centerlinePoints: readonly { readonly x: number; readonly y: number }[];
    }

    type HeterogeneousRequest = MigrationRequest<LegacyRoadShape, RoadDesignDocument>;
    type HeterogeneousStep = MigrationStepRegistration<LegacyRoadShape, RoadDesignDocument>;
    type HeterogeneousResult = MigrationResult<RoadDesignDocument>;
    type HeterogeneousTargetValidator = TargetValidator<RoadDesignDocument>;

    expectTypeOf<HeterogeneousRequest["source"]>().toEqualTypeOf<LegacyRoadShape>();
    expectTypeOf<HeterogeneousRequest["validateTarget"]>().toEqualTypeOf<
      TargetValidator<RoadDesignDocument> | undefined
    >();
    expectTypeOf<HeterogeneousTargetValidator>().parameters.toEqualTypeOf<[RoadDesignDocument]>();
    expectTypeOf<HeterogeneousStep["migrate"]>().parameters.toEqualTypeOf<
      [LegacyRoadShape, import("../types").MigrationStepExecutionContext]
    >();
    expectTypeOf<HeterogeneousStep["migrate"]>().returns.toEqualTypeOf<
      import("../types").MigrationStepOutcome<RoadDesignDocument>
    >();
    expectTypeOf(typeOnlyMigrate<LegacyRoadShape, RoadDesignDocument>).returns.toEqualTypeOf<
      HeterogeneousResult
    >();
    expectTypeOf(typeOnlyDryRunMigrate<LegacyRoadShape, RoadDesignDocument>).returns.toEqualTypeOf<
      HeterogeneousResult
    >();
  });

  it("preserves same-type TestPayload defaults without redundant generic parameters", () => {
    type SameTypeRequest = MigrationRequest<TestPayload>;
    type DefaultedRequest = MigrationRequest<TestPayload, TestPayload>;

    expectTypeOf<SameTypeRequest>().toEqualTypeOf<DefaultedRequest>();
    expectTypeOf<SameTypeRequest["source"]>().toEqualTypeOf<TestPayload>();
    expectTypeOf<SameTypeRequest["validateTarget"]>().toEqualTypeOf<
      TargetValidator<TestPayload> | undefined
    >();
    expectTypeOf(typeOnlyMigrate<TestPayload, TestPayload>).returns.toEqualTypeOf<
      MigrationResult<TestPayload>
    >();
  });
});
