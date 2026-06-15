﻿﻿// @vitest-environment jsdom

import { act } from "react";
import type { ReactNode } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";
import { Viewer3D } from "./Viewer3D";
import { createDefaultProject } from "../data/defaultProject";

vi.mock("three", async (importOriginal) => {
  const actual = await importOriginal<typeof import("three")>();
  return {
    ...actual,
    WebGLRenderer: vi.fn(() => {
      throw new Error("mock WebGLRenderer failure for Viewer3D compare mode tests");
    }),
  };
});

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let root: Root | null = null;
afterEach(() => {
  act(() => {
    root?.unmount();
  });
  root = null;
  document.body.innerHTML = "";
  delete (window as Window & { spacerDesktop?: unknown }).spacerDesktop;
  delete (window as Window & { desktop?: unknown }).desktop;
});

function render(node: ReactNode) {
  const host = document.createElement("div");
  document.body.appendChild(host);
  root = createRoot(host);
  act(() => {
    root?.render(node);
  });
}

function baseProps(overrides: Record<string, unknown> = {}) {
  return {
    project: createDefaultProject(),

    result: null,
    selectedSection: "nodes" as const,
    selection: null,
    activeLoadCase: "LC1",
    onSelectionChange: () => undefined,
    onActiveLoadCaseChange: () => undefined,
    ...overrides,
  };
}

describe("Viewer3D compare mode integration", () => {
  it("shows the normal (non-compare) viewport by default (no compare-shell)", async () => {
    render(<Viewer3D {...baseProps()} />);
    await act(async () => undefined);
    expect(document.querySelector("[data-testid=compare-shell]")).toBeNull();
  });

  it("renders the Compare View checkbox in ViewerControls", async () => {
    render(<Viewer3D {...baseProps()} />);
    await act(async () => undefined);
    const input = document.querySelector('[data-testid="compare-view-toggle"]');
    expect(input).not.toBeNull();
  });
});
describe("Viewer3D initial compare mode", () => {
  it("renders the compare shell when initialCompareMode is true", async () => {
    render(<Viewer3D {...baseProps({ initialCompareMode: true })} />);
    await act(async () => undefined);
    const shell = document.querySelector("[data-testid=compare-shell]");
    expect(shell).not.toBeNull();
  });

  it("renders the comparison panel inside the compare shell when initialCompareMode is true", async () => {
    render(<Viewer3D {...baseProps({ initialCompareMode: true })} />);
    await act(async () => undefined);
    const panel = document.querySelector("[data-testid=comparison-panel]");
    expect(panel).not.toBeNull();
  });
});