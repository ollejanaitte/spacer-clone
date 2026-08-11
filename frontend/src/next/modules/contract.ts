import { PROJECT_MODULE_KEYS, type ProjectModuleKey } from "../project/schema";

export const MODULE_STATUSES = [
  "notStarted",
  "working",
  "invalid",
  "needsUpdate",
  "completed",
] as const;

export type ModuleStatus = (typeof MODULE_STATUSES)[number];

export const MODULE_STATUS_LABELS: Readonly<Record<ModuleStatus, string>> = {
  notStarted: "未着手",
  working: "作業中",
  invalid: "入力エラー",
  needsUpdate: "更新必要",
  completed: "完了",
};

export interface ModuleDefinition {
  readonly moduleId: ProjectModuleKey;
  readonly moduleType: string;
  readonly displayName: string;
  readonly moduleVersion: string;
  readonly dataVersion: string;
  readonly dependencies: readonly ProjectModuleKey[];
  readonly defaultStatus: ModuleStatus;
}

export interface ModuleValidationIssue {
  readonly path: string;
  readonly message: string;
}

export interface ModuleValidationState {
  readonly status: ModuleStatus;
  readonly issues: readonly ModuleValidationIssue[];
  readonly lastValidated: string | null;
}

export interface ModuleState {
  readonly status: ModuleStatus;
  readonly dirty: boolean;
  readonly lastModified: string | null;
  readonly lastValidated: string | null;
  readonly validationErrors: readonly ModuleValidationIssue[];
}

export interface ModuleDataRecord {
  readonly state: ModuleState;
  readonly data: Record<string, unknown>;
  readonly validation: ModuleValidationState;
}

export interface ModuleInput {
  readonly moduleId: ProjectModuleKey;
  readonly data: Record<string, unknown>;
}

export interface ModuleOutput {
  readonly moduleId: ProjectModuleKey;
  readonly data: Record<string, unknown>;
}

export function isModuleStatus(value: unknown): value is ModuleStatus {
  return typeof value === "string" && (MODULE_STATUSES as readonly string[]).includes(value);
}

export function createInitialModuleData(): ModuleDataRecord {
  return {
    state: {
      status: "notStarted",
      dirty: false,
      lastModified: null,
      lastValidated: null,
      validationErrors: [],
    },
    data: {},
    validation: {
      status: "notStarted",
      issues: [],
      lastValidated: null,
    },
  };
}

export function isValidModuleKey(value: unknown): value is ProjectModuleKey {
  return typeof value === "string" && (PROJECT_MODULE_KEYS as readonly string[]).includes(value);
}
