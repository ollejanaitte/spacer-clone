// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import { act } from "react";
import { createRoot } from "react-dom/client";
import { ViewerPane } from "../ViewerPane";

const mountedRoots: Array<{ root: ReturnType<typeof createRoot>; container: HTMLElement }> = [];

afterEach(() => {
  for (const entry of mountedRoots.splice(0)) {
    act(() => {
      entry.root.unmount();
    });
    entry.container.remove();
  }
});

function renderPane(props?: { nodeCount?: number; children?: React.ReactNode }) {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);
  mountedRoots.push({ root, container });
  act(() => {
    root.render(
      <ViewerPane nodeCount={props?.nodeCount}>
        {props?.children ?? <div data-testid="mock-viewer">viewer</div>}
      </ViewerPane>,
    );
  });
  return container;
}

describe("ViewerPane", () => {
  it("renders children in main area", () => {
    const container = renderPane();
    expect(container.querySelector('[data-testid="mock-viewer"]')).not.toBeNull();
  });

  it("shows node count when provided", () => {
    const container = renderPane({ nodeCount: 42 });
    const supplementary = container.querySelector('[data-testid="apollo-viewer-pane-supplementary"]');
    expect(supplementary).not.toBeNull();
    expect(supplementary!.textContent).toContain("42");
  });

  it("hides supplementary info when node count not provided", () => {
    const container = renderPane();
    expect(container.querySelector(".apollo-viewer-supplementary")).toBeNull();
  });
});