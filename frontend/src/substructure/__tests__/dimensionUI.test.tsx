// @vitest-environment jsdom
// Phase C1 (M2-06) 寸法表示レイヤ・コンポーネントテスト
import { act } from "react";
import { createRoot } from "react-dom/client";
import { describe, it, expect, vi } from "vitest";
import { Dimension2DLayer } from "../planning/dimensions/Dimension2DLayer";
import { buildDimensions } from "../planning/dimensions/dimensionModel";
import { SubstructureToolbar } from "../planning/SubstructureToolbar";
import type { SolidGroup } from "../geometryBase";

function group(supportId: string): SolidGroup {
  return {
    supportId,
    solids: [
      {
        id: `${supportId}-FOOTING`,
        kind: "box",
        localCenter: { x: 0, y: 0, z: -0.75 },
        localSize: { x: 12, y: 8, z: 1.5 },
        entity: "footing",
        material: "m",
      },
    ],
    transform: {
      origin: { x: 0, y: 0, z: 0 },
      xAxis: { x: 1, y: 0, z: 0 },
      yAxis: { x: 0, y: 1, z: 0 },
      zAxis: { x: 0, y: 0, z: 1 },
      skewRad: 0,
    },
  };
}

function render(ui: React.ReactNode) {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);
  act(() => root.render(ui));
  return { container, root };
}

describe("Dimension2DLayer", () => {
  it("renders dimension lines for all-mode", () => {
    const dims = buildDimensions([group("A1")], "all");
    const { container } = render(
      <Dimension2DLayer dimensions={dims} toSvg={(x, y) => [x, y]} />,
    );
    expect(container.querySelector('[data-testid="dimension-2d-layer"]')).not.toBeNull();
    const lines = container.querySelectorAll('[data-testid^="dim2d-"]');
    expect(lines.length).toBeGreaterThan(0);
  });

  it("renders no lines when off", () => {
    const dims = buildDimensions([group("A1")], "off");
    const { container } = render(
      <Dimension2DLayer dimensions={dims} toSvg={(x, y) => [x, y]} />,
    );
    expect(container.querySelectorAll('[data-testid^="dim2d-"]')).toHaveLength(0);
  });
});

describe("SubstructureToolbar dimension mode", () => {
  it("renders dimension mode select and fires change", () => {
    const onChange = vi.fn();
    const { container } = render(
      <SubstructureToolbar
        title="test"
        viewMode="3d"
        onViewModeChange={() => {}}
        panels={{ left: true, right: true, bottom: true }}
        onTogglePanel={() => {}}
        dimensionMode="off"
        onDimensionModeChange={onChange}
      />,
    );
    const select = container.querySelector<HTMLSelectElement>('[data-testid="dimension-mode"]')!;
    expect(select).not.toBeNull();
    act(() => {
      select.value = "all";
      select.dispatchEvent(new Event("change", { bubbles: true }));
    });
    expect(onChange).toHaveBeenCalledWith("all");
  });
});
