import type { ModuleDefinition } from "./contract";
import { createInitialModuleData, type ModuleDataRecord } from "./contract";
import { PROJECT_MODULE_KEYS, type ProjectModuleKey } from "../project/schema";

const MODULE_DEFINITIONS: readonly ModuleDefinition[] = [
  {
    moduleId: "road",
    moduleType: "road",
    displayName: "道路",
    moduleVersion: "1.0.0",
    dataVersion: "1.0.0",
    dependencies: ["terrain"],
    defaultStatus: "notStarted",
  },
  {
    moduleId: "terrain",
    moduleType: "terrain",
    displayName: "地形・現況",
    moduleVersion: "0.1.0",
    dataVersion: "1.0.0",
    dependencies: [],
    defaultStatus: "notStarted",
  },
  {
    moduleId: "bridgeLayout",
    moduleType: "bridgeLayout",
    displayName: "橋梁配置",
    moduleVersion: "0.1.0",
    dataVersion: "1.0.0",
    dependencies: ["road", "terrain"],
    defaultStatus: "notStarted",
  },
  {
    moduleId: "substructure",
    moduleType: "substructure",
    displayName: "下部工",
    moduleVersion: "0.1.0",
    dataVersion: "1.0.0",
    dependencies: ["bridgeLayout"],
    defaultStatus: "notStarted",
  },
  {
    moduleId: "superstructure",
    moduleType: "superstructure",
    displayName: "上部工",
    moduleVersion: "0.1.0",
    dataVersion: "1.0.0",
    dependencies: ["bridgeLayout"],
    defaultStatus: "notStarted",
  },
  {
    moduleId: "analysis",
    moduleType: "analysis",
    displayName: "FEM / 構造解析",
    moduleVersion: "0.1.0",
    dataVersion: "1.0.0",
    dependencies: ["substructure", "superstructure"],
    defaultStatus: "notStarted",
  },
  {
    moduleId: "cim",
    moduleType: "cim",
    displayName: "CIM / 統合3D",
    moduleVersion: "0.1.0",
    dataVersion: "1.0.0",
    dependencies: ["road", "bridgeLayout", "substructure", "superstructure"],
    defaultStatus: "notStarted",
  },
  {
    moduleId: "deliverables",
    moduleType: "deliverables",
    displayName: "成果品",
    moduleVersion: "0.1.0",
    dataVersion: "1.0.0",
    dependencies: ["road", "analysis", "cim"],
    defaultStatus: "notStarted",
  },
];

const REGISTRY = new Map<ProjectModuleKey, ModuleDefinition>(
  MODULE_DEFINITIONS.map((definition) => [definition.moduleId, definition]),
);

export function getModuleDefinitions(): readonly ModuleDefinition[] {
  return MODULE_DEFINITIONS;
}

export function getModuleDefinition(moduleId: ProjectModuleKey): ModuleDefinition | undefined {
  return REGISTRY.get(moduleId);
}

export function getModuleIds(): readonly ProjectModuleKey[] {
  return PROJECT_MODULE_KEYS;
}

export function hasModuleDefinition(moduleId: ProjectModuleKey): boolean {
  return REGISTRY.has(moduleId);
}

export function createInitialModules(): Record<ProjectModuleKey, ModuleDataRecord> {
  return Object.fromEntries(
    PROJECT_MODULE_KEYS.map((key) => [key, createInitialModuleData()]),
  ) as Record<ProjectModuleKey, ModuleDataRecord>;
}
