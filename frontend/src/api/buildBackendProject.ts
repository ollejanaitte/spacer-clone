import type { ProjectModel } from "../types";

function omitUndefinedObjectProperties(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(omitUndefinedObjectProperties);
  }
  if (
    typeof value !== "object" ||
    value === null ||
    Object.getPrototypeOf(value) !== Object.prototype
  ) {
    return value;
  }
  return Object.fromEntries(
    Object.entries(value)
      .filter(([, entry]) => entry !== undefined)
      .map(([key, entry]) => [key, omitUndefinedObjectProperties(entry)]),
  );
}

/**
 * Strip frontend-only settings and match JSON object-property serialization.
 */
export function buildBackendProject(project: ProjectModel): ProjectModel {
  const { responseSpectrum: _responseSpectrum, ...analysisSettings } =
    project.analysisSettings;
  return omitUndefinedObjectProperties({
    ...project,
    analysisSettings,
  }) as ProjectModel;
}
