// @vitest-environment jsdom

import { act, type ReactNode } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createDefaultProject } from "../../data/defaultProject";
import { LinerListPage, LinerReservedRoutePage } from "./LinerListPage";
import type { ProjectModel } from "../../types";

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

function projectWithLiner(): ProjectModel {
  return {
    ...createDefaultProject(),
    liner: {
      schemaVersion: "0.1.0",
      sourceRevision: "rev-001",
      linerModelId: "gc06",
      coordinatePolicyId: "global",
      intermediateSchemaVersion: "0.2.0",
      generatedAt: "2026-01-01T00:00:00.000Z",
    },
    linerTrace: [
      {
        frameEntityId: "N_LINER_gc06_001_001",
        frameEntityType: "node",
        linerModelId: "gc06",
        coordinatePolicyId: "global",
        sourceRevision: "rev-001",
        gridPointId: "GP-gc06-001-001",
      },
    ],
  };
}

describe("LinerListPage", () => {
  it("renders an empty state when the project has no liner metadata", () => {
    render(
      <LinerListPage
        project={createDefaultProject()}
        onClose={() => undefined}
        onCreate={() => undefined}
        onOpenSetup={() => undefined}
      />,
    );

    expect(document.querySelector("[data-testid=liner-list-page]")).not.toBeNull();
    expect(document.querySelector("[data-testid=liner-list-empty]")).not.toBeNull();
  });

  it("renders attached liner metadata from the current project", () => {
    render(
      <LinerListPage
        project={projectWithLiner()}
        onClose={() => undefined}
        onCreate={() => undefined}
        onOpenSetup={() => undefined}
      />,
    );

    const text = host?.textContent ?? "";
    expect(text).toContain("gc06");
    expect(text).toContain("global");
    expect(text).toContain("rev-001");
    expect(text).toContain("1 件");
  });

  it("wires close and create actions", () => {
    const onClose = vi.fn();
    const onCreate = vi.fn();
    render(
      <LinerListPage
        project={createDefaultProject()}
        onClose={onClose}
        onCreate={onCreate}
        onOpenSetup={() => undefined}
      />,
    );

    act(() => {
      (document.querySelector("[data-testid=close-liner-list]") as HTMLButtonElement).click();
    });
    act(() => {
      (document.querySelector("[data-testid=create-liner]") as HTMLButtonElement).click();
    });

    expect(onClose).toHaveBeenCalledTimes(1);
    expect(onCreate).toHaveBeenCalledTimes(1);
  });

  it("wires the attached model setup action", () => {
    const onOpenSetup = vi.fn();
    render(
      <LinerListPage
        project={projectWithLiner()}
        onClose={() => undefined}
        onCreate={() => undefined}
        onOpenSetup={onOpenSetup}
      />,
    );

    act(() => {
      (document.querySelector("[data-testid=open-liner-setup]") as HTMLButtonElement).click();
    });

    expect(onOpenSetup).toHaveBeenCalledTimes(1);
  });

  it("renders a reserved route placeholder for preview", () => {
    const onBackToList = vi.fn();
    render(
      <LinerReservedRoutePage
        routeId="liner.preview"
        onClose={() => undefined}
        onBackToList={onBackToList}
      />,
    );

    expect(document.querySelector("[data-testid=liner-reserved-route-page]")).not.toBeNull();
    act(() => {
      (document.querySelector("[data-testid=back-to-liner-list]") as HTMLButtonElement).click();
    });
    expect(onBackToList).toHaveBeenCalledTimes(1);
  });
});
