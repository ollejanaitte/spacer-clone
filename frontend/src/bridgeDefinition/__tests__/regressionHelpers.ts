import { execFileSync } from "node:child_process";
import { resolve } from "node:path";
import type { BridgeProject } from "../../bridge/types";
import { generateStructuralModel } from "../generator/facade";

export type RegressionComparison = {
  name: string;
  legacy: unknown;
  bridgeDefinition: ReturnType<typeof generateStructuralModel>;
  diff: RegressionDiff;
};

export type RegressionDiff = {
  counts: Record<string, { legacy: number; bridgeDefinition: number; delta: number }>;
  nodeCoordinateMismatches: Array<{ id: string; axis: string; legacy: number; bridgeDefinition: number; delta: number }>;
  memberConnectionMismatches: Array<{ id: string; legacy: string; bridgeDefinition: string }>;
  supportMismatches: Array<{ id: string; legacy: unknown; bridgeDefinition: unknown }>;
  loadMismatches: Array<{ id: string; legacy: unknown; bridgeDefinition: unknown }>;
};

const PYTHON = process.env.PYTHON ?? "python";

export function generateLegacyStructuralModel(project: BridgeProject): any {
  const script = `
import json
from backend.engine.bridge_model import parse_bridge_project
from backend.engine.bridge_fem_generator import generate_fem_model
project = json.loads(r'''${JSON.stringify(project)}''')
model = parse_bridge_project(project)
result = generate_fem_model(model)
print(json.dumps({"summary": result.summary, "fem": result.project}, ensure_ascii=False))
`;
  const output = execFileSync(PYTHON, ["-c", script], { encoding: "utf8", cwd: resolve(process.cwd(), "..") });
  return JSON.parse(output.trim());
}

function normalizeZero(value: number): number {
  return Object.is(value, -0) ? 0 : value;
}

export function compareStructuralModels(legacy: any, bridgeDefinition: ReturnType<typeof generateStructuralModel>, tolerance = 1e-6): RegressionDiff {
  const diff: RegressionDiff = {
    counts: {
      nodeCount: {
        legacy: legacy.summary.nodeCount,
        bridgeDefinition: bridgeDefinition.summary.nodeCount,
        delta: bridgeDefinition.summary.nodeCount - legacy.summary.nodeCount,
      },
      memberCount: {
        legacy: legacy.summary.memberCount,
        bridgeDefinition: bridgeDefinition.summary.memberCount,
        delta: bridgeDefinition.summary.memberCount - legacy.summary.memberCount,
      },
      supportCount: {
        legacy: legacy.summary.supportCount,
        bridgeDefinition: bridgeDefinition.summary.supportCount,
        delta: bridgeDefinition.summary.supportCount - legacy.summary.supportCount,
      },
      loadCount: {
        legacy: legacy.summary.loadCount,
        bridgeDefinition: bridgeDefinition.summary.loadCount,
        delta: bridgeDefinition.summary.loadCount - legacy.summary.loadCount,
      },
    },
    nodeCoordinateMismatches: [],
    memberConnectionMismatches: [],
    supportMismatches: [],
    loadMismatches: [],
  };

  const legacyNodes = new Map<string, any>((legacy.fem.nodes ?? []).map((node: any) => [node.id, node]));
  for (const node of bridgeDefinition.fem.nodes) {
    const other = legacyNodes.get(node.id);
    if (!other) continue;
    for (const axis of ["x", "y", "z"] as const) {
      if (Math.abs(other[axis] - node[axis]) > tolerance) {
        diff.nodeCoordinateMismatches.push({ id: node.id, axis, legacy: normalizeZero(other[axis]), bridgeDefinition: normalizeZero(node[axis]), delta: normalizeZero(node[axis] - other[axis]) });
      }
    }
  }

  const legacyMembers = new Map<string, any>((legacy.fem.members ?? []).map((member: any) => [member.id, member]));
  for (const member of bridgeDefinition.fem.members) {
    const other = legacyMembers.get(member.id);
    if (!other) continue;
    if (other.nodeI !== member.nodeI || other.nodeJ !== member.nodeJ) {
      diff.memberConnectionMismatches.push({ id: member.id, legacy: `${other.nodeI}->${other.nodeJ}`, bridgeDefinition: `${member.nodeI}->${member.nodeJ}` });
    }
  }

  const legacySupports = new Map<string, any>((legacy.fem.supports ?? []).map((support: any) => [support.nodeId, support]));
  for (const support of bridgeDefinition.fem.supports) {
    const other = legacySupports.get(support.nodeId);
    if (!other) continue;
    diff.supportMismatches.push({ id: support.nodeId, legacy: other, bridgeDefinition: support });
  }

  const legacyLoads = new Map<string, any>([
    ...(legacy.fem.nodalLoads ?? []).map((load: any) => [load.id, load]),
    ...(legacy.fem.memberLoads ?? []).map((load: any) => [load.id, load]),
  ]);
  for (const load of [...(bridgeDefinition.fem.nodalLoads ?? []), ...(bridgeDefinition.fem.memberLoads ?? [])]) {
    const other = legacyLoads.get(load.id);
    if (!other) continue;
    diff.loadMismatches.push({ id: load.id, legacy: other, bridgeDefinition: load });
  }

  return diff;
}
