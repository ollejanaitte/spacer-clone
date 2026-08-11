import type { ModuleDataRecord, ModuleState, ModuleStatus } from "./contract";

export interface UpdateModuleStateInput {
  readonly status?: ModuleStatus;
  readonly dirty?: boolean;
}

export function updateModuleState(
  record: ModuleDataRecord,
  input: UpdateModuleStateInput,
  now: string = new Date().toISOString(),
): ModuleDataRecord {
  const touchModified = input.dirty === true || input.status !== undefined;
  const nextState: ModuleState = {
    ...record.state,
    ...(input.status !== undefined ? { status: input.status } : {}),
    ...(input.dirty !== undefined ? { dirty: input.dirty } : {}),
    ...(touchModified ? { lastModified: now } : {}),
  };
  return {
    ...record,
    state: nextState,
  };
}

export function markModuleDirty(record: ModuleDataRecord, now: string = new Date().toISOString()): ModuleDataRecord {
  return updateModuleState(record, { dirty: true, status: "working" }, now);
}

export function markModuleValidated(
  record: ModuleDataRecord,
  status: ModuleStatus,
  issues: readonly { path: string; message: string }[],
  now: string = new Date().toISOString(),
): ModuleDataRecord {
  const hasErrors = issues.length > 0;
  const resolvedStatus: ModuleStatus = hasErrors ? "invalid" : status;
  return {
    ...record,
    state: {
      ...record.state,
      status: resolvedStatus,
      dirty: false,
      lastModified: record.state.lastModified,
      lastValidated: now,
      validationErrors: issues,
    },
    validation: {
      status: resolvedStatus,
      issues,
      lastValidated: now,
    },
  };
}

export function markModuleCompleted(record: ModuleDataRecord, now: string = new Date().toISOString()): ModuleDataRecord {
  return updateModuleState(record, { status: "completed", dirty: false }, now);
}

export function resetModuleState(record: ModuleDataRecord): ModuleDataRecord {
  return {
    ...record,
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

export function getModuleStatus(record: ModuleDataRecord): ModuleStatus {
  return record.state.status;
}
