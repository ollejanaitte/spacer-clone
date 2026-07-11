import type { BridgeProject } from "../../bridge/types";
import type { LinerBridge } from "../../liner/importer/types";
import type { ProjectModel } from "../../types";
import { createBridgeDefinitionFromBridgeProject } from "../adapters/fromBridgeProject";
import { createBridgeDefinitionFromLinerBridge } from "../adapters/fromLinerBridge";
import { createStructuralModelFromBridgeDefinition } from "../generator/structuralModelGenerator";
import { compareSemanticParity } from "./compare";
import {
  createParityReportEnvelope,
  serializeParityReportEnvelopeForGolden,
} from "./serializer";
import type {
  CompareSemanticParityOptions,
  ParityReport,
  ParityReportEnvelope,
  ParityReportSource,
  SerializeParityReportEnvelopeOptions,
} from "./types";

export const SEMANTIC_PARITY_GOLDEN_GENERATED_AT = "2026-07-11T12:00:00.000Z";
export const SEMANTIC_PARITY_TOOL_VERSION = "spacer-clone-semantic-parity-8.4";

export type GeneratedProjectModelSourceMeta = {
  fixtureName?: string;
  bridgeProjectId?: string;
  linerBridgeId?: string;
  loadsMapped?: boolean;
};

export type CompareGeneratedProjectModelsOptions = CompareSemanticParityOptions & {
  leftSourceMeta?: Partial<ParityReportSource>;
  rightSourceMeta?: Partial<ParityReportSource>;
};

export type CreateSemanticParityReportOptions = CompareGeneratedProjectModelsOptions & {
  generatedAt?: string;
  toolVersion?: string;
  schemaVersion?: string;
  serialize?: SerializeParityReportEnvelopeOptions;
};

function buildSource(
  source: ParityReportSource["source"],
  label: string,
  generatorRoute: string,
  metadata: GeneratedProjectModelSourceMeta,
): ParityReportSource {
  const next: ParityReportSource = {
    source,
    label,
    generatorRoute,
  };

  const metaEntries = Object.entries(metadata).filter(([, value]) => value !== undefined);
  if (metaEntries.length > 0) {
    next.metadata = Object.fromEntries(metaEntries) as ParityReportSource["metadata"];
  }

  return next;
}

export function compareGeneratedProjectModels(
  left: ProjectModel,
  right: ProjectModel,
  options: CompareGeneratedProjectModelsOptions = {},
): ParityReport {
  return compareSemanticParity(left, right, options);
}

export function compareLegacyAndBridgeDefinitionModels(
  legacyModel: ProjectModel,
  bridgeDefinitionModel: ProjectModel,
  options: CompareGeneratedProjectModelsOptions = {},
): ParityReport {
  return compareGeneratedProjectModels(legacyModel, bridgeDefinitionModel, {
    ...options,
    leftSource: options.leftSource ?? "legacy",
    rightSource: options.rightSource ?? "bridgeDefinition",
    leftLabel: options.leftLabel ?? options.leftSourceMeta?.label ?? "legacy-generator",
    rightLabel: options.rightLabel ?? options.rightSourceMeta?.label ?? "bridge-definition-generator",
  });
}

export function createSemanticParityReportForGeneratedModels(
  left: ProjectModel,
  right: ProjectModel,
  options: CreateSemanticParityReportOptions = {},
): ParityReportEnvelope {
  const report = compareGeneratedProjectModels(left, right, options);
  const leftMeta = options.leftSourceMeta ?? {};
  const rightMeta = options.rightSourceMeta ?? {};

  return createParityReportEnvelope(report, {
    sources: {
      left: {
        source: options.leftSource ?? "legacy",
        label: options.leftLabel ?? leftMeta.label ?? "left-model",
        ...options.leftSourceMeta,
      },
      right: {
        source: options.rightSource ?? "bridgeDefinition",
        label: options.rightLabel ?? rightMeta.label ?? "right-model",
        ...options.rightSourceMeta,
      },
    },
    generatedAt: options.generatedAt ?? SEMANTIC_PARITY_GOLDEN_GENERATED_AT,
    toolVersion: options.toolVersion ?? SEMANTIC_PARITY_TOOL_VERSION,
    schemaVersion: options.schemaVersion,
  });
}

export function serializeSemanticParityReportForGolden(
  envelope: ParityReportEnvelope,
  options: SerializeParityReportEnvelopeOptions = {},
): string {
  return serializeParityReportEnvelopeForGolden(envelope, {
    pretty: true,
    generatedAt: options.generatedAt ?? SEMANTIC_PARITY_GOLDEN_GENERATED_AT,
    ...options,
  });
}

export function generateBridgeDefinitionProjectModelFromBridgeProject(
  bridgeProject: BridgeProject,
  options?: { generatedAt?: string },
): ProjectModel {
  const bridgeDefinition = createBridgeDefinitionFromBridgeProject(bridgeProject, {
    id: bridgeProject.id,
    name: bridgeProject.name,
    sourceProjectId: bridgeProject.id,
  });
  const result = createStructuralModelFromBridgeDefinition(bridgeDefinition, {
    projectId: bridgeProject.id,
    projectName: bridgeProject.name,
    generatedAt: options?.generatedAt ?? SEMANTIC_PARITY_GOLDEN_GENERATED_AT,
  });
  return result.project;
}

export function generateBridgeDefinitionProjectModelFromLinerBridge(
  linerBridge: LinerBridge,
  options?: { generatedAt?: string },
): ProjectModel {
  const bridgeDefinition = createBridgeDefinitionFromLinerBridge(linerBridge, {
    id: linerBridge.id,
    name: linerBridge.name,
    sourceDocumentId: linerBridge.id,
    generatedAt: options?.generatedAt ?? SEMANTIC_PARITY_GOLDEN_GENERATED_AT,
  });
  const result = createStructuralModelFromBridgeDefinition(bridgeDefinition, {
    projectId: linerBridge.id,
    projectName: linerBridge.name,
    generatedAt: options?.generatedAt ?? SEMANTIC_PARITY_GOLDEN_GENERATED_AT,
  });
  return result.project;
}

export function createLegacyBridgeDefinitionSourceMeta(
  fixtureName: string,
  bridgeProject: BridgeProject,
): { left: ParityReportSource; right: ParityReportSource } {
  return {
    left: buildSource("legacy", `${fixtureName}-legacy`, "bridge-project/legacy-python", {
      fixtureName,
      bridgeProjectId: bridgeProject.id,
      loadsMapped: true,
    }),
    right: buildSource("bridgeDefinition", `${fixtureName}-bridge-definition`, "bridge-project/bridge-definition", {
      fixtureName,
      bridgeProjectId: bridgeProject.id,
      loadsMapped: true,
    }),
  };
}

export function createLinerStructureOnlySourceMeta(
  fixtureName: string,
  linerBridge: LinerBridge,
): ParityReportSource {
  return buildSource("liner", `${fixtureName}-liner-structure`, "liner-bridge/bridge-definition", {
    fixtureName,
    linerBridgeId: linerBridge.id,
    loadsMapped: false,
  });
}
