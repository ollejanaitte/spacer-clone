import type { ModuleDataRecord, ModuleValidationIssue } from "./contract";
import { markModuleValidated } from "./state";
import type { Project } from "../project/schema";
import { parseProject } from "../project/projectDataCore";

export type ModuleValidator = (data: Record<string, unknown>) => readonly ModuleValidationIssue[];

const DEFAULT_VALIDATORS = new Map<string, ModuleValidator>();

export function registerModuleValidator(moduleId: string, validator: ModuleValidator): void {
  DEFAULT_VALIDATORS.set(moduleId, validator);
}

export function getModuleValidator(moduleId: string): ModuleValidator | undefined {
  return DEFAULT_VALIDATORS.get(moduleId);
}

export interface ValidateModuleResult {
  readonly ok: boolean;
  readonly moduleData: ModuleDataRecord;
  readonly issues: readonly ModuleValidationIssue[];
}

export function validateModuleData(
  moduleId: string,
  record: ModuleDataRecord,
  validator?: ModuleValidator,
  now: string = new Date().toISOString(),
): ValidateModuleResult {
  const activeValidator = validator ?? DEFAULT_VALIDATORS.get(moduleId);
  const issues = activeValidator ? activeValidator(record.data) : [];
  const status = issues.length > 0 ? "invalid" : "completed";
  const validated = markModuleValidated(record, status, issues, now);
  return { ok: issues.length === 0, moduleData: validated, issues };
}

export interface ValidateProjectResult {
  readonly ok: boolean;
  readonly project: Project;
  readonly issues: readonly ModuleValidationIssue[];
}

export function validateProjectBeforeSave(project: Project): ValidateProjectResult {
  const parsed = parseProject(project);
  const issues: ModuleValidationIssue[] = [];
  if (!parsed.ok) {
    issues.push({
      path: "(project)",
      message: `project-schema-invalid: ${parsed.issues.join("; ")}`,
    });
    return { ok: false, project, issues };
  }
  return { ok: true, project: parsed.project, issues };
}
