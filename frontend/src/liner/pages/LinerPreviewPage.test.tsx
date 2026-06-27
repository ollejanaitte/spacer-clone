// @vitest-environment jsdom

import { act, type ReactNode } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createDefaultLinerDraft } from "../adapters/linerUiAdapter";
import { LinerPreviewPage } from "./LinerPreviewPage";

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

afterEach(() => {
  if (root) {
    act(() => root?.unmount());
  }
  host?.remove();
  root = null;
  host = null;
});

describe("LinerPreviewPage", () => {
  it("renders preview summary and diagnostics panel", () => {
    render(
      <LinerPreviewPage
        draft={createDefaultLinerDraft()}
        onClose={() => undefined}
        onBackToList={() => undefined}
        onBackToSetup={() => undefined}
      />,
    );

    expect(document.querySelector("[data-testid=liner-preview-page]")).not.toBeNull();
    expect(document.querySelector("[data-testid=liner-grid-preview]")).not.toBeNull();
    expect(host?.textContent).toContain("100 m");
  });

  it("wires preview navigation callbacks", () => {
    const onClose = vi.fn();
    const onBackToList = vi.fn();
    const onBackToSetup = vi.fn();
    render(
      <LinerPreviewPage
        draft={createDefaultLinerDraft()}
        onClose={onClose}
        onBackToList={onBackToList}
        onBackToSetup={onBackToSetup}
      />,
    );

    act(() => {
      (document.querySelector("[data-testid=close-liner-preview]") as HTMLButtonElement).click();
    });
    act(() => {
      (document.querySelector("[data-testid=back-to-liner-setup]") as HTMLButtonElement).click();
    });
    act(() => {
      (document.querySelector("[data-testid=back-to-liner-list]") as HTMLButtonElement).click();
    });

    expect(onClose).toHaveBeenCalledTimes(1);
    expect(onBackToSetup).toHaveBeenCalledTimes(1);
    expect(onBackToList).toHaveBeenCalledTimes(1);
  });
});
