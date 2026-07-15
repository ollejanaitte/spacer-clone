import { isSemVerString, requireSchemaVersion, type SchemaVersion } from "./schemaIdentity";
import { isValidUuid, type UuidString } from "./uuid";
import {
  createValidationIssue,
  createValidationResult,
  type ValidationIssue,
  type ValidationResult,
} from "./validation";

export const COORDINATE_CONTEXT_SCHEMA_VERSION = requireSchemaVersion("0.1.0");

export type Handedness = "left" | "right";
export type AxisName = "x" | "y" | "z";
export type AxisDirection = "+x" | "-x" | "+y" | "-y" | "+z" | "-z";
export type VerticalAxis = "x" | "y" | "z";
export type AuthorityStatus = "verified" | "unknown" | "conflicted";
export type CoordinateReferenceType = "local" | "project" | "external-crs";
export type CoordinateAngleUnit = "rad" | "deg";
export type OffsetSignConvention = "left_positive" | "right_positive";
export type ElevationSignConvention = "up_positive" | "down_positive";
export type RotationOrder = "xyz" | "xzy" | "yxz" | "yzx" | "zxy" | "zyx";
export type RotationConvention = "intrinsic" | "extrinsic";

export interface Point3 {
  readonly x: number;
  readonly y: number;
  readonly z: number;
}

export interface AxisDirections {
  readonly x: AxisDirection;
  readonly y: AxisDirection;
  readonly z: AxisDirection;
}

export type AxisOrder = readonly [AxisName, AxisName, AxisName];

export interface OrientationSpec {
  readonly rotations: readonly [number, number, number];
  readonly rotationOrder: RotationOrder;
  readonly rotationConvention: RotationConvention;
}

export type TransformMatrix4x4 = readonly [
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
];

export interface VerifiedCanonicalTransform {
  readonly transformVersion: string;
  readonly status: "verified";
  readonly matrix: TransformMatrix4x4;
}

export interface UncertainCanonicalTransform {
  readonly transformVersion: string;
  readonly status: "unknown" | "conflicted";
  readonly matrix?: TransformMatrix4x4;
}

export type CanonicalTransform = VerifiedCanonicalTransform | UncertainCanonicalTransform;

export interface DatumAuthority {
  readonly name: string;
  readonly status: AuthorityStatus;
  readonly identifier?: string;
}

export interface StationConvention {
  readonly tangentDirection: AxisDirection;
  readonly offsetSign: OffsetSignConvention;
  readonly elevationSign: ElevationSignConvention;
}

export interface CoordinateContext {
  readonly schemaVersion: SchemaVersion;
  readonly contextId: UuidString;
  readonly referenceType: CoordinateReferenceType;
  readonly referenceName: string;
  readonly externalCrsIdentifier?: string;
  readonly origin: Point3;
  readonly axisOrder: AxisOrder;
  readonly axisDirections: AxisDirections;
  readonly handedness: Handedness;
  readonly verticalAxis: VerticalAxis;
  readonly orientation: OrientationSpec;
  readonly transformToCanonical: CanonicalTransform;
  readonly horizontalDatum?: DatumAuthority;
  readonly verticalDatum?: DatumAuthority;
  readonly stationConvention?: StationConvention;
  readonly angleUnit: CoordinateAngleUnit;
  readonly confidenceStatus: AuthorityStatus;
}

export interface ValidateCoordinateContextOptions {
  readonly requireVerticalDatum?: boolean;
}

const AXIS_NAMES: readonly AxisName[] = ["x", "y", "z"];
const AXIS_DIRECTIONS: readonly AxisDirection[] = ["+x", "-x", "+y", "-y", "+z", "-z"];
const ROTATION_ORDERS: readonly RotationOrder[] = ["xyz", "xzy", "yxz", "yzx", "zxy", "zyx"];

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function isAxisDirection(value: unknown): value is AxisDirection {
  return typeof value === "string" && (AXIS_DIRECTIONS as readonly string[]).includes(value);
}

function baseAxisFromDirection(direction: AxisDirection): AxisName {
  return direction.slice(1) as AxisName;
}

function isPermutationOfAxes(value: readonly unknown[]): value is AxisOrder {
  if (value.length !== 3) {
    return false;
  }
  const seen = new Set<string>();
  for (const axis of value) {
    if (axis !== "x" && axis !== "y" && axis !== "z") {
      return false;
    }
    seen.add(axis);
  }
  return seen.size === 3;
}

function validateTransformMatrix(
  matrix: unknown,
  path: string,
  required: boolean,
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  if (matrix === undefined) {
    if (required) {
      issues.push(
        createValidationIssue({
          code: "COORDINATE_TRANSFORM_MATRIX_INVALID",
          severity: "error",
          message: "transform matrix must contain exactly 16 finite numbers.",
          path,
        }),
      );
    }
    return issues;
  }

  if (!Array.isArray(matrix) || matrix.length !== 16) {
    issues.push(
      createValidationIssue({
        code: "COORDINATE_TRANSFORM_MATRIX_INVALID",
        severity: "error",
        message: "transform matrix must contain exactly 16 finite numbers.",
        path,
      }),
    );
    return issues;
  }

  matrix.forEach((value, index) => {
    if (!isFiniteNumber(value)) {
      issues.push(
        createValidationIssue({
          code: "COORDINATE_TRANSFORM_MATRIX_ELEMENT_INVALID",
          severity: "error",
          message: `transform matrix element at index ${index} must be finite.`,
          path: `${path}/${index}`,
        }),
      );
    }
  });

  return issues;
}

function validatePoint3(
  point: Partial<Point3> | undefined,
  path: string,
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  if (point === undefined) {
    issues.push(
      createValidationIssue({
        code: "COORDINATE_ORIGIN_MISSING",
        severity: "error",
        message: "origin coordinates are required.",
        path,
      }),
    );
    return issues;
  }

  (["x", "y", "z"] as const).forEach((axis) => {
    if (!isFiniteNumber(point[axis])) {
      issues.push(
        createValidationIssue({
          code: "COORDINATE_ORIGIN_AXIS_INVALID",
          severity: "error",
          message: `origin.${axis} must be a finite number.`,
          path: `${path}/${axis}`,
        }),
      );
    }
  });

  return issues;
}

function validateDatumAuthority(
  datum: Partial<DatumAuthority> | undefined,
  path: string,
  options: { required: boolean; requireIdentifier: boolean },
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  if (datum === undefined) {
    if (options.required) {
      issues.push(
        createValidationIssue({
          code: "COORDINATE_DATUM_MISSING",
          severity: "error",
          message: "Datum authority is required.",
          path,
        }),
      );
    }
    return issues;
  }

  if (typeof datum.name !== "string" || datum.name.trim().length === 0) {
    issues.push(
      createValidationIssue({
        code: "COORDINATE_DATUM_NAME_MISSING",
        severity: "error",
        message: "Datum name must be a non-empty string.",
        path: `${path}/name`,
      }),
    );
  }

  if (
    datum.status !== "verified" &&
    datum.status !== "unknown" &&
    datum.status !== "conflicted"
  ) {
    issues.push(
      createValidationIssue({
        code: "COORDINATE_DATUM_STATUS_INVALID",
        severity: "error",
        message: "Datum status must be verified, unknown, or conflicted.",
        path: `${path}/status`,
      }),
    );
  }

  if (options.requireIdentifier) {
    if (typeof datum.identifier !== "string" || datum.identifier.trim().length === 0) {
      issues.push(
        createValidationIssue({
          code: "COORDINATE_DATUM_IDENTIFIER_MISSING",
          severity: "error",
          message: "Datum identifier must be a non-empty string for external CRS contexts.",
          path: `${path}/identifier`,
        }),
      );
    }
  }

  return issues;
}

function validateCanonicalTransform(
  transform: Partial<CanonicalTransform> | undefined,
  path: string,
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  if (transform === undefined) {
    issues.push(
      createValidationIssue({
        code: "COORDINATE_TRANSFORM_MISSING",
        severity: "error",
        message: "transformToCanonical is required.",
        path,
      }),
    );
    return issues;
  }

  if (typeof transform.transformVersion !== "string" || transform.transformVersion.trim().length === 0) {
    issues.push(
      createValidationIssue({
        code: "COORDINATE_TRANSFORM_VERSION_MISSING",
        severity: "error",
        message: "transformVersion must be a non-empty string.",
        path: `${path}/transformVersion`,
      }),
    );
  }

  if (
    transform.status !== "verified" &&
    transform.status !== "unknown" &&
    transform.status !== "conflicted"
  ) {
    issues.push(
      createValidationIssue({
        code: "COORDINATE_TRANSFORM_STATUS_INVALID",
        severity: "error",
        message: "transform status must be verified, unknown, or conflicted.",
        path: `${path}/status`,
      }),
    );
    return issues;
  }

  const matrixPath = `${path}/matrix`;
  if (transform.status === "verified") {
    issues.push(...validateTransformMatrix(transform.matrix, matrixPath, true));
  } else {
    issues.push(...validateTransformMatrix(transform.matrix, matrixPath, false));
  }

  return issues;
}

function validateAxisDirectionAssignments(
  axisDirections: Partial<AxisDirections> | undefined,
  path: string,
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  if (axisDirections === undefined) {
    issues.push(
      createValidationIssue({
        code: "COORDINATE_AXIS_DIRECTIONS_MISSING",
        severity: "error",
        message: "axisDirections are required.",
        path,
      }),
    );
    return issues;
  }

  const assignedBaseAxes: AxisName[] = [];
  AXIS_NAMES.forEach((axis) => {
    const direction = axisDirections[axis];
    if (!isAxisDirection(direction)) {
      issues.push(
        createValidationIssue({
          code: "COORDINATE_AXIS_DIRECTION_INVALID",
          severity: "error",
          message: `axisDirections.${axis} must be an explicit axis direction.`,
          path: `${path}/${axis}`,
        }),
      );
      return;
    }
    assignedBaseAxes.push(baseAxisFromDirection(direction));
  });

  const uniqueBaseAxes = new Set(assignedBaseAxes);
  if (assignedBaseAxes.length === 3 && uniqueBaseAxes.size !== 3) {
    issues.push(
      createValidationIssue({
        code: "COORDINATE_AXIS_DIRECTION_DUPLICATE",
        severity: "error",
        message: "axisDirections must not assign multiple source axes to the same target axis.",
        path,
      }),
    );
  }

  return issues;
}

export function validateCoordinateContext(
  context: Partial<CoordinateContext> | undefined,
  path = "",
  options: ValidateCoordinateContextOptions = {},
): ValidationResult {
  const issues: ValidationIssue[] = [];
  const basePath = path.length > 0 ? path : "";

  if (context === undefined) {
    issues.push(
      createValidationIssue({
        code: "COORDINATE_CONTEXT_MISSING",
        severity: "error",
        message: "Coordinate context is required.",
        path: basePath,
      }),
    );
    return createValidationResult(issues);
  }

  if (
    typeof context.schemaVersion !== "string" ||
    !isSemVerString(context.schemaVersion)
  ) {
    issues.push(
      createValidationIssue({
        code: "COORDINATE_SCHEMA_VERSION_INVALID",
        severity: "error",
        message: "schemaVersion must be a valid SemVer string.",
        path: `${basePath}/schemaVersion`,
      }),
    );
  }

  if (typeof context.contextId !== "string" || !isValidUuid(context.contextId)) {
    issues.push(
      createValidationIssue({
        code: "COORDINATE_CONTEXT_ID_INVALID",
        severity: "error",
        message: "contextId must be a valid UUID.",
        path: `${basePath}/contextId`,
      }),
    );
  }

  if (
    context.referenceType !== "local" &&
    context.referenceType !== "project" &&
    context.referenceType !== "external-crs"
  ) {
    issues.push(
      createValidationIssue({
        code: "COORDINATE_REFERENCE_TYPE_INVALID",
        severity: "error",
        message: "referenceType must be local, project, or external-crs.",
        path: `${basePath}/referenceType`,
      }),
    );
  }

  if (typeof context.referenceName !== "string" || context.referenceName.trim().length === 0) {
    issues.push(
      createValidationIssue({
        code: "COORDINATE_REFERENCE_NAME_MISSING",
        severity: "error",
        message: "referenceName must be a non-empty string.",
        path: `${basePath}/referenceName`,
      }),
    );
  }

  const hasExternalCrsIdentifier =
    typeof context.externalCrsIdentifier === "string" &&
    context.externalCrsIdentifier.trim().length > 0;

  if (context.referenceType === "external-crs") {
    if (!hasExternalCrsIdentifier) {
      issues.push(
        createValidationIssue({
          code: "COORDINATE_EXTERNAL_CRS_IDENTIFIER_MISSING",
          severity: "error",
          message: "externalCrsIdentifier must be a non-empty string for external CRS contexts.",
          path: `${basePath}/externalCrsIdentifier`,
        }),
      );
    }
  } else if (
    (context.referenceType === "local" || context.referenceType === "project") &&
    hasExternalCrsIdentifier
  ) {
    issues.push(
      createValidationIssue({
        code: "COORDINATE_EXTERNAL_CRS_IDENTIFIER_CONTRADICTION",
        severity: "error",
        message: "externalCrsIdentifier must not be set for local or project reference types.",
        path: `${basePath}/externalCrsIdentifier`,
      }),
    );
  }

  issues.push(...validatePoint3(context.origin, `${basePath}/origin`));

  if (!Array.isArray(context.axisOrder) || !isPermutationOfAxes(context.axisOrder)) {
    issues.push(
      createValidationIssue({
        code: "COORDINATE_AXIS_ORDER_INVALID",
        severity: "error",
        message: "axisOrder must be a permutation of x, y, and z.",
        path: `${basePath}/axisOrder`,
      }),
    );
  }

  issues.push(
    ...validateAxisDirectionAssignments(context.axisDirections, `${basePath}/axisDirections`),
  );

  if (context.handedness !== "left" && context.handedness !== "right") {
    issues.push(
      createValidationIssue({
        code: "COORDINATE_HANDEDNESS_INVALID",
        severity: "error",
        message: "handedness must be left or right.",
        path: `${basePath}/handedness`,
      }),
    );
  }

  if (
    context.verticalAxis !== "x" &&
    context.verticalAxis !== "y" &&
    context.verticalAxis !== "z"
  ) {
    issues.push(
      createValidationIssue({
        code: "COORDINATE_VERTICAL_AXIS_INVALID",
        severity: "error",
        message: "verticalAxis must be x, y, or z.",
        path: `${basePath}/verticalAxis`,
      }),
    );
  }

  if (context.orientation === undefined) {
    issues.push(
      createValidationIssue({
        code: "COORDINATE_ORIENTATION_MISSING",
        severity: "error",
        message: "orientation rotations must be declared explicitly.",
        path: `${basePath}/orientation`,
      }),
    );
  } else {
    if (
      !Array.isArray(context.orientation.rotations) ||
      context.orientation.rotations.length !== 3 ||
      context.orientation.rotations.some((rotation) => !isFiniteNumber(rotation))
    ) {
      issues.push(
        createValidationIssue({
          code: "COORDINATE_ORIENTATION_INVALID",
          severity: "error",
          message: "orientation.rotations must contain three finite numbers.",
          path: `${basePath}/orientation/rotations`,
        }),
      );
    }

    if (
      context.orientation.rotationOrder === undefined ||
      !ROTATION_ORDERS.includes(context.orientation.rotationOrder)
    ) {
      issues.push(
        createValidationIssue({
          code: "COORDINATE_ROTATION_ORDER_INVALID",
          severity: "error",
          message: "orientation.rotationOrder must be an explicit Euler rotation order.",
          path: `${basePath}/orientation/rotationOrder`,
        }),
      );
    }

    if (
      context.orientation.rotationConvention !== "intrinsic" &&
      context.orientation.rotationConvention !== "extrinsic"
    ) {
      issues.push(
        createValidationIssue({
          code: "COORDINATE_ROTATION_CONVENTION_INVALID",
          severity: "error",
          message: "orientation.rotationConvention must be intrinsic or extrinsic.",
          path: `${basePath}/orientation/rotationConvention`,
        }),
      );
    }
  }

  issues.push(
    ...validateCanonicalTransform(context.transformToCanonical, `${basePath}/transformToCanonical`),
  );

  const isExternalCrs = context.referenceType === "external-crs";
  issues.push(
    ...validateDatumAuthority(context.horizontalDatum, `${basePath}/horizontalDatum`, {
      required: isExternalCrs,
      requireIdentifier: isExternalCrs,
    }),
  );

  if (options.requireVerticalDatum === true) {
    issues.push(
      ...validateDatumAuthority(context.verticalDatum, `${basePath}/verticalDatum`, {
        required: true,
        requireIdentifier: false,
      }),
    );
  } else if (context.verticalDatum !== undefined) {
    issues.push(
      ...validateDatumAuthority(context.verticalDatum, `${basePath}/verticalDatum`, {
        required: false,
        requireIdentifier: false,
      }),
    );
  }

  if (context.angleUnit !== "rad" && context.angleUnit !== "deg") {
    issues.push(
      createValidationIssue({
        code: "COORDINATE_ANGLE_UNIT_INVALID",
        severity: "error",
        message: "angleUnit must be rad or deg.",
        path: `${basePath}/angleUnit`,
      }),
    );
  }

  if (
    context.confidenceStatus !== "verified" &&
    context.confidenceStatus !== "unknown" &&
    context.confidenceStatus !== "conflicted"
  ) {
    issues.push(
      createValidationIssue({
        code: "COORDINATE_CONFIDENCE_STATUS_INVALID",
        severity: "error",
        message: "confidenceStatus must be verified, unknown, or conflicted.",
        path: `${basePath}/confidenceStatus`,
      }),
    );
  }

  if (context.stationConvention !== undefined) {
    const station = context.stationConvention;
    if (!isAxisDirection(station.tangentDirection)) {
      issues.push(
        createValidationIssue({
          code: "COORDINATE_STATION_TANGENT_INVALID",
          severity: "error",
          message: "stationConvention.tangentDirection must be explicit.",
          path: `${basePath}/stationConvention/tangentDirection`,
        }),
      );
    }
    if (
      station.offsetSign !== "left_positive" &&
      station.offsetSign !== "right_positive"
    ) {
      issues.push(
        createValidationIssue({
          code: "COORDINATE_STATION_OFFSET_SIGN_INVALID",
          severity: "error",
          message: "stationConvention.offsetSign must be left_positive or right_positive.",
          path: `${basePath}/stationConvention/offsetSign`,
        }),
      );
    }
    if (
      station.elevationSign !== "up_positive" &&
      station.elevationSign !== "down_positive"
    ) {
      issues.push(
        createValidationIssue({
          code: "COORDINATE_STATION_ELEVATION_SIGN_INVALID",
          severity: "error",
          message: "stationConvention.elevationSign must be up_positive or down_positive.",
          path: `${basePath}/stationConvention/elevationSign`,
        }),
      );
    }
  }

  return createValidationResult(issues);
}
