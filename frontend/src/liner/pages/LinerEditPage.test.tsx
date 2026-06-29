// @vitest-environment jsdom

import { act, type ReactNode } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";
import { LinerEditPage } from "./LinerEditPage";

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let root: Root | null = null;
let host: HTMLDivElement | null = null;

function render(node: ReactNode) {
  host = document.createElement("div");
  document.body.appendChild(host);
  root = createRoot(host);
  act(() => {
    root?.render(node);
  });
}

function inputByTestId(testId: string): HTMLInputElement {
  return document.querySelector(`[data-testid=${testId}]`) as HTMLInputElement;
}

function setInputValue(input: HTMLInputElement, value: string) {
  const valueSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value")?.set;
  valueSetter?.call(input, value);
  input.dispatchEvent(new Event("input", { bubbles: true }));
}

afterEach(() => {
  if (root) {
    act(() => root?.unmount());
  }
  host?.remove();
  root = null;
  host = null;
});

describe("LinerEditPage", () => {
  it("renders the default local draft form", () => {
    render(<LinerEditPage onClose={() => undefined} onBackToList={() => undefined} />);

    expect(document.querySelector("[data-testid=liner-edit-page]")).not.toBeNull();
    expect(inputByTestId("liner-alignment-id").value).toBe("alignment-1");
    expect(inputByTestId("liner-element-length-S1").value).toBe("100");
  });

  it("updates a straight element and summary from form input", () => {
    render(<LinerEditPage onClose={() => undefined} onBackToList={() => undefined} />);

    act(() => {
      setInputValue(inputByTestId("liner-element-length-S1"), "125");
    });

    expect(inputByTestId("liner-element-length-S1").value).toBe("125");
    expect(document.querySelector("[data-testid=liner-summary-length]")?.textContent).toBe("125 m");
  });

  it("keeps focus while editing straight element identifiers", () => {
    render(<LinerEditPage onClose={() => undefined} onBackToList={() => undefined} />);
    const idInput = inputByTestId("liner-element-id-S1");

    act(() => {
      idInput.focus();
      setInputValue(idInput, "S1A");
    });

    expect(inputByTestId("liner-element-id-S1A").value).toBe("S1A");
    expect(document.activeElement).toBe(inputByTestId("liner-element-id-S1A"));
  });

  it("adds and removes straight element rows", () => {
    render(<LinerEditPage onClose={() => undefined} onBackToList={() => undefined} />);

    act(() => {
      (document.querySelector("[data-testid=add-liner-straight-element]") as HTMLButtonElement).click();
    });
    expect(inputByTestId("liner-element-length-S2").value).toBe("50");

    act(() => {
      (document.querySelector("[data-testid=remove-liner-element-S1]") as HTMLButtonElement).click();
    });
    expect(document.querySelector("[data-testid=liner-element-length-S1]")).toBeNull();
    expect(inputByTestId("liner-element-length-S2").value).toBe("50");
  });

  it("wires close and back navigation callbacks", () => {
    const onClose = vi.fn();
    const onBackToList = vi.fn();
    render(<LinerEditPage onClose={onClose} onBackToList={onBackToList} />);

    act(() => {
      (document.querySelector("[data-testid=close-liner-edit]") as HTMLButtonElement).click();
    });
    act(() => {
      (document.querySelector("[data-testid=back-to-liner-list]") as HTMLButtonElement).click();
    });

    expect(onClose).toHaveBeenCalledTimes(1);
    expect(onBackToList).toHaveBeenCalledTimes(1);
  });

  it("wires optional preview navigation", () => {
    const onOpenPreview = vi.fn();
    const onOpenMappingReview = vi.fn();
    render(
      <LinerEditPage
        onClose={() => undefined}
        onBackToList={() => undefined}
        onOpenPreview={onOpenPreview}
        onOpenMappingReview={onOpenMappingReview}
      />,
    );

    act(() => {
      (document.querySelector("[data-testid=open-liner-preview]") as HTMLButtonElement).click();
    });
    act(() => {
      (document.querySelector("[data-testid=open-liner-mapping-review]") as HTMLButtonElement).click();
    });

    expect(onOpenPreview).toHaveBeenCalledTimes(1);
    expect(onOpenMappingReview).toHaveBeenCalledTimes(1);
  });
});
