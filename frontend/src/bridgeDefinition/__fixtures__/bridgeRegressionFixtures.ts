import { makeInitialBridgeProject } from "../../bridge/BridgeWizardState";
import type { BridgeProject } from "../../bridge/types";

export type BridgeRegressionFixture = {
  name: string;
  project: BridgeProject;
};

function baseFixture(name: string, id: string, spans: number[]): BridgeProject {
  const project = makeInitialBridgeProject(name, id);
  return {
    ...project,
    spans: spans.map((length, index) => ({ index: index + 1, length, offset: 0 })),
  };
}

export const bridgeRegressionFixtures: BridgeRegressionFixture[] = [
  {
    name: "single-span-simple",
    project: baseFixture("Single Span Simple", "bd-single-span", [30]),
  },
  {
    name: "two-span-continuous",
    project: baseFixture("Two Span Continuous", "bd-two-span", [20, 25]),
  },
  {
    name: "three-span-continuous",
    project: baseFixture("Three Span Continuous", "bd-three-span", [18, 24, 18]),
  },
  {
    name: "curved-radius",
    project: {
      ...baseFixture("Curved Radius", "bd-curved-radius", [22, 22]),
      lines: [
        {
          id: "line-1",
          type: "reference",
          name: "Reference",
          points: [
            [0, 0, 0],
            [11, 1.5, 0],
            [22, 3.0, 0],
          ],
        },
      ],
    },
  },
  {
    name: "asymmetric-supports",
    project: {
      ...baseFixture("Asymmetric Supports", "bd-asym-supports", [16, 28]),
      lines: [
        {
          id: "line-1",
          type: "traffic",
          name: "Traffic A",
          points: [
            [0, 0, 0],
            [22, 0, 0],
          ],
        },
      ],
      loads: [
        {
          id: "load-1",
          type: "distributed",
          name: "Dead load",
          magnitude: 12,
          direction: "-Y",
          line_id: "line-1",
        },
      ],
    },
  },
  {
    name: "multiple-loads",
    project: {
      ...baseFixture("Multiple Loads", "bd-multi-load", [15, 15, 15]),
      lines: [
        {
          id: "line-1",
          type: "traffic",
          name: "Traffic A",
          points: [
            [0, 0, 0],
            [20, 0, 0],
          ],
        },
        {
          id: "line-2",
          type: "load",
          name: "Load Lane",
          points: [
            [0, 1.5, 0],
            [20, 1.5, 0],
          ],
        },
      ],
      loads: [
        {
          id: "load-1",
          type: "distributed",
          name: "Load A",
          magnitude: 8,
          direction: "-Y",
          line_id: "line-1",
        },
        {
          id: "load-2",
          type: "vehicle",
          name: "Load B",
          magnitude: 10,
          direction: "-Z",
          line_id: "line-2",
        },
      ],
    },
  },
];
