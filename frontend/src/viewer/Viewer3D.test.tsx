// @vitest-environment jsdom

import { act } from "react";
import type { ReactNode } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createDefaultProject } from "../data/defaultProject";
import type { ProjectModel } from "../types";
import { Fallback2DViewport } from "./Fallback2DViewport";
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
    expect(document.body.textContent).toContain("3D表示の初期化に失敗しました。");
    expect(document.body.textContent).toContain("2D簡易表示に切り替えました。");
    expect(document.body.textContent).toContain("GPU_MODE=compat-gpu-blocklist または compat-angle-gl");
    expect(document.body.textContent).toContain("legacy-desktop-gl は最後の手段です。");
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

describe("Fallback2DViewport", () => {
  it("does not crash for an empty model", () => {
    render(<Fallback2DViewport {...fallbackProps(emptyProject())} />);

    expect(document.querySelector('[data-viewer-mode="fallback2d"]')).not.toBeNull();
    expect(document.body.textContent).toContain("表示できる節点・部材がありません。");
  });

  it("generates drawing elements for nodes and members", () => {
    render(<Fallback2DViewport {...fallbackProps(createDefaultProject())} />);

    expect(document.querySelectorAll('[data-testid="fallback-node"]')).toHaveLength(2);
    expect(document.querySelectorAll('[data-testid="fallback-member"]')).toHaveLength(1);
    expect(document.querySelectorAll('[data-testid="fallback-support"]')).toHaveLength(1);
    expect(document.querySelectorAll('[data-testid="fallback-nodal-load"]')).toHaveLength(1);
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
    activeLoadCase: "LC1",
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
    selectedLoadCaseId: "LC1",
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
