// @vitest-environment jsdom
// Phase C1 (M2-07) 選択同期・Interaction テスト
import { act } from "react";
import { createRoot } from "react-dom/client";
import { describe, it, expect, vi } from "vitest";
import { useUndoRedo, shallowEqual } from "../planning/useUndoRedo";
import { useSubstructureShortcuts } from "../planning/useKeyboardShortcuts";
import { SubstructureContextMenu } from "../planning/SubstructureContextMenu";

function renderHookWithHost<T>(useFn: () => T) {
  let latest: T | null = null;
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);
  function Host() {
    latest = useFn();
    return null;
  }
  act(() => root.render(<Host />));
  return {
    get latest() {
      return latest;
    },
    unmount() {
      act(() => root.unmount());
      container.remove();
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

describe("useUndoRedo", () => {
  it("undo/redo round-trips value", () => {
    vi.useFakeTimers();
    const h = renderHookWithHost(() => useUndoRedo({ width: 1 }));
    act(() => h.latest!.commit({ width: 2 }, "edit"));
    act(() => vi.advanceTimersByTime(400));
    expect(h.latest!.state.present).toEqual({ width: 2 });
    expect(h.latest!.canUndo).toBe(true);
    act(() => h.latest!.undo());
    expect(h.latest!.state.present).toEqual({ width: 1 });
    expect(h.latest!.canRedo).toBe(true);
    act(() => h.latest!.redo());
    expect(h.latest!.state.present).toEqual({ width: 2 });
    vi.useRealTimers();
    h.unmount();
  });

  it("multiple commits within debounce coalesce into one history entry", () => {
    vi.useFakeTimers();
    const h = renderHookWithHost(() => useUndoRedo({ width: 1 }));
    act(() => h.latest!.commit({ width: 2 }));
    act(() => h.latest!.commit({ width: 3 }));
    act(() => h.latest!.commit({ width: 4 }));
    act(() => vi.advanceTimersByTime(400));
    expect(h.latest!.state.present).toEqual({ width: 4 });
    // 1回のundoで width=1 に戻る（統合されたため）
    act(() => h.latest!.undo());
    expect(h.latest!.state.present).toEqual({ width: 1 });
    expect(h.latest!.canUndo).toBe(false);
    vi.useRealTimers();
    h.unmount();
  });

  it("undo after committed value returns previous present", () => {
    vi.useFakeTimers();
    const h = renderHookWithHost(() => useUndoRedo(1));
    act(() => h.latest!.commit(2));
    act(() => vi.advanceTimersByTime(400));
    act(() => h.latest!.commit(3));
    act(() => vi.advanceTimersByTime(400));
    expect(h.latest!.state.present).toBe(3);
    act(() => h.latest!.undo());
    expect(h.latest!.state.present).toBe(2);
    vi.useRealTimers();
    h.unmount();
  });

  it("shallowEqual detects changes", () => {
    expect(shallowEqual({ a: 1 }, { a: 1 })).toBe(true);
    expect(shallowEqual({ a: 1 }, { a: 2 })).toBe(false);
  });
});

describe("useSubstructureShortcuts", () => {
  it("ESC triggers deselect", () => {
    const onDeselect = vi.fn();
    const h = renderHookWithHost(() => {
      useSubstructureShortcuts({ onDeselect });
      return null;
    });
    act(() => {
      window.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
    });
    expect(onDeselect).toHaveBeenCalled();
    h.unmount();
  });

  it("Ctrl+Z triggers undo, Ctrl+Shift+Z triggers redo", () => {
    const onUndo = vi.fn();
    const onRedo = vi.fn();
    const h = renderHookWithHost(() => {
      useSubstructureShortcuts({ onDeselect: vi.fn(), onUndo, onRedo });
      return null;
    });
    act(() => {
      window.dispatchEvent(new KeyboardEvent("keydown", { key: "z", ctrlKey: true }));
    });
    expect(onUndo).toHaveBeenCalledTimes(1);
    act(() => {
      window.dispatchEvent(new KeyboardEvent("keydown", { key: "z", ctrlKey: true, shiftKey: true }));
    });
    expect(onRedo).toHaveBeenCalledTimes(1);
    h.unmount();
  });

  it("Delete triggers delete outside input fields", () => {
    const onDelete = vi.fn();
    const h = renderHookWithHost(() => {
      useSubstructureShortcuts({ onDeselect: vi.fn(), onDelete });
      return null;
    });
    act(() => {
      window.dispatchEvent(new KeyboardEvent("keydown", { key: "Delete" }));
    });
    expect(onDelete).toHaveBeenCalled();
    h.unmount();
  });
});

describe("SubstructureContextMenu", () => {
  it("renders items and fires onSelect", () => {
    const onSelect = vi.fn();
    const { container } = render(
      <SubstructureContextMenu
        items={[
          { id: "delete", label: "削除", danger: true, onSelect },
          { id: "dup", label: "複製", onSelect: vi.fn() },
        ]}
        x={10}
        y={20}
        onClose={() => {}}
      />,
    );
    expect(container.querySelector('[data-testid="substructure-context-menu"]')).not.toBeNull();
    const del = container.querySelector<HTMLButtonElement>('[data-testid="context-menu-delete"]')!;
    act(() => del.click());
    expect(onSelect).toHaveBeenCalled();
  });
});
