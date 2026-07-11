import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import type { BridgeProject } from "../../bridge/types";
import type { ProjectModel } from "../../types";
import { generateStructuralModel } from "../generator/facade";
import {
  compareLegacyAndBridgeDefinitionModels,
  createLegacyBridgeDefinitionSourceMeta,
  createSemanticParityReportForGeneratedModels,
  generateBridgeDefinitionProjectModelFromBridgeProject,
  SEMANTIC_PARITY_GOLDEN_GENERATED_AT,
  serializeSemanticParityReportForGolden,
} from "../semanticParity/generatedModelParity";
import type { ParityReportEnvelope } from "../semanticParity/types";
import { generateLegacyStructuralModel } from "./regressionHelpers";

const TEST_DIR = dirname(fileURLToPath(import.meta.url));
export const SEMANTIC_PARITY_GOLDEN_DIR = resolve(TEST_DIR, "../__golden__/semantic-parity");

export type RealRouteProjectModels = {
  legacy: ProjectModel;
  bridgeDefinition: ProjectModel;
};

export function cloneProjectModel(model: ProjectModel): ProjectModel {
  return JSON.parse(JSON.stringify(model)) as ProjectModel;
}

export function generateRealRouteProjectModels(
  bridgeProject: BridgeProject,
): RealRouteProjectModels {
  const legacyResult = generateLegacyStructuralModel(bridgeProject);
  const bridgeDefinitionResult = generateStructuralModel(bridgeProject, { legacyResult });
  return {
    legacy: legacyResult.fem as ProjectModel,
    bridgeDefinition: bridgeDefinitionResult.fem as ProjectModel,
  };
}

export function generateExplicitBridgeDefinitionProjectModel(
  bridgeProject: BridgeProject,
): ProjectModel {
  return generateBridgeDefinitionProjectModelFromBridgeProject(bridgeProject, {
    generatedAt: SEMANTIC_PARITY_GOLDEN_GENERATED_AT,
  });
}

export function createRealRouteSemanticParityEnvelope(
  fixtureName: string,
  bridgeProject: BridgeProject,
): ParityReportEnvelope {
  const models = generateRealRouteProjectModels(bridgeProject);
  const sources = createLegacyBridgeDefinitionSourceMeta(fixtureName, bridgeProject);
  return createSemanticParityReportForGeneratedModels(models.legacy, models.bridgeDefinition, {
    leftSource: "legacy",
    rightSource: "bridgeDefinition",
    leftLabel: sources.left.label,
    rightLabel: sources.right.label,
    leftSourceMeta: sources.left,
    rightSourceMeta: sources.right,
    generatedAt: SEMANTIC_PARITY_GOLDEN_GENERATED_AT,
  });
}

export function serializeGoldenSemanticParityEnvelope(
  envelope: ParityReportEnvelope,
): string {
  return serializeSemanticParityReportForGolden(envelope, {
    generatedAt: SEMANTIC_PARITY_GOLDEN_GENERATED_AT,
  });
}

export function readGoldenSemanticParityEnvelope(
  fixtureName: string,
): ParityReportEnvelope {
  const goldenPath = resolve(SEMANTIC_PARITY_GOLDEN_DIR, `${fixtureName}.report.json`);
  return JSON.parse(readFileSync(goldenPath, "utf8")) as ParityReportEnvelope;
}

export function shuffleProjectModelArrays(model: ProjectModel): ProjectModel {
  const shuffled = cloneProjectModel(model);
  shuffled.nodes = [...shuffled.nodes].reverse();
  shuffled.members = [...shuffled.members].reverse();
  shuffled.supports = [...shuffled.supports].reverse();
  shuffled.sections = [...shuffled.sections].reverse();
  shuffled.materials = [...shuffled.materials].reverse();
  shuffled.nodalLoads = [...shuffled.nodalLoads].reverse();
  shuffled.memberLoads = [...shuffled.memberLoads].reverse();
  shuffled.loadCases = [...shuffled.loadCases].reverse();
  return shuffled;
}

export function compareRealRouteModels(
  fixtureName: string,
  bridgeProject: BridgeProject,
) {
  const models = generateRealRouteProjectModels(bridgeProject);
  const sources = createLegacyBridgeDefinitionSourceMeta(fixtureName, bridgeProject);
  return compareLegacyAndBridgeDefinitionModels(models.legacy, models.bridgeDefinition, {
    leftSource: "legacy",
    rightSource: "bridgeDefinition",
    leftLabel: sources.left.label,
    rightLabel: sources.right.label,
    leftSourceMeta: sources.left,
    rightSourceMeta: sources.right,
  });
}
