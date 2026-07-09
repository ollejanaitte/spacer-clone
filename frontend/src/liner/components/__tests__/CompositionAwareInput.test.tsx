// @vitest-environment jsdom

import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";
import { CompositionAwareInput } from "../CompositionAwareInput";

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let root: Root | null = null;
let host: HTMLDivElement | null = null;

function renderInput(onValueChange: (value: string) => void, type?: "number") {
  host = document.createElement("div");
  document.body.appendChild(host);
  root = createRoot(host);
  act(() => {
    root?.render(<CompositionAwareInput type={type} value="" onValueChange={onValueChange} />);
  });
  return host.querySelector("input") as HTMLInputElement;
}

function setNativeValue(input: HTMLInputElement, value: string) {
  const valueSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value")?.set;
  valueSetter?.call(input, value);
}

afterEach(() => {
  if (root) {
    act(() => root?.unmount());
  }
  host?.remove();
  root = null;
  host = null;
});

describe("CompositionAwareInput", () => {
  it("commits only the final composition value", () => {
    const onValueChange = vi.fn();
    const input = renderInput(onValueChange);

    act(() => {
      input.dispatchEvent(new CompositionEvent("compositionstart", { bubbles: true }));
      setNativeValue(input, "あ");
      input.dispatchEvent(new InputEvent("input", { bubbles: true, data: "あ", isComposing: true }));
    });

    expect(input.value).toBe("あ");
    expect(onValueChange).not.toHaveBeenCalled();

    act(() => {
      input.dispatchEvent(new CompositionEvent("compositionend", { bubbles: true, data: "あ" }));
    });

    expect(onValueChange).toHaveBeenCalledTimes(1);
    expect(onValueChange).toHaveBeenCalledWith("あ");
  });

  it("keeps an empty intermediate composition value without committing it", () => {
    const onValueChange = vi.fn();
    const input = renderInput(onValueChange);

    act(() => {
      input.dispatchEvent(new CompositionEvent("compositionstart", { bubbles: true }));
      setNativeValue(input, "");
      input.dispatchEvent(new InputEvent("input", { bubbles: true, data: null, isComposing: true }));
    });

    expect(input.value).toBe("");
    expect(onValueChange).not.toHaveBeenCalled();
  });

  it("defers numeric parsing callbacks until composition ends", () => {
    const onValueChange = vi.fn();
    const input = renderInput(onValueChange, "number");

    act(() => {
      input.dispatchEvent(new CompositionEvent("compositionstart", { bubbles: true }));
      setNativeValue(input, "25");
      input.dispatchEvent(new InputEvent("input", { bubbles: true, data: "25", isComposing: true }));
    });
    expect(onValueChange).not.toHaveBeenCalled();

    act(() => {
      input.dispatchEvent(new CompositionEvent("compositionend", { bubbles: true, data: "25" }));
    });
    expect(onValueChange).toHaveBeenCalledWith("25");
  });
});
