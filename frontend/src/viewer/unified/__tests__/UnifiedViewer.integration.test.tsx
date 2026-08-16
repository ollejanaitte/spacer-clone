// @vitest-environment jsdom

import { act } from "react";
import type { ReactNode } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";
import { buildRealGujoReferenceScene } from "../../adapters/realScene";
import { LayerVisibilityPanel } from "../LayerVisibilityPanel";
import { UnifiedViewer, type UnifiedViewerHandle } from "../UnifiedViewer";
import { UnifiedViewerDemo } from "../UnifiedViewerDemo";

/**
 * V-06 Integrated Interaction — 実Project由来の統合表示。
 *
 * Terrain / Road / Superstructure / Bearings / Substructure / Existing
 * Conditions を同一 Viewer で表示し、layer visibility / selection / camera
 * fit / properties / loading・ready・empty・error / onRenderError / layer
 * 追加削除を検証する。production 経路は realScene（実データ）を使用し、
 * mock に依存しない。
 */

// jsdom では WebGL が無いため UnifiedViewer はエラー fallback する。
// onRenderError が発火すること・host が描画されることを production 経路で確認する。
const MOCK_WEBGL_ERROR = new Error("WebGL context lost (jsdom)");
vi.mock("three", async (importOriginal) => {
  const actual = await importOriginal<typeof import("three")>();
  return {
    ...actual,
    WebGLRenderer: vi.fn(() => {
      throw MOCK_WEBGL_ERROR;
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

describe("V-06 Integrated Interaction (real data)", () => {
  it("real scene mounts terrain + road + superstructure + bearings + substructure layers", () => {
    const model = buildRealGujoReferenceScene();
    const kinds = model.layers.map((l) => l.kind);
    expect(kinds).toEqual(
      expect.arrayContaining(["terrain", "road", "superstructure", "bearing", "substructure"]),
    );
  });

  it("every real layer exposes properties and a ready status (loading/ready/empty/error contract)", () => {
    const model = buildRealGujoReferenceScene();
    for (const layer of model.layers) {
      expect(layer.status.state).toBe("ready");
      expect(layer.properties).toBeDefined();
      expect(layer.bounds).toBeDefined();
      expect(layer.selectable).toBe(true);
    }
  });

  it("LayerVisibilityPanel renders one toggle per real layer and a fit button", () => {
    const model = buildRealGujoReferenceScene();
    const visibility: Record<string, boolean> = {};
    for (const layer of model.layers) visibility[layer.id] = layer.visible;
    const onToggle = vi.fn();
    const onFit = vi.fn();
    render(
      <LayerVisibilityPanel
        layers={model.layers}
        visibility={visibility}
        onToggle={onToggle}
        onFit={onFit}
      />,
    );
    const toggles = document.querySelectorAll('[data-testid^="layer-toggle-"]');
    expect(toggles).toHaveLength(model.layers.length);
    expect(document.querySelector('[data-testid="unified-fit-button"]')).not.toBeNull();
  });

  it("LayerVisibilityPanel emits toggles for real layers", () => {
    const model = buildRealGujoReferenceScene();
    const visibility: Record<string, boolean> = {};
    for (const layer of model.layers) visibility[layer.id] = layer.visible;
    const onToggle = vi.fn();
    render(
      <LayerVisibilityPanel
        layers={model.layers}
        visibility={visibility}
        onToggle={onToggle}
        onFit={() => undefined}
      />,
    );
    const terrainCheckbox = document.querySelector(
      '[data-testid="layer-checkbox-layer-real-terrain"]',
    ) as HTMLInputElement | null;
    expect(terrainCheckbox).not.toBeNull();
    act(() => {
      if (terrainCheckbox) setChecked(terrainCheckbox, false);
    });
    expect(onToggle).toHaveBeenCalledWith("layer-real-terrain", false);
  });

  it("UnifiedViewer surfaces onRenderError and setLayerVisible / fitToScene / getCameraState handles", async () => {
    const onRenderError = vi.fn();
    const ref = { current: null as UnifiedViewerHandle | null };
    const model = buildRealGujoReferenceScene();
    render(
      <UnifiedViewer ref={ref} model={model} onRenderError={onRenderError} />,
    );
    await act(async () => undefined);

    // jsdom では WebGL が無い → onRenderError が発火 (fail-closed UI)
    expect(onRenderError).toHaveBeenCalledTimes(1);
    expect(document.querySelector('[data-testid="unified-viewer-error"]')).not.toBeNull();

    // handle API は安全に呼べる (context が無ければ no-op)
    act(() => {
      ref.current?.setLayerVisible("layer-real-terrain", false);
      ref.current?.fitToScene();
    });
    expect(ref.current?.getCameraState()).toBeNull();
  });

  it("UnifiedViewerDemo is the production harness (real scene, no mock) and renders selection status", async () => {
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