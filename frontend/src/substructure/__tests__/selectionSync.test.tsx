// @vitest-environment jsdom
// Phase C1 (M2-07) 選択同期（supportId キー双方向）テスト
import { act } from "react";
import { createRoot } from "react-dom/client";
import { describe, it, expect, vi } from "vitest";
import {
  SubstructureSelectionProvider,
  useSubstructureSelection,
} from "../planning/selectionState";

function renderProvider(initialOnChange?: (state: unknown) => void) {
  const onChange = vi.fn(initialOnChange ?? (() => {}));
  let snapshot: ReturnType<typeof useSubstructureSelection> | null = null;
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);
  function Host() {
    snapshot = useSubstructureSelection();
    return null;
  }
  act(() =>
    root.render(
      <SubstructureSelectionProvider onSelectionChange={onChange}>
        <Host />
      </SubstructureSelectionProvider>,
    ),
  );
  return {
    get snapshot() {
      return snapshot;
    },
    get onChange() {
      return onChange;
    },
    unmount() {
      act(() => root.unmount());
      container.remove();
    },
  };
}

describe("SubstructureSelectionProvider", () => {
  it("select sets primary + selected array and notifies", () => {
    const h = renderProvider();
    act(() => h.snapshot!.select("P1"));
    expect(h.snapshot!.selectedSupportIds).toEqual(["P1"]);
    expect(h.snapshot!.primarySupportId).toBe("P1");
    expect(h.onChange).toHaveBeenCalled();
    h.unmount();
  });

  it("additive select keeps prior selection", () => {
    const h = renderProvider();
    act(() => h.snapshot!.select("P1"));
    act(() => h.snapshot!.select("A1", { additive: true }));
    expect(h.snapshot!.selectedSupportIds).toEqual(["P1", "A1"]);
    expect(h.snapshot!.primarySupportId).toBe("A1");
    h.unmount();
  });

  it("clear resets selection", () => {
    const h = renderProvider();
    act(() => h.snapshot!.select("P1"));
    act(() => h.snapshot!.clear());
    expect(h.snapshot!.selectedSupportIds).toHaveLength(0);
    expect(h.snapshot!.primarySupportId).toBeNull();
    h.unmount();
  });

  it("isSelected reflects selection (used by Tree/2D/3D highlight)", () => {
    const h = renderProvider();
    act(() => h.snapshot!.select("P1"));
    expect(h.snapshot!.isSelected("P1")).toBe(true);
    expect(h.snapshot!.isSelected("A1")).toBe(false);
    h.unmount();
  });

  it("hover updates hoveredSupportId", () => {
    const h = renderProvider();
    act(() => h.snapshot!.hover("P1"));
    expect(h.snapshot!.hoveredSupportId).toBe("P1");
    act(() => h.snapshot!.hover(null));
    expect(h.snapshot!.hoveredSupportId).toBeNull();
    h.unmount();
  });
});
