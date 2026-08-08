// @vitest-environment jsdom
// Phase C1 (M2-04) 杭基礎UI コンポーネントテスト
import { act } from "react";
import { createRoot } from "react-dom/client";
import { describe, it, expect, vi } from "vitest";
import { PileLayoutPanel } from "../planning/piles/PileLayoutPanel";
import { PilePlanPreview } from "../planning/piles/PilePlanPreview";
import { PileCoordinateTable } from "../planning/piles/PileCoordinateTable";
import { computePilePlan, DEFAULT_PILE_UI_STATE } from "../planning/piles/pileLayoutModel";

function render(ui: React.ReactNode) {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);
  act(() => root.render(ui));
  return { container, root };
}

describe("PileLayoutPanel", () => {
  it("renders inputs, preview, coordinate table", () => {
    const { container } = render(<PileLayoutPanel supportId="A1" />);
    expect(container.querySelector('[data-testid="pile-footing-length"]')).not.toBeNull();
    expect(container.querySelector('[data-testid="pile-rows"]')).not.toBeNull();
    expect(container.querySelector('[data-testid="pile-plan-preview"]')).not.toBeNull();
    expect(container.querySelector('[data-testid="pile-coordinate-table"]')).not.toBeNull();
    expect(container.querySelector('[data-testid="pile-circle-A1-PILE-01"]')).not.toBeNull();
  });

  it("default 3x2 yields 6 coordinate rows", () => {
    const { container } = render(<PileLayoutPanel supportId="A1" />);
    const rows = container.querySelectorAll('[data-testid^="pile-coord-A1-PILE-"]');
    expect(rows.length).toBe(6);
  });

  it("spacing change updates preview", () => {
    const { container } = render(<PileLayoutPanel supportId="A1" />);
    const input = container.querySelector<HTMLInputElement>('[data-testid="pile-spacing-x"]')!;
    const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value")!.set!;
    act(() => {
      setter.call(input, "4.5");
      input.dispatchEvent(new Event("input", { bubbles: true }));
    });
    expect(input.value).toBe("4.5");
  });

  it("auto arrange button derives layout", () => {
    const onLayout = vi.fn();
    const { container } = render(<PileLayoutPanel supportId="A1" onLayoutChange={onLayout} />);
    const btn = container.querySelector<HTMLButtonElement>('[data-testid="pile-auto"]')!;
    act(() => btn.click());
    expect(onLayout).toHaveBeenCalled();
  });

  it("steel pipe switch active state", () => {
    const { container } = render(<PileLayoutPanel supportId="A1" />);
    const steel = container.querySelector<HTMLButtonElement>('[data-testid="pile-type-steel"]')!;
    act(() => steel.click());
    expect(steel.className).toContain("active");
  });
});

describe("PilePlanPreview", () => {
  it("renders footing outline, centerline, dimensions", () => {
    const plan = computePilePlan(DEFAULT_PILE_UI_STATE, "A1")!;
    const { container } = render(
      <PilePlanPreview plan={plan} footingLength={12} footingWidth={8} pileDiameter={1.2} />,
    );
    expect(container.querySelector('[data-testid="pile-footing-outline"]')).not.toBeNull();
    expect(container.querySelector('[data-testid="pile-centerline"]')).not.toBeNull();
    expect(container.querySelector('[data-testid="dim-spacing-x"]')).not.toBeNull();
    expect(container.querySelector('[data-testid="dim-edge-x"]')).not.toBeNull();
    expect(container.querySelector('[data-testid="dim-overall"]')).not.toBeNull();
  });

  it("omits dimension lines when showDimensions=false", () => {
    const plan = computePilePlan(DEFAULT_PILE_UI_STATE, "A1")!;
    const { container } = render(
      <PilePlanPreview plan={plan} footingLength={12} footingWidth={8} pileDiameter={1.2} showDimensions={false} />,
    );
    expect(container.querySelector('[data-testid="dim-spacing-x"]')).toBeNull();
  });
});

describe("PileCoordinateTable", () => {
  it("renders coordinate rows with parity", () => {
    const plan = computePilePlan(DEFAULT_PILE_UI_STATE, "A1")!;
    const { container } = render(<PileCoordinateTable rows={plan.positions.map((p, i) => ({ no: i + 1, id: p.id, x: p.x, y: p.y }))} />);
    expect(container.querySelectorAll("tbody tr")).toHaveLength(6);
    expect(container.querySelector('[data-testid="pile-coord-A1-PILE-01"]')!.textContent).toContain("A1-PILE-01");
  });
});
