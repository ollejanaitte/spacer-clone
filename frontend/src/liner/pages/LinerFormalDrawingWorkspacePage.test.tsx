// @vitest-environment jsdom

import { act, type ReactNode } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ja } from "../../i18n/ja";
import { createDefaultLinerDraft } from "../adapters/linerUiAdapter";
import { LinerFormalDrawingWorkspacePage } from "./LinerFormalDrawingWorkspacePage";

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

describe("LinerFormalDrawingWorkspacePage", () => {
  it("uses Japanese user-facing labels instead of internal implementation names", () => {
    render(
      <LinerFormalDrawingWorkspacePage
        kind="plan"
        draft={createDefaultLinerDraft()}
        onClose={() => undefined}
        onBackToSetup={() => undefined}
        onNavigate={() => undefined}
      />,
    );

    expect(document.body.textContent).toContain(ja.liner.formalDrawing.lead);
    expect(document.body.textContent).not.toContain("DrawingDocument");
    expect(document.querySelector("[data-testid=drawing-sheet-plan-sheet]")).not.toBeNull();
    expect(document.querySelector("[data-testid=formal-drawing-export-plan-dxf]")).not.toBeNull();
    expect(document.querySelector("[data-testid=formal-drawing-export-profile-dxf]")).not.toBeNull();
    expect(document.querySelector("[data-testid=formal-drawing-export-cross-section-dxf]")).not.toBeNull();
    expect(document.body.textContent).toContain(ja.liner.formalDrawing.exportPlanDxf);
    expect(document.body.textContent).toContain(ja.liner.formalDrawing.exportProfileDxf);
    expect(document.body.textContent).toContain(ja.liner.formalDrawing.exportCrossSectionDxf);
  });

  it("enables DXF export buttons and triggers download for plan", () => {
    const createObjectURL = vi.spyOn(URL, "createObjectURL").mockReturnValue("blob:mock-dxf");
    const revokeObjectURL = vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => undefined);
    const click = vi.fn();
    const originalCreateElement = document.createElement.bind(document);
    vi.spyOn(document, "createElement").mockImplementation((tagName: string) => {
      const element = originalCreateElement(tagName);
      if (tagName === "a") {
        Object.defineProperty(element, "click", { value: click });
      }
      return element;
    });

    render(
      <LinerFormalDrawingWorkspacePage
        kind="plan"
        draft={createDefaultLinerDraft()}
        projectId="proj-1"
        onClose={() => undefined}
        onBackToSetup={() => undefined}
        onNavigate={() => undefined}
      />,
    );

    const button = document.querySelector(
      "[data-testid=formal-drawing-export-plan-dxf]",
    ) as HTMLButtonElement;
    expect(button.disabled).toBe(false);
    act(() => {
      button.click();
    });
    expect(createObjectURL).toHaveBeenCalled();
    expect(click).toHaveBeenCalled();
    expect(document.querySelector("[data-testid=formal-drawing-export-message]")?.textContent).toContain(
      ".dxf",
    );
    expect(document.querySelector("[data-testid=drawing-sheet-plan-sheet]")).not.toBeNull();

    createObjectURL.mockRestore();
    revokeObjectURL.mockRestore();
  });

  it("renders landscape formal sheet with readable aspect ratio metadata", () => {
    render(
      <LinerFormalDrawingWorkspacePage
        kind="profile"
        draft={createDefaultLinerDraft()}
        onClose={() => undefined}
        onBackToSetup={() => undefined}
        onNavigate={() => undefined}
      />,
    );

    const sheet = document.querySelector("[data-testid=drawing-sheet-profile-sheet]") as SVGSVGElement | null;
    expect(sheet).not.toBeNull();
    const viewBoxParts = sheet?.getAttribute("viewBox")?.split(/\s+/) ?? [];
    const width = Number(viewBoxParts[2]);
    const height = Number(viewBoxParts[3]);
    expect(width).toBeGreaterThan(height);
  });
});
