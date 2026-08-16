import Ajv2020 from "ajv/dist/2020.js";
import projectSchema from "../../../schemas/project.schema.json";

let cachedValidator: ReturnType<Ajv2020["compile"]> | undefined;

export function getProjectSchemaValidator(): ReturnType<Ajv2020["compile"]> {
  if (!cachedValidator) {
    const ajv = new Ajv2020({ allErrors: true, strict: false });
    cachedValidator = ajv.compile(projectSchema);
  }
  return cachedValidator;
}

export type ProjectSchemaValidationResult = {
  valid: boolean;
  errors: Array<{ path: string; message: string }>;
};

export function validateProjectAgainstSchema(project: unknown): ProjectSchemaValidationResult {
  const validator = getProjectSchemaValidator();
  const valid = validator(project) as boolean;
  return {
    valid,
    errors: valid
      ? []
      : (validator.errors ?? []).map((error) => ({
          path: error.instancePath || "/",
          message: error.message ?? "Project schema validation failed.",
        })),
  };
}
