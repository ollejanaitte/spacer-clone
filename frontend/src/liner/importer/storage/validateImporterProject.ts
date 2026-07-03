import Ajv2020 from "ajv/dist/2020.js";
import bridgeSchema from "../schema/bridge.schema.json";
import pointSchema from "../schema/point.schema.json";
import projectSchema from "../schema/project.schema.json";
import renderabilitySchema from "../schema/renderability.schema.json";
import sectionSchema from "../schema/section.schema.json";
import type { ImporterDiagnostic } from "../types";

let cachedValidator: ReturnType<Ajv2020["compile"]> | undefined;

function getValidator(): ReturnType<Ajv2020["compile"]> {
  if (!cachedValidator) {
    const ajv = new Ajv2020({ allErrors: true, strict: false });
    ajv.addSchema(renderabilitySchema);
    ajv.addSchema(pointSchema);
    ajv.addSchema(sectionSchema);
    ajv.addSchema(bridgeSchema);
    cachedValidator = ajv.compile(projectSchema);
  }
  return cachedValidator;
}

export function validateImporterProjectSchema(data: unknown): ImporterDiagnostic[] {
  const validator = getValidator();
  const valid = validator(data);
  if (valid) {
    return [];
  }

  return (validator.errors ?? []).map((error, index) => ({
    id: `schema-${index}`,
    level: "error" as const,
    code: "IMPORTER_SCHEMA_VALIDATION",
    message: error.message ?? "Importer project schema validation failed.",
    targetPath:
      error.instancePath.length > 0 ? error.instancePath : (error.schemaPath ?? "/"),
  }));
}
