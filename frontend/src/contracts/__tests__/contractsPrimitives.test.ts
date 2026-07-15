import { describe, expect, it } from "vitest";
import {
  COORDINATE_CONTEXT_SCHEMA_VERSION,
  UNIT_CONTEXT_SCHEMA_VERSION,
  UuidGenerationUnavailableError,
  asRevisionId,
  createStableEntityId,
  createValidationIssue,
  createValidationResult,
  generateUuid,
  isIso8601UtcTimestamp,
  isPositiveRevisionId,
  isSemVerString,
  isValidUuid,
  mergeValidationResults,
  parseSchemaId,
  parseSchemaVersion,
  parseUuid,
  requireRevisionId,
  requireSchemaId,
  requireSchemaVersion,
  stableEntityIdEquals,
  validateCoordinateContext,
  validateRevisionMetadata,
  validateSchemaIdentity,
  validateStableEntityId,
  validateUnitContext,
  withDisplayAlias,
  type CoordinateContext,
  type RevisionMetadata,
  type TransformMatrix4x4,
  type UnitContext,
} from "../index";

const DOCUMENT_ID = parseUuid("550e8400-e29b-41d4-a716-446655440000")!;
const CONTEXT_ID = parseUuid("6ba7b810-9dad-11d1-80b4-00c04fd430c8")!;

const IDENTITY_MATRIX = [
  1, 0, 0, 0,
  0, 1, 0, 0,
  0, 0, 1, 0,
  0, 0, 0, 1,
] as const;

function createValidCoordinateContext(): CoordinateContext {
  return {
    schemaVersion: COORDINATE_CONTEXT_SCHEMA_VERSION,
    contextId: CONTEXT_ID,
    referenceType: "project",
    referenceName: "Main alignment CRS",
    origin: { x: 1000, y: 2000, z: 15.5 },
    axisOrder: ["x", "y", "z"],
    axisDirections: { x: "+x", y: "+y", z: "+z" },
    handedness: "right",
    verticalAxis: "z",
    orientation: {
      rotations: [0, 0, 0],
      rotationOrder: "xyz",
      rotationConvention: "intrinsic",
    },
    transformToCanonical: {
      transformVersion: "canonical-v1",
      status: "verified",
      matrix: IDENTITY_MATRIX,
    },
    angleUnit: "rad",
    confidenceStatus: "verified",
  };
}

function createValidUnitContext(): UnitContext {
  return {
    schemaVersion: UNIT_CONTEXT_SCHEMA_VERSION,
    contextId: CONTEXT_ID,
    length: "m",
    angle: "rad",
    force: "kN",
    moment: "kN·m",
    mass: "kg",
    temperature: "°C",
    stress: "MPa",
    area: "m²",
    inertia: "m⁴",
    modulus: "GPa",
    time: "s",
    signConventions: {
      crossfall: "right_down_positive",
      rotation: "counterclockwise_positive",
    },
    conversionVersion: "si-v1",
  };
}

function createValidRevisionMetadata(): RevisionMetadata {
  const revisionId = requireRevisionId(1);
  return {
    schemaVersion: requireSchemaVersion("0.1.0"),
    documentId: DOCUMENT_ID,
    revisionId,
    createdAt: "2026-07-15T12:00:00.000Z",
    contentChecksum: {
      algorithm: "sha256",
      hexDigest: "a".repeat(64),
    },
    parentRevisionIds: [],
    baseRevisionId: revisionId,
    actor: { actorId: "user-1", actorType: "user", displayName: "Engineer" },
    tool: { toolId: "spacer-road", toolVersion: "0.3.0-preview" },
    reason: "initial commit",
  };
}

describe("contracts uuid and stable entity id", () => {
  it("generates and validates UUIDs through a single helper", () => {
    const id = generateUuid();
    expect(isValidUuid(id)).toBe(true);
    expect(isValidUuid("not-a-uuid")).toBe(false);
    expect(isValidUuid("0")).toBe(false);
    expect(isValidUuid("1")).toBe(false);
  });

  it("fails closed when secure randomness is unavailable", () => {
    const originalCrypto = globalThis.crypto;
    Object.defineProperty(globalThis, "crypto", {
      configurable: true,
      value: undefined,
    });

    try {
      expect(() => generateUuid()).toThrow(UuidGenerationUnavailableError);
      const injected = generateUuid({
        getRandomValues(bytes) {
          for (let index = 0; index < bytes.length; index += 1) {
            bytes[index] = index;
          }
          return bytes;
        },
      });
      expect(isValidUuid(injected)).toBe(true);
    } finally {
      Object.defineProperty(globalThis, "crypto", {
        configurable: true,
        value: originalCrypto,
      });
    }
  });

  it("prefers an injected random bytes source over global crypto for deterministic output", () => {
    const deterministic = generateUuid({
      getRandomValues(bytes) {
        for (let index = 0; index < bytes.length; index += 1) {
          bytes[index] = index;
        }
        return bytes;
      },
    });
    expect(deterministic).toBe("00010203-0405-4607-8809-0a0b0c0d0e0f");
  });

  it("keeps stable identity separate from human display aliases", () => {
    const stableId = createStableEntityId({
      namespace: "road.geometry",
      entityKind: "alignment",
      aliases: [{ label: "Main Line", purpose: "display" }],
    });

    expect(stableId.id).not.toBe("Main Line");
    expect(stableId.aliases?.[0]?.label).toBe("Main Line");

    const relabeled = withDisplayAlias(stableId, {
      label: "Imported centerline",
      purpose: "legacy-import",
    });

    expect(stableEntityIdEquals(stableId, relabeled)).toBe(true);
    expect(relabeled.aliases).toHaveLength(2);
    expect(relabeled.id).toBe(stableId.id);
  });

  it("rejects array-index style ids during stable id validation", () => {
    const result = validateStableEntityId({
      namespace: "road.geometry",
      id: "3",
      entityKind: "alignment",
    });

    expect(result.status).toBe("invalid");
    expect(result.issues.some((issue) => issue.code === "STABLE_ID_INVALID")).toBe(true);
  });

  it("returns structured issues for invalid alias payloads", () => {
    const nullAlias = validateStableEntityId({
      namespace: "road.geometry",
      id: DOCUMENT_ID,
      entityKind: "alignment",
      aliases: [null],
    });
    expect(nullAlias.issues.some((issue) => issue.code === "DISPLAY_ALIAS_INVALID")).toBe(true);

    const emptyPurpose = validateStableEntityId({
      namespace: "road.geometry",
      id: DOCUMENT_ID,
      entityKind: "alignment",
      aliases: [{ label: "Main", purpose: "  " }],
    });
    expect(
      emptyPurpose.issues.some((issue) => issue.code === "DISPLAY_ALIAS_PURPOSE_INVALID"),
    ).toBe(true);

    const primitiveAlias = validateStableEntityId({
      namespace: "road.geometry",
      id: DOCUMENT_ID,
      entityKind: "alignment",
      aliases: ["legacy-label"],
    });
    expect(
      primitiveAlias.issues.some((issue) => issue.code === "DISPLAY_ALIAS_LIST_INVALID"),
    ).toBe(false);
    expect(
      primitiveAlias.issues.some((issue) => issue.code === "DISPLAY_ALIAS_INVALID"),
    ).toBe(true);
  });
});

describe("contracts schema identity", () => {
  it("parses valid schema identity values and rejects invalid input", () => {
    expect(parseSchemaId("spacer.contracts.validation-result")).toBe(
      "spacer.contracts.validation-result",
    );
    expect(parseSchemaId("")).toBeUndefined();
    expect(parseSchemaVersion("0.1.0")).toBe("0.1.0");
    expect(parseSchemaVersion("not-semver")).toBeUndefined();
    expect(() => requireSchemaVersion("")).toThrow();
    expect(() => requireSchemaId("   ")).toThrow();
    expect(isSemVerString("1.0.0")).toBe(true);
    expect(isSemVerString("01.0.0")).toBe(false);
  });

  it("validates schema identity without branding invalid values", () => {
    const invalid = validateSchemaIdentity({
      schemaId: "",
      schemaVersion: "bad",
    } as Partial<import("../schemaIdentity").SchemaIdentity>);
    expect(invalid.status).toBe("invalid");
    expect(invalid.issues.some((issue) => issue.code === "SCHEMA_VERSION_INVALID")).toBe(true);
  });
});

describe("contracts revision validation", () => {
  it("accepts positive integer revision ids", () => {
    expect(isPositiveRevisionId(1)).toBe(true);
    expect(isPositiveRevisionId(0)).toBe(false);
    expect(isPositiveRevisionId(-1)).toBe(false);
    expect(isPositiveRevisionId(1.5)).toBe(false);
    expect(asRevisionId(2)).toBe(2);
    expect(asRevisionId(0)).toBeUndefined();
    expect(requireRevisionId(2)).toBe(2);
    expect(() => requireRevisionId(0)).toThrow();
  });

  it("validates revision metadata without inventing defaults", () => {
    const valid = validateRevisionMetadata(createValidRevisionMetadata());
    expect(valid.status).toBe("valid");

    const missingRevision = validateRevisionMetadata({
      schemaVersion: requireSchemaVersion("0.1.0"),
      documentId: DOCUMENT_ID,
      createdAt: "2026-07-15T12:00:00.000Z",
      contentChecksum: {
      algorithm: "sha256",
      hexDigest: "a".repeat(64),
    },
    });
    expect(missingRevision.status).toBe("invalid");
    expect(
      missingRevision.issues.some((issue) => issue.code === "REVISION_ID_INVALID"),
    ).toBe(true);

    const invalidDocumentId = validateRevisionMetadata({
      ...createValidRevisionMetadata(),
      documentId: "road-design:abc",
    } as Partial<RevisionMetadata>);
    expect(invalidDocumentId.status).toBe("invalid");
    expect(
      invalidDocumentId.issues.some((issue) => issue.code === "REVISION_DOCUMENT_ID_INVALID"),
    ).toBe(true);
  });

  it("rejects non-ISO timestamps", () => {
    expect(isIso8601UtcTimestamp("2026-07-15T12:00:00.000Z")).toBe(true);
    expect(isIso8601UtcTimestamp("2026/07/15 12:00:00")).toBe(false);
    expect(isIso8601UtcTimestamp("2026-07-15T12:00:00+09:00")).toBe(false);

    const invalidTimestamp = validateRevisionMetadata({
      ...createValidRevisionMetadata(),
      createdAt: "July 15, 2026",
    });
    expect(invalidTimestamp.status).toBe("invalid");
    expect(
      invalidTimestamp.issues.some((issue) => issue.code === "REVISION_CREATED_AT_INVALID"),
    ).toBe(true);
  });
});

describe("contracts coordinate and unit context required fields", () => {
  it("requires explicit coordinate authority fields", () => {
    const valid = validateCoordinateContext(createValidCoordinateContext());
    expect(valid.status).toBe("valid");

    const incomplete = validateCoordinateContext({
      schemaVersion: COORDINATE_CONTEXT_SCHEMA_VERSION,
      contextId: CONTEXT_ID,
      referenceType: "local",
      referenceName: "Local",
      origin: { x: 0, y: 0, z: 0 },
      axisOrder: ["x", "y", "z"],
      axisDirections: { x: "+x", y: "+y", z: "+z" },
      handedness: "right",
      verticalAxis: "z",
    } satisfies Partial<CoordinateContext>);

    expect(incomplete.status).toBe("invalid");
    expect(
      incomplete.issues.some((issue) => issue.code === "COORDINATE_ORIENTATION_MISSING"),
    ).toBe(true);
    expect(
      incomplete.issues.some((issue) => issue.code === "COORDINATE_TRANSFORM_MISSING"),
    ).toBe(true);
    expect(
      incomplete.issues.some((issue) => issue.code === "COORDINATE_ANGLE_UNIT_INVALID"),
    ).toBe(true);
  });

  it("rejects duplicate axis direction assignments", () => {
    const duplicateSignedAxes = validateCoordinateContext({
      ...createValidCoordinateContext(),
      axisDirections: { x: "+x", y: "+x", z: "+z" },
    });
    expect(
      duplicateSignedAxes.issues.some(
        (issue) => issue.code === "COORDINATE_AXIS_DIRECTION_DUPLICATE",
      ),
    ).toBe(true);

    const duplicateBaseAxes = validateCoordinateContext({
      ...createValidCoordinateContext(),
      axisDirections: { x: "+x", y: "-x", z: "+z" },
    });
    expect(
      duplicateBaseAxes.issues.some(
        (issue) => issue.code === "COORDINATE_AXIS_DIRECTION_DUPLICATE",
      ),
    ).toBe(true);
  });

  it("allows unknown transforms without a matrix but validates one when present", () => {
    const withoutMatrix = validateCoordinateContext({
      ...createValidCoordinateContext(),
      transformToCanonical: {
        transformVersion: "canonical-v1",
        status: "unknown",
      },
    });
    expect(withoutMatrix.status).toBe("valid");

    const invalidMatrix = validateCoordinateContext({
      ...createValidCoordinateContext(),
      transformToCanonical: {
        transformVersion: "canonical-v1",
        status: "conflicted",
        matrix: [1, 2, 3] as unknown as TransformMatrix4x4,
      },
    });
    expect(
      invalidMatrix.issues.some((issue) => issue.code === "COORDINATE_TRANSFORM_MATRIX_INVALID"),
    ).toBe(true);
  });

  it("requires horizontal datum identifier for external CRS contexts", () => {
    const externalCrs = validateCoordinateContext({
      ...createValidCoordinateContext(),
      referenceType: "external-crs",
      externalCrsIdentifier: "EPSG:6668",
      horizontalDatum: { name: "JGD2011", status: "verified" },
    });
    expect(
      externalCrs.issues.some((issue) => issue.code === "COORDINATE_DATUM_IDENTIFIER_MISSING"),
    ).toBe(true);

    const localContext = validateCoordinateContext(createValidCoordinateContext());
    expect(
      localContext.issues.some((issue) => issue.code === "COORDINATE_DATUM_MISSING"),
    ).toBe(false);
  });

  it("requires externalCrsIdentifier for external CRS and rejects it for local or project", () => {
    const missingExternalCrsIdentifier = validateCoordinateContext({
      ...createValidCoordinateContext(),
      referenceType: "external-crs",
      horizontalDatum: { name: "JGD2011", status: "verified", identifier: "EPSG:6668" },
    });
    expect(
      missingExternalCrsIdentifier.issues.some(
        (issue) => issue.code === "COORDINATE_EXTERNAL_CRS_IDENTIFIER_MISSING",
      ),
    ).toBe(true);

    const emptyExternalCrsIdentifier = validateCoordinateContext({
      ...createValidCoordinateContext(),
      referenceType: "external-crs",
      externalCrsIdentifier: "   ",
      horizontalDatum: { name: "JGD2011", status: "verified", identifier: "EPSG:6668" },
    });
    expect(
      emptyExternalCrsIdentifier.issues.some(
        (issue) => issue.code === "COORDINATE_EXTERNAL_CRS_IDENTIFIER_MISSING",
      ),
    ).toBe(true);

    const projectWithExternalCrsIdentifier = validateCoordinateContext({
      ...createValidCoordinateContext(),
      referenceType: "project",
      externalCrsIdentifier: "EPSG:6668",
    });
    expect(
      projectWithExternalCrsIdentifier.issues.some(
        (issue) => issue.code === "COORDINATE_EXTERNAL_CRS_IDENTIFIER_CONTRADICTION",
      ),
    ).toBe(true);

    const localWithExternalCrsIdentifier = validateCoordinateContext({
      ...createValidCoordinateContext(),
      referenceType: "local",
      externalCrsIdentifier: "EPSG:6668",
    });
    expect(
      localWithExternalCrsIdentifier.issues.some(
        (issue) => issue.code === "COORDINATE_EXTERNAL_CRS_IDENTIFIER_CONTRADICTION",
      ),
    ).toBe(true);
  });

  it("requires vertical datum only when validation option is enabled", () => {
    const generic = validateCoordinateContext(createValidCoordinateContext());
    expect(
      generic.issues.some((issue) => issue.code === "COORDINATE_DATUM_MISSING"),
    ).toBe(false);

    const withRequiredVertical = validateCoordinateContext(createValidCoordinateContext(), "", {
      requireVerticalDatum: true,
    });
    expect(
      withRequiredVertical.issues.some((issue) => issue.code === "COORDINATE_DATUM_MISSING"),
    ).toBe(true);
  });

  it("rejects non-uuid context ids", () => {
    const invalid = validateCoordinateContext({
      ...createValidCoordinateContext(),
      contextId: "ctx-road-main",
    } as Partial<CoordinateContext>);
    expect(
      invalid.issues.some((issue) => issue.code === "COORDINATE_CONTEXT_ID_INVALID"),
    ).toBe(true);
    expect(parseUuid("ctx-road-main")).toBeUndefined();
  });

  it("requires explicit engineering units in unit context", () => {
    const valid = validateUnitContext(createValidUnitContext(), "", { profile: "mechanical" });
    expect(valid.status).toBe("valid");

    const genericValid = validateUnitContext({
      schemaVersion: UNIT_CONTEXT_SCHEMA_VERSION,
      contextId: CONTEXT_ID,
      length: "m",
      angle: "rad",
      conversionVersion: "si-v1",
    } satisfies Partial<UnitContext>);
    expect(genericValid.status).toBe("valid");

    const incomplete = validateUnitContext(
      {
        schemaVersion: UNIT_CONTEXT_SCHEMA_VERSION,
        contextId: CONTEXT_ID,
        length: "m",
        angle: "rad",
        conversionVersion: "si-v1",
      } satisfies Partial<UnitContext>,
      "",
      { profile: "mechanical" },
    );

    expect(incomplete.status).toBe("invalid");
    expect(incomplete.issues.some((issue) => issue.code === "UNIT_FORCE_INVALID")).toBe(true);
    expect(incomplete.issues.some((issue) => issue.code === "UNIT_MOMENT_INVALID")).toBe(true);
    expect(incomplete.issues.some((issue) => issue.code === "UNIT_MASS_INVALID")).toBe(true);
    expect(
      incomplete.issues.some((issue) => issue.code === "UNIT_TEMPERATURE_INVALID"),
    ).toBe(true);
  });
});

describe("contracts validation result aggregation", () => {
  it("merges issues and derives aggregate status", () => {
    const warningOnly = createValidationResult([
      createValidationIssue({
        code: "COORDINATE_CONTEXT_UNKNOWN",
        severity: "warning",
        message: "Coordinate authority is unknown.",
        path: "/coordinateContext/confidenceStatus",
      }),
    ]);
    expect(warningOnly.status).toBe("warning");

    const errorResult = createValidationResult([
      createValidationIssue({
        code: "STABLE_ID_COLLISION",
        severity: "error",
        message: "Stable id collision detected.",
        path: "/stableIdRegistry/alignment/2",
      }),
    ]);

    const merged = mergeValidationResults(warningOnly, errorResult);
    expect(merged.issues).toHaveLength(2);
    expect(merged.status).toBe("invalid");
  });

  it("reports metadata conflicts instead of silently keeping the first value", () => {
    const left = createValidationResult([], {
      evaluatedRevision: 1,
      evaluatedChecksum: "sha256:left",
      ruleSetVersion: "rules-a",
    });
    const right = createValidationResult([], {
      evaluatedRevision: 2,
      evaluatedChecksum: "sha256:right",
      ruleSetVersion: "rules-b",
    });

    const merged = mergeValidationResults(left, right);
    expect(merged.status).toBe("invalid");
    expect(
      merged.issues.filter((issue) => issue.code === "VALIDATION_METADATA_CONFLICT"),
    ).toHaveLength(3);
    expect(merged.evaluatedRevision).toBeUndefined();
    expect(merged.evaluatedChecksum).toBeUndefined();
    expect(merged.ruleSetVersion).toBeUndefined();
  });

  it("reports field-level metadata conflicts while preserving agreeing fields", () => {
    const left = createValidationResult([], {
      evaluatedRevision: 1,
      evaluatedChecksum: "sha256:shared",
      ruleSetVersion: "rules-shared",
    });
    const right = createValidationResult([], {
      evaluatedRevision: 2,
      evaluatedChecksum: "sha256:shared",
      ruleSetVersion: "rules-shared",
    });

    const merged = mergeValidationResults(left, right);
    expect(merged.status).toBe("invalid");
    expect(
      merged.issues.filter(
        (issue) =>
          issue.code === "VALIDATION_METADATA_CONFLICT" && issue.path === "/evaluatedRevision",
      ),
    ).toHaveLength(1);
    expect(merged.evaluatedRevision).toBeUndefined();
    expect(merged.evaluatedChecksum).toBe("sha256:shared");
    expect(merged.ruleSetVersion).toBe("rules-shared");
  });

  it("keeps shared metadata when all merged results agree", () => {
    const left = createValidationResult([], {
      evaluatedRevision: 4,
      evaluatedChecksum: "sha256:shared",
      ruleSetVersion: "rules-shared",
    });
    const right = createValidationResult([], {
      evaluatedRevision: 4,
      evaluatedChecksum: "sha256:shared",
      ruleSetVersion: "rules-shared",
    });

    const merged = mergeValidationResults(left, right);
    expect(merged.status).toBe("valid");
    expect(merged.evaluatedRevision).toBe(4);
    expect(merged.evaluatedChecksum).toBe("sha256:shared");
    expect(merged.ruleSetVersion).toBe("rules-shared");
  });

  it("exposes schema identity helpers for downstream contracts", () => {
    const schemaId = requireSchemaId("spacer.contracts.validation-result");
    const schemaVersion = requireSchemaVersion("0.1.0");
    expect(schemaId).toBe("spacer.contracts.validation-result");
    expect(schemaVersion).toBe("0.1.0");
  });
});
