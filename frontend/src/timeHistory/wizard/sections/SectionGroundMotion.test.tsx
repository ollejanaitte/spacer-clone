// @vitest-environment jsdom

import { act } from "react";
import type { ReactNode } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it } from "vitest";
import type { ProjectModel } from "../../../types";
import { SectionGroundMotion } from "./SectionGroundMotion";

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let root: Root | null = null;

afterEach(() => {
  act(() => {
    root?.unmount();
  });
  root = null;
  document.body.innerHTML = "";
});

function render(node: ReactNode) {
  const host = document.createElement("div");
  document.body.appendChild(host);
  root = createRoot(host);
  act(() => {
    root?.render(node);
  });
}

function createProjectWithTimeHistory(): ProjectModel {
  return {
    project: {
      id: "test",
      name: "Test",
      schemaVersion: "1.0.0",
      description: "",
      createdAt: "",
      updatedAt: "",
    },
    units: { length: "m", force: "kN", moment: "kN_m", modulus: "kN_per_m2", area: "m2", inertia: "m4" },
    nodes: [{ id: "N1", x: 0, y: 0, z: 0 }],
    materials: [],
    sections: [],
    members: [],
    supports: [],
    loadCases: [],
    nodalLoads: [],
    memberLoads: [],
    analysisSettings: {
      analysisType: "linear_static",
      includeShearDeformation: false,
      largeDisplacement: false,
      tolerance: 1e-6,
      timeHistory: {
        method: "newmark-beta",
        timeStep: 0.01,
        duration: 1.0,
        beta: 0.25,
        gamma: 0.5,
      },
    },
  };
}

function createProjectWithoutTimeHistory(): ProjectModel {
  return {
    project: {
      id: "test",
      name: "Test",
      schemaVersion: "1.0.0",
      description: "",
      createdAt: "",
      updatedAt: "",
    },
    units: { length: "m", force: "kN", moment: "kN_m", modulus: "kN_per_m2", area: "m2", inertia: "m4" },
    nodes: [{ id: "N1", x: 0, y: 0, z: 0 }],
    materials: [],
    sections: [],
    members: [],
    supports: [],
    loadCases: [],
    nodalLoads: [],
    memberLoads: [],
    analysisSettings: {
      analysisType: "linear_static",
      includeShearDeformation: false,
      largeDisplacement: false,
      tolerance: 1e-6,
    },
  };
}

function createProjectWithEmptyGroundMotions(): ProjectModel {
  return {
    ...createProjectWithTimeHistory(),
    groundMotions: [],
  };
}

describe("SectionGroundMotion crash prevention", () => {
  it("renders without crashing when timeHistory settings exist", () => {
    const project = createProjectWithTimeHistory();
    expect(() => {
      render(<SectionGroundMotion project={project} onProjectChange={() => undefined} />);
    }).not.toThrow();
  });

  it("renders without crashing when timeHistory settings are undefined", () => {
    const project = createProjectWithoutTimeHistory();
    expect(() => {
      render(<SectionGroundMotion project={project} onProjectChange={() => undefined} />);
    }).not.toThrow();
  });

  it("renders without crashing when groundMotions is empty array", () => {
    const project = createProjectWithEmptyGroundMotions();
    expect(() => {
      render(<SectionGroundMotion project={project} onProjectChange={() => undefined} />);
    }).not.toThrow();
  });

  it("renders without crashing when groundMotions is undefined", () => {
    const project = createProjectWithTimeHistory();
    delete (project as Record<string, unknown>).groundMotions;
    expect(() => {
      render(<SectionGroundMotion project={project} onProjectChange={() => undefined} />);
    }).not.toThrow();
  });
});
