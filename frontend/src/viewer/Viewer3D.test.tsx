// @vitest-environment jsdom

import { act } from "react";
import type { ReactNode } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createDefaultProject } from "../data/defaultProject";
import type { ProjectModel } from "../types";
import { Fallback2DViewport } from "./Fallback2DViewport";
import { ja } from "../i18n/ja";
import { Viewer3D, webglFallbackMessage } from "./Viewer3D";
import type { ThreeViewportProps } from "./types";

vi.mock("three", async (importOriginal) => {
  const actual = await importOriginal<typeof import("three")>();
  return {
    ...actual,
    WebGLRenderer: vi.fn(() => {
      throw new Error("mock WebGLRenderer failure");
    }),
  };
});

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let root: Root | null = null;

afterEach(() => {
  act(() => {
    root?.unmount();
  });
  root = null;
  document.body.innerHTML = "";
  delete (window as Window & { spacerDesktop?: unknown }).spacerDesktop;
  delete (window as Window & { desktop?: unknown }).desktop;
});

describe("Viewer3D WebGL fallback", () => {
  it("switches to the 2D fallback and shows the failure message when WebGLRenderer creation fails", async () => {
    const onViewerError = vi.fn();
    render(
      <Viewer3D
        project={createDefaultProject()}
        result={null}
        selectedSection="nodes"
        selection={null}
        activeLoadCase="LC1"
        onSelectionChange={() => undefined}
        onActiveLoadCaseChange={() => undefined}
        onViewerError={onViewerError}
      />,
    );

    await act(async () => undefined);

    expect(document.querySelector('[data-viewer-mode="fallback2d"]')).not.toBeNull();
    expect(document.body.textContent).toContain(ja.viewer.messages.webglInitFailed);
    expect(document.body.textContent).toContain(ja.viewer.messages.fallback2DSwitched);
    expect(document.body.textContent).toMatch(/GPU_MODE=compat-gpu-blocklist\s*または\s*compat-angle-gl/);
    expect(document.body.textContent).toContain(ja.viewer.messages.electronGpuLastResort);
    expect(onViewerError).toHaveBeenCalledWith(expect.stringContaining(webglFallbackMessage));
  });

  it("does not crash in a normal browser environment without window.desktop", async () => {
    render(
      <Viewer3D
        project={createDefaultProject()}
        result={null}
        selectedSection="nodes"
        selection={null}
        activeLoadCase="LC1"
        onSelectionChange={() => undefined}
        onActiveLoadCaseChange={() => undefined}
      />,
    );

    await act(async () => undefined);

    expect(document.body.textContent).toContain("GPU: browser");
    expect(document.querySelector('[data-viewer-mode="fallback2d"]')).not.toBeNull();
  });
});

﻿describe("Viewer3D time history override", () => {
  it("accepts a time history override without throwing", async () => {
    const override = new Map<string, { x: number; y: number; z: number }>([
      ["N1", { x: 0.1, y: 0, z: 0 }],
    ]);
    const onViewerError = vi.fn();
    render(
      <Viewer3D
        project={createDefaultProject()}
        result={null}
        selectedSection="nodes"
        selection={null}
        activeLoadCase="LC1"
        onSelectionChange={() => undefined}
        onActiveLoadCaseChange={() => undefined}
        onViewerError={onViewerError}
        timeHistoryNodeOverride={override}
      />,
    );

    await act(async () => undefined);

    // The viewer should fall back to 2D because WebGL is mocked to fail.
    // The important property is that passing the override does not
    // throw and the viewer continues to render the fallback.
    expect(document.querySelector("[data-viewer-mode='fallback2d']")).not.toBeNull();
  });

  it("accepts a null override", async () => {
    const onViewerError = vi.fn();
    render(
      <Viewer3D
        project={createDefaultProject()}
        result={null}
        selectedSection="nodes"
        selection={null}
        activeLoadCase="LC1"
        onSelectionChange={() => undefined}
        onActiveLoadCaseChange={() => undefined}
        onViewerError={onViewerError}
        timeHistoryNodeOverride={null}
      />,
    );

    await act(async () => undefined);

    expect(document.querySelector("[data-viewer-mode='fallback2d']")).not.toBeNull();
  });
});

describe("Fallback2DViewport", () => {
  it("does not crash for an empty model", () => {
    render(<Fallback2DViewport {...fallbackProps(emptyProject())} />);

    expect(document.querySelector('[data-viewer-mode="fallback2d"]')).not.toBeNull();
    expect(document.body.textContent).toContain(ja.viewer.messages.emptyNodesMembers);
  });

  it("generates drawing elements for nodes and members", () => {
    render(<Fallback2DViewport {...fallbackProps(createDefaultProject())} />);

    // default createDefaultProject now ships the 5-span Plan A continuous deck
    expect(document.querySelectorAll('[data-testid="fallback-node"]')).toHaveLength(10);
    expect(document.querySelectorAll('[data-testid="fallback-member"]')).toHaveLength(9);
    expect(document.querySelectorAll('[data-testid="fallback-support"]')).toHaveLength(6);
    expect(document.querySelectorAll('[data-testid="fallback-nodal-load"]')).toHaveLength(6);
  });
});

function render(node: ReactNode) {
  const host = document.createElement("div");
  document.body.appendChild(host);
  root = createRoot(host);
  act(() => {
    root?.render(node);
  });
}

function fallbackProps(project: ProjectModel): ThreeViewportProps {
  return {
    project,
    result: null,
    selectedSection: "nodes",
    selection: null,
    activeLoadCase: "LC_DEAD",
    onSelectionChange: () => undefined,
    onActiveLoadCaseChange: () => undefined,
    visibility: {
      nodes: true,
      members: true,
      supports: true,
      loads: true,
      labels: true,
      nodeLabels: true,
      memberLabels: true,
      grid: true,
      axes: true,
      deformedShape: false,
      reactions: false,
      axialForce: false,
      momentMy: false,
      momentMz: false,
    },
    scales: {
      loadScale: 1,
      deformationScale: 1,
      modeScale: 1,
      resultScale: 1,
      nodeSize: 1,
      labelSize: 1,
    },
    selectedLoadCaseId: "LC_DEAD",
    fitRequest: 1,
    cameraRequest: null,
    onInitializationError: () => undefined,
  };
}

function emptyProject(): ProjectModel {
  return {
    ...createDefaultProject(),
    nodes: [],
    members: [],
    supports: [],
    nodalLoads: [],
    memberLoads: [],
  };
}
