// @vitest-environment jsdom

import { act } from "react";
import type { ReactNode } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createMockUnifiedScene } from "../../layers/mock/mockScene";
import { LayerVisibilityPanel } from "../LayerVisibilityPanel";
import { UnifiedViewer } from "../UnifiedViewer";
import { UnifiedViewerDemo } from "../UnifiedViewerDemo";

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
});

describe("UnifiedViewer (Wave 1 skeleton)", () => {
  it("falls back to an error message when WebGL is unavailable", async () => {
    const onRenderError = vi.fn();
    render(<UnifiedViewer model={createMockUnifiedScene()} onRenderError={onRenderError} />);
    await act(async () => undefined);
    expect(document.querySelector('[data-testid="unified-viewer-error"]')).not.toBeNull();
    expect(onRenderError).toHaveBeenCalledWith(expect.stringMatching(/WebGL|mock/i));
  });

  it("renders the viewer host without crashing", async () => {
    render(<UnifiedViewer model={createMockUnifiedScene()} />);
    await act(async () => undefined);
    expect(document.querySelector('[data-testid="unified-viewer"]')).not.toBeNull();
  });

  it("LayerVisibilityPanel renders one toggle per layer and a fit button", () => {
    const scene = createMockUnifiedScene();
    const visibility: Record<string, boolean> = {};
    for (const layer of scene.layers) visibility[layer.id] = layer.visible;
    const onToggle = vi.fn();
    const onFit = vi.fn();
    render(
      <LayerVisibilityPanel
        layers={scene.layers}
        visibility={visibility}
        onToggle={onToggle}
        onFit={onFit}
      />,
    );
    expect(document.querySelectorAll('[data-testid^="layer-toggle-"]')).toHaveLength(6);
    expect(document.querySelector('[data-testid="unified-fit-button"]')).not.toBeNull();
  });

  it("LayerVisibilityPanel emits toggles with the layer id and next visibility", () => {
    const scene = createMockUnifiedScene();
    const visibility: Record<string, boolean> = {};
    for (const layer of scene.layers) visibility[layer.id] = layer.visible;
    const onToggle = vi.fn();
    render(
      <LayerVisibilityPanel
        layers={scene.layers}
        visibility={visibility}
        onToggle={onToggle}
        onFit={() => undefined}
      />,
    );
    const terrainCheckbox = document.querySelector(
      '[data-testid="layer-checkbox-layer-terrain"]',
    ) as HTMLInputElement | null;
    expect(terrainCheckbox).not.toBeNull();
    act(() => {
      if (terrainCheckbox) {
        setChecked(terrainCheckbox, false);
      }
    });
    expect(onToggle).toHaveBeenCalledWith("layer-terrain", false);
  });

  it("UnifiedViewerDemo renders the mock scene host and panel", async () => {
    render(<UnifiedViewerDemo />);
    await act(async () => undefined);
    expect(document.querySelector('[data-testid="unified-viewer-demo"]')).not.toBeNull();
    expect(document.querySelector('[data-testid="unified-layer-panel"]')).not.toBeNull();
    expect(document.querySelector('[data-testid="unified-viewer-selection"]')).not.toBeNull();
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

function setChecked(input: HTMLInputElement, checked: boolean) {
  const valueSetter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "checked")?.set;
  valueSetter?.call(input, checked);
  input.dispatchEvent(new Event("click", { bubbles: true }));
  input.dispatchEvent(new Event("change", { bubbles: true }));
}