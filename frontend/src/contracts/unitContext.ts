import { isSemVerString, requireSchemaVersion, type SchemaVersion } from "./schemaIdentity";
import { isValidUuid, type UuidString } from "./uuid";
import {
  createValidationIssue,
  createValidationResult,
  type ValidationIssue,
  type ValidationResult,
} from "./validation";

export const UNIT_CONTEXT_SCHEMA_VERSION = requireSchemaVersion("0.1.0");

export type LengthUnit = "m" | "mm" | "ft" | "in";
export type AngleUnit = "rad" | "deg";
export type ForceUnit = "N" | "kN" | "lbf";
export type MomentUnit = "N·m" | "kN·m" | "lbf·ft";
export type MassUnit = "kg" | "t" | "lb";
export type TemperatureUnit = "K" | "°C" | "°F";
export type StressUnit = "Pa" | "kPa" | "MPa" | "GPa";
export type AreaUnit = "m²" | "mm²" | "ft²" | "in²";
export type InertiaUnit = "m⁴" | "mm⁴" | "ft⁴" | "in⁴";
export type ModulusUnit = "Pa" | "kPa" | "MPa" | "GPa";
export type TimeUnit = "s" | "min" | "h";
export type CrossfallSignConvention = "right_down_positive" | "left_down_positive";
export type RotationSignConvention =
  | "counterclockwise_positive"
  | "clockwise_positive";

export type UnitContextValidationProfile = "generic" | "road" | "mechanical";

export interface ValidateUnitContextOptions {
  readonly profile?: UnitContextValidationProfile;
}

export interface UnitSignConventions {
  readonly crossfall?: CrossfallSignConvention;
  readonly rotation?: RotationSignConvention;
}

export interface UnitContext {
  readonly schemaVersion: SchemaVersion;
  readonly contextId: UuidString;
  readonly length: LengthUnit;
  readonly angle: AngleUnit;
  readonly force?: ForceUnit;
  readonly moment?: MomentUnit;
  readonly mass?: MassUnit;
  readonly temperature?: TemperatureUnit;
  readonly stress?: StressUnit;
  readonly area?: AreaUnit;
  readonly inertia?: InertiaUnit;
  readonly modulus?: ModulusUnit;
  readonly time?: TimeUnit;
  readonly signConventions?: UnitSignConventions;
  readonly conversionVersion: string;
}

const LENGTH_UNITS: readonly LengthUnit[] = ["m", "mm", "ft", "in"];
const ANGLE_UNITS: readonly AngleUnit[] = ["rad", "deg"];
const FORCE_UNITS: readonly ForceUnit[] = ["N", "kN", "lbf"];
const MOMENT_UNITS: readonly MomentUnit[] = ["N·m", "kN·m", "lbf·ft"];
const MASS_UNITS: readonly MassUnit[] = ["kg", "t", "lb"];
const TEMPERATURE_UNITS: readonly TemperatureUnit[] = ["K", "°C", "°F"];
const STRESS_UNITS: readonly StressUnit[] = ["Pa", "kPa", "MPa", "GPa"];
const AREA_UNITS: readonly AreaUnit[] = ["m²", "mm²", "ft²", "in²"];
const INERTIA_UNITS: readonly InertiaUnit[] = ["m⁴", "mm⁴", "ft⁴", "in⁴"];
const MODULUS_UNITS: readonly ModulusUnit[] = ["Pa", "kPa", "MPa", "GPa"];
const TIME_UNITS: readonly TimeUnit[] = ["s", "min", "h"];

const MECHANICAL_UNIT_FIELDS = [
  { key: "force", allowed: FORCE_UNITS, code: "UNIT_FORCE_INVALID", label: "force" },
  { key: "moment", allowed: MOMENT_UNITS, code: "UNIT_MOMENT_INVALID", label: "moment" },
  { key: "mass", allowed: MASS_UNITS, code: "UNIT_MASS_INVALID", label: "mass" },
  {
    key: "temperature",
    allowed: TEMPERATURE_UNITS,
    code: "UNIT_TEMPERATURE_INVALID",
    label: "temperature",
  },
  { key: "stress", allowed: STRESS_UNITS, code: "UNIT_STRESS_INVALID", label: "stress" },
  { key: "area", allowed: AREA_UNITS, code: "UNIT_AREA_INVALID", label: "area" },
  { key: "inertia", allowed: INERTIA_UNITS, code: "UNIT_INERTIA_INVALID", label: "inertia" },
  { key: "modulus", allowed: MODULUS_UNITS, code: "UNIT_MODULUS_INVALID", label: "modulus" },
  { key: "time", allowed: TIME_UNITS, code: "UNIT_TIME_INVALID", label: "time" },
] as const;

function isAllowedUnitValue(value: string, allowed: readonly string[]): boolean {
  return allowed.includes(value);
}

function validateUnitEnum(
  value: unknown,
  allowed: readonly string[],
  path: string,
  code: string,
  label: string,
  required: boolean,
): ValidationIssue[] {
  if (value === undefined) {
    if (required) {
      return [
        createValidationIssue({
          code,
          severity: "error",
          message: `${label} must be one of: ${allowed.join(", ")}.`,
          path,
        }),
      ];
    }
    return [];
  }

  if (typeof value !== "string" || !isAllowedUnitValue(value, allowed)) {
    return [
      createValidationIssue({
        code,
        severity: "error",
        message: `${label} must be one of: ${allowed.join(", ")}.`,
        path,
      }),
    ];
  }

  return [];
}

export function validateUnitContext(
  context: Partial<UnitContext> | undefined,
  path = "",
  options: ValidateUnitContextOptions = {},
): ValidationResult {
  const issues: ValidationIssue[] = [];
  const basePath = path.length > 0 ? path : "";
  const profile = options.profile ?? "generic";
  const requireMechanicalUnits = profile === "mechanical";

  if (context === undefined) {
    issues.push(
      createValidationIssue({
        code: "UNIT_CONTEXT_MISSING",
        severity: "error",
        message: "Unit context is required.",
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
        code: "UNIT_SCHEMA_VERSION_INVALID",
        severity: "error",
        message: "schemaVersion must be a valid SemVer string.",
        path: `${basePath}/schemaVersion`,
      }),
    );
  }

  if (typeof context.contextId !== "string" || !isValidUuid(context.contextId)) {
    issues.push(
      createValidationIssue({
        code: "UNIT_CONTEXT_ID_INVALID",
        severity: "error",
        message: "contextId must be a valid UUID.",
        path: `${basePath}/contextId`,
      }),
    );
  }

  issues.push(
    ...validateUnitEnum(
      context.length,
      LENGTH_UNITS,
      `${basePath}/length`,
      "UNIT_LENGTH_INVALID",
      "length",
      true,
    ),
    ...validateUnitEnum(
      context.angle,
      ANGLE_UNITS,
      `${basePath}/angle`,
      "UNIT_ANGLE_INVALID",
      "angle",
      true,
    ),
  );

  for (const field of MECHANICAL_UNIT_FIELDS) {
    issues.push(
      ...validateUnitEnum(
        context[field.key],
        field.allowed,
        `${basePath}/${field.key}`,
        field.code,
        field.label,
        requireMechanicalUnits,
      ),
    );
  }

  if (
    typeof context.conversionVersion !== "string" ||
    context.conversionVersion.trim().length === 0
  ) {
    issues.push(
      createValidationIssue({
        code: "UNIT_CONVERSION_VERSION_MISSING",
        severity: "error",
        message: "conversionVersion must be a non-empty string.",
        path: `${basePath}/conversionVersion`,
      }),
    );
  }

  if (context.signConventions !== undefined) {
    const sign = context.signConventions;
    if (
      sign.crossfall !== undefined &&
      sign.crossfall !== "right_down_positive" &&
      sign.crossfall !== "left_down_positive"
    ) {
      issues.push(
        createValidationIssue({
          code: "UNIT_CROSSFALL_SIGN_INVALID",
          severity: "error",
          message: "signConventions.crossfall must be right_down_positive or left_down_positive.",
          path: `${basePath}/signConventions/crossfall`,
        }),
      );
    }
    if (
      sign.rotation !== undefined &&
      sign.rotation !== "counterclockwise_positive" &&
      sign.rotation !== "clockwise_positive"
    ) {
      issues.push(
        createValidationIssue({
          code: "UNIT_ROTATION_SIGN_INVALID",
          severity: "error",
          message:
            "signConventions.rotation must be counterclockwise_positive or clockwise_positive.",
          path: `${basePath}/signConventions/rotation`,
        }),
      );
    }
  }

  return createValidationResult(issues);
}
