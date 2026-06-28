// @vitest-environment jsdom

import { act } from "react";
import type { ReactNode } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";
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

function setChecked(input: HTMLInputElement, checked: boolean) {
  const valueSetter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "checked")?.set;
  valueSetter?.call(input, checked);
  input.dispatchEvent(new Event("click", { bubbles: true }));
  input.dispatchEvent(new Event("change", { bubbles: true }));
}

function createProjectWithTimeHistory(): ProjectModel {
  return {
    schemaVersion: 1,
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
    schemaVersion: 1,
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

function createProjectWithGroundMotion(): ProjectModel {
  return {
    ...createProjectWithTimeHistory(),
    groundMotions: [
      {
        id: "gm-001",
        name: "H24 waveform",
        direction: "X",
        unit: "gal",
        timeStep: 0.01,
        duration: 1.0,
        samples: [0, 10, 20, 30, 40],
      },
    ],
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

describe("SectionGroundMotion direction assignment", () => {
  it("enables X direction when checkbox is clicked", () => {
    const project = createProjectWithGroundMotion();
    const onChange = vi.fn();
    render(<SectionGroundMotion project={project} onProjectChange={onChange} />);
    const checkbox = document.querySelector('[aria-label="X Enable"]') as HTMLInputElement;
    expect(checkbox).not.toBeNull();
    expect(checkbox.checked).toBe(true);
    act(() => {
      setChecked(checkbox, false);
    });
    expect(onChange).toHaveBeenCalledTimes(1);
    const updatedProject = onChange.mock.calls[0][0] as ProjectModel;
    const settings = updatedProject.analysisSettings.timeHistory as Record<string, unknown>;
    const groundMotions = settings?.groundMotions as Record<string, { enabled: boolean; groundMotionId: string | null }>;
    expect(groundMotions?.x?.enabled).toBe(false);
  });

  it("enables Y direction when checkbox is clicked", () => {
    const project = createProjectWithGroundMotion();
    const onChange = vi.fn();
    render(<SectionGroundMotion project={project} onProjectChange={onChange} />);
    const checkbox = document.querySelector('[aria-label="Y Enable"]') as HTMLInputElement;
    expect(checkbox).not.toBeNull();
    expect(checkbox.checked).toBe(false);
    act(() => {
      setChecked(checkbox, true);
    });
    expect(onChange).toHaveBeenCalledTimes(1);
    const updatedProject = onChange.mock.calls[0][0] as ProjectModel;
    const settings = updatedProject.analysisSettings.timeHistory as Record<string, unknown>;
    const groundMotions = settings?.groundMotions as Record<string, { enabled: boolean; groundMotionId: string | null }>;
    expect(groundMotions?.y?.enabled).toBe(true);
  });

  it("creates V2 settings when timeHistory is undefined", () => {
    const project = createProjectWithoutTimeHistory();
    const onChange = vi.fn();
    render(<SectionGroundMotion project={project} onProjectChange={onChange} />);
    const checkbox = document.querySelector('[aria-label="X Enable"]') as HTMLInputElement;
    expect(checkbox).not.toBeNull();
    act(() => {
      setChecked(checkbox, true);
    });
    expect(onChange).toHaveBeenCalledTimes(1);
    const updatedProject = onChange.mock.calls[0][0] as ProjectModel;
    const settings = updatedProject.analysisSettings.timeHistory as Record<string, unknown>;
    expect(settings?.schemaVersion).toBe(2);
    expect(settings?.method).toBe("newmark-beta");
    const groundMotions = settings?.groundMotions as Record<string, { enabled: boolean; groundMotionId: string | null }>;
    expect(groundMotions?.x?.enabled).toBe(true);
  });

  it("select is disabled when direction is not enabled", () => {
    const project = createProjectWithGroundMotion();
    render(<SectionGroundMotion project={project} onProjectChange={() => undefined} />);
    const select = document.querySelector('[aria-label="Y Ground Motion"]') as HTMLSelectElement;
    expect(select).not.toBeNull();
    expect(select.disabled).toBe(true);
  });
});
