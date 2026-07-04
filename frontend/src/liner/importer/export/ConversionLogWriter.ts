import type { ImporterConversionLog } from "../types";

export function serializeConversionLog(log: ImporterConversionLog): string {
  return JSON.stringify(log, null, 2);
}

export function conversionLogFileName(projectId: string): string {
  return `${projectId}.conversion.log.json`;
}

export function writeConversionLogToStorage(
  projectId: string,
  log: ImporterConversionLog,
): void {
  const key = `importer-conversion-log:${projectId}:${log.id}`;
  localStorage.setItem(key, serializeConversionLog(log));
  localStorage.setItem(`importer-conversion-log-latest:${projectId}`, log.id);
}

export function readConversionLogFromStorage(
  projectId: string,
  logId?: string,
): ImporterConversionLog | null {
  const resolvedId =
    logId ?? localStorage.getItem(`importer-conversion-log-latest:${projectId}`);
  if (!resolvedId) {
    return null;
  }
  const raw = localStorage.getItem(`importer-conversion-log:${projectId}:${resolvedId}`);
  if (!raw) {
    return null;
  }
  try {
    return JSON.parse(raw) as ImporterConversionLog;
  } catch {
    return null;
  }
}

export class ConversionLogWriter {
  write(projectId: string, log: ImporterConversionLog): string {
    writeConversionLogToStorage(projectId, log);
    return serializeConversionLog(log);
  }

  readLatest(projectId: string): ImporterConversionLog | null {
    return readConversionLogFromStorage(projectId);
  }
}

export const defaultConversionLogWriter = new ConversionLogWriter();

export function clearConversionLogsForTests(): void {
  const keys: string[] = [];
  for (let index = 0; index < localStorage.length; index += 1) {
    const key = localStorage.key(index);
    if (key?.startsWith("importer-conversion-log")) {
      keys.push(key);
    }
  }
  for (const key of keys) {
    localStorage.removeItem(key);
  }
}
