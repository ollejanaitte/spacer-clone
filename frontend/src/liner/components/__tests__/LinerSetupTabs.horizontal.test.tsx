// @vitest-environment jsdom

import { act, type ReactNode } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it } from "vitest";
import { LinerEditPage } from "../../pages/LinerEditPage";

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

function buttonByTestId(testId: string): HTMLButtonElement {
  return document.querySelector(`[data-testid=${testId}]`) as HTMLButtonElement;
}

afterEach(() => {
  if (root) {
    act(() => root?.unmount());
  }
  host?.remove();
  root = null;
  host = null;
});

describe("LinerSetupTabs horizontal UI integration", () => {
  it("shows horizontal element editor controls on the line tab", () => {
    render(<LinerEditPage onClose={() => undefined} onBackToList={() => undefined} />);

    expect(document.querySelector("[data-testid=liner-setup-tabpanel-line]")).not.toBeNull();
    expect(buttonByTestId("add-liner-straight-element")).not.toBeNull();
    expect(buttonByTestId("add-liner-arc-element")).not.toBeNull();
    expect(buttonByTestId("add-liner-clothoid-element")).not.toBeNull();
    expect(document.querySelector("[data-testid=liner-element-length-S1]")).not.toBeNull();
  });

  it("shows continuity diagnostics and curve sampling on the station tab", () => {
    render(<LinerEditPage onClose={() => undefined} onBackToList={() => undefined} />);

    act(() => {
      buttonByTestId("liner-setup-tab-station").click();
    });

    expect(document.querySelector("[data-testid=liner-setup-tabpanel-station]")).not.toBeNull();
    expect(document.querySelector("[data-testid=liner-origin-displayed-station]")).not.toBeNull();
    expect(document.querySelector("[data-testid=continuity-diagnostics-panel]")).not.toBeNull();
    expect(document.querySelector("[data-testid=curve-sampling-control]")).not.toBeNull();
    expect(document.querySelector("[data-testid=liner-display-sampling-interval]")).not.toBeNull();
  });
});
