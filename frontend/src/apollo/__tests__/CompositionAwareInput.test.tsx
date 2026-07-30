// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { act } from "react";
import { createRoot } from "react-dom/client";
import { CompositionAwareInput } from "../components/CompositionAwareInput";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

describe("CompositionAwareInput", () => {
  afterEach(() => {
    document.body.innerHTML = "";
  });

  it("defers authoritative commit until compositionend", () => {
    const onValueChange = vi.fn();
    const container = document.createElement("div");
    document.body.appendChild(container);
    const root = createRoot(container);

    act(() => {
      root.render(<CompositionAwareInput value="alpha" onValueChange={onValueChange} />);
    });

    const input = container.querySelector("input") as HTMLInputElement;
    act(() => {
      input.value = "あ";
      input.dispatchEvent(new CompositionEvent("compositionstart", { bubbles: true, data: "あ" }));
      input.dispatchEvent(new Event("input", { bubbles: true }));
    });
    expect(onValueChange).not.toHaveBeenCalled();

    act(() => {
      input.dispatchEvent(new CompositionEvent("compositionend", { bubbles: true, data: "あ" }));
    });
    expect(onValueChange).toHaveBeenCalledTimes(1);
    expect(onValueChange).toHaveBeenCalledWith("あ");
  });

  it("commits exactly once when compositionend is followed by a duplicate change event", () => {
    const onValueChange = vi.fn();
    const container = document.createElement("div");
    document.body.appendChild(container);
    const root = createRoot(container);

    act(() => {
      root.render(<CompositionAwareInput value="alpha" onValueChange={onValueChange} />);
    });

    const input = container.querySelector("input") as HTMLInputElement;
    act(() => {
      input.value = "あ";
      input.dispatchEvent(new CompositionEvent("compositionstart", { bubbles: true, data: "あ" }));
      input.dispatchEvent(new Event("input", { bubbles: true }));
      input.dispatchEvent(new CompositionEvent("compositionend", { bubbles: true, data: "あ" }));
      input.dispatchEvent(new Event("input", { bubbles: true }));
    });

    expect(onValueChange).toHaveBeenCalledTimes(1);
    expect(onValueChange).toHaveBeenCalledWith("あ");
  });
});
