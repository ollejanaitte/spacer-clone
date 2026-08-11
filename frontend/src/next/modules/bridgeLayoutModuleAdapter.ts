import type { ProjectManager } from "../project/projectManager";
import { readModuleFromManager, writeModuleToManager } from "./adapter";
import type { ModuleDataRecord } from "./contract";
import { BRIDGE_LAYOUT_MODULE_ID, createBridgeLayoutModuleRecord, validateBridgeLayoutData } from "./bridgeLayoutModule";
import type { BridgeLayoutDocument } from "./bridgeLayout/bridgeLayoutTypes";

export type BridgeLayoutModuleAdapterResult =
  | { ok: true; bridgeLayoutDocument: BridgeLayoutDocument | undefined }
  | { ok: false; reason: "project-not-found" | "invalid-bridge-layout-data" };

export function readBridgeLayoutDocument(
  manager: ProjectManager,
  projectId: string,
): BridgeLayoutDocument | undefined {
  const moduleData = readModuleFromManager(manager, projectId, BRIDGE_LAYOUT_MODULE_ID);
  const doc = moduleData?.data?.bridgeLayoutDocument;
  return doc && typeof doc === "object" ? (doc as BridgeLayoutDocument) : undefined;
}

export function writeBridgeLayoutDocument(
  manager: ProjectManager,
  projectId: string,
  document: BridgeLayoutDocument | undefined,
): BridgeLayoutModuleAdapterResult {
  const existing = readModuleFromManager(manager, projectId, BRIDGE_LAYOUT_MODULE_ID);
  if (!existing) {
    return { ok: false, reason: "project-not-found" };
  }
  const base: ModuleDataRecord = existing ?? createBridgeLayoutModuleRecord();
  const nextData: Record<string, unknown> = {
    ...base.data,
    ...(document !== undefined ? { bridgeLayoutDocument: document } : {}),
  };
  const issues = validateBridgeLayoutData(nextData);
  if (issues.length > 0) {
    return { ok: false, reason: "invalid-bridge-layout-data" };
  }
  const nextRecord: ModuleDataRecord = {
    ...base,
    data: nextData,
  };
  const result = writeModuleToManager(manager, projectId, BRIDGE_LAYOUT_MODULE_ID, nextRecord);
  if (!result.ok) {
    return { ok: false, reason: result.reason === "project-not-found" ? "project-not-found" : "invalid-bridge-layout-data" };
  }
  return { ok: true, bridgeLayoutDocument: document };
}

export function hasBridgeLayoutDocument(manager: ProjectManager, projectId: string): boolean {
  return readBridgeLayoutDocument(manager, projectId) !== undefined;
}
