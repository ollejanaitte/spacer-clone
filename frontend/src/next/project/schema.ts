import { z } from "zod";

export const PROJECT_SCHEMA_VERSION = "1.0.0";

export const PROJECT_MODULE_KEYS = [
  "road",
  "terrain",
  "bridgeLayout",
  "substructure",
  "superstructure",
  "analysis",
  "cim",
  "deliverables",
] as const;

export type ProjectModuleKey = (typeof PROJECT_MODULE_KEYS)[number];

export type ProjectModule = Record<string, unknown>;

const SEMVER_PATTERN =
  /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-[0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*)?(?:\+[0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*)?$/;

const ISO_8601_UTC_PATTERN = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{1,3})?Z$/;

export const projectModuleSchema = z.record(z.string(), z.unknown());

export const projectSchema = z.strictObject({
  projectId: z.uuid(),
  name: z.string().min(1),
  createdAt: z.string().regex(ISO_8601_UTC_PATTERN),
  updatedAt: z.string().regex(ISO_8601_UTC_PATTERN),
  schemaVersion: z.string().regex(SEMVER_PATTERN),
  metadata: z.record(z.string(), z.unknown()),
  modules: z.strictObject({
    road: projectModuleSchema,
    terrain: projectModuleSchema,
    bridgeLayout: projectModuleSchema,
    substructure: projectModuleSchema,
    superstructure: projectModuleSchema,
    analysis: projectModuleSchema,
    cim: projectModuleSchema,
    deliverables: projectModuleSchema,
  }),
});

export type Project = z.infer<typeof projectSchema>;
