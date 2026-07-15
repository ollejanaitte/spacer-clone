import { describe, expect, it } from "vitest";
import {
  createValidationIssue,
  createValidationResult,
  COORDINATE_CONTEXT_SCHEMA_VERSION,
  UNIT_CONTEXT_SCHEMA_VERSION,
  parseUuid,
  requireRevisionId,
  requireSchemaVersion,
} from "../../index";
import {
  parseContractValue,
  parseCoordinateContextValue,
  parseRevisionMetadataValue,
  parseSchemaIdentityValue,
  parseStableEntityIdValue,
  parseUnitContextValue,
  parseUuidValue,
  parseValidationResultValue,
  uuidValueSchema,
  zodIssuesToValidationResult,
} from "../index";
import { z } from "zod";
import { schemaIdentitySchema } from "../schemas";

const DOCUMENT_ID = parseUuid("550e8400-e29b-41d4-a716-446655440000")!;
const CONTEXT_ID = parseUuid("6ba7b810-9dad-11d1-80b4-00c04fd430c8")!;

const IDENTITY_MATRIX = [
  1, 0, 0, 0,
  0, 1, 0, 0,
  0, 0, 1, 0,
  0, 0, 0, 1,
] as const;

function createValidCoordinateContext() {
  return {
    schemaVersion: COORDINATE_CONTEXT_SCHEMA_VERSION,
    contextId: CONTEXT_ID,
    referenceType: "project" as const,
    referenceName: "Main alignment CRS",
    origin: { x: 1000, y: 2000, z: 15.5 },
    axisOrder: ["x", "y", "z"] as const,
    axisDirections: { x: "+x", y: "+y", z: "+z" },
    handedness: "right" as const,
    verticalAxis: "z" as const,
    orientation: {
      rotations: [0, 0, 0] as const,
      rotationOrder: "xyz" as const,
      rotationConvention: "intrinsic" as const,
    },
    transformToCanonical: {
      transformVersion: "canonical-v1",
      status: "verified" as const,
      matrix: IDENTITY_MATRIX,
    },
    angleUnit: "rad" as const,
    confidenceStatus: "verified" as const,
  };
}

function createValidUnitContext() {
  return {
    schemaVersion: UNIT_CONTEXT_SCHEMA_VERSION,
    contextId: CONTEXT_ID,
    length: "m" as const,
    angle: "rad" as const,
    force: "kN" as const,
    moment: "kN·m" as const,
    mass: "kg" as const,
    temperature: "°C" as const,
    stress: "MPa" as const,
    area: "m²" as const,
    inertia: "m⁴" as const,
    modulus: "GPa" as const,
    time: "s" as const,
    signConventions: {
      crossfall: "right_down_positive" as const,
      rotation: "counterclockwise_positive" as const,
    },
    conversionVersion: "si-v1",
  };
}

describe("runtime contract parse API", () => {
  it("accepts valid UUID values", () => {
    const parsed = parseUuidValue(DOCUMENT_ID);
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data).toBe(DOCUMENT_ID);
      expect(parsed.validation.status).toBe("valid");
      expect(parsed.validation.issues).toHaveLength(0);
    }
  });

  it("rejects invalid UUID values without throwing", () => {
    const parsed = parseUuidValue("not-a-uuid");
    expect(parsed.success).toBe(false);
    if (!parsed.success) {
      expect(parsed.validation.status).toBe("invalid");
      expect(parsed.validation.issues.length).toBeGreaterThan(0);
    }
  });

  it("rejects unknown fields on strict objects", () => {
    const parsed = parseSchemaIdentityValue({
      schemaId: "spacer.contracts.validation-result",
      schemaVersion: "0.1.0",
      extra: true,
    });
    expect(parsed.success).toBe(false);
    if (!parsed.success) {
      expect(
        parsed.validation.issues.some((issue) => issue.code === "ZOD_UNRECOGNIZED_KEYS"),
      ).toBe(true);
    }
  });

  it("reports nested structural error paths", () => {
    const parsed = parseStableEntityIdValue({
      namespace: "road.geometry",
      id: DOCUMENT_ID,
      entityKind: "alignment",
      aliases: [{ label: "" }],
    });
    expect(parsed.success).toBe(false);
    if (!parsed.success) {
      const aliasIssue = parsed.validation.issues.find((issue) =>
        issue.path.includes("/aliases/0/label"),
      );
      expect(aliasIssue).toBeDefined();
    }
  });

  it("round-trips valid payloads through JSON serialization", () => {
    const source = createValidCoordinateContext();
    const serialized = JSON.parse(JSON.stringify(source)) as unknown;
    const parsed = parseCoordinateContextValue(serialized);
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(JSON.stringify(parsed.data)).toBe(JSON.stringify(source));
    }
  });

  it("integrates semantic validators after structural Zod validation", () => {
    const duplicateAxes = parseCoordinateContextValue({
      ...createValidCoordinateContext(),
      axisDirections: { x: "+x", y: "+x", z: "+z" },
    });
    expect(duplicateAxes.success).toBe(false);
    if (!duplicateAxes.success) {
      expect(
        duplicateAxes.validation.issues.some(
          (issue) => issue.code === "COORDINATE_AXIS_DIRECTION_DUPLICATE",
        ),
      ).toBe(true);
    }

    const mechanicalProfile = parseUnitContextValue(
      {
        schemaVersion: UNIT_CONTEXT_SCHEMA_VERSION,
        contextId: CONTEXT_ID,
        length: "m",
        angle: "rad",
        conversionVersion: "si-v1",
      },
      "",
      { profile: "mechanical" },
    );
    expect(mechanicalProfile.success).toBe(false);
    if (!mechanicalProfile.success) {
      expect(
        mechanicalProfile.validation.issues.some((issue) => issue.code === "UNIT_FORCE_INVALID"),
      ).toBe(true);
    }
  });

  it("requires verified transform matrix at semantic layer", () => {
    const missingMatrix = parseCoordinateContextValue({
      ...createValidCoordinateContext(),
      transformToCanonical: {
        transformVersion: "canonical-v1",
        status: "verified",
      },
    });
    expect(missingMatrix.success).toBe(false);
    if (!missingMatrix.success) {
      expect(
        missingMatrix.validation.issues.some(
          (issue) => issue.code === "ZOD_INVALID_UNION" || issue.code === "ZOD_INVALID_TYPE",
        ),
      ).toBe(true);
    }
  });

  it("parses revision metadata with semantic ISO timestamp checks", () => {
    const revisionId = requireRevisionId(1);
    const valid = parseRevisionMetadataValue({
      schemaVersion: requireSchemaVersion("0.1.0"),
      documentId: DOCUMENT_ID,
      revisionId,
      createdAt: "2026-07-15T12:00:00.000Z",
      contentChecksum: {
        algorithm: "sha256",
        hexDigest: "a".repeat(64),
      },
    });
    expect(valid.success).toBe(true);

    const invalidTimestamp = parseRevisionMetadataValue({
      schemaVersion: requireSchemaVersion("0.1.0"),
      documentId: DOCUMENT_ID,
      revisionId,
      createdAt: "July 15, 2026",
      contentChecksum: {
        algorithm: "sha256",
        hexDigest: "a".repeat(64),
      },
    });
    expect(invalidTimestamp.success).toBe(false);
    if (!invalidTimestamp.success) {
      expect(
        invalidTimestamp.validation.issues.some((issue) => issue.code.startsWith("ZOD_")),
      ).toBe(true);
    }
  });

  it("parses validation result documents structurally", () => {
    const parsed = parseValidationResultValue({
      schemaVersion: "0.1.0",
      status: "valid",
      issues: [],
    });
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.validation.status).toBe("valid");
    }
  });

  it("preserves semantic warnings on structural success", () => {
    const parsed = parseContractValue(uuidValueSchema, DOCUMENT_ID, {
      semantic: (_data, path) =>
        createValidationResult([
          createValidationIssue({
            code: "TEST_WARNING",
            severity: "warning",
            message: "Advisory only.",
            path,
          }),
        ]),
    });
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.validation.status).toBe("warning");
      expect(parsed.validation.issues).toHaveLength(1);
      expect(parsed.validation.issues[0]?.severity).toBe("warning");
    }
  });

  it("preserves semantic info issues on structural success", () => {
    const parsed = parseContractValue(uuidValueSchema, DOCUMENT_ID, {
      semantic: (_data, path) =>
        createValidationResult([
          createValidationIssue({
            code: "TEST_INFO",
            severity: "info",
            message: "Informational only.",
            path,
          }),
        ]),
    });
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.validation.status).toBe("valid");
      expect(parsed.validation.issues).toHaveLength(1);
      expect(parsed.validation.issues[0]?.severity).toBe("info");
    }
  });

  it("converts semantic validator throws to structured failure", () => {
    const parsed = parseContractValue(uuidValueSchema, DOCUMENT_ID, {
      semantic: () => {
        throw new Error("internal detail\nstack trace");
      },
    });
    expect(parsed.success).toBe(false);
    if (!parsed.success) {
      expect(parsed.validation.issues[0]?.code).toBe("CONTRACT_SEMANTIC_VALIDATOR_FAILURE");
      expect(parsed.validation.issues[0]?.message).not.toContain("stack");
      expect(parsed.validation.issues[0]?.message).not.toContain("\n");
    }
  });

  it("returns domain CoordinateContext values after parse", () => {
    const parsed = parseCoordinateContextValue(createValidCoordinateContext());
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.contextId).toBe(CONTEXT_ID);
      expect(parsed.data.schemaVersion).toBe(COORDINATE_CONTEXT_SCHEMA_VERSION);
      expect(parsed.validation.status).toBe("valid");
    }
  });

  it("maps Zod issues to ValidationResult stably", () => {
    const result = schemaIdentitySchema.safeParse({ schemaId: "", schemaVersion: "bad" });
    expect(result.success).toBe(false);
    if (!result.success) {
      const validation = zodIssuesToValidationResult(result.error.issues, "/identity");
      expect(validation.status).toBe("invalid");
      expect(validation.issues.every((issue) => issue.code.startsWith("ZOD_"))).toBe(true);
      expect(validation.issues.some((issue) => issue.path.startsWith("/identity"))).toBe(true);
    }
  });

  it("does not coerce or default missing fields", () => {
    const parsed = parseUnitContextValue({
      schemaVersion: UNIT_CONTEXT_SCHEMA_VERSION,
      contextId: CONTEXT_ID,
    });
    expect(parsed.success).toBe(false);
    if (!parsed.success) {
      expect(parsed.validation.issues.some((issue) => issue.code === "ZOD_INVALID_TYPE")).toBe(true);
    }
  });

  it("rejects transform pipelines that would mutate parsed values", () => {
    const transformingSchema = z.string().transform((value) => value.trim());
    const result = transformingSchema.safeParse("  value  ");
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toBe("value");
    }
    expect(createValidUnitContext().length).toBe("m");
  });
});
