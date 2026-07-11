import type { LinerBridge } from "../../liner/importer/types";
import type { ProjectModel } from "../../types";
import { bridgeRegressionFixtures } from "./bridgeRegressionFixtures";

export function cloneProjectModel(model: ProjectModel): ProjectModel {
  return JSON.parse(JSON.stringify(model)) as ProjectModel;
}

export function withShiftedNodeCoordinate(
  model: ProjectModel,
  nodeId: string,
  delta: { x?: number; y?: number; z?: number },
): ProjectModel {
  const next = cloneProjectModel(model);
  const node = next.nodes.find((entry) => entry.id === nodeId);
  if (!node) {
    throw new Error(`Node "${nodeId}" was not found for geometry mutation fixture.`);
  }
  node.x += delta.x ?? 0;
  node.y += delta.y ?? 0;
  node.z += delta.z ?? 0;
  return next;
}

export function withRemovedMember(
  model: ProjectModel,
  memberId: string,
): ProjectModel {
  const next = cloneProjectModel(model);
  next.members = next.members.filter((member) => member.id !== memberId);
  return next;
}

export function withIsolatedNode(
  model: ProjectModel,
  node: ProjectModel["nodes"][number],
): ProjectModel {
  const next = cloneProjectModel(model);
  next.nodes.push(node);
  return next;
}

export function withSupportFixityChange(
  model: ProjectModel,
  supportNodeId: string,
  fixity: Partial<ProjectModel["supports"][number]>,
): ProjectModel {
  const next = cloneProjectModel(model);
  const support = next.supports.find((entry) => entry.nodeId === supportNodeId);
  if (!support) {
    throw new Error(`Support at node "${supportNodeId}" was not found for support mutation fixture.`);
  }
  Object.assign(support, fixity);
  return next;
}

export function withSectionPropertyChange(
  model: ProjectModel,
  sectionId: string,
  properties: Partial<ProjectModel["sections"][number]>,
): ProjectModel {
  const next = cloneProjectModel(model);
  const section = next.sections.find((entry) => entry.id === sectionId);
  if (!section) {
    throw new Error(`Section "${sectionId}" was not found for property mutation fixture.`);
  }
  Object.assign(section, properties);
  return next;
}

export const semanticParityGoldenFixtureName = bridgeRegressionFixtures[0].name;

export function createMinimalLinerBridgeForStructureParity(): LinerBridge {
  return {
    id: "liner-semantic-parity-minimal",
    name: "LINER Semantic Parity Minimal",
    girderLineSets: [
      {
        id: "gls-1",
        name: "Main set",
        referenceMode: "centerline-offset",
        appliesToSpanIds: ["span-1"],
        lines: [
          {
            id: "girder-g1",
            label: "G1",
            role: "girder",
            displayOrder: 0,
            nominalOffset: -5,
          },
          {
            id: "girder-g2",
            label: "G2",
            role: "center",
            displayOrder: 1,
            nominalOffset: 0,
          },
        ],
      },
    ],
    spans: [
      {
        id: "span-1",
        name: "Span 1",
        startStation: 0,
        endStation: 30,
      },
    ],
    sections: [],
    substructure: {
      supports: [
        {
          id: "support-start",
          kind: "abutment",
          station: 0,
          label: "Abutment A",
        },
        {
          id: "support-end",
          kind: "abutment",
          station: 30,
        },
      ],
      crossBeams: [],
      widthChangePoints: [
        {
          id: "wp-1",
          station: 0,
          leftOffset: 6,
          rightOffset: 6,
        },
      ],
    },
    alignmentMetadata: {
      plan: {
        elements: [
          {
            type: "straight",
            id: "plan-1",
            start: { x: 0, y: 0 },
            azimuth: 0,
            length: 30,
          },
        ],
      },
    },
    bridgeType: "continuous",
  };
}
