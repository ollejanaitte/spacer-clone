import type { ModuleDataRecord } from "./contract";
import { createInitialModuleData } from "./contract";

export const DUMMY_MODULE_ID = "road" as const;

export interface DummyModuleData {
  readonly length: number;
  readonly label: string;
}

export function createDummyData(): DummyModuleData {
  return { length: 0, label: "" };
}

export function isDummyData(value: unknown): value is DummyModuleData {
  if (!value || typeof value !== "object") return false;
  const record = value as Record<string, unknown>;
  return typeof record.length === "number" && typeof record.label === "string";
}

export function validateDummyData(data: Record<string, unknown>): readonly { path: string; message: string }[] {
  const issues: { path: string; message: string }[] = [];
  if (typeof data.length !== "number") {
    issues.push({ path: "length", message: "length must be a number" });
  } else if (data.length < 0) {
    issues.push({ path: "length", message: "length must be >= 0" });
  }
  if (typeof data.label !== "string") {
    issues.push({ path: "label", message: "label must be a string" });
  }
  return issues;
}

export function createDummyModuleRecord(): ModuleDataRecord {
  return {
    ...createInitialModuleData(),
    data: { ...createDummyData() },
  };
}
