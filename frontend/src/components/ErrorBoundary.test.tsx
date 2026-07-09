// @vitest-environment jsdom

import { act, type ReactNode } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ErrorBoundary } from "./ErrorBoundary";

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let root: Root | null = null;
let host: HTMLDivElement | null = null;

function BrokenComponent(): ReactNode {
  throw new Error("render failed");
}

afterEach(() => {
  if (root) {
    act(() => root?.unmount());
  }
  host?.remove();
  root = null;
  host = null;
  vi.restoreAllMocks();
});

describe("ErrorBoundary", () => {
  it("renders its fallback when a child throws", () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    host = document.createElement("div");
    document.body.appendChild(host);
    root = createRoot(host);

    act(() => {
      root?.render(
        <ErrorBoundary fallback={<p data-testid="error-fallback">fallback</p>}>
          <BrokenComponent />
        </ErrorBoundary>,
      );
    });

    expect(document.querySelector("[data-testid=error-fallback]")?.textContent).toBe("fallback");
    expect(document.body.textContent).not.toBe("");
  });
});
