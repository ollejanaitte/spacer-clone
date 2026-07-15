import type { Point3 } from "./coordinateContext";
import {
  createValidationIssue,
  createValidationResult,
  type ValidationIssue,
  type ValidationResult,
} from "./validation";

export interface Polyline3 {
  readonly points: readonly Point3[];
}

export interface Polygon3 {
  readonly vertices: readonly Point3[];
}

function validatePoint3(point: Partial<Point3> | undefined, path: string): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  if (point === undefined) {
    issues.push(
      createValidationIssue({
        code: "GEOMETRY_POINT3_MISSING",
        severity: "error",
        message: "Point3 is required.",
        path,
      }),
    );
    return issues;
  }

  for (const axis of ["x", "y", "z"] as const) {
    const value = point[axis];
    if (typeof value !== "number" || !Number.isFinite(value)) {
      issues.push(
        createValidationIssue({
          code: "GEOMETRY_POINT3_NONFINITE",
          severity: "error",
          message: `Point3.${axis} must be a finite number.`,
          path: `${path}/${axis}`,
        }),
      );
    }
  }

  return issues;
}

export function validatePolyline3(
  polyline: Partial<Polyline3> | undefined,
  path: string,
): ValidationResult {
  const issues: ValidationIssue[] = [];

  if (polyline === undefined) {
    issues.push(
      createValidationIssue({
        code: "GEOMETRY_POLYLINE3_MISSING",
        severity: "error",
        message: "Polyline3 is required.",
        path,
      }),
    );
    return createValidationResult(issues);
  }

  if (!Array.isArray(polyline.points)) {
    issues.push(
      createValidationIssue({
        code: "GEOMETRY_POLYLINE3_POINTS_INVALID",
        severity: "error",
        message: "Polyline3.points must be an array.",
        path: `${path}/points`,
      }),
    );
    return createValidationResult(issues);
  }

  if (polyline.points.length < 2) {
    issues.push(
      createValidationIssue({
        code: "GEOMETRY_POLYLINE3_TOO_FEW_POINTS",
        severity: "error",
        message: "Polyline3 must contain at least two ordered points.",
        path: `${path}/points`,
      }),
    );
  }

  polyline.points.forEach((point, index) => {
    issues.push(...validatePoint3(point, `${path}/points/${index}`));
  });

  return createValidationResult(issues);
}

export function validatePolygon3(
  polygon: Partial<Polygon3> | undefined,
  path: string,
): ValidationResult {
  const issues: ValidationIssue[] = [];

  if (polygon === undefined) {
    issues.push(
      createValidationIssue({
        code: "GEOMETRY_POLYGON3_MISSING",
        severity: "error",
        message: "Polygon3 is required.",
        path,
      }),
    );
    return createValidationResult(issues);
  }

  if (!Array.isArray(polygon.vertices)) {
    issues.push(
      createValidationIssue({
        code: "GEOMETRY_POLYGON3_VERTICES_INVALID",
        severity: "error",
        message: "Polygon3.vertices must be an array.",
        path: `${path}/vertices`,
      }),
    );
    return createValidationResult(issues);
  }

  if (polygon.vertices.length < 3) {
    issues.push(
      createValidationIssue({
        code: "GEOMETRY_POLYGON3_TOO_FEW_VERTICES",
        severity: "error",
        message: "Polygon3 must contain at least three ordered vertices.",
        path: `${path}/vertices`,
      }),
    );
  }

  polygon.vertices.forEach((vertex, index) => {
    issues.push(...validatePoint3(vertex, `${path}/vertices/${index}`));
  });

  return createValidationResult(issues);
}
