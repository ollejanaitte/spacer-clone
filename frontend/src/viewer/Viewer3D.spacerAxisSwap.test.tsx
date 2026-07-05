// @vitest-environment jsdom

import { act } from "react";
import type { ReactNode } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createDefaultProject } from "../data/defaultProject";
import type { ProjectModel } from "../types";
import { PROJECT_LINER_METADATA_SCHEMA_VERSION } from "../liner/schema/types";
import { SPACER_AXIS_SWAP_STORAGE_KEY } from "./coordinateTransform";
import { Viewer3D } from "./Viewer3D";

vi.mock("three", async (importOriginal) => {
  const actual = await importOriginal<typeof import("three")>();
  return {
    ...actual,
    WebGLRenderer: vi.fn(() => {
      throw new Error("mock WebGLRenderer failure");
    }),
  };
});

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let root: Root | null = null;

beforeEach(() => {
  window.localStorage.clear();
});

afterEach(() => {
  act(() => {
    root?.unmount();
  });
  root = null;
  document.body.innerHTML = "";
  window.localStorage.clear();
});

describe("Viewer3D SPACER Axis Swap initial state", () => {
  it("defaults swap to off for general projects", async () => {
    renderViewer(createDefaultProject());
    await act(async () => undefined);
    expect(getSwapToggle()?.checked).toBe(false);
  });

  it("defaults swap to on for liner-derived projects", async () => {
    renderViewer(linerProject());
    await act(async () => undefined);
    expect(getSwapToggle()?.checked).toBe(true);
  });

  it("respects an explicit stored off preference for liner-derived projects", async () => {
    window.localStorage.setItem(SPACER_AXIS_SWAP_STORAGE_KEY, "off");
    renderViewer(linerProject());
    await act(async () => undefined);
    expect(getSwapToggle()?.checked).toBe(false);
  });

  it("respects an explicit stored on preference for general projects", async () => {
    window.localStorage.setItem(SPACER_AXIS_SWAP_STORAGE_KEY, "on");
    renderViewer(createDefaultProject());
    await act(async () => undefined);
    expect(getSwapToggle()?.checked).toBe(true);
  });

  it("persists swap only after the user toggles it", async () => {
    renderViewer(createDefaultProject());
    await act(async () => undefined);
    expect(window.localStorage.getItem(SPACER_AXIS_SWAP_STORAGE_KEY)).toBeNull();

    act(() => {
      getSwapToggle()?.click();
    });

    expect(window.localStorage.getItem(SPACER_AXIS_SWAP_STORAGE_KEY)).toBe("on");
  });
});

function renderViewer(project: ProjectModel) {
  const host = document.createElement("div");
  document.body.appendChild(host);
  root = createRoot(host);
  act(() => {
    root?.render(
      <Viewer3D
        project={project}
        result={null}
        selectedSection="nodes"
        selection={null}
        activeLoadCase="LC1"
        onSelectionChange={() => undefined}
        onActiveLoadCaseChange={() => undefined}
      />,
    );
  });
}

function getSwapToggle(): HTMLInputElement | null {
  return document.querySelector('[data-testid="spacer-axis-swap-toggle"]') as HTMLInputElement | null;
}

function linerProject(): ProjectModel {
  return {
    ...createDefaultProject(),
    liner: {
      schemaVersion: PROJECT_LINER_METADATA_SCHEMA_VERSION,
      linerModelId: "gc06",
      coordinatePolicyId: "policy",
      intermediateSchemaVersion: "0.2.0",
      sourceRevision: "abc123",
    },
  };
}
