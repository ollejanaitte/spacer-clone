import type { BridgeProject, BridgeFemResponse } from "../../bridge/types";
import type { LinerBridge } from "../../liner/importer/types";
import type { ProjectModel } from "../../types";
import {
  createBridgeDefinitionFromBridgeProject,
} from "../adapters/fromBridgeProject";
import {
  createBridgeDefinitionFromLinerBridge,
} from "../adapters/fromLinerBridge";
import {
  createStructuralModelFromBridgeDefinition,
  type BridgeDefinitionStructuralModelDiagnostic,
  type StructuralModelGenerationResult,
} from "./structuralModelGenerator";

export type StructuralModelFacadeDiagnostics = {
  diagnostics: BridgeDefinitionStructuralModelDiagnostic[];
};

function compareCounts(
  legacy: BridgeFemResponse | null,
  next: StructuralModelGenerationResult,
): BridgeDefinitionStructuralModelDiagnostic[] {
  if (!legacy) return [];
  const diagnostics: BridgeDefinitionStructuralModelDiagnostic[] = [];
  const counts = {
    nodeCount: legacy.summary.nodeCount,
    memberCount: legacy.summary.memberCount,
    supportCount: legacy.summary.supportCount,
    loadCount: legacy.summary.loadCount,
  };
  const nextCounts = {
    nodeCount: next.project.nodes.length,
    memberCount: next.project.members.length,
    supportCount: next.project.supports.length,
    loadCount: next.project.nodalLoads.length + next.project.memberLoads.length,
  };
  for (const key of Object.keys(counts) as Array<keyof typeof counts>) {
    if (counts[key] !== nextCounts[key]) {
      diagnostics.push({
        severity: "warning",
        code: `BD_SM_COMPARE_${key.toUpperCase()}`,
        message: `${key} differs between legacy and BridgeDefinition paths: legacy=${counts[key]}, bridgeDefinition=${nextCounts[key]}.`,
      });
    }
  }
  return diagnostics;
}

export function generateStructuralModel(
  bridge: BridgeProject,
  options?: { legacyResult?: BridgeFemResponse | null },
): BridgeFemResponse & StructuralModelFacadeDiagnostics {
  const bridgeDefinition = createBridgeDefinitionFromBridgeProject(bridge, {
    id: bridge.id,
    name: bridge.name,
    sourceProjectId: bridge.id,
  });
  const next = createStructuralModelFromBridgeDefinition(bridgeDefinition, {
    projectId: bridge.id,
    projectName: bridge.name,
    generatedAt: bridge.createdAt ?? new Date().toISOString(),
  });
  const diagnostics = [...next.diagnostics];
  diagnostics.push(...compareCounts(options?.legacyResult ?? null, next));
  return {
    summary: {
      source_bridge_id: bridge.id,
      generatedAt: bridge.updatedAt ?? new Date().toISOString(),
      xCount: next.project.nodes.length,
      yCount: next.project.supports.length,
      nodeCount: next.project.nodes.length,
      memberCount: next.project.members.length,
      supportCount: next.project.supports.length,
      loadCount: next.project.nodalLoads.length + next.project.memberLoads.length,
      summary: {
        totalLength: bridge.spans.reduce((sum, span) => sum + span.length, 0),
        girderPositions: [],
        supports: [],
      },
    } as BridgeFemResponse["summary"],
    fem: next.project as ProjectModel,
    analysis: options?.legacyResult?.analysis ?? null,
    diagnostics,
  };
}

export async function generateStructuralModelFromLinerBridge(
  bridge: LinerBridge,
): Promise<StructuralModelGenerationResult> {
  const bridgeDefinition = createBridgeDefinitionFromLinerBridge(bridge, {
    id: bridge.id,
    name: bridge.name,
    sourceDocumentId: bridge.id,
  });
  return createStructuralModelFromBridgeDefinition(bridgeDefinition, {
    projectId: bridge.id,
    projectName: bridge.name,
    generatedAt: new Date().toISOString(),
  });
}
